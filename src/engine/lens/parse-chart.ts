// CHART PARSER — the seam where a third-party API's JSON becomes OUR feature
// strings (renderer-lens spec §1; lens-lane build stage 1).
//
// Contract obligations:
// - DETERMINISTIC: same raw JSON → byte-identical ParseResult (features are
//   canonically sorted + deduplicated; no clock, no randomness).
// - SKIP-AND-LOG, NEVER GUESS: an unknown chart feature is recorded in
//   `skipped` with its path and reason, and emits nothing. Malformed
//   top-level input fails the WHOLE parse closed ({ok:false}) — the import
//   records status=error with zero nodes, never a partial ghost sky.
// - VERSION-STAMPED: every result (including failures) carries
//   PARSER_VERSION and FEATURE_VOCABULARY_VERSION, so when the provider
//   changes its response shape, replay knows which parser read which raw
//   JSON. The vocabulary is closed: the parser can only emit members of
//   CHART_FEATURE_VOCABULARY (a superset check lives in lens-map.spec.ts's
//   sibling: every lens-map feature must be reachable).
//
// Chart-speak (signs, centers, authorities) is LEGAL here — this is the
// mapping's INPUT side; the D-R1 direction rule governs what leaves the lane
// (ontology keys and labels), never what enters it.

export const PARSER_VERSION = "v1";
export const FEATURE_VOCABULARY_VERSION = "v1";

// ── The closed vocabularies (input side) ────────────────────────────────────

const HD_TYPES: Record<string, string> = {
  generator: "generator",
  manifesting_generator: "manifesting_generator",
  mg: "manifesting_generator",
  projector: "projector",
  manifestor: "manifestor",
  reflector: "reflector",
};

const HD_AUTHORITIES: Record<string, string> = {
  emotional: "emotional",
  solar_plexus: "emotional",
  sacral: "sacral",
  splenic: "splenic",
  spleen: "splenic",
  ego: "ego",
  heart: "ego",
  self_projected: "self_projected",
  mental: "mental",
  environmental: "mental",
  lunar: "lunar",
  none: "lunar",
};

export const HD_CENTERS = [
  "head",
  "ajna",
  "throat",
  "g",
  "heart",
  "sacral",
  "solar_plexus",
  "spleen",
  "root",
] as const;

const HD_CENTER_ALIASES: Record<string, string> = {
  head: "head",
  ajna: "ajna",
  throat: "throat",
  g: "g",
  g_center: "g",
  identity: "g",
  self: "g",
  heart: "heart",
  ego: "heart",
  will: "heart",
  sacral: "sacral",
  solar_plexus: "solar_plexus",
  emotional: "solar_plexus",
  spleen: "spleen",
  splenic: "spleen",
  root: "root",
};

const SIGN_ELEMENT: Record<string, string> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
};

const SIGN_MODALITY: Record<string, string> = {
  aries: "cardinal", cancer: "cardinal", libra: "cardinal", capricorn: "cardinal",
  taurus: "fixed", leo: "fixed", scorpio: "fixed", aquarius: "fixed",
  gemini: "mutable", virgo: "mutable", sagittarius: "mutable", pisces: "mutable",
};

/** The closed set of feature strings this parser can ever emit. */
export const CHART_FEATURE_VOCABULARY: ReadonlySet<string> = new Set([
  ...[...new Set(Object.values(HD_TYPES))].map((t) => `hd.type.${t}`),
  ...[...new Set(Object.values(HD_AUTHORITIES))].map((a) => `hd.authority.${a}`),
  ...HD_CENTERS.map((c) => `hd.defined.${c}`),
  ...HD_CENTERS.map((c) => `hd.undefined.${c}`),
  ...["fire", "earth", "air", "water"].map((e) => `natal.sun.${e}`),
  ...["fire", "earth", "air", "water"].map((e) => `natal.moon.${e}`),
  ...["cardinal", "fixed", "mutable"].map((m) => `natal.asc.${m}`),
]);

// ── Result shape ────────────────────────────────────────────────────────────

export interface SkippedFeature {
  /** JSON-path-ish locator into the raw chart ("human_design.defined_centers[1]"). */
  path: string;
  reason: string;
}

