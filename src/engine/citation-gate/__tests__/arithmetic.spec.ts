// Test 6 — mass property tests, plus confidence arithmetic (spec §6).
// Mass, confidence are PURE functions of the validated evidence set: no
// randomness, no model calls, every value explainable.

import { describe, expect, it } from "vitest";
import { computeMass, isConferring } from "../mass";
import { computeConfidence } from "../confidence";
import { GATE_CONFIG_V1 } from "../config";
import { NOW, daysAgo } from "./fixtures";
import type { EvidenceRecord } from "../../contracts/extraction-contracts";

function rec(daysOld: number, opts: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    sourceEventId: opts.sourceEventId ?? `e-${daysOld}-${Math.floor(daysOld)}`,
    quote: "q",
    spanStart: 0,
    spanEnd: 1,
    occurredAt: daysAgo(daysOld),
    authorship: "SELF",
    role: "SUPPORT",
    polarity: "SUPPORTING",
    sourceInvalidatedAt: null,
    ...opts,
  };
}

const cfg = GATE_CONFIG_V1;

describe("test 6 — mass properties", () => {
  it("monotonic non-decrease: adding evidence never decreases mass", () => {
    let prev = 0;
    const evidence: EvidenceRecord[] = [];
    for (let i = 0; i < 12; i++) {
      evidence.push(rec(i * 3, { sourceEventId: `e${i}` }));
      const m = computeMass(evidence, "BELIEF", NOW, cfg).value;
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it("two mentions outweigh one", () => {
    const one = computeMass([rec(2)], "BELIEF", NOW, cfg).value;
    const two = computeMass([rec(2, { sourceEventId: "a" }), rec(3, { sourceEventId: "b" })], "BELIEF", NOW, cfg).value;
    expect(two).toBeGreaterThan(one);
  });

  it("recency weighting: recent evidence outweighs old evidence", () => {
    const recent = computeMass([rec(1)], "BELIEF", NOW, cfg).value;
    const old = computeMass([rec(400)], "BELIEF", NOW, cfg).value;
    expect(recent).toBeGreaterThan(old);
  });

  it("log diminishing returns: marginal mass gain shrinks as evidence grows", () => {
    const massAt = (n: number) =>
      computeMass(
        Array.from({ length: n }, (_, i) => rec(1, { sourceEventId: `e${i}` })),
        "BELIEF",
        NOW,
        cfg,
      ).value;
    const gainEarly = massAt(2) - massAt(1);
    const gainLate = massAt(10) - massAt(9);
    expect(gainLate).toBeLessThan(gainEarly);
  });

  it("temporal honesty: a years-old-only node has low present mass", () => {
    const historical = computeMass(
      [rec(1100, { sourceEventId: "a" }), rec(1150, { sourceEventId: "b" })],
      "BELIEF",
      NOW,
      cfg,
    ).value;
    const current = computeMass(
      [rec(3, { sourceEventId: "a" }), rec(9, { sourceEventId: "b" })],
      "BELIEF",
      NOW,
      cfg,
    ).value;
    expect(historical).toBeLessThan(0.1);
    expect(historical).toBeLessThan(current);
  });

  it("invalidation-aware: invalidated sources contribute nothing", () => {
    const live = [rec(2, { sourceEventId: "a" }), rec(4, { sourceEventId: "b" })];
    const withInvalidated = [
      rec(2, { sourceEventId: "a" }),
      rec(4, { sourceEventId: "b", sourceInvalidatedAt: NOW }),
    ];
    expect(computeMass(withInvalidated, "BELIEF", NOW, cfg).value).toBeLessThan(
      computeMass(live, "BELIEF", NOW, cfg).value,
    );
    // Fully invalidated → mass exactly 0.
    expect(
      computeMass([rec(2, { sourceInvalidatedAt: NOW })], "BELIEF", NOW, cfg).value,
    ).toBe(0);
  });

  it("countervailing evidence never increases mass", () => {
    const base = [rec(2, { sourceEventId: "a" }), rec(4, { sourceEventId: "b" })];
    const withCounter = [...base, rec(1, { sourceEventId: "c", polarity: "COUNTERVAILING" })];
    expect(computeMass(withCounter, "BELIEF", NOW, cfg).value).toBeLessThanOrEqual(
      computeMass(base, "BELIEF", NOW, cfg).value,
    );
  });

  it("determinism: same evidence, same now → same mass", () => {
    const evidence = [rec(7, { sourceEventId: "a" }), rec(30, { sourceEventId: "b" })];
    expect(computeMass(evidence, "BELIEF", NOW, cfg)).toEqual(
      computeMass(evidence, "BELIEF", NOW, cfg),
    );
  });

  it("derivation is always attached: the value can explain itself", () => {
    const d = computeMass([rec(2)], "BELIEF", NOW, cfg);
    expect(d.derivation.algorithmVersion).toBe(cfg.massAlgorithmVersion);
    expect(d.derivation.conferringSupportingCount).toBe(1);
    expect(d.derivation.halfLifeDays).toBe(cfg.halfLifeDays);
  });
});

describe("conferring rule (§6 — role-aware, not authorship alone)", () => {
  it("practitioner authorship never confers", () => {
    expect(isConferring(rec(1, { authorship: "PRACTITIONER" }), "BELIEF")).toBe(false);
  });
  it("a BECOMING declaration never confers; enactment does", () => {
    expect(isConferring(rec(1, { role: "DECLARATION" }), "BECOMING")).toBe(false);
    expect(isConferring(rec(1, { role: "SUPPORT" }), "BECOMING")).toBe(false);
    expect(isConferring(rec(1, { role: "ENACTMENT" }), "BECOMING")).toBe(true);
  });
  it("D8 (v1.6): for non-BECOMING nodes, SUPPORT and ENACTMENT confer; DECLARATION never does", () => {
    expect(isConferring(rec(1, { role: "SUPPORT" }), "BELIEF")).toBe(true);
    // Lived behavior is the MOST evidential class — zero-conferring it was
    // the round-3 Critical (behavior-heavy journals silently starved).
    expect(isConferring(rec(1, { role: "ENACTMENT" }), "BELIEF")).toBe(true);
    expect(isConferring(rec(1, { role: "DECLARATION" }), "BELIEF")).toBe(false);
  });
  it("fail-closed at the boundary: an unknown role value never confers (allowlist, not denylist)", () => {
    const corrupted = rec(1, { role: "FUTURE_ROLE" as never });
    expect(isConferring(corrupted, "BELIEF")).toBe(false);
    expect(isConferring(corrupted, "BECOMING")).toBe(false);
  });
  it("an invalidated source never confers", () => {
    expect(isConferring(rec(1, { sourceInvalidatedAt: NOW }), "BELIEF")).toBe(false);
  });
});

describe("confidence (§6.3 — LAW 5: never null, unknown is an explicit low number)", () => {
  it("corroboration across distinct events raises confidence", () => {
    const one = computeConfidence(
      [rec(1, { sourceEventId: "a" }), rec(2, { sourceEventId: "a" })],
      { ontologyNovel: false },
      cfg,
    ).value;
    const two = computeConfidence(
      [rec(1, { sourceEventId: "a" }), rec(2, { sourceEventId: "b" })],
      { ontologyNovel: false },
      cfg,
    ).value;
    expect(two).toBeGreaterThan(one);
    expect(one).toBe(cfg.confidence.base); // 1 distinct source → base
  });

  it("countervailing evidence lowers confidence", () => {
    const clean = computeConfidence(
      [rec(1, { sourceEventId: "a" }), rec(2, { sourceEventId: "b" })],
      { ontologyNovel: false },
      cfg,
    ).value;
    const contested = computeConfidence(
      [
        rec(1, { sourceEventId: "a" }),
        rec(2, { sourceEventId: "b" }),
        rec(1, { sourceEventId: "c", polarity: "COUNTERVAILING" }),
      ],
      { ontologyNovel: false },
      cfg,
    ).value;
    expect(contested).toBeLessThan(clean);
  });

  it("a brand-new ontology key lowers confidence", () => {
    const evidence = [rec(1, { sourceEventId: "a" }), rec(2, { sourceEventId: "b" })];
    const known = computeConfidence(evidence, { ontologyNovel: false }, cfg).value;
    const novel = computeConfidence(evidence, { ontologyNovel: true }, cfg).value;
    expect(novel).toBeLessThan(known);
  });

  it("clamps to [0, 1] and is always a number", () => {
    const many = Array.from({ length: 20 }, (_, i) => rec(1, { sourceEventId: `e${i}` }));
    expect(computeConfidence(many, { ontologyNovel: false }, cfg).value).toBeLessThanOrEqual(1);
    const v = computeConfidence([], { ontologyNovel: true }, cfg).value;
    expect(v).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(v)).toBe(true);
  });
});
