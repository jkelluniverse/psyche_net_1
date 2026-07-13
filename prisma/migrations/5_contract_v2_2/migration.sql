-- AlterTable (keep contractVersion default synced to CONTRACT_VERSION — C-7 rule)
ALTER TABLE "ExtractionRun" ALTER COLUMN "contractVersion" SET DEFAULT 'v2.2';
