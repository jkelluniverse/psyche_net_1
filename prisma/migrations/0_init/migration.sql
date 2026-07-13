-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INDIVIDUAL', 'PRACTITIONER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('JOURNAL_TEXT', 'JOURNAL_VOICE', 'WORKSHEET_ANSWER', 'INTAKE_SPARK', 'ARCHIVE_IMPORT', 'EXPERIMENT_RESULT', 'PRACTITIONER_NOTE');

-- CreateEnum
CREATE TYPE "Authorship" AS ENUM ('SELF', 'PRACTITIONER');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('WOUND', 'SHADOW', 'BELIEF', 'PROTECTION', 'PATTERN', 'TRAIT', 'RESOURCE', 'BECOMING', 'LENS');

-- CreateEnum
CREATE TYPE "Provenance" AS ENUM ('EXTRACTED', 'LENS', 'BECOMING', 'PRACTITIONER');

-- CreateEnum
CREATE TYPE "NodeState" AS ENUM ('HYPOTHESIS', 'ACTIVE', 'QUESTIONED', 'LOOSENING', 'TRANSMUTATION_CANDIDATE', 'INTEGRATED', 'IGNITED', 'CONTRADICTED', 'DORMANT');

-- CreateEnum
CREATE TYPE "EdgeType" AS ENUM ('DRIVES', 'PROTECTS_FROM', 'EXPRESSES_AS', 'ROOTED_IN', 'REINFORCES', 'SOFTENED_BY');

-- CreateEnum
CREATE TYPE "EvidenceRole" AS ENUM ('SUPPORT', 'DECLARATION', 'ENACTMENT');

-- CreateEnum
CREATE TYPE "EvidencePolarity" AS ENUM ('SUPPORTING', 'COUNTERVAILING');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('RUNNING', 'CONFIRMED', 'INCONCLUSIVE', 'CONTRADICTED');

