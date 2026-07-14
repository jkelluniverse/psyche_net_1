// THE RETRACTION API — tests written before the module (tests-first).
//
// D-R6: the graph writer owns the single sanctioned mutation surface for
// SourceEvent invalidation/supersession, Evidence erasure, and the LAW-8
// path. Choke-point, NOT retention: tombstones carry ids and causes, never
// content. Recompute is SYNCHRONOUS, inside the retraction transaction —
// a crash can never land between retraction and recompute.
//
// Spec test 7(b), all three shapes:
// 1. NEGATIVE LIFECYCLE: charge a ghost, invalidate the source THROUGH THE
//    API → links invalidated (SOURCE_INVALIDATED), hypothesis recomputes to
//    mass 0 + state reversion, extracted node's stored mass drops — one
//    committed transaction.
// 2. LAW-8 ERASE THE EVIDENCE ROW: gone, not flagged — link keeps
//    evidenceIdWas (id only), evidenceId SetNull, no content retained.
// 3. LAW-8 ERASE THE WHOLE SOURCEEVENT ("delete my entry"): Evidence rows
//    (quote copies) cascade FIRST, links invalidate with evidenceIdWas
//    still populated, the SourceEvent row is GONE.
//
// Needs a migrated Postgres via TEST_DATABASE_URL; skips visibly otherwise.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GATE_CONFIG_V1 } from "../../citation-gate/config";
import { MATCHER_CONFIG_V1 } from "../../hypothesis-match/config";
import { runMatcherForUser } from "../../hypothesis-match/matcher";
import {
  eraseEvidence,
  eraseSourceEvent,
  retractSourceEvent,
} from "../retraction";

const DB_URL = process.env.TEST_DATABASE_URL;
const suite = DB_URL ? describe : describe.skip;
if (!DB_URL) {
  // eslint-disable-next-line no-console
  console.warn("retraction suite SKIPPED: TEST_DATABASE_URL not set");
}
const prisma = DB_URL
  ? new PrismaClient({ datasources: { db: { url: DB_URL } } })
  : (null as never);

const NOW = new Date("2026-07-14T12:00:00.000Z");
const KEY = "pattern.deep-feeling-needs-safety";
const solo = { ...MATCHER_CONFIG_V1, mode: "SOLO" as const };
const gateSolo = { ...GATE_CONFIG_V1, mode: "SOLO" as const };
const QUOTE = "I only open up when I feel safe first";

/** A charged ghost: extracted node + evidence + hypothesis + matcher run. */
async function chargedFixture() {
  const user = await prisma.user.create({
    data: { role: "INDIVIDUAL", ageVerified: true },
  });
  const ghost = await prisma.psycheNode.create({
    data: {
      userId: user.id,
      type: "PATTERN",
      provenance: "LENS",
      label: "May need safety before feeling deeply",
      ontologyKey: KEY,
      state: "HYPOTHESIS",
      mass: 0,
      confidence: GATE_CONFIG_V1.confidence.hypothesisFloor,
      lensMapVersion: "v1",
    },
  });
  const extracted = await prisma.psycheNode.create({
    data: {
      userId: user.id,
      type: "PATTERN",
      provenance: "EXTRACTED",
      label: "needs safety first",
      ontologyKey: KEY,
      state: "ACTIVE",
      mass: 0.8,
      confidence: 0.7,
    },
  });
  const sources: string[] = [];
  const evidenceIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const content = `entry ${i}: ${QUOTE}.`;
    const src = await prisma.sourceEvent.create({
      data: {
        userId: user.id,
        kind: "JOURNAL_TEXT",
        content,
        authorship: "SELF",
        occurredAt: new Date(NOW.getTime() - (i + 1) * 86_400_000),
      },
    });
    sources.push(src.id);
    const ev = await prisma.evidence.create({
      data: {
        sourceEventId: src.id,
        nodeId: extracted.id,
        quote: QUOTE,
        spanStart: content.indexOf(QUOTE),
        spanEnd: content.indexOf(QUOTE) + QUOTE.length,
        occurredAt: src.occurredAt,
        polarity: "SUPPORTING",
        validated: true,
      },
    });
    evidenceIds.push(ev.id);
  }
  await prisma.$transaction((tx) =>
    runMatcherForUser(tx, {
      userId: user.id,
      trigger: "IMPORT_REMAP",
      config: solo,
      gateConfig: gateSolo,
      now: NOW,
    }),
  );
  const charged = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
  expect(charged.state).toBe("ACTIVE"); // fixture sanity: it IS charged
  expect(charged.mass).toBeGreaterThan(0);
  return { user, ghost, extracted, sources, evidenceIds };
}

