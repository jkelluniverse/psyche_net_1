# REVIEW-01 · Renderer & Lens Spec · Round 1 · Claude lane

**Spec reviewed:** `/docs/renderer-lens-spec.md` — *Constellation Renderer & Lens Lane — Module Specification, v1.0* (initial draft, ghost-sky milestone).
**Cross-references read line-by-line:** CLAUDE.md; citation-gate spec v1.6; `prisma/schema.prisma`; master concept v1.1 (§4.4/§5.1/§7.1); `src/engine/contracts/extraction-contracts.ts` (CONTRACT_VERSION v2.2).

## Verdict: **Request Revisions**

Two Critical findings, both in §3 (the hypothesis matcher). The lens lane and renderer sections are close to buildable; the matcher, as written, is prose that no interface, algorithm, schema field, or version stamp actually carries — and it silently collides with a second hypothesis matcher that already lives *inside* the gate per gate spec v1.6. This is exactly the "disconnected fix" class the loop exists to catch, and it sits on the product's most differentiated claim.

---

## CRITICAL

### C-1 — "Accumulates charge" has no carrier: nobody is specified to compute the charged hypothesis's mass, state, or evidence attachment, and the matcher's writes are not replayable

**Observation.** §3 says a match causes the hypothesis to "accumulate charge toward `HYPOTHESIS → ACTIVE` per the gate's materialization threshold," while simultaneously declaring the matcher "never creates nodes, never touches mass arithmetic." The spec never answers:

