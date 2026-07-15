// D — HELD SHADOW THEMES IN THE BLINDED CONTEXT (failing-first; the ruling,
// 2026-07-15). Prompt v4.
//
// Canonical blinding analysis (Jacob): shadow candidates are the person's
// own extracted-lane echoes — the honest-edge already admits their earned
// graph; once-heard material is the same category, one step earlier. Not a
// hypothesis, no violation. But LABELS ONLY: no evidence, no counts, no
// dates — minimal surface — with the ruled instruction "reuse the exact
// label only if the theme genuinely recurs; never force a fit."
//
// The anchoring canary's deterministic half lives here (the prompt carries
// the never-force instruction; empty input renders an honest none-yet);
// the live half is scripts/anchoring-canary.ts, permanent in the eval set.

import { describe, expect, it } from "vitest";
import {
  buildBlindedContext,
  serializeExtractionContext,
} from "../context";
import { PROMPT_VERSION, renderSystemPrompt } from "../prompt";
import type { ProposerInput } from "../types";
import { SOLO_ALLOWED_NODE_TYPES } from "../config";

const baseInput = (heldShadowLabels?: string[]): ProposerInput => ({
  sources: [
    {
      id: "src-1",
      content: "Today I noticed the same heaviness again.",
      authorship: "SELF",
      occurredAt: new Date("2026-07-15T09:00:00.000Z"),
      invalidatedAt: null,
    },
  ],
  priorNodes: [],
  ontology: {
    ontologyVersion: "v2",
    nodeTypes: [{ type: "PATTERN", definition: "a recurring behavior the person reports" }],
    knownOntologyKeys: ["pattern.core"],
  },
  policy: {
    mode: "SOLO",
    allowedNodeTypes: [...SOLO_ALLOWED_NODE_TYPES],
    practitionerRelationshipVerified: false,
    userConsentVersion: "consent-test",
    consentScope: { betweenSessionExtraction: false },
    policyVersion: "policy-test",
  },
  runId: "run-held-shadow",
  ...(heldShadowLabels ? { heldShadowLabels } : {}),
});

describe("held shadow themes — labels only, into the blinded context (prompt v4)", () => {
  it("PROMPT_VERSION is v4 (identity ruling ships as one versioned change)", () => {
    expect(PROMPT_VERSION).toBe("v4");
  });

  it("labels flow into the context: trimmed, deduplicated, sorted — LABELS ONLY", () => {
    const ctx = buildBlindedContext(
      baseInput(["  Deriving worth from being needed ", "restless when not needed", "Deriving worth from being needed"]),
    );
    expect(ctx.heldShadowThemes).toEqual([
      "Deriving worth from being needed",
      "restless when not needed",
    ]);
    // Minimal surface: strings only — no counts, dates, or evidence anywhere.
    for (const t of ctx.heldShadowThemes) expect(typeof t).toBe("string");
  });

  it("absent input → empty list, never undefined (deterministic shape)", () => {
    const ctx = buildBlindedContext(baseInput());
    expect(ctx.heldShadowThemes).toEqual([]);
  });

  it("the serializer allowlists heldShadowThemes and stays byte-deterministic", () => {
    const a = serializeExtractionContext(buildBlindedContext(baseInput(["b", "a"])));
    const b = serializeExtractionContext(buildBlindedContext(baseInput(["a", "b"])));
    expect(a).toBe(b); // order of input labels is not meaning
    expect(a).toContain("heldShadowThemes");
    // The allowlist still bites on anything else.
    const ctx = buildBlindedContext(baseInput(["a"]));
    expect(() =>
      serializeExtractionContext({ ...ctx, massHint: 3 } as never),
    ).toThrow(/Blinding violation/);
  });

  it("the system prompt renders the themes with the RULED instruction, verbatim", () => {
    const prompt = renderSystemPrompt(buildBlindedContext(baseInput(["restless when not needed"])));
    expect(prompt).toContain("restless when not needed");
    expect(prompt.toLowerCase()).toContain(
      "reuse the exact label only if the theme genuinely recurs",
    );
    expect(prompt.toLowerCase()).toContain("never force a fit");
  });

  it("zero held themes renders an honest none-yet — no fabricated section", () => {
    const prompt = renderSystemPrompt(buildBlindedContext(baseInput()));
    expect(prompt).toContain("(none yet)");
    expect(prompt.toLowerCase()).toContain("never force a fit"); // the instruction is unconditional
  });

  it("v4 key guidance: known key when it fits, <type>.core otherwise, novel only when neither fits", () => {
    const prompt = renderSystemPrompt(buildBlindedContext(baseInput()));
    expect(prompt.toLowerCase()).toContain("closest known key");
    expect(prompt).toContain(".core");
  });
});
