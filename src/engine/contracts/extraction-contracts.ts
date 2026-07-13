// ═══════════════════════════════════════════════════════════════════════════
// THE CANONICAL EXTRACTION CONTRACTS (gate spec v1.3 §3 · proposer spec v1.1)
//
// All types shared across the extraction pipeline live in THIS file and only
// this file, imported by both the proposer and the citation gate. The two
// module specs *describe* these contracts; this code file *is* the contract.
// `CONTRACT_VERSION` is stamped on every ExtractionRun so any persisted
// proposal can be replayed against the exact contract it spoke.
//
// These types deliberately mirror the Prisma enums as string-literal unions
// rather than importing @prisma/client: the gate is the deterministic trust
// boundary and must stay pure, dependency-free, and testable without a
// generated client or a database. The graph writer (outside the engine) is
// where these values meet Prisma.
// ═══════════════════════════════════════════════════════════════════════════

export const CONTRACT_VERSION = "v2.2";

// ── Closed enums (extensibility lives ONLY in ontologyKey — proposer §7.3) ──

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

/**
 * v2.1: the types extraction may propose — LENS/BECOMING are unrepresentable
 * in an ExtractionPolicy, not merely rejected by a constructor (the same
 * unrepresentability move as NodeRef/D3). WOUND remains policy-governed.
 */
export type ExtractableNodeType = Exclude<NodeType, "LENS" | "BECOMING">;

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

/**
 * Inference distance (proposer spec §8): a valid quote does not prove
 * semantic support. Model-assigned (soft, like polarity); downstream rules
 * bias toward restraint (HIGH_INFERENCE_INTERPRETATION never auto-
 * materializes). Telemetry + threshold input, never truth.
 */
export type InferenceDistance =
  | "DIRECT_DECLARATION"
  | "DIRECT_BEHAVIOR"
  | "LOW_INFERENCE_PATTERN"
  | "HIGH_INFERENCE_INTERPRETATION";

// ── Input from the proposer (untrusted — gate spec §3.1) ────────────────────

export interface ProposedEvidence {
  sourceEventId: string;
  /** The EXACT substring the model claims supports this (verified by the gate). */
  quote: string;
  /**
   * Approximate character offset of the quote in the ORIGINAL source content.
   * NON-AUTHORITATIVE (v1.3): the gate finds ALL verbatim matches first and
   * uses the hint only as a tie-break among them. A wrong hint never rejects
   * a quote that verifiably exists and can never create evidence. Absent →
   * the quote must be unique or is rejected AMBIGUOUS_QUOTE.
   */
  offsetHint?: number;
  /**
   * Model-assigned, untrusted (§1.1). Defaults to SUPPORT. A BECOMING seed's
   * originating wish is DECLARATION and confers NO mass; only ENACTMENT
   * charges toward ignition. Proposer bias: when uncertain, DECLARATION.
   */
  role?: EvidenceRole;
  /** Model-assigned, untrusted (§1.1). Defaults to SUPPORTING. */
  polarity?: EvidencePolarity;
  /**
   * One bounded sentence of why this quote supports the item. For evaluation
   * and human review ONLY; never displayed as truth; never stored as evidence
   * (proposer spec §6).
   */
  evidenceRationale?: string;
}

export interface ProposedNode {
  tempId: string;
  type: NodeType;
  provenance: Provenance;
  label: string;
  ontologyKey?: string;
  /** May be empty for pure hypothesis seeds (LAW 3). */
  evidence: ProposedEvidence[];
  /** Proposer §8 classification; HIGH_INFERENCE never auto-materializes. */
  inferenceDistance?: InferenceDistance;
  /** Telemetry ONLY (proposer §11): contributes zero to mass or confidence. */
  modelReportedConfidence?: number;
}

