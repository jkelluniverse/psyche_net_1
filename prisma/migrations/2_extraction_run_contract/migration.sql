-- AlterTable
ALTER TABLE "ExtractionRun" ADD COLUMN     "contractVersion" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN     "policySnapshot" JSONB,
ADD COLUMN     "promptTemplateHash" TEXT;

