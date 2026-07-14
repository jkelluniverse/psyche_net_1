// MATCHER CONFIG — versioned, mode-carrying (renderer-lens spec §3).
//
// The mode guard is STRUCTURAL: the matcher consumes a config carrying
// mode: SOLO | SUPERVISED, mirroring GateConfig — a single model-labeled
// COUNTERVAILING quote never auto-contradicts in SOLO by the same shape of
// code that enforces it in the gate (the gate's nextState carries the
// numeric guard; the matcher adds the SUPERVISED authority requirement).
// Callers derive mode from the engagement, never hardcode it.

export type MatcherMode = "SOLO" | "SUPERVISED";

export interface MatcherConfig {
  matcherConfigVersion: string;
  /** v1 = exact domain type + exact ontologyKey. No embeddings, no LLM
   * similarity (post-pilot, §7.1). */
  matchRuleVersion: string;
  mode: MatcherMode;
}

export const MATCHER_CONFIG_V1: MatcherConfig = {
  matcherConfigVersion: "v1",
  matchRuleVersion: "v1",
  mode: "SUPERVISED",
};
