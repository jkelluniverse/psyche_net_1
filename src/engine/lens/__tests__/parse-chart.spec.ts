// CHART PARSER — tests written before the parser exists (tests-first).
//
// The parser is the seam where a third-party API's JSON becomes OUR feature
// strings. Three obligations beyond correctness (Jacob, lens-lane kickoff):
// 1. THE DETERMINISM KEYSTONE (spec §5 test 1): same chart JSON → byte-
//    identical output, twice.
// 2. Unknown/malformed features are SKIPPED AND LOGGED, never guessed into
//    a node (spec §1 failure modes) — and malformed top-level input fails
//    the whole parse closed (status=error, zero features, retryable).
// 3. The feature-string vocabulary is VERSION-STAMPED with every parse —
//    when astrology-api.io changes its response shape (it will), replay
//    must know which parser read which raw JSON.

import { describe, expect, it } from "vitest";
import {
  CHART_FEATURE_VOCABULARY,
  FEATURE_VOCABULARY_VERSION,
  PARSER_VERSION,
  parseChart,
} from "../parse-chart";
import { lensMap } from "../lens-map.v1";

const FULL_CHART = {
  human_design: {
    type: "Manifesting Generator",
    authority: "Emotional",
    defined_centers: ["Sacral", "Solar Plexus", "Throat"],
  },
  natal: {
    sun_sign: "Leo",
    moon_sign: "Pisces",
    ascendant_sign: "Aries",
  },
};

describe("chart parser — determinism keystone", () => {
  it("same chart JSON → byte-identical ParseResult, twice (spec §5 test 1)", () => {
    const a = parseChart(FULL_CHART);
    const b = parseChart(JSON.parse(JSON.stringify(FULL_CHART)));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("output features are canonically sorted and deduplicated", () => {
    const r = parseChart(FULL_CHART);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect([...r.features].sort()).toEqual(r.features);
    expect(new Set(r.features).size).toBe(r.features.length);
  });

  it("normalization is insensitive to the provider's casing/spacing", () => {
    const messy = {
      human_design: {
        type: "  manifesting-generator ",
        authority: "EMOTIONAL",
        defined_centers: ["sacral", "solar-plexus", "THROAT"],
      },
      natal: { sun_sign: "leo", moon_sign: "PISCES", ascendant_sign: " Aries " },
    };
    expect(JSON.stringify(parseChart(messy))).toBe(JSON.stringify(parseChart(FULL_CHART)));
  });
});

describe("chart parser — feature semantics", () => {
  it("maps HD type/authority, defined AND derived-undefined centers, and natal element/modality", () => {
    const r = parseChart(FULL_CHART);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.features).toContain("hd.type.manifesting_generator");
    expect(r.features).toContain("hd.authority.emotional");
    expect(r.features).toContain("hd.defined.sacral");
    expect(r.features).toContain("hd.defined.solar_plexus");
    // undefined centers are the deterministic complement of the defined set
    expect(r.features).toContain("hd.undefined.spleen");
    expect(r.features).toContain("hd.undefined.g");
    expect(r.features).not.toContain("hd.undefined.sacral");
    // natal: sign → element (sun/moon), sign → modality (ascendant)
    expect(r.features).toContain("natal.sun.fire"); // leo
    expect(r.features).toContain("natal.moon.water"); // pisces
    expect(r.features).toContain("natal.asc.cardinal"); // aries
  });

  it("every emitted feature is in the versioned vocabulary, and the vocabulary covers the lens map", () => {
    const r = parseChart(FULL_CHART);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const f of r.features) {
      expect(CHART_FEATURE_VOCABULARY.has(f), `feature ${f} outside vocabulary`).toBe(true);
    }
    // The map's features must all be REACHABLE by the parser (a template no
    // chart can trigger is dead weight the determinism keystone can't see).
    for (const t of lensMap) {
      expect(CHART_FEATURE_VOCABULARY.has(t.feature), `unreachable template feature ${t.feature}`).toBe(true);
    }
  });

  it("stamps parserVersion and featureVocabularyVersion on every result (replay knows which parser read which JSON)", () => {
    const ok = parseChart(FULL_CHART);
    expect(ok.parserVersion).toBe(PARSER_VERSION);
    expect(ok.featureVocabularyVersion).toBe(FEATURE_VOCABULARY_VERSION);
    const bad = parseChart("not a chart");
    expect(bad.parserVersion).toBe(PARSER_VERSION);
    expect(bad.featureVocabularyVersion).toBe(FEATURE_VOCABULARY_VERSION);
  });
});

describe("chart parser — skip-and-log, never guess (spec §1)", () => {
  it("an unknown chart feature is skipped and logged, never guessed into a feature", () => {
    const r = parseChart({
      human_design: {
        type: "Quantum Overlord", // not a thing
        authority: "Emotional",
        defined_centers: ["Sacral", "Flux Capacitor"], // one real, one not
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.features).toContain("hd.authority.emotional");
    expect(r.features).toContain("hd.defined.sacral");
    expect(r.features.some((f) => f.includes("quantum") || f.includes("flux"))).toBe(false);
    const skippedPaths = r.skipped.map((s) => s.path);
    expect(skippedPaths).toContain("human_design.type");
    expect(skippedPaths).toContain("human_design.defined_centers[1]");
    for (const s of r.skipped) expect(s.reason.length).toBeGreaterThan(0);
  });

  it("an unknown natal sign is skipped, and no element/modality is fabricated for it", () => {
    const r = parseChart({ natal: { sun_sign: "Ophiuchus", moon_sign: "Leo" } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.features).toContain("natal.moon.fire");
    expect(r.features.every((f) => !f.startsWith("natal.sun."))).toBe(true);
    expect(r.skipped.map((s) => s.path)).toContain("natal.sun_sign");
  });

  it("malformed top-level input fails CLOSED: ok=false, zero features, a reason — never a partial ghost sky", () => {
    for (const bad of [null, 42, "nope", [], {}]) {
      const r = parseChart(bad);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.reason.length).toBeGreaterThan(0);
      expect("features" in r).toBe(false);
    }
  });

  it("a chart with only one system parses that system alone (HD-only cut-line)", () => {
    const r = parseChart({ human_design: { type: "Projector", authority: "Splenic", defined_centers: [] } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.features).toContain("hd.type.projector");
    expect(r.features.every((f) => !f.startsWith("natal."))).toBe(true);
    // all nine centers undefined for an empty defined list
    expect(r.features.filter((f) => f.startsWith("hd.undefined.")).length).toBe(9);
  });
});
