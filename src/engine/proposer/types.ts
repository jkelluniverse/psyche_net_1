// Proposer wrapper types (proposer spec v1.1 §3). Shared pipeline types come
// from the canonical contract module; these are the wrapper's own shapes.

import type {
  EdgeType,
  InferenceDistance,
  NodeRef,
  NodeType,
  ProposedEvidence,
  ProposerOutput,
  Provenance,
  SourceRecord,
  WrapperRejection,
} from "../contracts/extraction-contracts";

/**
 * SERVER-DERIVED extraction policy (§3, §7). Constructed from authenticated
 * server state — the verified practitioner↔client relationship, the accepted
 * consent version — never accepted from a client request. A mutable role
 * string is not an authorization boundary.
 */
export interface ExtractionPolicy {
  mode: "SOLO" | "PRACTITIONER_SUPPORTED";
  /** The wrapper enforces this deterministically (§7 guard 1). */
  allowedNodeTypes: NodeType[];
  practitionerRelationshipVerified: boolean;
  userConsentVersion: string;
  policyVersion: string;
}

/** The strictly limited view of a prior node the proposer may see (§3, §5). */
export interface PriorNodeView {
  id: string;
  type: NodeType;
  label: string;
  ontologyKey?: string;
  // No evidence, no mass, no state, no hypothesis-provenance nodes. Ever.
}

/**
 * What the app layer hands the context builder: node summaries from
 * surrounding graph state, possibly INCLUDING hypothesis-provenance nodes
 * and runtime baggage. The builder filters to EXTRACTED and strips fields
 * structurally — the keystone test proves hypotheses cannot influence the
 * serialized context.
 */
export interface CandidatePriorNode {
  id: string;
  type: NodeType;
  provenance: Provenance;
  label: string;
  ontologyKey?: string;
}

export interface OntologyView {
  ontologyVersion: string;
  nodeTypes: { type: NodeType; definition: string }[];
  knownOntologyKeys: string[];
}

export interface ProposerInput {
  /** SELF-authored only — the builder refuses anything else (§4). */
  sources: SourceRecord[];
  priorNodes: CandidatePriorNode[];
  ontology: OntologyView;
  policy: ExtractionPolicy;
  /** Ties proposals to an ExtractionRun (audit). */
  runId: string;
}

/**
 * The ONLY thing that may be serialized toward the model. Constructed
 * exclusively by buildBlindedContext; serializeExtractionContext enforces
 * this shape with a hard allowlist (unknown keys throw).
 */
export interface BlindedExtractionContext {
  contractVersion: string;
  sources: { id: string; content: string; occurredAt: string }[];
  priorExtractedNodes: PriorNodeView[];
  ontology: {
    ontologyVersion: string;
    /** Filtered to the policy's allowed types — forbidden types are absent, not discouraged. */
    nodeTypes: { type: NodeType; definition: string }[];
    knownOntologyKeys: string[];
  };
  policy: {
    mode: ExtractionPolicy["mode"];
    allowedNodeTypes: NodeType[];
    policyVersion: string;
  };
}

/** The injectable, untrusted model call. The wrapper never imports a provider. */
export type CallModel = (req: { system: string; user: string }) => Promise<string>;

// ── Raw model-output shapes (validated per candidate before the guards) ────

export interface RawValidatedNode {
  tempId: string;
  type: NodeType;
  label: string;
  ontologyKey?: string;
  evidence: ProposedEvidence[];
  inferenceDistance?: InferenceDistance;
  modelReportedConfidence?: number;
}

export interface RawValidatedEdge {
  tempId: string;
  source: NodeRef;
  target: NodeRef;
  type: EdgeType;
  evidence: ProposedEvidence[];
  inferenceDistance?: InferenceDistance;
  modelReportedConfidence?: number;
}

// Wrapper-stage rejection types are canonical since contract v2 (A-6):
// WrapperRejection / WrapperRejectionReason live in extraction-contracts.ts.

export interface ProposerRunResult {
  status: "complete" | "error";
  /** Model calls made (1, or 2 when the single repair was used). */
  attempts: number;
  output: ProposerOutput;
  /** Valid candidates removed by deterministic policy guards (§7/§9). */
  dropped: WrapperRejection[];
  /** Candidates that failed per-candidate shape validation (§10.3). */
  rejectedCandidates: WrapperRejection[];
  /** C-4: count of EXTRACTED-evidence roles normalized to SUPPORT (telemetry). */
  roleNormalizedCount: number;
  /** Unknown ontology keys, log-only in v1 (§7 guard 3). */
  ontologyCandidates: { tempId: string; ontologyKey: string }[];
  runId: string;
  promptVersion: string;
  promptTemplateHash: string;
  contractVersion: string;
  /** The exact serialized context (audit; pair with promptTemplateHash). */
  serializedContext: string;
}
