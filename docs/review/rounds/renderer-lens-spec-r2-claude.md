# REVIEW-01 — Renderer & Lens Spec · Round 2 · Claude lane

**Spec reviewed:** `/docs/renderer-lens-spec.md` — *Constellation Renderer & Lens Lane — Module Specification · v1.1*

**Verdict: Request Revisions** — one Critical (the new §3.1 charge machinery has no recompute trigger, so a charged ghost survives the retraction of its own evidence), plus seam breaks around the WOUND veil's carrier and the matcher's delta-only trigger. The round-1 closures largely hold: 21 HOLDS / 4 PARTIAL / 0 MISSING. Nothing here requires rethinking the architecture; the Critical is a specification gap in machinery that is otherwise the right shape.

Cross-references verified against: CLAUDE.md; citation-gate spec v1.7 (§1.1, §7); master concept §7.1 (new entries present); `prisma/schema.prisma` (migration 6 landed as claimed); `extraction-contracts.ts` v2.2; `gate.ts` + `gate.spec.ts` (v1.7 dedupe scoping and test 19 verified **in code**, per round-3 discipline — `gate.ts:208-231` builds the merge index as `provenance::type::normalizedLabel`, and `gate.spec.ts:1183-1252` carries all three test-19 assertions: LENS never a merge target, same-provenance dedupe preserved, becoming label-matcher still fires).

---

## (a) Round-1 closure verification

| Item | Status | Evidence (one line) |
|---|---|---|
| A-1 charge carrier | **HOLDS** | §3.1 exists: LINKED evidence via `HypothesisEvidenceLink` through the writer, gate pure functions imported (reuse mandated), full stamp set + `computedAt`, persisted `MatcherRun`, `MatcherConfig` with SOLO/SUPERVISED; test 7 carries the pipeline keystone. (But see NEW C-1 — the machinery has a recompute hole.) |
| A-2 dual matchers / gate side door | **HOLDS** | Gate spec v1.7 §7 scopes dedupe to own provenance; `gate.ts:217-219` keys the merge index by provenance; test 19 exists in code with the failing-first LENS assertion (`gate.spec.ts:1184`); spec §3 pins precedence and LENS-only v1 scope. |
| A-3 lens node typing (D-R4) | **HOLDS** | §1 mandates domain types with `provenance=LENS`; contract marks `NodeType.LENS` deprecated-never-written (`extraction-contracts.ts:30-38`); schema comment documents the migration-6 CHECK; test 3 exercises the CHECK. |
| A-4 x/y/colorHint | **HOLDS** | Columns absent from `schema.prisma` (replaced by the firewall comment at PsycheNode lines 201–207, naming migration 6); §2 restates the invariant; test 5 adds the schema-level assertion. |
| A-5 missing carriers | **HOLDS** | §7 enumerates every column/constraint/type with its owning migration (6 landed; 7 lens-lane; 8 matcher incl. `HypothesisConfirmation` with the fail-closed rule until it lands); contract bump to v2.3 named; `SkyViewModel` ownership stated. |
| A-6 WOUND gating (D-R5) | **HOLDS** | §2 WOUND rule: veiled-but-present INDIVIDUAL / full supervised per consentScope, calm copy, singly-never-clustered, classifier independence; `rendererConfig.woundGate`; test 10 present. (Implementability of test 10 against the stated projection signature is NEW M-2.) |
| A-7 brightness | **PARTIAL** | The named, versioned recency function is specified and `luminosity` is explicitly not consumed — but the punch-list said "covered in test 3," and v1.1's test 3 covers ghost styling/budget only; **no test asserts brightness behavior** (recency dimming, DORMANT dims-never-vanishes). |
| A-8 edge confidence | **PARTIAL** | The grammar carries edge-confidence → opacity/dash (versioned config) — but the punch-list required it in the snapshot test, and no test in §5 asserts the edge-confidence treatment. |
| A-9 list view in milestone | **HOLDS** | §2 "shipped inside the ghost-sky milestone"; §6 build order places it before cosmos integration; test 8 carries keyboard reachability + content parity. |
| A-10 tests for stated invariants | **HOLDS** | All four: proposer-context byte-identity (test 7, asserted); ghost-budget cap (test 3); positive CONTRADICTED at recurrence ≥2 (test 7); WOUND snapshot (test 10). |
| C-1 seed + determinism boundary | **HOLDS** | §2: explicit `seed` = stable hash(userId); "honest determinism boundary" paragraph with the demo-claim rule. |
| C-2 ghost-budget total order | **HOLDS** | §1: priority desc → ontologyKey asc → label asc, applied before the cap. |
| C-3 test split | **HOLDS** | Test 1 (pure mapping determinism, no DB) and test 2 (DB idempotency incl. concurrent double-mint) are separate. |
| C-4 COUNTERVAILING display | **HOLDS** | §2 tap-for-evidence: visually distinct, with the gate §1.1 model-assigned-polarity note. |
| C-5 authorship in evidence VM | **HOLDS** | §2: "explicitly carries `authorship` (joined via sourceEventId)"; test 6 asserts "authorship present and rendered." |
| C-6 evidence affordance | **HOLDS** | §2 mobile-touch: explicit panel affordance; long-press secondary, never the only path. |
| C-7 shadow structurally excluded | **PARTIAL** | §2 states `ShadowCandidate[]` is type-level unrepresentable as projection input — but the punch-list's "test" has no carrier: test 5's type-level check covers coordinate types only; nothing in §5 asserts the shadow exclusion. |
| C-8 cosmos async-ready | **HOLDS** | §2: queue-until-`graph.ready`, lockfile pin, SPDX record; test 8 carries the integration test. |
| C-9 fringe defined input | **PARTIAL** | §2 defines the honest static affordance (config-owned copy, no fake measurement) — but the punch-list's "+ view-model test" is absent from §5. |
| C-10 matched pairs LINKED | **HOLDS** | §2: explicit link/badge relationship, never merged, never two unrelated stars. |
| C-11 intake seam | **HOLDS** | §1: app-layer ownership + the one-line `{birthDate, birthTime, birthPlace, tzResolved}` contract. |
| C-12 which-words panel | **HOLDS** | §2: "your chart guessed this; on June 3rd you said this," derived from §3.1's derivation object. |
| C-13 list view canonical | **HOLDS** | §2: canonical accessible surface; content-parity property test in test 8; nodes AND edges with evidence reachable. |
| C-14 projectionVersion + bands | **HOLDS** | §2 emits `projectionVersion`; §7 renderer-owned block names versioned `rendererConfig` with confidence bands. |
| C-15 eval case + honest copy | **HOLDS** | Test 9 lens-confirmation eval case with per-ontology-version match-rate tracking; §2 ghost copy scoped; §3 "CONTRADICTED is structurally rare in v1" present. |

