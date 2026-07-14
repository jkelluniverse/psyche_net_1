// THE HYPOTHESIS MATCHER — the blinding invariant's completion
// (renderer-lens spec §3). Deterministic, POST-GATE: the one module allowed
// to see both worlds (validated extracted material AND standing hypotheses).
// The proposer never does — nothing here feeds anything the proposer reads.
//
// LENS-only in v1 (D-R3): BECOMING matching is the gate's in-gate label
// matcher; since gate v1.7 the gate cannot merge into a LENS node, so this
// module is provably the ONLY charging path for lens hypotheses.
//
// Match rule v1 (versioned): same domain type + exact ontologyKey. On match
// the matcher writes LINKS through the carrier table (D-R2: one span, one
// Evidence row, referenced twice; evidenceIdWas copied at INSERT) and
// recomputes with the gate's arithmetic (imported — recompute.ts).
// The matcher NEVER creates nodes and never mutates extracted rows.
//
// Every run persists a MatcherRun: trigger, prior states, transitions —
// links derive from the runId FK. "Why is this ghost ACTIVE" is answerable.

import type { Prisma, PrismaClient } from "@prisma/client";
import type { GateConfig } from "../citation-gate/config";
import type { MatcherConfig } from "./config";
import {
  recomputeHypothesis,
  type HypothesisTransition,
} from "./recompute";

export interface MatcherRunResult {
  runId: string;
  linksCreated: number;
  transitions: HypothesisTransition[];
}

export interface RunMatcherInput {
  userId: string;
  /** 'PASS:<extractionRunId>' | 'RETRACTION' | 'IMPORT_REMAP' | 'CONFIRMATION' */
  trigger: string;
  /** Extra replay payload (chartImportId, lensMapVersion, retracted ids…). */
  triggerPayload?: Prisma.InputJsonValue;
  config: MatcherConfig;
  gateConfig: GateConfig;
  now: Date;
}

/** Full-graph matcher run for one user, inside the caller's transaction.
 * Full-graph on purpose: delta-only matching would silently fail the
 * chart-added-after-journaling flow — which is the demo script itself. */
export async function runMatcherForUser(
  tx: Prisma.TransactionClient,
  input: RunMatcherInput,
): Promise<MatcherRunResult> {
  const { userId, trigger, triggerPayload, config, gateConfig, now } = input;

  const hypotheses = await tx.psycheNode.findMany({
    where: { userId, provenance: "LENS", archivedAt: null },
  });
  const extracted = await tx.psycheNode.findMany({
    where: {
      userId,
      provenance: "EXTRACTED",
      archivedAt: null,
      ontologyKey: { not: null },
    },
    include: { evidence: { select: { id: true } } },
  });

  const priorStates: Record<string, string> = {};
  for (const h of hypotheses) priorStates[h.id] = h.state;

  // The run row first — links carry its FK.
  const run = await tx.matcherRun.create({
    data: {
      userId,
      trigger,
      inputs: {
        priorStates,
        payload: triggerPayload ?? null,
      } as Prisma.InputJsonValue,
      matcherConfigVersion: config.matcherConfigVersion,
      matchRuleVersion: config.matchRuleVersion,
      transitions: [] as Prisma.InputJsonValue, // filled after recompute
    },
  });

  // Match rule v1: exact domain type + exact ontologyKey.
  let linksCreated = 0;
  for (const h of hypotheses) {
    if (!h.ontologyKey) continue;
    const matches = extracted.filter(
      (x) => x.type === h.type && x.ontologyKey === h.ontologyKey,
    );
    if (matches.length === 0) continue;
    const evidenceIds = matches.flatMap((m) => m.evidence.map((e) => e.id));
    const existing = new Set(
      (
        await tx.hypothesisEvidenceLink.findMany({
          where: { nodeId: h.id, evidenceId: { in: evidenceIds } },
          select: { evidenceId: true },
        })
      ).map((l) => l.evidenceId),
    );
    for (const evidenceId of evidenceIds) {
      if (existing.has(evidenceId)) continue;
      await tx.hypothesisEvidenceLink.create({
        data: {
          nodeId: h.id,
          evidenceId,
          evidenceIdWas: evidenceId, // copy-at-insert (r3 A-3)
          matchRuleVersion: config.matchRuleVersion,
          matchedAt: now,
          runId: run.id,
        },
      });
      linksCreated++;
    }
  }

  // Recompute EVERY standing hypothesis (full-graph; per-person graphs are
  // dozens of nodes — nothing to queue). Unmatched ones stay SILENT because
  // the arithmetic says so, not because we skipped them.
  const transitions: HypothesisTransition[] = [];
  for (const h of hypotheses) {
    transitions.push(
      await recomputeHypothesis(tx, h, config, gateConfig, now),
    );
  }

  await tx.matcherRun.update({
    where: { id: run.id },
    data: { transitions: transitions as unknown as Prisma.InputJsonValue },
  });

  return { runId: run.id, linksCreated, transitions };
}

// ── The confirmation overlay's write surface (D-R7, trigger 4) ──────────────

export interface ConfirmInput {
  practitionerId: string;
  nodeId: string;
  direction: "AFFIRM" | "GROUND";
  config: MatcherConfig;
  gateConfig: GateConfig;
  now: Date;
}

/** Practitioner confirmation: authority, not evidence. Requires a standing
 * practitioner relationship; recomputes the named hypothesis transactionally
 * (the overlay applies inside recompute, AFTER nextState). */
export async function confirmHypothesis(
  prisma: PrismaClient,
  input: ConfirmInput,
): Promise<MatcherRunResult> {
  const { practitionerId, nodeId, direction, config, gateConfig, now } = input;
  return prisma.$transaction(async (tx) => {
    const node = await tx.psycheNode.findUniqueOrThrow({ where: { id: nodeId } });
    const rel = await tx.practitionerClient.findFirst({
      where: { practitionerId, clientId: node.userId },
    });
    if (!rel) {
      throw new Error(
        "confirmHypothesis: no standing practitioner relationship — authority requires the engagement",
      );
    }
    const confirmation = await tx.hypothesisConfirmation.create({
      data: { practitionerId, nodeId, direction, at: now },
    });
    const result = await runMatcherForUser(tx, {
      userId: node.userId,
      trigger: "CONFIRMATION",
      triggerPayload: { confirmationId: confirmation.id, direction },
      config,
      gateConfig,
      now,
    });
    await tx.hypothesisConfirmation.update({
      where: { id: confirmation.id },
      data: { appliedByRunId: result.runId },
    });
    return result;
  });
}

export interface WithdrawInput {
  confirmationId: string;
  config: MatcherConfig;
  gateConfig: GateConfig;
  now: Date;
}

/** Withdrawal (reversible/contestable): the overlay stops telling; the
 * evidence-derived state stands underneath — recomputed in the same
 * transaction via trigger 4. */
export async function withdrawConfirmation(
  prisma: PrismaClient,
  input: WithdrawInput,
): Promise<MatcherRunResult> {
  const { confirmationId, config, gateConfig, now } = input;
  return prisma.$transaction(async (tx) => {
    const confirmation = await tx.hypothesisConfirmation.update({
      where: { id: confirmationId },
      data: { withdrawnAt: now },
    });
    const node = await tx.psycheNode.findUniqueOrThrow({
      where: { id: confirmation.nodeId },
    });
    return runMatcherForUser(tx, {
      userId: node.userId,
      trigger: "CONFIRMATION",
      triggerPayload: { withdrawnConfirmationId: confirmation.id },
      config,
      gateConfig,
      now,
    });
  });
}
