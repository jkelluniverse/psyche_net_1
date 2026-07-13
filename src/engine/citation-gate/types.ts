// Citation gate — data contracts (spec §3).
//
// These types deliberately mirror the Prisma enums as string-literal unions
// rather than importing @prisma/client: the gate is the deterministic trust
// boundary and must stay pure, dependency-free, and testable without a
// generated client or a database. The graph writer (outside this module) is
// where these values meet Prisma.

export type NodeType =
  | "WOUND"
  | "SHADOW"
  | "BELIEF"
  | "PROTECTION"
  | "PATTERN"
  | "TRAIT"
  | "RESOURCE"
  | "BECOMING"
  | "LENS";

export type Provenance = "EXTRACTED" | "LENS" | "BECOMING" | "PRACTITIONER";

export type Authorship = "SELF" | "PRACTITIONER";

export type EvidenceRole = "SUPPORT" | "DECLARATION" | "ENACTMENT";

export type EvidencePolarity = "SUPPORTING" | "COUNTERVAILING";

export type EdgeType =
  | "DRIVES"
  | "PROTECTS_FROM"
  | "EXPRESSES_AS"
  | "ROOTED_IN"
  | "REINFORCES"
  | "SOFTENED_BY";

export type NodeState =
  | "HYPOTHESIS"
  | "ACTIVE"
  | "QUESTIONED"
  | "LOOSENING"
  | "TRANSMUTATION_CANDIDATE"
  | "INTEGRATED"
  | "IGNITED"
  | "CONTRADICTED"
  | "DORMANT";

// ── Input from the proposer (untrusted, spec §3.1) ──────────────────────────

export interface ProposedEvidence {
  sourceEventId: string;
  /** The EXACT substring the model claims supports this (verified by the gate). */
  quote: string;
  /**
   * Approximate character offset of the quote in the ORIGINAL source content.
   * Required to disambiguate when the quote occurs more than once (§5
   * multi-occurrence tie-break); without it an ambiguous quote is rejected.
   */
  offsetHint?: number;
  /** Model-assigned, untrusted (spec §1.1). Defaults to SUPPORT. */
  role?: EvidenceRole;
  /** Model-assigned, untrusted (spec §1.1). Defaults to SUPPORTING. */
  polarity?: EvidencePolarity;
}

export interface ProposedNode {
  tempId: string;
  type: NodeType;
  provenance: Provenance;
  label: string;
  ontologyKey?: string;
  /** May be empty for pure hypothesis seeds (LAW 3). */
  evidence: ProposedEvidence[];
}

export interface ProposedEdge {
  tempId: string;
  /** A ProposedNode.tempId from this pass, or an existing PsycheNode id. */
  sourceTempId: string;
  targetTempId: string;
  type: EdgeType;
  evidence: ProposedEvidence[];
}

export interface ProposerOutput {
  nodes: ProposedNode[];
  edges: ProposedEdge[];
}

// ── The source lookup (spec §3.2) ────────────────────────────────────────────

export interface SourceRecord {
  id: string;
  /** The verbatim text the person produced. */
  content: string;
  authorship: Authorship;
  occurredAt: Date;
  /** Superseded/corrected events are never valid citation targets. */
  invalidatedAt?: Date | null;
}

// ── Prior graph state (spec §3.1a — the gate is pure over ALL its inputs) ───

/**
 * A previously persisted, validated Evidence row as the gate needs to see it
 * for merge/threshold/mass recompute. `sourceInvalidatedAt` carries the cited
 * event's invalidation status so mass stays invalidation-aware (§6) without
 * the gate reaching into a database.
 */
export interface EvidenceRecord {
  sourceEventId: string;
  quote: string;
  spanStart: number;
  spanEnd: number;
  occurredAt: Date;
  authorship: Authorship;
  role: EvidenceRole;
  polarity: EvidencePolarity;
  sourceInvalidatedAt: Date | null;
}

export interface ExistingNode {
  id: string;
  type: NodeType;
  provenance: Provenance;
  label: string;
  ontologyKey?: string;
  state: NodeState;
  evidence: EvidenceRecord[];
}

export interface ExistingEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  evidence: EvidenceRecord[];
}

export interface GraphSnapshot {
  nodes: ExistingNode[];
  edges: ExistingEdge[];
}

