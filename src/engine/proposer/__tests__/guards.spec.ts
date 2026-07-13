// §13.3/§13.4/§13.9 — structural policy guards: the wrapper enforces what
// the prompt merely requests.

import { describe, expect, it } from "vitest";
import { buildBlindedContext } from "../context";
import { renderSystemPrompt } from "../prompt";
import { runProposer } from "../proposer";
import { assertPolicyCoherent } from "../policy";
import {
  input,
  practitionerPolicy,
  selfSource,
  soloPolicy,
  stubModel,
} from "./fixtures";

const woundResponse = JSON.stringify({
  nodes: [
    {
      tempId: "w1",
      type: "WOUND",
      label: "Abandonment hurt",
      evidence: [{ sourceEventId: "e1", quote: "saying yes" }],
    },
    {
      tempId: "p1",
      type: "PATTERN",
      label: "Saying yes when I mean no",
      evidence: [{ sourceEventId: "e1", quote: "saying yes when I want to say no" }],
    },
  ],
  edges: [],
});

describe("structural wound-gate (§13.3)", () => {
  it("a WOUND proposal in SOLO mode is dropped by code, regardless of model behavior", async () => {
    const stub = stubModel(woundResponse);
    const result = await runProposer(input({ policy: soloPolicy() }), stub.call);
    expect(result.output.nodes.map((n) => n.tempId)).toEqual(["p1"]); // sibling salvaged
    expect(
      result.dropped.find((d) => d.tempId === "w1")?.reason,
    ).toBe("NODE_TYPE_NOT_ALLOWED_BY_POLICY");
  });

  it("the same WOUND proposal survives in verified practitioner-supported mode", async () => {
    const stub = stubModel(woundResponse);
    const result = await runProposer(input({ policy: practitionerPolicy() }), stub.call);
    expect(result.output.nodes.map((n) => n.tempId).sort()).toEqual(["p1", "w1"]);
  });

  it("behavioral: the SOLO system prompt never lists WOUND; practitioner mode does; LENS/BECOMING never appear", () => {
    const solo = renderSystemPrompt(buildBlindedContext(input({ policy: soloPolicy() })));
    const prac = renderSystemPrompt(buildBlindedContext(input({ policy: practitionerPolicy() })));
    expect(solo).not.toMatch(/\bWOUND\b/);
    expect(prac).toMatch(/\bWOUND\b/);
    for (const prompt of [solo, prac]) {
      expect(prompt).not.toMatch(/\bLENS\b/);
      expect(prompt).not.toMatch(/\bBECOMING\b/);
    }
  });
});

describe("policy provenance + closed enum (§13.4)", () => {
  it("provenance is stamped EXTRACTED by the wrapper; the model's provenance field is ignored", async () => {
    const response = JSON.stringify({
      nodes: [
        {
          tempId: "n1",
          type: "BELIEF",
          provenance: "LENS", // model tries to choose — ignored
          label: "Some belief",
          evidence: [{ sourceEventId: "e1", quote: "saying yes" }],
        },
      ],
      edges: [],
    });
    const stub = stubModel(response);
    const result = await runProposer(input(), stub.call);
    expect(result.output.nodes[0].provenance).toBe("EXTRACTED");
  });

  it("a model-emitted unknown/forbidden structural type fails the closed-enum check per candidate", async () => {
    const response = JSON.stringify({
      nodes: [
        { tempId: "bad1", type: "LENS", label: "X", evidence: [{ sourceEventId: "e1", quote: "yes" }] },
        { tempId: "bad2", type: "CHAKRA_BLOCKAGE", label: "Y", evidence: [{ sourceEventId: "e1", quote: "yes" }] },
        { tempId: "ok", type: "TRAIT", label: "Persistence", evidence: [{ sourceEventId: "e1", quote: "saying yes when I want to say no" }] },
      ],
      edges: [],
    });
    const stub = stubModel(response);
    const result = await runProposer(input(), stub.call);
    expect(result.output.nodes.map((n) => n.tempId)).toEqual(["ok"]);
    expect(result.rejectedCandidates.map((r) => r.tempId).sort()).toEqual(["bad1", "bad2"]);
  });

  it("an unknown ontologyKey is allowed and logged as an ontology candidate (log-only in v1)", async () => {
    const response = JSON.stringify({
      nodes: [
        {
          tempId: "n1",
          type: "BELIEF",
          label: "Some belief",
          ontologyKey: "belief.brand-new-subtype",
          evidence: [{ sourceEventId: "e1", quote: "saying yes" }],
        },
      ],
      edges: [],
    });
    const stub = stubModel(response);
    const result = await runProposer(input(), stub.call);
    expect(result.output.nodes).toHaveLength(1);
    expect(result.ontologyCandidates).toEqual([
      { tempId: "n1", ontologyKey: "belief.brand-new-subtype" },
    ]);
  });
});

