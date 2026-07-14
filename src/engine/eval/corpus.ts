// Ground-truth corpus loading + integrity validation (proposer spec §13).
//
// The corpus is hand-labeled ONCE and extended opportunistically; this module
// makes its obligations enforceable instead of assumed:
// - every hand-labeled entailing span must be VERBATIM (normalized) in its
//   named source — a ground truth that fails the gate's own verbatim check
//   is a labeling bug, and it would silently zero the fidelity numbers;
// - every expectation must be MATERIALIZABLE (≥2 spans from ≥2 sources, the
//   gate's recurrence threshold) — an unmaterializable expectation scores a
//   model failure that is actually a corpus authoring failure;
// - the spec's coverage floors (≥3 entries per extractable node type, ≥2 per
//   edge type, ~10 adversarial, ~5 third-party, ~5 flat) are counted, not
//   eyeballed.

import { normalizeQuote } from "../citation-gate/normalize";
import type { EdgeType, ExtractableNodeType } from "../contracts/extraction-contracts";
import type { EvalCase, EvalCorpus } from "./types";

export const EXTRACTABLE_NODE_TYPES = [
  "WOUND",
  "SHADOW",
  "BELIEF",
  "PROTECTION",
  "PATTERN",
  "TRAIT",
  "RESOURCE",
] as const satisfies readonly ExtractableNodeType[];

export const EDGE_TYPES = [
  "DRIVES",
  "PROTECTS_FROM",
  "EXPRESSES_AS",
  "ROOTED_IN",
  "REINFORCES",
  "SOFTENED_BY",
] as const satisfies readonly EdgeType[];

/** Spec §13 minimum-viable-corpus floors — named, not inline (CLAUDE.md). */
export const CORPUS_FLOORS = {
  entriesPerNodeType: 3,
  entriesPerEdgeType: 2,
  adversarialCases: 10,
  thirdPartyCases: 5,
  flatCases: 5,
} as const;

/** Structural parse of the corpus JSON. Throws on a shape that cannot score. */
export function parseCorpus(raw: unknown): EvalCorpus {
  if (typeof raw !== "object" || raw === null) throw new Error("corpus: not an object");
  const c = raw as Record<string, unknown>;
  if (typeof c.corpusVersion !== "string" || c.corpusVersion.length === 0) {
    throw new Error("corpus: corpusVersion missing (un-versioned ground truth is not allowed)");
  }
  if (!Array.isArray(c.cases) || c.cases.length === 0) throw new Error("corpus: no cases");
  return c as unknown as EvalCorpus;
}

const verbatim = (quote: string, content: string): boolean => {
  const nq = normalizeQuote(quote);
  return nq.length > 0 && normalizeQuote(content).includes(nq);
};

/** Integrity problems, human-readable. Empty array = valid. */
export function validateCorpus(corpus: EvalCorpus): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const c of corpus.cases) {
    const at = `case ${c.id}`;
    if (ids.has(c.id)) problems.push(`${at}: duplicate case id`);
    ids.add(c.id);

    const contentByKey = new Map<string, string>();
    for (const s of c.sources) {
      if (contentByKey.has(s.key)) problems.push(`${at}: duplicate source key ${s.key}`);
      if (s.content.trim().length === 0) problems.push(`${at}: source ${s.key} is empty`);
      if (typeof s.daysAgo !== "number" || s.daysAgo < 0) {
        problems.push(`${at}: source ${s.key} needs a non-negative daysAgo`);
      }
      contentByKey.set(s.key, s.content);
    }

    const checkQuotes = (
      owner: string,
      quotes: { sourceKey: string; quote: string }[],
      requireMaterializable: boolean,
    ) => {
      for (const q of quotes) {
        const content = contentByKey.get(q.sourceKey);
        if (content === undefined) {
          problems.push(`${at}: ${owner} cites unknown source ${q.sourceKey}`);
        } else if (!verbatim(q.quote, content)) {
          problems.push(`${at}: ${owner} quote not verbatim in ${q.sourceKey}: "${q.quote}"`);
        }
      }
      if (requireMaterializable) {
        const distinct = new Set(quotes.map((q) => q.sourceKey));
        if (quotes.length < 2 || distinct.size < 2) {
          problems.push(
            `${at}: ${owner} is unmaterializable (< 2 entailed spans from < 2 sources — gate recurrence threshold)`,
          );
        }
      }
    };

    const nodeKeys = new Set<string>();
    for (const e of c.expectedNodes) {
      if (nodeKeys.has(e.key)) problems.push(`${at}: duplicate expected-node key ${e.key}`);
      nodeKeys.add(e.key);
      if (e.labelMatch.length === 0) problems.push(`${at}: node ${e.key} has empty labelMatch`);
      if (!(EXTRACTABLE_NODE_TYPES as readonly string[]).includes(e.type)) {
        problems.push(`${at}: node ${e.key} has non-extractable type ${e.type}`);
      }
      if (e.type === "WOUND" && c.policy !== "PRACTITIONER_SUPPORTED") {
        problems.push(`${at}: WOUND expectation ${e.key} under SOLO policy can never extract`);
      }
      checkQuotes(`node ${e.key}`, e.entailedQuotes, true);
    }
    for (const ee of c.expectedEdges) {
      if (!nodeKeys.has(ee.sourceKey)) problems.push(`${at}: edge cites unknown node ${ee.sourceKey}`);
      if (!nodeKeys.has(ee.targetKey)) problems.push(`${at}: edge cites unknown node ${ee.targetKey}`);
      if (!(EDGE_TYPES as readonly string[]).includes(ee.type)) {
        problems.push(`${at}: edge has unknown type ${ee.type}`);
      }
      checkQuotes(`edge ${ee.sourceKey}->${ee.targetKey}`, ee.entailedQuotes, true);
    }

    if (c.category === "flat" && (c.expectedNodes.length > 0 || c.expectedEdges.length > 0)) {
      problems.push(`${at}: flat cases hand-labeled as containing nothing may expect nothing`);
    }
    if (
      (c.category === "adversarial-injection" || c.category === "third-party") &&
      c.forbiddenNodes.length === 0
    ) {
      problems.push(`${at}: ${c.category} case must name at least one forbidden label`);
    }
    for (const f of c.forbiddenNodes) {
      if (f.labelMatch.length === 0 || !f.reason) {
        problems.push(`${at}: forbidden entry needs labelMatch + reason`);
      }
    }
  }
  return problems;
}

