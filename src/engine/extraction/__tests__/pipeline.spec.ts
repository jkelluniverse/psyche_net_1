// PRODUCTION PIPELINE KEYSTONES — the two deferred hardenings, done.
//
// 1. THE MONEY SHOT THROUGH THE REAL PATH (test 7a/13): journal sources →
//    runExtractionPass with a scripted oracle CallModel → REAL wrapper
//    (blinded context, live-shaped policy) → citation gate → graph writer →
//    matcher trigger PASS → the ghost charges. ZERO directly-created
//    PsycheNode/Evidence rows: every graph row enters through the writer
//    (writeGateResult for extracted; writeLensGhosts via importChart for
//    lens) — this suite never calls psycheNode.create or evidence.create.
//
// 2. BYTE-IDENTITY (test 7, last clause): the proposer's serialized context
//    is byte-identical before and after a matcher run. The serializer is
//    deterministic and allowlist-based — this is the leak tripwire that
//    proves matcher activity is structurally invisible to the extractor
//    (blinding survives the matcher, not just the loader).
//
// Needs a migrated Postgres via TEST_DATABASE_URL; skips visibly otherwise.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GATE_CONFIG_V1 } from "../../citation-gate/config";
import { buildEvidencePanel } from "../../evidence-panel/snippets";
import { MATCHER_CONFIG_V1 } from "../../hypothesis-match/config";
import { runMatcherForUser } from "../../hypothesis-match/matcher";
import { importChart } from "../../lens/import-chart";
import { buildOntologyView } from "../../ontology/view";
import {
  buildBlindedContext,
  serializeExtractionContext,
} from "../../proposer/context";
import type { CallModel, ProposerInput } from "../../proposer/types";
import { loadSkyGraph } from "../../sky-projection/load-sky";
import { livePolicyFor } from "../live-policy";
import { runExtractionPass } from "../run-pass";

const DB_URL = process.env.TEST_DATABASE_URL;
const suite = DB_URL ? describe : describe.skip;
if (!DB_URL) {
  // eslint-disable-next-line no-console
  console.warn("extraction pipeline suite SKIPPED: TEST_DATABASE_URL not set");
}
const prisma = DB_URL
  ? new PrismaClient({ datasources: { db: { url: DB_URL } } })
  : (null as never);

const NOW = new Date("2026-07-15T12:00:00.000Z");
const KEY = "pattern.deep-feeling-needs-safety";
const QUOTE = "I only open up when I feel completely safe first";
const CHART = {
  human_design: {
    type: "Manifesting Generator",
    authority: "Emotional",
    defined_centers: ["Sacral", "Solar Plexus", "Throat"],
  },
  natal: { sun_sign: "Leo", moon_sign: "Pisces", ascendant_sign: "Aries" },
};
const BIRTH = {
  birthDate: "1990-04-12",
  birthTime: "14:32",
  birthPlace: "Portland, OR, USA",
  tzResolved: "America/Los_Angeles",
};

/** Scripted proposer: proposes ONE pattern candidate citing the real quotes
 * in the real sources — the wrapper, gate, writer, and matcher are all live. */
function oracle(sourceIds: string[]): CallModel {
  const output = {
    nodes: [
      {
        tempId: "oracle-safety",
        type: "PATTERN",
        label: "opens up only when safety comes first",
        ontologyKey: KEY,
        inferenceDistance: "DIRECT_DECLARATION",
        evidence: sourceIds.map((id) => ({
          sourceEventId: id,
          quote: QUOTE,
          role: "SUPPORT",
          polarity: "SUPPORTING",
        })),
      },
    ],
    edges: [],
  };
  return async () => JSON.stringify(output);
}

async function mkUserWithJournal(): Promise<{ userId: string; sourceIds: string[] }> {
  const user = await prisma.user.create({
    data: { role: "INDIVIDUAL", ageVerified: true },
  });
  const sourceIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const content = `Entry ${i}. ${QUOTE}. It has always been like this.`;
    const row = await prisma.sourceEvent.create({
      data: {
        userId: user.id,
        kind: "JOURNAL_TEXT",
        content,
        authorship: "SELF",
        occurredAt: new Date(NOW.getTime() - (i + 1) * 86_400_000),
      },
    });
    sourceIds.push(row.id);
  }
  return { userId: user.id, sourceIds };
}

