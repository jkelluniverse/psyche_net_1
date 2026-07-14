// Eval-corpus + fidelity-scorer types (proposer spec §13 test 13; gate spec
// §"eval corpus"; CLAUDE.md testing expectations).
//
// The corpus is GROUND TRUTH: synthetic journals hand-labeled once with the
// nodes/edges a faithful extraction should produce, the verbatim spans that
// semantically entail them, and the labels that must NEVER appear (third-party
// psyches, injected instructions). The scorer is a pure function of
// (case, observation) — no model calls, no DB, no clock — so the numbers are
// replayable and every rate is explainable as numerator/denominator.
//
// The two headline numbers are SEPARATE by spec (proposer §8): citation
// precision (were the proposed quotes the person's verbatim words?) and
// semantic entailment (did the verified words actually mean what the node
// claims?). A proposal can score perfectly on the first and fail the second —
// collapsing them would hide exactly the failure mode LAW 2 warns about.
// No LLM judge anywhere: entailment is deterministic containment against the
// hand-labeled entailing spans.

import type {
  EdgeType,
  EvidenceRole,
  ExtractableNodeType,
} from "../contracts/extraction-contracts";

// ── Corpus (hand-labeled ground truth) ──────────────────────────────────────

export interface CorpusSource {
  /** Case-local key; the runner maps it to a real SourceEvent id. */
  key: string;
  content: string;
  /** occurredAt = runner's fixed NOW minus this many days (temporal realism). */
  daysAgo: number;
}

/** A verbatim span, hand-labeled as semantically entailing its item. */
export interface EntailedQuote {
  sourceKey: string;
  /** Must appear verbatim (normalized) in the named source — corpus.spec enforces it. */
  quote: string;
  /** Role a faithful proposer would assign (oracle mode uses it). */
  role?: EvidenceRole;
}

export interface ExpectedNode {
  /** Case-local key, referenced by expected edges. */
  key: string;
  type: ExtractableNodeType;
  /**
   * ALL substrings must appear (normalized) in a persisted node's label for
   * it to count as this expectation. Substrings, not equality — label wording
   * is the model's; the theme is the ground truth.
   */
  labelMatch: string[];
  /**
   * The hand-labeled entailing spans. ≥2 spans from ≥2 distinct sources so
   * the expectation is MATERIALIZABLE under the gate's recurrence threshold
   * (corpus.spec enforces this — an unmaterializable expectation is a corpus
   * authoring bug, not a model failure).
   */
  entailedQuotes: EntailedQuote[];
}

export interface ExpectedEdge {
  type: EdgeType;
  /** Keys of ExpectedNodes in the same case. */
  sourceKey: string;
  targetKey: string;
  entailedQuotes: EntailedQuote[];
}

/** A theme that must NOT materialize (third-party psyche, injected content). */
export interface ForbiddenNode {
  /** ALL substrings present (normalized) in a persisted OR shadow label = violation. */
  labelMatch: string[];
  reason: string;
}

export type CaseCategory = "standard" | "adversarial-injection" | "third-party" | "flat";

export interface EvalCase {
  id: string;
  category: CaseCategory;
  /** WOUND expectations require PRACTITIONER_SUPPORTED (solo is strengths-forward). */
  policy: "SOLO" | "PRACTITIONER_SUPPORTED";
  notes?: string;
  sources: CorpusSource[];
  expectedNodes: ExpectedNode[];
  expectedEdges: ExpectedEdge[];
  forbiddenNodes: ForbiddenNode[];
}

export interface EvalCorpus {
  corpusVersion: string;
  cases: EvalCase[];
}

// ── Observation (what the persisted path actually produced for a case) ──────
//
// Deliberately DB-decoupled: the runner builds these from Prisma loaders; the
// harness spec builds them from literals. Source references use the corpus
// keys (the runner translates real SourceEvent ids back).

export interface ObservedQuote {
  sourceKey: string;
  quote: string;
}

/** One proposal the model emitted (pre-gate), with its cited quotes. */
export interface ProposedItemObservation {
  kind: "node" | "edge";
  /** Node type or edge type — the citation-precision bucket key. */
  type: string;
  quotes: ObservedQuote[];
}

export interface ObservedNode {
  type: string;
  label: string;
  /** Validated evidence actually persisted on the node. */
  evidence: ObservedQuote[];
}

export interface ObservedEdge {
  type: string;
  source: { type: string; label: string };
  target: { type: string; label: string };
  evidence: ObservedQuote[];
}

export interface CaseObservation {
  caseId: string;
  proposed: ProposedItemObservation[];
  /** EXTRACTED nodes persisted for this case's user after the pass. */
  persistedNodes: ObservedNode[];
  persistedEdges: ObservedEdge[];
  /** Shadow-held candidates (labels only — subthreshold, not yet real). */
  shadowNodes: { type: string; label: string }[];
}

// ── Scores (every rate is an explainable fraction, never a bare float) ──────

export interface Fraction {
  numerator: number;
  denominator: number;
  /** null when denominator is 0 — unknown is explicit, never faked (CLAUDE.md). */
  rate: number | null;
}

export interface TypeBucket {
  citation: Fraction;
  entailment: Fraction;
  expected: number;
  matched: number;
}

export interface ForbiddenViolation {
  caseId: string;
  label: string;
  reason: string;
  /** Where the leak surfaced. */
  layer: "persisted" | "shadow";
}

export interface CaseScore {
  caseId: string;
  category: CaseCategory;
  nodeRecall: Fraction;
  nodeRecallIncludingShadow: Fraction;
  nodePrecision: Fraction;
  edgeRecall: Fraction;
  edgePrecision: Fraction;
  /** Verbatim-verifiability of EVERY proposed quote (gate-normalization semantics). */
  citationPrecision: Fraction;
  /** Of validated quotes on persisted items: how many entail their matched expectation. */
  semanticEntailment: Fraction;
  perNodeType: Record<string, TypeBucket>;
  perEdgeType: Record<string, TypeBucket>;
  forbiddenViolations: ForbiddenViolation[];
  /** Nodes persisted in a case hand-labeled as containing nothing. */
  flatFalseMaterializations: number;
}

export interface AggregateScore {
  cases: number;
  nodeRecall: Fraction;
  nodeRecallIncludingShadow: Fraction;
  nodePrecision: Fraction;
  edgeRecall: Fraction;
  edgePrecision: Fraction;
  citationPrecision: Fraction;
  semanticEntailment: Fraction;
  perNodeType: Record<string, TypeBucket>;
  perEdgeType: Record<string, TypeBucket>;
  forbiddenViolations: ForbiddenViolation[];
  flatFalseMaterializations: number;
}
