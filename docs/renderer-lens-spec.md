# Constellation Renderer & Lens Lane — Module Specification

*Psyche-Net · the sky and its first ghosts · v1.0 · governs `/src/engine/lens/`, `/src/engine/hypothesis-match/`, `/src/app/(sky)/` · for REVIEW-01 iteration*

> **v1.0 changelog:** initial draft (Jacob) — lens lane, sky renderer, and hypothesis matcher as one ghost-sky milestone spec, entering the REVIEW-01 loop.

> Three modules in one spec because they ship as one milestone — the Tier 0 ghost sky on the production URL. **None of them touches the extraction pipeline.** The lens lane is deterministic (no LLM, no gate — chart data in, hypothesis nodes out at mass 0). The renderer is a pure projection of persisted graph state. The hypothesis matcher is the one place lens hypotheses and extracted evidence legally meet — downstream of the gate, in the light, never in the proposer's context (the blinding invariant's other half). Cross-references: CLAUDE.md, gate spec v1.6 (§1.1, contracts), schema.prisma (ChartImport, PsycheNode, lens FK), master concept §4.4/§5.1, contract module v2.2.

---

## 1. The lens lane (`/src/engine/lens/`)

**What it is:** birth data → astrology-api.io → `ChartImport` row (raw JSON preserved) → a **deterministic, versioned mapping** produces lens `PsycheNode`s: `provenance=LENS`, `state=HYPOTHESIS`, `mass=0`, `confidence=` the hypothesis floor (0.15, config), `chartImportId` FK set, `lensMapVersion` stamped.

**The mapping is code, not model.** A versioned table (`lens-map.v1.ts`) from chart features (e.g., HD type/authority/defined centers; natal placements) to hypothesis node templates — each with a `type`, a plain-language label ("may protect independence under pressure"), and an `ontologyKey`. Same chart → same ghosts, always. No LLM anywhere in this lane; an LLM summarizer for chart *prose* is post-pilot and would never create nodes regardless (LAW 4 applies to lanes too: only the mapping creates, and only lived words ever charge).

**Rules:**
- v1 systems: Human Design + Western natal (or HD only if the API integration fights back — cut-line applies). `system` recorded per import.
- **Ghost budget:** a chart can imply dozens of hypotheses; cap materialized ghosts (config, ~9–15) ranked by the mapping's own priority field. An overcrowded ghost sky is noise and undermines the "few honest hypotheses" posture.
- Re-import is idempotent per (user, system): same chart upserts, never duplicates.
- Birth data is quasi-special-category PII (schema comment): transported to the chart API over TLS, raw response stored, provider + retention noted in the §7.1 governance bundle entry.
- **No lens node is ever created from extracted text**, and no extracted node ever gets `provenance=LENS`. The lanes never cross except in §3.

**Failure modes:** API down/malformed → import recorded with `status=error`, zero nodes, retryable — never a partial ghost sky. Unknown chart feature → skipped and logged, never guessed into a node.

## 2. The renderer (`/src/app/(sky)/` + `/src/engine/sky-projection/`)

**Data flow:** persisted graph → `skyProjection(nodes, edges, now)` (pure function → a `SkyViewModel`) → cosmos.gl v3. The projection is the ONLY place domain values become visual values, and it is unit-testable without a GPU.