suite("production pipeline — real wrapper → gate → writer → matcher", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
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
  });

  it("MONEY SHOT, zero direct rows: journal → pass → node materializes → ghost charges → panel shows the dated snippet", async () => {
    const { userId, sourceIds } = await mkUserWithJournal();

    // The chart first (ghost sky exists, all HYPOTHESIS).
    const imported = await importChart(prisma, {
      userId,
      system: "human_design",
      provider: "astrology-api.io",
      birth: BIRTH,
      rawChart: CHART,
      now: NOW,
    });
    expect(imported.ok).toBe(true);
    const ghostBefore = await prisma.psycheNode.findFirstOrThrow({
      where: { userId, provenance: "LENS", ontologyKey: KEY },
    });
    expect(ghostBefore.state).toBe("HYPOTHESIS");

    // The REAL pass: wrapper (blinded context, live policy), gate, writer,
    // matcher — the only fake is the model text, which cites real quotes.
    const result = await runExtractionPass(prisma, {
      userId,
      now: NOW,
      callModel: oracle(sourceIds),
      model: "oracle",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposerStatus).toBe("complete");
    expect(result.sourcesExtracted).toBe(2);

    // The node MATERIALIZED through the gate + writer (never created here).
    const extracted = await prisma.psycheNode.findFirstOrThrow({
      where: { userId, provenance: "EXTRACTED", ontologyKey: KEY },
    });
    expect(extracted.mass).toBeGreaterThan(0);
    expect(extracted.state).toBe("ACTIVE");
    const evidence = await prisma.evidence.findMany({
      where: { nodeId: extracted.id },
    });
    expect(evidence).toHaveLength(2);
    for (const e of evidence) {
      expect(e.validated).toBe(true); // the gate's stamp — insertion-impossible otherwise
      expect(e.quote).toBe(QUOTE);
    }

    // The ghost CHARGED via matcher trigger 1 (PASS:<runId>).
    const ghost = await prisma.psycheNode.findUniqueOrThrow({
      where: { id: ghostBefore.id },
    });
    expect(ghost.state).toBe("ACTIVE");
    expect(ghost.mass).toBeGreaterThan(0);
    expect(result.matcher?.linksCreated).toBe(2);
    const run = await prisma.matcherRun.findFirstOrThrow({
      where: { userId, trigger: `PASS:${result.runId}` },
    });
    expect(run.matchRuleVersion).toBe(MATCHER_CONFIG_V1.matchRuleVersion);

    // The sky tells it: merged evidence + the match-link overlay.
    const graph = await loadSkyGraph(prisma, userId, NOW);
    const ghostView = graph.nodes.find((n) => n.id === ghost.id)!;
    expect(ghostView.effectiveEvidence).toHaveLength(2);
    expect(
      graph.matchLinks.find(
        (l) => l.lensNodeId === ghost.id && l.extractedNodeId === extracted.id,
      ),
    ).toBeTruthy();

    // And the panel shows the person's DATED words — sliced, not echoed.
    const rows = await prisma.evidence.findMany({
      where: { id: { in: evidence.map((e) => e.id) } },
      include: {
        sourceEvent: {
          select: { content: true, authorship: true, invalidatedAt: true },
        },
      },
    });
    const panel = buildEvidencePanel(
      rows.map((e) => ({
        evidenceId: e.id,
        quote: e.quote,
        spanStart: e.spanStart,
        spanEnd: e.spanEnd,
        occurredAt: e.occurredAt,
        polarity: e.polarity,
        role: e.role,
        authorship: e.sourceEvent.authorship,
        sourceInvalidatedAt: e.sourceEvent.invalidatedAt,
        content: e.sourceEvent.content,
      })),
      "PATTERN",
    );
    expect(panel.entries).toHaveLength(2);
    for (const entry of panel.entries) {
      expect(entry.status).toBe("ok");
      if (entry.status === "ok") {
        expect(entry.snippet).toBe(QUOTE);
        expect(entry.occurredAt).toBeTruthy(); // temporal honesty: the date rides along
      }
    }
  });

  it("BYTE-IDENTITY: the proposer's serialized context is identical before and after a matcher run", async () => {
    const { userId, sourceIds } = await mkUserWithJournal();
    await importChart(prisma, {
      userId,
      system: "human_design",
      provider: "astrology-api.io",
      birth: BIRTH,
      rawChart: CHART,
      now: NOW,
    });
    // Materialize the extracted node through the real pass.
    const pass = await runExtractionPass(prisma, {
      userId,
      now: NOW,
      callModel: oracle(sourceIds),
      model: "oracle",
    });
    expect(pass.ok).toBe(true);

    const buildInput = async (): Promise<ProposerInput> => {
      const rows = await prisma.sourceEvent.findMany({
        where: { userId, invalidatedAt: null },
        orderBy: { id: "asc" },
      });
      // The candidate list deliberately includes EVERY provenance — the
      // wrapper's blinding filter is what must hold, not caller courtesy.
      const nodes = await prisma.psycheNode.findMany({
        where: { userId, archivedAt: null },
        orderBy: { id: "asc" },
      });
      return {
        sources: rows.map((r) => ({
          id: r.id,
          content: r.content,
          authorship: "SELF" as const,
          occurredAt: r.occurredAt,
          invalidatedAt: r.invalidatedAt,
        })),
        priorNodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          provenance: n.provenance,
          label: n.label,
          ontologyKey: n.ontologyKey ?? undefined,
        })),
        ontology: buildOntologyView(),
        policy: await livePolicyFor(prisma, userId),
        runId: "byte-identity-probe",
      };
    };

    const before = serializeExtractionContext(buildBlindedContext(await buildInput()));

    // A full matcher run: links written, ghosts recomputed, states moved.
    await prisma.$transaction((tx) =>
      runMatcherForUser(tx, {
        userId,
        trigger: "IMPORT_REMAP",
        config: { ...MATCHER_CONFIG_V1, mode: "SOLO" },
        gateConfig: { ...GATE_CONFIG_V1, mode: "SOLO" },
        now: new Date(NOW.getTime() + 60_000),
      }),
    );

    const after = serializeExtractionContext(buildBlindedContext(await buildInput()));
    expect(after).toBe(before); // byte-identical — matcher activity is invisible to the extractor
  });
});
