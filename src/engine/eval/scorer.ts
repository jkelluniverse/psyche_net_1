// THE FIDELITY SCORER — a pure function of (ground-truth case, observation).
// No model calls, no DB, no clock (CLAUDE.md: pure, replayable, explainable).
//
// Two headline numbers, kept separate by spec (proposer §8):
// - citation precision: is each PROPOSED quote the person's verbatim words?
//   Judged with the gate's own normalization (normalizeQuote) so "verified"
//   here means what it means at the trust boundary.
// - semantic entailment: does each VALIDATED quote on a persisted item
//   actually entail the expectation its item matched? Deterministic
//   containment against hand-labeled spans — no LLM judge is ever a hidden
//   truth gate.
//
// Every rate is an explainable Fraction; denominator 0 → rate null (unknown
// is explicit, never faked).

import { normalizeQuote } from "../citation-gate/normalize";
import type {
  AggregateScore,
  CaseObservation,
  CaseScore,
  EntailedQuote,
  EvalCase,
  ExpectedNode,
  Fraction,
  ObservedNode,
  ObservedQuote,
  TypeBucket,
} from "./types";

export const SCORER_VERSION = "v1";

export function fraction(numerator: number, denominator: number): Fraction {
  return { numerator, denominator, rate: denominator === 0 ? null : numerator / denominator };
}

const addFractions = (a: Fraction, b: Fraction): Fraction =>
  fraction(a.numerator + b.numerator, a.denominator + b.denominator);

/** All hand-labeled substrings present in the normalized label. */
const labelMatches = (label: string, substrings: string[]): boolean => {
  const nl = normalizeQuote(label);
  return substrings.every((s) => nl.includes(normalizeQuote(s)));
};

/** Gate-semantics verifiability: normalized quote occurs in the cited source. */
const quoteVerifies = (q: ObservedQuote, sourcesByKey: Map<string, string>): boolean => {
  const content = sourcesByKey.get(q.sourceKey);
  if (content === undefined) return false;
  const nq = normalizeQuote(q.quote);
  return nq.length > 0 && normalizeQuote(content).includes(nq);
};

/**
 * Deterministic entailment: the validated quote and a hand-labeled entailing
 * span contain one another (normalized). Either direction — the gate
 * canonicalizes quotes to source slices, and a faithful model may cite a
 * sub-span or a super-span of the labeled words.
 */
const quoteEntailed = (q: ObservedQuote, labeled: EntailedQuote[]): boolean => {
  const nq = normalizeQuote(q.quote);
  if (nq.length === 0) return false;
  return labeled.some((l) => {
    if (l.sourceKey !== q.sourceKey) return false;
    const nl = normalizeQuote(l.quote);
    return nq.includes(nl) || nl.includes(nq);
  });
};

const emptyBucket = (): TypeBucket => ({
  citation: fraction(0, 0),
  entailment: fraction(0, 0),
  expected: 0,
  matched: 0,
});

const nodeMatchesExpectation = (n: { type: string; label: string }, e: ExpectedNode): boolean =>
  n.type === e.type && labelMatches(n.label, e.labelMatch);

