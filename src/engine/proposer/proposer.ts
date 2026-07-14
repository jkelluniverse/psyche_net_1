// The proposer wrapper (proposer spec v1.1): one primary extraction call
// plus at most one bounded serialization-repair call, inside an
// injection-safe context builder, a per-candidate shape validator, and
// deterministic policy guards. It proposes; the gate disposes.

import { CONTRACT_VERSION } from "../contracts/extraction-contracts";
import { buildBlindedContext, serializeExtractionContext } from "./context";
import { PROPOSER_CONFIG_V1, type ProposerConfig } from "./config";
import { applyPolicyGuards } from "./guards";
import { parseEnvelope, validateCandidates } from "./parse";
import { assertPolicyCoherent } from "./policy";
import {
  computeFenceNonce,
  PROMPT_TEMPLATE_HASH,
  PROMPT_VERSION,
  renderSystemPrompt,
  renderUserMessage,
} from "./prompt";
import type { CallModel, ProposerInput, ProposerRunResult } from "./types";

function repairMessage(error: string, previous: string): string {
  return (
    `Your previous output failed validation for reason: ${error}\n` +
    `Return corrected JSON only — the same content as valid JSON matching the required schema. No prose, no code fences.\n` +
    `Previous output:\n${previous}`
  );
}

/**
 * Run one extraction pass. Pure orchestration around an injected, untrusted
 * `callModel` — this module never imports a provider, computes no mass, sets
 * no state, and writes nothing; everything it returns still has to pass the
 * citation gate.
 *
 * Refuses (throws) rather than truncates when caps are exceeded (§4): an
 * oversized run is the batch layer's job to split; silence would violate the
 * evidence mandate by omission.
 */
export async function runProposer(
  input: ProposerInput,
  callModel: CallModel,
  config: ProposerConfig = PROPOSER_CONFIG_V1,
): Promise<ProposerRunResult> {
  assertPolicyCoherent(input.policy);

  // Caps — refuse loudly, never silently truncate (§4, §12).
  if (input.sources.length > config.caps.maxEventsPerRun) {
    throw new Error(
      `run refused: ${input.sources.length} events exceeds the per-run cap of ${config.caps.maxEventsPerRun}; split by the batch layer`,
    );
  }
  for (const s of input.sources) {
    if (s.content.length > config.caps.maxCharsPerSource) {
      throw new Error(
        `run refused: source "${s.id}" (${s.content.length} chars) exceeds the per-source cap of ${config.caps.maxCharsPerSource}; chunk at paragraph boundaries — never silently truncated`,
      );
    }
  }

  // Blinded context (throws on non-SELF sources; allowlist-validated).
  const ctx = buildBlindedContext(input);
  const serializedContext = serializeExtractionContext(ctx);
  const system = renderSystemPrompt(ctx);
  const nonce = computeFenceNonce(input.runId);
  const user = renderUserMessage(ctx, nonce);

  const meta = {
    runId: input.runId,
    promptVersion: PROMPT_VERSION,
    promptTemplateHash: PROMPT_TEMPLATE_HASH,
    contractVersion: CONTRACT_VERSION,
    serializedContext,
  };

  // One primary call; at most ONE serialization-repair call (§10). Repair is
  // for envelope errors only — semantic problems are handled per candidate
  // below and are never "repaired" into content.
  let attempts = 1;
  let envelope = parseEnvelope(await callModel({ system, user }));
  if (!envelope.ok) {
    attempts = 2;
    envelope = parseEnvelope(
      await callModel({ system, user: repairMessage(envelope.error, user) }),
    );
  }
  if (!envelope.ok) {
    // Fail closed: no proposals, retryable by the run queue (§10.5).
    return {
      status: "error",
      attempts,
      output: { nodes: [], edges: [] },
      dropped: [],
      rejectedCandidates: [],
      roleLabelCounts: { DECLARATION: 0, ENACTMENT: 0 },
      ontologyCandidates: [],
      ...meta,
    };
  }

  // Per-candidate validation (partial validity, §10.3). The alias map
  // canonicalizes the one deterministic citation variant the fence format
  // invites — "nonce:id" (models sometimes cite everything after "SRC:").
  const allowedSourceIds = new Set(input.sources.map((s) => s.id));
  const sourceIdAliases = new Map(input.sources.map((s) => [`${nonce}:${s.id}`, s.id]));
  const { nodes, edges, rejected } = validateCandidates(
    envelope.nodes,
    envelope.edges,
    allowedSourceIds,
    sourceIdAliases,
  );

  // Deterministic policy guards (§7/§9/§12).
  const priorExtractedNodeIds = new Set(
    input.priorNodes.filter((n) => n.provenance === "EXTRACTED").map((n) => n.id),
  );
  const totalSourceWords = input.sources
    .map((s) => s.content.split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0);
  const { output, dropped, roleLabelCounts } = applyPolicyGuards(
    nodes,
    edges,
    input.policy,
    priorExtractedNodeIds,
    totalSourceWords,
    config,
  );

  // Unknown ontology keys: allowed, logged, log-only in v1 (§7 guard 3).
  const knownKeys = new Set(input.ontology.knownOntologyKeys);
  const ontologyCandidates = output.nodes
    .filter((n) => n.ontologyKey !== undefined && !knownKeys.has(n.ontologyKey))
    .map((n) => ({ tempId: n.tempId, ontologyKey: n.ontologyKey! }));

  return {
    status: "complete",
    attempts,
    output,
    dropped,
    rejectedCandidates: rejected,
    roleLabelCounts,
    ontologyCandidates,
    ...meta,
  };
}
