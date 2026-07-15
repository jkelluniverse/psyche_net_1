// ONE-TIME SHADOW-IDENTITY BACKFILL (ruling #4, 2026-07-15) — re-key/merge
// the persisted shadow buffer under candidate identity v2, so once-heard
// themes that sat as strangers under the old label-hash keys can meet the
// next entry as one candidate ("his live sky is the first beneficiary or the
// fix isn't real").
//
// DRY-RUN BY DEFAULT. Nothing is written without --apply. Every run —
// including dry runs — writes a full audit report to eval/reports/.
//
//   # inspect (all users):
//   npx tsx scripts/backfill-shadow-identity.ts
//   # apply:
//   npx tsx scripts/backfill-shadow-identity.ts --apply
//   # scope to one account:
//   SEED_EMAIL="you@example.com" npx tsx scripts/backfill-shadow-identity.ts --apply
//
// Run where DATABASE_URL points at the target DB (e.g. the Railway shell).
// The plan is pure and deterministic (src/engine/citation-gate/
// backfill-identity.ts, fully unit-tested); this wrapper only loads rows,
// applies the plan transactionally per user, and writes the report. It NEVER
// materializes a node — a merged cluster that already meets the threshold is
// flagged in the report and materializes through the gate on the next pass.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import type { VerifiedEvidence } from "../src/engine/contracts/extraction-contracts";
import {
  planShadowBackfill,
  type BackfillPlan,
  type ShadowRow,
} from "../src/engine/citation-gate/backfill-identity";
import { GATE_CONFIG_V1 } from "../src/engine/citation-gate/config";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const EMAIL = process.env.SEED_EMAIL;

async function loadRows(userId: string): Promise<ShadowRow[]> {
  const rows = await prisma.shadowCandidate.findMany({ where: { userId } });
  return rows.map((r) => ({
    id: r.id,
    candidateKey: r.candidateKey,
    kind: r.kind,
    type: r.type,
    label: r.label,
    ontologyKey: r.ontologyKey,
    provenance: r.provenance,
    timesSeen: r.timesSeen,
    distinctSources: r.distinctSources,
    waitingReason: r.waitingReason,
    inferenceDistance: r.inferenceDistance,
    createdAt: r.createdAt,
    lastSeen: r.lastSeen,
    evidenceCache: (r.evidenceCache as Array<Record<string, unknown>>).map((e) => ({
      ...(e as unknown as VerifiedEvidence),
      occurredAt: new Date(e.occurredAt as string),
    })),
  }));
}

async function applyPlan(userId: string, plan: BackfillPlan): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const m of plan.merges) {
      // Delete first: the survivor may take a key an absorbed row holds
      // (unique (userId, candidateKey)).
      await tx.shadowCandidate.deleteMany({ where: { id: { in: m.absorbedIds } } });
      await tx.shadowCandidate.update({
        where: { id: m.survivorId },
        data: {
          candidateKey: m.after.candidateKey,
          label: m.after.label,
          ontologyKey: m.after.ontologyKey,
          timesSeen: m.after.timesSeen,
          distinctSources: m.after.distinctSources,
          waitingReason: m.after.waitingReason,
          inferenceDistance: m.after.inferenceDistance,
          lastSeen: m.after.lastSeen,
          evidenceCache: m.after.evidenceCache as never,
        },
      });
    }
    for (const rk of plan.rekeys) {
      await tx.shadowCandidate.update({
        where: { id: rk.id },
        data: { candidateKey: rk.to },
      });
    }
  });
}

async function main(): Promise<void> {
  let userIds: string[];
  if (EMAIL) {
    const user = await prisma.user.findFirst({ where: { email: EMAIL } });
    if (!user) {
      console.error(`No user for ${EMAIL}.`);
      process.exit(1);
    }
    userIds = [user.id];
  } else {
    const grouped = await prisma.shadowCandidate.groupBy({ by: ["userId"] });
    userIds = grouped.map((g) => g.userId).sort();
  }

  const report: {
    ranAt: string;
    applied: boolean;
    identityVersion: string;
    gateVersion: string;
    users: { userId: string; rows: number; plan: BackfillPlan }[];
  } = {
    ranAt: new Date().toISOString(),
    applied: APPLY,
    identityVersion: GATE_CONFIG_V1.candidateIdentity.identityVersion,
    gateVersion: GATE_CONFIG_V1.gateVersion,
    users: [],
  };

  for (const userId of userIds) {
    const rows = await loadRows(userId);
    const plan = planShadowBackfill(rows, GATE_CONFIG_V1);
    report.users.push({ userId, rows: rows.length, plan });

    console.log(
      `user ${userId}: ${rows.length} shadow row(s) → ${plan.merges.length} merge(s), ${plan.rekeys.length} rekey(s), ${plan.untouched} untouched, ${plan.edgesSkipped} edge(s) skipped`,
    );
    for (const m of plan.merges) {
      console.log(`  MERGE [${m.reason}] → "${m.after.label}" (${m.after.candidateKey})`);
      for (const b of m.before) {
        console.log(
          `    ${b.id === m.survivorId ? "keep " : "merge"} "${b.label}" key=${b.ontologyKey ?? "-"} seen=${b.timesSeen} spans=${b.spans}`,
        );
      }
      console.log(
        `    after: seen=${m.after.timesSeen} sources=${m.after.distinctSources} spans=${m.after.evidenceCache.length}${m.after.meetsThresholdNow ? " — MEETS THRESHOLD (will materialize on next pass)" : ""}`,
      );
    }
    for (const rk of plan.rekeys) console.log(`  REKEY ${rk.from} → ${rk.to}`);

    if (APPLY && (plan.merges.length > 0 || plan.rekeys.length > 0)) {
      await applyPlan(userId, plan);
      console.log(`  applied.`);
    }
  }

  const dir = join(process.cwd(), "eval", "reports");
  mkdirSync(dir, { recursive: true });
  const file = join(
    dir,
    `backfill-shadow-identity-${report.ranAt.replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN (no writes; pass --apply)"} — audit: ${file}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
