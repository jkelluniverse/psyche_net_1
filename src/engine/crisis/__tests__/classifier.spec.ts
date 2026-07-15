// CRISIS CLASSIFIER — tests written before the module (tests-first).
//
// LAW 7's floor: crisis classification runs on EVERY inbound entry,
// unconditionally — never gated by mode, veil, or session timing (that
// wiring is the journal action's; these tests pin the classifier itself).
//
// Architecture under test:
// - The LEXICON is the deterministic floor: HARD terms → CRISIS with no
//   model in the loop; SOFT terms → the small model arbitrates.
// - FAIL-CLOSED where ambiguity exists: a SOFT hit whose model arbitration
//   FAILS resolves to CRISIS (we would rather surface resources to someone
//   who didn't need them than stay silent for someone who did).
// - DEGRADED, not silent: no lexicon signal + model unavailable → NONE with
//   degraded=true recorded — the deterministic floor still ran, and the
//   record says the second layer didn't.
// - NEVER ECHOES CONTENT: results carry term KEYS and levels, never the
//   person's words (results land in SourceEvent.signals — content there
//   would be a retention leak).
// - The fixture set is the classifier's own eval corpus; the
//   lexicon-deterministic subset is CI-enforced here, exactly.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CRISIS_CONFIG_V1 } from "../config";
import { classifyCrisis, type CrisisModelCall } from "../classifier";

const fixtures = JSON.parse(
  readFileSync(join(__dirname, "..", "__fixtures__", "crisis-eval.json"), "utf8"),
) as {
  cases: {
    id: string;
    text: string;
    expected: "NONE" | "CONCERN" | "CRISIS";
    /** true = the lexicon alone must decide this case (CI-enforced). */
    lexiconDeterministic: boolean;
  }[];
};

const modelSaying =
  (risk: "NONE" | "CONCERN" | "CRISIS"): CrisisModelCall =>
  async () =>
    JSON.stringify({ risk });
const failingModel: CrisisModelCall = async () => {
  throw new Error("model unavailable");
};

describe("crisis classifier — the LAW 7 floor", () => {
  it("HARD lexicon terms → CRISIS with NO model in the loop", async () => {
    let called = 0;
    const spyModel: CrisisModelCall = async () => {
      called++;
      return JSON.stringify({ risk: "NONE" }); // even a dissenting model cannot override
    };
    const r = await classifyCrisis(
      "I've been thinking about how I could kill myself.",
      spyModel,
      CRISIS_CONFIG_V1,
    );
    expect(r.level).toBe("CRISIS");
    expect(r.method).toBe("LEXICON");
    expect(called).toBe(0); // deterministic — the model was never consulted
    expect(r.degraded).toBe(false);
  });

  it("SOFT lexicon terms → the model arbitrates in both directions", async () => {
    const up = await classifyCrisis(
      "Everything feels hopeless and I can't go on like this.",
      modelSaying("CRISIS"),
      CRISIS_CONFIG_V1,
    );
    expect(up.level).toBe("CRISIS");
    expect(up.method).toBe("LEXICON+MODEL");

    const down = await classifyCrisis(
      "Work felt hopeless today, but journaling helps.",
      modelSaying("NONE"),
      CRISIS_CONFIG_V1,
    );
    expect(down.level).toBe("NONE");
    expect(down.method).toBe("LEXICON+MODEL");
  });

  it("FAIL-CLOSED: a SOFT hit with a failing model resolves to CRISIS", async () => {
    const r = await classifyCrisis(
      "I feel like such a burden to everyone around me.",
      failingModel,
      CRISIS_CONFIG_V1,
    );
    expect(r.level).toBe("CRISIS");
    expect(r.degraded).toBe(true); // and the record says why
  });

  it("unparseable model output is a model FAILURE (fail-closed on soft hits)", async () => {
    const garbage: CrisisModelCall = async () => "I think this person is fine tbh";
    const r = await classifyCrisis(
      "I just want to disappear for a while.",
      garbage,
      CRISIS_CONFIG_V1,
    );
    expect(r.level).toBe("CRISIS");
    expect(r.degraded).toBe(true);
  });

  it("no lexicon signal + model unavailable → NONE, degraded recorded (the floor still ran)", async () => {
    const r = await classifyCrisis(
      "Made pasta tonight and called my sister. Good day.",
      failingModel,
      CRISIS_CONFIG_V1,
    );
    expect(r.level).toBe("NONE");
    expect(r.degraded).toBe(true);
  });

  it("no lexicon signal + model screen can still raise CONCERN (non-lexical phrasing)", async () => {
    const r = await classifyCrisis(
      "Lately I've been giving away the things I care about, one by one.",
      modelSaying("CONCERN"),
      CRISIS_CONFIG_V1,
    );
    expect(r.level).toBe("CONCERN");
    expect(r.method).toBe("MODEL");
  });

  it("metaphor negatives never trip the HARD tier (lexicon precision)", async () => {
    for (const text of [
      "This deadline is absolutely killing me.",
      "I could murder a pizza right now.",
      "That workout destroyed me, I'm dead.",
    ]) {
      const r = await classifyCrisis(text, modelSaying("NONE"), CRISIS_CONFIG_V1);
      expect(r.level).toBe("NONE");
    }
  });

  it("NEVER echoes content: the result carries term keys and levels only", async () => {
    const text = "I've been thinking about how I could kill myself.";
    const r = await classifyCrisis(text, null, CRISIS_CONFIG_V1);
    const dump = JSON.stringify(r);
    expect(dump).not.toContain("thinking about");
    expect(dump).toContain(r.classifierVersion);
    expect(r.matchedTermKeys.length).toBeGreaterThan(0);
  });

  it("obfuscation-lite: casing, extra whitespace, and curly apostrophes still match", async () => {
    for (const text of [
      "I want to KILL   MYSELF",
      "i can’t go on", // curly apostrophe → soft tier (model arbitrates)
    ]) {
      const r = await classifyCrisis(text, failingModel, CRISIS_CONFIG_V1);
      expect(r.level).toBe("CRISIS"); // hard direct, or soft + fail-closed
    }
  });

  it("FIXTURE FLOOR (CI-enforced): every lexicon-deterministic case scores exactly", async () => {
    const deterministic = fixtures.cases.filter((c) => c.lexiconDeterministic);
    expect(deterministic.length).toBeGreaterThanOrEqual(10);
    for (const c of deterministic) {
      // No model: the lexicon alone must carry these.
      const r = await classifyCrisis(c.text, null, CRISIS_CONFIG_V1);
      expect(`${c.id}:${r.level}`).toBe(`${c.id}:${c.expected}`);
    }
  });

  it("config carries the resource copy — calm, never medical-claiming", () => {
    expect(CRISIS_CONFIG_V1.resources.headline.length).toBeGreaterThan(0);
    expect(CRISIS_CONFIG_V1.resources.lines.length).toBeGreaterThanOrEqual(2);
    const dump = JSON.stringify(CRISIS_CONFIG_V1.resources).toLowerCase();
    expect(dump).not.toContain("diagnos");
    expect(dump).not.toContain("treat");
  });
});
