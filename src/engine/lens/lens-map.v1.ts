/**
 * lens-map.v1.ts — STARTER SET (Jacob's draft; v1-draft until he stamps it canon)
 * Chart features → hypothesis node templates. Deterministic: same chart, same ghosts.
 *
 * PHRASING RULES (ghost integrity — every label must pass all four; lens-map.spec.ts
 * enforces 3 and the denylist half of 1; 2 and 4 are editorial judgment):
 *  1. Plain language a person would actually say — no jargon, no chart-speak in the label.
 *  2. Falsifiable by lived words: it must be possible for a journal entry to confirm OR contradict it.
 *  3. Hedged as hypothesis ("may", "might tend to") — never oracular, never "you are".
 *  4. Behaviorally specific enough to match extracted evidence (vague = SILENT forever;
 *     the matcher needs the ontologyKey to be reachable by real extraction).
 *
 * D-R1 DIRECTION RULE: every ontologyKey below is chart-agnostic psychological vocabulary
 * that ALREADY EXISTS in the shared ontology module (typed subset — an unknown key is a
 * compile error; the vocabulary landed in its own preceding change-set, commit 25b725b).
 * Keys are dotted and type-prefixed (`pattern.emotional-wave`) — the shape the proposer
 * prompt instructs and the exact-key matcher can reach; a bare hyphenated key would be
 * SILENT forever. No key encodes its chart origin; the CI guard runs the denylist over
 * keys AND labels and forbids ontology+lens-map co-modification.
 *
 * PRIORITY: 1 = strongest candidates for the ghost budget (cap ~9–15, config).
 * Tier 1: type + authority + moon (the "spine" ghosts). Tier 2: defined centers + sun.
 * Tier 3: undefined centers + ascendant (conditioning themes — subtler, still valuable).
 */

import type { NodeType } from "../contracts/extraction-contracts";
import type { OntologyKey } from "../ontology/ontology";

export interface LensTemplate {
  feature: string;            // canonical chart-feature key (matching the ChartImport parser)
  system: "human_design" | "western_natal";
  /** No WOUND ghosts ever (intake never opens wounds); LENS unwritable (D-R4);
   *  BECOMING enters through its own lane, never this one. */
  type: Exclude<NodeType, "WOUND" | "LENS" | "BECOMING">;
  label: string;              // what the person sees — the four phrasing rules apply
  ontologyKey: OntologyKey;   // typed subset of the shared ontology (D-R1)
  priority: 1 | 2 | 3;
}

export const LENS_MAP_VERSION = "v1-draft";

