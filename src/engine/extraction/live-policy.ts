// LIVE EXTRACTION POLICY — server-derived, never client-asserted
// (proposer spec §3/§7; D9). This is the structural wound-gate's production
// seam: SOLO mode CANNOT carry WOUND in allowedNodeTypes (the policy
// asserter throws on the combination — LAW 7's strengths-forward default is
// enforced by shape, not by prompt), and PRACTITIONER_SUPPORTED requires a
// VERIFIED relationship with the named between-session consent line-item.
// When either condition fails, the policy quietly IS solo policy — access
// never widens by accident, only narrows.

import type { PrismaClient } from "@prisma/client";
import type { ExtractionPolicy } from "../proposer/types";
import {
  PRACTITIONER_ALLOWED_NODE_TYPES,
  SOLO_ALLOWED_NODE_TYPES,
} from "../proposer/config";

export const LIVE_POLICY_VERSION = "policy-live-v1";

export async function livePolicyFor(
  prisma: PrismaClient,
  userId: string,
): Promise<ExtractionPolicy> {
  const relation = await prisma.practitionerClient.findFirst({
    where: { clientId: userId },
    orderBy: { createdAt: "asc" },
  });
  const scope = (relation?.consentScope ?? {}) as {
    betweenSessionExtraction?: boolean;
  };
  const supported =
    relation !== null &&
    relation.verifiedAt !== null &&
    scope.betweenSessionExtraction === true;

  return supported
    ? {
        mode: "PRACTITIONER_SUPPORTED",
        allowedNodeTypes: [...PRACTITIONER_ALLOWED_NODE_TYPES],
        practitionerRelationshipVerified: true,
        userConsentVersion: relation.consentVersion ?? "consent-unversioned",
        consentScope: { betweenSessionExtraction: true },
        policyVersion: LIVE_POLICY_VERSION,
      }
    : {
        mode: "SOLO",
        allowedNodeTypes: [...SOLO_ALLOWED_NODE_TYPES],
        practitionerRelationshipVerified: false,
        userConsentVersion: "consent-solo-v1",
        consentScope: { betweenSessionExtraction: false },
        policyVersion: LIVE_POLICY_VERSION,
      };
}
