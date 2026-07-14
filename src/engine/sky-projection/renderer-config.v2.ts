// RENDERER CONFIG v2 — the Tier-0 legibility pass (Jacob's production-walk
// directive, 2026-07-14). Same grammar, tuned constants: v1's floors encoded
// low confidence technically but rendered an all-ghost sky as near-invisible
// dots — which violates spec §2's own demand that low confidence be LEGIBLE
// (LAW 5 is "visibly uncertain", not "barely there"). v2 raises the minimum
// ghost radius, the confidence-opacity floor, and the brightness floor so a
// mass-0 sky reads as faint-but-inviting starlight, while ghost styling
// (desaturation, dashed ring, badge) stays visibly distinct from what an
// earned ACTIVE node will look like.
//
// The celestial THEME (dark field, warm star palette, fringe treatment
// colors) is renderer-side and lives in the canvas component — this config
// stays a grammar carrier, and skyProjection stays pure. Canonical-view
// snapshot for v2 checked in with this edit (same-edit rule).

import type { RendererConfig } from "./renderer-config.v1";

export const RENDERER_CONFIG_V2: RendererConfig = {
  rendererConfigVersion: "v2",
  size: {
    // Mass 0 must read as a star, not a speck (was 3).
    minRadius: 9,
    massScale: 4,
  },
  brightness: {
    halfLifeDays: 45,
    // An uncharged/aged node still glows faintly warm (was 0.15) —
    // DORMANT continues to dim relative to fresh, never vanishes.
    floor: 0.4,
  },
  confidence: {
    // Low confidence dims, legibly (was 0.35).
    opacityFloor: 0.6,
    bands: [
      { max: 0.4, band: "low", ringWidth: 3 },
      { max: 0.75, band: "medium", ringWidth: 2 },
      { max: 1, band: "high", ringWidth: 1 },
    ],
  },
  ghost: {
    badge: "hypothesis",
    // Distinct-from-earned is carried by desaturation + dashed ring + badge,
    // not by invisibility.
    saturation: 0.45,
  },
  states: {
    CONTRADICTED: { dimFactor: 0.4, struck: true },
    DORMANT: { dimFactor: 0.5, struck: false },
  },
  edges: {
    minWeight: 0.5,
    weightScale: 3,
    opacityFloor: 0.25,
    dashBelowConfidence: 0.4,
  },
  woundGate: {
    veilCopy: "Something to explore together next session",
  },
  fringe: {
    copy: "This map shows only what your words have touched — the rest of the sky is still unexplored.",
    treatment: "soft-gradient",
  },
  provenanceCopy: {
    LENS: "From your chart — nothing in your words yet confirms this.",
    BECOMING: "A quality you named for yourself — not yet lived into words.",
    PRACTITIONER:
      "Your practitioner's observation — nothing in your words yet confirms this.",
  },
  draftWatermark: {
    suffix: " — draft reading",
  },
};