Deferred items (spot-checked, not scored): the D-1 birth-data governance entry, the E-16 dry-run entry, and the D-R5 pilot-feedback item all actually exist in master concept §7.1 — closures are real, not changelog-only.

---

## (b) NEW findings

### CRITICAL

**C-1 — A charged ghost has no recompute path: invalidating (or erasing) the evidence that charged it leaves the hypothesis ACTIVE forever.**
*Observation:* §3.1 recomputes a hypothesis's mass/confidence/state "over the merged evidence set (own ∪ linked)" — but only **when a match event occurs**. Since gate v1.7, the gate structurally cannot touch a LENS node (test 19 — correct fix, verified in code), and the matcher runs only "strictly after the writer commits a pass," comparing **newly validated** extracted material. So nobody recomputes a charged ghost when: (i) a linked evidence's `SourceEvent` is invalidated/superseded (the gate's §6 invalidation-aware mass rule never fires — no compute is ever scheduled); (ii) the source EXTRACTED node or its evidence rows are archived or LAW-8-erased (what happens to `HypothesisEvidenceLink` rows pointing at deleted Evidence is entirely unspecified — the FK either dangles or cascades silently, and neither is chosen). Related under-specification: §3.1 never says how the matcher constructs the gate functions' input — the gate arithmetic consumes `EvidenceRecord[]` (which carries `authorship` and `sourceInvalidatedAt`, per `extraction-contracts.ts:182-192`), so the matcher must live-join authorship and **current** invalidation status for linked rows at compute time; nothing states this, and a naive implementation that snapshots at link time bakes staleness in permanently.
*Why it matters:* this breaks two architecture invariants at once. "Mass is a pure function of the validated evidence set" — a lens node's persisted mass diverges from its evidence set the moment a source is invalidated. And event-replay reproducibility — a replay would reject the invalidated evidence at the gate, never link it, and produce `HYPOTHESIS/mass 0`, while the stored graph says `ACTIVE/mass > 0`. Product-level: the person retracts the words that "confirmed" their chart, and the sky keeps telling them the chart was right — the exact epistemic dishonesty the product exists to prevent, on its most differentiated surface. LAW 8 is also implicated: erasure that leaves derived charge behind is not deletion.
*Recommended action:* (1) §3.1 gains a **recompute trigger rule**: any invalidation/supersession/erasure touching a `SourceEvent` or `Evidence` row referenced by a `HypothesisEvidenceLink` schedules a matcher recompute of the affected hypothesis (same pure functions, new `MatcherRun` row, stamped) — the writer already sees these mutations and is the natural trigger point. (2) Specify `HypothesisEvidenceLink` lifecycle explicitly: link rows are invalidated (not silently cascaded) when their Evidence row is erased; a hypothesis whose last conferring link dies recomputes to mass 0 and reverts state per `nextState`. (3) One sentence stating the matcher builds `EvidenceRecord[]` for linked rows by live-join (authorship + `sourceInvalidatedAt` read at compute time, never cached from link time). (4) Test 7 gains the negative-lifecycle case: charge a ghost, invalidate the source, assert mass 0 and state reversion on recompute; replay equivalence asserted.

### MAJOR

**M-1 — The matcher is delta-only, so a ghost created *after* its confirming evidence stays SILENT forever.**
*Observation:* §3 triggers the matcher only post-pass, over "newly validated EXTRACTED nodes/evidence." But §1's own machinery creates ghosts at other times: a chart imported after months of journaling, a re-import, or a `lensMapVersion` bump that mints new keys. Those ghosts are never compared against the standing extracted graph — no matcher run is triggered by an import, and even a coincidental later run only examines the new delta. Test 9's eval case covers only the ghost-first direction.
*Why it matters:* the Tier-0 flow is chart-first, so this hides in the happy path and manifests exactly when a design partner adds a chart to a mature client map — the demo's "your words already confirmed this" moment silently never fires, and D-R1's match-rate canary won't catch it (the canary is also ghost-first). SILENT-forever was the failure mode C-15 existed to make detectable.
*Recommended action:* §3.1 adds a second trigger: lens import / remap enqueues a **full-graph matcher run** for the affected user (new/changed ghosts vs. all standing extracted nodes — deterministic, cheap at per-person graph sizes). Test 7 or 9 gains the evidence-first direction: extract first, import the chart second, assert the ghost charges.

**M-2 — The WOUND veil has no carrier in the projection signature, and the list view's veil behavior is unspecified.**
*Observation:* the veil is role-dependent ("veiled in INDIVIDUAL skins, full in supervised per consentScope"), but §2's projection signature is `skyProjection(nodes, edges, now, seed, config)` — no viewer role, no consentScope. Test 10 ("a WOUND node in an INDIVIDUAL-role projection renders veiled") is unimplementable as written against that signature. Separately, nothing says the **list view** veils WOUND nodes: if the veil is a canvas-side styling treatment rather than a view-model property, the content-parity property (test 8) would faithfully expose the raw WOUND label in the keyboard-navigable list — at 1 a.m., to exactly the person D-R5 protects.
*Why it matters:* this is a seam break of the round-1 class: a rule stated in prose whose interface doesn't carry it. LAW 7 enforced on one rendering surface and not the canonical accessible surface is not enforced.
*Recommended action:* viewer context (role + consentScope-derived visibility) becomes an explicit `skyProjection` parameter, and veiling is computed **into the view model** (a veiled node's view-model entry carries the veil copy, not the raw label) — then test 8's parity property carries the veil to the list view for free, and test 10 becomes implementable. State in §2 that the list view renders from the same veiled view model.

**M-3 — The realization toast can name a fresh WOUND node raw, bypassing the veil at its most sensitive moment.**
*Observation:* §2's realization events: "the new/changed nodes animate in via cosmos v3 transitions and **a small toast names them**." A newly materialized WOUND node is precisely a "new node." The veil governs node rendering; the toast is a separate surface with no gating rule.
*Why it matters:* the lived 1 a.m. journey the veil exists for: the person journals something raw, the pipeline materializes a WOUND node, and the celebration surface announces it by name — ominous, unmediated, at the worst possible moment. D9/D-R5's display-layer ruling is defeated by its own celebration mechanic.
*Recommended action:* one grammar rule: realization surfaces (toast, animation focus) consume the same veiled view model as everything else; a veiled node's realization renders with the calm veil copy, never the raw label. Add the assertion to test 10.

**M-4 — D-R1's direction rule has no enforcement mechanism: nothing stops a lens-map author from minting a chart-flavored key.**
*Observation:* §1 says lens-map targets "must be existing psychological keys" and "no chart-specific key ever enters the proposer's vocabulary" — but there is no review gate, no lint, no naming rule, and no ordering constraint carrying "must be existing." The path is trivially walkable: add `protection.sacral-response` to the shared ontology config (one PR), then target it from the lens map — every rule's letter satisfied, the proposer's vocabulary now chart-shaped. Test 9's canary measures the *match rate* of known keys, not vocabulary pollution.
*Why it matters:* this is the blinding invariant's slow-leak channel, and the spec itself calls the gradient "measured, not assumed away" — but only one of the two gradients is measured. The unenforced half is exactly a prompt-discipline control that could be structural.
*Recommended action:* make it structural: (a) a CI lint that every `ontologyKey` in `lens-map.v*.ts` exists in the ontology config at a version **predating** the lens-map change (or carries an `origin: extraction` annotation); (b) ontology-config diffs that add keys in the same change-set as a lens-map edit fail review by rule; (c) a named naming rule (keys describe psychology, never chart features — greppable denylist of system terms: centers, gates, houses, signs, authorities).

**M-5 — The lens lane is an unacknowledged third writer against the schema's "never written except via the gate" banner.**
*Observation:* the schema's derived-graph banner says nodes are "never written except via the gate"; §3.1 carefully sanctions the matcher as the "second author, in writing." But §1's lane creates lens nodes with "no LLM, **no gate**" — a third author nobody sanctions. The gate already supports exactly this path: hypothesis provenances proceed with zero verified evidence to mass-0 HYPOTHESIS (gate spec §4; confirmed in `gate.ts:288-290`).
*Why it matters:* the writer-allowlist is a trust-boundary inventory; an unlisted writer is how the next side door (the class A-2 just closed) gets built in good faith. It also leaves the lane's upsert outside the gate's idempotence machinery, so two different upsert disciplines now coexist for the same table.
*Recommended action:* choose and write it down: either route lens node creation through the gate's zero-evidence hypothesis path (cheap — the path exists and same-provenance dedupe v1.7 gives lens upsert idempotence for free), or amend the schema banner to name all three sanctioned authors and state why the lane's determinism earns the exemption. Silence is the only wrong option.

**M-6 — The archive/sever lifecycle has zero tests.**
*Observation:* two load-bearing lifecycle rules — §1's `lensMapVersion` bump semantics (unchanged keys update in place; removed keys archive **uncharged** ghosts; charged ghosts never auto-archived, sever gracefully) and §7's ChartImport deletion cascade (archive uncharged / sever FK on charged, provenance note retained) — appear nowhere in §5. Test 9 covers import failure only.
*Why it matters:* these are the LAW 8-adjacent behaviors (deletion is a first-class feature) and the exact "prose rule with no test carrier" class both round-1 lanes existed to catch. The severing rule in particular has a subtle failure mode (a charged ghost accidentally archived deletes the product's proof that a chart was *right*).
*Recommended action:* §5 gains a lifecycle test: bump `lensMapVersion` with a removed key over one charged and one uncharged ghost → uncharged archives, charged survives with severed provenance note; delete a ChartImport → same split asserted.

**M-7 — `MatcherRun`'s §7 columns can't support §3.1's replay claim.**
*Observation:* §3.1 requires `MatcherRun` to persist "inputs: pass/run id, **prior hypothesis states**; outputs: **links written**, transitions made." §7's column list is `(id, trigger pass/run id, matcherConfigVersion, matchRuleVersion, transitions JSON, createdAt)` — prior states and links-written have no column. Test 7's "MatcherRun replay produces identical links, states, and stamps" is asserted against a carrier that doesn't hold its inputs.
*Why it matters:* v1.0's defining defect was referenced carriers that didn't exist; v1.1 reintroduces the same class in miniature, inside the section written to fix it.
*Recommended action:* align §7 with §3.1: add `priorStates JSON` (or fold into a single `inputs JSON`) and `linksWritten JSON` (or derive links from `HypothesisEvidenceLink.matchedAt` + run id — then say so and add the run-id FK to the link table).

### MINOR

**m-1 — "Charged" is defined only in a §1 parenthetical; §7's cascade rule should restate it.**
§1 defines charged as "any validated evidence linked via §3" (link-based, so a CONTRADICTED mass-0 ghost correctly counts as charged and survives deletion — being wrong is the product's claim). §7 uses CHARGED/UNCHARGED without definition; a reader implementing migration 7 from §7 alone could plausibly implement mass-based ("mass > 0"), which diverges for contradicted and countervailing-only ghosts. Restate the link-based definition where the cascade rule lives.

**m-2 — Test 9's lens-confirmation case is model-dependent and doesn't belong in a pass/fail suite.**
The synthetic-journal → charged-ghost flow depends on a blinded proposer emitting the exact ontologyKey — inherently probabilistic. As an eval-corpus scored case (match rate per ontology version) it is exactly right; sitting in §5's numbered test list next to deterministic CI tests, it reads as a suite member and will be the flaky test someone eventually skips. Label it explicitly as eval-corpus-scored, not CI-gating.

**m-3 — Test 10's "provably independent" has no operational assertion.**
"Crisis-classification pathway provably independent of the veil flag" — specify what the test does: classifier output invariant under veil-flag flip on identical input, plus (cheap and structural) an import-boundary lint that the classifier module cannot import `rendererConfig`.

**m-4 — Closure-partial test gaps, consolidated.**
Per the closure table: brightness behavior (A-7), edge-confidence treatment (A-8), fringe presence in the view model (C-9), and shadow-exclusion type assertion (C-7) are all specified in grammar/prose with no §5 carrier. One additional view-model snapshot test covering brightness recency, edge-confidence bands, and fringe presence — plus a `@ts-expect-error` fixture for `ShadowCandidate[]` as projection input — closes all four.

**m-5 — Gate spec version-string drift.**
The gate spec's header and changelog say v1.7; its closing line still reads "*End of citation gate spec v1.6*." Trivial, but this is the load-bearing cross-reference in a loop whose charter is exact-version review — fix before v1.8 makes it two behind.

**m-6 — Ghost budget × re-import interplay unspecified.**
When a remap mints new keys while charged ghosts (never auto-archived) persist, does the budget cap count the charged survivors, or only newly materialized ghosts? If charged ghosts occupy slots, a well-confirmed chart can starve new hypotheses; if they don't, the sky can exceed the budget the spec calls "noise." One sentence choosing (recommend: charged ghosts are outside the budget — they've earned their place; the cap governs uncharged hypotheses only).

### ENHANCEMENT

**E-1 — The static fringe ages into dishonesty.**
An "edge of the unexplored" whose copy and treatment never change reads honestly in month one and decoratively by month six — the exact degradation §2 guards against, arriving via time rather than implementation. Add a §7.1 pilot-feedback line to watch whether the static affordance still reads as a genuine boundary on mature maps.

**E-2 — The supervised-skin viewer is ambiguous for the client.**
"Full visibility in supervised skins per consentScope" — the practitioner's view is clear, but a client viewing their own map *within* a supervised engagement is neither plainly INDIVIDUAL-skin nor practitioner. D9's mediation flow implies veiled-until-released for the client even in supervised contexts; one sentence in §2 saying so prevents the permissive misreading.

---

## What's genuinely strong

- **§3.1 is the right machinery, minus the trigger.** Linked-never-copied evidence, gate arithmetic imported rather than duplicated, structural mode guard, full stamp set, persisted run record — every round-1 demand landed as structure, not prose. The Critical above is a missing *when*, not a wrong *what*.
- **The v1.7 closure is real and verified in code.** The provenance-scoped merge index and all three test-19 assertions exist exactly as claimed — and the same-provenance superset (preserving each hypothesis lane's idempotence) is a better rule than the letter of D-R3, correctly flagged as a deliberate deviation.
- **§7 is what a deltas section should be:** every carrier named with its owning migration, and the `HypothesisConfirmation` fail-closed rule ("until migration 8 lands it, SUPERVISED contradiction-by-confirmation is unreachable and the matcher must treat it as such") is exactly the honest-unreachability posture the laws demand.
- **The honest-scope threading is consistently excellent:** the determinism boundary (view model vs. GPU layout), the fringe that refuses to fake measurement, the CONTRADICTED-is-rare admission, and the D-R1 gradient named-and-measured rather than assumed away. The spec keeps choosing to say what it can't do — the product's core virtue, practiced in its own prose.
- **The list view as canonical accessible surface with a content-parity property** is the right structural move — which is precisely why M-2 matters: once the veil moves into the view model, that same property makes LAW 7 hold everywhere for free.

*— End of round-2 review (Claude lane). Reviewed v1.1 exactly as written; all code claims verified against `gate.ts` and `gate.spec.ts` at review time.*
