// The change state machine (spec §6.4) — nextState is a PURE function of
// (previous state, validated evidence set, now, config). No randomness, no
// model calls. Interpretation-dependent transitions (anything driven by
// model-assigned COUNTERVAILING polarity) honor the §1.1 solo-mode guard:
// a single countervailing label never moves state without corroboration.

import type { GateConfig } from "./config";
import { computeMass, isConferring } from "./mass";
import type {
  EvidenceRecord,
  NodeState,
  NodeType,
  Provenance,
  StateDerivation,
} from "./types";

export interface StateContext {
  nodeType: NodeType;
  provenance: Provenance;
}

/** Ordered change arc — the ladder never runs backwards in v1. */
const ARC: NodeState[] = [
  "ACTIVE",
  "QUESTIONED",
  "LOOSENING",
  "TRANSMUTATION_CANDIDATE",
  "INTEGRATED",
];

function arcIndex(s: NodeState): number {
  return ARC.indexOf(s);
}

export function nextState(
  prev: NodeState,
  evidence: EvidenceRecord[],
  ctx: StateContext,
  now: Date,
  config: GateConfig,
): { state: NodeState; derivation: StateDerivation } {
  const conferringSupporting = evidence.filter(
    (e) => isConferring(e, ctx.nodeType) && e.polarity === "SUPPORTING",
  );
  const countervailing = evidence.filter(
    (e) =>
      e.authorship === "SELF" &&
      e.sourceInvalidatedAt == null &&
      e.polarity === "COUNTERVAILING",
  );
  const supportingSpans = conferringSupporting.length;
  const supportingSources = new Set(conferringSupporting.map((e) => e.sourceEventId)).size;
  const countervailingSources = new Set(countervailing.map((e) => e.sourceEventId)).size;
  const presentSupportingMass = computeMass(evidence, ctx.nodeType, now, config).value;

  const t = config.stateThresholds;
  // §1.1 hard rule: in SOLO mode, interpretation-dependent transitions need
  // corroboration across distinct events; in SUPERVISED the human is the guard.
  const questionedMin =
    config.mode === "SOLO"
      ? config.interpretationGuard.soloMinDistinctCountervailingSources
      : t.questionedMinCountervailingSources;

  const done = (state: NodeState, rule: string) => ({
    state,
    derivation: {
      algorithmVersion: config.stateAlgorithmVersion,
      previous: prev,
      rule,
      supportingDistinctSources: supportingSources,
      countervailingDistinctSources: countervailingSources,
      presentSupportingMass,
    },
  });

  // Terminal states (v1).
  if (prev === "INTEGRATED") return done("INTEGRATED", "terminal:integrated");
  if (prev === "CONTRADICTED") return done("CONTRADICTED", "terminal:contradicted");

  const materialized =
    supportingSpans >= config.materialization.minConferringSpans &&
    supportingSources >= config.materialization.minDistinctSources;

  // Hypothesis resolution (one gate, four doors — LAW 3).
  if (prev === "HYPOTHESIS") {
    if (ctx.nodeType === "BECOMING" || ctx.provenance === "BECOMING") {
      // Becoming seeds ignite or wait — they never take the generic ACTIVE path.
      const ignited =
        supportingSpans >= config.ignition.minConferringSpans &&
        supportingSources >= config.ignition.minDistinctSources;
      return ignited
        ? done("IGNITED", "becoming:ignition-threshold")
        : done("HYPOTHESIS", "becoming:awaiting-enactment");
    }
    if (ctx.nodeType === "LENS" || ctx.provenance === "LENS") {
      if (countervailingSources >= questionedMin) {
        return done("CONTRADICTED", "lens:contradicted-by-lived-evidence");
      }
      if (materialized) return done("ACTIVE", "lens:confirmed-by-lived-evidence");
      return done("HYPOTHESIS", "lens:silent");
    }
    if (materialized) return done("ACTIVE", "hypothesis:materialization-threshold");
    return done("HYPOTHESIS", "hypothesis:below-threshold");
  }

  // The countervailing ladder (mass-bearing states).
  const rungFromCounts = (): NodeState => {
    if (countervailingSources >= t.transmutationMinCountervailingSources) {
      if (presentSupportingMass <= t.integrationMaxPresentSupportingMass) return "INTEGRATED";
      return "TRANSMUTATION_CANDIDATE";
    }
    if (countervailingSources >= t.looseningMinCountervailingSources) return "LOOSENING";
    if (countervailingSources >= questionedMin) return "QUESTIONED";
    return "ACTIVE";
  };

  let candidate: NodeState;
  let rule: string;
  if (prev === "IGNITED") {
    candidate = "IGNITED";
    rule = "ignited:holds";
  } else if (prev === "DORMANT") {
    if (presentSupportingMass >= config.dormancy.floorMass) {
      candidate = rungFromCounts();
      rule = "dormant:woken-by-fresh-evidence";
    } else {
      return done("DORMANT", "dormant:still-quiet");
    }
  } else {
    const target = rungFromCounts();
    // Never run the arc backwards: keep the further of (prev, target).
    candidate = arcIndex(target) > arcIndex(prev) ? target : prev;
    rule =
      arcIndex(target) > arcIndex(prev)
        ? `arc:advance-to-${target.toLowerCase()}`
        : "arc:holds";
  }

  // Integration is a completed arc, not a fade — it wins over dormancy.
  if (candidate === "INTEGRATED") return done("INTEGRATED", "arc:integrated");

  // any → DORMANT: documented then, quiet now (temporal honesty, ARCH-01).
  if (
    presentSupportingMass < config.dormancy.floorMass &&
    supportingSpans >= config.dormancy.minHistoricalSpans
  ) {
    return done("DORMANT", "dormancy:present-mass-below-floor");
  }

  return done(candidate, rule);
}
