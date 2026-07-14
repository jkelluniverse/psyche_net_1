// SKY PROJECTION TYPES — structural input honesty (renderer-lens spec §2).
//
// The projection's inputs are PERSISTED VIEWS ONLY. ShadowCandidate (and any
// other held-not-shown material) is unrepresentable here by construction —
// the exclusion is enforced by the type system, not convention. The persisted
// recency-glow column is deliberately ABSENT from PersistedNodeView: its
// formula stays deferred per the schema's own guard, and brightness is
// computed inside the projection from effectiveEvidence instead.

import type {
  Authorship,
  EdgeType,
  EvidencePolarity,
  NodeState,
  NodeType,
  Provenance,
} from "@prisma/client";

// ── Inputs (loader-shaped persisted views) ───────────────────────────────────

/** One entry of a node's effective evidence set: own Evidence rows ∪ rows
 * linked via HypothesisEvidenceLink (r2 A-2). Canonically sorted by the
 * loader (occurredAt, then evidenceId). The invalidation fields exist so the
 * projection can RE-apply the one-word WHERE clause fail-closed — a row whose
 * source was retracted or LAW-8-erased is not rendered, never sliced. */
export interface EffectiveEvidenceView {
  evidenceId: string;
  authorship: Authorship;
  spanStart: number;
  spanEnd: number;
  occurredAt: Date;
  polarity: EvidencePolarity;
  conferring: boolean;
  normalizationVersion: string;
  invalidatedAt: Date | null;
  sourceInvalidatedAt: Date | null;
}

export interface PersistedNodeView {
  id: string;
  type: NodeType;
  provenance: Provenance;
  label: string;
  ontologyKey: string | null;
  mass: number;
  confidence: number;
  state: NodeState;
  lensMapVersion: string | null;
  chartImportId: string | null;
  effectiveEvidence: EffectiveEvidenceView[];
}

export interface PersistedEdgeView {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  strength: number;
  confidence: number;
}

/** Viewer context — the WOUND veil's carrier (r2 A-4, D-R5).
 *
 * Discriminated on purpose: an INDIVIDUAL viewer structurally CANNOT carry
 * wound visibility — v1 has no release carrier, so a client viewing their own
 * map inside a supervised engagement is veiled ALWAYS (fail-closed). The
 * future per-node release state (practitioner-authored `releasedNodeIds`,
 * §7.1 bundle) gets its seam HERE when it exists — it is deliberately not
 * representable until then. `woundConsent` is derived by the loader from
 * PractitionerClient.consentScope, never asserted by the client. */
export type ViewerContext =
  | { role: "INDIVIDUAL" }
  | { role: "PRACTITIONER"; woundConsent: boolean };

/** Non-persisted rendering overlay computed from the HypothesisEvidenceLink
 * table (spec §2) — what the matched-pair treatment renders from. Empty until
 * the matcher (migration 8) starts writing links. */
export interface LensMatchLinkView {
  lensNodeId: string;
  extractedNodeId: string;
  evidenceIds: string[];
}

// ── Output (the view model) ──────────────────────────────────────────────────
//
// NO COORDINATES ANYWHERE. Force-layout positions are stochastic GPU
// artifacts; they never exist in this model, are never persisted, and never
// flow back into domain state (CLAUDE.md domain/rendering separation).

export type ConfidenceBand = "low" | "medium" | "high";

export interface SkyNodeVM {
  id: string;
  /** Display label. For a veiled node this IS the veil copy — the raw label
   * never enters the view model. For a draft-map ghost the watermark is
   * already appended (every renderer inherits it for free). */
  label: string;
  veiled: boolean;
  draftWatermark: boolean;
  type: NodeType;
  provenance: Provenance;
  state: NodeState;
  /** Radius from mass (log scale); mass 0 = minimum ghost radius. */
  size: number;
  /** Recency glow in [floor, 1], computed from valid effectiveEvidence. */
  brightness: number;
  /** Confidence-mapped opacity with a visibility floor (LAW 5). */
  opacity: number;
  saturation: number;
  confidence: number;
  confidenceBand: ConfidenceBand;
  /** Uncertainty-ring width for the band (wider = less certain). */
  ringWidth: number;
  /** Ghost styling for HYPOTHESIS nodes; null otherwise. */
  ghost: { dashedRing: boolean; badge: string } | null;
  dimmed: boolean;
  struck: boolean;
  /** Count of VALID effective evidence rows (invalidated rows excluded). */
  evidenceCount: number;
  /** Provenance copy for hypothesis nodes with zero surviving evidence
   * ("From your chart — nothing in your words yet confirms this."); null
   * when the node has an evidence story to tell. */
  provenanceCopy: string | null;
}

export interface SkyEdgeVM {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  weight: number;
  opacity: number;
  dashed: boolean;
  confidence: number;
  confidenceBand: ConfidenceBand;
}

export interface SkyViewModel {
  projectionVersion: string;
  rendererConfigVersion: string;
  /** The stable per-user layout seed — a rendering convenience passed through
   * to cosmos.gl, never a semantic claim. */
  seed: string;
  /** The explicit clock this model was computed against (ISO). */
  now: string;
  nodes: SkyNodeVM[];
  edges: SkyEdgeVM[];
  matchLinks: LensMatchLinkView[];
  /** The edge of the unexplored (LAW 5): honest static affordance. */
  fringe: { copy: string; treatment: string };
}
