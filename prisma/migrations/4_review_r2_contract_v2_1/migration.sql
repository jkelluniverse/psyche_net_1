-- AlterTable
ALTER TABLE "ExtractionRun" ALTER COLUMN "contractVersion" SET DEFAULT 'v2.1';

-- AlterTable
ALTER TABLE "ShadowCandidate" DROP COLUMN "sourceKey",
DROP COLUMN "targetKey",
ADD COLUMN     "ontologyKey" TEXT,
ADD COLUMN     "sourceRef" JSONB,
ADD COLUMN     "targetRef" JSONB;

