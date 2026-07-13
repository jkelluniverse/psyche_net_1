// Extraction proposer — public surface. See /docs/proposer-spec.md.
// The proposer is untrusted by design: everything it emits flows through the
// deterministic citation gate. This wrapper makes untrusted output GOOD —
// blinded, injection-contained, policy-guarded, and honestly validated.

export { runProposer } from "./proposer";
export { buildBlindedContext, serializeExtractionContext } from "./context";
export {
  computeFenceNonce,
  PROMPT_TEMPLATE_HASH,
  PROMPT_VERSION,
  renderSystemPrompt,
  renderUserMessage,
  SOURCE_BEGIN,
  SOURCE_END,
} from "./prompt";
export { applyPolicyGuards } from "./guards";
export { parseEnvelope, validateCandidates } from "./parse";
export { assertPolicyCoherent } from "./policy";
export {
  PRACTITIONER_ALLOWED_NODE_TYPES,
  PROPOSER_CONFIG_V1,
  SOLO_ALLOWED_NODE_TYPES,
} from "./config";
export type { ProposerConfig } from "./config";
export type {
  BlindedExtractionContext,
  CallModel,
  CandidatePriorNode,
  ExtractionPolicy,
  OntologyView,
  PriorNodeView,
  ProposerInput,
  ProposerRunResult,
} from "./types";
