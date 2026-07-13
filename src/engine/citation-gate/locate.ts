// Quote location in a normalized source, with the multi-occurrence tie-break
// (spec §5) and span mapping back to the ORIGINAL content.

import type { NormalizedText } from "./normalize";

export type LocateResult =
  | { kind: "found"; spanStart: number; spanEnd: number; occurrences: number }
  | { kind: "not_found" }
  | { kind: "ambiguous"; occurrences: number };

/**
 * Find `normQuote` (already normalized) in `source` (normalized with map).
 *
 * - 0 occurrences → not_found (fail-closed).
 * - 1 occurrence → that one.
 * - N occurrences + offsetHint → the occurrence whose ORIGINAL start index is
 *   nearest the hint (ties resolve to the earliest — deterministic).
 * - N occurrences, no hint → ambiguous: rejected, never guessed.
 *
 * The returned span always indexes the ORIGINAL content.
 */
export function locateQuote(
  normQuote: string,
  source: NormalizedText,
  offsetHint?: number,
): LocateResult {
  if (normQuote.length === 0 || source.normalized.length === 0) {
    return { kind: "not_found" };
  }

  const starts: number[] = [];
  let idx = source.normalized.indexOf(normQuote);
  while (idx !== -1) {
    starts.push(idx);
    idx = source.normalized.indexOf(normQuote, idx + 1);
  }

  if (starts.length === 0) return { kind: "not_found" };

  let chosen: number;
  if (starts.length === 1) {
    chosen = starts[0];
  } else if (offsetHint !== undefined && Number.isFinite(offsetHint)) {
    chosen = starts.reduce((best, cur) => {
      const dBest = Math.abs(source.mapStart[best] - offsetHint);
      const dCur = Math.abs(source.mapStart[cur] - offsetHint);
      return dCur < dBest ? cur : best; // strict < keeps the earlier on ties
    });
  } else {
    return { kind: "ambiguous", occurrences: starts.length };
  }

  return {
    kind: "found",
    spanStart: source.mapStart[chosen],
    spanEnd: source.mapEnd[chosen + normQuote.length - 1],
    occurrences: starts.length,
  };
}
