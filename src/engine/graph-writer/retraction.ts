// THE RETRACTION API — the writer's single sanctioned mutation surface for
// SourceEvent invalidation/supersession, Evidence erasure, and the LAW-8
// path (D-R6; schema banner: a retraction performed anywhere else is a bug).
//
// CHOKE-POINT, NOT RETENTION: tombstones carry ids and causes
// (evidenceIdWas, invalidationCause, run ids) — never content. LAW-8
// erasure flowing through here truly erases: the quote column is a verbatim
// copy of the person's words, so erasure that leaves the words in a
// different table isn't erasure.
//
// RECOMPUTE IS SYNCHRONOUS, inside the retraction transaction — per-person
// graphs are dozens-to-low-hundreds of nodes; there is nothing to queue,
// and a crash can never land between retraction and recompute (the
// divergence window does not exist). The duty covers EVERY affected derived
// value: linked hypotheses AND the stored mass/confidence/state of the
// EXTRACTED nodes whose evidence was touched.
//
// Pinned order inside each transaction (r3 A-3):
//   invalidate links (verify the insert-time evidenceIdWas copy) →
//   delete Evidence rows (SetNull) → delete the SourceEvent (LAW-8 shape) →
//   recompute → MatcherRun row. One transaction, in that order.

import type { Prisma, PrismaClient } from "@prisma/client";
import type { GateConfig } from "../citation-gate/config";
import type { MatcherConfig } from "../hypothesis-match/config";
import {
  recomputeExtractedNode,
  recomputeHypothesis,
  type HypothesisTransition,
} from "../hypothesis-match/recompute";

export interface RetractionResult {
  runId: string;
  transitions: HypothesisTransition[];
}

interface RetractionContext {
  config: MatcherConfig;
  gateConfig: GateConfig;
  now: Date;
}

/** Shared tail: invalidate links for the given evidence ids, recompute every
 * affected node (hypotheses via links, extracted via ownership), record the
 * run. Returns the run id. */
async function invalidateAndRecompute(
  tx: Prisma.TransactionClient,
  args: {
    userId: string;
    evidenceIds: string[];
    owningNodeIds: string[];
    cause: "SOURCE_INVALIDATED" | "LAW8_ERASURE" | "MANUAL";
    payload: Prisma.InputJsonValue;
    ctx: RetractionContext;
  },
): Promise<RetractionResult> {
  const { userId, evidenceIds, owningNodeIds, cause, payload, ctx } = args;

  // Which hypotheses does this touch? (via live links on those evidence rows)
  const affectedLinks = await tx.hypothesisEvidenceLink.findMany({
    where: { evidenceId: { in: evidenceIds }, invalidatedAt: null },
  });
  const hypothesisIds = [...new Set(affectedLinks.map((l) => l.nodeId))];

  // Prior states for the replay record.
  const affectedNodeIds = [...new Set([...hypothesisIds, ...owningNodeIds])];
  const nodes = await tx.psycheNode.findMany({
    where: { id: { in: affectedNodeIds } },
  });
  const priorStates: Record<string, string> = {};
  for (const n of nodes) priorStates[n.id] = n.state;

  const run = await tx.matcherRun.create({
    data: {
      userId,
      trigger: "RETRACTION",
      inputs: { priorStates, payload } as Prisma.InputJsonValue,
      matcherConfigVersion: ctx.config.matcherConfigVersion,
      matchRuleVersion: ctx.config.matchRuleVersion,
      transitions: [] as Prisma.InputJsonValue,
    },
  });

  // Invalidate the links — verifying the insert-time audit copy (r3 A-3).
  for (const l of affectedLinks) {
    if (!l.evidenceIdWas) {
      throw new Error(
        `retraction: link ${l.id} is missing its evidenceIdWas copy — refusing to erase without the audit id`,
      );
    }
    await tx.hypothesisEvidenceLink.update({
      where: { id: l.id },
      data: {
        invalidatedAt: ctx.now,
        invalidationCause: cause,
        invalidatedByRunId: run.id,
      },
    });
  }

  // Erasure shapes delete the Evidence rows AFTER link invalidation.
  if (cause !== "SOURCE_INVALIDATED") {
    await tx.evidence.deleteMany({ where: { id: { in: evidenceIds } } });
  }

  // Recompute every affected derived value, same transaction.
  const transitions: HypothesisTransition[] = [];
  for (const n of nodes) {
    transitions.push(
      n.provenance === "LENS"
        ? await recomputeHypothesis(tx, n, ctx.config, ctx.gateConfig, ctx.now)
        : await recomputeExtractedNode(tx, n, ctx.gateConfig, ctx.now),
    );
  }

  await tx.matcherRun.update({
    where: { id: run.id },
    data: { transitions: transitions as unknown as Prisma.InputJsonValue },
  });

  return { runId: run.id, transitions };
}

