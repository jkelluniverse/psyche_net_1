// Test 8 — the state machine (spec §6.4). nextState is a pure function of
// (prev, evidence set, now): each documented transition fires on the right
// evidence delta and nowhere else.

import { describe, expect, it } from "vitest";
import { nextState } from "../state";
import { GATE_CONFIG_V1, type GateConfig } from "../config";
import { NOW, daysAgo } from "./fixtures";
import type { EvidenceRecord, NodeState, NodeType, Provenance } from "../../contracts/extraction-contracts";

const cfg = GATE_CONFIG_V1;

function rec(
  daysOld: number,
  opts: Partial<EvidenceRecord> & { id?: string } = {},
): EvidenceRecord {
  const { id, ...rest } = opts;
  return {
    sourceEventId: id ?? `e-${daysOld}`,
    quote: "q",
    spanStart: 0,
    spanEnd: 1,
    occurredAt: daysAgo(daysOld),
    authorship: "SELF",
    role: "SUPPORT",
    polarity: "SUPPORTING",
    sourceInvalidatedAt: null,
    ...rest,
  };
}

function next(
  prev: NodeState,
  evidence: EvidenceRecord[],
  opts: { type?: NodeType; provenance?: Provenance; config?: GateConfig } = {},
) {
  return nextState(
    prev,
    evidence,
    {
      nodeType: opts.type ?? "BELIEF",
      provenance: opts.provenance ?? "EXTRACTED",
    },
    NOW,
    opts.config ?? cfg,
  );
}

const supporting = (n: number, startDay = 1) =>
  Array.from({ length: n }, (_, i) => rec(startDay + i, { id: `s${i}` }));
const countervailing = (n: number, startDay = 1) =>
  Array.from({ length: n }, (_, i) =>
    rec(startDay + i, { id: `c${i}`, polarity: "COUNTERVAILING" }),
  );

