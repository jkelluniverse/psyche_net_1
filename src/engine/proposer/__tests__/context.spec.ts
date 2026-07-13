// §13.1 — THE BLINDING KEYSTONE (context byte-identity).
// The serialized request must be byte-identical whether or not lens /
// becoming / practitioner hypotheses exist in surrounding state. Output
// equality is NOT the assertion (non-deterministic model ⇒ flaky test,
// wrong layer): the constructed CONTEXT is what blinding governs.

import { describe, expect, it } from "vitest";
import { buildBlindedContext, serializeExtractionContext } from "../context";
import { computeFenceNonce, renderSystemPrompt, renderUserMessage } from "../prompt";
import {
  EXTRACTED_PRIOR,
  HYPOTHESIS_PRIOR,
  input,
  selfSource,
} from "./fixtures";

describe("blinding keystone — context byte-identity (§13.1)", () => {
  it("the serialized context is byte-identical with and without adjacent hypotheses", () => {
    const withHypotheses = input({
      priorNodes: [...EXTRACTED_PRIOR, ...HYPOTHESIS_PRIOR],
    });
    const withoutHypotheses = input({ priorNodes: [...EXTRACTED_PRIOR] });

    const a = serializeExtractionContext(buildBlindedContext(withHypotheses));
    const b = serializeExtractionContext(buildBlindedContext(withoutHypotheses));
    expect(a).toBe(b); // byte-identity, not deep-equality
  });

  it("the rendered prompts are byte-identical with and without adjacent hypotheses", () => {
    const a = buildBlindedContext(input({ priorNodes: [...EXTRACTED_PRIOR, ...HYPOTHESIS_PRIOR] }));
    const b = buildBlindedContext(input({ priorNodes: [...EXTRACTED_PRIOR] }));
    const nonce = computeFenceNonce("run-1");
    expect(renderSystemPrompt(a)).toBe(renderSystemPrompt(b));
    expect(renderUserMessage(a, nonce)).toBe(renderUserMessage(b, nonce));
  });

  it("no hypothesis label, evidence text, or derived field ever appears in context or prompts", () => {
    const ctx = buildBlindedContext(
      input({ priorNodes: [...EXTRACTED_PRIOR, ...HYPOTHESIS_PRIOR] }),
    );
    const everything =
      serializeExtractionContext(ctx) +
      renderSystemPrompt(ctx) +
      renderUserMessage(ctx, computeFenceNonce("run-1"));
    expect(everything).not.toContain("SECRET_LENS_HYPOTHESIS");
    expect(everything).not.toContain("SECRET_BECOMING_SEED");
    expect(everything).not.toContain("SECRET_PRACTITIONER_NOTE");
    expect(everything).not.toContain("SECRET_EVIDENCE_TEXT");
    expect(everything).not.toContain('"mass"');
    expect(everything).not.toContain('"state"');
  });

  it("prior EXTRACTED nodes carry ONLY id/type/label/ontologyKey (no evidence, mass, state)", () => {
    const dirty = [
      {
        ...EXTRACTED_PRIOR[0],
        // runtime baggage that must be stripped structurally
        mass: 2.4,
        state: "ACTIVE",
        confidence: 0.7,
        evidence: [{ quote: "SECRET_EVIDENCE_TEXT" }],
      } as (typeof EXTRACTED_PRIOR)[0],
    ];
    const ctx = buildBlindedContext(input({ priorNodes: dirty }));
    const serialized = serializeExtractionContext(ctx);
    expect(serialized).toContain("I must carry everything alone"); // the label survives
    expect(serialized).not.toContain("SECRET_EVIDENCE_TEXT");
    expect(serialized).not.toContain('"mass"');
    expect(serialized).not.toContain('"confidence"');
  });

  it("property: forbidden fields structurally cannot serialize — extra keys throw", () => {
    const ctx = buildBlindedContext(input());
    // Tamper at every level; the serializer's allowlist must refuse each.
    const tampered = [
      { ...ctx, hypotheses: [{ label: "smuggled" }] },
      { ...ctx, sources: [{ ...ctx.sources[0], authorship: "SELF" }] },
      { ...ctx, priorExtractedNodes: [{ ...ctx.priorExtractedNodes[0], mass: 1 }] },
      { ...ctx, policy: { ...ctx.policy, practitionerRelationshipVerified: true } },
    ];
    for (const bad of tampered) {
      expect(() => serializeExtractionContext(bad as never)).toThrow();
    }
  });

  it("non-SELF sources are refused at the context boundary (never silently included)", () => {
    const practitionerNote = {
      ...selfSource("p1", "Client presents avoidance."),
      authorship: "PRACTITIONER" as const,
    };
    expect(() =>
      buildBlindedContext(input({ sources: [practitionerNote] })),
    ).toThrow(/SELF/);
  });

  it("determinism: same input → same bytes, twice", () => {
    const a = serializeExtractionContext(buildBlindedContext(input()));
    const b = serializeExtractionContext(buildBlindedContext(input()));
    expect(a).toBe(b);
  });
});
