// GHOST SELECTION — tests written before the selector exists (tests-first).
//
// Deterministic budget cut per spec §1: total order (priority-strength first,
// then ontologyKey asc, then label asc), the cap from config, NO SILENT CAPS
// (dropped templates are reported), and Jacob's tier-3 diversity rule: at
// least `minTier3Ghosts` conditioning-theme ghosts survive the cut when the
// chart offers them — the uncomfortable-but-recognizable ones are the demo's
// "how did it know that" moment, and pure priority-ordering would kill them.

import { describe, expect, it } from "vitest";
import { LENS_CONFIG_V1, selectGhosts } from "../select-ghosts";
import { LENS_MAP_VERSION, lensMap } from "../lens-map.v1";
import { parseChart } from "../parse-chart";

const FULL_CHART = {
  human_design: {
    type: "Manifesting Generator",
    authority: "Emotional",
    defined_centers: ["Sacral", "Solar Plexus", "Throat"],
  },
  natal: { sun_sign: "Leo", moon_sign: "Pisces", ascendant_sign: "Aries" },
};

const features = () => {
  const r = parseChart(FULL_CHART);
  if (!r.ok) throw new Error("fixture chart failed to parse");
  return r.features;
};

describe("ghost selection — determinism + total order", () => {
  it("same features → byte-identical selection, twice (keystone)", () => {
    const a = selectGhosts(features(), LENS_CONFIG_V1);
    const b = selectGhosts(features(), LENS_CONFIG_V1);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("selection is capped by the ghost budget and stamps its versions", () => {
    const s = selectGhosts(features(), LENS_CONFIG_V1);
    expect(s.ghosts.length).toBeLessThanOrEqual(LENS_CONFIG_V1.ghostBudget);
    expect(s.lensMapVersion).toBe(LENS_MAP_VERSION);
    expect(s.configVersion).toBe(LENS_CONFIG_V1.configVersion);
  });

  it("no silent caps: every matched-but-dropped template is reported", () => {
    const s = selectGhosts(features(), LENS_CONFIG_V1);
    const matched = lensMap.filter((t) => features().includes(t.feature));
    expect(s.ghosts.length + s.dropped.length).toBe(matched.length);
  });

  it("the total order is priority-strength first (1 strongest), then ontologyKey, then label", () => {
    const s = selectGhosts(features(), LENS_CONFIG_V1);
    // ignore the diversity swap-ins at the tail: check the pre-diversity
    // prefix is monotonic in priority and key-ordered within a tier
    const priorities = s.ghosts.map((g) => g.priority);
    const tier1Count = priorities.filter((p) => p === 1).length;
    expect(priorities.slice(0, tier1Count).every((p) => p === 1)).toBe(true);
    const tier1Keys = s.ghosts.slice(0, tier1Count).map((g) => g.ontologyKey);
    expect([...tier1Keys].sort()).toEqual(tier1Keys);
  });
});

describe("ghost selection — Jacob's tier-3 diversity rule", () => {
  it("at least minTier3Ghosts tier-3 ghosts survive the cut when the chart offers them", () => {
    const s = selectGhosts(features(), LENS_CONFIG_V1);
    const tier3 = s.ghosts.filter((g) => g.priority === 3).length;
    const tier3Available = lensMap.filter(
      (t) => t.priority === 3 && features().includes(t.feature),
    ).length;
    expect(tier3).toBeGreaterThanOrEqual(
      Math.min(LENS_CONFIG_V1.minTier3Ghosts, tier3Available),
    );
  });

  it("the diversity swap evicts the LOWEST-ranked non-tier-3 ghosts, deterministically", () => {
    // Tight budget forces the swap to be visible: budget 5 over a chart with
    // 3 tier-1 + several tier-2 + several tier-3 candidates.
    const cfg = { ...LENS_CONFIG_V1, ghostBudget: 5 };
    const s = selectGhosts(features(), cfg);
    expect(s.ghosts.length).toBe(5);
    expect(s.ghosts.filter((g) => g.priority === 3).length).toBeGreaterThanOrEqual(
      cfg.minTier3Ghosts,
    );
    // tier-1 spine ghosts are never the ones evicted
    expect(s.ghosts.filter((g) => g.priority === 1).length).toBe(3);
  });

  it("a chart with no tier-3 candidates simply fills from higher tiers (no fabrication)", () => {
    const onlyTier1Features = lensMap
      .filter((t) => t.priority === 1)
      .map((t) => t.feature)
      .slice(0, 4);
    const s = selectGhosts(onlyTier1Features, LENS_CONFIG_V1);
    expect(s.ghosts.every((g) => g.priority === 1)).toBe(true);
  });

  it("unknown feature strings are ignored (the parser is the vocabulary gate, not the selector)", () => {
    const s = selectGhosts(["hd.type.projector", "not.a.feature"], LENS_CONFIG_V1);
    expect(s.ghosts).toHaveLength(1);
    expect(s.ghosts[0].feature).toBe("hd.type.projector");
  });
});
