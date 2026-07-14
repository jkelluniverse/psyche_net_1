// THE SHARED ONTOLOGY — single source of truth for ontology keys (renderer-
// lens spec §1, D-R1). Chart-agnostic by construction: keys describe
// psychology, never chart features, and the lens map PROJECTS INTO this
// vocabulary — no key here may encode a chart origin (CI denylist:
// hd|astro|natal|gate|center|house|sign|authority|chart as key segments).
//
// D-R1 process rule (enforced by scripts/ci/lens-ontology-guard.mjs): a
// change-set that modifies BOTH this file and lens-map.* fails CI — the
// vocabulary must land first, in its own reviewed change-set, so a lens-map
// edit can never smuggle chart-shaped vocabulary into the proposer's world.
//
// The proposer sees this same global vocabulary for every user, chart or no
// chart — a global vocabulary is not a hypothesis (blinding untouched). The
// residual population-level gradient (the ontology slowly growing
// chart-shaped) is measured by the eval corpus's lens-confirmation canary,
// tracked per ONTOLOGY_VERSION.
//
// Key convention: dotted, type-prefixed, kebab slug — `pattern.emotional-wave`
// — matching the proposer prompt's "propose a new dotted key" instruction and
// the gate's exact-key matching (a bare or differently-shaped key is
// unreachable by extraction and would be SILENT forever).

export const ONTOLOGY_VERSION = "v2"; // v1 = {belief.core, pattern.core}; v2 adds the 41 psychological keys the lens map targets

export const ONTOLOGY_KEYS = [
  // v1 seed keys
  "belief.core",
  "pattern.core",

  // v2 — decision & clarity styles
  "pattern.clarity-needs-time",
  "pattern.clarity-through-speaking",
  "pattern.clarity-through-sounding-board",
  "pattern.clarity-over-a-cycle",
  "resource.trusts-gut-response",
  "resource.first-instinct-knowing",

  // v2 — energy & initiative styles
  "pattern.energized-by-response",
  "pattern.multi-track-momentum",
  "pattern.waits-for-recognition",
  "pattern.initiates-independently",
  "pattern.willpower-follows-desire",
  "resource.sustainable-work-energy",
  "trait.steady-internal-drive",
  "trait.vitality-through-action",

  // v2 — emotional life
  "pattern.emotional-wave",
  "pattern.absorbs-others-emotions",
  "pattern.needs-a-spark",
  "pattern.soothed-by-stability",
  "pattern.feelings-need-words",
  "pattern.deep-feeling-needs-safety",
  "trait.feels-the-undercurrent",

  // v2 — identity & expression
  "trait.mirrors-environment",
  "trait.stable-identity-anchor",
  "pattern.identity-shifts-with-context",
  "resource.consistent-voice",
  "pattern.voice-seeks-invitation",
  "trait.processes-through-ideas",

  // v2 — cognition & perspective
  "trait.fixed-conceptual-lens",
  "pattern.self-generated-inquiry",
  "pattern.carries-others-questions",
  "resource.flexible-perspective",
  "trait.trusts-the-tangible",

  // v2 — pressure, pace, and boundaries
  "pattern.no-natural-stop-signal",
  "pattern.rushing-to-discharge-pressure",
  "pattern.leads-into-the-new",
  "pattern.holds-course-under-pressure",
  "pattern.adapts-first-self-second",

  // v2 — protection & shadow themes
  "trait.promise-driven-will",
  "resource.steady-safety-instinct",
  "shadow.proving-worth",
  "shadow.holds-on-past-good",
] as const;

export type OntologyKey = (typeof ONTOLOGY_KEYS)[number];

export const ONTOLOGY_KEY_SET: ReadonlySet<string> = new Set(ONTOLOGY_KEYS);
