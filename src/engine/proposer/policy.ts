// Policy coherence (§3, §7): the ExtractionPolicy is server-derived; this
// assertion catches incoherent policies at the boundary so a bug upstream
// can never widen extraction authority.

import type { ExtractionPolicy } from "./types";

export function assertPolicyCoherent(policy: ExtractionPolicy): void {
  if (
    policy.mode === "PRACTITIONER_SUPPORTED" &&
    !policy.practitionerRelationshipVerified
  ) {
    throw new Error(
      "ExtractionPolicy incoherent: PRACTITIONER_SUPPORTED mode requires a verified practitioner relationship. " +
        "A practitioner working on their own material is SOLO mode with solo rules.",
    );
  }
  if (policy.mode === "SOLO" && policy.allowedNodeTypes.includes("WOUND")) {
    throw new Error(
      "ExtractionPolicy incoherent: WOUND cannot be an allowed node type in SOLO mode (LAW 7; proposer spec §7).",
    );
  }
  // LENS/BECOMING need no runtime check since contract v2.1: the
  // ExtractableNodeType type makes them unrepresentable in allowedNodeTypes.
}
