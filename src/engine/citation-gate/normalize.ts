// String normalization with an explicit index map (spec §5).
//
// The trap this module exists to avoid: NFKC changes string LENGTH
// (ﬁ→fi, Ｈ→H, №→No, é-decomposed→é-composed), so "find the quote in the
// normalized source, then slice the ORIGINAL at that index" corrupts spans
// the moment any earlier character normalized to a different length. We
// therefore carry, for every UTF-16 unit of the normalized string, the
// [start, end) range in the ORIGINAL string it came from.
//
// v1 pipeline (applied IDENTICALLY to quote and source, in this order):
//   1. Unicode NFKC
//   2. curly quotes/apostrophes → straight; en/em/figure/horizontal dashes
//      and minus → hyphen
//   3. case-fold (lowercase)
//   4. collapse all whitespace runs to a single space; trim
//
// Deliberately NOT here (spec §5): stemming, synonym expansion, fuzzy /
// edit-distance matching, dropping words. Those cross from "same words"
// into "similar meaning", and the gate only certifies same words.
//
// Implementation note: the original is segmented into chunks (a base code
// point plus any following combining marks) and each chunk is normalized
// independently. Chunk-wise NFKC can differ from whole-string NFKC in exotic
// cross-boundary compositions, but the SAME function is applied to both quote
// and source, so matching is internally consistent — and every emitted unit
// maps to a real original chunk, which is what span integrity requires.

export const NORMALIZATION_VERSION = "v1";

export interface NormalizedText {
  normalized: string;
  /** For normalized[i]: index in the ORIGINAL where its source chunk starts. */
  mapStart: number[];
  /** For normalized[i]: index in the ORIGINAL where its source chunk ends (exclusive). */
  mapEnd: number[];
}

const COMBINING_MARK = /\p{M}/u;
const WHITESPACE = /\s/;

const CHAR_FOLD: Record<string, string> = {
  // apostrophes / single quotes
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  // double quotes
  "“": '"',
  "”": '"',
  "„": '"',
  "‟": '"',
  // dashes → hyphen
  "‒": "-",
  "–": "-",
  "—": "-",
  "―": "-",
  "−": "-",
};

function foldChars(s: string): string {
  let out = "";
  for (const ch of s) out += CHAR_FOLD[ch] ?? ch;
  return out;
}

/**
 * Normalize `original`, returning the normalized string plus the index map
 * back to the original. Pure and deterministic.
 */
export function normalizeWithMap(original: string): NormalizedText {
  const normalized: string[] = [];
  const mapStart: number[] = [];
  const mapEnd: number[] = [];

  // Pending collapsed-whitespace marker: original chunk range of the FIRST
  // whitespace unit in the current run.
  let pendingWs: { start: number; end: number } | null = null;

  let i = 0;
  const len = original.length;
  while (i < len) {
    // One chunk: a base code point + any following combining marks.
    const chunkStart = i;
    const first = original.codePointAt(i)!;
    i += first > 0xffff ? 2 : 1;
    while (i < len) {
      const cp = original.codePointAt(i)!;
      const ch = String.fromCodePoint(cp);
      if (!COMBINING_MARK.test(ch)) break;
      i += cp > 0xffff ? 2 : 1;
    }
    const chunkEnd = i;

    const piece = foldChars(
      original.slice(chunkStart, chunkEnd).normalize("NFKC"),
    ).toLowerCase();

    for (const unit of piece) {
      // `for..of` iterates code points; emit their UTF-16 units with the map.
      if (WHITESPACE.test(unit)) {
        if (pendingWs === null) pendingWs = { start: chunkStart, end: chunkEnd };
        continue;
      }
      if (pendingWs !== null) {
        if (normalized.length > 0) {
          // Interior run collapses to one space, mapped to the run's start.
          normalized.push(" ");
          mapStart.push(pendingWs.start);
          mapEnd.push(pendingWs.end);
        }
        pendingWs = null; // leading whitespace is trimmed (never emitted)
      }
      for (let u = 0; u < unit.length; u++) {
        normalized.push(unit[u]);
        mapStart.push(chunkStart);
        mapEnd.push(chunkEnd);
      }
    }
  }
  // Trailing whitespace (still pending) is trimmed by simply dropping it.

  return { normalized: normalized.join(""), mapStart, mapEnd };
}

/** Normalize a quote through the identical pipeline (no map needed). */
export function normalizeQuote(quote: string): string {
  return normalizeWithMap(quote).normalized;
}
