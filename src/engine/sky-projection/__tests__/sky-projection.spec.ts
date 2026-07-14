// SKY PROJECTION — tests written before the module (tests-first).
//
// Spec §2's carriers, ghost-sky-milestone scope (tests 3/4/5/10/12 subsets):
// - PURITY (test 4): same explicit inputs → same view model; the projection
//   is caught red-handed if it touches Date.now()/Math.random(); input order
//   does not matter (canonical output ordering).
// - GHOST STYLING (test 3): HYPOTHESIS renders dashed-ring/desaturated with
//   the badge; mass 0 → minimum ghost radius; the DRAFT WATERMARK rides the
//   label whenever the authoring lens map is a draft (checkpoint rule: no
//   ghost label ships unmarked before Jacob's editorial blessing).
// - WOUND VEIL (test 10, projection layer): computed INTO the view model
//   from the viewer — a veiled entry carries the veil copy and NEVER the raw
//   label; INDIVIDUAL veiled always (fail-closed, no release carrier in v1);
//   PRACTITIONER visibility only with consent-derived woundConsent.
// - GRAMMAR SNAPSHOT (test 12): brightness recency (DORMANT dims, never
//   vanishes), confidence bands on nodes AND edges, fringe presence — one
//   canonical-view snapshot per rendererConfig version, checked in.
// - FIREWALL (tests 5/12): no coordinates anywhere in the view model
//   (type-level); ShadowCandidate[] is unrepresentable as input (type-level);
//   domain tables carry no coordinate columns (schema text assertion); the
//   projection never reads the persisted recency-glow column (source-text
//   assertion — the column's name must not appear in the module at all).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ShadowCandidate } from "@prisma/client";
import { RENDERER_CONFIG_V1 } from "../renderer-config.v1";
import { RENDERER_CONFIG_V2 } from "../renderer-config.v2";

// The deployed default. Grammar assertions run against it; the canonical
// snapshot test covers EVERY checked-in config version (spec §2).
const CONFIG = RENDERER_CONFIG_V2;
import { brightness } from "../brightness";
import { PROJECTION_VERSION, skyProjection } from "../sky-projection";
import type {
  EffectiveEvidenceView,
  PersistedEdgeView,
  PersistedNodeView,
  ViewerContext,
} from "../types";

const NOW = new Date("2026-07-14T12:00:00.000Z");
const SEED = "user-seed-42";
const INDIVIDUAL: ViewerContext = { role: "INDIVIDUAL" };
const PRACTITIONER: ViewerContext = { role: "PRACTITIONER", woundConsent: true };

const ev = (o: Partial<EffectiveEvidenceView> = {}): EffectiveEvidenceView => ({
  evidenceId: o.evidenceId ?? "ev-1",
  authorship: "SELF",
  spanStart: 0,
  spanEnd: 10,
  occurredAt: o.occurredAt ?? new Date("2026-07-10T00:00:00.000Z"),
  polarity: "SUPPORTING",
  conferring: true,
  normalizationVersion: "v1",
  invalidatedAt: null,
  sourceInvalidatedAt: null,
  ...o,
});

const node = (o: Partial<PersistedNodeView>): PersistedNodeView => ({
  id: o.id ?? "n-1",
  type: "PATTERN",
  provenance: "EXTRACTED",
  label: "test node",
  ontologyKey: null,
  mass: 1,
  confidence: 0.8,
  state: "ACTIVE",
  lensMapVersion: null,
  chartImportId: null,
  effectiveEvidence: [ev()],
  ...o,
});

const edge = (o: Partial<PersistedEdgeView>): PersistedEdgeView => ({
  id: o.id ?? "e-1",
  sourceId: "n-1",
  targetId: "n-2",
  type: "DRIVES",
  strength: 0.5,
  confidence: 0.7,
  ...o,
});

const project = (
  nodes: PersistedNodeView[],
  edges: PersistedEdgeView[] = [],
  viewer: ViewerContext = INDIVIDUAL,
) => skyProjection(nodes, edges, NOW, SEED, viewer, CONFIG);

