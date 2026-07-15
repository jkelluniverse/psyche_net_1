// TWO-PASS RECURRENCE LIVE SMOKE — the promotion gate for candidate identity
// v2 (gate v1.8 + prompt v4, ruled 2026-07-15). The claim under test, against
// the REAL model: the same theme, in DIFFERENT words, across TWO separate
// extraction passes, accumulates in the shadow buffer and materializes —
// exactly what the old label-hash identity provably never did (July-15
// diagnosis: zero cross-pass accumulation).
//
// Two journal entries, same theme, deliberately different vocabulary. Entry 1
// → pass 1 (expected: forming, held). Entry 2 ingested AFTER pass 1 → pass 2
// (expected: join via identity v2, threshold 2 spans / 2 sources met →
// materialized node). FAIL (exit 1) if pass 2 leaves the theme split across
// strangers again.
//
//   set -a && . ./.env && set +a
//   TEST_DATABASE_URL=... npx tsx scripts/recurrence-live-smoke.ts
//
// Spends tokens; needs ANTHROPIC_API_KEY. Cleans up after itself.

import { PrismaClient } from "@prisma/client";
import { runExtractionPass } from "../src/engine/extraction/run-pass";

const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl) throw new Error("TEST_DATABASE_URL is not set");
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

// Same theme — worth through being needed — twice, with different words.
const ENTRY_1 =
  "Hard session today. What came up is that I only feel like I matter when " +
  "someone needs something from me. When nobody needs me I get restless and " +
  "start looking for a problem to solve, anyone's problem.";
const ENTRY_2 =
  "My sister called just to chat and I caught myself scanning for a way to " +
  "be useful the entire time. It is like my worth switches on when I am " +
  "needed and switches off the moment I am not.";

async function main(): Promise<void> {
  const user = await prisma.user.create({ data: { role: "INDIVIDUAL", ageVerified: true } });
  try {
    const t0 = new Date();
    await prisma.sourceEvent.create({
      data: {
        userId: user.id,
        kind: "JOURNAL_TEXT",
        content: ENTRY_1,
        authorship: "SELF",
        occurredAt: new Date(t0.getTime() - 2 * 86_400_000),
      },
    });
    const pass1 = await runExtractionPass(prisma, { userId: user.id, now: t0 });
    if (!pass1.ok) throw new Error(`pass 1 refused: ${pass1.reason}`);
    const shadowAfter1 = await prisma.shadowCandidate.findMany({
      where: { userId: user.id, kind: "node" },
    });
    console.log(
      `pass 1: heard=${pass1.summary.heard} materialized=${pass1.summary.materialized} forming=${pass1.summary.forming}`,
    );
    for (const s of shadowAfter1) {
      console.log(`  held: [${s.type}] "${s.label}" key=${s.ontologyKey} seen=${s.timesSeen}`);
    }

    // Entry 2 arrives after pass 1 — a genuinely separate pass.
    const t1 = new Date(t0.getTime() + 60_000);
    await prisma.sourceEvent.create({
      data: {
        userId: user.id,
        kind: "JOURNAL_TEXT",
        content: ENTRY_2,
        authorship: "SELF",
        occurredAt: t1,
        ingestedAt: t1,
      },
    });
    const pass2 = await runExtractionPass(prisma, { userId: user.id, now: t1 });
    if (!pass2.ok) throw new Error(`pass 2 refused: ${pass2.reason}`);
    console.log(
      `pass 2: heard=${pass2.summary.heard} materialized=${pass2.summary.materialized} forming=${pass2.summary.forming}`,
    );

    const nodes = await prisma.psycheNode.findMany({
      where: { userId: user.id, provenance: "EXTRACTED", archivedAt: null },
      include: { evidence: true },
    });
    const shadowAfter2 = await prisma.shadowCandidate.findMany({
      where: { userId: user.id, kind: "node" },
    });
    for (const n of nodes) {
      const sources = new Set(n.evidence.map((e) => e.sourceEventId)).size;
      console.log(
        `  MATERIALIZED: [${n.type}] "${n.label}" key=${n.ontologyKey} mass=${n.mass.toFixed(3)} evidence=${n.evidence.length} sources=${sources}`,
      );
    }
    for (const s of shadowAfter2) {
      console.log(`  still held: [${s.type}] "${s.label}" key=${s.ontologyKey} seen=${s.timesSeen}`);
    }

    // The verdict: at least one node materialized from evidence spanning BOTH
    // entries — cross-pass recurrence became a star.
    const crossPass = nodes.filter(
      (n) => new Set(n.evidence.map((e) => e.sourceEventId)).size >= 2,
    );
    // Accumulation also counts when still forming (model may split themes):
    const accumulated = shadowAfter2.filter((s) => s.timesSeen >= 2);
    if (crossPass.length > 0) {
      console.log(
        `\nRECURRENCE SMOKE PASS — ${crossPass.length} node(s) materialized from cross-pass evidence.`,
      );
    } else if (accumulated.length > 0) {
      console.log(
        `\nRECURRENCE SMOKE PARTIAL — accumulation happened (${accumulated.length} candidate(s) at timesSeen>=2) but nothing crossed the threshold this run. Identity v2 is joining; inspect labels above.`,
      );
      process.exitCode = 1;
    } else {
      console.error(
        "\nRECURRENCE SMOKE FAIL — zero cross-pass accumulation. The flaw the ruling exists to fix is still live.",
      );
      process.exitCode = 1;
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
    await prisma.user.delete({ where: { id: user.id } });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
