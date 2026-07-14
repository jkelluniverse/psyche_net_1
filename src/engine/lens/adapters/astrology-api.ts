// ASTROLOGY-API.IO ADAPTER — provider idiom → OUR canonical raw chart.
//
// The adapter owns everything that is THIS provider's dialect: endpoint
// paths, bearer auth, the birth_data request shape, 3-letter sign
// abbreviations ("Ari"), the bodygraph centers dict. What leaves fetchChart
// is the canonical raw chart the parser accepts ({ human_design, natal }) —
// the parser stays the vocabulary gate (unknown values still pass THROUGH
// here and get skip-and-logged there; the adapter never invents meaning).
//
// Hard rules (milestone directive):
// - A missing ASTROLOGY_API_KEY makes the factory THROW. The live path
//   stops and says so; it never degrades to a silent stub.
// - Provider/HTTP failures throw ChartProviderError; the orchestration
//   layer records them as the ATOMIC-FAILURE import (status=error, zero
//   nodes, retryable). No partial mapping is ever returned.
//
// Request/response shapes verified against the live API (OpenAPI 3.2.10 +
// captured responses, 2026-07-14); the captures live in __fixtures__/ and
// drive the suite's fetch-layer test double.

import type {
  BirthInputs,
  ChartProvider,
  FetchChartInput,
} from "../import-chart";

export const ASTROLOGY_API_BASE_URL = "https://api.astrology-api.io";
export const ASTROLOGY_API_PROVIDER_NAME = "astrology-api.io";

const BODYGRAPH_PATH = "/api/v3/human-design/bodygraph";
const NATAL_PATH = "/api/v3/charts/natal";

/** Natal points we ask the provider for (Ascendant included deliberately). */
const NATAL_ACTIVE_POINTS = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Ascendant",
];

export class ChartProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ChartProviderError";
  }
}

/** The provider's 3-letter sign abbreviations, expanded to canonical names.
 * All twelve prefixes are distinct, so full names round-trip too. Unknown
 * strings pass through untouched — the parser skip-and-logs them. */
const SIGN_BY_PREFIX: Record<string, string> = {
  ari: "aries",
  tau: "taurus",
  gem: "gemini",
  can: "cancer",
  leo: "leo",
  vir: "virgo",
  lib: "libra",
  sco: "scorpio",
  sag: "sagittarius",
  cap: "capricorn",
  aqu: "aquarius",
  pis: "pisces",
};

const expandSign = (v: unknown): unknown =>
  typeof v === "string"
    ? (SIGN_BY_PREFIX[v.trim().toLowerCase().slice(0, 3)] ?? v)
    : v;

interface ParsedBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Fail BEFORE the network: malformed birth inputs are our bug or the
 * form's, never something to send upstream and guess about. */
function parseBirth(birth: BirthInputs): ParsedBirth {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth.birthDate.trim());
  if (!d) {
    throw new ChartProviderError(
      `malformed birthDate "${birth.birthDate}" — expected YYYY-MM-DD`,
    );
  }
  const t = /^(\d{1,2}):(\d{2})$/.exec(birth.birthTime.trim());
  if (!t) {
    throw new ChartProviderError(
      `malformed birthTime "${birth.birthTime}" — expected HH:MM`,
    );
  }
  return {
    year: Number(d[1]),
    month: Number(d[2]),
    day: Number(d[3]),
    hour: Number(t[1]),
    minute: Number(t[2]),
  };
}