1. **Where does the matched evidence live?** `Evidence` rows point at exactly one `nodeId` (schema DB CHECK). Does the extracted evidence get copied/re-homed onto the lens node? If not, the lens node transitions to ACTIVE with **zero Evidence rows of its own** — an ACTIVE node whose tap-for-evidence panel is empty, which reads as a LAW 1 violation at the exact surface (§2's evidence panel) where the product's honesty is demonstrated. If yes, the matcher *does* write evidence, contradicting its own "never creates" posture, and needs a defined write shape.
2. **Who computes the resulting mass?** If mass stays 0, a "confirmed" hypothesis renders at minimum ghost radius while badged ACTIVE — visually incoherent and dishonest in the other direction. If mass is recomputed, some module must run §6.2 arithmetic over the merged evidence set. The matcher disclaims it; the gate isn't running (the matcher is post-writer); nothing else exists.
3. **Who computes the transition?** The gate's `nextState(prev, evidenceSet, now)` is the versioned pure function (gate §6.4, `stateAlgorithmVersion`). Does the matcher import and reuse it, or reimplement "per the gate's materialization threshold" in its own code? Reimplementation is a duplication seam: the two copies will drift the first time the threshold is tuned (META-01 says tuning WILL happen), and the drift will be invisible because each module's tests stay green. The spec must name reuse explicitly.
4. **What version stamps land on the write?** The spec stamps `matchRuleVersion` but says nothing about `stateAlgorithmVersion` / `massAlgorithmVersion` / `computedAt` on the transitioned node. CLAUDE.md: un-versioned tuning is not allowed; every derived value must report *why*. A lens node flipped to CONTRADICTED must be able to say which rule version, which evidence, which inputs.
5. **Is the matcher run recorded?** The event-sourced core requires graph state be reproducible by replay. Extraction has `ExtractionRun`; the matcher — a second writer of node state — has no run record, no persisted input snapshot, nothing that makes test 6's "matcher output replays identically" assertable against production history. Note also that `schema.prisma`'s derived-graph banner says nodes are "never written except via the gate" — the matcher is a sanctioned exception that no document sanctions yet.

**Why it matters.** This is the module the spec calls "the blinding invariant's other half," and every load-bearing behavior in it is currently unspecified. Built as written, five different implementations are all "compliant" and at least three of them break LAW 1, the explainability invariant, or replay.

**Action.** Add a §3.1 that specifies: (a) the evidence-attachment rule (recommend: matched `VerifiedEvidence`/`Evidence` is *linked or copied* to the hypothesis node through the writer, with the extracted node's rows intact — pick one and say so); (b) mass/confidence/state on the hypothesis are recomputed by **importing the gate's exported pure functions** (`nextState`, mass, confidence) over the merged evidence set — reuse mandated, duplication banned; (c) the full version-stamp set written on every matcher transition (`matchRuleVersion` + the three algorithm versions + `computedAt`); (d) a persisted `MatcherRun` (or equivalent event) making replays real. Add matching contract types (see M-2) and extend test 6 to assert the derivation object and stamps, not just the transition.

### C-2 — Two hypothesis matchers now exist and overlap; and the gate's own dedupe can already merge extracted evidence into LENS nodes, falsifying "the one place the lanes legally meet"

**Observation.** Gate spec v1.6 §7 already contains an **in-gate hypothesis matcher**: an EXTRACTED proposal whose normalized label exactly equals an existing BECOMING node's label merges into that hypothesis *inside the gate* (precedence pinned in v1.6: own-key dedupe first, becoming-label merge second). This spec's §3 introduces a **post-gate** matcher covering "LENS (and BECOMING)" hypotheses by `type + ontologyKey`. Nothing reconciles them:

- A BECOMING node can be charged by **both** mechanisms — the gate's label match merges evidence in-pass, then the post-gate matcher key-matches the same material and applies a second state computation. Double-charge / conflicting writes on the exact node type (BECOMING → IGNITED) whose ceremony is the product's highest-visibility moment.
- Worse, the gate's *generic* dedupe merges on "same type + normalized label" against `priorGraph` — and nothing in gate spec v1.6 or this spec says `priorGraph` excludes LENS-provenance nodes. Lens templates carry ordinary types (§1: each template has "a `type`", e.g. PROTECTION) with `provenance=LENS`. So an extracted PROTECTION proposal whose normalized label happens to equal a lens ghost's label gets merged into the lens node **by the gate**, on a *different match rule* (label) than the matcher's (ontologyKey), before the matcher ever runs. That directly falsifies §3's framing that the matcher is "the one place lens hypotheses and extracted evidence legally meet," and it happens through a path neither spec tests.

**Why it matters.** Whichever path fires first determines the hypothesis's state, evidence set, and version stamps — nondeterministically from the user's perspective. Lens confirmation via the gate's label-dedupe also bypasses the matcher's §1.1 countervailing guards entirely. This is a live seam between two documents that both claim to be current (gate v1.6 / contract v2.2 are cross-references of this very spec).

**Action.** Pin ownership explicitly, in both specs: recommend (a) the gate's `priorGraph`/dedupe scope is **EXTRACTED-provenance nodes only** (state it in this spec, flag it as a required gate-spec v1.7 edit — this also matches the GraphSnapshot the proposer's context builder loads); (b) BECOMING is owned by the gate's in-gate label matcher (unchanged), LENS is owned solely by the post-gate matcher — delete "(and BECOMING)" from §3 or explicitly define precedence + idempotence when both fire; (c) add a test: an extracted proposal label-identical to a lens ghost does NOT merge in-gate and reaches the lens node only through the matcher.

---

## MAJOR

### M-1 — `schema.prisma` persists `PsycheNode.x / y / colorHint`, in direct contradiction of the spec's domain/rendering firewall and test 4

**Observation.** §2: "No coordinate is persisted into domain state… Layout uses a fixed seed." Test 4: "no field of the view model's layout output is ever written back through any writer path." But the schema this spec cross-references carries `x Float?`, `y Float?`, `colorHint String?` on `PsycheNode`, commented "position may be engine-managed; persisted for continuity."

**Why it matters.** The classic seam break: the invariant is stated on one side and the escape hatch is shipped on the other. The first implementer who wants session continuity will find the fields waiting and use them; test 4's property test can't even be written honestly while the columns invite writes.

**Action.** The spec must explicitly order these fields removed (or marked deprecated-never-written with the DB-level guard named) in the same migration that adds the lens fields, and state that continuity comes from the fixed seed alone. Test 4's type-level check should be paired with a schema assertion (no coordinate columns on domain tables).

### M-2 — Referenced fields and contracts that do not exist: no defined migration/contract plan makes the spec buildable

**Observation.** Every one of the following is load-bearing in the spec and absent from the cross-referenced schema/contract module (expected pre-build — but the spec must name its migration plan, and currently pretends the fields exist):

- `PsycheNode.lensMapVersion` (§1 "stamped") — no such column.
- `matchRuleVersion` (§3) — persisted nowhere; no column, no run table.
- `ChartImport.status` (§1 failure mode "`status=error`, retryable") — ChartImport has no status field.
- Idempotent upsert "per (user, system)" (§1) — schema has `@@index([userId, system])` but **no `@@unique`**, so there is nothing to upsert against; concurrent imports create duplicates.
- The lens map's `priority` field and the ghost-budget cap config (§1) — no named config key.
- Matcher contracts — `extraction-contracts.ts` v2.2 contains no `HypothesisMatch`/`MatcherResult`/matcher-input types, and no carrier for "practitioner confirmation" (§3 cites it as a CONTRADICTED trigger; no schema field or contract type anywhere records such a confirmation).
- `SkyViewModel` (§2) — fine as a new module's own type, but the spec should say which package owns it so the type-level firewall in test 4 has a boundary to check.

**Why it matters.** The gate loop's history (v1.3 changelog: "role/polarity dropped at VerifiedEvidence") shows exactly what happens when a spec references carriers that don't exist: the field gets silently dropped at implementation and every test stays green.

**Action.** Add a "schema & contract deltas" section listing each new column/constraint/type with its owning migration, including the `@@unique([userId, system])` constraint, `ChartImport.status`, the version-stamp columns, and the matcher's contract types (with the practitioner-confirmation carrier either specified or removed from §3's trigger list until it exists).

