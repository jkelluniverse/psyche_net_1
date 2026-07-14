// THE IMPORT TRANSACTION — tests written before the module (tests-first).
//
// Spec §1's two pinned properties, plus the writer choke-point:
// - IDEMPOTENT per (user, system): re-import upserts, never duplicates —
//   the fingerprint unique + the lens-node partial unique index (migration 7)
//   make it structural, not aspirational.
// - ATOMIC FAILURE: API/parse error → ChartImport.status=error, ZERO nodes,
//   retryable — never a partial ghost sky.
// - Lens nodes arrive THROUGH THE WRITER with full version stamps (parser,
//   vocabulary, map, selector config on the import; map + arithmetic-config
//   versions + computedAt on each node). This is the first non-gate
//   sanctioned computer to exercise the choke-point.
//
// Needs a migrated Postgres via TEST_DATABASE_URL; skips visibly otherwise.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { importChart } from "../import-chart";
import { LENS_CONFIG_V1 } from "../select-ghosts";
import { LENS_MAP_VERSION } from "../lens-map.v1";
import { FEATURE_VOCABULARY_VERSION, PARSER_VERSION } from "../parse-chart";
import { GATE_CONFIG_V1 } from "../../citation-gate/config";

const DB_URL = process.env.TEST_DATABASE_URL;
const suite = DB_URL ? describe : describe.skip;
if (!DB_URL) {
  // eslint-disable-next-line no-console
  console.warn("import-chart suite SKIPPED: TEST_DATABASE_URL not set (needs migrated Postgres)");
}
const prisma = DB_URL ? new PrismaClient({ datasources: { db: { url: DB_URL } } }) : (null as never);

const NOW = new Date("2026-07-14T12:00:00.000Z");
const BIRTH = {
  birthDate: "1990-04-12",
  birthTime: "14:32",
  birthPlace: "Portland, OR, USA",
  tzResolved: "America/Los_Angeles",
};
const CHART = {
  human_design: {
    type: "Manifesting Generator",
    authority: "Emotional",
    defined_centers: ["Sacral", "Solar Plexus", "Throat"],
  },
  natal: { sun_sign: "Leo", moon_sign: "Pisces", ascendant_sign: "Aries" },
};

async function mkUser(): Promise<string> {
  const u = await prisma.user.create({ data: { role: "INDIVIDUAL", ageVerified: true } });
  return u.id;
}

