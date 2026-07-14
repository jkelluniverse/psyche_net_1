-- Migration 8 — the matcher build (renderer-lens spec §3/§3.1/§7).
-- Carriers: HypothesisEvidenceLink (the charge carrier, D-R2), MatcherRun
-- (the derivation object), HypothesisConfirmation (the authority overlay,
-- D-R7). Every constraint Prisma cannot express lives HERE and is annotated
-- in schema.prisma (r3 C-13).

CREATE TABLE "MatcherRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "matcherConfigVersion" TEXT NOT NULL,
    "matchRuleVersion" TEXT NOT NULL,
    "transitions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatcherRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MatcherRun_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "MatcherRun_userId_createdAt_idx" ON "MatcherRun"("userId", "createdAt");

CREATE TABLE "HypothesisEvidenceLink" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "evidenceId" TEXT,
    "evidenceIdWas" TEXT NOT NULL,
    "matchRuleVersion" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL,
    "runId" TEXT NOT NULL,
    "invalidatedAt" TIMESTAMP(3),
    "invalidationCause" TEXT,
    "invalidatedByRunId" TEXT,

    CONSTRAINT "HypothesisEvidenceLink_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HypothesisEvidenceLink_nodeId_fkey" FOREIGN KEY ("nodeId")
        REFERENCES "PsycheNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    -- SetNull: erasing the Evidence row leaves the link as id-only audit.
    CONSTRAINT "HypothesisEvidenceLink_evidenceId_fkey" FOREIGN KEY ("evidenceId")
        REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HypothesisEvidenceLink_runId_fkey" FOREIGN KEY ("runId")
        REFERENCES "MatcherRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE,

    -- The copy-at-insert audit id must actually be there (r3 A-3).
    CONSTRAINT "HypothesisEvidenceLink_was_nonempty"
        CHECK (length("evidenceIdWas") > 0),
    -- Invalidation always carries its cause; a cause never floats alone.
    CONSTRAINT "HypothesisEvidenceLink_cause_paired"
        CHECK (("invalidatedAt" IS NULL) = ("invalidationCause" IS NULL)),
    CONSTRAINT "HypothesisEvidenceLink_cause_enum"
        CHECK ("invalidationCause" IS NULL
               OR "invalidationCause" IN ('SOURCE_INVALIDATED','LAW8_ERASURE','MANUAL'))
);

-- One live link per (hypothesis, evidence row); erased rows (NULL) may recur.
CREATE UNIQUE INDEX "HypothesisEvidenceLink_node_evidence"
    ON "HypothesisEvidenceLink"("nodeId", "evidenceId")
    WHERE "evidenceId" IS NOT NULL;
CREATE INDEX "HypothesisEvidenceLink_nodeId_invalidatedAt_idx"
    ON "HypothesisEvidenceLink"("nodeId", "invalidatedAt");
CREATE INDEX "HypothesisEvidenceLink_evidenceId_idx"
    ON "HypothesisEvidenceLink"("evidenceId");
CREATE INDEX "HypothesisEvidenceLink_runId_idx"
    ON "HypothesisEvidenceLink"("runId");

CREATE TABLE "HypothesisConfirmation" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedByRunId" TEXT,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "HypothesisConfirmation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HypothesisConfirmation_practitionerId_fkey" FOREIGN KEY ("practitionerId")
        REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HypothesisConfirmation_nodeId_fkey" FOREIGN KEY ("nodeId")
        REFERENCES "PsycheNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HypothesisConfirmation_direction_enum"
        CHECK ("direction" IN ('AFFIRM','GROUND'))
);

CREATE INDEX "HypothesisConfirmation_nodeId_withdrawnAt_idx"
    ON "HypothesisConfirmation"("nodeId", "withdrawnAt");
