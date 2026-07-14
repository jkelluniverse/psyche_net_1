// LIVE SMOKE for the lens lane — real astrology-api.io through the real
// adapter → importChartFromProvider → a scratch DB, then cleans up after
// itself. NOT part of the suite (it spends provider credits and needs both
// ASTROLOGY_API_KEY and TEST_DATABASE_URL). Run before promoting adapter or
// provider-shape changes:
//
//   set -a && . ./.env && set +a
//   TEST_DATABASE_URL=... npx tsx scripts/lens-live-smoke.ts

import { PrismaClient } from "@prisma/client";
import { createAstrologyApiProvider } from "../src/engine/lens/adapters/astrology-api";
import { importChartFromProvider } from "../src/engine/lens/import-chart";

const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl) throw new Error("TEST_DATABASE_URL is not set");
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main(): Promise<void> {
  // Throws loudly if ASTROLOGY_API_KEY is unset — that is the point.
  const provider = createAstrologyApiProvider({
    apiKey: process.env.ASTROLOGY_API_KEY,
  });
  const user = await prisma.user.create({
    data: { role: "INDIVIDUAL", ageVerified: true },
  });
  try {
    const r = await importChartFromProvider(prisma, {
      userId: user.id,
      system: "human_design",
      provider,
      birth: {
        birthDate: "1990-04-12",
        birthTime: "14:32",
        birthPlace: "Portland, OR, USA",
        tzResolved: "America/Los_Angeles",
      },
      city: "Portland",
      countryCode: "US",
      now: new Date(),
    });
    if (!r.ok) throw new Error(`live import failed: ${r.reason}`);
    console.log(
      `LIVE OK — ghosts: ${r.ghosts.length}, dropped: ${r.dropped.length}, skipped: ${JSON.stringify(r.skipped)}`,
    );
    console.log(r.ghosts.map((g) => `  tier ${g.priority}  ${g.ontologyKey}`).join("\n"));
  } finally {
    await prisma.psycheNode.deleteMany({ where: { userId: user.id } });
    await prisma.chartImport.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
