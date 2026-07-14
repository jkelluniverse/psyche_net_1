# REVIEW-01 · Renderer & Lens Spec · Round 3 · Claude lane

**Spec reviewed:** `docs/renderer-lens-spec.md` — *Constellation Renderer & Lens Lane — Module Specification, v1.2* (exact version string: "v1.2 · governs `/src/engine/lens/`, `/src/engine/hypothesis-match/`, `/src/engine/sky-projection/`, `/src/app/(sky)/` · in REVIEW-01 iteration").

**Verdict: Request Revisions** — 1 CRITICAL / 4 MAJOR / 6 MINOR / 2 ENHANCEMENT. **Do not stamp FINAL this round.**

Cross-references read line-by-line: CLAUDE.md; citation-gate-spec.md v1.7; psyche-net-master-concept.md §7/§7.1; prisma/schema.prisma (including the three-computer writer banner); src/engine/contracts/extraction-contracts.ts (v2.2); src/engine/graph-writer/writer.ts (to verify the trigger-point claim against the writer that actually exists); docs/proposer-spec.md v1.4-FINAL (blinding language); round-2 punch-list.

---

## (a) Round-2 closure verification — 21 HOLDS / 1 PARTIAL / 0 MISSING

| Item | Status | Evidence in v1.2 |
|---|---|---|
| A-1 recompute trigger + link lifecycle + live-join + negative-lifecycle test | **HOLDS** (as specified) | §3.1 carries all three triggers, the link-lifecycle bullet, the live-join rule, and test 7(b) incl. LAW-8 erasure + replay equivalence. *But see NEW C-1: the punch-list's own premise ("the writer sees these mutations") is architecturally false — the closure faithfully implemented a flawed instruction.* |
| A-2 effectiveEvidence + LensMatchLinkView into the renderer | **PARTIAL** | §2 carries `effectiveEvidence`, the `LensMatchLinkView[]` overlay, and brightness-from-effectiveEvidence; test 6 covers linked-evidence slicing. The punch-list's second test — "a view-model test asserts the link view + brightness change after a match" — has NO §5 carrier: no test asserts the overlay is emitted or that a charged ghost's brightness actually changes (see m-1). |
| A-3 full-graph trigger on import/remap | HOLDS | §3.1 trigger 3; test 8 (evidence-first direction, "delta-only regression tripwire"). |
| A-4 viewer param, veil into view model, list/toast parity, client-in-supervised | HOLDS | §2 signature `skyProjection(..., viewer, ...)`; WOUND-gating paragraph ("a property of the projection"); test 10 covers list parity, toast, client-in-supervised. |
| A-5 writer banner reframe (three computers) | HOLDS | schema.prisma lines 165–179: graph writer as single writing module, three named upstream computers, gate exemption stated WITH its reason ("a check that cannot fail launders trust"). |
| A-6 lens idempotency DB guard | HOLDS | §1 idempotency bullet (fingerprint unique, partial unique index, transaction + retry, key→type CI pin); §7 migration 7 carries the constraints. |
| A-7 deletion-cascade mechanics | HOLDS | §7 migration 7: `onDelete: SetNull` + app-level erasure transaction (archive uncharged / sever charged); test 11. |
| A-8 D-R1 structural enforcement | HOLDS | §1 direction-rule paragraph, all four mechanisms (a)–(d) present (but see m-5 on (b)/(c)'s CI-vs-review phrasing). |
| A-9 archive/sever lifecycle tests | HOLDS | Test 11: remap over charged + uncharged; ChartImport delete split; zero FK violations. |
| A-10 MatcherRun replay carriers | HOLDS | §7 migration 8: `inputs JSON` + `runId` FK on the link table; test 7 replay asserts against them. |
| C-1 view-model snapshot + `@ts-expect-error` fixture | HOLDS | Test 12, verbatim coverage of all four round-1 PARTIALs. |
| C-2 link-based "charged" definition at the cascade | HOLDS | §7 migration 7 italic ("a CONTRADICTED mass-0 ghost counts as charged and survives deletion"). |
| C-3 test 9 eval-scored, never CI-gating | HOLDS | Test 9 says exactly this, mirroring the proposer CI/canary split. |
| C-4 crisis independence operationalized | HOLDS | §2 (output invariant under veil-flag flip + import-boundary lint); test 10 asserts both. |
| C-5 gate spec closing line → v1.7 | HOLDS | citation-gate-spec.md closing line reads "End of citation gate spec v1.7." |
| C-6 charged ghosts outside the budget | HOLDS | §1 ghost-budget bullet + test 3 ("charged ghosts are exempt from the cap"). |
| C-7 brightness naming + never-reads-luminosity | HOLDS | §2 brightness bullet; test 12 assertion. |
| C-8 cosmos smoke-test framing + version pin | HOLDS | §2 hard-invariants bullet (spies on calls, lockfile pin, SPDX). |
| C-9 pending-confirmation state | HOLDS | §2 tap-for-evidence + §7 migration 8 fail-closed language (but see m-2: no test carrier). |
| C-10 version-equality matcher test | HOLDS | §3.1: "A matcher unit test asserts the algorithm versions it stamps equal the gate's" (version-skew tripwire). |
| C-11 fringe pilot watch in §7.1 | HOLDS | §2 fringe bullet names the watch; master concept §7.1 carries "[renderer-lens r2 · Claude E-1] The static fringe ages — pilot watch." |
| C-12 rendererConfig defaults + canonical-view snapshot | HOLDS | §2 grammar header + §7 renderer-owned paragraph. |

R-1…R-3 (rejections): no new argument found against R-1 (byte-identity is verifiably the stronger assertion; the serializer is allowlist-based) or R-2/R-3. Not re-litigated.

---

## (b) NEW findings, worst-first

### CRITICAL

**C-1 — Trigger 2 hangs the un-telling invariant on a component that never sees the triggering mutations, and "schedules a recompute" is not durable.**

*Observation.* §3.1 trigger 2: "any invalidation, supersession, archival, or LAW-8 erasure touching a `SourceEvent` or `Evidence` row … schedules a recompute … **The writer is the trigger point (it already sees these mutations).**" That parenthetical is false, twice over:

1. **The graph writer does not see retraction mutations.** The writer's entire surface is `GateResult → Postgres` (writer.ts; the schema banner scopes it to the DERIVED tables — PsycheNode/PsycheEdge/Evidence). `SourceEvent` is ground truth, outside the banner. Verified in code: nothing in `/src` writes `SourceEvent.invalidatedAt` or `supersededById` — the writer only READS them (writer.ts lines 320–338, live-join support). The correction path ("correction = a new event + invalidation", schema line 96) does not exist yet and, when built, is an ingest-layer operation with no reason to traverse the graph writer. LAW-8 erasure is explicitly "a separate, audited erasure path" (schema DEFERRED block) — also not the writer. So of the four retraction classes trigger 2 enumerates, **none structurally flows through the named trigger point.** Nothing in the spec or the banner forbids app code calling `prisma.sourceEvent.update({ invalidatedAt })` directly, which would retract the words with no recompute ever firing — the exact round-2 Critical (stored ACTIVE/>0 vs replayed HYPOTHESIS/0; the sky keeps saying the chart was right) reintroduced through the side door of a misassigned hook. Test 7(b) would catch a happy-path implementation, but a SECOND correction/erasure entry point added later bypasses it silently — this is a choke-point problem, and the spec names the wrong choke-point.

2. **"Schedules" has no durability carrier.** If the process dies between the retraction write and the recompute (or the schedule is an in-memory queue), the divergence persists indefinitely — there is no healing trigger (the user who retracts at 1 a.m. and never journals again is never recomputed). Nothing states the trigger is transactional with the mutation; no outbox/pending-recompute carrier appears in §7's migration list.

*Why it matters.* This is the load-bearing round-2 closure. The product's one-sentence identity ("un-confirming must un-tell") is currently guaranteed only when (a) every future retraction path happens to be built inside a module that today has no retraction surface, and (b) nothing crashes. Both are hope, not structure.

*Recommended action (cheap, one section + one banner sentence).* (i) Name a **retraction API** as the single sanctioned mutation surface for `SourceEvent.invalidatedAt`/`supersededById`, Evidence erasure, and the future LAW-8 path — owned by the graph-writer module, added to the schema banner ("the writer also owns the retraction surface; a retraction performed anywhere else is a bug"), so trigger 2's premise becomes true by construction. (ii) Make the recompute **synchronous inside the retraction transaction** (graphs are dozens–low-hundreds of nodes; there is nothing to queue) — or, if async is ever needed, a transactional outbox row named in §7. (iii) Assign the hook to a build stage (§6 currently ends at "hypothesis matcher"; the retraction surface belongs to the matcher build and should be named in migration 8's scope). (iv) Extend test 7(b) with a crash-shaped assertion: retraction transaction commits ⇒ recompute is already committed (same transaction), not pending.

