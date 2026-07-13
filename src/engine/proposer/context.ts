// The injection-safe, BLINDED context builder (proposer spec §4, §5).
//
// The blinding invariant is enforced STRUCTURALLY here: the context is
// constructed by explicit field-picking from an EXTRACTED-only filter, and
// the serializer validates a hard allowlist — forbidden fields cannot
// serialize, so hypotheses (lens/becoming/practitioner) and derived state
// (mass/confidence/state/evidence) are structurally absent from anything
// the model ever sees. The keystone test asserts byte-identity of the
// serialized context with and without hypotheses in surrounding state.

import { CONTRACT_VERSION } from "../contracts/extraction-contracts";
import type { BlindedExtractionContext, ProposerInput } from "./types";

export function buildBlindedContext(input: ProposerInput): BlindedExtractionContext {
  // §4: SELF-authored sources only — refuse loudly, never filter silently
  // (a practitioner note reaching native extraction is a call-site bug).
  for (const s of input.sources) {
    if (s.authorship !== "SELF") {
      throw new Error(
        `Blinded extraction context accepts SELF-authored sources only; "${s.id}" has authorship ${s.authorship}.`,
      );
    }
  }

  return {
    contractVersion: CONTRACT_VERSION,
    sources: input.sources.map((s) => ({
      id: s.id,
      content: s.content,
      occurredAt: s.occurredAt.toISOString(),
    })),
    // §5: EXTRACTED provenance only, and ONLY id/type/label/ontologyKey —
    // explicit picking strips evidence/mass/state/confidence structurally.
    priorExtractedNodes: input.priorNodes
      .filter((n) => n.provenance === "EXTRACTED")
      .map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        ...(n.ontologyKey !== undefined ? { ontologyKey: n.ontologyKey } : {}),
      })),
    ontology: {
      ontologyVersion: input.ontology.ontologyVersion,
      // Forbidden types are ABSENT from the ontology view, not discouraged —
      // asking the model to ignore a type you showed it invites leakage (§6).
      nodeTypes: input.ontology.nodeTypes
        .filter((t) =>
          (input.policy.allowedNodeTypes as readonly string[]).includes(t.type),
        )
        .map((t) => ({ type: t.type, definition: t.definition })),
      knownOntologyKeys: [...input.ontology.knownOntologyKeys],
    },
    policy: {
      mode: input.policy.mode,
      allowedNodeTypes: [...input.policy.allowedNodeTypes],
      policyVersion: input.policy.policyVersion,
    },
  };
}

// ── The allowlist serializer (forbidden fields CANNOT serialize) ────────────

type Shape = { required: string[]; optional?: string[] };

const SHAPES: Record<string, Shape> = {
  root: {
    required: ["contractVersion", "sources", "priorExtractedNodes", "ontology", "policy"],
  },
  source: { required: ["id", "content", "occurredAt"] },
  priorNode: { required: ["id", "type", "label"], optional: ["ontologyKey"] },
  ontology: { required: ["ontologyVersion", "nodeTypes", "knownOntologyKeys"] },
  nodeTypeEntry: { required: ["type", "definition"] },
  policy: { required: ["mode", "allowedNodeTypes", "policyVersion"] },
};

function assertShape(obj: Record<string, unknown>, shapeName: string): void {
  const shape = SHAPES[shapeName];
  const allowed = new Set([...shape.required, ...(shape.optional ?? [])]);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new Error(
        `Blinding violation: forbidden field "${key}" in ${shapeName} cannot serialize toward the model.`,
      );
    }
  }
  for (const key of shape.required) {
    if (!(key in obj)) {
      throw new Error(`Malformed extraction context: ${shapeName} is missing "${key}".`);
    }
  }
}

/** Canonical JSON: recursively sorted keys → deterministic bytes. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Validate the context against the hard allowlist, then serialize to
 * canonical, byte-deterministic JSON. This string — and nothing else — is
 * what reaches the prompt renderers.
 */
export function serializeExtractionContext(ctx: BlindedExtractionContext): string {
  assertShape(ctx as unknown as Record<string, unknown>, "root");
  for (const s of ctx.sources) assertShape(s as unknown as Record<string, unknown>, "source");
  for (const n of ctx.priorExtractedNodes) {
    assertShape(n as unknown as Record<string, unknown>, "priorNode");
  }
  assertShape(ctx.ontology as unknown as Record<string, unknown>, "ontology");
  for (const t of ctx.ontology.nodeTypes) {
    assertShape(t as unknown as Record<string, unknown>, "nodeTypeEntry");
  }
  assertShape(ctx.policy as unknown as Record<string, unknown>, "policy");
  return canonical(ctx);
}
