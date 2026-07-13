// Citation gate — named, versioned configuration.
//
// CLAUDE.md invariant: NO magic numbers. Every threshold, weight, and
// half-life lives here, versioned, so tuning is expected but un-versioned
// tuning is impossible. The gate takes a GateConfig parameter (defaulting to
// GATE_CONFIG_V1) and stays a pure function of its inputs.

export type GateMode = "SUPERVISED" | "SOLO";

export interface GateConfig {
  gateVersion: string;
  normalizationVersion: string;
  massAlgorithmVersion: string;
  confidenceAlgorithmVersion: string;
  stateAlgorithmVersion: string;
  ontologyVersion: string;

  /**
   * SUPERVISED: a human curator reviews interpretation-dependent transitions.
   * SOLO: the §1.1 hard rule applies — a single model-labeled COUNTERVAILING
   * quote must NOT auto-transition state; corroboration across ≥N distinct
   * events is required.
   */
  mode: GateMode;

  /** Recency half-life for mass weighting (spec §6.2). */
  halfLifeDays: number;

  /** Materialization: recurrence, not a single mention (spec §6.1). */
  materialization: {
    minConferringSpans: number;
    minDistinctSources: number;
  };

  /**
   * Ignition for BECOMING nodes (spec v1.3 §6.4): ENACTMENT-role conferring
   * evidence only, ≥2 spans from ≥2 distinct events. Stricter than
   * materialization because only enactments count — a single mislabeled
   * declaration can never fire a ceremonial ignition.
   */
  ignition: {
    minConferringSpans: number;
    minDistinctSources: number;
  };

  /** Quote location (spec v1.3 §5 — the hint is never a locator). */
  locate: {
    /**
     * When a quote matches multiple times and an offsetHint is supplied but
     * every match is farther than this from the hint, the gate falls back to
     * the FIRST match and lowers confidence (never rejects a real quote).
     */
    offsetHintPlausibilityRadiusChars: number;
  };

  confidence: {
    base: number;
    corroborationPerExtraSource: number;
    contradictionPenalty: number;
    ontologyNoveltyPenalty: number;
    /** Hypothesis nodes start here and rise only with lived evidence (LAW 5). */
    hypothesisFloor: number;
    /** v1.3: applied when any evidence needed the far-hint first-match fallback. */
    hintFallbackPenalty: number;
  };

  /**
   * The countervailing ladder (spec §6.4), counted in DISTINCT source events
   * carrying verified SELF-authored COUNTERVAILING evidence. v1 placeholder
   * ladder — deliberately simple, deliberately versioned.
   */
  stateThresholds: {
    /** ACTIVE → QUESTIONED (supervised mode; solo uses the guard below). */
    questionedMinCountervailingSources: number;
    /** → LOOSENING. */
    looseningMinCountervailingSources: number;
    /** → TRANSMUTATION_CANDIDATE. */
    transmutationMinCountervailingSources: number;
    /** TRANSMUTATION_CANDIDATE → INTEGRATED additionally requires present
     * supporting mass below this ceiling (the old weight has actually faded). */
    integrationMaxPresentSupportingMass: number;
  };

  /** §1.1 hard rule: interpretation-dependent transitions in SOLO mode. */
  interpretationGuard: {
    soloMinDistinctCountervailingSources: number;
  };

  /** any → DORMANT: documented then, quiet now (spec §6.4). */
  dormancy: {
    /** Present (recency-weighted) supporting mass below this → dormant… */
    floorMass: number;
    /** …provided the node has at least this much historical evidence. */
    minHistoricalSpans: number;
  };

  /**
   * v1 fixed ontology (master spec §7): keys the current ontology recognizes.
   * A proposal carrying a key outside this set (and outside the prior graph)
   * still materializes, but with the novelty confidence penalty and an
   * ontology-candidate log entry (META-01 loose ontology).
   */
  knownOntologyKeys: readonly string[];
}

export const GATE_CONFIG_V1: GateConfig = {
  gateVersion: "v1.3",
  normalizationVersion: "v1",
  massAlgorithmVersion: "v1",
  confidenceAlgorithmVersion: "v1.1",
  stateAlgorithmVersion: "v1",
  ontologyVersion: "v1",

  mode: "SUPERVISED",

  halfLifeDays: 180,

  materialization: {
    minConferringSpans: 2,
    minDistinctSources: 2,
  },

  ignition: {
    minConferringSpans: 2,
    minDistinctSources: 2,
  },

  locate: {
    offsetHintPlausibilityRadiusChars: 400,
  },

  confidence: {
    base: 0.4,
    corroborationPerExtraSource: 0.15,
    contradictionPenalty: 0.2,
    ontologyNoveltyPenalty: 0.25,
    hypothesisFloor: 0.15,
    hintFallbackPenalty: 0.1,
  },

  stateThresholds: {
    questionedMinCountervailingSources: 1,
    looseningMinCountervailingSources: 3,
    transmutationMinCountervailingSources: 5,
    integrationMaxPresentSupportingMass: 0.5,
  },

  interpretationGuard: {
    soloMinDistinctCountervailingSources: 2,
  },

  dormancy: {
    floorMass: 0.25,
    minHistoricalSpans: 2,
  },

  knownOntologyKeys: [
    // v1 seed ontology — one key per core node type, extended via the
    // ontology-candidate log, never by silently forcing a bucket.
    "wound.core",
    "shadow.core",
    "belief.core",
    "protection.core",
    "pattern.core",
    "trait.core",
    "resource.core",
    "becoming.core",
    "lens.core",
  ],
};