**The rendering grammar (each mapping versioned in config, per the physics grammar §4.4):**
- `mass` → node size (log scale; mass 0 = minimum ghost radius).
- `luminosity`/recency → brightness; DORMANT nodes dim, never vanish.
- `confidence` → **always visible** (LAW 5): opacity floor + a subtle uncertainty ring; low confidence must be *legible*, not just technically encoded.
- `state` → styling: HYPOTHESIS = **ghost styling** (dashed ring, reduced saturation, explicit "hypothesis" badge on tap — the ghost sky's entire integrity claim is that it *looks* like a question, not an answer); CONTRADICTED = visibly dimmed/struck, still present; IGNITED = the ceremony style; QUESTIONED/LOOSENING per the change arc.
- Edges → line weight by strength, style by type; shadow-lane edges are **not rendered at all** (held, not shown).
- The **edge of the unexplored** (LAW 5): the sky always renders a soft unexplored fringe — never blank, never falsely complete.

**Hard invariants (from CLAUDE.md — restated because this module is where they bite):**
- **Domain/rendering separation:** force-layout positions are stochastic artifacts. No coordinate is persisted into domain state, read as meaning, or fed back into anything. Layout uses a fixed seed per user for session-to-session visual continuity — a *rendering* convenience, not a semantic claim. Nothing in copy or UI may imply proximity = psychological relatedness beyond the edges actually drawn.
- **cosmos.gl v3 only** (`@cosmos.gl/graph`, MIT; never `@cosmograph/cosmograph`): async init — constructor returns immediately, public methods queue until `graph.ready`; use the v3 API, no pre-v3 tutorial code. Pin the version; record the SPDX license at install.
- **Reduced-motion / non-spatial fallback:** `prefers-reduced-motion` → static layout, no animated transitions; plus a full **list view** (nodes grouped by type/state, keyboard navigable, evidence accessible) shipped in v1 — required because position carries no domain meaning, so no information may exist *only* spatially or in motion.
- **Mobile touch is first-class** (the demo is on their phone): tap = select, pinch = zoom, long-press = evidence. Test on a real phone, not devtools emulation.

**Tap-for-evidence:** node → panel with label, type, state, plain-language confidence, and its evidence list — each `Evidence` row rendered by slicing `SourceEvent.content` with `spanStart/spanEnd` (the spans the NFKC index map exists to protect), with `occurredAt` shown (temporal honesty). Hypothesis nodes with zero evidence show their provenance instead: "From your Human Design chart — nothing in your words yet confirms or contradicts this." Practitioner-authored evidence visibly marked non-conferring.

**Realization events (v1 minimal):** when a pass materializes/charges nodes, the new/changed nodes animate in via cosmos v3 transitions and a small toast names them. The full ceremony choreography is post-pilot; the cut-line already covers degrading to static.

## 3. The hypothesis matcher (`/src/engine/hypothesis-match/`)

The blinding invariant's completion: the **deterministic, post-gate** module that may see both worlds. After the writer persists a pass, the matcher compares newly validated EXTRACTED nodes/evidence against standing LENS (and BECOMING) hypotheses and updates hypothesis state:

- **Match rule (deterministic, versioned `matchRuleVersion`):** v1 = same `type` + same `ontologyKey` (exact key match only; no embeddings, no LLM similarity — logged as post-pilot). On match: supporting evidence → hypothesis accumulates *charge* toward `HYPOTHESIS → ACTIVE` per the gate's materialization threshold; COUNTERVAILING evidence (under the §1.1 guards — recurrence ≥2 events, or practitioner confirmation) → `CONTRADICTED`.
- **SILENT is a state of honesty:** unmatched hypotheses just remain HYPOTHESIS — displayed as "your words haven't spoken to this yet," never decayed into fake contradiction.
- The matcher **never creates nodes, never touches mass arithmetic, never runs during extraction.** It reads persisted state and writes hypothesis-state transitions through the same writer, stamped with its own version.
- **Ordering:** runs strictly after the writer commits; the proposer's next pass still never sees hypotheses (its `priorExtractedNodes` filter is untouched by this module's existence).

## 4. Out of scope (deliberate)

Time-scrub UI (the event model supports it; the scrub ships post-ghost-sky); cross-system convergence scoring; chart-prose summaries; cumulative-luminosity global arc; ceremony choreography; any wearable/body rendering. Group views: never in v1.

## 5. Tests

1. **Lens determinism keystone:** same chart JSON → byte-identical node set (labels, keys, order), twice. Different `lensMapVersion` → allowed to differ.
2. **Ghost integrity:** every lens node persists with mass 0, HYPOTHESIS, confidence floor, chartImportId set — and the projection styles it ghost (snapshot test on the view model, not pixels).
3. **Projection purity:** `skyProjection` same input → same view model; no Date.now(), no randomness (seed is an explicit input).
4. **Domain/rendering firewall:** property test — no field of the view model's layout output is ever written back through any writer path; type-level check that coordinate types can't enter domain modules.
5. **Span slice round-trip in the UI path:** evidence panel renders exactly `content.slice(spanStart, spanEnd)` for the non-ASCII fixtures (the gate's test 11, re-asserted where users actually see it).
6. **Matcher keystones:** exact-key match charges; near-miss key does NOT (no fuzzy creep); single COUNTERVAILING label does not contradict (solo §1.1 guard); unmatched stays SILENT; matcher output replays identically.
7. **Fallback completeness:** every node/edge/evidence reachable in the list view with keyboard only; reduced-motion snapshot renders without transition calls.
8. **Import failure:** API error → status=error, zero nodes, retry works, no partial sky.

## 6. Build order

Lens mapping + import (deterministic, testable today) → sky projection + view-model tests → cosmos.gl v3 integration on the Railway deploy (ghost sky live) → tap-for-evidence + list fallback → hypothesis matcher. The ghost sky milestone requires only the first three.

*— End of renderer & lens spec v1.0. For REVIEW-01 iteration. Provisional and revisable — the ghost must always look like a ghost, and the map must never mistake its own layout for the territory.*
