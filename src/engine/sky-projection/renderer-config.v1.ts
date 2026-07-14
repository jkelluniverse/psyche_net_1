// RENDERER CONFIG v1 — every rendering-grammar mapping, named and versioned
// (renderer-lens spec §2; CLAUDE.md: no magic numbers). The canonical-view
// snapshot for this version is checked in next to the projection tests;
// changing any constant here means a new config version and a new snapshot.

export interface BrightnessConfig {
  /** Days for the recency glow to halve. */
  halfLifeDays: number;
  /** Glow floor — a node with no (valid) evidence still faintly exists;
   * nothing on the sky ever fully vanishes (DORMANT dims, never disappears). */
  floor: number;
}

export interface ConfidenceBandConfig {
  /** Upper bound (inclusive) of the band. */
  max: number;
  band: "low" | "medium" | "high";
  /** Uncertainty-ring width — wider ring = less certain (LAW 5, visibly). */
  ringWidth: number;
}

export interface RendererConfig {
  rendererConfigVersion: string;
  size: {
    /** Radius at mass 0 — the ghost minimum. */
    minRadius: number;
    /** radius = minRadius + log1p(mass) * massScale. */
    massScale: number;
  };
  brightness: BrightnessConfig;
  confidence: {
    /** Opacity floor: low confidence dims, never hides (LAW 5). */
    opacityFloor: number;
    /** Ordered ascending by max; the last band must cover 1. */
    bands: ConfidenceBandConfig[];
  };
  ghost: {
    badge: string;
    saturation: number;
  };
  states: {
    CONTRADICTED: { dimFactor: number; struck: boolean };
    DORMANT: { dimFactor: number; struck: boolean };
  };
  edges: {
    /** weight = minWeight + strength * weightScale. */
    minWeight: number;
    weightScale: number;
    opacityFloor: number;
    /** Edges below this confidence render dashed. */
    dashBelowConfidence: number;
  };
  woundGate: {
    /** D-R5 register: calm and forward-looking, never ominous. */
    veilCopy: string;
  };
  fringe: {
    copy: string;
    treatment: string;
  };
  /** Copy for hypothesis nodes with zero surviving evidence, per provenance. */
  provenanceCopy: {
    LENS: string;
    BECOMING: string;
    PRACTITIONER: string;
  };
  /** SUPERVISED pending-confirmation copy (test 14). Optional: v1 predates
   * the confirmation carrier; v2 carries it. */
  pendingConfirmationCopy?: string;
  /** Checkpoint rule: ghost labels from an unblessed (draft) lens map carry
   * this suffix on every surface. Removed only by the map version flipping
   * to canon — never by a renderer opting out. */
  draftWatermark: {
    suffix: string;
  };
}

export const RENDERER_CONFIG_V1: RendererConfig = {
  rendererConfigVersion: "v1",
  size: {
    minRadius: 3,
    massScale: 4,
  },
  brightness: {
    halfLifeDays: 45,
    floor: 0.15,
  },
  confidence: {
    opacityFloor: 0.35,
    bands: [
      { max: 0.4, band: "low", ringWidth: 3 },
      { max: 0.75, band: "medium", ringWidth: 2 },
      { max: 1, band: "high", ringWidth: 1 },
    ],
  },
  ghost: {
    badge: "hypothesis",
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
