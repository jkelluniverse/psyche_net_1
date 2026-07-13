// Quote location in a normalized source (spec v1.3 §5).
//
// THE HINT IS NEVER A LOCATOR: the gate finds ALL verbatim matches first;
// the proposer's offsetHint only chooses among them. A mismatched hint never
// rejects a quote that verifiably exists, and a hint can never create
// evidence (the quote must match verbatim regardless). Spans always index
// the ORIGINAL content.

import type { NormalizedText } from "./normalize";

export type LocateResult =
  | {
      kind: "found";
      spanStart: number;
      spanEnd: number;
      occurrences: number;
      /**
       * True when the quote matched multiple times, a hint was supplied, but
       * every match sat outside the plausibility radius — so the gate fell
       * back to the FIRST match (v1.3 §5). Lowers confidence downstream.
       */
      hintFallback: boolean;
    }
  | { kind: "not_found" }
  | { kind: "ambiguous"; occurrences: number };

export interface LocateOptions {
  /** Proposer-supplied approximate original-content offset (tie-break only). */
  offsetHint?: number;
  /** From gate config — max |matchStart − hint| for a hint to be honored. */
  hintPlausibilityRadiusChars: number;
}

/**
 * Find `normQuote` (already normalized) in `source` (normalized with map).
 *
 * - 0 occurrences → not_found (fail-closed).
 * - 1 occurrence → that one (any hint is irrelevant — never rejects).
 * - N occurrences + hint, some match within the radius → nearest match
 *   (ties resolve to the earliest — deterministic).
 * - N occurrences + hint, ALL matches outside the radius → first match,
 *   flagged hintFallback (confidence penalty, never rejection).
 * - N occurrences, no hint → ambiguous: rejected, never guessed.
 */
export function locateQuote(
  normQuote: string,
  source: NormalizedText,
  opts: LocateOptions,
): LocateResult {
  if (normQuote.length === 0 || source.normalized.length === 0) {
    return { kind: "not_found" };
  }

  // Step 1 — ALL verbatim matches, before the hint is even consulted.
  const starts: number[] = [];
  let idx = source.normalized.indexOf(normQuote);
  while (idx !== -1) {
    starts.push(idx);
    idx = source.normalized.indexOf(normQuote, idx + 1);
  }

  if (starts.length === 0) return { kind: "not_found" };

  let chosen: number;
  let hintFallback = false;

  if (starts.length === 1) {
    chosen = starts[0];
  } else if (opts.offsetHint !== undefined && Number.isFinite(opts.offsetHint)) {
    const hint = opts.offsetHint;
    const nearest = starts.reduce((best, cur) => {
      const dBest = Math.abs(source.mapStart[best] - hint);
      const dCur = Math.abs(source.mapStart[cur] - hint);
      return dCur < dBest ? cur : best; // strict < keeps the earlier on ties
    });
    if (Math.abs(source.mapStart[nearest] - hint) <= opts.hintPlausibilityRadiusChars) {
      chosen = nearest;
    } else {
      // Every match is implausibly far from the (model-counted, often wrong)
      // hint: fall back to the first match and lower confidence (v1.3 §5).
      chosen = starts[0];
      hintFallback = true;
    }
  } else {
    return { kind: "ambiguous", occurrences: starts.length };
  }

  return {
    kind: "found",
    spanStart: source.mapStart[chosen],
    spanEnd: source.mapEnd[chosen + normQuote.length - 1],
    occurrences: starts.length,
    hintFallback,
  };
}