// ── Verified output (spec §3.3) ──────────────────────────────────────────────

export interface VerifiedEvidence {
  sourceEventId: string;
  /**
   * The person's words as they appear in the ORIGINAL source content —
   * i.e. content.slice(spanStart, spanEnd). Canonical over the proposer's
   * (possibly re-punctuated) rendition of the quote.
   */
  quote: string;
  spanStart: number;
  spanEnd: number;
  /** Copied from the source (temporal honesty). */
  occurredAt: Date;
  /** Copied from the source, so cached (shadow) evidence stays arithmetic-correct. */
  authorship: Authorship;
  /**
   * conferring = authorship SELF ∧ source not invalidated ∧ role rule
   * (ENACTMENT for BECOMING nodes, SUPPORT otherwise) — spec §6.
   * Only conferring, SUPPORTING-polarity evidence contributes to mass.
   */
  conferring: boolean;
  role: EvidenceRole;
  polarity: EvidencePolarity;
  normalizationVersion: string;
}

/** Why a derived value has the value it does (CLAUDE.md: explainable, always). */
export interface MassDerivation {
  algorithmVersion: string;
  conferringSupportingCount: number;
  distinctSources: number;
  rawMass: number;
  halfLifeDays: number;
}

export interface ConfidenceDerivation {
  algorithmVersion: string;
  base: number;
  distinctSourceCount: number;
  contradictionSignal: number;
  ontologyNovelty: number;
}

export interface StateDerivation {
  algorithmVersion: string;
  previous: NodeState;
  rule: string;
  supportingDistinctSources: number;
  countervailingDistinctSources: number;
  presentSupportingMass: number;
}

export interface AcceptedNode {
  tempId: string;
  /** Set when this proposal merged into an existing node (spec §7 dedupe). */
  existingNodeId?: string;
  type: NodeType;
  provenance: Provenance;
  label: string;
  ontologyKey?: string;
  /** Evidence verified THIS pass (plus promoted shadow cache on materialization). */
  evidence: VerifiedEvidence[];
  mass: number;
  confidence: number;
  state: NodeState;
  derivation: {
    mass: MassDerivation;
    confidence: ConfidenceDerivation;
    state: StateDerivation;
  };
}

export interface AcceptedEdge {
  tempId: string;
  existingEdgeId?: string;
  sourceTempId: string;
  targetTempId: string;
  type: EdgeType;
  evidence: VerifiedEvidence[];
  strength: number;
  confidence: number;
  derivation: {
    strength: MassDerivation;
    confidence: ConfidenceDerivation;
  };
}

export type RejectionReason =
  | "QUOTE_NOT_FOUND"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_INVALIDATED"
  | "BELOW_MATERIALIZATION_THRESHOLD"
  | "EDGE_ENDPOINT_REJECTED"
  | "EMPTY_EVIDENCE_NON_HYPOTHESIS"
  | "AMBIGUOUS_QUOTE";

export interface RejectedItem {
  tempId: string;
  kind: "node" | "edge";
  reason: RejectionReason;
  detail: string;
}

/**
 * A valid-but-subthreshold candidate, retained across passes (never
 * discarded). Mirrors the ShadowCandidate table; evidenceCache accumulates
 * verified spans until the materialization threshold clears.
 */
export interface ShadowCandidate {
  candidateKey: string;
  type: NodeType;
  provenance: Provenance;
  label: string;
  ontologyKey?: string;
  timesSeen: number;
  evidenceCache: VerifiedEvidence[];
  lastSeen: Date;
}

export interface GateResult {
  acceptedNodes: AcceptedNode[];
  acceptedEdges: AcceptedEdge[];
  /** Updated shadow buffer (input buffer ∪ this pass's subthreshold candidates). */
  shadowBuffer: ShadowCandidate[];
  rejected: RejectedItem[];
  /** New ontology keys seen this pass (META-01 loose-ontology candidate log). */
  ontologyCandidates: { tempId: string; ontologyKey: string }[];
  gateVersion: string;
  normalizationVersion: string;
  massAlgorithmVersion: string;
  confidenceAlgorithmVersion: string;
  stateAlgorithmVersion: string;
  ontologyVersion: string;
}
