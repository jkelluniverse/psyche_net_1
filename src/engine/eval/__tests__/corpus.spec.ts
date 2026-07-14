// Corpus integrity is CI-enforced, not eyeballed. Two duties:
// 1. The shipped corpus passes its own gate-semantics checks (every labeled
//    span verbatim, every expectation materializable) and the spec's coverage
//    floors (≥3 entries/node type, ≥2/edge type, ≥10 adversarial, ≥5
//    third-party, ≥5 flat).
// 2. The validator itself bites — a checker that can't fail is decoration.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { coverageReport, parseCorpus, validateCorpus } from "../corpus";
import type { EvalCase, EvalCorpus } from "../types";

const CORPUS_PATH = join(__dirname, "../../../../eval/corpus/corpus.json");
const corpus = parseCorpus(JSON.parse(readFileSync(CORPUS_PATH, "utf8")));

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe("the shipped ground-truth corpus", () => {
  it("passes integrity validation (every labeled span verbatim; every expectation materializable)", () => {
    expect(validateCorpus(corpus)).toEqual([]);
  });

  it("meets the spec's coverage floors", () => {
    const report = coverageReport(corpus);
    expect(report.shortfalls).toEqual([]);
  });

  it("is versioned", () => {
    expect(corpus.corpusVersion).toBe("v1");
  });
});

describe("the validator bites (mutation checks on a copy)", () => {
  const firstStandard = (): { c: EvalCorpus; idx: number } => {
    const c = clone(corpus);
    const idx = c.cases.findIndex((k: EvalCase) => k.id === "std-belief-01");
    return { c, idx };
  };

  it("rejects a hand-labeled quote that is not verbatim in its source", () => {
    const { c, idx } = firstStandard();
    c.cases[idx].expectedNodes[0].entailedQuotes[0].quote = "words that are not in the entry";
    expect(validateCorpus(c).some((p) => p.includes("not verbatim"))).toBe(true);
  });

  it("rejects an unmaterializable expectation (all spans from one source)", () => {
    const { c, idx } = firstStandard();
    const q = c.cases[idx].expectedNodes[0].entailedQuotes;
    for (const e of q) e.sourceKey = "s1";
    c.cases[idx].expectedNodes[0].entailedQuotes = q.filter((e) => e.sourceKey === "s1");
    // make them verbatim in s1 so ONLY the materializability rule fires
    for (const e of c.cases[idx].expectedNodes[0].entailedQuotes) {
      e.quote = "Asking for help makes me a burden";
    }
    expect(validateCorpus(c).some((p) => p.includes("unmaterializable"))).toBe(true);
  });

  it("rejects a WOUND expectation under SOLO policy", () => {
    const { c, idx } = firstStandard();
    c.cases[idx].expectedNodes[0].type = "WOUND";
    expect(validateCorpus(c).some((p) => p.includes("WOUND expectation"))).toBe(true);
  });

  it("rejects a flat case that expects nodes", () => {
    const { c, idx } = firstStandard();
    c.cases[idx].category = "flat";
    expect(validateCorpus(c).some((p) => p.includes("flat"))).toBe(true);
  });

  it("rejects an adversarial case with no forbidden labels", () => {
    const c = clone(corpus);
    const adv = c.cases.find((k: EvalCase) => k.id === "adv-01")!;
    adv.forbiddenNodes = [];
    expect(validateCorpus(c).some((p) => p.includes("forbidden"))).toBe(true);
  });

  it("rejects an edge citing a nonexistent endpoint key", () => {
    const c = clone(corpus);
    const edgeCase = c.cases.find((k: EvalCase) => k.id === "edge-drives-01")!;
    edgeCase.expectedEdges[0].targetKey = "no-such-node";
    expect(validateCorpus(c).some((p) => p.includes("unknown node"))).toBe(true);
  });

  it("counts coverage shortfalls when a category is thinned", () => {
    const c = clone(corpus);
    c.cases = c.cases.filter((k: EvalCase) => k.category !== "flat");
    expect(coverageReport(c).shortfalls.some((s) => s.includes("flat"))).toBe(true);
  });

  it("parseCorpus refuses an un-versioned corpus", () => {
    expect(() => parseCorpus({ cases: [{}] })).toThrow(/corpusVersion/);
  });
});
