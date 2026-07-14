// HYPOTHESIS MATCHER — tests written before the module (tests-first).
//
// Spec §3 keystones (test 7) + the evidence-first direction (test 8) + the
// confirmation overlay (test 7c / D-R7):
// - Exact type+ontologyKey match LINKS evidence (D-R2: one span, one row,
//   referenced twice — evidenceIdWas copied at INSERT) and charges through
//   the GATE's arithmetic: mass > 0, ACTIVE, full stamps.
// - Near-miss key does NOT match. Unmatched hypotheses stay SILENT.
// - Mode guard: a single COUNTERVAILING source never contradicts in SOLO;
//   recurrence ≥2 distinct sources DOES.
// - SUPERVISED: countervailing recurrence alone NEVER lands CONTRADICTED —
//   it holds with the pending-confirmation rule (test 14's engine half);
//   a GROUND confirmation lands it; an AFFIRM confirmation moves
//   HYPOTHESIS→ACTIVE as STATE ONLY (mass stays 0 — confirmed-but-thin);
//   withdrawal reverts; severing the practitioner relationship withdraws
//   the overlay's effect (checked live, never cached).
// - Evidence-first direction: journal first, hypothesis second — the
//   IMPORT_REMAP full-graph trigger charges the ghost (the demo path).
// - Every run persists a MatcherRun; links derive from the runId FK.
//
// Needs a migrated Postgres via TEST_DATABASE_URL; skips visibly otherwise.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GATE_CONFIG_V1 } from "../../citation-gate/config";
import { MATCHER_CONFIG_V1 } from "../config";
import {
  confirmHypothesis,
  runMatcherForUser,
  withdrawConfirmation,
} from "../matcher";

const DB_URL = process.env.TEST_DATABASE_URL;
const suite = DB_URL ? describe : describe.skip;
if (!DB_URL) {
  // eslint-disable-next-line no-console
  console.warn("matcher suite SKIPPED: TEST_DATABASE_URL not set");
}
const prisma = DB_URL
  ? new PrismaClient({ datasources: { db: { url: DB_URL } } })
  : (null as never);

const NOW = new Date("2026-07-14T12:00:00.000Z");
const KEY = "pattern.deep-feeling-needs-safety";

const solo = { ...MATCHER_CONFIG_V1, mode: "SOLO" as const };
const supervised = { ...MATCHER_CONFIG_V1, mode: "SUPERVISED" as const };
const gateSolo = { ...GATE_CONFIG_V1, mode: "SOLO" as const };
const gateSupervised = { ...GATE_CONFIG_V1, mode: "SUPERVISED" as const };

async function mkUser() {
  return prisma.user.create({ data: { role: "INDIVIDUAL", ageVerified: true } });
}

async function mkGhost(userId: string, key = KEY, type = "PATTERN" as const) {
  return prisma.psycheNode.create({
    data: {
      userId,
      type,
      provenance: "LENS",
      label: "May need safety before feeling deeply",
      ontologyKey: key,
      state: "HYPOTHESIS",
      mass: 0,
      confidence: GATE_CONFIG_V1.confidence.hypothesisFloor,
      lensMapVersion: "v1",
    },
  });
}

/** An extracted node with N evidence rows across N distinct source events. */
async function mkExtracted(
  userId: string,
  opts: {
    key?: string;
    type?: "PATTERN" | "BELIEF";
    polarity?: "SUPPORTING" | "COUNTERVAILING";
    sources?: number;
  } = {},
) {
  const { key = KEY, type = "PATTERN", polarity = "SUPPORTING", sources = 2 } = opts;
  const node = await prisma.psycheNode.create({
    data: {
      userId,
      type,
      provenance: "EXTRACTED",
      label: "needs to feel safe before opening up",
      ontologyKey: key,
      state: "ACTIVE",
      mass: 0.8,
      confidence: 0.7,
    },
  });
  const evidenceIds: string[] = [];
  for (let i = 0; i < sources; i++) {
    const content = `entry ${i}: I only open up when I feel safe first.`;
    const quote = "I only open up when I feel safe first";
    const src = await prisma.sourceEvent.create({
      data: {
        userId,
        kind: "JOURNAL_TEXT",
        content,
        authorship: "SELF",
        occurredAt: new Date(NOW.getTime() - (i + 1) * 86_400_000),
      },
    });
    const ev = await prisma.evidence.create({
      data: {
        sourceEventId: src.id,
        nodeId: node.id,
        quote,
        spanStart: content.indexOf(quote),
        spanEnd: content.indexOf(quote) + quote.length,
        occurredAt: src.occurredAt,
        polarity,
        validated: true,
      },
    });
    evidenceIds.push(ev.id);
  }
  return { node, evidenceIds };
}

