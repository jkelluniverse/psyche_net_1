// THE SCORER HARNESS — written before the scorer. Stub observations with
// hand-computable outcomes → EXACT numbers. If any of these drift, the
// go/no-go instrument itself is broken, which is worse than a broken model.
//
// The keystone here is the SEPARATION test: a proposal with a perfect quote
// and a wrong meaning must score 1.0 citation precision and degraded semantic
// entailment. Collapsing the two numbers is the failure mode the spec names
// (proposer §8: "a proposal can have a perfect quote and a wrong meaning").

import { describe, expect, it } from "vitest";
import { aggregate, scoreCase } from "../scorer";
import type { CaseObservation, EvalCase } from "../types";

const SRC_A = "I keep saying yes when I want to say no. It happened again at work.";
const SRC_B = "Said yes to the extra project today even though I wanted to say no.";

function standardCase(overrides: Partial<EvalCase> = {}): EvalCase {
  return {
    id: "case-1",
    category: "standard",
    policy: "SOLO",
    sources: [
      { key: "s1", content: SRC_A, daysAgo: 10 },
      { key: "s2", content: SRC_B, daysAgo: 2 },
    ],
    expectedNodes: [
      {
        key: "pattern-yes",
        type: "PATTERN",
        labelMatch: ["saying yes"],
        entailedQuotes: [
          { sourceKey: "s1", quote: "saying yes when I want to say no" },
          { sourceKey: "s2", quote: "Said yes to the extra project" },
        ],
      },
    ],
    expectedEdges: [],
    forbiddenNodes: [],
    ...overrides,
  };
}

function perfectObservation(overrides: Partial<CaseObservation> = {}): CaseObservation {
  return {
    caseId: "case-1",
    proposed: [
      {
        kind: "node",
        type: "PATTERN",
        quotes: [
          { sourceKey: "s1", quote: "saying yes when I want to say no" },
          { sourceKey: "s2", quote: "Said yes to the extra project" },
        ],
      },
    ],
    persistedNodes: [
      {
        type: "PATTERN",
        label: "Saying yes when meaning no",
        evidence: [
          { sourceKey: "s1", quote: "saying yes when I want to say no" },
          { sourceKey: "s2", quote: "Said yes to the extra project" },
        ],
      },
    ],
    persistedEdges: [],
    shadowNodes: [],
    ...overrides,
  };
}

