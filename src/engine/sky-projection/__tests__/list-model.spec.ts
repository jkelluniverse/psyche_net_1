// LIST MODEL — tests written before the module (tests-first).
//
// The list view is the CANONICAL ACCESSIBLE SURFACE (spec §2, LAW 5: no
// information may exist only spatially or in motion). Its model is a pure
// function of the SAME (already-veiled) SkyViewModel the canvas renders —
// which is how the veil provably holds here (test 10 content parity):
// - CONTENT PARITY: every view-model node and edge appears exactly once;
//   labels are BYTE-EQUAL to the view model's (a veiled node's list entry is
//   the veil copy; the raw label cannot reappear because the list model never
//   sees it); nothing is added, nothing is dropped.
// - GROUPED by type then state, deterministically ordered.
// - Evidence reachability: each entry carries the evidence count and the
//   provenance/hypothesis copy the panel needs — nothing render-only.

import { describe, expect, it } from "vitest";
import { RENDERER_CONFIG_V1 } from "../renderer-config.v1";
import { skyProjection } from "../sky-projection";
import { listModel } from "../list-model";
import type { PersistedEdgeView, PersistedNodeView } from "../types";

const NOW = new Date("2026-07-14T12:00:00.000Z");

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
  effectiveEvidence: [
    {
      evidenceId: "ev-1",
      authorship: "SELF",
      spanStart: 0,
      spanEnd: 10,
      occurredAt: new Date("2026-07-10T00:00:00.000Z"),
      polarity: "SUPPORTING",
      conferring: true,
      normalizationVersion: "v1",
      invalidatedAt: null,
      sourceInvalidatedAt: null,
    },
  ],
  ...o,
});

const FIXTURE_NODES: PersistedNodeView[] = [
  node({ id: "n-p1", label: "pattern one" }),
  node({ id: "n-p2", label: "pattern two", state: "DORMANT" }),
  node({
    id: "n-ghost",
    label: "lens ghost",
    type: "TRAIT",
    provenance: "LENS",
    ontologyKey: "trait.steady-internal-drive",
    mass: 0,
    state: "HYPOTHESIS",
    confidence: 0.2,
    lensMapVersion: "v1-draft",
    effectiveEvidence: [],
  }),
  node({ id: "n-wound", label: "raw wound label", type: "WOUND" }),
];
const FIXTURE_EDGES: PersistedEdgeView[] = [
  {
    id: "e-1",
    sourceId: "n-p1",
    targetId: "n-ghost",
    type: "DRIVES",
    strength: 0.5,
    confidence: 0.7,
  },
  {
    id: "e-2",
    sourceId: "n-p2",
    targetId: "n-p1",
    type: "REINFORCES",
    strength: 0.3,
    confidence: 0.3,
  },
];

const vmOf = () =>
  skyProjection(
    FIXTURE_NODES,
    FIXTURE_EDGES,
    NOW,
    "seed",
    { role: "INDIVIDUAL" },
    RENDERER_CONFIG_V1,
  );

describe("listModel — content parity with the (veiled) view model", () => {
  it("every node appears exactly once, grouped by type then state", () => {
    const vm = vmOf();
    const list = listModel(vm);
    const listedIds = list.nodeGroups.flatMap((g) => g.entries.map((e) => e.id));
    expect([...listedIds].sort()).toEqual(vm.nodes.map((n) => n.id).sort());
    expect(new Set(listedIds).size).toBe(listedIds.length);
    for (const g of list.nodeGroups) {
      for (const e of g.entries) {
        const src = vm.nodes.find((n) => n.id === e.id)!;
        expect(g.type).toBe(src.type);
        expect(e.state).toBe(src.state);
      }
    }
  });

  it("labels are BYTE-EQUAL to the view model's — the veil holds by parity", () => {
    const vm = vmOf();
    const list = listModel(vm);
    for (const g of list.nodeGroups) {
      for (const e of g.entries) {
        const src = vm.nodes.find((n) => n.id === e.id)!;
        expect(e.label).toBe(src.label);
      }
    }
    // the raw wound label cannot appear anywhere in the list model
    expect(JSON.stringify(list)).not.toContain("raw wound label");
    expect(JSON.stringify(list)).toContain(RENDERER_CONFIG_V1.woundGate.veilCopy);
  });

  it("every edge appears exactly once with resolved endpoint labels", () => {
    const vm = vmOf();
    const list = listModel(vm);
    const ids = list.edgeGroups.flatMap((g) => g.entries.map((e) => e.id));
    expect([...ids].sort()).toEqual(vm.edges.map((e) => e.id).sort());
    const e1 = list.edgeGroups
      .flatMap((g) => g.entries)
      .find((e) => e.id === "e-1")!;
    // endpoint labels come from the SAME veiled view model
    expect(e1.sourceLabel).toBe(vm.nodes.find((n) => n.id === "n-p1")!.label);
    expect(e1.targetLabel).toBe(vm.nodes.find((n) => n.id === "n-ghost")!.label);
  });

  it("entries carry what the accessible surface needs: state, confidence band, evidence count, hypothesis/provenance copy, watermark", () => {
    const vm = vmOf();
    const list = listModel(vm);
    const ghost = list.nodeGroups
      .flatMap((g) => g.entries)
      .find((e) => e.id === "n-ghost")!;
    expect(ghost.hypothesisBadge).toBe(RENDERER_CONFIG_V1.ghost.badge);
    expect(ghost.provenanceCopy).toBe(RENDERER_CONFIG_V1.provenanceCopy.LENS);
    expect(ghost.evidenceCount).toBe(0);
    expect(ghost.confidenceBand).toBe("low");
    expect(ghost.label.endsWith(RENDERER_CONFIG_V1.draftWatermark.suffix)).toBe(true);
    const p1 = list.nodeGroups
      .flatMap((g) => g.entries)
      .find((e) => e.id === "n-p1")!;
    expect(p1.hypothesisBadge).toBeNull();
    expect(p1.evidenceCount).toBe(1);
  });

  it("deterministic: same view model → deep-equal list model; group order is fixed", () => {
    const vm = vmOf();
    expect(listModel(vm)).toEqual(listModel(vmOf()));
    const order = listModel(vm).nodeGroups.map((g) => `${g.type}/${g.state}`);
    expect(order).toEqual([...order].sort());
  });

  it("carries the fringe (LAW 5 — the list is never falsely complete either)", () => {
    const list = listModel(vmOf());
    expect(list.fringe.copy).toBe(RENDERER_CONFIG_V1.fringe.copy);
  });
});