const run = (
  userId: string,
  trigger = "IMPORT_REMAP",
  config: typeof solo | typeof supervised = solo,
  gate: typeof gateSolo | typeof gateSupervised = gateSolo,
) =>
  prisma.$transaction((tx) =>
    runMatcherForUser(tx, {
      userId,
      trigger,
      config,
      gateConfig: gate,
      now: NOW,
    }),
  );

suite("hypothesis matcher — the charging path (spec §3)", () => {
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

  it("KEYSTONE: exact type+key match links evidence and charges through the gate's arithmetic", async () => {
    const user = await mkUser();
    const ghost = await mkGhost(user.id);
    const { evidenceIds } = await mkExtracted(user.id, { sources: 2 });

    const result = await run(user.id);
    expect(result.linksCreated).toBe(2);

    const links = await prisma.hypothesisEvidenceLink.findMany({
      where: { nodeId: ghost.id },
    });
    expect(links).toHaveLength(2);
    for (const l of links) {
      expect(evidenceIds).toContain(l.evidenceId);
      expect(l.evidenceIdWas).toBe(l.evidenceId); // copy-at-insert
      expect(l.matchRuleVersion).toBe(MATCHER_CONFIG_V1.matchRuleVersion);
      expect(l.runId).toBe(result.runId);
      expect(l.invalidatedAt).toBeNull();
    }

    const charged = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(charged.mass).toBeGreaterThan(0); // the gate's computeMass, not a copy
    expect(charged.state).toBe("ACTIVE"); // lens:confirmed-by-lived-evidence
    expect(charged.massAlgorithmVersion).toBe(GATE_CONFIG_V1.massAlgorithmVersion);
    expect(charged.stateAlgorithmVersion).toBe(GATE_CONFIG_V1.stateAlgorithmVersion);
    expect(charged.computedAt.toISOString()).toBe(NOW.toISOString());

    // The run row is the derivation object.
    const runRow = await prisma.matcherRun.findUniqueOrThrow({ where: { id: result.runId } });
    expect(runRow.trigger).toBe("IMPORT_REMAP");
    expect(runRow.matchRuleVersion).toBe(MATCHER_CONFIG_V1.matchRuleVersion);
    const transitions = runRow.transitions as { nodeId: string; from: string; to: string }[];
    expect(transitions.some((t) => t.nodeId === ghost.id && t.from === "HYPOTHESIS" && t.to === "ACTIVE")).toBe(true);
  });

  it("near-miss key does NOT match; unmatched hypotheses stay SILENT", async () => {
    const user = await mkUser();
    const ghost = await mkGhost(user.id, "pattern.deep-feeling-needs-safety");
    await mkExtracted(user.id, { key: "pattern.holds-course-under-pressure" });
    // same key, different domain type — also no match
    await mkExtracted(user.id, { key: KEY, type: "BELIEF" });

    const result = await run(user.id);
    expect(result.linksCreated).toBe(0);
    const after = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(after.state).toBe("HYPOTHESIS");
    expect(after.mass).toBe(0);
  });

  it("idempotent: a second run creates no duplicate links and no state churn", async () => {
    const user = await mkUser();
    await mkGhost(user.id);
    await mkExtracted(user.id);
    const first = await run(user.id);
    expect(first.linksCreated).toBe(2);
    const second = await run(user.id);
    expect(second.linksCreated).toBe(0);
    expect(await prisma.hypothesisEvidenceLink.count()).toBe(2);
  });

  it("MODE GUARD: single countervailing source never contradicts in SOLO; recurrence ≥2 does", async () => {
    const user = await mkUser();
    const ghost = await mkGhost(user.id);
    await mkExtracted(user.id, { polarity: "COUNTERVAILING", sources: 1 });
    await run(user.id);
    let g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.state).toBe("HYPOTHESIS"); // one model-labeled quote moves nothing

    await mkExtracted(user.id, { polarity: "COUNTERVAILING", sources: 1 });
    await run(user.id);
    g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.state).toBe("CONTRADICTED"); // affirmed-then-denied across 2 events
    expect(g.mass).toBe(0); // countervailing never adds mass
  });

  it("SUPERVISED: recurrence alone never lands CONTRADICTED — pending confirmation; GROUND lands it", async () => {
    const user = await mkUser();
    const practitioner = await prisma.user.create({
      data: { role: "PRACTITIONER", ageVerified: true },
    });
    await prisma.practitionerClient.create({
      data: { practitionerId: practitioner.id, clientId: user.id },
    });
    const ghost = await mkGhost(user.id);
    await mkExtracted(user.id, { polarity: "COUNTERVAILING", sources: 2 });

    const result = await run(user.id, "IMPORT_REMAP", supervised, gateSupervised);
    let g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.state).toBe("HYPOTHESIS"); // held — authority not yet spoken
    const transitions = (
      await prisma.matcherRun.findUniqueOrThrow({ where: { id: result.runId } })
    ).transitions as { nodeId: string; rule: string }[];
    expect(
      transitions.find((t) => t.nodeId === ghost.id)?.rule,
    ).toContain("pending-confirmation"); // fail-closed, never silent

    await confirmHypothesis(prisma, {
      practitionerId: practitioner.id,
      nodeId: ghost.id,
      direction: "GROUND",
      config: supervised,
      gateConfig: gateSupervised,
      now: NOW,
    });
    g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.state).toBe("CONTRADICTED");
    expect(g.mass).toBe(0);
  });

  it("D-R7 AFFIRM: state only, never mass — and withdrawal un-tells", async () => {
    const user = await mkUser();
    const practitioner = await prisma.user.create({
      data: { role: "PRACTITIONER", ageVerified: true },
    });
    await prisma.practitionerClient.create({
      data: { practitionerId: practitioner.id, clientId: user.id },
    });
    const ghost = await mkGhost(user.id);

    await confirmHypothesis(prisma, {
      practitionerId: practitioner.id,
      nodeId: ghost.id,
      direction: "AFFIRM",
      config: supervised,
      gateConfig: gateSupervised,
      now: NOW,
    });
    let g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.state).toBe("ACTIVE"); // authority moved state…
    expect(g.mass).toBe(0); // …but a confirmed-but-thin node LOOKS thin

    const conf = await prisma.hypothesisConfirmation.findFirstOrThrow({
      where: { nodeId: ghost.id },
    });
    expect(conf.appliedByRunId).toBeTruthy();

    await withdrawConfirmation(prisma, {
      confirmationId: conf.id,
      config: supervised,
      gateConfig: gateSupervised,
      now: NOW,
    });
    g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.state).toBe("HYPOTHESIS"); // the evidence-derived state stands underneath
  });

  it("SEVERANCE withdraws the overlay's effect — checked live, never cached", async () => {
    const user = await mkUser();
    const practitioner = await prisma.user.create({
      data: { role: "PRACTITIONER", ageVerified: true },
    });
    const rel = await prisma.practitionerClient.create({
      data: { practitionerId: practitioner.id, clientId: user.id },
    });
    const ghost = await mkGhost(user.id);
    await confirmHypothesis(prisma, {
      practitionerId: practitioner.id,
      nodeId: ghost.id,
      direction: "AFFIRM",
      config: supervised,
      gateConfig: gateSupervised,
      now: NOW,
    });
    await prisma.practitionerClient.delete({ where: { id: rel.id } });

    await run(user.id, "IMPORT_REMAP", supervised, gateSupervised);
    const g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.state).toBe("HYPOTHESIS"); // the severed authority no longer tells
  });

  it("EVIDENCE-FIRST direction (test 8): journal first, ghost second — the full-graph trigger charges it", async () => {
    const user = await mkUser();
    // The journal exists BEFORE any hypothesis does.
    await mkExtracted(user.id, { sources: 2 });
    // The chart arrives later (delta-only matching would miss this — the demo).
    const ghost = await mkGhost(user.id);

    await run(user.id, "IMPORT_REMAP");
    const g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.state).toBe("ACTIVE");
    expect(g.mass).toBeGreaterThan(0);
  });

  it("the matcher never creates nodes and never touches extracted rows", async () => {
    const user = await mkUser();
    await mkGhost(user.id);
    const { node } = await mkExtracted(user.id);
    const before = await prisma.psycheNode.findUniqueOrThrow({ where: { id: node.id } });
    const countBefore = await prisma.psycheNode.count();

    await run(user.id);
    expect(await prisma.psycheNode.count()).toBe(countBefore);
    const after = await prisma.psycheNode.findUniqueOrThrow({ where: { id: node.id } });
    expect(after.updatedAt.toISOString()).toBe(before.updatedAt.toISOString());
    expect(after.mass).toBe(before.mass);
  });
});
