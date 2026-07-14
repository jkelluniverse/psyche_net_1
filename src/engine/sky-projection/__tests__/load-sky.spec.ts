// SKY LOADER — round-trip test: persisted rows → projection input views.
// DB-gated (needs a migrated Postgres via TEST_DATABASE_URL); skips visibly.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { loadSkyGraph } from "../load-sky";
import { importChart } from "../../lens/import-chart";

const DB_URL = process.env.TEST_DATABASE_URL;
const suite = DB_URL ? describe : describe.skip;
if (!DB_URL) {
  // eslint-disable-next-line no-console
  console.warn("load-sky suite SKIPPED: TEST_DATABASE_URL not set");
}
const prisma = DB_URL
  ? new PrismaClient({ datasources: { db: { url: DB_URL } } })
  : (null as never);

const NOW = new Date("2026-07-14T12:00:00.000Z");
const CHART = {
  human_design: {
    type: "Manifesting Generator",
    authority: "Emotional",
    defined_centers: ["Sacral", "Solar Plexus", "Throat"],
  },
  natal: { sun_sign: "Leo", moon_sign: "Pisces", ascendant_sign: "Aries" },
};

suite("loadSkyGraph — persisted rows become projection views", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await prisma.evidence.deleteMany();
    await prisma.psycheEdge.deleteMany();
    await prisma.psycheNode.deleteMany();
    await prisma.chartImport.deleteMany();
    await prisma.sourceEvent.deleteMany();
    await prisma.practitionerClient.deleteMany();
    await prisma.user.deleteMany();
  });

  it("lens ghosts load with empty effectiveEvidence; extracted nodes carry evidence with live-joined source invalidation", async () => {
    const user = await prisma.user.create({
      data: { role: "INDIVIDUAL", ageVerified: true },
    });
    await importChart(prisma, {
      userId: user.id,
      system: "human_design",
      provider: "astrology-api.io",
      birth: {
        birthDate: "1990-04-12",
        birthTime: "14:32",
        birthPlace: "Portland, OR, USA",
        tzResolved: "America/Los_Angeles",
      },
      rawChart: CHART,
      now: NOW,
    });
    const src = await prisma.sourceEvent.create({
      data: {
        userId: user.id,
        kind: "JOURNAL_TEXT",
        content: "I keep saying yes when I mean no.",
        authorship: "SELF",
        occurredAt: new Date("2026-07-01T00:00:00.000Z"),
        invalidatedAt: new Date("2026-07-13T00:00:00.000Z"), // retracted
      },
    });
    const extracted = await prisma.psycheNode.create({
      data: {
        userId: user.id,
        type: "PATTERN",
        provenance: "EXTRACTED",
        label: "says yes when meaning no",
        state: "ACTIVE",
        mass: 0.4,
        confidence: 0.7,
        evidence: {
          create: {
            sourceEventId: src.id,
            quote: "saying yes when I mean no",
            spanStart: 7,
            spanEnd: 32,
            occurredAt: new Date("2026-07-01T00:00:00.000Z"),
            validated: true,
          },
        },
      },
    });
    const archived = await prisma.psycheNode.findFirst({
      where: { userId: user.id, provenance: "LENS" },
    });
    await prisma.psycheNode.update({
      where: { id: archived!.id },
      data: { archivedAt: NOW },
    });

    const graph = await loadSkyGraph(prisma, user.id);
    // archived rows never load
    expect(graph.nodes.find((n) => n.id === archived!.id)).toBeUndefined();
    const ghost = graph.nodes.find((n) => n.provenance === "LENS")!;
    expect(ghost.effectiveEvidence).toEqual([]);
    expect(ghost.mass).toBe(0);
    expect(ghost.lensMapVersion).toBeTruthy();
    const ex = graph.nodes.find((n) => n.id === extracted.id)!;
    expect(ex.effectiveEvidence).toHaveLength(1);
    expect(ex.effectiveEvidence[0].authorship).toBe("SELF");
    // The GATE's conferring rule (imported, not restated): a retracted
    // source confers nothing — invalidation-aware at the rule itself.
    expect(ex.effectiveEvidence[0].conferring).toBe(false);
    expect(ex.effectiveEvidence[0].sourceInvalidatedAt?.toISOString()).toBe(
      "2026-07-13T00:00:00.000Z", // live-joined — the projection will drop it
    );
  });
});