suite("lens import transaction — parser → selector → writer", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
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

  it("a good chart imports: ok status, full stamp set on the import, ghosts through the writer with full stamps", async () => {
    const userId = await mkUser();
    const r = await importChart(prisma, {
      userId,
      system: "human_design",
      provider: "astrology-api.io",
      birth: BIRTH,
      rawChart: CHART,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const imp = await prisma.chartImport.findUniqueOrThrow({ where: { id: r.chartImportId } });
    expect(imp.status).toBe("ok");
    expect(imp.chartFingerprint).toBeTruthy();
    expect(imp.provider).toBe("astrology-api.io");
    expect(imp.parserVersion).toBe(PARSER_VERSION);
    expect(imp.featureVocabularyVersion).toBe(FEATURE_VOCABULARY_VERSION);
    expect(imp.lensMapVersion).toBe(LENS_MAP_VERSION);
    expect(imp.lensConfigVersion).toBe(LENS_CONFIG_V1.configVersion);

    const ghosts = await prisma.psycheNode.findMany({ where: { userId, provenance: "LENS" } });
    expect(ghosts.length).toBeGreaterThan(0);
    expect(ghosts.length).toBeLessThanOrEqual(LENS_CONFIG_V1.ghostBudget);
    const tier3Count = r.ghosts.filter((g) => g.priority === 3).length;
    expect(tier3Count).toBeGreaterThanOrEqual(LENS_CONFIG_V1.minTier3Ghosts);
    for (const g of ghosts) {
      expect(g.type).not.toBe("LENS"); // D-R4: domain-typed, never NodeType.LENS
      expect(g.mass).toBe(0);
      expect(g.state).toBe("HYPOTHESIS");
      expect(g.confidence).toBe(GATE_CONFIG_V1.confidence.hypothesisFloor);
      expect(g.chartImportId).toBe(r.chartImportId);
      expect(g.lensMapVersion).toBe(LENS_MAP_VERSION);
      expect(g.ontologyKey).toBeTruthy();
      expect(g.confidenceAlgorithmVersion).toBe(GATE_CONFIG_V1.confidenceAlgorithmVersion);
      expect(g.computedAt.toISOString()).toBe(NOW.toISOString());
    }
  });

  it("IDEMPOTENT: re-importing the same chart upserts — same node ids, same counts, one import row", async () => {
    const userId = await mkUser();
    const first = await importChart(prisma, {
      userId, system: "human_design", provider: "astrology-api.io",
      birth: BIRTH, rawChart: CHART, now: NOW,
    });
    expect(first.ok).toBe(true);
    const idsBefore = (await prisma.psycheNode.findMany({ where: { userId, provenance: "LENS" }, orderBy: { ontologyKey: "asc" } })).map((n) => n.id);

    const second = await importChart(prisma, {
      userId, system: "human_design", provider: "astrology-api.io",
      birth: BIRTH, rawChart: JSON.parse(JSON.stringify(CHART)),
      now: new Date(NOW.getTime() + 60_000),
    });
    expect(second.ok).toBe(true);
    const after = await prisma.psycheNode.findMany({ where: { userId, provenance: "LENS", archivedAt: null }, orderBy: { ontologyKey: "asc" } });
    expect(after.map((n) => n.id)).toEqual(idsBefore); // updated in place, never re-minted
    expect(await prisma.chartImport.count({ where: { userId } })).toBe(1); // upserted
  });

  it("ATOMIC FAILURE: malformed chart → status=error, ZERO nodes, retryable — never a partial sky", async () => {
    const userId = await mkUser();
    const bad = await importChart(prisma, {
      userId, system: "human_design", provider: "astrology-api.io",
      birth: BIRTH, rawChart: "not a chart at all", now: NOW,
    });
    expect(bad.ok).toBe(false);
    const imp = await prisma.chartImport.findFirstOrThrow({ where: { userId } });
    expect(imp.status).toBe("error");
    expect(imp.parserVersion).toBe(PARSER_VERSION); // replay knows which parser rejected it
    expect(await prisma.psycheNode.count({ where: { userId } })).toBe(0);

    // retry with a good chart heals the same import row
    const retry = await importChart(prisma, {
      userId, system: "human_design", provider: "astrology-api.io",
      birth: BIRTH, rawChart: CHART, now: NOW,
    });
    expect(retry.ok).toBe(true);
    expect(await prisma.chartImport.count({ where: { userId } })).toBe(1);
    expect((await prisma.chartImport.findFirstOrThrow({ where: { userId } })).status).toBe("ok");
    expect(await prisma.psycheNode.count({ where: { userId, provenance: "LENS" } })).toBeGreaterThan(0);
  });

  it("WRITER CHOKE-POINT: the DB structurally rejects a duplicate active lens key and a type=LENS row", async () => {
    const userId = await mkUser();
    await importChart(prisma, {
      userId, system: "human_design", provider: "astrology-api.io",
      birth: BIRTH, rawChart: CHART, now: NOW,
    });
    const one = await prisma.psycheNode.findFirstOrThrow({ where: { userId, provenance: "LENS" } });
    // migration 7's partial unique: same (userId, ontologyKey), LENS, active → rejected
    await expect(
      prisma.psycheNode.create({
        data: {
          userId, type: one.type, provenance: "LENS", label: "duplicate ghost",
          ontologyKey: one.ontologyKey!, state: "HYPOTHESIS",
        },
      }),
    ).rejects.toThrow();
    // migration 6's CHECK: type=LENS is unwritable
    await expect(
      prisma.psycheNode.create({
        data: { userId, type: "LENS", provenance: "LENS", label: "illegal", ontologyKey: "pattern.core", state: "HYPOTHESIS" },
      }),
    ).rejects.toThrow();
  });

  it("a remap that drops a key archives the UNCHARGED ghost (nothing is deleted)", async () => {
    const userId = await mkUser();
    await importChart(prisma, {
      userId, system: "human_design", provider: "astrology-api.io",
      birth: BIRTH, rawChart: CHART, now: NOW,
    });
    // re-import a chart whose features no longer include the moon (fewer ghosts)
    const smaller = { ...CHART, natal: { sun_sign: "Leo" } };
    const r = await importChart(prisma, {
      userId, system: "human_design", provider: "astrology-api.io",
      birth: BIRTH, rawChart: smaller, now: NOW,
    });
    expect(r.ok).toBe(true);
    const archived = await prisma.psycheNode.findMany({
      where: { userId, provenance: "LENS", archivedAt: { not: null } },
    });
    const active = await prisma.psycheNode.findMany({
      where: { userId, provenance: "LENS", archivedAt: null },
    });
    expect(archived.length).toBeGreaterThan(0); // the dropped moon ghost archived
    expect(active.every((n) => n.archivedAt === null)).toBe(true);
    expect(await prisma.psycheNode.count({ where: { userId } })).toBe(archived.length + active.length); // nothing deleted
  });
});
