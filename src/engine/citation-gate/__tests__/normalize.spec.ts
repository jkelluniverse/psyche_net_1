// Test 11 — NFKC span-integrity (spec §5: "the highest-probability production
// bug in the gate"). NFKC changes string LENGTH (ﬁ→fi, full-width→half-width,
// combining forms), so spans must come from an explicit index map back to the
// ORIGINAL content — with non-ASCII fixtures, not just ASCII.

import { describe, expect, it } from "vitest";
import { normalizeQuote, normalizeWithMap } from "../normalize";
import { locateQuote } from "../locate";

/** Locate `quote` in `content` and slice the ORIGINAL content by the span. */
function sliceFor(content: string, quote: string, offsetHint?: number): string | null {
  const source = normalizeWithMap(content);
  const hit = locateQuote(normalizeQuote(quote), source, offsetHint);
  if (hit.kind !== "found") return null;
  return content.slice(hit.spanStart, hit.spanEnd);
}

describe("test 11 — NFKC span integrity with length-changing normalization", () => {
  it("ligature BEFORE the quote (ﬁ normalizes to fi, shifting every later index)", () => {
    const content = "The ﬁre taught me caution, and ﬁnally I admitted I am afraid of losing control.";
    expect(sliceFor(content, "i am afraid of losing control")).toBe(
      "I am afraid of losing control",
    );
  });

  it("ligature INSIDE the quote (slice returns the person's original ligature text)", () => {
    const content = "The ﬁre taught me caution. I am afraid of ﬁre now.";
    expect(sliceFor(content, "i am afraid of fire now")).toBe("I am afraid of ﬁre now");
  });

  it("full-width characters before and inside the quote", () => {
    const content = "彼らは「ＯＫ」と言った。 Ｉ ｎｅｖｅｒ ｌｅｔ ｔｈｅｍ see me struggle.";
    expect(sliceFor(content, "I never let them see me struggle")).toBe(
      "Ｉ ｎｅｖｅｒ ｌｅｔ ｔｈｅｍ see me struggle",
    );
  });

  it("combining accents: decomposed source vs precomposed quote", () => {
    // 'é' here is e + U+0301 (two code units in the source).
    const content = "Café nights again. Je suis fatigué de tout porter seul.";
    // Quote uses precomposed é.
    expect(sliceFor(content, "je suis fatigué de tout porter seul")).toBe(
      "Je suis fatigué de tout porter seul",
    );
  });

  it("emoji (astral, surrogate pairs) before the quote", () => {
    const content = "🌙✨🌌 journal: I hide my anger behind politeness. 🌙";
    expect(sliceFor(content, "i hide my anger behind politeness")).toBe(
      "I hide my anger behind politeness",
    );
  });

  it("mixed battery: every span slices to the exact human-readable source text", () => {
    const cases: Array<{ content: string; quote: string; expected: string }> = [
      {
        content: "ﬂowers ﬁrst — “then the ﬂood.” I couldn’t stop it.",
        quote: 'then the flood." i couldn\'t stop it',
        expected: "then the ﬂood.” I couldn’t stop it",
      },
      {
        content: "№1 rule: Ⅸ times out of ten I freeze when criticized.",
        quote: "ix times out of ten i freeze when criticized",
        expected: "Ⅸ times out of ten I freeze when criticized",
      },
    ];
    for (const c of cases) {
      expect(sliceFor(c.content, c.quote)).toBe(c.expected);
    }
  });
});

describe("normalization pipeline (§5)", () => {
  it("applies NFKC, quote/dash folding, casefold, and whitespace collapse identically", () => {
    expect(normalizeQuote("“Don’t — stop”")).toBe(normalizeQuote('"don\'t - STOP"'));
    expect(normalizeQuote("a\t\n  b")).toBe(normalizeQuote("a b"));
    expect(normalizeQuote("  padded  ")).toBe(normalizeQuote("padded"));
    expect(normalizeQuote("ﬁre")).toBe(normalizeQuote("fire"));
    expect(normalizeQuote("ＨＥＬＬＯ")).toBe(normalizeQuote("hello"));
  });

  it("does NOT do fuzzy matching: different words normalize differently", () => {
    expect(normalizeQuote("I am afraid")).not.toBe(normalizeQuote("I am scared"));
  });

  it("empty and whitespace-only strings normalize to empty (fail-closed upstream)", () => {
    expect(normalizeQuote("")).toBe("");
    expect(normalizeQuote(" \t\n ")).toBe("");
  });
});
