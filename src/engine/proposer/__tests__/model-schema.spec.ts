// A-5 (round 2) — the model-facing schema is derived PER-POLICY: a schema
// derived naively from the canonical contract would re-leak LENS/BECOMING
// (and WOUND in solo) through the schema channel the prompt scrubs. Plus the
// C-3 reason-set disjointness property.

import { describe, expect, it } from "vitest";
import { buildModelOutputSchema } from "../model-schema";
import {
  GATE_REJECTION_REASONS,
  WRAPPER_REJECTION_REASONS,
} from "../../contracts/extraction-contracts";
import { practitionerPolicy, soloPolicy } from "./fixtures";

describe("model-facing schema (A-5) — derived per-policy, never from the raw contract", () => {
  it("the SOLO schema advertises exactly the allowed types — no WOUND, no LENS, no BECOMING, no provenance", () => {
    const text = JSON.stringify(buildModelOutputSchema(soloPolicy()));
    expect(text).not.toContain("WOUND");
    expect(text).not.toContain("LENS");
    expect(text).not.toContain("BECOMING");
    expect(text).not.toContain("provenance");
    for (const t of soloPolicy().allowedNodeTypes) expect(text).toContain(t);
  });

  it("the practitioner schema adds WOUND and still never mentions LENS/BECOMING/provenance", () => {
    const text = JSON.stringify(buildModelOutputSchema(practitionerPolicy()));
    expect(text).toContain("WOUND");
    expect(text).not.toContain("LENS");
    expect(text).not.toContain("BECOMING");
    expect(text).not.toContain("provenance");
  });

  it("the schema narrows WITH the policy (same derivation table as the prompt)", () => {
    const solo = JSON.stringify(buildModelOutputSchema(soloPolicy()));
    const prac = JSON.stringify(buildModelOutputSchema(practitionerPolicy()));
    expect(solo).not.toBe(prac);
  });
});

describe("wrapper/gate reason disjointness (C-3) — stage is recoverable from the reason alone", () => {
  it("the two reason sets share no member", () => {
    const overlap = GATE_REJECTION_REASONS.filter((r) =>
      (WRAPPER_REJECTION_REASONS as readonly string[]).includes(r),
    );
    expect(overlap).toEqual([]);
  });
});