-- CreateEnum
CREATE TYPE "SafetySeverity" AS ENUM ('WATCH', 'ELEVATED', 'CRISIS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "UserRole" NOT NULL DEFAULT 'INDIVIDUAL',
    "ageVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthTime" TEXT,
    "birthPlace" TEXT,
    "birthLat" DOUBLE PRECISION,
    "birthLng" DOUBLE PRECISION,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerClient" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentScope" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "PractitionerClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "content" TEXT NOT NULL,
    "authorship" "Authorship" NOT NULL DEFAULT 'SELF',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signals" JSONB,
    "invalidatedAt" TIMESTAMP(3),
    "supersededById" TEXT,

    CONSTRAINT "SourceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "summary" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsycheNode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NodeType" NOT NULL,
    "provenance" "Provenance" NOT NULL,
    "label" TEXT NOT NULL,
    "ontologyKey" TEXT,
    "chartImportId" TEXT,
    "massAlgorithmVersion" TEXT NOT NULL DEFAULT 'v1',
    "confidenceAlgorithmVersion" TEXT NOT NULL DEFAULT 'v1',
    "stateAlgorithmVersion" TEXT NOT NULL DEFAULT 'v1',
    "gateVersion" TEXT NOT NULL DEFAULT 'v1',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mass" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "state" "NodeState" NOT NULL DEFAULT 'ACTIVE',
    "luminosity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "colorHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "PsycheNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsycheEdge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" "EdgeType" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "PsycheEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "nodeId" TEXT,
    "edgeId" TEXT,
    "quote" TEXT NOT NULL,
    "spanStart" INTEGER NOT NULL,
    "spanEnd" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "role" "EvidenceRole" NOT NULL DEFAULT 'SUPPORT',
    "polarity" "EvidencePolarity" NOT NULL DEFAULT 'SUPPORTING',
    "normalizationVersion" TEXT NOT NULL DEFAULT 'v1',
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "prediction" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'RUNNING',
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowEnd" TIMESTAMP(3),
    "confidenceLog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "severity" "SafetySeverity" NOT NULL,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "ontologyVersion" TEXT NOT NULL,
    "gateVersion" TEXT NOT NULL,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,

    CONSTRAINT "ExtractionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "outcome" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShadowCandidate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateKey" TEXT NOT NULL,
    "type" "NodeType" NOT NULL,
    "provenance" "Provenance" NOT NULL,
    "label" TEXT NOT NULL,
    "timesSeen" INTEGER NOT NULL DEFAULT 1,
    "distinctSources" INTEGER NOT NULL DEFAULT 1,
    "waitingReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidenceCache" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "ShadowCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "PractitionerClient_practitionerId_idx" ON "PractitionerClient"("practitionerId");

-- CreateIndex
CREATE INDEX "PractitionerClient_clientId_idx" ON "PractitionerClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerClient_practitionerId_clientId_key" ON "PractitionerClient"("practitionerId", "clientId");

-- CreateIndex
CREATE INDEX "SourceEvent_userId_occurredAt_idx" ON "SourceEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "SourceEvent_userId_kind_idx" ON "SourceEvent"("userId", "kind");

-- CreateIndex
CREATE INDEX "SourceEvent_invalidatedAt_idx" ON "SourceEvent"("invalidatedAt");

-- CreateIndex
CREATE INDEX "ChartImport_userId_system_idx" ON "ChartImport"("userId", "system");

-- CreateIndex
CREATE INDEX "PsycheNode_userId_type_idx" ON "PsycheNode"("userId", "type");

-- CreateIndex
CREATE INDEX "PsycheNode_userId_provenance_idx" ON "PsycheNode"("userId", "provenance");

-- CreateIndex
CREATE INDEX "PsycheNode_userId_state_idx" ON "PsycheNode"("userId", "state");

-- CreateIndex
CREATE INDEX "PsycheEdge_userId_idx" ON "PsycheEdge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PsycheEdge_sourceId_targetId_type_key" ON "PsycheEdge"("sourceId", "targetId", "type");

-- CreateIndex
CREATE INDEX "Evidence_sourceEventId_idx" ON "Evidence"("sourceEventId");

-- CreateIndex
CREATE INDEX "Evidence_nodeId_idx" ON "Evidence"("nodeId");

-- CreateIndex
CREATE INDEX "Evidence_edgeId_idx" ON "Evidence"("edgeId");

-- CreateIndex
CREATE INDEX "Experiment_userId_status_idx" ON "Experiment"("userId", "status");

-- CreateIndex
CREATE INDEX "Experiment_targetNodeId_idx" ON "Experiment"("targetNodeId");

-- CreateIndex
CREATE INDEX "SafetyFlag_userId_createdAt_idx" ON "SafetyFlag"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExtractionRun_userId_startedAt_idx" ON "ExtractionRun"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "Proposal_runId_idx" ON "Proposal"("runId");

-- CreateIndex
CREATE INDEX "Proposal_outcome_idx" ON "Proposal"("outcome");

-- CreateIndex
CREATE INDEX "ShadowCandidate_userId_idx" ON "ShadowCandidate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShadowCandidate_userId_candidateKey_key" ON "ShadowCandidate"("userId", "candidateKey");

-- AddForeignKey
ALTER TABLE "PractitionerClient" ADD CONSTRAINT "PractitionerClient_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerClient" ADD CONSTRAINT "PractitionerClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceEvent" ADD CONSTRAINT "SourceEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartImport" ADD CONSTRAINT "ChartImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsycheNode" ADD CONSTRAINT "PsycheNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsycheNode" ADD CONSTRAINT "PsycheNode_chartImportId_fkey" FOREIGN KEY ("chartImportId") REFERENCES "ChartImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsycheEdge" ADD CONSTRAINT "PsycheEdge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsycheEdge" ADD CONSTRAINT "PsycheEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PsycheNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsycheEdge" ADD CONSTRAINT "PsycheEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "PsycheNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "SourceEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "PsycheNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_edgeId_fkey" FOREIGN KEY ("edgeId") REFERENCES "PsycheEdge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "PsycheNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyFlag" ADD CONSTRAINT "SafetyFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExtractionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK constraints (schema.prisma comments — not expressible in pure Prisma).
-- These make LAW 1 / LAW 2 structural: an unvalidated or mistargeted Evidence
-- row is INSERTION-IMPOSSIBLE, not merely alarmed after the fact.
-- ─────────────────────────────────────────────────────────────────────────────

-- Every persisted Evidence row was verified by the deterministic citation gate.
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_validated_true"
    CHECK ("validated" = true);

-- Every Evidence row supports exactly one target: a node XOR an edge.
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_exactly_one_target"
    CHECK (("nodeId" IS NULL) <> ("edgeId" IS NULL));
