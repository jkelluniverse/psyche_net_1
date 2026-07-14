# Punch-list — renderer-lens-spec v1.0 · Round 1 · REVIEW-01 loop

*Claude lane: Request Revisions — 2C/7M/7m/3E. ChatGPT lane: Request Revisions —
5C/6M/4m/5E. The lanes converged independently on the same four structural
seams (matcher carrier, dual-matcher collision, persisted x/y, missing
schema/contract carriers) — high-confidence findings. Both lanes also
independently praised the same strengths: the lane separation is the right
shape, fail-closed lens imports, the ghost budget, and test 5's span
re-assertion at the UI layer.*

**CHECKPOINT (enabled): STOP — decisions D-R1…D-R5 below are Jacob's.**

---

## ACCEPT-NOW (integrate before any further round)

### A-1 (Claude C-1 ≡ ChatGPT C-2 + #9 + E-18) — The matcher's "accumulates charge" has no carrier
The load-bearing behavior of §3 is unspecified five ways: where matched
evidence lives (an ACTIVE hypothesis with zero Evidence rows violates LAW 1
at the tap-for-evidence panel); who computes mass (matcher disclaims it, gate
isn't running, nothing else exists); who computes the transition (must
**import the gate's exported pure functions** — reimplementation is a
duplication seam that drifts on first tuning); what version stamps land
(`matchRuleVersion` alone is not explainability — needs the three algorithm
versions + `computedAt`); and no persisted matcher-run record makes test 6's
"replays identically" assertable.
**Fix shape (needs D-R2):** new §3.1 — matched evidence is LINKED to the
hypothesis node through the graph writer (extracted rows intact); mass/
confidence/state recomputed by importing the gate's pure functions over the
merged evidence set (reuse mandated, duplication banned); full stamp set on
every transition; a persisted `MatcherRun`; matcher consumes a versioned
config with mode (SUPERVISED|SOLO) mirroring GateConfig so the §1.1
countervailing guards are structural (ChatGPT #9). **Evidence-semantics
adjacency → charter hard rule applies: failing-first tests including a
pipeline-level test** (extracted evidence charges a lens node end-to-end;
single COUNTERVAILING never contradicts in SOLO; replay identical).

### A-2 (Claude C-2 ≡ ChatGPT C-5) — Two hypothesis matchers exist and the gate's dedupe can merge extracted evidence into LENS nodes today
Gate spec v1.6 already owns an in-gate BECOMING label-matcher, and its
generic same-type+label dedupe against `priorGraph` doesn't exclude
LENS-provenance nodes — so lens confirmation can happen inside the gate, on a
different rule than §3's, bypassing the countervailing guards, before the
matcher ever runs. Falsifies "the one place the lanes legally meet."
**Fix shape (needs D-R3):** (a) gate's dedupe/merge scope pinned to
EXTRACTED-provenance prior nodes only → **requires gate spec v1.7 + contract
note, same commit** (charter: seams fixed on both sides); (b) BECOMING stays
gate-owned; §3 drops "(and BECOMING)" — the post-gate matcher is LENS-only in
v1; (c) precedence stated: gate own-key dedupe → gate becoming-label merge →
post-gate lens matcher; (d) new test: an extracted proposal label-identical
to a lens ghost does NOT merge in-gate.

### A-3 (ChatGPT C-1) — Lens node typing is ambiguous and can make the matcher structurally unmatchable
If lens nodes are created with `type=LENS`, "same type + same ontologyKey"
never fires (extractable types exclude LENS) and the whole lane is dead on
arrival. **Fix shape (needs D-R4):** lens nodes carry the DOMAIN type
(BELIEF/PROTECTION/…) with `provenance=LENS`; `NodeType.LENS` is marked
deprecated-never-written in the contract; lint/test that no lens node is ever
created with `type=LENS`.

### A-4 (Claude M-1 ≡ ChatGPT C-3) — `PsycheNode.x/y/colorHint` contradict the domain/rendering firewall
The schema ships the exact escape hatch the spec (and CLAUDE.md) forbids.
**Fix:** the spec orders these columns removed in the same migration that
adds the lens fields; continuity comes from the fixed seed alone (any future
layout cache lives in a rendering-only store, never on domain tables); test 4
gains a schema assertion (no coordinate columns on domain tables).

### A-5 (Claude M-2 ≡ ChatGPT C-4 + #6) — Missing carriers: the spec references fields, constraints, and contracts that don't exist
`PsycheNode.lensMapVersion`; `matchRuleVersion` (nowhere); `ChartImport.status`;
no `@@unique` for the idempotent upsert (ChatGPT: + canonical
`chartFingerprint` so "same chart" is well-defined against provider JSON
field-order); no priority/ghost-budget config keys; no matcher contract types
(incl. the practitioner-confirmation carrier §3 cites as a CONTRADICTED
trigger); `SkyViewModel` ownership unnamed. **Fix:** a new "schema & contract
deltas" section enumerating every column/constraint/type with its owning
migration; contract bump; the confirmation carrier specified or removed from
§3's trigger list until it exists.

### A-6 (Claude M-4) — WOUND gating is absent from the renderer, where LAW 7 actually bites
D9 already decided the client-facing reveal of WOUND material defaults to
practitioner-mediated **at the display layer** — this spec is that display
layer and doesn't implement it. **Fix (needs D-R5 confirm):** rendering-
grammar rule — WOUND nodes render gated by role/skin (versioned config):
veiled-but-present for INDIVIDUAL (LAW 5: never falsely complete), full in
supervised skins per consentScope; §5 gains the gated-snapshot test.

### A-7 (Claude M-5 ≡ ChatGPT #7) — Brightness consumes `luminosity`, whose defining function the schema explicitly defers
Either brightness collapses to a constant or someone computes it ad hoc
against the schema's own "specify before use" guard. **Fix:** v1 brightness =
a NAMED, VERSIONED recency function computed inside `skyProjection` from
(evidence `occurredAt`, explicit `now`) with half-life in config; the
persisted `luminosity` column stays untouched until its formula is specified;
covered in test 3.

### A-8 (Claude M-7 first half) — Edge confidence is missing from the rendering grammar
LAW 5 says every rendered element carries visible confidence; edges have a
real `confidence` column and no grammar mapping. **Fix:** edge-confidence
treatment (opacity/dash, versioned config) added to the grammar and to test
2's snapshot.

### A-9 (ChatGPT #8) — The list view is v1-mandatory but excluded from the ghost-sky milestone
Internal contradiction: §2 requires the non-spatial fallback in v1; §6's
milestone cut ships without it, violating LAW 5 at the demo. **Fix:** the
list view joins the ghost-sky milestone cut (minimal: grouped by type/state,
keyboard navigable, evidence reachable); keyboard-reachability test moves
with it.

### A-10 (Claude m-5) — Tests for stated invariants that currently have none
Folded into the accepts above but listed so nothing drops: (1) matcher writes
leave the proposer's serialized context byte-identical (a regression here is
a silent blinding break — assert, don't state); (2) ghost-budget cap holds;
(3) positive CONTRADICTED transition at recurrence ≥2 (test 6 covers only the
negative guard); (4) WOUND-gated projection snapshot (with A-6).

## CHEAP (small edits; approve as a block)

- **C-1** (Claude m-1 ≡ ChatGPT E-17): `skyProjection(nodes, edges, now, seed,
  configVersion)` — seed explicit (= stable hash(userId)), and the honest
  determinism boundary stated: the VIEW MODEL is deterministic; GPU layout is
  not cross-device reproducible and demos must not claim "same sky every time."
- **C-2** (Claude m-2 ≡ ChatGPT #12): ghost-budget total order — priority
  desc, then ontologyKey asc, then label asc; applied before the cap.
- **C-3** (Claude m-3): split test 1 into mapping-determinism (pure) and
  import-idempotency (upsert against the A-5 unique constraint).
- **C-4** (Claude m-4): COUNTERVAILING evidence display treatment specified,
  with the gate §1.1 honest-scope note (polarity is model-assigned).
- **C-5** (ChatGPT #10): the evidence view model explicitly carries
  `authorship` (join via sourceEventId); snapshot test.
- **C-6** (ChatGPT #11): explicit "Evidence" affordance in the node panel;
  long-press stays as a secondary path, never the only one.
- **C-7** (ChatGPT #13): projection input type excludes shadow structurally
  (`PersistedEdgeView`; type-level ban on `ShadowCandidate[]`); test.
- **C-8** (ChatGPT #14): cosmos.gl v3 async-ready integration test (methods
  queue pre-ready); version pinned in lockfile; SPDX recorded.
- **C-9** (Claude M-7 second half): the unexplored fringe gets a defined input
  (honest static affordance with copy is acceptable — but specified) + view-
  model test.
- **C-10** (Claude m-6): matched-pair rendering: the extracted node and the
  charged lens node render LINKED (edge/badge), never merged at render and
  never two unrelated stars; specified in the grammar.
- **C-11** (Claude m-7): birth-data intake named as an app-layer module
  (outside this spec's engine scope) with a one-line seam contract.
- **C-12** (Claude E-1): the tap panel on a charged/contradicted ghost shows
  WHICH extracted words did it (falls out of A-1's derivation object).
- **C-13** (Claude E-2 ≡ ChatGPT #20): the list view is declared the canonical
  accessible surface; content-parity property test over the same view model;
  edges + their evidence reachable in it.
- **C-14** (Claude E-3 ≡ ChatGPT #19): `projectionVersion` stamped on
  `SkyViewModel`; confidence-band constants live in a versioned rendererConfig.
- **C-15** (Claude M-3(b,c)): eval-corpus gains a lens-confirmation case
  (synthetic journal written to confirm a known chart hypothesis — measures
  the match rate so SILENT-forever is detected, not discovered on stage); §2
  ghost copy scoped honestly per D-R1's outcome; §3 gains the honest-scope
  sentence that CONTRADICTED is structurally rare in v1.

## DEFERRED (→ master concept §7.1 pre-pilot governance bundle)

- **D-1** (Claude M-6 ≡ ChatGPT #15, governance half): birth-data provider
  contract, retention of `ChartImport.raw`, encryption-at-rest, erasure
  feasibility — the §7.1 entry the spec cites DOES NOT EXIST yet; writing the
  entry happens now (it's one paragraph), the architecture it names is bundle
  work. **Note:** the schema-blocking half of M-6 (deletion cascade rule,
  re-import semantics for changed charts, lensMapVersion rekey duty mirroring
  gate §7) is NOT deferred — it rides with A-5's schema-deltas section.
- **D-2** (ChatGPT E-16): lens-mapping dry-run mode + unknown-feature
  telemetry dev panel — useful, not build-blocking.

## REJECTED (with reason)

- *(none this round — no substrate-before-evidence, no model-trust-as-control,
  no cut-line violations found in either lane.)*

## STALE-ALREADY-FIXED

- *(none — v1.0 is the first version; both lanes reviewed v1.0.)*

---

## Checkpoint decisions for Jacob

1. **D-R1 — the ontologyKey namespace policy (blinding-adjacent; the loop may
   not decide this).** For `type+ontologyKey` matching to EVER fire, the
   blinded proposer must independently emit the key the lens map assigned.
   The keys it can emit come from the shared ontology config. Options:
   **(a) — recommended:** lens-map key vocabulary IS part of the static,
   user-independent ontology the proposer sees. This is not per-user
   hypothesis leakage (every user's extractor sees the same vocabulary), but
   it is a real gradient toward chart-shaped extraction — named in the spec,
   measured by C-15's eval case. Without it, the matcher is SILENT-forever
   and the differentiated claim is vaporware in v1.
   **(b):** keys stay out; accept near-zero match rate for the ghost-sky
   demo; the real (semantic) matcher lands per the existing §7.1 entry.
2. **D-R2 — A-1's fix shape:** matched evidence LINKED through the writer
   (recommended) vs COPIED onto the lens node. Link preserves single-owner
   evidence rows and the audit trail; copy simplifies tap-for-evidence but
   double-counts rows. Recommendation: link.
3. **D-R3 — A-2's gate change:** approve scoping the gate's dedupe/merge to
   EXTRACTED-provenance prior nodes (gate spec v1.7, same commit as this
   spec's edit)? Recommendation: yes — it also matches what the proposer's
   context builder already loads.
4. **D-R4 — A-3's typing rule:** lens nodes carry domain types with
   `provenance=LENS`; `NodeType.LENS` deprecated-never-written.
   Recommendation: yes (the alternative — a `lensTargetType` field — adds a
   second type field the whole codebase must remember to check).
5. **D-R5 — A-6's WOUND default:** veiled-but-present for INDIVIDUAL skins
   (not invisible — LAW 5), full visibility in supervised skins per
   consentScope, per D9's display-layer ruling. Confirm the veiled treatment.
6. **CHEAP block C-1…C-15** — approve as a block? (No evidence-semantics
   edits in the block; A-1's semantics ride the ACCEPT-NOW lane with their
   own failing-first tests, per your round-2 charter amendment.)