export type ParseResult =
  | {
      ok: true;
      /** Canonically sorted, deduplicated, every member ∈ CHART_FEATURE_VOCABULARY. */
      features: string[];
      skipped: SkippedFeature[];
      parserVersion: string;
      featureVocabularyVersion: string;
    }
  | {
      ok: false;
      reason: string;
      parserVersion: string;
      featureVocabularyVersion: string;
    };

const STAMPS = {
  parserVersion: PARSER_VERSION,
  featureVocabularyVersion: FEATURE_VOCABULARY_VERSION,
};

/** Provider-string normalization: casing/spacing/hyphens are theirs, not meaning. */
const norm = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0
    ? v.trim().toLowerCase().replace(/[\s-]+/g, "_")
    : null;

export function parseChart(raw: unknown): ParseResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "chart payload is not an object", ...STAMPS };
  }
  const chart = raw as Record<string, unknown>;
  const hd = chart.human_design;
  const natal = chart.natal;
  const hasHd = hd !== null && typeof hd === "object" && !Array.isArray(hd);
  const hasNatal = natal !== null && typeof natal === "object" && !Array.isArray(natal);
  if (!hasHd && !hasNatal) {
    return {
      ok: false,
      reason: "chart payload carries neither human_design nor natal data",
      ...STAMPS,
    };
  }

  const features = new Set<string>();
  const skipped: SkippedFeature[] = [];
  const skip = (path: string, reason: string) => skipped.push({ path, reason });

  if (hasHd) {
    const h = hd as Record<string, unknown>;
    const type = norm(h.type);
    if (type === null) {
      if (h.type !== undefined) skip("human_design.type", "not a usable string");
    } else if (HD_TYPES[type]) {
      features.add(`hd.type.${HD_TYPES[type]}`);
    } else {
      skip("human_design.type", `unknown HD type "${String(h.type)}" — skipped, never guessed`);
    }

    const authority = norm(h.authority);
    if (authority === null) {
      if (h.authority !== undefined) skip("human_design.authority", "not a usable string");
    } else if (HD_AUTHORITIES[authority]) {
      features.add(`hd.authority.${HD_AUTHORITIES[authority]}`);
    } else {
      skip(
        "human_design.authority",
        `unknown HD authority "${String(h.authority)}" — skipped, never guessed`,
      );
    }

    if (Array.isArray(h.defined_centers)) {
      const defined = new Set<string>();
      h.defined_centers.forEach((c, i) => {
        const n = norm(c);
        const canonical = n === null ? undefined : HD_CENTER_ALIASES[n];
        if (canonical) {
          defined.add(canonical);
        } else {
          skip(
            `human_design.defined_centers[${i}]`,
            `unknown HD center "${String(c)}" — skipped, never guessed`,
          );
        }
      });
      for (const c of HD_CENTERS) {
        features.add(defined.has(c) ? `hd.defined.${c}` : `hd.undefined.${c}`);
      }
    } else if (h.defined_centers !== undefined) {
      skip("human_design.defined_centers", "not an array");
    }
  }

  if (hasNatal) {
    const n = natal as Record<string, unknown>;
    const bySign = (
      field: "sun_sign" | "moon_sign" | "ascendant_sign",
      table: Record<string, string>,
      prefix: string,
    ) => {
      const sign = norm(n[field]);
      if (sign === null) {
        if (n[field] !== undefined) skip(`natal.${field}`, "not a usable string");
        return;
      }
      const mapped = table[sign];
      if (mapped) {
        features.add(`${prefix}.${mapped}`);
      } else {
        skip(`natal.${field}`, `unknown sign "${String(n[field])}" — skipped, never guessed`);
      }
    };
    bySign("sun_sign", SIGN_ELEMENT, "natal.sun");
    bySign("moon_sign", SIGN_ELEMENT, "natal.moon");
    bySign("ascendant_sign", SIGN_MODALITY, "natal.asc");
  }

  return {
    ok: true,
    features: [...features].sort(),
    skipped,
    ...STAMPS,
  };
}
