// The MODEL-FACING output schema (round-2 A-5, proposer spec v1.3 §4/§6).
//
// Deliberately DERIVED PER-POLICY and distinct from the canonical contract:
// a schema derived naively from the contract would advertise LENS/BECOMING
// (and WOUND in solo mode) plus a `provenance` enum in a second channel —
// re-leaking exactly the vocabulary the prompt scrubs (§6: "asking the model
// not to use types you showed it is asking for category leakage"). The
// schema the provider enforces must therefore narrow with the policy, and
// the local validator (parse.ts) remains the canonical, strict boundary —
// provider enforcement is an optimization, never the trust boundary.

import type { ExtractionPolicy } from "./types";

const EVIDENCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sourceEventId", "quote"],
  properties: {
    sourceEventId: { type: "string" },
    quote: { type: "string" },
    offsetHint: { type: "number" },
    role: { enum: ["SUPPORT", "DECLARATION", "ENACTMENT"] },
    polarity: { enum: ["SUPPORTING", "COUNTERVAILING"] },
    inferenceDistance: {
      enum: [
        "DIRECT_DECLARATION",
        "DIRECT_BEHAVIOR",
        "LOW_INFERENCE_PATTERN",
        "HIGH_INFERENCE_INTERPRETATION",
      ],
    },
    evidenceRationale: { type: "string" },
  },
} as const;

const NODE_REF_SCHEMA = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "tempId"],
      properties: { kind: { const: "PROPOSED" }, tempId: { type: "string" } },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "nodeId"],
      properties: { kind: { const: "EXISTING" }, nodeId: { type: "string" } },
    },
  ],
} as const;

/**
 * Build the JSON schema handed to the provider for structured output.
 * `type` enumerates EXACTLY `policy.allowedNodeTypes` — nothing else exists
 * in this channel. There is NO `provenance` field (the wrapper stamps it;
 * the model never chooses). Unit-tested against the §3 derivation table.
 */
export function buildModelOutputSchema(policy: ExtractionPolicy): object {
  return {
    type: "object",
    additionalProperties: false,
    required: ["nodes", "edges"],
    properties: {
      nodes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["tempId", "type", "label", "evidence"],
          properties: {
            tempId: { type: "string" },
            type: { enum: [...policy.allowedNodeTypes] },
            label: { type: "string" },
            ontologyKey: { type: "string" },
            inferenceDistance: EVIDENCE_SCHEMA.properties.inferenceDistance,
            modelReportedConfidence: { type: "number" },
            evidence: { type: "array", items: EVIDENCE_SCHEMA },
          },
        },
      },
      edges: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["tempId", "source", "target", "type", "evidence"],
          properties: {
            tempId: { type: "string" },
            source: NODE_REF_SCHEMA,
            target: NODE_REF_SCHEMA,
            type: {
              enum: [
                "DRIVES",
                "PROTECTS_FROM",
                "EXPRESSES_AS",
                "ROOTED_IN",
                "REINFORCES",
                "SOFTENED_BY",
              ],
            },
            inferenceDistance: EVIDENCE_SCHEMA.properties.inferenceDistance,
            modelReportedConfidence: { type: "number" },
            evidence: { type: "array", items: EVIDENCE_SCHEMA },
          },
        },
      },
    },
  };
}
