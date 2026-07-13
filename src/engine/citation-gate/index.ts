// Citation gate — public surface. See /docs/citation-gate-spec.md.
// The gate is the deterministic trust boundary (LAW 2): all model output
// flows through gate(); nothing writes graph state around it.

export { gate } from "./gate";
export { GATE_CONFIG_V1 } from "./config";
export type { GateConfig, GateMode } from "./config";
export { normalizeQuote, normalizeWithMap, NORMALIZATION_VERSION } from "./normalize";
export type { NormalizedText } from "./normalize";
export { locateQuote } from "./locate";
export type { LocateResult } from "./locate";
export { computeMass, isConferring } from "./mass";
export { computeConfidence } from "./confidence";
export { nextState } from "./state";
export type { StateContext } from "./state";
export * from "./types";
