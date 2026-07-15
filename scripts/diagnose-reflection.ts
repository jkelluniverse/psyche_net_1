// REFLECTION-PASS DIAGNOSIS — read-only. Prints the exact outcome chain for
// a user's extraction runs: what the proposer emitted, what the gate
// accepted/rejected, what landed in shadow vs materialized, and what the
// matcher did. Run where DATABASE_URL points at the target DB (e.g. the
// Railway service shell):
//
//   SEED_EMAIL="you@example.com" npx tsx scripts/diagnose-reflection.ts

import { PrismaClient } from "@prisma/client";
import { GATE_CONFIG_V1 } from "../src/engine/citation-gate/config";

const prisma = new PrismaClient();
const email = process.env.SEED_EMAIL;
if (!email) {
  console.error("Set SEED_EMAIL to the account to diagnose.");
  process.exit(1);
}

async function main(): Promise<void> {
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    console.log(`No user for ${email}.`);
    return;
  }
  console.log(`user ${user.id} (${email})\n`);

  const sources = await prisma.sourceEvent.findMany({
    where: { userId: user.id, authorship: "SELF", invalidatedAt: null },
    orderBy: { ingestedAt: "asc" },
    select: { id: true, kind: true, occurredAt: true, ingestedAt: true },
  });
  console.log(`SELF sources: ${sources.length}`);
  for (const s of sources) {
    console.log(`  ${s.id} ${s.kind} occurred=${s.occurredAt.toISOString()}`);
  }

  const runs = await prisma.extractionRun.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "asc" },
    include: { proposals: true },
  });
  console.log(`\nExtractionRuns: ${runs.length}`);
  for (const r of runs) {
    console.log(
      `\n  run ${r.id}\n    status=${r.status} model=${r.model} prompt=${r.promptVersion} attempts=${r.attempts} started=${r.startedAt.toISOString()}`,
    );
    const byOutcome: Record<string, number> = {};
    for (const p of r.proposals) byOutcome[p.outcome] = (byOutcome[p.outcome] ?? 0) + 1;
    console.log(`    proposals: ${JSON.stringify(byOutcome)}`);
    for (const p of r.proposals) {
      const payload = p.payload as { label?: string; type?: string; ontologyKey?: string };
      console.log(
        `      [${p.outcome}] ${p.kind} type=${payload.type ?? "?"} key=${payload.ontologyKey ?? "-"} "${(payload.label ?? "").slice(0, 60)}"${p.rejectionReason ? ` — ${p.rejectionReason}` : ""}`,
      );
    }
  }

  const shadow = await prisma.shadowCandidate.findMany({ where: { userId: user.id } });
  console.log(
    `\nShadowCandidates: ${shadow.length} (materialization needs ${GATE_CONFIG_V1.materialization.minConferringSpans} spans across ${GATE_CONFIG_V1.materialization.minDistinctSources} distinct sources)`,
  );
  for (const s of shadow) {
    // Pass attribution: which run window this candidate was minted in.
    const mintedBy = runs.find(
      (r, i) =>
        s.createdAt >= r.startedAt &&
        (i + 1 >= runs.length || s.createdAt < runs[i + 1].startedAt),
    );
    console.log(
      `  ${s.candidateKey}\n    waiting=${s.waitingReason} timesSeen=${s.timesSeen} distinctSources=${s.distinctSources} created=${s.createdAt.toISOString()} mintedByRun=${mintedBy?.id ?? "?"} lastSeen=${s.lastSeen.toISOString()}`,
    );
  }
  const accumulated = shadow.filter((s) => s.timesSeen > 1).length;
  console.log(
    `\nACCUMULATION: ${accumulated}/${shadow.length} candidates have timesSeen > 1` +
      (accumulated === 0 && runs.length > 1
        ? " — ZERO cross-pass accumulation despite multiple passes (candidate-identity finding)"
        : ""),
  );

  const nodes = await prisma.psycheNode.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: [{ provenance: "asc" }, { mass: "desc" }],
  });
  console.log(`\nActive nodes: ${nodes.length}`);
  for (const n of nodes) {
    console.log(
      `  [${n.provenance}/${n.type}] "${n.label.slice(0, 50)}" key=${n.ontologyKey ?? "-"} mass=${n.mass.toFixed(3)} ${n.state}`,
    );
  }

  const matcherRuns = await prisma.matcherRun.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nMatcherRuns: ${matcherRuns.length}`);
  for (const m of matcherRuns) {
    const links = await prisma.hypothesisEvidenceLink.count({ where: { runId: m.id } });
    const transitions = (m.transitions as { from: string; to: string }[]).filter(
      (t) => t.from !== t.to,
    );
    console.log(
      `  ${m.trigger} at ${m.createdAt.toISOString()}: linksCreated=${links} stateChanges=${transitions.length}`,
    );
  }

  // The one-line verdict the walk needs.
  const lastRun = runs[runs.length - 1];
  if (!lastRun) {
    console.log(
      "\nVERDICT: no ExtractionRun exists — the pass never started (missing ANTHROPIC_API_KEY throws before the run row, or Reflect was never tapped).",
    );
  } else if (lastRun.status !== "complete") {
    console.log(`\nVERDICT: last run ended status=${lastRun.status} — the pass failed mid-flight; sources remain eligible for retry.`);
  } else {
    const accepted = lastRun.proposals.filter((p) => p.outcome === "accepted").length;
    const shadowed = lastRun.proposals.filter((p) => p.outcome === "shadow").length;
    if (accepted === 0 && shadowed > 0) {
      console.log(
        `\nVERDICT: the pass ran clean — ${shadowed} candidate(s) heard, ALL shadow-held (below the ${GATE_CONFIG_V1.materialization.minDistinctSources}-source materialization threshold). Nothing was lost; they surface when their theme recurs.`,
      );
    } else {
      console.log(`\nVERDICT: last run accepted=${accepted}, shadow=${shadowed} — see chain above.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
