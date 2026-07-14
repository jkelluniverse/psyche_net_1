// HYPOTHESIS RECOMPUTE — the gate's arithmetic, imported; reimplementation
// banned (renderer-lens spec §3.1).
//
// - LIVE-JOIN RULE: linked evidence rows are read at compute time with
//   authorship and sourceInvalidatedAt from the CURRENT SourceEvent — never
//   cached from link time — so linked evidence obeys EXACTLY the gate's
//   invalidation-aware semantics: same filter, same definition, imported.
// - REPLAY-FROM-BASELINE: a hypothesis's state is a pure function of the
//   SURVIVING evidence set, so recompute always runs nextState from the
//   HYPOTHESIS baseline over (own ∪ linked) evidence. That is what lets a
//   retraction REVERT state ("un-confirming must un-tell") — an incremental
//   transition from the current state could only ever hold or advance.
// - The ABSENCE of evidence needs no positive carrier: the merged set is
//   simply smaller, and mass is a pure function of the surviving records.
// - D-R7 OVERLAY: practitioner confirmation is applied AFTER nextState as a
//   distinct input class — authority, not evidence. State only, never mass.
//   Its validity is checked LIVE: withdrawn or relationship-severed
//   confirmations have no effect at the moment of recompute.

import type { Prisma } from "@prisma/client";
import type { GateConfig } from "../citation-gate/config";
import { computeMass } from "../citation-gate/mass";
import { computeConfidence } from "../citation-gate/confidence";
import { nextState } from "../citation-gate/state";
import type {
  EvidenceRecord,
  NodeState,
  NodeType,
  Provenance,
} from "../contracts/extraction-contracts";
import type { MatcherConfig } from "./config";

export interface HypothesisTransition {
  nodeId: string;
  from: NodeState;
  to: NodeState;
  massBefore: number;
  massAfter: number;
  rule: string;
}

interface NodeRow {
  id: string;
  userId: string;
  type: string;
  provenance: string;
  state: string;
  mass: number;
}

const toRecord = (e: {
  sourceEventId: string;
  quote: string;
  spanStart: number;
  spanEnd: number;
  occurredAt: Date;
  role: string;
  polarity: string;
  sourceEvent: { authorship: string; invalidatedAt: Date | null };
}): EvidenceRecord => ({
  sourceEventId: e.sourceEventId,
  quote: e.quote,
  spanStart: e.spanStart,
  spanEnd: e.spanEnd,
  occurredAt: e.occurredAt,
  authorship: e.sourceEvent.authorship as EvidenceRecord["authorship"],
  role: e.role as EvidenceRecord["role"],
  polarity: e.polarity as EvidenceRecord["polarity"],
  sourceInvalidatedAt: e.sourceEvent.invalidatedAt,
});

/** Merged evidence set: own rows ∪ live-linked rows, live-joined. */
async function loadMergedEvidence(
  tx: Prisma.TransactionClient,
  nodeId: string,
): Promise<EvidenceRecord[]> {
  const [own, links] = await Promise.all([
    tx.evidence.findMany({
      where: { nodeId },
      include: {
        sourceEvent: { select: { authorship: true, invalidatedAt: true } },
      },
    }),
    tx.hypothesisEvidenceLink.findMany({
      where: { nodeId, invalidatedAt: null, evidenceId: { not: null } },
      include: {
        evidence: {
          include: {
            sourceEvent: { select: { authorship: true, invalidatedAt: true } },
          },
        },
      },
    }),
  ]);
  const seen = new Set(own.map((e) => e.id));
  const merged = own.map(toRecord);
  for (const l of links) {
    if (l.evidence && !seen.has(l.evidence.id)) {
      seen.add(l.evidence.id);
      merged.push(toRecord(l.evidence));
    }
  }
  // Canonical order (occurredAt, then id-equivalent) for byte-determinism.
  return merged.sort(
    (a, b) =>
      a.occurredAt.getTime() - b.occurredAt.getTime() ||
      (a.sourceEventId < b.sourceEventId ? -1 : 1),
  );
}

/** The live authority check: an overlay counts only while un-withdrawn AND
 * the practitioner relationship stands (severance withdraws the effect). */
async function loadActiveConfirmations(
  tx: Prisma.TransactionClient,
  nodeId: string,
  userId: string,
): Promise<{ id: string; direction: string }[]> {
  const confirmations = await tx.hypothesisConfirmation.findMany({
    where: { nodeId, withdrawnAt: null },
  });
  const live: { id: string; direction: string }[] = [];
  for (const c of confirmations) {
    const rel = await tx.practitionerClient.findFirst({
      where: { practitionerId: c.practitionerId, clientId: userId },
    });
    if (rel) live.push({ id: c.id, direction: c.direction });
  }
  return live;
}

/** The pending-confirmation rule (test 14), defined ONCE: in SUPERVISED
 * mode the evidence would justify CONTRADICTED but authority hasn't spoken.
 * The loader consumes this for the view model; the matcher applies the same
 * condition when holding state — a second definition would drift. */
export function isPendingConfirmation(
  merged: EvidenceRecord[],
  args: {
    currentState: NodeState;
    nodeType: NodeType;
    provenance: Provenance;
    mode: MatcherConfig["mode"];
    hasActiveGround: boolean;
    now: Date;
    gateConfig: GateConfig;
  },
): boolean {
  if (args.mode !== "SUPERVISED") return false;
  if (args.currentState === "CONTRADICTED") return false;
  if (args.hasActiveGround) return false;
  const computed = nextState(
    "HYPOTHESIS",
    merged,
    { nodeType: args.nodeType, provenance: args.provenance },
    args.now,
    args.gateConfig,
  );
  return computed.state === "CONTRADICTED";
}