export interface AstrologyApiOptions {
  apiKey: string | undefined;
  /** Injectable for the suite's fixture-driven double; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

export function createAstrologyApiProvider(
  opts: AstrologyApiOptions,
): ChartProvider {
  const { apiKey, fetchImpl = fetch, baseUrl = ASTROLOGY_API_BASE_URL } = opts;
  if (!apiKey) {
    throw new ChartProviderError(
      "ASTROLOGY_API_KEY is not set — the live chart provider refuses to start. " +
        "Set it in the environment; never stub the provider silently in the live path.",
    );
  }

  const post = async (path: string, body: unknown): Promise<unknown> => {
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ChartProviderError(
        `astrology-api.io ${path} unreachable: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!res.ok) {
      throw new ChartProviderError(
        `astrology-api.io ${path} returned ${res.status}`,
        res.status,
      );
    }
    try {
      return await res.json();
    } catch {
      throw new ChartProviderError(
        `astrology-api.io ${path} returned unparseable JSON`,
        res.status,
      );
    }
  };

  return {
    providerName: ASTROLOGY_API_PROVIDER_NAME,

    async fetchChart(input: FetchChartInput): Promise<unknown> {
      const parsed = parseBirth(input.birth);
      const birth_data = {
        ...parsed,
        second: 0,
        city: input.city,
        country_code: input.countryCode,
        timezone: input.birth.tzResolved,
      };

      const [bodygraphRes, natalRes] = await Promise.all([
        post(BODYGRAPH_PATH, {
          subject: { birth_data },
          options: { language: "en", include_interpretations: false },
          hd_options: { include_design_chart: true, include_channels: true },
        }),
        post(NATAL_PATH, {
          subject: { birth_data },
          options: {
            house_system: "P",
            zodiac_type: "Tropic",
            active_points: NATAL_ACTIVE_POINTS,
          },
        }),
      ]);

      return {
        human_design: mapBodygraph(bodygraphRes),
        natal: mapNatal(natalRes),
      };
    },
  };
}

// ── Response mapping (provider shape → canonical raw chart) ─────────────────

function mapBodygraph(res: unknown): {
  type: unknown;
  authority: unknown;
  defined_centers: string[];
} {
  const bg = (res as { data?: { bodygraph?: unknown } })?.data?.bodygraph as
    | Record<string, unknown>
    | undefined;
  if (!bg || typeof bg !== "object") {
    // A 200 without the documented payload is a provider contract violation —
    // fail loudly (atomic), never map a partial chart.
    throw new ChartProviderError(
      "astrology-api.io bodygraph response is missing data.bodygraph",
    );
  }
  const centers = (bg.centers ?? {}) as Record<string, { defined?: unknown }>;
  const defined_centers = Object.entries(centers)
    .filter(([, v]) => v && typeof v === "object" && v.defined === true)
    .map(([key]) => key) // "g_center" etc. — the parser's aliases resolve these
    .sort();
  return { type: bg.type, authority: bg.authority, defined_centers };
}

function mapNatal(res: unknown): {
  sun_sign?: unknown;
  moon_sign?: unknown;
  ascendant_sign?: unknown;
} {
  const chart = (res as { chart_data?: unknown })?.chart_data as
    | Record<string, unknown>
    | undefined;
  if (!chart || typeof chart !== "object") {
    throw new ChartProviderError(
      "astrology-api.io natal response is missing chart_data",
    );
  }
  const positions = Array.isArray(chart.planetary_positions)
    ? (chart.planetary_positions as { name?: unknown; sign?: unknown }[])
    : [];
  const signOf = (name: string): unknown =>
    positions.find((p) => p.name === name)?.sign;

  // Ascendant: the requested active point when present, else house cusp 1.
  let asc = signOf("Ascendant");
  if (asc === undefined && Array.isArray(chart.house_cusps)) {
    asc = (chart.house_cusps as { house?: unknown; sign?: unknown }[]).find(
      (c) => c.house === 1,
    )?.sign;
  }

  const out: { sun_sign?: unknown; moon_sign?: unknown; ascendant_sign?: unknown } =
    {};
  const sun = expandSign(signOf("Sun"));
  const moon = expandSign(signOf("Moon"));
  const ascendant = expandSign(asc);
  if (sun !== undefined) out.sun_sign = sun;
  if (moon !== undefined) out.moon_sign = moon;
  if (ascendant !== undefined) out.ascendant_sign = ascendant;
  return out;
}