export const lensMap: LensTemplate[] = [
  // ── HUMAN DESIGN · TYPE (tier 1 — one fires per chart) ─────────────────────
  { feature: "hd.type.generator", system: "human_design", type: "PATTERN", priority: 1,
    label: "May have more energy for things you respond to than things you initiate", ontologyKey: "pattern.energized-by-response" },
  { feature: "hd.type.manifesting_generator", system: "human_design", type: "PATTERN", priority: 1,
    label: "May move fastest juggling several things, and lose steam when forced down one track", ontologyKey: "pattern.multi-track-momentum" },
  { feature: "hd.type.projector", system: "human_design", type: "PATTERN", priority: 1,
    label: "May do your best work when invited or recognized, and burn out pushing uninvited", ontologyKey: "pattern.waits-for-recognition" },
  { feature: "hd.type.manifestor", system: "human_design", type: "PATTERN", priority: 1,
    label: "May need to start things on your own terms, and chafe when required to ask first", ontologyKey: "pattern.initiates-independently" },
  { feature: "hd.type.reflector", system: "human_design", type: "TRAIT", priority: 1,
    label: "May take on the mood of the room more than most, and need time alone to find your own read", ontologyKey: "trait.mirrors-environment" },

  // ── HUMAN DESIGN · AUTHORITY (tier 1 — one fires) ──────────────────────────
  { feature: "hd.authority.emotional", system: "human_design", type: "PATTERN", priority: 1,
    label: "May regret decisions made in the heat of a feeling, and choose better after sleeping on it", ontologyKey: "pattern.clarity-needs-time" },
  { feature: "hd.authority.sacral", system: "human_design", type: "RESOURCE", priority: 1,
    label: "May have a reliable gut yes/no in the moment, if you let yourself trust it", ontologyKey: "resource.trusts-gut-response" },
  { feature: "hd.authority.splenic", system: "human_design", type: "RESOURCE", priority: 1,
    label: "May get quiet first-instant instincts that prove right — and fade if you deliberate", ontologyKey: "resource.first-instinct-knowing" },
  { feature: "hd.authority.ego", system: "human_design", type: "PATTERN", priority: 1,
    label: "May follow through best on what you genuinely want, and stall on what you merely should", ontologyKey: "pattern.willpower-follows-desire" },
  { feature: "hd.authority.self_projected", system: "human_design", type: "PATTERN", priority: 1,
    label: "May not know what you think until you hear yourself say it out loud to someone", ontologyKey: "pattern.clarity-through-speaking" },
  { feature: "hd.authority.mental", system: "human_design", type: "PATTERN", priority: 1,
    label: "May decide best after talking it through in the right company, not alone in your head", ontologyKey: "pattern.clarity-through-sounding-board" },
  { feature: "hd.authority.lunar", system: "human_design", type: "PATTERN", priority: 1,
    label: "May need a long while — weeks, not days — before a big decision feels truly settled", ontologyKey: "pattern.clarity-over-a-cycle" },

  // ── HUMAN DESIGN · DEFINED CENTERS (tier 2 — consistent traits/resources) ──
  { feature: "hd.defined.sacral", system: "human_design", type: "RESOURCE", priority: 2,
    label: "May have steady workhorse energy when engaged with the right things", ontologyKey: "resource.sustainable-work-energy" },
  { feature: "hd.defined.solar_plexus", system: "human_design", type: "PATTERN", priority: 2,
    label: "May run on an emotional wave — high and low tides that aren't caused by events", ontologyKey: "pattern.emotional-wave" },
  { feature: "hd.defined.spleen", system: "human_design", type: "RESOURCE", priority: 2,
    label: "May have a quiet, constant sense of what's safe and what's off", ontologyKey: "resource.steady-safety-instinct" },
  { feature: "hd.defined.heart", system: "human_design", type: "TRAIT", priority: 2,
    label: "May naturally make and keep promises — and overcommit when proving something", ontologyKey: "trait.promise-driven-will" },
  { feature: "hd.defined.g", system: "human_design", type: "TRAIT", priority: 2,
    label: "May have a stable sense of who you are that others orient around", ontologyKey: "trait.stable-identity-anchor" },
  { feature: "hd.defined.throat", system: "human_design", type: "RESOURCE", priority: 2,
    label: "May express yourself in a consistent voice people recognize as distinctly yours", ontologyKey: "resource.consistent-voice" },
  { feature: "hd.defined.ajna", system: "human_design", type: "TRAIT", priority: 2,
    label: "May hold firm ways of making sense of things, and defend them when questioned", ontologyKey: "trait.fixed-conceptual-lens" },
  { feature: "hd.defined.head", system: "human_design", type: "PATTERN", priority: 2,
    label: "May generate your own questions and pressure to figure things out, even unprompted", ontologyKey: "pattern.self-generated-inquiry" },
  { feature: "hd.defined.root", system: "human_design", type: "TRAIT", priority: 2,
    label: "May carry a steady internal drive that keeps its own pace under pressure", ontologyKey: "trait.steady-internal-drive" },

  // ── HUMAN DESIGN · UNDEFINED CENTERS (tier 3 — conditioning themes; SHADOW used sparingly) ──
  { feature: "hd.undefined.solar_plexus", system: "human_design", type: "PATTERN", priority: 3,
    label: "May absorb and amplify other people's emotions, and avoid conflict to keep the peace", ontologyKey: "pattern.absorbs-others-emotions" },
  { feature: "hd.undefined.heart", system: "human_design", type: "SHADOW", priority: 3,
    label: "May feel a pull to prove your worth, and promise more than you mean to", ontologyKey: "shadow.proving-worth" },
  { feature: "hd.undefined.sacral", system: "human_design", type: "PATTERN", priority: 3,
    label: "May not know when enough is enough — working or committing past your real capacity", ontologyKey: "pattern.no-natural-stop-signal" },
  { feature: "hd.undefined.root", system: "human_design", type: "PATTERN", priority: 3,
    label: "May hurry to get things done just to be free of the pressure of them", ontologyKey: "pattern.rushing-to-discharge-pressure" },
  { feature: "hd.undefined.g", system: "human_design", type: "PATTERN", priority: 3,
    label: "May shape-shift by company and place, and wonder which version is really you", ontologyKey: "pattern.identity-shifts-with-context" },
  { feature: "hd.undefined.head", system: "human_design", type: "PATTERN", priority: 3,
    label: "May take on other people's questions as if they were yours to answer", ontologyKey: "pattern.carries-others-questions" },
  { feature: "hd.undefined.ajna", system: "human_design", type: "RESOURCE", priority: 3,
    label: "May see issues from many angles rather than one fixed view — flexible, not uncertain", ontologyKey: "resource.flexible-perspective" },
  { feature: "hd.undefined.spleen", system: "human_design", type: "SHADOW", priority: 3,
    label: "May hold on to what no longer feels good — jobs, people, habits — longer than serves you", ontologyKey: "shadow.holds-on-past-good" },
  { feature: "hd.undefined.throat", system: "human_design", type: "PATTERN", priority: 3,
    label: "May talk to attract attention when unseen, or clam up entirely — little in between", ontologyKey: "pattern.voice-seeks-invitation" },

  // ── WESTERN NATAL · SUN by element (tier 2) ────────────────────────────────
  { feature: "natal.sun.fire", system: "western_natal", type: "TRAIT", priority: 2,
    label: "May come alive through action and bold starts, and dim when nothing's moving", ontologyKey: "trait.vitality-through-action" },
  { feature: "natal.sun.earth", system: "western_natal", type: "TRAIT", priority: 2,
    label: "May trust what's tangible and built step by step over what's promised or imagined", ontologyKey: "trait.trusts-the-tangible" },
  { feature: "natal.sun.air", system: "western_natal", type: "TRAIT", priority: 2,
    label: "May process life by thinking and talking it through — connection happens through ideas", ontologyKey: "trait.processes-through-ideas" },
  { feature: "natal.sun.water", system: "western_natal", type: "TRAIT", priority: 2,
    label: "May feel your way through decisions and read undercurrents others miss", ontologyKey: "trait.feels-the-undercurrent" },

  // ── WESTERN NATAL · MOON by element (tier 1 — emotional needs are the most journal-visible) ──
  { feature: "natal.moon.fire", system: "western_natal", type: "PATTERN", priority: 1,
    label: "May need excitement or a cause to feel emotionally alive, and get restless without one", ontologyKey: "pattern.needs-a-spark" },
  { feature: "natal.moon.earth", system: "western_natal", type: "PATTERN", priority: 1,
    label: "May settle emotionally through routine, order, and things you can count on", ontologyKey: "pattern.soothed-by-stability" },
  { feature: "natal.moon.air", system: "western_natal", type: "PATTERN", priority: 1,
    label: "May need to talk feelings out to understand them — unspoken emotion stays unsettled", ontologyKey: "pattern.feelings-need-words" },
  { feature: "natal.moon.water", system: "western_natal", type: "PATTERN", priority: 1,
    label: "May feel things deeply and need real closeness — and retreat when it isn't safe to", ontologyKey: "pattern.deep-feeling-needs-safety" },

  // ── WESTERN NATAL · ASCENDANT by modality (tier 3 — the approach others meet first) ──
  { feature: "natal.asc.cardinal", system: "western_natal", type: "PATTERN", priority: 3,
    label: "May instinctively take charge of new situations before anyone asks you to", ontologyKey: "pattern.leads-into-the-new" },
  { feature: "natal.asc.fixed", system: "western_natal", type: "PATTERN", priority: 3,
    label: "May hold your course once set, and dig in when pushed to change direction", ontologyKey: "pattern.holds-course-under-pressure" },
  { feature: "natal.asc.mutable", system: "western_natal", type: "PATTERN", priority: 3,
    label: "May adapt to whatever the situation needs, and lose your own thread while doing it", ontologyKey: "pattern.adapts-first-self-second" },
];
