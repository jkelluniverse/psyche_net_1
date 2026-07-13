// Proposer wrapper configuration — named and versioned (no magic numbers).

import type { ExtractableNodeType, NodeType } from "../contracts/extraction-contracts";

/**
 * Solo mode is strengths-forward AT THE DATA LAYER (§7): WOUND is not
 * extracted at all — wound-adjacent material surfaces as PROTECTION or
 * PATTERN. LENS and BECOMING are never proposable by extraction in any mode
 * (they enter through their own lanes).
 */
export const SOLO_ALLOWED_NODE_TYPES: readonly ExtractableNodeType[] = [
  "SHADOW",
  "BELIEF",
  "PROTECTION",
  "PATTERN",
  "TRAIT",
  "RESOURCE",
];

export const PRACTITIONER_ALLOWED_NODE_TYPES: readonly ExtractableNodeType[] = [
  ...SOLO_ALLOWED_NODE_TYPES,
  "WOUND",
];

export interface ProposerConfig {
  promptVersion: string;
  caps: {
    /** Oversized runs are refused (split by the batch layer) — never truncated. */
    maxEventsPerRun: number;
    maxCharsPerSource: number;
    /** Recall needs a precision floor (§12). */
    candidatesPer1000Words: number;
    /** Small entries still get a workable allowance. */
    minCandidateAllowance: number;
    /** Sensitive-type candidates (WOUND/SHADOW) per run. */
    maxSensitiveCandidatesPerRun: number;
  };
  sensitiveNodeTypes: readonly NodeType[];
  supportedLanguages: readonly string[];
  /** §10.5 retry queue — named, never inline literals (C-8). */
  retry: {
    maxExtractionRetries: number;
    backoffMinutes: readonly number[];
  };
}

export const PROPOSER_CONFIG_V1: ProposerConfig = {
  promptVersion: "v1",
  caps: {
    maxEventsPerRun: 20,
    maxCharsPerSource: 24_000,
    candidatesPer1000Words: 12,
    minCandidateAllowance: 8,
    maxSensitiveCandidatesPerRun: 4,
  },
  sensitiveNodeTypes: ["WOUND", "SHADOW"],
  supportedLanguages: ["en"],
  retry: {
    maxExtractionRetries: 3,
    backoffMinutes: [5, 30, 120],
  },
};