export interface CoverageReport {
  entriesPerNodeType: Record<string, number>;
  entriesPerEdgeType: Record<string, number>;
  casesPerCategory: Record<string, number>;
  /** Floors not met, human-readable. Empty = spec minimum satisfied. */
  shortfalls: string[];
}

/** Counts distinct hand-labeled ENTRIES (case+source) per type, vs the floors. */
export function coverageReport(corpus: EvalCorpus): CoverageReport {
  const nodeEntries = new Map<string, Set<string>>();
  const edgeEntries = new Map<string, Set<string>>();
  const casesPerCategory: Record<string, number> = {};
  for (const c of corpus.cases) {
    casesPerCategory[c.category] = (casesPerCategory[c.category] ?? 0) + 1;
    for (const e of c.expectedNodes) {
      const set = nodeEntries.get(e.type) ?? new Set<string>();
      for (const q of e.entailedQuotes) set.add(`${c.id}:${q.sourceKey}`);
      nodeEntries.set(e.type, set);
    }
    for (const ee of c.expectedEdges) {
      const set = edgeEntries.get(ee.type) ?? new Set<string>();
      for (const q of ee.entailedQuotes) set.add(`${c.id}:${q.sourceKey}`);
      edgeEntries.set(ee.type, set);
    }
  }
  const shortfalls: string[] = [];
  const entriesPerNodeType: Record<string, number> = {};
  for (const t of EXTRACTABLE_NODE_TYPES) {
    entriesPerNodeType[t] = nodeEntries.get(t)?.size ?? 0;
    if (entriesPerNodeType[t] < CORPUS_FLOORS.entriesPerNodeType) {
      shortfalls.push(`node type ${t}: ${entriesPerNodeType[t]}/${CORPUS_FLOORS.entriesPerNodeType} labeled entries`);
    }
  }
  const entriesPerEdgeType: Record<string, number> = {};
  for (const t of EDGE_TYPES) {
    entriesPerEdgeType[t] = edgeEntries.get(t)?.size ?? 0;
    if (entriesPerEdgeType[t] < CORPUS_FLOORS.entriesPerEdgeType) {
      shortfalls.push(`edge type ${t}: ${entriesPerEdgeType[t]}/${CORPUS_FLOORS.entriesPerEdgeType} labeled entries`);
    }
  }
  const floorFor: Record<string, number> = {
    "adversarial-injection": CORPUS_FLOORS.adversarialCases,
    "third-party": CORPUS_FLOORS.thirdPartyCases,
    flat: CORPUS_FLOORS.flatCases,
  };
  for (const [cat, floor] of Object.entries(floorFor)) {
    const n = casesPerCategory[cat] ?? 0;
    if (n < floor) shortfalls.push(`category ${cat}: ${n}/${floor} cases`);
  }
  return { entriesPerNodeType, entriesPerEdgeType, casesPerCategory, shortfalls };
}

export function requireValidCorpus(corpus: EvalCorpus): EvalCase[] {
  const problems = validateCorpus(corpus);
  if (problems.length > 0) {
    throw new Error(`corpus failed integrity validation:\n- ${problems.join("\n- ")}`);
  }
  return corpus.cases;
}