export function scoreCase(c: EvalCase, obs: CaseObservation): CaseScore {
  const sourcesByKey = new Map(c.sources.map((s) => [s.key, s.content]));
  const perNodeType: Record<string, TypeBucket> = {};
  const perEdgeType: Record<string, TypeBucket> = {};
  const bucket = (map: Record<string, TypeBucket>, type: string): TypeBucket =>
    (map[type] ??= emptyBucket());

  // ── Citation precision: every PROPOSED quote, gate semantics ─────────────
  let citation = fraction(0, 0);
  for (const p of obs.proposed) {
    const map = p.kind === "node" ? perNodeType : perEdgeType;
    for (const q of p.quotes) {
      const ok = quoteVerifies(q, sourcesByKey);
      citation = addFractions(citation, fraction(ok ? 1 : 0, 1));
      const b = bucket(map, p.type);
      b.citation = addFractions(b.citation, fraction(ok ? 1 : 0, 1));
    }
  }

  // ── Node matching (greedy 1-1: each expectation claimable once) ──────────
  const matchedNodeByKey = new Map<string, ObservedNode>();
  const claimedNodes = new Set<ObservedNode>();
  for (const e of c.expectedNodes) {
    bucket(perNodeType, e.type).expected++;
    const hit = obs.persistedNodes.find((n) => !claimedNodes.has(n) && nodeMatchesExpectation(n, e));
    if (hit) {
      claimedNodes.add(hit);
      matchedNodeByKey.set(e.key, hit);
      bucket(perNodeType, e.type).matched++;
    }
  }
  const nodeRecall = fraction(matchedNodeByKey.size, c.expectedNodes.length);
  const nodePrecision = fraction(claimedNodes.size, obs.persistedNodes.length);

  // Recall including shadow: unmatched expectations may match a shadow label.
  let shadowRescues = 0;
  const claimedShadow = new Set<number>();
  for (const e of c.expectedNodes) {
    if (matchedNodeByKey.has(e.key)) continue;
    const idx = obs.shadowNodes.findIndex(
      (s, i) => !claimedShadow.has(i) && nodeMatchesExpectation(s, e),
    );
    if (idx >= 0) {
      claimedShadow.add(idx);
      shadowRescues++;
    }
  }
  const nodeRecallIncludingShadow = fraction(
    matchedNodeByKey.size + shadowRescues,
    c.expectedNodes.length,
  );

  // ── Semantic entailment: validated quotes on persisted NODES ─────────────
  let entailment = fraction(0, 0);
  const expectationForNode = (n: ObservedNode): ExpectedNode | undefined => {
    for (const [key, matched] of matchedNodeByKey) {
      if (matched === n) return c.expectedNodes.find((e) => e.key === key);
    }
    return undefined;
  };
  for (const n of obs.persistedNodes) {
    const e = expectationForNode(n);
    for (const q of n.evidence) {
      const ok = e !== undefined && quoteEntailed(q, e.entailedQuotes);
      entailment = addFractions(entailment, fraction(ok ? 1 : 0, 1));
      const b = bucket(perNodeType, n.type);
      b.entailment = addFractions(b.entailment, fraction(ok ? 1 : 0, 1));
    }
  }

  // ── Edge matching + entailment ────────────────────────────────────────────
  const expectedNodeByKey = new Map(c.expectedNodes.map((e) => [e.key, e]));
  const claimedEdges = new Set<number>();
  let matchedEdges = 0;
  const edgeExpectationByIdx = new Map<number, (typeof c.expectedEdges)[number]>();
  for (const ee of c.expectedEdges) {
    bucket(perEdgeType, ee.type).expected++;
    const se = expectedNodeByKey.get(ee.sourceKey);
    const te = expectedNodeByKey.get(ee.targetKey);
    if (!se || !te) continue; // corpus.spec forbids this; scored as unmatched
    const idx = obs.persistedEdges.findIndex(
      (pe, i) =>
        !claimedEdges.has(i) &&
        pe.type === ee.type &&
        nodeMatchesExpectation(pe.source, se) &&
        nodeMatchesExpectation(pe.target, te),
    );
    if (idx >= 0) {
      claimedEdges.add(idx);
      edgeExpectationByIdx.set(idx, ee);
      matchedEdges++;
      bucket(perEdgeType, ee.type).matched++;
    }
  }
  const edgeRecall = fraction(matchedEdges, c.expectedEdges.length);
  const edgePrecision = fraction(claimedEdges.size, obs.persistedEdges.length);

  obs.persistedEdges.forEach((pe, i) => {
    const ee = edgeExpectationByIdx.get(i);
    for (const q of pe.evidence) {
      const ok = ee !== undefined && quoteEntailed(q, ee.entailedQuotes);
      entailment = addFractions(entailment, fraction(ok ? 1 : 0, 1));
      const b = bucket(perEdgeType, pe.type);
      b.entailment = addFractions(b.entailment, fraction(ok ? 1 : 0, 1));
    }
  });

  // ── Forbidden labels: violations wherever they surface ───────────────────
  const forbiddenViolations: CaseScore["forbiddenViolations"] = [];
  for (const f of c.forbiddenNodes) {
    for (const n of obs.persistedNodes) {
      if (labelMatches(n.label, f.labelMatch)) {
        forbiddenViolations.push({ caseId: c.id, label: n.label, reason: f.reason, layer: "persisted" });
      }
    }
    for (const s of obs.shadowNodes) {
      if (labelMatches(s.label, f.labelMatch)) {
        forbiddenViolations.push({ caseId: c.id, label: s.label, reason: f.reason, layer: "shadow" });
      }
    }
  }

  return {
    caseId: c.id,
    category: c.category,
    nodeRecall,
    nodeRecallIncludingShadow,
    nodePrecision,
    edgeRecall,
    edgePrecision,
    citationPrecision: citation,
    semanticEntailment: entailment,
    perNodeType,
    perEdgeType,
    forbiddenViolations,
    flatFalseMaterializations: c.category === "flat" ? obs.persistedNodes.length : 0,
  };
}

export function aggregate(scores: CaseScore[]): AggregateScore {
  const zero = (): Fraction => fraction(0, 0);
  const agg: AggregateScore = {
    cases: scores.length,
    nodeRecall: zero(),
    nodeRecallIncludingShadow: zero(),
    nodePrecision: zero(),
    edgeRecall: zero(),
    edgePrecision: zero(),
    citationPrecision: zero(),
    semanticEntailment: zero(),
    perNodeType: {},
    perEdgeType: {},
    forbiddenViolations: [],
    flatFalseMaterializations: 0,
  };
  const mergeBuckets = (into: Record<string, TypeBucket>, from: Record<string, TypeBucket>) => {
    for (const [type, b] of Object.entries(from)) {
      const t = (into[type] ??= emptyBucket());
      t.citation = addFractions(t.citation, b.citation);
      t.entailment = addFractions(t.entailment, b.entailment);
      t.expected += b.expected;
      t.matched += b.matched;
    }
  };
  for (const s of scores) {
    agg.nodeRecall = addFractions(agg.nodeRecall, s.nodeRecall);
    agg.nodeRecallIncludingShadow = addFractions(agg.nodeRecallIncludingShadow, s.nodeRecallIncludingShadow);
    agg.nodePrecision = addFractions(agg.nodePrecision, s.nodePrecision);
    agg.edgeRecall = addFractions(agg.edgeRecall, s.edgeRecall);
    agg.edgePrecision = addFractions(agg.edgePrecision, s.edgePrecision);
    agg.citationPrecision = addFractions(agg.citationPrecision, s.citationPrecision);
    agg.semanticEntailment = addFractions(agg.semanticEntailment, s.semanticEntailment);
    mergeBuckets(agg.perNodeType, s.perNodeType);
    mergeBuckets(agg.perEdgeType, s.perEdgeType);
    agg.forbiddenViolations.push(...s.forbiddenViolations);
    agg.flatFalseMaterializations += s.flatFalseMaterializations;
  }
  return agg;
}
