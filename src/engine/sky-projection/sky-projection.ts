// SKY PROJECTION — the ONLY place domain values become visual values
// (renderer-lens spec §2). Pure function: persisted views + explicit now +
// seed + viewer + versioned config → SkyViewModel. Unit-testable without a
// GPU; deterministic (canonical output ordering, no ambient clock, no
// randomness). The GPU force layout downstream is NOT reproducible across
// devices — the determinism claim stops at this model's content.
//
// Everything the grammar renders is computed HERE and carried IN the model:
// - the WOUND veil (from `viewer`; a veiled entry holds the veil copy, never
//   the raw label — every renderer of the model inherits the veil for free);
// - the draft watermark (from the ghost's lensMapVersion — checkpoint rule);
// - ghost styling, confidence bands, brightness, state treatments, fringe.
// Renderers downstream style; they never decide.

import { brightness } from "./brightness";
import type { RendererConfig } from "./renderer-config.v1";
import type {
  ConfidenceBand,
  EffectiveEvidenceView,
  LensMatchLinkView,
  PersistedEdgeView,
  PersistedNodeView,
  SkyEdgeVM,
  SkyNodeVM,
  SkyViewModel,
  ViewerContext,
} from "./types";

export const PROJECTION_VERSION = "v1";

/** The one-word WHERE clause, re-applied fail-closed at render time: a row
 * whose Evidence or SourceEvent was invalidated/erased contributes nothing —
 * un-confirming must un-tell on the surface the person actually looks at. */
const isValid = (e: EffectiveEvidenceView): boolean =>
  e.invalidatedAt === null && e.sourceInvalidatedAt === null;

const bandFor = (
  confidence: number,
  config: RendererConfig,
): { band: ConfidenceBand; ringWidth: number } => {
  for (const b of config.confidence.bands) {
    if (confidence <= b.max) return { band: b.band, ringWidth: b.ringWidth };
  }
  const last = config.confidence.bands[config.confidence.bands.length - 1];
  return { band: last.band, ringWidth: last.ringWidth };
};

const byId = <T extends { id: string }>(a: T, b: T): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

export function skyProjection(
  nodes: readonly PersistedNodeView[],
  edges: readonly PersistedEdgeView[],
  now: Date,
  seed: string,
  viewer: ViewerContext,
  config: RendererConfig,
  matchLinks: readonly LensMatchLinkView[] = [],
): SkyViewModel {
  return {
    projectionVersion: PROJECTION_VERSION,
    rendererConfigVersion: config.rendererConfigVersion,
    seed,
    now: now.toISOString(),
    nodes: [...nodes].sort(byId).map((n) => projectNode(n, now, viewer, config)),
    edges: [...edges].sort(byId).map((e) => projectEdge(e, config)),
    matchLinks: [...matchLinks]
      .map((l) => ({ ...l, evidenceIds: [...l.evidenceIds].sort() }))
      .sort(
        (a, b) =>
          (a.lensNodeId < b.lensNodeId ? -1 : a.lensNodeId > b.lensNodeId ? 1 : 0) ||
          (a.extractedNodeId < b.extractedNodeId ? -1 : a.extractedNodeId > b.extractedNodeId ? 1 : 0),
      ),
    fringe: { copy: config.fringe.copy, treatment: config.fringe.treatment },
  };
}

function projectNode(
  n: PersistedNodeView,
  now: Date,
  viewer: ViewerContext,
  config: RendererConfig,
): SkyNodeVM {
  // D-R5 / r2 A-4: the veil is computed INTO the model. v1 has no release
  // carrier, so anything short of a consented practitioner view is veiled —
  // fail-closed, including a client inside their own supervised engagement.
  const veiled =
    n.type === "WOUND" &&
    !(viewer.role === "PRACTITIONER" && viewer.woundConsent);

  const validEvidence = n.effectiveEvidence.filter(isValid);
  const isGhost = n.state === "HYPOTHESIS";
  const draftWatermark =
    n.provenance === "LENS" &&
    typeof n.lensMapVersion === "string" &&
    n.lensMapVersion.endsWith("-draft");

  const rawLabel = draftWatermark
    ? `${n.label}${config.draftWatermark.suffix}`
    : n.label;

  const stateTreatment =
    n.state === "CONTRADICTED"
      ? config.states.CONTRADICTED
      : n.state === "DORMANT"
        ? config.states.DORMANT
        : null;

  const baseBrightness = brightness(
    validEvidence.map((e) => e.occurredAt),
    now,
    config.brightness,
  );
  const glow = stateTreatment
    ? Math.max(config.brightness.floor * stateTreatment.dimFactor, baseBrightness * stateTreatment.dimFactor)
    : baseBrightness;

  const { band, ringWidth } = bandFor(n.confidence, config);

  const provenanceCopy =
    !veiled && isGhost && validEvidence.length === 0 && n.provenance !== "EXTRACTED"
      ? config.provenanceCopy[n.provenance]
      : null;

  return {
    id: n.id,
    label: veiled ? config.woundGate.veilCopy : rawLabel,
    veiled,
    draftWatermark,
    type: n.type,
    provenance: n.provenance,
    state: n.state,
    size: config.size.minRadius + Math.log1p(n.mass) * config.size.massScale,
    brightness: glow,
    opacity:
      config.confidence.opacityFloor +
      (1 - config.confidence.opacityFloor) * Math.min(1, Math.max(0, n.confidence)),
    saturation: isGhost ? config.ghost.saturation : 1,
    confidence: n.confidence,
    confidenceBand: band,
    ringWidth,
    ghost: isGhost ? { dashedRing: true, badge: config.ghost.badge } : null,
    dimmed: stateTreatment !== null,
    struck: stateTreatment?.struck ?? false,
    evidenceCount: validEvidence.length,
    provenanceCopy,
  };
}

function projectEdge(e: PersistedEdgeView, config: RendererConfig): SkyEdgeVM {
  const { band } = bandFor(e.confidence, config);
  return {
    id: e.id,
    sourceId: e.sourceId,
    targetId: e.targetId,
    type: e.type,
    weight: config.edges.minWeight + e.strength * config.edges.weightScale,
    opacity:
      config.edges.opacityFloor +
      (1 - config.edges.opacityFloor) * Math.min(1, Math.max(0, e.confidence)),
    dashed: e.confidence < config.edges.dashBelowConfidence,
    confidence: e.confidence,
    confidenceBand: band,
  };
}