describe("edge-ref guard (NodeRef resolution)", () => {
  const edgeResponse = JSON.stringify({
    nodes: [
      {
        tempId: "n1",
        type: "PATTERN",
        label: "Saying yes",
        evidence: [{ sourceEventId: "e1", quote: "saying yes when I want to say no" }],
      },
    ],
    edges: [
      {
        tempId: "g1",
        source: { kind: "PROPOSED", tempId: "n1" },
        target: { kind: "EXISTING", nodeId: "node-extracted-1" },
        type: "REINFORCES",
        evidence: [],
      },
      {
        tempId: "g2",
        source: { kind: "PROPOSED", tempId: "ghost" }, // dangling
        target: { kind: "PROPOSED", tempId: "n1" },
        type: "DRIVES",
        evidence: [],
      },
      {
        tempId: "g3",
        source: { kind: "EXISTING", nodeId: "not-a-real-node" }, // outside provided set
        target: { kind: "PROPOSED", tempId: "n1" },
        type: "DRIVES",
        evidence: [],
      },
    ],
  });

  it("verifies NodeRef resolvability and carries the discriminated refs END-TO-END (D3); drops dangling/unknown refs", async () => {
    const stub = stubModel(edgeResponse);
    const result = await runProposer(input(), stub.call);
    expect(result.output.edges).toHaveLength(1);
    expect(result.output.edges[0]).toMatchObject({
      tempId: "g1",
      source: { kind: "PROPOSED", tempId: "n1" },
      target: { kind: "EXISTING", nodeId: "node-extracted-1" },
      type: "REINFORCES",
    });
    const droppedEdges = result.dropped.filter((d) => d.kind === "edge");
    expect(droppedEdges.map((d) => d.tempId).sort()).toEqual(["g2", "g3"]);
    expect(droppedEdges.every((d) => d.reason === "DANGLING_EDGE_REF" && d.stage === "WRAPPER")).toBe(true);
  });

  it("A-1 (round 2): role labels pass through UNTOUCHED — the label can only restrict mass, never create it", async () => {
    const response = JSON.stringify({
      nodes: [
        {
          tempId: "n1",
          type: "PATTERN",
          label: "Saying yes",
          evidence: [
            { sourceEventId: "e1", quote: "saying yes when I want to say no", role: "ENACTMENT" },
            { sourceEventId: "e1", quote: "I want to say no", role: "DECLARATION" },
          ],
        },
      ],
      edges: [],
    });
    const stub = stubModel(response);
    const result = await runProposer(input(), stub.call);
    // Round 1 normalized these to SUPPORT — which made aspirational quotes
    // CONFER mass and made IGNITED unreachable. Never again: pass-through.
    expect(result.output.nodes[0].evidence.map((e) => e.role)).toEqual([
      "ENACTMENT",
      "DECLARATION",
    ]);
    expect(result.roleLabelCounts).toEqual({ DECLARATION: 1, ENACTMENT: 1 });
  });

  it("C-13: a policy-dropped node takes its dependent edge down as DANGLING_EDGE_REF (guard ordering)", async () => {
    const response = JSON.stringify({
      nodes: [
        { tempId: "w1", type: "WOUND", label: "Hurt", evidence: [{ sourceEventId: "e1", quote: "saying yes" }] },
        { tempId: "p1", type: "PATTERN", label: "Saying yes", evidence: [{ sourceEventId: "e1", quote: "saying yes when I want to say no" }] },
      ],
      edges: [
        { tempId: "g1", source: { kind: "PROPOSED", tempId: "p1" }, target: { kind: "PROPOSED", tempId: "w1" }, type: "PROTECTS_FROM", evidence: [] },
      ],
    });
    const stub = stubModel(response);
    const result = await runProposer(input({ policy: soloPolicy() }), stub.call);
    const reasons = result.dropped.map((d) => `${d.tempId}:${d.reason}`).sort();
    expect(reasons).toEqual(["g1:DANGLING_EDGE_REF", "w1:NODE_TYPE_NOT_ALLOWED_BY_POLICY"]);
  });
});

describe("third-party guard (§13.9 — semi-structural, honestly labeled)", () => {
  const mk = (label: string, quote: string) =>
    JSON.stringify({
      nodes: [{ tempId: "n1", type: "PATTERN", label, evidence: [{ sourceEventId: "e1", quote }] }],
      edges: [],
    });

  it('"My mother is narcissistic" is rejected — not the author\'s psyche', async () => {
    const src = selfSource("e1", "My mother is narcissistic and it exhausts me.");
    const stub = stubModel(mk("My mother is narcissistic", "My mother is narcissistic"));
    const result = await runProposer(input({ sources: [src] }), stub.call);
    expect(result.output.nodes).toHaveLength(0);
    expect(result.dropped[0].reason).toBe("THIRD_PARTY_SUBJECT");
  });

  it('"I shut down when my mother criticizes me" is allowed — the author\'s own pattern', async () => {
    const src = selfSource("e1", "I shut down when my mother criticizes me.");
    const stub = stubModel(
      mk("I shut down when my mother criticizes me", "I shut down when my mother criticizes me"),
    );
    const result = await runProposer(input({ sources: [src] }), stub.call);
    expect(result.output.nodes).toHaveLength(1);
  });
});

describe("policy coherence (server-derived, never client-trusted)", () => {
  it("PRACTITIONER_SUPPORTED without a verified relationship is refused", () => {
    const bad = { ...practitionerPolicy(), practitionerRelationshipVerified: false };
    expect(() => assertPolicyCoherent(bad)).toThrow(/verified/i);
  });

  it("WOUND in allowedNodeTypes under SOLO mode is refused (owning a practitioner account unlocks nothing)", () => {
    const bad = { ...soloPolicy(), allowedNodeTypes: [...soloPolicy().allowedNodeTypes, "WOUND" as const] };
    expect(() => assertPolicyCoherent(bad)).toThrow(/WOUND/);
  });
});