### M-3 — Exact `ontologyKey` match from a blinded proposer makes CONTRADICTED (and largely CONFIRMED) unreachable — the "chart being wrong" claim has no realistic v1 mechanism — and the ontology config is an unexamined blinding channel

**Observation.** For the matcher's `type + ontologyKey` exact match to ever fire, the blinded proposer must independently assign the *same key* the lens map assigned. The keys the proposer can emit come from the ontology config (plus novel mints, which by definition never match). Two problems:

1. **Reachability.** The master concept's own deferred-findings log already flags the twin of this for becoming labels (§7.1: "exact-normalized-label matching makes ignition reachable, not likely"). Key-exact matching for lens is strictly harder: confirmation is coincidental, and contradiction is worse — `COUNTERVAILING` polarity is assigned *relative to the extracted node*, and a blinded proposer can never tag opposition to a hypothesis it cannot see. The only §3 path to CONTRADICTED is the person first affirming and then denying the *same key*. The differentiated claim ("we show you your chart being wrong") therefore has no probable mechanism in the ghost-sky milestone, yet §2's copy promises "nothing in your words yet confirms **or contradicts** this."
2. **The leak channel.** If the fix is to seed the shared ontology with the lens map's key vocabulary so the proposer can land on those keys, then chart-derived conceptual vocabulary is being shown to the extractor. That is not per-user hypothesis leakage (the ontology is static and user-independent), so it is *arguably* blinding-compatible — but it is a real gradient toward chart-shaped extraction, and neither this spec nor the gate spec rules it in or out.

**Why it matters.** The matcher can be built exactly as specified, pass all of test 6, and produce a sky where every ghost stays SILENT forever — which quietly converts the honest "your words haven't spoken to this yet" into the *permanent* state and the product's core differentiator into vaporware. Meanwhile the tempting fix is the exact one that erodes blinding.

**Action.** (a) State the ontologyKey namespace policy explicitly: lens-map keys are/are not part of the ontology the proposer sees, with the blinding rationale written down either way. (b) Add expected-match-rate measurement to the eval corpus (a synthetic journal written to confirm a known chart hypothesis — does the pipeline connect them?) so SILENT-forever is detected, not discovered on stage. (c) Either scope the §2 copy to "confirms" only, or add the honest line to §3 that CONTRADICTED is structurally rare in v1 and route it to the §7.1 governance bundle alongside the existing real-hypothesis-matcher entry. Do not fix it with fuzzy matching (the spec is right to log that post-pilot).

### M-4 — LAW 7's wound-layer gating is absent from the renderer, which is exactly where it bites

**Observation.** The sky renders every persisted node; tap-for-evidence renders the quote. Nothing in §2 gates WOUND-type nodes (or wound-adjacent evidence) behind the "strengths-forward by default, deep wound work in supervised skins only" rule. CLAUDE.md LAW 7 and master concept §3 both make wound gating a law; the schema's `UserRole` exists to carry it; this spec never mentions it.

