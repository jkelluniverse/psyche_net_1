// LIVE SMOKE for the journaling pipeline — REAL Anthropic proposer through
// the production pass: journal sources → wrapper → gate → writer → matcher.
// NOT part of the suite (spends tokens; needs ANTHROPIC_API_KEY +
// TEST_DATABASE_URL). Cleans up after itself. Run before promoting prompt,
// adapter, or pass changes:
//
//   set -a && . ./.env && set +a
//   TEST_DATABASE_URL=... npx tsx scripts/journal-live-smoke.ts

import { PrismaClient } from "@prisma/client";
import { runExtractionPass } from "../src/engine/extraction/run-pass";
import { importChart } from "../src/engine/lens/import-chart";

const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl) throw new Error("TEST_DATABASE_URL is not set");
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

const ENTRIES = [
  "Therapy again today. I noticed the same thing as always: I only really open up when I feel completely safe with someone first. With everyone else I keep it light and funny.",
  "Long day. A coworker asked how I was actually doing and I deflected with a joke, again. I only open up when I feel safe, and work never feels safe. Writing it down because it keeps happening.",
];

async function main(): Promise<void> {
  const user = await prisma.user.create({
    data: { role: "INDIVIDUAL", ageVerified: true },
  });
  try {
    const now = new Date();
    for (const [i, content] of ENTRIES.entries()) {
      await prisma.sourceEvent.create({
        data: {
          userId: user.id,
          kind: "JOURNAL_TEXT",
          content,
          authorship: "SELF",
          occurredAt: new Date(now.getTime() - (i + 1) * 86_400_000),
        },
      });
    }
    const chart = await importChart(prisma, {
      userId: user.id,
      system: "human_design",
      provider: "astrology-api.io",
      birth: {
        birthDate: "1990-04-12",
        birthTime: "14:32",
        birthPlace: "Portland, OR, USA",
        tzResolved: "America/Los_Angeles",
      },
      rawChart: {
        human_design: {
          type: "Manifesting Generator",
          authority: "Emotional",
          defined_centers: ["Sacral", "Solar Plexus", "Throat"],
        },
        natal: { sun_sign: "Leo", moon_sign: "Pisces", ascendant_sign: "Aries" },
      },
      now,
    });
    if (!chart.ok) throw new Error(`chart import failed: ${chart.reason}`);

    const pass = await runExtractionPass(prisma, { userId: user.id, now });
    if (!pass.ok) throw new Error(`pass refused: ${pass.reason}`);
    console.log(
      `LIVE PASS OK — status: ${pass.proposerStatus}, sources: ${pass.sourcesExtracted}, links: ${pass.matcher?.linksCreated}`,
    );

    const nodes = await prisma.psycheNode.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: [{ provenance: "asc" }, { mass: "desc" }],
    });
    for (const n of nodes.filter((n) => n.provenance === "EXTRACTED")) {
      console.log(`  extracted: [${n.type}] "${n.label}" key=${n.ontologyKey} mass=${n.mass.toFixed(3)} ${n.state}`);
    }
    const charged = nodes.filter((n) => n.provenance === "LENS" && n.mass > 0);
    for (const n of charged) {
      console.log(`  CHARGED GHOST: [${n.type}] "${n.label}" key=${n.ontologyKey} mass=${n.mass.toFixed(3)} ${n.state}`);
    }
    if (charged.length === 0) {
      console.log("  (no ghost charged this run — extraction landed on different keys; see extracted list)");
    }
  } finally {
    await prisma.hypothesisEvidenceLink.deleteMany({});
    await prisma.matcherRun.deleteMany({ where: { userId: user.id } });
    await prisma.proposal.deleteMany({});
    await prisma.extractionRun.deleteMany({ where: { userId: user.id } });
    await prisma.evidence.deleteMany({});
    await prisma.psycheEdge.deleteMany({ where: { userId: user.id } });
    await prisma.psycheNode.deleteMany({ where: { userId: user.id } });
    await prisma.shadowCandidate.deleteMany({ where: { userId: user.id } });
    await prisma.sourceEvent.deleteMany({ where: { userId: user.id } });
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