export interface ProposedEdge {
  tempId: string;
  /**
   * v2 (D3, round-1 integration): endpoints are discriminated NodeRefs
   * END-TO-END — a tempId/nodeId namespace collision is unrepresentable at
   * the type level, in the wrapper AND the gate. (v1 flattened to strings,
   * which reintroduced the collision NodeRef exists to kill.)
   */
  source: NodeRef;
  target: NodeRef;
  type: EdgeType;
  evidence: ProposedEvidence[];
  inferenceDistance?: InferenceDistance;
  modelReportedConfidence?: number;
}

export interface ProposerOutput {
  nodes: ProposedNode[];
  edges: ProposedEdge[];
}

/**
 * Discriminated endpoint reference (proposer spec §3; canonical since
 * contract v2 / gate spec v1.4): PROPOSED refers to a ProposedNode.tempId in
 * this pass; EXISTING refers to a persisted PsycheNode id. Carried end-to-end
 * — proposer output, gate input, and AcceptedEdge — so identity is resolved
 * by kind, never by string-membership guessing.
 */
export type NodeRef =
  | { kind: "PROPOSED"; tempId: string }
  | { kind: "EXISTING"; nodeId: string };

// ── The source lookup (gate spec §3.2) ──────────────────────────────────────

export interface SourceRecord {
  id: string;
  /** The verbatim text the person produced. */
  content: string;
  authorship: Authorship;
  occurredAt: Date;
  /** Superseded/corrected events are never valid citation targets. */
  invalidatedAt?: Date | null;
}

// ── Prior graph state (gate spec §3.1a — pure function of ALL inputs) ───────

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

// ── Verified output (gate spec v1.3 §3.3) ───────────────────────────────────

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
   * Carried through from ProposedEvidence (default SUPPORT). REQUIRED
   * downstream: §6's conferring rule and becoming-ignition read this.
   * Dropping it here disconnects the becoming fix (the v1.2→v1.3 seam bug).
   */
  role: EvidenceRole;
  /** Carried through (default SUPPORTING); feeds the state machine under §1.1 guards. */
  polarity: EvidencePolarity;
  /**
   * conferring = authorship SELF ∧ source not invalidated ∧ role rule
   * (ENACTMENT for BECOMING nodes, SUPPORT otherwise) — §6. NOT authorship
   * alone. Only conferring, SUPPORTING-polarity evidence contributes to mass.
   */
  conferring: boolean;
  normalizationVersion: string;
  /**
   * v1.3 far-hint fallback (§5): set when the quote matched multiple times
   * and the supplied offsetHint was implausibly far from every match, so the
   * gate fell back to the first occurrence. Lowers node confidence.
   */
  hintFallback?: boolean;
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
  /** v1.3: 1 when any contributing evidence needed the far-hint fallback. */
  hintFallbackSignal: number;
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
  /** Set when this proposal merged into an existing node (gate spec §7). */
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
  /** PROPOSED tempIds are aliased to the representative of any in-pass merge. */
  source: NodeRef;
  target: NodeRef;
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
  | "HELD_HIGH_INFERENCE" // v2 (D1): distinct from an ordinary recurrence hold
  | "WAITING_ENDPOINT" // v2.2 (A-2): edge held because its endpoint node is subthreshold
  | "EDGE_ENDPOINT_REJECTED"
  | "EMPTY_EVIDENCE_NON_HYPOTHESIS"
  | "AMBIGUOUS_QUOTE";

export interface RejectedItem {
  tempId: string;
  kind: "node" | "edge";
  /** v2 (A-6): which stage rejected it — the gate stamps "GATE". */
  stage: "GATE";
  reason: RejectionReason;
  detail: string;
}

/**
 * v2 (A-6): canonical machine-readable reasons for WRAPPER-stage drops and
 * per-candidate validation failures, so §12's rejection telemetry has typed
 * things to count and Proposal.rejectionReason never drifts into ad-hoc
 * strings. The gate is the sole writer of "shadow" outcomes; the wrapper
 * emits only accepted/rejected at its layer.
 */
