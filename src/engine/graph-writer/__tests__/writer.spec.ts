// THE GRAPH WRITER SUITE — tests written before the implementation.
//
// The writer is the ProjectionWriter of the pipeline (master concept §4.3):
// GateResult → Postgres, per the outcome mapping in gate spec v1.6 §7. It is
// the ONLY code that writes graph state, and everything it writes has passed
// the gate — the DB CHECK constraints (validated=true; exactly-one-target)
// are the last structural backstop and are exercised live here.
//
// This suite needs a real Postgres: set TEST_DATABASE_URL (migrations
// applied). Without it the suite SKIPS — visibly, never silently green.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { runProposer } from "../../proposer/proposer";
import { gate } from "../../citation-gate/gate";
import { writeGateResult, loadGraphSnapshot, loadShadowBuffer } from "../writer";
import type { SourceRecord } from "../../contracts/extraction-contracts";
import { input, stubModel } from "../../proposer/__tests__/fixtures";

const DB_URL = process.env.TEST_DATABASE_URL;
const NOW = new Date("2026-07-01T12:00:00.000Z");

const suite = DB_URL ? describe : describe.skip;
if (!DB_URL) {
  // eslint-disable-next-line no-console
  console.warn("graph-writer suite SKIPPED: TEST_DATABASE_URL not set (needs migrated Postgres)");
}

const prisma = DB_URL ? new PrismaClient({ datasources: { db: { url: DB_URL } } }) : (null as never);

const JOURNALS: Record<string, string> = {
  e1: "I keep saying yes when I want to say no. Every single time.",
  e2: "Again today: I said yes to covering her shift even though I wanted to say no.",
  e3: "I protect everyone so no one sees me tired. I am so tired.",
  e4: "My partner says I work too much lately, which stung.",
};

async function seedUserAndSources(): Promise<{ userId: string; sources: Map<string, SourceRecord> }> {
  const user = await prisma.user.create({ data: { role: "INDIVIDUAL", ageVerified: true } });
  const sources = new Map<string, SourceRecord>();
  for (const [key, content] of Object.entries(JOURNALS)) {
    const row = await prisma.sourceEvent.create({
      data: { userId: user.id, kind: "JOURNAL_TEXT", content, authorship: "SELF", occurredAt: NOW },
    });
    sources.set(row.id, {
      id: row.id,
      content,
      authorship: "SELF",
      occurredAt: NOW,
      invalidatedAt: null,
    });
    // remember mapping key → real id for building model output
    (sources as never as { byKey: Record<string, string> }).byKey ??= {};
    (sources as never as { byKey: Record<string, string> }).byKey[key] = row.id;
  }
  return { userId: user.id, sources };
}
const sid = (sources: Map<string, SourceRecord>, key: string): string =>
  (sources as never as { byKey: Record<string, string> }).byKey[key];