### MAJOR

**M-1 — Practitioner confirmation is a state input with no trigger and no arithmetic parameter.**

§3.1's match rule: COUNTERVAILING → CONTRADICTED via "practitioner confirmation in SUPERVISED." Two seams: (1) **No trigger fires when a `HypothesisConfirmation` row is written** — §3.1's trigger list is match / retraction-of-SourceEvent-or-Evidence / import-remap. A confirmation (and equally an UN-confirmation or a consent-severance ending the supervised engagement) touches neither a SourceEvent nor an Evidence row, so the confirmed contradiction sits inert until an unrelated pass happens to re-match. (2) **The gate's exported `nextState(prev, evidenceSet, now)` (gate spec §6.4) has no confirmation input**, and §3.1 bans reimplementation ("Reuse is mandated; reimplementation is banned") — so contradiction-by-confirmation is arithmetically unreachable through the mandated functions. Fail-closed holds pre-migration-8 (the spec says so), but migration 8 as specified lands a carrier that nothing can consume. Fix: add trigger 4 (confirmation write/withdrawal → recompute of the named hypothesis, transactional per C-1's pattern), and resolve the arithmetic seam explicitly — either gate `nextState` gains an explicit confirmations parameter (gate spec v1.8 bump, flagged at integration) or the spec states that confirmation is a matcher-layer state OVERLAY applied after `nextState` (and says why that isn't "reimplementation"). Also pin what happens to a confirmation-driven CONTRADICTED when the practitioner relationship is severed.

**M-2 — The erasure keystone's DB mechanics are unnamed: what does "the link's invalidation record alone" contain when the Evidence row is gone?**

§3.1 requires the recompute to "function from the link's invalidation record alone," and §7 migration 8 gives `HypothesisEvidenceLink` an `invalidatedAt` — but no `onDelete` behavior for its `evidenceId` FK (contrast migration 7, which carefully pins `onDelete: SetNull` for `chartImportId`). When the Evidence row is hard-deleted: an unspecified FK either blocks the delete, cascades (explicitly banned: "invalidated, never silently cascaded"), or dangles. If `SetNull`, the "unique per evidence/node pair" constraint's interaction with NULL evidenceIds is undefined, and WHO writes `invalidatedAt` on the link is unassigned (the erasure path? the matcher? in whose transaction?). The honest arithmetic answer — the merged set is simply smaller; absence needs no positive carrier because mass is a pure function of the surviving records — is true but never stated, and the spec should say it in one sentence so nobody builds a tombstone-in-the-mass-math. Fix: migration 8 pins `evidenceId` nullable + `onDelete: SetNull` (or no FK with an explicit reason), names the erasure transaction as the writer of link `invalidatedAt` (inside the C-1 retraction API), states the uniqueness rule over invalidated links, and adds the one-sentence arithmetic statement.

**M-3 — The SourceEvent-erasure arm of trigger 2 has no rendering semantics and no test; `Evidence.quote` is a second copy of erased words.**

Trigger 2 covers "LAW-8 erasure touching a `SourceEvent`," but: (1) test 7(b) erases only the **Evidence row**; whole-SourceEvent erasure — the shape a real "delete my entry" request takes — has no test carrier. (2) §2's tap panel renders "by slicing `SourceEvent.content` with `spanStart/spanEnd`" — for an erased event there is no content to slice, and the behavior of the canonical evidence surface on a partially-erased chain is unspecified. (3) The Prisma `Evidence.quote` column is a verbatim copy of the person's words: erasing the SourceEvent without erasing its Evidence rows leaves the erased words in the database and (via `effectiveEvidence.quote`, contracts line 219–226) potentially on screen — a LAW-8 leak. The LAW-8 path is legitimately deferred (schema DEFERRED block), but v1.2 now *depends on its cascade semantics* without stating the dependency. Fix: one paragraph — SourceEvent erasure MUST cascade to its Evidence rows (quote copies included) before link invalidation fires; the panel's behavior for any evidence whose source is gone is fail-closed (row not rendered; ghost with zero surviving effective evidence shows the provenance copy); test 7(b) gains the whole-SourceEvent variant.

**M-4 — "Veiled-until-released" has no release carrier; the veil is NOT fully derivable from (role, consentScope) as §2 claims.**

§2 states the veil is computed from the `viewer` parameter ("role + consentScope-derived visibility"), and test 10 asserts "client-in-supervised stays veiled-until-released." But *released* is per-node state with no carrier anywhere: no column, no migration (§7 has none), no consentScope key shape, no contract type. D9's reveal flow is bundle work (master concept §7.1) — fine — but as written, test 10 is partially unimplementable (nothing can flip a node to released) and the projection's claimed input-completeness is false by omission: when the release flow lands, its state must feed `viewer` or the node view, and no seam is reserved. The failure direction is safe (fail-closed = veiled forever), so this is Major, not Critical. Fix: one sentence in §2 — v1 has no release carrier, so client-in-supervised is veiled ALWAYS (fail-closed); the release carrier (per-node, practitioner-authored, feeding the projection through `viewer`) is named §7.1 bundle work with its seam reserved; restate test 10's v1-assertable form.

### MINOR

**m-1 — (the A-2 PARTIAL) Matched-pair rendering and charged-ghost brightening have no §5 carrier.** §2's "Matched pairs render LINKED, never merged and never as two unrelated stars" and "a charged ghost brightens" are the demo's money shot, and no test asserts `LensMatchLinkView[]` is emitted after a match or that brightness changes when linked evidence arrives. The round-1 lesson verbatim: rule landed, test didn't. Fix: extend test 12's snapshot (or test 7's end-to-end) with a post-match view model asserting the overlay entry and the brightness delta.

**m-2 — The "pending confirmation" panel state (C-9) has no test carrier.** Fail-closed UI states are exactly the ones that silently regress. Add one assertion to test 10 or 7: second COUNTERVAILING in SUPERVISED without the confirmation carrier → view model carries the pending-confirmation state, never CONTRADICTED, never silence.

**m-3 — `effectiveEvidence` ordering is unstated.** Union of own ∪ linked with no canonical sort; test 4's byte-determinism and every snapshot depend on stable ordering. (Double-counting, for the record, is structurally impossible in v1: LENS nodes have no own evidence and the matcher links only extracted nodes' rows — worth one sentence in §2 so it stays true on purpose.) Fix: pin sort by (occurredAt, evidenceId).

**m-4 — Trigger 2 lists "archival … touching a SourceEvent or Evidence row," but neither model has an archival concept** (`archivedAt` exists on nodes/edges only). Either the word is dead (delete it) or it means archival of the *extracted node owning linked evidence* — in which case that's a distinct retraction class needing its own sentence (does archiving an extracted node un-charge the ghosts its evidence charged?).

**m-5 — D-R1 enforcement (b) and (c) are phrased as review process, not CI.** "Fails review" and "greppable denylist" name no check; (a) and (d) are structural, (b)/(c) as written are the prompt-enforced-where-structural-is-possible pattern. Fix: name them as CI jobs (change-set co-modification check; denylist lint over lens-map keys).

**m-6 — `confidence.hypothesisFloor` is cited as a gate config key the gate spec never names.** §1/§7 say the floor "REUSES gate config `confidence.hypothesisFloor`"; gate spec §6.3 has only prose ("a low confidence floor (e.g. 0.15)"). One-line gate-spec doc-sync when next touched, or the key name will drift.

### ENHANCEMENT

**E-1 — The gate's LENS zero-evidence hypothesis arm is now dead code.** Gate spec §4 still allows LENS-provenance proposals to materialize at mass 0, but `ExtractableNodeType` excludes LENS, the wrapper fails it at shape validation in every mode, and v1.2 routes all lens creation through the lane. Unreachable-by-construction is fine, but flag it in the gate spec (like the deprecated-never-written enum member) so nobody "fixes" a rejected LENS proposal by widening the wrapper.

**E-2 — State explicitly that recompute and `effectiveEvidence` consume only links with `invalidatedAt IS NULL`.** It's clearly the intent (the lifecycle bullet implies it) but the filter itself is never written down, and it's the kind of one-word WHERE clause that gets forgotten in the join.

---

## (c) Exit recommendation

**Do not stamp FINAL.** One Critical survives, and it sits exactly where round 2's Critical sat: the recompute machinery that makes "un-confirming un-tell" true. The v1.2 closure implemented the punch-list faithfully, but the punch-list's premise — "the writer sees these mutations" — is false against the writer that actually exists (verified in code: nothing writes `SourceEvent.invalidatedAt`; the writer's surface is GateResult-only and the banner scopes it to derived tables), so the trigger as specified has no structural carrier and no durability, and every retraction class it enumerates flows through paths (correction layer, deferred LAW-8 path) that today bypass the named trigger point. The fix is cheap — a named retraction API under the writer's banner, synchronous recompute in the retraction transaction, one build-order assignment — which is precisely why it should be fixed now rather than discovered mid-build, when the temptation will be a fire-and-forget queue bolted onto whichever module happens to host the correction endpoint. The Majors (confirmation trigger/arithmetic seam, erasure FK mechanics, SourceEvent-erasure rendering, the release carrier) are all one-paragraph integrations in the same neighborhood; a v1.3 that lands C-1 + M-1…M-4 + the m-block should be a clean stamp next round.

## What's genuinely strong

The v1.2 integration is the best-shaped spec this loop has produced. §3.1 is now a genuinely honest charge carrier: linked-never-copied evidence, imported-never-reimplemented arithmetic, the live-join rule stated as a single definition, and a negative lifecycle test that includes the erasure case most specs would quietly skip. The veil-as-projection-property move (A-4) is the right kind of fix — one computation, every surface inherits it, and the crisis-classifier independence is operationalized down to an import-boundary lint. The writer banner's reframed honesty ("a check that cannot fail launders trust instead of creating it") is exactly the epistemics this product claims to have, applied to its own architecture. The D-R1 typed-subset enforcement, the charged-ghosts-outside-the-budget rule, and the link-based "charged" definition (a CONTRADICTED mass-0 ghost survives deletion "because being wrong is the product's claim") are all places where the spec chose the harder, truer invariant. And the honest-v1-reach paragraph (§3, CONTRADICTED is structurally rare under blinding) is the rare spec that names the limits of its own demo. This round's findings are concentrated in one seam — who observes retraction — and once that choke-point is named, the whole §3.1 machine closes.

*— End of round-3 Claude-lane review of renderer-lens-spec v1.2.*
