// BACKFILL — one-time shadow-buffer re-key/merge under candidate identity v2
// (ruling #4, 2026-07-15: "re-key/merge the existing shadow buffer under the
// new identity rules, deterministically and audited — his live sky is the
// first beneficiary or the fix isn't real"). Failing-first per the
// evidence-semantics rule.
//
// The planner is PURE: rows in → plan out. The script (scripts/
// backfill-shadow-identity.ts) only loads rows, applies the plan, and writes
// the audit report. Everything evidence-semantic is tested here.

import { describe, expect, it } from "vitest";
import type { VerifiedEvidence } from "../../contracts/extraction-contracts";
import { GATE_CONFIG_V1 } from "../config";
import {
  planShadowBackfill,
  type ShadowRow,
} from "../backfill-identity";

const ev = (
  sourceEventId: string,
  spanStart: number,
  quote = "the same heaviness again",
): VerifiedEvidence => ({
  sourceEventId,
  quote,
  spanStart,
  spanEnd: spanStart + quote.length,
  occurredAt: new Date("2026-07-10T00:00:00.000Z"),
  authorship: "SELF",
  role: "SUPPORT",
  polarity: "SUPPORTING",
  conferring: true,
  normalizationVersion: "v1",
});

let rowSeq = 0;
const row = (over: Partial<ShadowRow> & { label: string }): ShadowRow => {
  const label = over.label;
  const cache = over.evidenceCache ?? [ev(`src-${++rowSeq}`, 10)];
  return {
    id: over.id ?? `row-${++rowSeq}`,
    candidateKey: over.candidateKey ?? `PATTERN::${label.toLowerCase()}`,
    kind: over.kind ?? "node",
    type: over.type ?? "PATTERN",
    label,
    ontologyKey: over.ontologyKey ?? null,
    provenance: over.provenance ?? "EXTRACTED",
    timesSeen: over.timesSeen ?? 1,
    distinctSources: over.distinctSources ?? new Set(cache.map((e) => e.sourceEventId)).size,
    waitingReason: over.waitingReason ?? "BELOW_MATERIALIZATION_THRESHOLD",
    inferenceDistance: over.inferenceDistance ?? null,
    createdAt: over.createdAt ?? new Date("2026-07-01T00:00:00.000Z"),
    lastSeen: over.lastSeen ?? new Date("2026-07-01T00:00:00.000Z"),
    evidenceCache: cache,
  };
};