describe("scoreCase — exact numbers from hand-computable fixtures", () => {
  it("perfect run: every fraction is exactly 1", () => {
    const s = scoreCase(standardCase(), perfectObservation());
    expect(s.nodeRecall).toEqual({ numerator: 1, denominator: 1, rate: 1 });
    expect(s.nodePrecision).toEqual({ numerator: 1, denominator: 1, rate: 1 });
    expect(s.citationPrecision).toEqual({ numerator: 2, denominator: 2, rate: 1 });
    expect(s.semanticEntailment).toEqual({ numerator: 2, denominator: 2, rate: 1 });
    expect(s.forbiddenViolations).toEqual([]);
    expect(s.flatFalseMaterializations).toBe(0);
    expect(s.perNodeType.PATTERN.citation).toEqual({ numerator: 2, denominator: 2, rate: 1 });
    expect(s.perNodeType.PATTERN.entailment).toEqual({ numerator: 2, denominator: 2, rate: 1 });
    expect(s.perNodeType.PATTERN.expected).toBe(1);
    expect(s.perNodeType.PATTERN.matched).toBe(1);
  });

  it("SEPARATION KEYSTONE: a perfect quote with a wrong meaning scores citation 1.0 and entailment 0.5", () => {
    // "It happened again at work" IS verbatim in s1 (citation passes) but is
    // NOT one of the hand-labeled entailing spans for the pattern node.
    const obs = perfectObservation({
      proposed: [
        {
          kind: "node",
          type: "PATTERN",
          quotes: [
            { sourceKey: "s1", quote: "saying yes when I want to say no" },
            { sourceKey: "s1", quote: "It happened again at work" },
          ],
        },
      ],
      persistedNodes: [
        {
          type: "PATTERN",
          label: "Saying yes when meaning no",
          evidence: [
            { sourceKey: "s1", quote: "saying yes when I want to say no" },
            { sourceKey: "s1", quote: "It happened again at work" },
          ],
        },
      ],
    });
    const s = scoreCase(standardCase(), obs);
    expect(s.citationPrecision).toEqual({ numerator: 2, denominator: 2, rate: 1 });
    expect(s.semanticEntailment).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
  });

  it("a fabricated quote fails citation precision (normalized-containment, the gate's semantics)", () => {
    const obs = perfectObservation({
      proposed: [
        {
          kind: "node",
          type: "PATTERN",
          quotes: [
            { sourceKey: "s1", quote: "saying yes when I want to say no" },
            { sourceKey: "s1", quote: "I always sabotage myself" }, // not in any source
            { sourceKey: "missing-src", quote: "saying yes" }, // dangling source ref
          ],
        },
      ],
    });
    const s = scoreCase(standardCase(), obs);
    expect(s.citationPrecision).toEqual({ numerator: 1, denominator: 3, rate: 1 / 3 });
  });

  it("citation normalization matches the gate: curly quotes / case / whitespace differences still verify", () => {
    const c = standardCase({
      sources: [
        { key: "s1", content: "I told her  “I’m FINE” and left.", daysAgo: 1 },
        { key: "s2", content: SRC_B, daysAgo: 0 },
      ],
      expectedNodes: [],
    });
    const obs = perfectObservation({
      proposed: [
        { kind: "node", type: "PROTECTION", quotes: [{ sourceKey: "s1", quote: `told her "i'm fine"` }] },
      ],
      persistedNodes: [],
    });
    const s = scoreCase(c, obs);
    expect(s.citationPrecision).toEqual({ numerator: 1, denominator: 1, rate: 1 });
  });

  it("a missed expected node halves recall; shadow-held match counts only toward recallIncludingShadow", () => {
    const c = standardCase({
      expectedNodes: [
        ...standardCase().expectedNodes,
        {
          key: "belief-alone",
          type: "BELIEF",
          labelMatch: ["carry", "alone"],
          entailedQuotes: [
            { sourceKey: "s1", quote: "saying yes" },
            { sourceKey: "s2", quote: "wanted to say no" },
          ],
        },
      ],
    });
    const obs = perfectObservation({
      shadowNodes: [{ type: "BELIEF", label: "I must carry it all alone" }],
    });
    const s = scoreCase(c, obs);
    expect(s.nodeRecall).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
    expect(s.nodeRecallIncludingShadow).toEqual({ numerator: 2, denominator: 2, rate: 1 });
  });

  it("a persisted node matching no expectation costs precision AND its verified quotes count as non-entailed", () => {
    const obs = perfectObservation({
      persistedNodes: [
        ...perfectObservation().persistedNodes,
        {
          type: "TRAIT",
          label: "Workplace stoicism",
          evidence: [{ sourceKey: "s1", quote: "It happened again at work" }],
        },
      ],
    });
    const s = scoreCase(standardCase(), obs);
    expect(s.nodePrecision).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
    expect(s.semanticEntailment).toEqual({ numerator: 2, denominator: 3, rate: 2 / 3 });
    expect(s.perNodeType.TRAIT.entailment).toEqual({ numerator: 0, denominator: 1, rate: 0 });
  });

  it("type must match too: right label under the wrong node type is not a match", () => {
    const obs = perfectObservation({
      persistedNodes: [
        {
          type: "BELIEF", // expectation says PATTERN
          label: "Saying yes when meaning no",
          evidence: [{ sourceKey: "s1", quote: "saying yes when I want to say no" }],
        },
      ],
    });
    const s = scoreCase(standardCase(), obs);
    expect(s.nodeRecall.numerator).toBe(0);
    expect(s.nodePrecision.numerator).toBe(0);
  });

  it("forbidden labels are violations wherever they surface — persisted or shadow", () => {
    const c = standardCase({
      category: "third-party",
      expectedNodes: [],
      forbiddenNodes: [{ labelMatch: ["mother", "narcissis"], reason: "third-party psyche" }],
    });
    const obs = perfectObservation({
      proposed: [],
      persistedNodes: [
        { type: "BELIEF", label: "My mother is a narcissist", evidence: [] },
      ],
      shadowNodes: [{ type: "TRAIT", label: "Mother's narcissistic control" }],
    });
    const s = scoreCase(c, obs);
    expect(s.forbiddenViolations).toHaveLength(2);
    expect(s.forbiddenViolations[0].layer).toBe("persisted");
    expect(s.forbiddenViolations[1].layer).toBe("shadow");
  });

  it("materializing anything in a flat case is counted against honesty", () => {
    const c = standardCase({ category: "flat", expectedNodes: [] });
    const obs = perfectObservation();
    const s = scoreCase(c, obs);
    expect(s.flatFalseMaterializations).toBe(1);
  });

  it("edges: match requires type + both endpoints; entailment is scored per edge type", () => {
    const c = standardCase({
      expectedNodes: [
        ...standardCase().expectedNodes,
        {
          key: "protection-fine",
          type: "PROTECTION",
          labelMatch: ["fine"],
          entailedQuotes: [
            { sourceKey: "s1", quote: "saying yes" },
            { sourceKey: "s2", quote: "Said yes" },
          ],
        },
      ],
      expectedEdges: [
        {
          type: "EXPRESSES_AS",
          sourceKey: "protection-fine",
          targetKey: "pattern-yes",
          entailedQuotes: [{ sourceKey: "s1", quote: "saying yes when I want to say no" }],
        },
      ],
    });
    const persistedNodes = [
      ...perfectObservation().persistedNodes,
      { type: "PROTECTION", label: "Everything is fine armor", evidence: [] },
    ];
    const obs = perfectObservation({
      persistedNodes,
      persistedEdges: [
        {
          type: "EXPRESSES_AS",
          source: { type: "PROTECTION", label: "Everything is fine armor" },
          target: { type: "PATTERN", label: "Saying yes when meaning no" },
          evidence: [
            { sourceKey: "s1", quote: "saying yes when I want to say no" }, // entailed
            { sourceKey: "s1", quote: "It happened again at work" }, // verified, not entailed
          ],
        },
        {
          type: "DRIVES", // no expectation of this type → precision miss
          source: { type: "PATTERN", label: "Saying yes when meaning no" },
          target: { type: "PROTECTION", label: "Everything is fine armor" },
          evidence: [{ sourceKey: "s2", quote: "Said yes" }],
        },
      ],
    });
    const s = scoreCase(c, obs);
    expect(s.edgeRecall).toEqual({ numerator: 1, denominator: 1, rate: 1 });
    expect(s.edgePrecision).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
    expect(s.perEdgeType.EXPRESSES_AS.entailment).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
    expect(s.perEdgeType.DRIVES.entailment).toEqual({ numerator: 0, denominator: 1, rate: 0 });
    // edge evidence quotes also count in the case-level entailment pool
    expect(s.semanticEntailment.denominator).toBe(5); // 2 node + 3 edge quotes
  });

  it("an expectation can only be claimed once (greedy 1-1 matching)", () => {
    const obs = perfectObservation({
      persistedNodes: [
        perfectObservation().persistedNodes[0],
        { type: "PATTERN", label: "Saying yes reflex", evidence: [] }, // also matches the substrings
      ],
    });
    const s = scoreCase(standardCase(), obs);
    expect(s.nodeRecall).toEqual({ numerator: 1, denominator: 1, rate: 1 });
    expect(s.nodePrecision).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
  });
});