describe("test 8 — state machine transitions", () => {
  it("HYPOTHESIS → ACTIVE when conferring evidence clears the materialization threshold", () => {
    expect(next("HYPOTHESIS", supporting(2)).state).toBe("ACTIVE");
  });

  it("HYPOTHESIS stays HYPOTHESIS below the threshold (single mention, single source)", () => {
    expect(next("HYPOTHESIS", supporting(1)).state).toBe("HYPOTHESIS");
    // two spans, one source — recurrence requires distinct events
    expect(
      next("HYPOTHESIS", [rec(1, { id: "same" }), rec(2, { id: "same" })]).state,
    ).toBe("HYPOTHESIS");
  });

  it("HYPOTHESIS(lens) → CONTRADICTED when corroborated countervailing evidence opposes it", () => {
    expect(
      next("HYPOTHESIS", countervailing(2), { type: "LENS", provenance: "LENS" }).state,
    ).toBe("CONTRADICTED");
  });

  it("BECOMING → IGNITED only at the (stricter) ignition threshold, only via ENACTMENT", () => {
    const enactments = (n: number) =>
      Array.from({ length: n }, (_, i) => rec(i + 1, { id: `a${i}`, role: "ENACTMENT" }));
    const declarations = (n: number) =>
      Array.from({ length: n }, (_, i) => rec(i + 1, { id: `d${i}`, role: "DECLARATION" }));

    // v1.3 deterministic ignition threshold: >=2 ENACTMENT spans, >=2 events.
    expect(next("HYPOTHESIS", enactments(3), { type: "BECOMING", provenance: "BECOMING" }).state).toBe("IGNITED");
    expect(next("HYPOTHESIS", enactments(2), { type: "BECOMING", provenance: "BECOMING" }).state).toBe("IGNITED");
    // A SINGLE enactment — even a mislabeled one — can never fire ignition.
    expect(next("HYPOTHESIS", enactments(1), { type: "BECOMING", provenance: "BECOMING" }).state).toBe("HYPOTHESIS");
    // Two spans from ONE event is not recurrence.
    expect(
      next(
        "HYPOTHESIS",
        [rec(1, { id: "same", role: "ENACTMENT" }), rec(2, { id: "same", role: "ENACTMENT" })],
        { type: "BECOMING", provenance: "BECOMING" },
      ).state,
    ).toBe("HYPOTHESIS");
    // Declarations NEVER ignite, no matter how many (§6 conferring rule).
    expect(next("HYPOTHESIS", declarations(8), { type: "BECOMING", provenance: "BECOMING" }).state).toBe("HYPOTHESIS");
    // A becoming seed never takes the generic ACTIVE shortcut.
    expect(next("HYPOTHESIS", declarations(8), { type: "BECOMING", provenance: "BECOMING" }).state).not.toBe("ACTIVE");
  });

  it("ACTIVE → QUESTIONED on countervailing evidence (supervised mode)", () => {
    expect(next("ACTIVE", [...supporting(3), ...countervailing(1)]).state).toBe("QUESTIONED");
  });

  it("ACTIVE stays ACTIVE with only supporting evidence", () => {
    expect(next("ACTIVE", supporting(5)).state).toBe("ACTIVE");
  });

  it("QUESTIONED → LOOSENING as countervailing accumulates", () => {
    expect(next("QUESTIONED", [...supporting(3), ...countervailing(3)]).state).toBe("LOOSENING");
  });

  it("LOOSENING → TRANSMUTATION_CANDIDATE along the change arc", () => {
    expect(next("LOOSENING", [...supporting(3), ...countervailing(5)]).state).toBe(
      "TRANSMUTATION_CANDIDATE",
    );
  });

  it("TRANSMUTATION_CANDIDATE → INTEGRATED only when the old weight has actually faded", () => {
    // Supporting evidence is years old (present mass ≈ 0); countervailing is rich.
    const faded = [...supporting(3, 1000), ...countervailing(5)];
    expect(next("TRANSMUTATION_CANDIDATE", faded).state).toBe("INTEGRATED");
    // Supporting evidence still fresh and heavy → not integrated yet.
    const stillHeavy = [...supporting(4, 1), ...countervailing(5)];
    expect(next("TRANSMUTATION_CANDIDATE", stillHeavy).state).not.toBe("INTEGRATED");
  });

  it("the arc never runs backwards (LOOSENING does not return to QUESTIONED)", () => {
    expect(next("LOOSENING", [...supporting(3), ...countervailing(1)]).state).toBe("LOOSENING");
  });

  it("any mass-bearing state → DORMANT when present mass falls below the floor with substantial history", () => {
    const historical = supporting(3, 900); // documented then, quiet now
    expect(next("ACTIVE", historical).state).toBe("DORMANT");
    expect(next("QUESTIONED", historical).state).toBe("DORMANT");
  });

  it("DORMANT wakes when fresh conferring evidence returns", () => {
    const revived = [...supporting(3, 900), ...supporting(2, 1).map((r, i) => ({ ...r, sourceEventId: `new${i}` }))];
    expect(next("DORMANT", revived).state).toBe("ACTIVE");
  });

  it("HYPOTHESIS never goes dormant (nothing was ever documented)", () => {
    expect(next("HYPOTHESIS", []).state).toBe("HYPOTHESIS");
  });

  it("INTEGRATED and CONTRADICTED are terminal in v1", () => {
    expect(next("INTEGRATED", [...supporting(5), ...countervailing(5)]).state).toBe("INTEGRATED");
    expect(next("CONTRADICTED", supporting(5), { type: "LENS", provenance: "LENS" }).state).toBe(
      "CONTRADICTED",
    );
  });

  it("purity: same inputs → same output, with a derivation that names the rule", () => {
    const evidence = [...supporting(3), ...countervailing(1)];
    const a = next("ACTIVE", evidence);
    const b = next("ACTIVE", evidence);
    expect(a).toEqual(b);
    expect(a.derivation.rule.length).toBeGreaterThan(0);
    expect(a.derivation.algorithmVersion).toBe(cfg.stateAlgorithmVersion);
  });

  it("solo mode requires corroboration for interpretation-dependent transitions (§1.1)", () => {
    const solo: GateConfig = { ...cfg, mode: "SOLO" };
    expect(
      next("ACTIVE", [...supporting(3), ...countervailing(1)], { config: solo }).state,
    ).toBe("ACTIVE");
    expect(
      next("ACTIVE", [...supporting(3), ...countervailing(2)], { config: solo }).state,
    ).toBe("QUESTIONED");
  });
});
