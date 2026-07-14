// ASTROLOGY-API.IO ADAPTER — tests written before the module (tests-first).
//
// The adapter is the seam between the provider's idiom and OUR canonical raw
// chart (the parser's input shape). Pinned properties:
// - NEVER STUB SILENTLY: a missing ASTROLOGY_API_KEY makes the factory THROW
//   with an actionable message — the live path stops, it does not degrade.
// - Fixture-driven test double at the FETCH layer (expected and sanctioned):
//   the real mapping code runs against real captured provider responses.
// - Provider idiom stays in the adapter: sign abbreviations ("Ari") expand
//   here; center aliases ("g_center") pass through for the parser to resolve.
// - Provider/HTTP errors throw ChartProviderError — the orchestration layer
//   (importChartFromProvider) turns that into the ATOMIC-FAILURE path:
//   status=error import row, ZERO nodes, retryable.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  ChartProviderError,
  createAstrologyApiProvider,
} from "../astrology-api";
import { importChartFromProvider } from "../../import-chart";
import { parseChart } from "../../parse-chart";

const FIXTURES = join(__dirname, "..", "__fixtures__");
const natalFixture = JSON.parse(
  readFileSync(join(FIXTURES, "astrology-api.natal.json"), "utf8"),
);
const bodygraphFixture = JSON.parse(
  readFileSync(join(FIXTURES, "astrology-api.bodygraph.json"), "utf8"),
);

const BIRTH = {
  birthDate: "1990-04-12",
  birthTime: "14:32",
  birthPlace: "Portland, OR, USA",
  tzResolved: "America/Los_Angeles",
};
const PLACE = { city: "Portland", countryCode: "US" };