**Why it matters.** The reviewer prompt's 1 a.m. journey: an individual user opens their sky alone at night and taps a WOUND node the extractor materialized that afternoon, and reads their own worst sentence back with no mediation. The proposer-spec rounds already routed "wound-reveal mediation" to the governance bundle (§7.1, D9) — but that entry covers the *practitioner reveal flow*; the renderer's default visibility of WOUND nodes in the solo sky is this spec's job and is unspecified.

**Action.** Add a rendering-grammar rule: WOUND-type nodes render gated by role/skin (config, versioned) — strengths-forward default for INDIVIDUAL, full visibility in supervised skins per consentScope — and specify what the gated rendering looks like (present-but-veiled beats invisible, per LAW 5's never-falsely-complete). Add it to §5 tests (a WOUND node in an INDIVIDUAL-role projection snapshot renders gated).

### M-5 — The renderer consumes `luminosity`, whose defining function the schema explicitly defers ("Do not compute it ad hoc — specify before use")

**Observation.** §2 maps "`luminosity`/recency → brightness; DORMANT nodes dim." `schema.prisma`'s deferred block: "luminosity formula: field exists… its defining function is DEFERRED… Do not compute it ad hoc — specify before use." The spec uses it without specifying it, and hedges with "/recency" as if the two were interchangeable inputs.

**Why it matters.** Either the field is 0 for every node (default) and brightness collapses to a constant — or someone computes it ad hoc inside `skyProjection`, violating the schema's own guard, the no-magic-numbers invariant, and the purity boundary (recency inside a pure function is fine only if it's derived from evidence timestamps + the explicit `now`, versioned).

**Action.** Pick one and write it down: v1 brightness = a **named, versioned function of evidence recency computed inside `skyProjection` from (evidence occurredAt, now)** — ignoring the persisted `luminosity` column until its formula lands — or specify the luminosity formula now. Either way, add the half-life/constants to named config and cover it in test 3.

### M-6 — LAW 8 lifecycle holes: chart deletion cascade, re-import with changed data, and `lensMapVersion` bumps are all unspecified; the governance-bundle entry the spec cites does not exist