/** Invalidation/supersession: the event REMAINS (append-and-invalidate,
 * event-sourced core) but contributes nothing anywhere downstream. */
export async function retractSourceEvent(
  prisma: PrismaClient,
  input: {
    sourceEventId: string;
    supersededById?: string;
    config: MatcherConfig;
    gateConfig: GateConfig;
    now: Date;
  },
): Promise<RetractionResult> {
  const { sourceEventId, supersededById, config, gateConfig, now } = input;
  return prisma.$transaction(async (tx) => {
    const source = await tx.sourceEvent.update({
      where: { id: sourceEventId },
      data: { invalidatedAt: now, supersededById: supersededById ?? null },
    });
    const evidence = await tx.evidence.findMany({
      where: { sourceEventId },
      select: { id: true, nodeId: true },
    });
    return invalidateAndRecompute(tx, {
      userId: source.userId,
      evidenceIds: evidence.map((e) => e.id),
      owningNodeIds: evidence.flatMap((e) => (e.nodeId ? [e.nodeId] : [])),
      cause: "SOURCE_INVALIDATED",
      payload: { retractedSourceEventId: sourceEventId, supersededById: supersededById ?? null },
      ctx: { config, gateConfig, now },
    });
  });
}

/** LAW-8 (or manual) erasure of ONE evidence row: gone, not flagged. */
export async function eraseEvidence(
  prisma: PrismaClient,
  input: {
    evidenceId: string;
    cause: "LAW8_ERASURE" | "MANUAL";
    config: MatcherConfig;
    gateConfig: GateConfig;
    now: Date;
  },
): Promise<RetractionResult> {
  const { evidenceId, cause, config, gateConfig, now } = input;
  return prisma.$transaction(async (tx) => {
    const evidence = await tx.evidence.findUniqueOrThrow({
      where: { id: evidenceId },
      include: { sourceEvent: { select: { userId: true } } },
    });
    return invalidateAndRecompute(tx, {
      userId: evidence.sourceEvent.userId,
      evidenceIds: [evidenceId],
      owningNodeIds: evidence.nodeId ? [evidence.nodeId] : [],
      cause,
      payload: { erasedEvidenceId: evidenceId }, // the id IS the tombstone; never the quote
      ctx: { config, gateConfig, now },
    });
  });
}

/** LAW-8 erasure of a whole SourceEvent — the shape a real "delete my
 * entry" takes. Evidence rows (including their verbatim quote copies)
 * cascade FIRST; links tombstone with evidenceIdWas intact; the event row
 * itself is deleted last. The person's words survive nowhere. */
export async function eraseSourceEvent(
  prisma: PrismaClient,
  input: {
    sourceEventId: string;
    config: MatcherConfig;
    gateConfig: GateConfig;
    now: Date;
  },
): Promise<RetractionResult> {
  const { sourceEventId, config, gateConfig, now } = input;
  return prisma.$transaction(async (tx) => {
    const source = await tx.sourceEvent.findUniqueOrThrow({
      where: { id: sourceEventId },
      select: { id: true, userId: true },
    });
    const evidence = await tx.evidence.findMany({
      where: { sourceEventId },
      select: { id: true, nodeId: true },
    });
    const result = await invalidateAndRecompute(tx, {
      userId: source.userId,
      evidenceIds: evidence.map((e) => e.id),
      owningNodeIds: evidence.flatMap((e) => (e.nodeId ? [e.nodeId] : [])),
      cause: "LAW8_ERASURE",
      payload: { erasedSourceEventId: sourceEventId },
      ctx: { config, gateConfig, now },
    });
    // The entry itself, last — after every dependent row is gone.
    await tx.sourceEvent.delete({ where: { id: sourceEventId } });
    return result;
  });
}
