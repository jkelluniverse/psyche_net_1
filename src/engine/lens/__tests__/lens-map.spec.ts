// LENS MAP INTEGRITY — tests written before the map file lands (tests-first).
//
// The lens map is DATA whose obligations are enforceable, not aspirational
// (the corpus.spec pattern): every ghost-integrity rule the renderer-lens
// spec §1 states about templates is asserted here, so a lens-map edit that
// breaks phrasing rules, key reachability, or the D-R1 direction rule fails
// CI before it ever mints a ghost.

import { describe, expect, it } from "vitest";
import { LENS_MAP_VERSION, lensMap } from "../lens-map.v1";
import type { LensTemplate } from "../lens-map.v1";
import { ONTOLOGY_KEY_SET } from "../../ontology/ontology";

// D-R1 naming denylist (spec §1(c)): keys and labels describe psychology,
// never chart features. Segments checked, not substrings, to avoid false
// positives ("assignment" contains "sign").
const CHART_TERMS =
  /\b(hd|astro|natal|zodiac|gate|gates|center|centers|house|houses|authority|authorities|sacral|splenic|spleen|ajna|chart|planet|planetary|ascendant|generator|projector|manifestor|reflector|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b/i;

describe("lens map v1 — ghost integrity (spec §1)", () => {
  it("is versioned and non-empty", () => {
    expect(LENS_MAP_VERSION.length).toBeGreaterThan(0);
    expect(lensMap.length).toBeGreaterThan(0);
  });

  it("every ontologyKey exists in the shared ontology (D-R1: the map projects INTO the vocabulary)", () => {
    for (const t of lensMap) {
      expect(ONTOLOGY_KEY_SET.has(t.ontologyKey), `unknown key ${t.ontologyKey}`).toBe(true);
    }
  });

  it("keys are dotted and type-prefixed — the shape extraction can actually reach", () => {
    // The proposer prompt instructs dotted keys and the v1 matcher is
    // exact-key: a bare or differently-shaped key is SILENT forever.
    for (const t of lensMap) {
      const [prefix, slug] = t.ontologyKey.split(".");
      expect(slug, `key ${t.ontologyKey} is not dotted`).toBeTruthy();
      expect(prefix, `key ${t.ontologyKey} prefix must match its template type`).toBe(
        t.type.toLowerCase(),
      );
    }
  });

  it("key→type is one-to-one and keys are unique (update-in-place can never cross-type mutate)", () => {
    const byKey = new Map<string, LensTemplate>();
    for (const t of lensMap) {
      expect(byKey.has(t.ontologyKey), `duplicate key ${t.ontologyKey}`).toBe(false);
      byKey.set(t.ontologyKey, t);
    }
  });

  it("features are unique per system (the mapping is a function of the chart)", () => {
    const seen = new Set<string>();
    for (const t of lensMap) {
      const k = `${t.system}::${t.feature}`;
      expect(seen.has(k), `duplicate feature ${k}`).toBe(false);
      seen.add(k);
    }
  });

  it("D-R1 denylist: no key and no LABEL carries chart vocabulary", () => {
    for (const t of lensMap) {
      expect(CHART_TERMS.test(t.ontologyKey), `chart term in key ${t.ontologyKey}`).toBe(false);
      expect(CHART_TERMS.test(t.label), `chart term in label "${t.label}"`).toBe(false);
    }
  });

  it("phrasing rule 3: every label is hedged as hypothesis, never oracular", () => {
    for (const t of lensMap) {
      expect(/^May\b|might\b/i.test(t.label), `unhedged label "${t.label}"`).toBe(true);
      // Oracular = a verdict-form claim ("You are X", "You will X") — not the
      // words "you are" inside a relative clause ("a sense of who you are").
      expect(/^(You are|You will)\b/i.test(t.label), `oracular label "${t.label}"`).toBe(false);
    }
  });

  it("no WOUND, LENS, or BECOMING templates — lane ownership is absolute", () => {
    // WOUND: intake never opens wounds. LENS: deprecated-never-written type
    // (D-R4). BECOMING: enters through its own lane, never the lens lane.
    for (const t of lensMap) {
      expect(["WOUND", "LENS", "BECOMING"]).not.toContain(t.type as string);
    }
  });

  it("priorities are the ghost-budget's 1|2|3 and every tier is populated", () => {
    const tiers = new Set(lensMap.map((t) => t.priority));
    for (const t of lensMap) expect([1, 2, 3]).toContain(t.priority);
    expect(tiers).toEqual(new Set([1, 2, 3]));
  });

  it("systems are the v1 pair only", () => {
    for (const t of lensMap) {
      expect(["human_design", "western_natal"]).toContain(t.system);
    }
  });
});
