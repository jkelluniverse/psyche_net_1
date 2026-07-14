// Extraction-fidelity runner (proposer spec §13 test 13; CLAUDE.md testing
// expectations): the ground-truth corpus through the FULL PERSISTED PATH —
// proposer → gate → writer → Postgres → loaders → scorer — reporting
// CITATION PRECISION and SEMANTIC ENTAILMENT as separate numbers, per node
// type and per edge type, with every algorithm/rule version stamped.
// Re-run before promoting any prompt or model change; the report is the
// record.
//
// Usage:
//   EVAL_DATABASE_URL=postgres://…  npx tsx scripts/run-eval.ts --mode oracle
//   EVAL_DATABASE_URL=…  ANTHROPIC_API_KEY=…  npx tsx scripts/run-eval.ts --mode live [--model claude-…]
//
// Modes:
//   oracle — deterministic proposer built from the hand labels. Calibrates
//            the instrument (must score 1.0 across the board; also enforced
//            in CI-adjacent form by oracle-pipeline.spec.ts). No API key.
//   live   — the real model via the Anthropic adapter. THE measurement.
//
// The database is a scratch/eval database: the runner creates a fresh user
// per case and never deletes anything it didn't create. Do NOT point it at
// production.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { coverageReport, parseCorpus, requireValidCorpus } from "../src/engine/eval/corpus";
import { oracleModel, runCorpusCase } from "../src/engine/eval/harness";
import type { CaseRunResult } from "../src/engine/eval/harness";
import { aggregate, SCORER_VERSION } from "../src/engine/eval/scorer";
import type { Fraction } from "../src/engine/eval/types";
import {
  ANTHROPIC_ADAPTER_DEFAULTS,
  buildAnthropicCaller,
} from "../src/engine/proposer/adapters/anthropic";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const fmt = (f: Fraction): string =>
  f.rate === null ? "  n/a (0 denom)" : `${f.rate.toFixed(3)} (${f.numerator}/${f.denominator})`;

async function main(): Promise<void> {
  const mode = (arg("mode") ?? "oracle") as "oracle" | "live";
  if (mode !== "oracle" && mode !== "live") throw new Error(`unknown --mode ${mode}`);

  const dbUrl = process.env.EVAL_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  if (!dbUrl) throw new Error("set EVAL_DATABASE_URL (a scratch/eval database — never production)");

  const modelName = arg("model") ?? ANTHROPIC_ADAPTER_DEFAULTS.model;
  let liveCaller: ReturnType<typeof buildAnthropicCaller> | null = null;
  if (mode === "live") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("live mode needs ANTHROPIC_API_KEY");
    liveCaller = buildAnthropicCaller({
      apiKey,
      model: modelName,
      maxTokens: ANTHROPIC_ADAPTER_DEFAULTS.maxTokens,
    });
  }

  const corpusPath = join(__dirname, "../eval/corpus/corpus.json");
  const corpus = parseCorpus(JSON.parse(readFileSync(corpusPath, "utf8")));
  const cases = requireValidCorpus(corpus);
  const coverage = coverageReport(corpus);
  if (coverage.shortfalls.length > 0) {
    // Report, don't refuse — an in-progress corpus still yields honest numbers,
    // but the shortfall must be in the record, never silent (no silent caps).
    console.warn(`corpus below spec floors:\n- ${coverage.shortfalls.join("\n- ")}`);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const now = new Date();
  const results: CaseRunResult[] = [];
  try {
    for (const c of cases) {
      process.stdout.write(`  ${c.id} … `);
      const r = await runCorpusCase(
        prisma,
        c,
        (idByKey) => (mode === "oracle" ? oracleModel(c, idByKey) : liveCaller!),
        now,
        mode === "oracle" ? "oracle" : modelName,
      );
      results.push(r);
      console.log(
        `${r.proposerStatus} · recall ${fmt(r.score.nodeRecall)} · citation ${fmt(r.score.citationPrecision)} · entailment ${fmt(r.score.semanticEntailment)}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }

  const agg = aggregate(results.map((r) => r.score));
  const versions = results[0]?.versions;
  const report = {
    generatedAt: now.toISOString(),
    mode,
    model: mode === "oracle" ? "oracle" : modelName,
    corpusVersion: corpus.corpusVersion,
    scorerVersion: SCORER_VERSION,
    ...versions,
    coverage: {
      entriesPerNodeType: coverage.entriesPerNodeType,
      entriesPerEdgeType: coverage.entriesPerEdgeType,
      casesPerCategory: coverage.casesPerCategory,
      shortfalls: coverage.shortfalls,
    },
    aggregate: agg,
    perCase: results.map((r) => ({ ...r.score, proposerStatus: r.proposerStatus })),
  };

  const reportsDir = join(__dirname, "../eval/reports");
  mkdirSync(reportsDir, { recursive: true });
  const file = join(
    reportsDir,
    `fidelity-${mode}-${now.toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(file, JSON.stringify(report, null, 2));

  console.log(`\n== fidelity (${mode}, ${report.model}) — corpus ${corpus.corpusVersion} ==`);
  console.log(`node recall              ${fmt(agg.nodeRecall)}`);
  console.log(`node recall (incl shadow)${fmt(agg.nodeRecallIncludingShadow)}`);
  console.log(`node precision           ${fmt(agg.nodePrecision)}`);
  console.log(`edge recall              ${fmt(agg.edgeRecall)}`);
  console.log(`edge precision           ${fmt(agg.edgePrecision)}`);
  console.log(`CITATION PRECISION       ${fmt(agg.citationPrecision)}`);
  console.log(`SEMANTIC ENTAILMENT      ${fmt(agg.semanticEntailment)}`);
  console.log(`forbidden violations     ${agg.forbiddenViolations.length}`);
  console.log(`flat false materializations ${agg.flatFalseMaterializations}`);
  console.log(`\nper node type:`);
  for (const [t, b] of Object.entries(agg.perNodeType)) {
    console.log(
      `  ${t.padEnd(11)} citation ${fmt(b.citation)} · entailment ${fmt(b.entailment)} · matched ${b.matched}/${b.expected}`,
    );
  }
  console.log(`per edge type:`);
  for (const [t, b] of Object.entries(agg.perEdgeType)) {
    console.log(
      `  ${t.padEnd(13)} citation ${fmt(b.citation)} · entailment ${fmt(b.entailment)} · matched ${b.matched}/${b.expected}`,
    );
  }
  if (agg.forbiddenViolations.length > 0) {
    console.log(`\nFORBIDDEN LEAKS:`);
    for (const v of agg.forbiddenViolations) {
      console.log(`  [${v.caseId}] (${v.layer}) "${v.label}" — ${v.reason}`);
    }
  }
  console.log(`\nreport → ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
