// Shared fixtures for the proposer wrapper suite. The model is always a
// deterministic stub here — non-deterministic output equality is the wrong
// layer to test (proposer spec §13.1); we test the structure around it.

import type { SourceRecord } from "../../contracts/extraction-contracts";
import type {
  CandidatePriorNode,
  ExtractionPolicy,
  OntologyView,
  ProposerInput,
} from "../types";
import {
  PRACTITIONER_ALLOWED_NODE_TYPES,
  SOLO_ALLOWED_NODE_TYPES,
} from "../config";

export const NOW = new Date("2026-07-01T12:00:00.000Z");

export function selfSource(id: string, content: string): SourceRecord {
  return { id, content, authorship: "SELF", occurredAt: NOW, invalidatedAt: null };
}

export const ONTOLOGY: OntologyView = {
  ontologyVersion: "v1",
  nodeTypes: [
    { type: "SHADOW", definition: "a disowned or avoided aspect the person indicates" },
    { type: "BELIEF", definition: "a conviction the person states about self/world" },
    { type: "PROTECTION", definition: "a strategy that guards against feared outcomes" },
    { type: "PATTERN", definition: "a recurring behavior the person reports" },
    { type: "TRAIT", definition: "a stable characteristic the person claims" },
    { type: "RESOURCE", definition: "a strength or capacity the person evidences" },
    { type: "WOUND", definition: "a hurt the person names directly (supervised only)" },
  ],
  knownOntologyKeys: ["belief.core", "pattern.core"],
};

export function soloPolicy(): ExtractionPolicy {
  return {
    mode: "SOLO",
    allowedNodeTypes: [...SOLO_ALLOWED_NODE_TYPES],
    practitionerRelationshipVerified: false,
    userConsentVersion: "consent-v1",
    consentScope: { betweenSessionExtraction: true },
    policyVersion: "policy-v1",
  };
}

export function practitionerPolicy(): ExtractionPolicy {
  return {
    mode: "PRACTITIONER_SUPPORTED",
    allowedNodeTypes: [...PRACTITIONER_ALLOWED_NODE_TYPES],
    practitionerRelationshipVerified: true,
    userConsentVersion: "consent-v1",
    consentScope: { betweenSessionExtraction: true },
    policyVersion: "policy-v1",
  };
}

export const EXTRACTED_PRIOR: CandidatePriorNode[] = [
  {
    id: "node-extracted-1",
    type: "BELIEF",
    provenance: "EXTRACTED",
    label: "I must carry everything alone",
    ontologyKey: "belief.core",
  },
];

/**
 * Hypothesis nodes that exist in surrounding graph state. The blinding
 * invariant says these must be STRUCTURALLY absent from the constructed
 * context — the keystone test asserts byte-identity with/without them.
 * Extra runtime fields (mass/state/evidence) are included on purpose: they
 * ride along on real DB rows and must be stripped structurally.
 */
export const HYPOTHESIS_PRIOR: CandidatePriorNode[] = [
  {
    id: "node-lens-1",
    type: "LENS",
    provenance: "LENS",
    label: "SECRET_LENS_HYPOTHESIS fear of abandonment",
    // @ts-expect-error — deliberately smuggled runtime baggage
    mass: 3.2,
    state: "HYPOTHESIS",
    evidence: [{ quote: "SECRET_EVIDENCE_TEXT" }],
  },
  {
    id: "node-becoming-1",
    type: "BECOMING",
    provenance: "BECOMING",
    label: "SECRET_BECOMING_SEED calm under conflict",
  },
  {
    id: "node-practitioner-1",
    type: "PATTERN",
    provenance: "PRACTITIONER",
    label: "SECRET_PRACTITIONER_NOTE avoids conflict",
  },
];

export function input(overrides: Partial<ProposerInput> = {}): ProposerInput {
  return {
    sources: [selfSource("e1", "I keep saying yes when I want to say no.")],
    priorNodes: [...EXTRACTED_PRIOR],
    ontology: ONTOLOGY,
    policy: soloPolicy(),
    runId: "run-1",
    ...overrides,
  };
}

/** A stub model that returns a fixed sequence of responses. */
export function stubModel(...responses: string[]) {
  const calls: { system: string; user: string }[] = [];
  let i = 0;
  const call = async (req: { system: string; user: string }): Promise<string> => {
    calls.push(req);
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return r;
  };
  return { call, calls };
}

export const EMPTY_RESPONSE = JSON.stringify({ nodes: [], edges: [] });

export function validNodeResponse() {
  return JSON.stringify({
    nodes: [
      {
        tempId: "n1",
        type: "PATTERN",
        label: "Saying yes when I mean no",
        evidence: [
          {
            sourceEventId: "e1",
            quote: "saying yes when I want to say no",
            role: "SUPPORT",
            polarity: "SUPPORTING",
          },
        ],
      },
    ],
    edges: [],
  });
}