describe("skyProjection — purity (test 4)", () => {
  const nodes = [
    node({ id: "b", label: "second" }),
    node({ id: "a", label: "first" }),
  ];
  const edges = [edge({ id: "e-1", sourceId: "a", targetId: "b" })];

  it("same inputs → deep-equal view model; input order does not matter", () => {
    const one = project(nodes, edges);
    const two = project([...nodes].reverse(), [...edges]);
    expect(two).toEqual(one);
    expect(one.nodes.map((n) => n.id)).toEqual(["a", "b"]); // canonical order
  });

  it("touches neither the clock nor randomness", () => {
    const realNow = Date.now;
    const realRandom = Math.random;
    Date.now = () => {
      throw new Error("skyProjection read the ambient clock");
    };
    Math.random = () => {
      throw new Error("skyProjection used randomness");
    };
    try {
      expect(() => project(nodes, edges)).not.toThrow();
    } finally {
      Date.now = realNow;
      Math.random = realRandom;
    }
  });

  it("stamps projectionVersion, rendererConfigVersion, seed, and the explicit now", () => {
    const vm = project(nodes, edges);
    expect(vm.projectionVersion).toBe(PROJECTION_VERSION);
    expect(vm.rendererConfigVersion).toBe(CONFIG.rendererConfigVersion);
    expect(vm.seed).toBe(SEED);
    expect(vm.now).toBe(NOW.toISOString());
  });
});

describe("ghost styling + draft watermark (test 3 + checkpoint rule)", () => {
  const ghost = node({
    id: "g-1",
    label: "Deep feeling needs safety",
    type: "PATTERN",
    provenance: "LENS",
    ontologyKey: "pattern.deep-feeling-needs-safety",
    mass: 0,
    state: "HYPOTHESIS",
    confidence: 0.2,
    lensMapVersion: "v1-draft",
    chartImportId: "ci-1",
    effectiveEvidence: [],
  });

  it("HYPOTHESIS renders ghost: dashed ring, badge, reduced saturation, minimum radius", () => {
    const vm = project([ghost]);
    const g = vm.nodes[0];
    expect(g.ghost).toEqual({
      dashedRing: true,
      badge: CONFIG.ghost.badge,
    });
    expect(g.saturation).toBe(CONFIG.ghost.saturation);
    expect(g.size).toBe(CONFIG.size.minRadius); // mass 0 floor
  });

  it("a draft lens map WATERMARKS the label — no unmarked ghost copy before the blessing", () => {
    const vm = project([ghost]);
    const g = vm.nodes[0];
    expect(g.draftWatermark).toBe(true);
    expect(g.label).toBe(
      `Deep feeling needs safety${CONFIG.draftWatermark.suffix}`,
    );
  });

  it("a blessed (non-draft) lens map does not watermark", () => {
    const vm = project([node({ ...ghost, lensMapVersion: "v1" })]);
    expect(vm.nodes[0].draftWatermark).toBe(false);
    expect(vm.nodes[0].label).toBe("Deep feeling needs safety");
  });

  it("an uncharged ghost shows the provenance copy instead of an evidence story", () => {
    const vm = project([ghost]);
    expect(vm.nodes[0].evidenceCount).toBe(0);
    expect(vm.nodes[0].provenanceCopy).toBe(
      CONFIG.provenanceCopy.LENS,
    );
    // an extracted node with evidence carries none
    const vm2 = project([node({ id: "x-1" })]);
    expect(vm2.nodes[0].provenanceCopy).toBeNull();
  });
});

describe("WOUND veil is a property of the projection (test 10)", () => {
  const wound = node({
    id: "w-1",
    label: "raw wound label that must never leak",
    type: "WOUND",
    confidence: 0.6,
  });

  it("INDIVIDUAL viewer: veiled-but-present — veil copy, never the raw label", () => {
    const vm = project([wound]);
    const w = vm.nodes[0];
    expect(w.veiled).toBe(true);
    expect(w.label).toBe(CONFIG.woundGate.veilCopy);
    expect(JSON.stringify(vm)).not.toContain("raw wound label");
  });

  it("PRACTITIONER with consent-derived woundConsent sees the raw label", () => {
    const vm = project([wound], [], PRACTITIONER);
    expect(vm.nodes[0].veiled).toBe(false);
    expect(vm.nodes[0].label).toBe("raw wound label that must never leak");
  });

  it("PRACTITIONER without woundConsent stays veiled (fail-closed)", () => {
    const vm = project([wound], [], { role: "PRACTITIONER", woundConsent: false });
    expect(vm.nodes[0].veiled).toBe(true);
    expect(vm.nodes[0].label).toBe(CONFIG.woundGate.veilCopy);
  });

  it("non-WOUND nodes are never veiled", () => {
    const vm = project([node({ id: "p-1", label: "visible pattern" })]);
    expect(vm.nodes[0].veiled).toBe(false);
    expect(vm.nodes[0].label).toBe("visible pattern");
  });
});