/** Fetch double returning the captured live responses by endpoint. */
function fixtureFetch(calls?: { url: string; init: RequestInit }[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls?.push({ url: u, init: init ?? {} });
    const body = u.includes("/human-design/bodygraph")
      ? bodygraphFixture
      : u.includes("/charts/natal")
        ? natalFixture
        : null;
    if (!body) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

describe("astrology-api.io adapter", () => {
  it("REFUSES to start without ASTROLOGY_API_KEY — the live path stops, never stubs", () => {
    expect(() => createAstrologyApiProvider({ apiKey: undefined })).toThrow(
      /ASTROLOGY_API_KEY/,
    );
    expect(() => createAstrologyApiProvider({ apiKey: "" })).toThrow(
      /ASTROLOGY_API_KEY/,
    );
  });

  it("shapes both requests correctly: bearer auth, birth fields, timezone, place", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const provider = createAstrologyApiProvider({
      apiKey: "test-key",
      fetchImpl: fixtureFetch(calls),
    });
    await provider.fetchChart({ birth: BIRTH, ...PLACE });

    expect(calls.length).toBe(2);
    const urls = calls.map((c) => c.url).sort();
    expect(urls[0]).toContain("/api/v3/charts/natal");
    expect(urls[1]).toContain("/api/v3/human-design/bodygraph");
    for (const c of calls) {
      const headers = c.init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer test-key");
      const body = JSON.parse(String(c.init.body));
      expect(body.subject.birth_data).toMatchObject({
        year: 1990,
        month: 4,
        day: 12,
        hour: 14,
        minute: 32,
        city: "Portland",
        country_code: "US",
        timezone: "America/Los_Angeles",
      });
    }
  });

  it("maps real captured responses to the canonical raw chart the parser accepts", async () => {
    const provider = createAstrologyApiProvider({
      apiKey: "test-key",
      fetchImpl: fixtureFetch(),
    });
    const raw = (await provider.fetchChart({ birth: BIRTH, ...PLACE })) as {
      human_design: { type: string; authority: string; defined_centers: string[] };
      natal: { sun_sign: string; moon_sign: string; ascendant_sign: string };
    };

    // Provider idiom expanded HERE: "Ari" → "aries"; bodygraph centers dict →
    // defined_centers list (parser aliases resolve "g_center" etc.).
    expect(raw.human_design.type).toBe("projector");
    expect(raw.human_design.authority).toBe("splenic");
    expect(raw.human_design.defined_centers.sort()).toEqual(
      ["ajna", "head", "root", "spleen"],
    );
    expect(raw.natal.sun_sign).toBe("aries");
    expect(raw.natal.moon_sign).toBe("scorpio");
    expect(raw.natal.ascendant_sign).toBe("leo");

    const parsed = parseChart(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.features).toContain("hd.type.projector");
    expect(parsed.features).toContain("hd.authority.splenic");
    expect(parsed.features).toContain("hd.defined.spleen");
    expect(parsed.features).toContain("hd.undefined.sacral");
    expect(parsed.features).toContain("natal.sun.fire");
    expect(parsed.features).toContain("natal.moon.water");
    expect(parsed.features).toContain("natal.asc.fixed");
    // Nothing in the mapped shape should fall out of the vocabulary.
    expect(parsed.skipped).toEqual([]);
  });

  it("falls back to house cusp 1 for the ascendant when the Ascendant point is absent", async () => {
    const noAsc = JSON.parse(JSON.stringify(natalFixture));
    noAsc.chart_data.planetary_positions =
      noAsc.chart_data.planetary_positions.filter(
        (p: { name: string }) => p.name !== "Ascendant",
      );
    const provider = createAstrologyApiProvider({
      apiKey: "test-key",
      fetchImpl: (async (url: string | URL | Request) =>
        new Response(
          JSON.stringify(
            String(url).includes("bodygraph") ? bodygraphFixture : noAsc,
          ),
          { status: 200 },
        )) as typeof fetch,
    });
    const raw = (await provider.fetchChart({ birth: BIRTH, ...PLACE })) as {
      natal: { ascendant_sign: string };
    };
    expect(raw.natal.ascendant_sign).toBe("leo"); // cusp 1 in the fixture
  });

  it("throws ChartProviderError on a non-2xx response (no partial mapping)", async () => {
    const provider = createAstrologyApiProvider({
      apiKey: "test-key",
      fetchImpl: (async () =>
        new Response("rate limited", { status: 429 })) as typeof fetch,
    });
    await expect(provider.fetchChart({ birth: BIRTH, ...PLACE })).rejects.toThrow(
      ChartProviderError,
    );
    await expect(
      provider.fetchChart({ birth: BIRTH, ...PLACE }),
    ).rejects.toThrow(/429/);
  });

  it("rejects malformed birth inputs before any network call", async () => {
    let fetched = 0;
    const provider = createAstrologyApiProvider({
      apiKey: "test-key",
      fetchImpl: (async () => {
        fetched++;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    await expect(
      provider.fetchChart({
        birth: { ...BIRTH, birthTime: "half past two" },
        ...PLACE,
      }),
    ).rejects.toThrow(ChartProviderError);
    await expect(
      provider.fetchChart({
        birth: { ...BIRTH, birthDate: "the twelfth" },
        ...PLACE,
      }),
    ).rejects.toThrow(ChartProviderError);
    expect(fetched).toBe(0);
  });
});

// ── Orchestration: provider failure follows the ATOMIC-FAILURE rule ─────────

const DB_URL = process.env.TEST_DATABASE_URL;
const dbSuite = DB_URL ? describe : describe.skip;
if (!DB_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "astrology-api orchestration suite SKIPPED: TEST_DATABASE_URL not set",
  );
}
const prisma = DB_URL
  ? new PrismaClient({ datasources: { db: { url: DB_URL } } })
  : (null as never);
const NOW = new Date("2026-07-14T12:00:00.000Z");

dbSuite("importChartFromProvider — provider errors are atomic failures", () => {
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

  it("provider error → status=error import row, ZERO nodes; retry with a healthy provider heals the SAME row", async () => {
    const user = await prisma.user.create({
      data: { role: "INDIVIDUAL", ageVerified: true },
    });
    const failing = createAstrologyApiProvider({
      apiKey: "test-key",
      fetchImpl: (async () =>
        new Response("upstream down", { status: 503 })) as typeof fetch,
    });
    const r = await importChartFromProvider(prisma, {
      userId: user.id,
      system: "human_design",
      provider: failing,
      birth: BIRTH,
      ...PLACE,
      now: NOW,
    });
    expect(r.ok).toBe(false);
    const row = await prisma.chartImport.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(row.status).toBe("error");
    expect(await prisma.psycheNode.count({ where: { userId: user.id } })).toBe(0);

    const healthy = createAstrologyApiProvider({
      apiKey: "test-key",
      fetchImpl: fixtureFetch(),
    });
    const retry = await importChartFromProvider(prisma, {
      userId: user.id,
      system: "human_design",
      provider: healthy,
      birth: BIRTH,
      ...PLACE,
      now: NOW,
    });
    expect(retry.ok).toBe(true);
    expect(await prisma.chartImport.count({ where: { userId: user.id } })).toBe(1);
    const healed = await prisma.chartImport.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(healed.id).toBe(row.id); // same fingerprint → same retryable row
    expect(healed.status).toBe("ok");
    expect(
      await prisma.psycheNode.count({
        where: { userId: user.id, provenance: "LENS" },
      }),
    ).toBeGreaterThan(0);
  });
});
