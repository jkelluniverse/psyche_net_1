// Mass — a pure function of the validated evidence set (spec §6.2).
// Arithmetic, never the model. Every value carries its derivation.

import type { GateConfig } from "./config";
import type { EvidenceRecord, MassDerivation, NodeType } from "../contracts/extraction-contracts";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The conferring rule (spec §6, v1.6/D8) — NOT authorship alone:
 *
 *   conferring = (authorship === SELF)
 *              ∧ (source not invalidated)
 *              ∧ (BECOMING nodes: role === ENACTMENT; others: role !== DECLARATION)
 *
 * D8 (round-3 Critical): ENACTMENT confers on EVERY node type — lived
 * behavior is the most evidential class, and the old `role === SUPPORT` rule
 * zero-conferred correctly-labeled enactments on extracted nodes, silently
 * starving behavior-heavy journals. DECLARATION confers nowhere: a wish
 * never charges anything, so a mislabel can still only UNDER-confer
 * (restrict-never-create holds in every direction). Practitioner-authored
 * words attach for display but confer nothing (LAW 3/4). Pass
 * `nodeType = null` for edges (same non-BECOMING rule).
 */
export function isConferring(
  e: Pick<EvidenceRecord, "authorship" | "role" | "sourceInvalidatedAt">,
  nodeType: NodeType | null,
): boolean {
  if (e.authorship !== "SELF") return false;
  if (e.sourceInvalidatedAt != null) return false;
  return nodeType === "BECOMING" ? e.role === "ENACTMENT" : e.role !== "DECLARATION";
}

function recencyWeight(occurredAt: Date, now: Date, halfLifeDays: number): number {
  const ageDays = Math.max(0, (now.getTime() - occurredAt.getTime()) / MS_PER_DAY);
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/**
 * mass = log2(1 + Σ recencyWeight) over conferring, SUPPORTING-polarity
 * evidence. Monotonic non-decreasing in evidence; diminishing returns;
 * temporally honest (a years-old-only node has low present mass);
 * invalidation-aware (superseded sources contribute nothing — a correction
 * actually corrects). COUNTERVAILING evidence never adds mass.
 */
export function computeMass(
  evidence: EvidenceRecord[],
  nodeType: NodeType | null,
  now: Date,
  config: GateConfig,
): { value: number; derivation: MassDerivation } {
  const conferring = evidence.filter(
    (e) => isConferring(e, nodeType) && e.polarity === "SUPPORTING",
  );
  const rawMass = conferring.reduce(
    (sum, e) => sum + recencyWeight(e.occurredAt, now, config.halfLifeDays),
    0,
  );
  return {
    value: Math.log2(1 + rawMass),
    derivation: {
      algorithmVersion: config.massAlgorithmVersion,
      conferringSupportingCount: conferring.length,
      distinctSources: new Set(conferring.map((e) => e.sourceEventId)).size,
      rawMass,
      halfLifeDays: config.halfLifeDays,
    },
  };
}