describe("brightness — named recency function (test 12 carriers)", () => {
  const cfg = CONFIG.brightness;

  it("zero evidence → floor; fresh evidence → 1; one half-life → half-ish", () => {
    expect(brightness([], NOW, cfg)).toBe(cfg.floor);
    expect(brightness([NOW], NOW, cfg)).toBe(1);
    const halfLifeAgo = new Date(
      NOW.getTime() - cfg.halfLifeDays * 86_400_000,
    );
    expect(brightness([halfLifeAgo], NOW, cfg)).toBeCloseTo(0.5, 5);
  });

  it("monotone: more recent newest evidence is never darker", () => {
    for (let d = 0; d < 400; d += 7) {
      const older = brightness(
        [new Date(NOW.getTime() - (d + 7) * 86_400_000)],
        NOW,
        cfg,
      );
      const newer = brightness(
        [new Date(NOW.getTime() - d * 86_400_000)],
        NOW,
        cfg,
      );
      expect(newer).toBeGreaterThanOrEqual(older);
      expect(older).toBeGreaterThanOrEqual(cfg.floor); // never vanishes
    }
  });

  it("INVALIDATED evidence is omitted from brightness (fail-closed, un-tell)", () => {
    const fresh = ev({ evidenceId: "ev-f", occurredAt: NOW });
    const invalidated = ev({
      evidenceId: "ev-i",
      occurredAt: NOW,
      sourceInvalidatedAt: new Date("2026-07-13T00:00:00.000Z"),
    });
    const stale = ev({
      evidenceId: "ev-s",
      occurredAt: new Date(NOW.getTime() - 365 * 86_400_000),
    });
    const bright = project([node({ id: "n-1", effectiveEvidence: [fresh] })]);
    const dark = project([
      node({ id: "n-1", effectiveEvidence: [invalidated, stale] }),
    ]);
    expect(dark.nodes[0].brightness).toBeLessThan(bright.nodes[0].brightness);
    expect(dark.nodes[0].evidenceCount).toBe(1); // the invalidated row isn't counted either
  });

  it("DORMANT dims, never vanishes", () => {
    const active = project([node({ id: "n-1", state: "ACTIVE" })]);
    const dormant = project([node({ id: "n-1", state: "DORMANT" })]);
    expect(dormant.nodes[0].brightness).toBeLessThan(active.nodes[0].brightness);
    expect(dormant.nodes[0].brightness).toBeGreaterThan(0);
  });
});