describe("planShadowBackfill — identity v2 over the persisted buffer", () => {
  it("merges two rows sharing a SPECIFIC known vocabulary key (the July-15 embers case)", () => {
    const a = row({
      id: "a",
      label: "Deriving worth from being needed",
      ontologyKey: "pattern.emotional-wave",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      evidenceCache: [ev("src-1", 5), ev("src-1", 60)],
    });
    const b = row({
      id: "b",
      label: "I only matter when I am useful",
      ontologyKey: "pattern.emotional-wave",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      evidenceCache: [ev("src-2", 5)],
    });
    const plan = planShadowBackfill([a, b], GATE_CONFIG_V1);
    expect(plan.merges).toHaveLength(1);
    const m = plan.merges[0];
    expect(m.survivorId).toBe("a"); // earliest row survives
    expect(m.absorbedIds).toEqual(["b"]);
    expect(m.reason).toBe("SPECIFIC_KEY");
    // Rule 3: most spans names the node (a has 2, b has 1).
    expect(m.after.label).toBe("Deriving worth from being needed");
    expect(m.after.candidateKey).toBe("PATTERN::deriving worth from being needed");
    expect(m.after.timesSeen).toBe(2);
    expect(m.after.distinctSources).toBe(2); // src-1, src-2 from the merged cache
    expect(m.after.evidenceCache).toHaveLength(3);
  });

  it("rule 3 tie → earliest row's label wins", () => {
    const early = row({
      id: "early",
      label: "restless when not needed",
      ontologyKey: "pattern.emotional-wave",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      evidenceCache: [ev("src-1", 5)],
    });
    const late = row({
      id: "late",
      label: "cannot sit still unless useful",
      ontologyKey: "pattern.emotional-wave",
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      evidenceCache: [ev("src-2", 5)],
    });
    const plan = planShadowBackfill([late, early], GATE_CONFIG_V1);
    expect(plan.merges).toHaveLength(1);
    expect(plan.merges[0].after.label).toBe("restless when not needed");
  });

  it(".core keys merge only with label similarity AND evidence-disjointness", () => {
    const a = row({
      id: "a",
      label: "opens up only when safety comes first",
      ontologyKey: "pattern.core",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      evidenceCache: [ev("src-1", 5)],
    });
    const similar = row({
      id: "b",
      label: "only opens up when safety is first",
      ontologyKey: "pattern.core",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      evidenceCache: [ev("src-2", 5)],
    });
    const plan = planShadowBackfill([a, similar], GATE_CONFIG_V1);
    expect(plan.merges).toHaveLength(1);
    expect(plan.merges[0].reason).toBe("CORE_KEY_SIMILAR_DISJOINT");
  });

  it(".core + similar labels but SHARED source → no merge (same entry re-read, not recurrence)", () => {
    const a = row({
      id: "a",
      label: "opens up only when safety comes first",
      ontologyKey: "pattern.core",
      evidenceCache: [ev("src-1", 5)],
    });
    const sameSource = row({
      id: "b",
      label: "only opens up when safety is first",
      ontologyKey: "pattern.core",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      evidenceCache: [ev("src-1", 90)],
    });
    const plan = planShadowBackfill([a, sameSource], GATE_CONFIG_V1);
    expect(plan.merges).toHaveLength(0);
  });

  it(".core + disjoint sources but DISSIMILAR labels → no merge (the false-join negative)", () => {
    const a = row({
      id: "a",
      label: "I freeze when my father calls",
      ontologyKey: "belief.core",
      type: "BELIEF",
      evidenceCache: [ev("src-1", 5)],
    });
    const b = row({
      id: "b",
      label: "money feels like water through my hands",
      ontologyKey: "belief.core",
      type: "BELIEF",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      evidenceCache: [ev("src-2", 5)],
    });
    const plan = planShadowBackfill([a, b], GATE_CONFIG_V1);
    expect(plan.merges).toHaveLength(0);
  });

  it("novel (unknown) keys never merge on key alone", () => {
    const a = row({
      id: "a",
      label: "worth through usefulness",
      ontologyKey: "pattern.worth-through-usefulness-x",
      evidenceCache: [ev("src-1", 5)],
    });
    const b = row({
      id: "b",
      label: "value earned by being needed",
      ontologyKey: "pattern.worth-through-usefulness-x",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      evidenceCache: [ev("src-2", 5)],
    });
    const plan = planShadowBackfill([a, b], GATE_CONFIG_V1);
    expect(plan.merges).toHaveLength(0);
  });

  it("type mismatch never merges, even on the same specific key", () => {
    const a = row({
      id: "a",
      label: "the wave takes days",
      type: "PATTERN",
      ontologyKey: "pattern.emotional-wave",
      evidenceCache: [ev("src-1", 5)],
    });
    const b = row({
      id: "b",
      label: "waves of feeling",
      type: "TRAIT",
      ontologyKey: "pattern.emotional-wave",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      evidenceCache: [ev("src-2", 5)],
    });
    const plan = planShadowBackfill([a, b], GATE_CONFIG_V1);
    expect(plan.merges).toHaveLength(0);
  });

  it("EXACT label key match merges regardless of ontology key (typography drift)", () => {
    const a = row({
      id: "a",
      label: "Deriving worth from being needed",
      ontologyKey: "pattern.worth-novel-1",
      evidenceCache: [ev("src-1", 5)],
    });
    const b = row({
      id: "b",
      // Curly apostrophe-free variant differing only in case/whitespace →
      // same normalized label key.
      label: "  deriving worth from being needed ",
      candidateKey: "PATTERN::deriving worth from being needed  (drifted)",
      ontologyKey: "pattern.worth-novel-2",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      evidenceCache: [ev("src-2", 5)],
    });
    const plan = planShadowBackfill([a, b], GATE_CONFIG_V1);
    expect(plan.merges).toHaveLength(1);
    expect(plan.merges[0].reason).toBe("EXACT_LABEL_KEY");
  });

  it("is deterministic: shuffled input order yields the identical plan", () => {
    const rows = [
      row({ id: "a", label: "one", ontologyKey: "pattern.emotional-wave", createdAt: new Date("2026-07-01T00:00:00.000Z"), evidenceCache: [ev("s1", 1)] }),
      row({ id: "b", label: "two", ontologyKey: "pattern.emotional-wave", createdAt: new Date("2026-07-02T00:00:00.000Z"), evidenceCache: [ev("s2", 1)] }),
      row({ id: "c", label: "three", ontologyKey: "pattern.emotional-wave", createdAt: new Date("2026-07-03T00:00:00.000Z"), evidenceCache: [ev("s3", 1), ev("s4", 1)] }),
    ];
    const p1 = planShadowBackfill(rows, GATE_CONFIG_V1);
    const p2 = planShadowBackfill([rows[2], rows[0], rows[1]], GATE_CONFIG_V1);
    expect(JSON.stringify(p2)).toBe(JSON.stringify(p1));
    // All three share the specific key → one cluster; rule 3: c has most spans.
    expect(p1.merges).toHaveLength(1);
    expect(p1.merges[0].survivorId).toBe("a");
    expect(p1.merges[0].absorbedIds).toEqual(["b", "c"]);
    expect(p1.merges[0].after.label).toBe("three");
    expect(p1.merges[0].after.timesSeen).toBe(3);
  });

  it("merged evidence is deduplicated; inference distance takes the lowest seen; lastSeen the max", () => {
    const shared = ev("src-1", 5);
    const a = row({
      id: "a",
      label: "the wave takes days",
      ontologyKey: "pattern.emotional-wave",
      inferenceDistance: "HIGH_INFERENCE_INTERPRETATION",
      waitingReason: "HELD_HIGH_INFERENCE",
      evidenceCache: [shared],
      lastSeen: new Date("2026-07-01T00:00:00.000Z"),
    });
    const b = row({
      id: "b",
      label: "feelings arrive in waves",
      ontologyKey: "pattern.emotional-wave",
      inferenceDistance: "LOW_INFERENCE_PATTERN",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      lastSeen: new Date("2026-07-05T00:00:00.000Z"),
      evidenceCache: [{ ...shared }, ev("src-2", 5)],
    });
    const plan = planShadowBackfill([a, b], GATE_CONFIG_V1);
    const after = plan.merges[0].after;
    expect(after.evidenceCache).toHaveLength(2); // shared span counted once
    expect(after.inferenceDistance).toBe("LOW_INFERENCE_PATTERN"); // lower releases the hold
    expect(after.waitingReason).toBe("BELOW_MATERIALIZATION_THRESHOLD");
    expect(after.lastSeen.toISOString()).toBe("2026-07-05T00:00:00.000Z");
  });

  it("flags (report-only) a merged cluster that now meets the materialization threshold", () => {
    const a = row({
      id: "a",
      label: "worth from being needed",
      ontologyKey: "pattern.emotional-wave",
      evidenceCache: [ev("src-1", 5)],
    });
    const b = row({
      id: "b",
      label: "needed means worthy",
      ontologyKey: "pattern.emotional-wave",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      evidenceCache: [ev("src-2", 5)],
    });
    const plan = planShadowBackfill([a, b], GATE_CONFIG_V1);
    // 2 conferring supporting spans across 2 distinct sources = the threshold —
    // but the backfill NEVER materializes; the gate does, on the next pass.
    expect(plan.merges[0].after.meetsThresholdNow).toBe(true);
  });

  it("re-keys a singleton whose stored key drifted from matchKey(type, label)", () => {
    const drifted = row({
      id: "a",
      label: "Deriving worth from being needed",
      candidateKey: "PATTERN::deriving worth from being needed’s", // stored ≠ derived
      ontologyKey: null,
      evidenceCache: [ev("src-1", 5)],
    });
    const plan = planShadowBackfill([drifted], GATE_CONFIG_V1);
    expect(plan.merges).toHaveLength(0);
    expect(plan.rekeys).toEqual([
      {
        id: "a",
        from: "PATTERN::deriving worth from being needed’s",
        to: "PATTERN::deriving worth from being needed",
      },
    ]);
  });

  it("edge-kind rows are untouched (the ruling scopes identity v2 to the node shadow join)", () => {
    const edge: ShadowRow = {
      id: "e1",
      candidateKey: "EDGE::DRIVES::a=>b",
      kind: "edge",
      type: null,
      label: null,
      ontologyKey: null,
      provenance: "EXTRACTED",
      timesSeen: 1,
      distinctSources: 1,
      waitingReason: "WAITING_ENDPOINT",
      inferenceDistance: null,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      lastSeen: new Date("2026-07-01T00:00:00.000Z"),
      evidenceCache: [ev("src-1", 5)],
    };
    const plan = planShadowBackfill([edge], GATE_CONFIG_V1);
    expect(plan.merges).toHaveLength(0);
    expect(plan.rekeys).toHaveLength(0);
    expect(plan.edgesSkipped).toBe(1);
  });

  it("stamps the versions that authorize it (auditability invariant)", () => {
    const plan = planShadowBackfill([], GATE_CONFIG_V1);
    expect(plan.identityVersion).toBe("v2");
    expect(plan.gateVersion).toBe("v1.8");
    expect(plan.untouched).toBe(0);
  });
});