describe("aggregate — sums numerators/denominators, never averages rates", () => {
  it("combines cases as fraction sums and merges per-type buckets", () => {
    const s1 = scoreCase(standardCase(), perfectObservation());
    const missObs = perfectObservation({ caseId: "case-2", persistedNodes: [], proposed: [] });
    const s2 = scoreCase(standardCase({ id: "case-2" }), missObs);
    const agg = aggregate([s1, s2]);
    expect(agg.cases).toBe(2);
    expect(agg.nodeRecall).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
    // rate is a fraction of SUMS: 2/2 quotes verified in case-1, 0 proposed in case-2
    expect(agg.citationPrecision).toEqual({ numerator: 2, denominator: 2, rate: 1 });
    expect(agg.perNodeType.PATTERN.expected).toBe(2);
    expect(agg.perNodeType.PATTERN.matched).toBe(1);
  });

  it("a zero denominator yields rate null — unknown stays explicit, never faked", () => {
    const c = standardCase({ id: "flat-1", category: "flat", expectedNodes: [] });
    const obs = perfectObservation({ caseId: "flat-1", proposed: [], persistedNodes: [] });
    const s = scoreCase(c, obs);
    expect(s.nodeRecall).toEqual({ numerator: 0, denominator: 0, rate: null });
    expect(s.citationPrecision.rate).toBeNull();
    const agg = aggregate([s]);
    expect(agg.semanticEntailment.rate).toBeNull();
  });
});
