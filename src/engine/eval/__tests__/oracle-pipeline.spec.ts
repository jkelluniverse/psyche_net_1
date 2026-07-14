// INSTRUMENT CALIBRATION: the entire ground-truth corpus through the FULL
// persisted path — proposer wrapper → gate → writer → Postgres → loaders →
// scorer — with the ORACLE as the model (it answers with exactly the hand
// labels). Perfect input must score exactly 1.0 on every headline number:
// any deviation is a bug in the corpus, the pipeline, the writer, or the
// scorer, and would silently corrupt every future fidelity measurement of a
// real model. This is the go/no-go instrument's own go/no-go.
//
// Needs a migrated Postgres via TEST_DATABASE_URL; skips visibly otherwise.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { parseCorpus, requireValidCorpus } from "../corpus";
import { oracleModel, runCorpusCase } from "../harness";
import { aggregate } from "../scorer";
import type { CaseRunResult } from "../harness";

const DB_URL = process.env.TEST_DATABASE_URL;
const suite = DB_URL ? describe : describe.skip;
if (!DB_URL) {
  // eslint-disable-next-line no-console
  console.warn("oracle-pipeline suite SKIPPED: TEST_DATABASE_URL not set (needs migrated Postgres)");
}

const prisma = DB_URL ? new PrismaClient({ datasources: { db: { url: DB_URL } } }) : (null as never);
const NOW = new Date("2026-07-01T12:00:00.000Z");

const corpus = parseCorpus(
  JSON.parse(readFileSync(join(__dirname, "../../../../eval/corpus/corpus.json"), "utf8")),
);

suite("oracle calibration — hand labels through the full persisted path score exactly 1.0", () => {
  const results: CaseRunResult[] = [];

  beforeAll(async () => {
    await prisma.$connect();
    // fresh slate (FK order matters)
    await prisma.hypothesisEvidenceLink.deleteMany();
    await prisma.hypothesisConfirmation.deleteMany();
    await prisma.matcherRun.deleteMany();
    await prisma.proposal.deleteMany();
    await prisma.extractionRun.deleteMany();
    await prisma.evidence.deleteMany();
    await prisma.psycheEdge.deleteMany();
    await prisma.psycheNode.deleteMany();
    await prisma.shadowCandidate.deleteMany();
    await prisma.sourceEvent.deleteMany();
    await prisma.chartImport.deleteMany();
    await prisma.practitionerClient.deleteMany();
    await prisma.user.deleteMany();

    for (const c of requireValidCorpus(corpus)) {
      results.push(await runCorpusCase(prisma, c, (ids) => oracleModel(c, ids), NOW, "oracle"));
    }
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("every proposer run completes", () => {
    expect(results.map((r) => r.proposerStatus)).toEqual(results.map(() => "complete"));
  });

  it("node recall is exactly 1 (every hand-labeled expectation materializes)", () => {
    const agg = aggregate(results.map((r) => r.score));
    expect(agg.nodeRecall.rate).toBe(1);
  });

  it("node and edge precision are exactly 1 (the oracle invents nothing)", () => {
    const agg = aggregate(results.map((r) => r.score));
    expect(agg.nodePrecision.rate).toBe(1);
    expect(agg.edgePrecision.rate).toBe(1);
    expect(agg.edgeRecall.rate).toBe(1);
  });

  it("citation precision is exactly 1 (every hand-labeled span survives the real gate)", () => {
    const agg = aggregate(results.map((r) => r.score));
    expect(agg.citationPrecision.rate).toBe(1);
  });

  it("semantic entailment is exactly 1 (persisted canonical quotes still match their labels)", () => {
    const agg = aggregate(results.map((r) => r.score));
    expect(agg.semanticEntailment.rate).toBe(1);
  });

  it("no forbidden label surfaces anywhere and flat cases stay empty", () => {
    const agg = aggregate(results.map((r) => r.score));
    expect(agg.forbiddenViolations).toEqual([]);
    expect(agg.flatFalseMaterializations).toBe(0);
  });

  it("every case carries the full version stamp set (replayable, auditable)", () => {
    for (const r of results) {
      for (const [k, v] of Object.entries(r.versions)) {
        expect(v, `version field ${k}`).toBeTruthy();
      }
    }
  });
});