suite("the retraction API — un-confirming must un-tell (D-R6)", () => {
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

  it("NEGATIVE LIFECYCLE: retracting both sources reverts the ghost and drops stored extracted mass — synchronously", async () => {
    const { ghost, extracted, sources } = await chargedFixture();
    const massBefore = (
      await prisma.psycheNode.findUniqueOrThrow({ where: { id: extracted.id } })
    ).mass;

    for (const sourceEventId of sources) {
      await retractSourceEvent(prisma, {
        sourceEventId,
        config: solo,
        gateConfig: gateSolo,
        now: NOW,
      });
    }

    // The commit implies the recompute already happened (same transaction).
    const g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.mass).toBe(0);
    expect(g.state).toBe("HYPOTHESIS"); // the sky stopped saying the chart was right
    expect(g.confidence).toBe(GATE_CONFIG_V1.confidence.hypothesisFloor);

    const ex = await prisma.psycheNode.findUniqueOrThrow({ where: { id: extracted.id } });
    expect(ex.mass).toBeLessThan(massBefore); // stored values recomputed too
    expect(ex.mass).toBe(0);

    const links = await prisma.hypothesisEvidenceLink.findMany({
      where: { nodeId: ghost.id },
    });
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      expect(l.invalidatedAt).not.toBeNull();
      expect(l.invalidationCause).toBe("SOURCE_INVALIDATED");
      expect(l.invalidatedByRunId).toBeTruthy();
      expect(l.evidenceId).not.toBeNull(); // evidence rows still exist — source is invalidated, not erased
    }
    // The source events still exist, marked invalidated (append-and-invalidate).
    for (const id of sources) {
      const s = await prisma.sourceEvent.findUniqueOrThrow({ where: { id } });
      expect(s.invalidatedAt).not.toBeNull();
    }
  });

  it("LAW-8 ERASE EVIDENCE ROW: gone not flagged; link keeps id-only audit; recompute driven from the tombstone", async () => {
    const { ghost, evidenceIds } = await chargedFixture();

    for (const evidenceId of evidenceIds) {
      await eraseEvidence(prisma, {
        evidenceId,
        cause: "LAW8_ERASURE",
        config: solo,
        gateConfig: gateSolo,
        now: NOW,
      });
    }

    for (const id of evidenceIds) {
      expect(await prisma.evidence.findUnique({ where: { id } })).toBeNull(); // GONE
    }
    const links = await prisma.hypothesisEvidenceLink.findMany({
      where: { nodeId: ghost.id },
    });
    for (const l of links) {
      expect(l.evidenceId).toBeNull(); // SetNull
      expect(evidenceIds).toContain(l.evidenceIdWas); // audit id survives
      expect(l.invalidationCause).toBe("LAW8_ERASURE");
      // No content retained anywhere on the tombstone.
      expect(JSON.stringify(l)).not.toContain(QUOTE);
    }
    const g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.mass).toBe(0);
    expect(g.state).toBe("HYPOTHESIS");
  });

  it("LAW-8 ERASE THE WHOLE SOURCEEVENT: quote copies cascade first, links tombstone, the entry is GONE", async () => {
    const { ghost, sources, evidenceIds } = await chargedFixture();

    for (const sourceEventId of sources) {
      await eraseSourceEvent(prisma, {
        sourceEventId,
        config: solo,
        gateConfig: gateSolo,
        now: NOW,
      });
    }

    for (const id of sources) {
      expect(await prisma.sourceEvent.findUnique({ where: { id } })).toBeNull();
    }
    for (const id of evidenceIds) {
      expect(await prisma.evidence.findUnique({ where: { id } })).toBeNull();
    }
    const links = await prisma.hypothesisEvidenceLink.findMany({
      where: { nodeId: ghost.id },
    });
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      expect(l.evidenceId).toBeNull();
      expect(l.evidenceIdWas).toBeTruthy(); // populated — copy-at-insert survived the cascade
      expect(l.invalidationCause).toBe("LAW8_ERASURE");
    }
    const g = await prisma.psycheNode.findUniqueOrThrow({ where: { id: ghost.id } });
    expect(g.mass).toBe(0);
    expect(g.state).toBe("HYPOTHESIS");
    // Erasure is erasure: the person's words survive NOWHERE in the database.
    const linkDump = JSON.stringify(links);
    expect(linkDump).not.toContain(QUOTE);
    const runs = await prisma.matcherRun.findMany();
    expect(JSON.stringify(runs)).not.toContain(QUOTE);
  });

  it("replay: every retraction persists a MatcherRun with trigger RETRACTION and the prior states", async () => {
    const { ghost, sources } = await chargedFixture();
    await retractSourceEvent(prisma, {
      sourceEventId: sources[0],
      config: solo,
      gateConfig: gateSolo,
      now: NOW,
    });
    const runRow = await prisma.matcherRun.findFirstOrThrow({
      where: { trigger: "RETRACTION" },
      orderBy: { createdAt: "desc" },
    });
    const inputs = runRow.inputs as { priorStates: Record<string, string> };
    expect(inputs.priorStates[ghost.id]).toBe("ACTIVE");
  });
});