suite("graph writer — GateResult → Prisma per the v1.6 outcome mapping", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    // fresh slate per test (order matters for FKs)
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

  it("PIPELINE KEYSTONE: raw model output → wrapper → gate → writer → persisted rows match the outcome mapping (incl. shadow + WAITING_ENDPOINT)", async () => {
    const { userId, sources } = await seedUserAndSources();
    const run = await prisma.extractionRun.create({
      data: { userId, provider: "stub", model: "stub", promptVersion: "v2", ontologyVersion: "v1", gateVersion: "v1.7", status: "running" },
    });

    const modelOutput = JSON.stringify({
      nodes: [
        // accepted: 2 spans, 2 distinct sources
        {
          tempId: "n-accept",
          type: "PATTERN",
          label: "Saying yes when I mean no",
          evidence: [
            { sourceEventId: sid(sources, "e1"), quote: "saying yes when I want to say no" },
            { sourceEventId: sid(sources, "e2"), quote: "I wanted to say no" },
          ],
        },
        // shadow (BELOW_MATERIALIZATION_THRESHOLD): single mention
        {
          tempId: "n-shadow",
          type: "PROTECTION",
          label: "Protecting everyone",
          ontologyKey: "protection.brandnew",
          evidence: [{ sourceEventId: sid(sources, "e3"), quote: "I protect everyone" }],
        },
        // shadow (HELD_HIGH_INFERENCE): recurrence met but high inference
        {
          tempId: "n-high",
          type: "SHADOW",
          label: "Terrified of abandonment",
          inferenceDistance: "HIGH_INFERENCE_INTERPRETATION",
          evidence: [
            { sourceEventId: sid(sources, "e4"), quote: "I work too much" },
            { sourceEventId: sid(sources, "e1"), quote: "Every single time" },
          ],
        },
        // gate-rejected: fabricated quote
        {
          tempId: "n-fab",
          type: "BELIEF",
          label: "Nobody values me",
          evidence: [{ sourceEventId: sid(sources, "e1"), quote: "absolutely not present words" }],
        },
        // wrapper-rejected: WOUND under SOLO policy
        {
          tempId: "n-wound",
          type: "WOUND",
          label: "Old hurt",
          evidence: [{ sourceEventId: sid(sources, "e1"), quote: "saying yes" }],
        },
      ],
      edges: [
        // WAITING_ENDPOINT: edge to the subthreshold node, evidence otherwise fine
        {
          tempId: "g-wait",
          source: { kind: "PROPOSED", tempId: "n-accept" },
          target: { kind: "PROPOSED", tempId: "n-shadow" },
          type: "REINFORCES",
          evidence: [
            { sourceEventId: sid(sources, "e3"), quote: "no one sees me tired" },
            { sourceEventId: sid(sources, "e1"), quote: "want to say no" },
          ],
        },
      ],
    });

    const stub = stubModel(modelOutput);
    const proposerResult = await runProposer(
      input({ sources: [...sources.values()], priorNodes: [] }),
      stub.call,
    );
    expect(proposerResult.status).toBe("complete");
    const gateResult = gate(proposerResult.output, sources, { nodes: [], edges: [] }, [], NOW);

    const report = await writeGateResult(prisma, {
      userId,
      runId: run.id,
      proposerOutput: proposerResult.output,
      wrapperRejections: [...proposerResult.dropped, ...proposerResult.rejectedCandidates],
      gateResult,
      loadedShadowKeys: [],
      now: NOW,
    });

    // ── Nodes: exactly the accepted one materialized ──
    const nodes = await prisma.psycheNode.findMany();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].label).toBe("Saying yes when I mean no");
    expect(nodes[0].mass).toBeGreaterThan(0);
    expect(nodes[0].state).toBe("ACTIVE");
    expect(nodes[0].gateVersion).toBe("v1.7");
    expect(report.nodeIdByTempId["n-accept"]).toBe(nodes[0].id);

    // ── Evidence: validated=true, spans slice the source (CHECKs held) ──
    const evidence = await prisma.evidence.findMany({ where: { nodeId: nodes[0].id }, include: { sourceEvent: true } });
    expect(evidence).toHaveLength(2);
    for (const ev of evidence) {
      expect(ev.validated).toBe(true);
      expect(ev.sourceEvent.content.slice(ev.spanStart, ev.spanEnd)).toBe(ev.quote);
    }

    // ── No edges materialized (the only edge is WAITING_ENDPOINT) ──
    expect(await prisma.psycheEdge.count()).toBe(0);

    // ── Shadow candidates: two node holds + one edge hold, faithful fields ──
    const shadows = await prisma.shadowCandidate.findMany({ orderBy: { candidateKey: "asc" } });
    expect(shadows).toHaveLength(3);
    const byReason = Object.fromEntries(shadows.map((s) => [s.waitingReason, s]));
    expect(byReason["BELOW_MATERIALIZATION_THRESHOLD"].kind).toBe("node");
    expect(byReason["BELOW_MATERIALIZATION_THRESHOLD"].ontologyKey).toBe("protection.brandnew");
    expect(byReason["HELD_HIGH_INFERENCE"].inferenceDistance).toBe("HIGH_INFERENCE_INTERPRETATION");
    const edgeShadow = byReason["WAITING_ENDPOINT"];
    expect(edgeShadow.kind).toBe("edge");
    expect(edgeShadow.edgeType).toBe("REINFORCES");
    expect(edgeShadow.sourceRef).toMatchObject({ kind: "MATCH_KEY" });
    expect(edgeShadow.targetRef).toMatchObject({ kind: "MATCH_KEY" });

    // ── Proposals: the v1.6 outcome mapping, exactly ──
    const proposals = await prisma.proposal.findMany({ where: { runId: run.id } });
    const outcomes = Object.fromEntries(
      proposals.map((p) => [(p.payload as { tempId: string }).tempId, p]),
    );
    expect(outcomes["n-accept"].outcome).toBe("accepted");
    expect(outcomes["n-shadow"].outcome).toBe("shadow");
    expect(outcomes["n-shadow"].rejectionReason).toBe("BELOW_MATERIALIZATION_THRESHOLD");
    expect(outcomes["n-high"].outcome).toBe("shadow");
    expect(outcomes["n-high"].rejectionReason).toBe("HELD_HIGH_INFERENCE");
    expect(outcomes["g-wait"].outcome).toBe("shadow"); // WAITING_ENDPOINT is a hold, not a rejection
    expect(outcomes["g-wait"].rejectionReason).toBe("WAITING_ENDPOINT");
    expect(outcomes["n-fab"].outcome).toBe("rejected");
    expect(outcomes["n-fab"].rejectionReason).toBe("QUOTE_NOT_FOUND");
    expect(outcomes["n-wound"].outcome).toBe("rejected");
    expect(outcomes["n-wound"].rejectionReason).toBe("NODE_TYPE_NOT_ALLOWED_BY_POLICY");
    expect(report.proposals).toEqual({ accepted: 1, rejected: 2, shadow: 3 });
  });

  it("second pass: shadow candidates promote through the persisted path (loaders → gate → writer), buffer row removed, no duplicate evidence", async () => {
    const { userId, sources } = await seedUserAndSources();
    const mkRun = () =>
      prisma.extractionRun.create({
        data: { userId, provider: "stub", model: "stub", promptVersion: "v2", ontologyVersion: "v1", gateVersion: "v1.7", status: "running" },
      });

    // Pass 1: single mention → shadow
    const run1 = await mkRun();
    const out1 = JSON.stringify({
      nodes: [
        {
          tempId: "p1",
          type: "PROTECTION",
          label: "Protecting everyone",
          evidence: [{ sourceEventId: sid(sources, "e3"), quote: "I protect everyone" }],
        },
      ],
      edges: [],
    });
    const r1 = await runProposer(input({ sources: [...sources.values()], priorNodes: [] }), stubModel(out1).call);
    const g1 = gate(r1.output, sources, await loadGraphSnapshot(prisma, userId), await loadShadowBuffer(prisma, userId), NOW);
    await writeGateResult(prisma, {
      userId, runId: run1.id, proposerOutput: r1.output,
      wrapperRejections: [...r1.dropped, ...r1.rejectedCandidates],
      gateResult: g1, loadedShadowKeys: [], now: NOW,
    });
    expect(await prisma.shadowCandidate.count()).toBe(1);
    expect(await prisma.psycheNode.count()).toBe(0);

    // Pass 2: second distinct source → promotes; buffer row leaves; evidence includes cache
    const run2 = await mkRun();
    const out2 = JSON.stringify({
      nodes: [
        {
          tempId: "p2",
          type: "PROTECTION",
          label: "Protecting everyone",
          evidence: [{ sourceEventId: sid(sources, "e4"), quote: "I work too much" }],
        },
      ],
      edges: [],
    });
    const loadedBuffer = await loadShadowBuffer(prisma, userId);
    const r2 = await runProposer(input({ sources: [...sources.values()], priorNodes: [] }), stubModel(out2).call);
    const g2 = gate(r2.output, sources, await loadGraphSnapshot(prisma, userId), loadedBuffer, NOW);
    await writeGateResult(prisma, {
      userId, runId: run2.id, proposerOutput: r2.output,
      wrapperRejections: [...r2.dropped, ...r2.rejectedCandidates],
      gateResult: g2, loadedShadowKeys: loadedBuffer.map((c) => c.candidateKey), now: NOW,
    });

    expect(await prisma.shadowCandidate.count()).toBe(0); // promoted out
    const nodes = await prisma.psycheNode.findMany();
    expect(nodes).toHaveLength(1);
    expect(await prisma.evidence.count({ where: { nodeId: nodes[0].id } })).toBe(2); // cache + new
    const p2 = await prisma.proposal.findFirst({ where: { runId: run2.id } });
    expect(p2!.outcome).toBe("accepted");

    // Pass 3: re-proposing an existing span merges WITHOUT duplicating evidence
    const run3 = await mkRun();
    const r3 = await runProposer(input({ sources: [...sources.values()], priorNodes: [] }), stubModel(out1).call);
    const g3 = gate(r3.output, sources, await loadGraphSnapshot(prisma, userId), [], NOW);
    await writeGateResult(prisma, {
      userId, runId: run3.id, proposerOutput: r3.output,
      wrapperRejections: [], gateResult: g3, loadedShadowKeys: [], now: NOW,
    });
    expect(await prisma.psycheNode.count()).toBe(1); // merged, not duplicated
    expect(await prisma.evidence.count()).toBe(2); // same span skipped
  });

  it("edges between persisted nodes write with resolved endpoints and edge evidence", async () => {
    const { userId, sources } = await seedUserAndSources();
    const run = await prisma.extractionRun.create({
      data: { userId, provider: "stub", model: "stub", promptVersion: "v2", ontologyVersion: "v1", gateVersion: "v1.7", status: "running" },
    });
    const out = JSON.stringify({
      nodes: [
        { tempId: "a", type: "PATTERN", label: "Saying yes when I mean no", evidence: [
          { sourceEventId: sid(sources, "e1"), quote: "saying yes when I want to say no" },
          { sourceEventId: sid(sources, "e2"), quote: "I wanted to say no" } ] },
        { tempId: "b", type: "PROTECTION", label: "Protecting everyone", evidence: [
          { sourceEventId: sid(sources, "e3"), quote: "I protect everyone" },
          { sourceEventId: sid(sources, "e4"), quote: "I work too much" } ] },
      ],
      edges: [
        { tempId: "g", source: { kind: "PROPOSED", tempId: "b" }, target: { kind: "PROPOSED", tempId: "a" },
          type: "EXPRESSES_AS", evidence: [{ sourceEventId: sid(sources, "e3"), quote: "no one sees me tired" }] },
      ],
    });
    const r = await runProposer(input({ sources: [...sources.values()], priorNodes: [] }), stubModel(out).call);
    const g = gate(r.output, sources, { nodes: [], edges: [] }, [], NOW);
    const report = await writeGateResult(prisma, {
      userId, runId: run.id, proposerOutput: r.output,
      wrapperRejections: [], gateResult: g, loadedShadowKeys: [], now: NOW,
    });

    const edges = await prisma.psycheEdge.findMany();
    expect(edges).toHaveLength(1);
    expect(edges[0].sourceId).toBe(report.nodeIdByTempId["b"]);
    expect(edges[0].targetId).toBe(report.nodeIdByTempId["a"]);
    expect(edges[0].confidence).toBeGreaterThan(0);
    expect(await prisma.evidence.count({ where: { edgeId: edges[0].id } })).toBe(1);
  });

  it("the writer is atomic: a failing row rolls the whole pass back", async () => {
    const { userId, sources } = await seedUserAndSources();
    const run = await prisma.extractionRun.create({
      data: { userId, provider: "stub", model: "stub", promptVersion: "v2", ontologyVersion: "v1", gateVersion: "v1.7", status: "running" },
    });
    const out = JSON.stringify({
      nodes: [
        { tempId: "a", type: "PATTERN", label: "Saying yes when I mean no", evidence: [
          { sourceEventId: sid(sources, "e1"), quote: "saying yes when I want to say no" },
          { sourceEventId: sid(sources, "e2"), quote: "I wanted to say no" } ] },
      ],
      edges: [],
    });
    const r = await runProposer(input({ sources: [...sources.values()], priorNodes: [] }), stubModel(out).call);
    const g = gate(r.output, sources, { nodes: [], edges: [] }, [], NOW);
    // Sabotage: point one evidence row at a nonexistent source event → FK fails.
    g.acceptedNodes[0].evidence[0] = { ...g.acceptedNodes[0].evidence[0], sourceEventId: "does-not-exist" };
    await expect(
      writeGateResult(prisma, {
        userId, runId: run.id, proposerOutput: r.output,
        wrapperRejections: [], gateResult: g, loadedShadowKeys: [], now: NOW,
      }),
    ).rejects.toThrow();
    expect(await prisma.psycheNode.count()).toBe(0); // nothing half-written
    expect(await prisma.proposal.count()).toBe(0);
  });
});
