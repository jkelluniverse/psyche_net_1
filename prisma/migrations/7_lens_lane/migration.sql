-- Migration 7 — the lens-lane carriers (renderer-lens spec v1.3-FINAL §7).
--
-- ChartImport: status + canonical fingerprint (idempotency is structural) +
-- the version stamps that make replay know which parser/vocabulary/map/config
-- read which raw JSON.
ALTER TABLE "ChartImport" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE "ChartImport" ADD COLUMN "chartFingerprint" TEXT;
ALTER TABLE "ChartImport" ADD COLUMN "provider" TEXT;
ALTER TABLE "ChartImport" ADD COLUMN "parserVersion" TEXT;
ALTER TABLE "ChartImport" ADD COLUMN "featureVocabularyVersion" TEXT;
ALTER TABLE "ChartImport" ADD COLUMN "lensMapVersion" TEXT;
ALTER TABLE "ChartImport" ADD COLUMN "lensConfigVersion" TEXT;

-- Idempotent per (user, system, fingerprint): re-import upserts, never duplicates.
-- Partial (fingerprint nullable on legacy rows). Enforced via raw SQL: Prisma
-- cannot express partial uniques.
CREATE UNIQUE INDEX "ChartImport_user_system_fingerprint"
  ON "ChartImport"("userId", "system", "chartFingerprint")
  WHERE "chartFingerprint" IS NOT NULL;

-- PsycheNode: the lens stamps + the double-mint guard.
ALTER TABLE "PsycheNode" ADD COLUMN "lensMapVersion" TEXT;

-- Lens-node idempotency (spec §1): one ACTIVE ghost per (user, key).
CREATE UNIQUE INDEX "PsycheNode_lens_user_key_active"
  ON "PsycheNode"("userId", "ontologyKey")
  WHERE "provenance" = 'LENS' AND "archivedAt" IS NULL;

-- A LENS ghost without a key is unmatchable forever — reject it structurally.
ALTER TABLE "PsycheNode" ADD CONSTRAINT "PsycheNode_lens_requires_key"
  CHECK ("provenance" <> 'LENS' OR "ontologyKey" IS NOT NULL);
