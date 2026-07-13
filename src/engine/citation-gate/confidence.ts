// Confidence — distinct from mass (spec §6.3). Mass = "how much weight";
// confidence = "how sure we are this node is real and correctly typed".
// LAW 5: confidence is ALWAYS a number; unknown is an explicit low value,
// never null.

import type { GateConfig } from "./config";
import type { ConfidenceDerivation, EvidenceRecord } from "../contracts/extraction-contracts";

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * confidence = clamp01( base
 *                     + perExtraSource * max(0, distinctSupportingSources - 1)
 *                     - contradictionPenalty * contradictionSignal
 *                     - noveltyPenalty * ontologyNovelty
 *                     - hintFallbackPenalty * hintFallbackSignal )   // v1.3 §5
 *
 * contradictionSignal is the fraction of contributing distinct sources that
 * are countervailing — graded, bounded, explainable. hintFallbackSignal is 1
 * when any contributing evidence was located via the far-hint first-match
 * fallback (the span is verbatim-valid but the occurrence choice is less
 * certain). The corroboration term is floored at 0 so zero-evidence
 * hypotheses aren't double-penalized below the hypothesis floor (the gate
 * assigns the floor for HYPOTHESIS state).
 */
export function computeConfidence(
  evidence: EvidenceRecord[],
  ctx: { ontologyNovel: boolean; hintFallback?: boolean },
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
  const hintFallbackSignal = ctx.hintFallback ? 1 : 0;

  const c = config.confidence;
  const value = clamp01(
    c.base +
      c.corroborationPerExtraSource * Math.max(0, supportingSources - 1) -
      c.contradictionPenalty * contradictionSignal -
      c.ontologyNoveltyPenalty * ontologyNovelty -
      c.hintFallbackPenalty * hintFallbackSignal,
  );

  return {
    value,
    derivation: {
      algorithmVersion: config.confidenceAlgorithmVersion,
      base: c.base,
      distinctSourceCount: supportingSources,
      contradictionSignal,
      ontologyNovelty,
      hintFallbackSignal,
    },
  };
}