/** Recompute one hypothesis node. Pure arithmetic + the overlay; the caller
 * owns the transaction and the MatcherRun row. */
export async function recomputeHypothesis(
  tx: Prisma.TransactionClient,
  node: NodeRow,
  config: MatcherConfig,
  gateConfig: GateConfig,
  now: Date,
): Promise<HypothesisTransition> {
  const merged = await loadMergedEvidence(tx, node.id);
  const nodeType = node.type as NodeType;

  const mass = computeMass(merged, nodeType, now, gateConfig);
  const liveEvidence = merged.filter(
    (e) => e.authorship === "SELF" && e.sourceInvalidatedAt === null,
  );
  // Zero surviving evidence → EXACTLY the mint floor (the ghost reverts to
  // what a chart guess is worth); otherwise the gate's value, floored —
  // unknown is explicit, never zero and never inflated.
  const confidence =
    liveEvidence.length === 0
      ? gateConfig.confidence.hypothesisFloor
      : Math.max(
          gateConfig.confidence.hypothesisFloor,
          computeConfidence(merged, { ontologyNovel: false }, gateConfig).value,
        );

  const computed = nextState(
    "HYPOTHESIS", // replay-from-baseline (see module banner)
    merged,
    { nodeType, provenance: node.provenance as Provenance },
    now,
    gateConfig,
  );

  let state = computed.state;
  let rule = computed.derivation.rule;

  const confirmations = await loadActiveConfirmations(tx, node.id, node.userId);
  const hasGround = confirmations.some((c) => c.direction === "GROUND");
  const hasAffirm = confirmations.some((c) => c.direction === "AFFIRM");

  if (state === "CONTRADICTED" && config.mode === "SUPERVISED" && !hasGround) {
    // SUPERVISED contradiction requires authority (D-R7): hold at what the
    // non-countervailing evidence justifies, visibly pending — never silent.
    const withoutCounter = nextState(
      "HYPOTHESIS",
      merged.filter((e) => e.polarity !== "COUNTERVAILING"),
      { nodeType, provenance: node.provenance as Provenance },
      now,
      gateConfig,
    );
    state = withoutCounter.state;
    rule = "supervised:pending-confirmation";
  } else if (state === "HYPOTHESIS" && hasAffirm) {
    // Authority moves STATE only — mass stays exactly what the words justify.
    state = "ACTIVE";
    rule = "overlay:affirmed-by-practitioner";
  } else if (state !== "CONTRADICTED" && hasGround && config.mode === "SUPERVISED") {
    // An explicit GROUND lands the contradiction the mode was holding.
    state = "CONTRADICTED";
    rule = "overlay:grounded-by-practitioner";
  }

  await tx.psycheNode.update({
    where: { id: node.id },
    data: {
      mass: mass.value,
      confidence,
      state: state as never,
      massAlgorithmVersion: gateConfig.massAlgorithmVersion,
      confidenceAlgorithmVersion: gateConfig.confidenceAlgorithmVersion,
      stateAlgorithmVersion: gateConfig.stateAlgorithmVersion,
      gateVersion: gateConfig.gateVersion,
      computedAt: now,
    },
  });

  return {
    nodeId: node.id,
    from: node.state as NodeState,
    to: state,
    massBefore: node.mass,
    massAfter: mass.value,
    rule,
  };
}

/** Recompute a stored EXTRACTED node after a retraction touched its
 * evidence: mass/confidence via the gate's invalidation-aware filter;
 * state via nextState from the CURRENT state (the arc's own semantics —
 * extracted state is incremental, only hypotheses replay from baseline). */
export async function recomputeExtractedNode(
  tx: Prisma.TransactionClient,
  node: NodeRow,
  gateConfig: GateConfig,
  now: Date,
): Promise<HypothesisTransition> {
  const own = await tx.evidence.findMany({
    where: { nodeId: node.id },
    include: {
      sourceEvent: { select: { authorship: true, invalidatedAt: true } },
    },
  });
  const records = own.map(toRecord);
  const nodeType = node.type as NodeType;
  const mass = computeMass(records, nodeType, now, gateConfig);
  const confidence = computeConfidence(records, { ontologyNovel: false }, gateConfig);
  const computed = nextState(
    node.state as NodeState,
    records,
    { nodeType, provenance: node.provenance as Provenance },
    now,
    gateConfig,
  );
  await tx.psycheNode.update({
    where: { id: node.id },
    data: {
      mass: mass.value,
      confidence: confidence.value,
      state: computed.state as never,
      massAlgorithmVersion: gateConfig.massAlgorithmVersion,
      confidenceAlgorithmVersion: gateConfig.confidenceAlgorithmVersion,
      stateAlgorithmVersion: gateConfig.stateAlgorithmVersion,
      gateVersion: gateConfig.gateVersion,
      computedAt: now,
    },
  });
  return {
    nodeId: node.id,
    from: node.state as NodeState,
    to: computed.state,
    massBefore: node.mass,
    massAfter: mass.value,
    rule: computed.derivation.rule,
  };
}
