-- AlterTable
ALTER TABLE "ExtractionRun" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "omittedEventIds" JSONB,
ADD COLUMN     "parserVersion" TEXT,
ADD COLUMN     "rawResponseRef" TEXT,
ADD COLUMN     "responseHash" TEXT;

-- AlterTable
ALTER TABLE "PractitionerClient" ADD COLUMN     "consentVersion" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShadowCandidate" ADD COLUMN     "edgeType" "EdgeType",
ADD COLUMN     "inferenceDistance" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'node',
ADD COLUMN     "sourceKey" TEXT,
ADD COLUMN     "targetKey" TEXT,
ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "label" DROP NOT NULL;