export type WrapperRejectionReason =
  | "NODE_TYPE_NOT_ALLOWED_BY_POLICY"
  | "THIRD_PARTY_SUBJECT"
  | "SHAPE_INVALID"
  | "NO_VALID_EVIDENCE"
  | "DANGLING_EDGE_REF"
  | "CAP_EXCEEDED";

export interface WrapperRejection {
  tempId: string;
  kind: "node" | "edge";
  stage: "WRAPPER";
  reason: WrapperRejectionReason;
  detail: string;
}

/**
 * Value-level reason sets (v2.1, C-3). The wrapper/gate reason unions are
 * DISJOINT by design — Proposal rows recover their stage from the reason
 * alone. Tested; do not add an overlapping member.
 */
export const GATE_REJECTION_REASONS: readonly RejectionReason[] = [
  "QUOTE_NOT_FOUND",
  "SOURCE_NOT_FOUND",
  "SOURCE_INVALIDATED",
  "BELOW_MATERIALIZATION_THRESHOLD",
  "HELD_HIGH_INFERENCE",
  "WAITING_ENDPOINT",
  "EDGE_ENDPOINT_REJECTED",
  "EMPTY_EVIDENCE_NON_HYPOTHESIS",
  "AMBIGUOUS_QUOTE",
];
export const WRAPPER_REJECTION_REASONS: readonly WrapperRejectionReason[] = [
  "NODE_TYPE_NOT_ALLOWED_BY_POLICY",
  "THIRD_PARTY_SUBJECT",
  "SHAPE_INVALID",
  "NO_VALID_EVIDENCE",
  "DANGLING_EDGE_REF",
  "CAP_EXCEEDED",
];

export type ShadowWaitingReason =
  | "BELOW_MATERIALIZATION_THRESHOLD"
  | "HELD_HIGH_INFERENCE"
  /** v2.1 (A-3): the edge's evidence is sufficient but an endpoint node is
   * itself still subthreshold — held until the endpoint materializes and the
   * edge is re-sighted; never dropped, never dangling. */
  | "WAITING_ENDPOINT";

/**
 * v2.1 (A-3): a shadow edge endpoint, DISCRIMINATED — never inferred from
 * string shape. EXISTING → persisted node id. MATCH_KEY → the node's stable
 * match key (type::normalizedLabel) for endpoints not yet persisted.
 */
export type ShadowEndpointRef =
  | { kind: "EXISTING"; nodeId: string }
  | { kind: "MATCH_KEY"; key: string };

interface ShadowCandidateCommon {
  candidateKey: string;
  provenance: Provenance;
  timesSeen: number;
  /** Distinct source events across accumulated sightings (mirrors schema). */
  distinctSources: number;
  waitingReason: ShadowWaitingReason;
  /**
   * The LOWEST inference distance seen across sightings (D1, round-1
   * integration). A candidate whose lowest-seen distance is
   * HIGH_INFERENCE_INTERPRETATION is held regardless of recurrence; a later
   * sighting at lower distance releases it to normal thresholds — this is
   * §8's "recurrence at lower inference distance" made deterministic.
   * Absent = no sighting carried a classification (legacy/normal rules).
   */
  inferenceDistance?: InferenceDistance;
  evidenceCache: VerifiedEvidence[];
  lastSeen: Date;
}

/**
 * A valid-but-subthreshold candidate, retained across passes (never
 * discarded). v2: a discriminated node|edge union — edges wait too (D2),
 * instead of materializing as premature low-confidence causal claims.
 * Edge endpoint keys are stable across passes: an EXISTING endpoint is the
 * node id; a PROPOSED endpoint is the node MATCH KEY (type::normalizedLabel),
 * resolved against the graph when the candidate clears its threshold.
 */
export type ShadowCandidate =
  | (ShadowCandidateCommon & {
      kind: "node";
      type: NodeType;
      label: string;
      ontologyKey?: string;
    })
  | (ShadowCandidateCommon & {
      kind: "edge";
      edgeType: EdgeType;
      sourceRef: ShadowEndpointRef;
      targetRef: ShadowEndpointRef;
    });

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
