// §13.10/§13.11/§13.12 — parsing, partial validity, repair discipline,
// empty-in-empty-out honesty. Plus the proposer→gate integration canary
// (§13.5 verbatim round-trip through the real gate).

import { describe, expect, it } from "vitest";
import { runProposer } from "../proposer";
import { gate } from "../../citation-gate/gate";
import { sourceMap } from "../../citation-gate/__tests__/fixtures";
import {
  EMPTY_RESPONSE,
  NOW,
  input,
  selfSource,
  stubModel,
  validNodeResponse,
} from "./fixtures";

describe("partial validity (§13.10)", () => {
  it("one malformed candidate is rejected with a reason; valid siblings are salvaged", async () => {
    const response = JSON.stringify({
      nodes: [
        { tempId: "good1", type: "PATTERN", label: "Saying yes", evidence: [{ sourceEventId: "e1", quote: "saying yes when I want to say no" }] },
        { tempId: "bad", type: "PATTERN", label: 42, evidence: "not-an-array" }, // malformed
        { tempId: "good2", type: "TRAIT", label: "Persistence", evidence: [{ sourceEventId: "e1", quote: "I want" }] },
      ],
      edges: [],
    });
    const stub = stubModel(response);
    const result = await runProposer(input(), stub.call);
    expect(result.status).toBe("complete");
    expect(result.output.nodes.map((n) => n.tempId).sort()).toEqual(["good1", "good2"]);
    const bad = result.rejectedCandidates.find((r) => r.tempId === "bad");
    expect(bad).toBeTruthy();
    expect(bad!.reason.length).toBeGreaterThan(0);
  });

  it("evidence citing a source id outside the provided set is filtered; an extracted node left with none is rejected", async () => {
    const response = JSON.stringify({
      nodes: [
        {
          tempId: "n1",
          type: "BELIEF",
          label: "Some belief",
          evidence: [{ sourceEventId: "minted-by-model", quote: "whatever" }],
        },
      ],
      edges: [],
    });
    const stub = stubModel(response);
    const result = await runProposer(input(), stub.call);
    expect(result.output.nodes).toHaveLength(0);
    expect(result.rejectedCandidates[0].reason).toMatch(/evidence/i);
  });
});

describe("repair discipline (§13.11)", () => {
  it("an envelope failure triggers exactly one repair call; success on repair completes the run", async () => {
    const stub = stubModel("```json\nnot even json really", validNodeResponse());
    const result = await runProposer(input(), stub.call);
    expect(stub.calls).toHaveLength(2);
    expect(result.status).toBe("complete");
    expect(result.attempts).toBe(2);
    expect(result.output.nodes).toHaveLength(1);
    // The repair request tells the model what failed and demands JSON only.
    expect(stub.calls[1].user).toMatch(/failed validation|corrected JSON/i);
  });

  it("a second envelope failure fails the run closed: no proposals, status=error, retryable", async () => {
    const stub = stubModel("garbage one", "garbage two", validNodeResponse());
    const result = await runProposer(input(), stub.call);
    expect(stub.calls).toHaveLength(2); // never a third call
    expect(result.status).toBe("error");
    expect(result.output.nodes).toEqual([]);
    expect(result.output.edges).toEqual([]);
    expect(result.attempts).toBe(2);
  });

  it("semantic problems (missing evidence) are NEVER repaired — one call, candidate rejected", async () => {
    const response = JSON.stringify({
      nodes: [{ tempId: "n1", type: "BELIEF", label: "Thin claim", evidence: [] }],
      edges: [],
    });
    const stub = stubModel(response);
    const result = await runProposer(input(), stub.call);
    expect(stub.calls).toHaveLength(1); // no repair for semantic emptiness
    expect(result.status).toBe("complete");
    expect(result.output.nodes).toHaveLength(0);
    expect(result.rejectedCandidates[0].reason).toMatch(/evidence/i);
  });
});

describe("empty-in-empty-out honesty (§13.12)", () => {
  it("a flat entry yielding no candidates is a valid, complete run", async () => {
    const flat = input({ sources: [selfSource("e1", "Bought groceries. Watched TV. Slept early.")] });
    const stub = stubModel(EMPTY_RESPONSE);
    const result = await runProposer(flat, stub.call);
    expect(result.status).toBe("complete");
    expect(result.output.nodes).toEqual([]);
    expect(result.output.edges).toEqual([]);
  });
});

describe("run refusal (caps — never silent truncation)", () => {
  it("an oversized source refuses the run explicitly rather than truncating", async () => {
    const huge = input({ sources: [selfSource("e1", "word ".repeat(100_000))] });
    const stub = stubModel(EMPTY_RESPONSE);
    await expect(runProposer(huge, stub.call)).rejects.toThrow(/exceeds|cap|refus/i);
    expect(stub.calls).toHaveLength(0); // refused before any model call
  });
});

describe("proposer → gate integration canary (§13.5 verbatim round-trip)", () => {
  it("a stubbed proposer output with verbatim quotes passes the real citation gate end to end", async () => {
    const journal1 = selfSource("e1", "I keep saying yes when I want to say no.");
    const journal2 = selfSource("e2", "Again: I said yes when I wanted to say no.");
    const response = JSON.stringify({
      nodes: [
        {
          tempId: "n1",
          type: "PATTERN",
          label: "Saying yes when I mean no",
          evidence: [
            { sourceEventId: "e1", quote: "saying yes when I want to say no" },
            { sourceEventId: "e2", quote: "I said yes when I wanted to say no" },
          ],
        },
      ],
      edges: [],
    });
    const stub = stubModel(response);
    const run = await runProposer(input({ sources: [journal1, journal2] }), stub.call);
    expect(run.status).toBe("complete");

    // The wrapper's output flows into the gate on the SAME contract types.
    const gateResult = gate(
      run.output,
      sourceMap(journal1, journal2),
      { nodes: [], edges: [] },
      [],
      NOW,
    );
    expect(gateResult.acceptedNodes).toHaveLength(1);
    expect(gateResult.acceptedNodes[0].mass).toBeGreaterThan(0);
    expect(gateResult.rejected).toHaveLength(0);
  });
});
