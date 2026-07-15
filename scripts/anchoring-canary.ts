// ANCHORING CANARY — PERMANENT eval item (ruling #1, 2026-07-15). The
// blinded context now carries once-heard shadow labels (prompt v4); the risk
// that buys is anchoring — the model stretching today's words toward an old
// theme to please the list. This canary proves the "never force a fit"
// instruction holds against the REAL model:
//
//   shadow labels present + an unrelated flat entry → ZERO forced reuse.
//
// FAIL (exit 1) if any proposal — any outcome, node or edge — reuses a held
// label, or if any seeded shadow candidate gains a sighting from the flat
// entry. High-similarity (not identical) labels are reported as warnings for
// the tuning log. Run before promoting any prompt/model change, alongside
// eval:fidelity:
//
//   set -a && . ./.env && set +a
//   TEST_DATABASE_URL=... npx tsx scripts/anchoring-canary.ts
//
// Spends tokens; needs ANTHROPIC_API_KEY. Cleans up after itself.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { labelJaccard } from "../src/engine/citation-gate/gate";
import { normalizeQuote } from "../src/engine/citation-gate/normalize";
import { runExtractionPass } from "../src/engine/extraction/run-pass";

const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl) throw new Error("TEST_DATABASE_URL is not set");
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

/** Distinctive once-heard themes, deliberately absent from the flat entry. */
const HELD = [
  { type: "PATTERN", label: "Deriving worth from being needed", ontologyKey: "pattern.core" },
  { type: "BELIEF", label: "opens up only when safety comes first", ontologyKey: "belief.core" },
  { type: "PATTERN", label: "rushing to discharge pressure before it builds", ontologyKey: "pattern.core" },
] as const;

/** Mundane and flat on purpose: errands, weather, dinner. No worth, no
 * safety, no pressure. Anything the model extracts toward HELD is anchoring. */
const FLAT_ENTRY =
  "Quiet Saturday. Went to the farmers market in the morning and bought " +
  "tomatoes, basil, and a loaf of sourdough. The weather was mild so I walked " +
  "the long way home past the canal. In the afternoon I fixed the squeaky " +
  "hinge on the kitchen cabinet and repotted the rosemary. Made pasta for " +
  "dinner and watched a documentary about lighthouses. In bed by ten.";

async function main(): Promise<void> {
  const user = await prisma.user.create({ data: { role: "INDIVIDUAL", ageVerified: true } });
  const now = new Date();
  try {
    // Seed the held themes as real shadow rows (synthetic prior sources —
    // the join guard compares IDs only, and nothing here should join anyway).
    for (const [i, h] of HELD.entries()) {
      await prisma.shadowCandidate.create({
        data: {
          userId: user.id,
          candidateKey: `${h.type}::${normalizeQuote(h.label)}`,
          kind: "node",
          type: h.type,
          label: h.label,
          ontologyKey: h.ontologyKey,
          provenance: "EXTRACTED",
          timesSeen: 1,
          distinctSources: 1,
          waitingReason: "BELOW_MATERIALIZATION_THRESHOLD",
          evidenceCache: [
            {
              sourceEventId: `canary-prior-${i}`,
              quote: h.label,
              spanStart: 0,
              spanEnd: h.label.length,
              occurredAt: new Date(now.getTime() - 7 * 86_400_000).toISOString(),
              authorship: "SELF",
              role: "SUPPORT",
              polarity: "SUPPORTING",
              conferring: true,
              normalizationVersion: "v1",
            },
          ],
        },
      });
    }
    await prisma.sourceEvent.create({
      data: {
        userId: user.id,
        kind: "JOURNAL_TEXT",
        content: FLAT_ENTRY,
        authorship: "SELF",
        occurredAt: now,
      },
    });

    const pass = await runExtractionPass(prisma, { userId: user.id, now });
    if (!pass.ok) throw new Error(`pass refused: ${pass.reason}`);

    const proposals = await prisma.proposal.findMany({ where: { runId: pass.runId } });
    const heldNormalized = new Map(HELD.map((h) => [normalizeQuote(h.label), h.label]));

    const forcedReuse: string[] = [];
    const warnings: string[] = [];
    for (const p of proposals) {
      const label = (p.payload as { label?: string }).label;
      if (!label) continue;
      const norm = normalizeQuote(label);
      if (heldNormalized.has(norm)) {
        forcedReuse.push(`[${p.outcome}] "${label}" — exact reuse of a held theme`);
        continue;
      }
      for (const h of HELD) {
        const sim = labelJaccard(label, h.label);
        if (sim >= 0.5) {
          warnings.push(`[${p.outcome}] "${label}" ~ held "${h.label}" (jaccard ${sim.toFixed(2)})`);
        }
      }
    }

    // A join is reuse even if the proposal row is worded differently.
    // Freshly minted shadow entries from the flat entry are FINE (the model
    // may hear something mundane, timesSeen=1); an entry at timesSeen>1
    // means the flat entry JOINED a held theme — anchoring through the gate.
    const joinedHeld = (
      await prisma.shadowCandidate.findMany({ where: { userId: user.id, kind: "node" } })
    ).filter((s) => s.timesSeen > 1);

    const passClean = forcedReuse.length === 0 && joinedHeld.length === 0;
    const report = {
      ranAt: now.toISOString(),
      promptVersion: (await prisma.extractionRun.findUnique({ where: { id: pass.runId } }))
        ?.promptVersion,
      heldLabels: HELD.map((h) => h.label),
      proposals: proposals.length,
      forcedReuse,
      joinedHeld: joinedHeld.map((s) => `"${s.label}" timesSeen=${s.timesSeen}`),
      warnings,
      verdict: passClean ? "CLEAN" : "ANCHORING_DETECTED",
    };
    const dir = join(process.cwd(), "eval", "reports");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `anchoring-canary-${now.toISOString().replace(/[:.]/g, "-")}.json`);
    writeFileSync(file, JSON.stringify(report, null, 2));

    console.log(`proposals from flat entry: ${proposals.length}`);
    for (const w of warnings) console.log(`  WARN ${w}`);
    console.log(`\nANCHORING CANARY ${report.verdict} — audit: ${file}`);
    if (!passClean) {
      for (const f of forcedReuse) console.error(`  FORCED REUSE: ${f}`);
      for (const j of report.joinedHeld) console.error(`  JOINED HELD THEME: ${j}`);
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
