// Confidence — distinct from mass (spec §6.3). Mass = "how much weight";
// confidence = "how sure we are this node is real and correctly typed".
// LAW 5: confidence is ALWAYS a number; unknown is an explicit low value,
// never null.

import type { GateConfig } from "./config";
import type { ConfidenceDerivation, EvidenceRecord } from "./types";

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * confidence = clamp01( base
 *                     + perExtraSource * max(0, distinctSupportingSources - 1)
 *                     - contradictionPenalty * contradictionSignal
 *                     - noveltyPenalty * ontologyNovelty )
 *
 * contradictionSignal is the fraction of contributing distinct sources that
 * are countervailing — graded, bounded, explainable. The corroboration term
 * is floored at 0 so zero-evidence hypotheses aren't double-penalized below
 * the hypothesis floor (the gate assigns the floor for HYPOTHESIS state).
 */
export function computeConfidence(
  evidence: EvidenceRecord[],
  ctx: { ontologyNovel: boolean },
  config: GateConfig,
): { value: number; derivation: ConfidenceDerivation } {
  const live = evidence.filter(
    (e) => e.authorship === "SELF" && e.sourceInvalidatedAt == null,
  );
  const supportingSources = new Set(
    live.filter((e) => e.polarity === "SUPPORTING").map((e) => e.sourceEventId),
  ).size;
  const countervailingSources = new Set(
    live.filter((e) => e.polarity === "COUNTERVAILING").map((e) => e.sourceEventId),
  ).size;

  const contributing = supportingSources + countervailingSources;
  const contradictionSignal = contributing === 0 ? 0 : countervailingSources / contributing;
  const ontologyNovelty = ctx.ontologyNovel ? 1 : 0;

  const c = config.confidence;
  const value = clamp01(
    c.base +
      c.corroborationPerExtraSource * Math.max(0, supportingSources - 1) -
      c.contradictionPenalty * contradictionSignal -
      c.ontologyNoveltyPenalty * ontologyNovelty,
  );

  return {
    value,
    derivation: {
      algorithmVersion: config.confidenceAlgorithmVersion,
      base: c.base,
      distinctSourceCount: supportingSources,
      contradictionSignal,
      ontologyNovelty,
    },
  };
}