describe("grammar carriers: bands, edges, states, fringe (test 12)", () => {
  it("confidence maps to opacity with a floor, plus a band on nodes AND edges", () => {
    const vm = project(
      [
        node({ id: "lo", confidence: 0.1 }),
        node({ id: "hi", confidence: 0.95 }),
      ],
      [
        edge({ id: "e-lo", sourceId: "lo", targetId: "hi", confidence: 0.1 }),
        edge({ id: "e-hi", sourceId: "lo", targetId: "hi", confidence: 0.95 }),
      ],
    );
    const [hi, lo] = [vm.nodes.find((n) => n.id === "hi")!, vm.nodes.find((n) => n.id === "lo")!];
    expect(lo.opacity).toBeGreaterThanOrEqual(CONFIG.confidence.opacityFloor);
    expect(hi.opacity).toBeGreaterThan(lo.opacity);
    expect(lo.confidenceBand).toBe("low");
    expect(hi.confidenceBand).toBe("high");
    const [eLo, eHi] = [vm.edges.find((e) => e.id === "e-lo")!, vm.edges.find((e) => e.id === "e-hi")!];
    expect(eLo.dashed).toBe(true); // low-confidence edge treatment
    expect(eHi.dashed).toBe(false);
    expect(eHi.opacity).toBeGreaterThan(eLo.opacity);
  });

  it("CONTRADICTED is dimmed and struck — still present, never removed", () => {
    const vm = project([node({ id: "c-1", state: "CONTRADICTED" })]);
    expect(vm.nodes).toHaveLength(1);
    expect(vm.nodes[0].struck).toBe(true);
    expect(vm.nodes[0].dimmed).toBe(true);
  });

  it("the unexplored fringe is always present (LAW 5: never falsely complete)", () => {
    const vm = project([]);
    expect(vm.fringe).toEqual({
      copy: CONFIG.fringe.copy,
      treatment: CONFIG.fringe.treatment,
    });
  });

  // One canonical-view snapshot per checked-in config version (spec §2) —
  // tuning a constant means a new version AND a new snapshot, same edit.
  it.each([
    ["v1", RENDERER_CONFIG_V1],
    ["v2", RENDERER_CONFIG_V2],
  ])("canonical-view snapshot for rendererConfig %s (checked in per version)", (_v, cfg) => {
    const vm = skyProjection(
      [
        node({ id: "n-active", label: "active extracted" }),
        node({
          id: "n-ghost",
          label: "lens ghost",
          provenance: "LENS",
          type: "TRAIT",
          ontologyKey: "trait.steady-internal-drive",
          mass: 0,
          state: "HYPOTHESIS",
          confidence: 0.2,
          lensMapVersion: "v1-draft",
          effectiveEvidence: [],
        }),
        node({ id: "n-wound", label: "raw wound", type: "WOUND" }),
        node({ id: "n-contra", label: "contradicted", state: "CONTRADICTED" }),
        node({
          id: "n-dormant",
          label: "dormant",
          state: "DORMANT",
          effectiveEvidence: [
            ev({ occurredAt: new Date("2025-01-01T00:00:00.000Z") }),
          ],
        }),
      ],
      [edge({ id: "e-1", sourceId: "n-active", targetId: "n-ghost" })],
      NOW,
      SEED,
      INDIVIDUAL,
      cfg,
    );
    expect(vm).toMatchSnapshot();
  });

  it("v2 Tier-0 legibility: an all-ghost sky is clearly visible, still visibly ghost", () => {
    const ghost = node({
      id: "g-1",
      provenance: "LENS",
      mass: 0,
      state: "HYPOTHESIS",
      confidence: 0.2,
      lensMapVersion: "v1",
      effectiveEvidence: [],
    });
    const g = project([ghost]).nodes[0];
    // legible: none of the floors renders near-invisible
    expect(g.size).toBeGreaterThanOrEqual(9);
    expect(g.opacity).toBeGreaterThanOrEqual(0.6);
    expect(g.brightness).toBeGreaterThanOrEqual(0.4);
    // still a ghost: desaturated + dashed ring + badge, distinct from earned
    expect(g.saturation).toBeLessThan(1);
    expect(g.ghost).not.toBeNull();
    const earned = project([node({ id: "a-1" })]).nodes[0];
    expect(earned.saturation).toBe(1);
    expect(earned.ghost).toBeNull();
  });
});

describe("domain/rendering firewall (tests 5 + 12)", () => {
  it("the view model carries no coordinates (type-level)", () => {
    const vm = project([node({ id: "n-1" })]);
    // @ts-expect-error — no x on a view-model node; positions are the GPU's, never ours
    void vm.nodes[0].x;
    // @ts-expect-error — no y either
    void vm.nodes[0].y;
    expect("x" in vm.nodes[0]).toBe(false);
    expect("y" in vm.nodes[0]).toBe(false);
  });

  it("ShadowCandidate[] is unrepresentable as projection input (type-level)", () => {
    const shadows: ShadowCandidate[] = [];
    // @ts-expect-error — shadow-lane material is held, not shown; the type system enforces it
    const call = () => skyProjection(shadows, [], NOW, SEED, INDIVIDUAL, CONFIG);
    void call;
    expect(true).toBe(true);
  });

  it("domain tables carry no coordinate columns (schema text)", () => {
    const schema = readFileSync(
      join(__dirname, "..", "..", "..", "..", "prisma", "schema.prisma"),
      "utf8",
    );
    const nodeBlock = /model PsycheNode \{[\s\S]*?\n\}/.exec(schema)?.[0] ?? "";
    // Column DECLARATIONS are the violation; the schema's own comment about
    // migration 6 dropping them is the guard, not the crime.
    expect(nodeBlock).not.toMatch(/\n\s*x\s+Float/);
    expect(nodeBlock).not.toMatch(/\n\s*y\s+Float/);
    expect(nodeBlock).not.toMatch(/\n\s*colorHint\s+\w/);
  });

  it("the projection never reads the persisted recency-glow column (its name is absent from the module)", () => {
    // The column stays deferred per the schema's own guard; brightness is
    // computed here from effectiveEvidence. The module may not even utter
    // the column's name — not in code, not in comments.
    const dir = join(__dirname, "..");
    const sources = readdirSync(dir).filter((f) => f.endsWith(".ts"));
    for (const f of sources) {
      const text = readFileSync(join(dir, f), "utf8");
      expect(text.toLowerCase()).not.toContain("lumin" + "osity");
    }
  });
});