**Observation.** §1 stores birth data on `User` and echoes it inside `ChartImport.raw`, and says "provider + retention noted in the §7.1 governance bundle entry" — but master concept §7.1 contains no lens/birth-data entry (the spec cites an entry it has not written). Unspecified: what deleting a ChartImport does to its lens nodes (FK is nullable — orphan? cascade? what about a lens node that has since been charged to ACTIVE with real evidence attached?); what re-import with *corrected* birth data does to ghosts minted from the old chart (stale hypotheses persist? contradicted ones resurrect?); what a `lensMapVersion` bump does to already-materialized ghosts (remap? strand? — the exact "held evidence strands under stale keys" class the gate spec's C-5 rekey duty exists for).

**Why it matters.** Deletion is a first-class LAW 8 feature and birth data is the spec's own "quasi-special-category PII." The schema's general LAW 8 erasure deferral covers *design later*, but this spec introduces a new PII import + derived-node lane and must at minimum log its deletion semantics where they can't be silently dropped.

**Action.** Specify the cascade rule (recommend: deleting a ChartImport archives its uncharged lens nodes and severs the FK on charged ones, with the provenance note retained — decide consciously); define re-import semantics for changed charts and the lensMapVersion migration duty (mirror gate spec §7's rekey obligation); actually add the §7.1 governance entry (provider, retention of `raw`, encryption-at-rest for the echoed birth data) as part of this spec's punch list.

### M-7 — LAW 5 has two stated requirements with no carrier: edge confidence is missing from the rendering grammar, and "the edge of the unexplored" has no data source, algorithm, or test

**Observation.** LAW 5: "**every** rendered element carries visible confidence." §2's grammar maps edge strength → weight and type → style, but edge `confidence` (a real schema column) appears nowhere. Separately, the "soft unexplored fringe" is asserted as a rendering rule with no definition of what data drives it (what does the projection compute it *from*?), no config, and no §5 test.

**Why it matters.** These are the reviewer-prompt's "disconnected fixes": laws restated in prose that no interface or test carries. A thin low-confidence PROTECTS_FROM edge rendered indistinguishably from a well-evidenced one is precisely the confident-oracle failure. The fringe, unspecified, will be implemented as decorative vignette — falsely satisfying the law's letter.

**Action.** Add edge-confidence to the grammar (opacity/dash treatment, versioned config) and to test 2's snapshot. Define the fringe's input (e.g., a function of graph size vs. ontology coverage, or an honest static "unexplored" affordance with copy — but *specified*), and add it to the view-model tests.

---

## MINOR

**m-1 — `skyProjection`'s signature contradicts its own purity test.** §2 declares `skyProjection(nodes, edges, now)`; test 3 says "seed is an explicit input." Add `seed` (and the rendering-config version) to the signature. Also scope the purity claim honestly: cosmos.gl's GPU force simulation is *not* deterministic across devices/drivers even with a fixed seed — the testable determinism boundary is the view model, not screen positions. Say so, or test 3's spirit will be over-claimed in demos ("same sky every time") that a phone GPU will falsify.

**m-2 — Ghost-budget ranking has no tie-break.** §1 ranks by the mapping's priority field; equal priorities make test 1's byte-identical ordering unachievable. Define a total order (priority, then ontologyKey lexicographic).

**m-3 — Test 1's "twice" conflates mapping determinism with import idempotency.** Same-JSON → same node *set* is a pure-function test; re-import-into-DB → no duplicates is an upsert test needing the M-2 unique constraint. Split them.

**m-4 — COUNTERVAILING evidence display is unspecified.** The evidence panel marks practitioner evidence non-conferring but says nothing about polarity: a countervailing quote rendered identically to support misreads the person's own words back to them. Specify the treatment (and note it's a model-assigned label, per gate §1.1's honest scope).

**m-5 — Missing tests for stated invariants.** No test that: the matcher's writes leave the proposer's context unchanged (§3 asserts "priorExtractedNodes filter is untouched" — assert it, don't state it; a regression here is a silent blinding break); the ghost budget cap holds; the positive CONTRADICTED transition fires at recurrence ≥2 (test 6 only covers the negative guard); WOUND gating (once M-4 lands). Add all four.

**m-6 — The matched pair renders as two stars.** After a match, the extracted node and the lens hypothesis both exist with the same type+ontologyKey; §2 renders both. Two bodies for one construct confuses the sky and double-represents the same evidence visually. Specify the rendered relationship (a link, a merge-at-render, or an explicit badge — decide).

**m-7 — Birth-data entry ownership is unstated.** The Tier 0 ghost sky needs birth data collected on a phone in under a minute; this spec starts at "birth data →". Name the owning module/spec (intake) so the seam isn't discovered in week 6.

---

## ENHANCEMENT

**E-1 — Explain the charge in the UI.** When a ghost charges or contradicts, the tap panel should show *which* independently-extracted words did it (the matcher already knows). This is the product's best moment — "your chart guessed this; on June 3rd *you said this*" — and it falls directly out of C-1's derivation object if that lands.

**E-2 — List view as the accessibility contract.** §2's list view is well-conceived; consider declaring it the *canonical* accessible surface (screen readers get nothing from a WebGL canvas) and snapshot-testing its content parity with the projection, making test 7's "every node/edge/evidence reachable" a property over the same view model.

**E-3 — Stamp the projection.** Add a `projectionVersion` (rendering-grammar config version) to `SkyViewModel`, mirroring the engine's versioning discipline, so a tuned grammar is auditable against old screenshots/user reports.

---

## What's genuinely strong

- **The lane separation is the right shape.** Deterministic lens mapping (code, not model), no LLM anywhere in the lane, mass-0 ghosts, and the matcher placed post-gate where seeing both worlds is legal — the architecture correctly completes the blinding invariant rather than merely restating it.
- **Fail-closed lens imports** ("never a partial ghost sky"; unknown features skipped, never guessed) apply the gate's philosophy to a lane that has no gate. Exactly right.
- **The ghost budget** is a rare product-honesty constraint stated as an engineering rule — "few honest hypotheses" made structural.
- **Test 5 re-asserts the NFKC span guarantee where users actually see it** — carrying the gate's hardest-won lesson to the UI layer instead of trusting it transitively.
- **The domain/rendering firewall and the reduced-motion/list-view requirement** take "position carries no meaning" to its real conclusion (no information may exist only spatially). Once M-1 removes the schema's contradicting columns, this section is the strongest LAW 5 writing in the repo.
- **Build order matches the cut-line**: the ghost-sky milestone needs only the three deterministic pieces; the matcher — the hardest part, per C-1/C-2 — is correctly last and not load-bearing for the date.

*— End of round-1 Claude review of renderer-lens-spec v1.0.*
