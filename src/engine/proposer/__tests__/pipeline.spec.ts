// THE PIPELINE TEST (round-2 checkpoint, D5's required addition).
//
// Round 1 proved why this file exists: gate test 14 stayed green while
// IGNITED became unreachable in the live pipeline, because the unit test fed
// the gate hand-crafted evidence and the wrapper sat between reality and the
// test. This suite runs RAW MODEL OUTPUT through the REAL wrapper and the
// REAL gate and asserts the product mechanic actually fires. Every future
// change to conferring semantics (role, polarity, inference distance) must
// keep this green.

import { describe, expect, it } from "vitest";
import { runProposer } from "../proposer";
import { gate } from "../../citation-gate/gate";
import { sourceMap } from "../../citation-gate/__tests__/fixtures";
import type { GraphSnapshot } from "../../contracts/extraction-contracts";
import { NOW, input, selfSource, stubModel } from "./fixtures";

const WISH = selfSource("e1", "Reminding myself: I want to stay calm under conflict.");
const ENACT_1 = selfSource("e2", "He yelled at me in the kitchen and I stayed calm the whole time.");
const ENACT_2 = selfSource("e3", "Stayed calm again today when the meeting fell apart.");

/** The becoming seed already on the person's sky (created by the becoming
 * lane, NOT by extraction — the wrapper's blinding filters it from context). */
const priorGraphWithBecoming = (): GraphSnapshot => ({
  nodes: [
    {
      id: "becoming-1",
      type: "BECOMING",
      provenance: "BECOMING",
      label: "Calm under conflict",
      state: "HYPOTHESIS",
      evidence: [
        {
          sourceEventId: "w0",
          quote: "I want to stay calm under conflict",
          spanStart: 0,
          spanEnd: 34,
          occurredAt: new Date("2026-06-01T12:00:00.000Z"),
          authorship: "SELF",
          role: "DECLARATION",
          polarity: "SUPPORTING",
          sourceInvalidatedAt: null,
        },
      ],
    },
  ],
  edges: [],
});

describe("end-to-end: raw model output → real wrapper → real gate", () => {
  it("D5 keystone: a DECLARATION plus two ENACTMENTs ignites the becoming node — through the whole pipeline", async () => {
    const modelOutput = JSON.stringify({
      nodes: [
        {
          tempId: "n1",
          type: "TRAIT",
          label: "Calm under conflict",
          evidence: [
            {
              sourceEventId: "e1",
              quote: "I want to stay calm under conflict",
              role: "DECLARATION",
            },
            { sourceEventId: "e2", quote: "I stayed calm", role: "ENACTMENT" },
            { sourceEventId: "e3", quote: "Stayed calm again", role: "ENACTMENT" },
          ],
        },
      ],
      edges: [],
    });
    const stub = stubModel(modelOutput);
    const run = await runProposer(input({ sources: [WISH, ENACT_1, ENACT_2] }), stub.call);
    expect(run.status).toBe("complete");
    // The wrapper preserved the role labels (A-1: pass-through)…
    expect(run.output.nodes[0].evidence.map((e) => e.role)).toEqual([
      "DECLARATION",
      "ENACTMENT",
      "ENACTMENT",
    ]);
    // …the blinding kept the becoming hypothesis out of the model's context…
    expect(run.serializedContext).not.toContain("becoming-1");
    expect(stub.calls[0].system + stub.calls[0].user).not.toMatch(/\bBECOMING\b/);

    // …and the gate's deterministic hypothesis-matcher (exact normalized
    // label) merges the independently-extracted evidence into the seed:
    const result = gate(
      run.output,
      sourceMap(WISH, ENACT_1, ENACT_2),
      priorGraphWithBecoming(),
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(1);
    const charged = result.acceptedNodes[0];
    expect(charged.existingNodeId).toBe("becoming-1");
    expect(charged.type).toBe("BECOMING"); // the target's identity wins
    expect(charged.mass).toBeGreaterThan(0); // enactments confer
    expect(charged.state).toBe("IGNITED"); // ≥2 ENACTMENT spans, ≥2 events
  });

  it("restating the wish through the whole pipeline never ignites (declarations confer nothing)", async () => {
    const modelOutput = JSON.stringify({
      nodes: [
        {
          tempId: "n1",
          type: "TRAIT",
          label: "Calm under conflict",
          evidence: [
            {
              sourceEventId: "e1",
              quote: "I want to stay calm under conflict",
              role: "DECLARATION",
            },
          ],
        },
      ],
      edges: [],
    });
    const stub = stubModel(modelOutput);
    const run = await runProposer(input({ sources: [WISH] }), stub.call);
    const result = gate(run.output, sourceMap(WISH), priorGraphWithBecoming(), [], NOW);
    expect(result.acceptedNodes).toHaveLength(1);
    expect(result.acceptedNodes[0].state).toBe("HYPOTHESIS"); // unmoved
    expect(result.acceptedNodes[0].mass).toBe(0);
  });

  it("a DECLARATION-labeled quote confers nothing on an ordinary extracted node either", async () => {
    const modelOutput = JSON.stringify({
      nodes: [
        {
          tempId: "n1",
          type: "TRAIT",
          label: "Wanting to be calm",
          evidence: [
            { sourceEventId: "e1", quote: "I want to stay calm under conflict", role: "DECLARATION" },
            { sourceEventId: "e2", quote: "I stayed calm", role: "DECLARATION" },
          ],
        },
      ],
      edges: [],
    });
    const stub = stubModel(modelOutput);
    const run = await runProposer(input({ sources: [WISH, ENACT_1] }), stub.call);
    const result = gate(run.output, sourceMap(WISH, ENACT_1), { nodes: [], edges: [] }, [], NOW);
    // Zero conferring evidence → below materialization → shadow, not a node.
    expect(result.acceptedNodes).toHaveLength(0);
    expect(result.shadowBuffer).toHaveLength(1);
  });
});
