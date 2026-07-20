# Intake Spec Review — Round 2, Claude lane

**Spec reviewed:** Seven Sparks Intake — Module Specification, **v1.1** (`/home/user/psyche_net_1/docs/intake-spec.md`)

**Verdict: Request Revisions.**

One Critical, five Major. The round-1 integration is largely real — every A-item I could trace has an actual carrier in v1.1, the deferred items genuinely landed in master concept §7.1, and the code claims I checked (INTAKE_SPARK enum + allowlist, the conferring allowlist in `mass.ts`, the charged-ghost predicate, the watermark bug in `run-pass.ts`) all verify. But the round-1 edits opened new seams of their own: the becoming lane v1.1 built is a new SELF-text write surface that never passes the crisis floor, and the concurrency contract v1.1 added is placed on the wrong side of the entry point it exists to protect.

---

## CRITICAL

### C-1. The becoming declaration is an inbound entry that bypasses the crisis floor

**Observation.** §4 creates a new write surface for person-authored free text: the accepted seed statement becomes its own `SourceEvent` (`SourceKind.BECOMING_DECLARATION`), and the person **edits** the drafted statement before accepting — "the person's edit is the statement," persisted byte-for-byte. §2.2 mandates the crisis classifier "on **every answer**, unconditionally," and LAW 7 (CLAUDE.md) says crisis classification runs on **every inbound entry**. The declaration is not an answer, so §2.2's mandate doesn't reach it, and §4 never mentions crisis classification. Nothing in §8's tests or §9's build order touches it either.

**Why it matters.** Spark 7's *answer* is classified; the *declaration* is a differently-worded, freely-editable text the person can turn into anything at the most emotionally loaded moment of the flow (the closing ceremony, possibly at 1 a.m., possibly right after a "who are you becoming" prompt that surfaced despair — "I'm becoming someone who won't be needed here much longer"). v1.1 built the lane precisely to be structurally honest about every other property (banner, carrier, role, template) and skipped the one law-level property every other SELF-text ingest path in the product carries. This is exactly the class of gap the fourth-computer amendment exists to make findable — and the spec that amended the banner is the spec that opened the path.

**Action.** One paragraph in §4 + one test: the declaration write routes through the same ingest step as every entry (classify → persist with the verdict in `signals`, per the `actions.ts` pattern — see M-3); on a CRISIS-level declaration the ceremony completes without celebration and the resource surface engages, same posture as §2.2. Extend test 5 (or add a test 13): a crisis-phrased seed statement is classified, flagged, and never celebrated.

---

## MAJOR

### M-1. The per-user pass serialization is placed intake-side, but the race it kills is a property of the shared entry point

**Observation.** §2.1 fixes the watermark bug "in `run-pass` (not intake-side) … the journal inherits the fix" — correct placement, correct reasoning. But the same subsection places the serialization guard in "the intake orchestration" (UI gate + "server-side per-user run guard in the intake orchestration"). Meanwhile `reflectNow` in `app/(sky)/journal/actions.ts` calls `runExtractionPass` with no guard at all. A user mid-intake with the journal open in another tab (fully plausible under §6.2's re-run flow, where completed-intake users revisit skipped sparks) can run a journal reflect concurrently with an intake pass. Both passes load the same un-extracted sources; the double-extraction → forged-recurrence corruption §2.1 names as its own stake occurs across surfaces, untouched by the intake-side guard. Test 9 is an intake-scoped test and structurally cannot see this.

**Why it matters.** The spec's own argument convicts its own fix: "one utterance counts once" is a property of the user's extraction stream, not of the intake flow. An intake-side guard protects only intake-vs-intake overlap; the keystone test goes green while the actual invariant stays violable.

**Action.** Move the serialization into `runExtractionPass` itself (or a shared per-user lock all callers acquire): e.g. a partial unique index on `ExtractionRun (userId) WHERE status = 'running'` — raw-SQL migration, same style as the schema's other partial constraints — so a second concurrent pass fails fast for *every* caller. Keep the intake UI gating as UX. Restate test 9's serialization half at the entry-point level, and add the cross-surface case (journal reflect during intake) explicitly.

### M-2. §2.3 conflates "timed out" with "failed" — a timed-out pass that later completes breaks the attribution invariant §2.1 just established

**Observation.** §2.3: on timeout, the beat says "that one's saved — I'll keep listening as we go" and "the material folds into the next answer's pass (§2.1 merged-pass rule)." That is true for a **thrown** pass (run `status=error`, watermark holds — verified against `run-pass.ts`). It is false for a **timed-out** pass, which is still running server-side and may complete after the copy renders: completion advances the watermark, so the material does *not* fold into the next pass; `countUnextractedSources` reads 1 (only answer N+1), no catch-up copy fires, and answer N's stars land on the sky attributed to no beat at all — the copy lied and the "answer N's stars belong to answer N's beat" invariant breaks through a path §2.1 doesn't cover. Separately, the interaction with the one-in-flight guard is undefined: timeout releases the submit affordance while the guard still holds; what happens to submit N+1 while pass N is still in flight — queue, reject, cancel — is unstated.

**Why it matters.** The unbounded-tail LLM round-trip is the *normal* failure mode at demo time on conference wifi, not the exotic one. As specified, the most likely degraded path at the September demo produces dishonest copy and un-narrated sky changes — the exact corruption class round 1 was praised for closing.

**Action.** Pick one posture and write it down: (a) on timeout the orchestrator aborts the pass server-side (mark the run `error` so the watermark holds and the fold-in copy is true), or (b) the pass is allowed to finish and the next beat must consult its result and render catch-up copy even when `countUnextractedSources` was 1 (see m-1 for the better carrier). Define the guard's behavior for a submit that arrives while a timed-out pass still runs. Extend test 10 with the timed-out-then-completed case.

### M-3. §2.2 states the reused ingest contract in the wrong order — the file it cites does the opposite

**Observation.** §2.2 names the pattern as "`app/(sky)/journal/actions.ts`: **persist event → `classifyCrisis` synchronously** → then and only then extraction." The actual code classifies **first** (`classifyCrisis` at line 69) and then persists the event **with the verdict embedded in `signals.crisis` at create time** (lines 71–91). The order is not cosmetic: persist-then-classify has no legal carrier for the verdict — `SourceEvent` is immutable, so stamping the verdict after the fact means mutating `signals` on a persisted event — and it opens a crash window in which a persisted entry exists unclassified.

**Why it matters.** A-5's whole point was to *name the contract intake reuses* so the intake build copies it rather than reinventing it. Naming it inverted means the intake build either implements the inverted (broken) sequence faithfully, or silently diverges from its own spec. Either way the "reuse" claim fails at the one step it was added to protect.

**Action.** Correct §2.2 to match the cited code: classify synchronously → persist with the verdict in the create's `signals` → beat only after the verdict → extraction. Name `signals.crisis` (term keys + level, never content) as the verdict carrier on intake events too — it coexists fine with §6.1's decision to keep *intake-meta* out of `signals`, but say so, since §6.1's "not in `SourceEvent.signals`" sentence will otherwise be read as banning it.

### M-4. The fourth-computer amendment names the banner but not the write path — the writer has no API the becoming lane can call, and the writer's own comments still say three

**Observation.** §4 amends the schema banner ("exactly THREE sanctioned upstream computers") to list the becoming lane as the fourth. But "upstream computer" means upstream of *the writer*, and the writer's public surface (`writer.ts`) is `writeGateResult(GateResult)` — there is no entry point through which a becoming declaration (node + full-span Evidence row) can legally be written. Worse, `writer.ts` line 103 sets `validated: true` with the comment "set ONLY here, ONLY for gate output (LAW 2; DB CHECK)," and the file header says it is "the only code that writes graph state." After the lane lands, either the lane writes Evidence outside the writer (violating the choke-point the banner protects) or those comments become false — and the spec's own argument for the amendment ("the banner did its job in review … the amendment keeps it able to do that job") applies verbatim to the writer's comments, which it doesn't amend.

**Why it matters.** This is an incomplete integration of v1.1's own headline fix. §4 says "this spec owns the seam contract," and the one seam left unowned is the actual INSERT: which code writes the BECOMING node and its `role=DECLARATION`, `validated=true` Evidence row. That is precisely the question a future reviewer greps for.

**Action.** Name the writer-side entry point in §4 (e.g. `writeBecomingDeclaration` — deterministic, transactional, the writer stays the sole graph-state author), list the `writer.ts` header + "set ONLY here" comment amendments alongside the banner amendment in the same build commit, and add the entry point to §9's becoming-lane build step. Extend test 5 to assert the artifacts were written by the writer path (e.g. no other module holds the insert).

### M-5. `BECOMING_DECLARATION`'s extraction eligibility is unpinned — the safe current behavior is an accident of an inclusive allowlist

**Observation.** The declaration is a SELF-authored `SourceEvent` whose content is, by construction (§4's deterministic template), a re-wording of the spark-7 answer that was already extracted. `run-pass.ts`'s kind allowlist (`JOURNAL_TEXT | JOURNAL_VOICE | INTAKE_SPARK`) happens to exclude it — but the spec never states that the new kind must stay out of the pass, no test pins it, and the natural future "cleanup" ("why is this SELF event never extracted?") would add it.

**Why it matters.** If the declaration ever enters extraction, the same themes from one utterance are counted twice — `timesSeen` inflated by a ceremony artifact — which is the forged-recurrence stake of §2.1 arriving through the side door §4 built. The spec's own standard (a rule stated in prose that no interface or test carries is a disconnected fix) applies.

**Action.** One sentence in §4: `BECOMING_DECLARATION` is *not* extraction-eligible — it is a ceremonial carrier whose themes were already extracted from spark 7; the pass kind-allowlist excludes it deliberately. One regression test asserting the allowlist's exclusion (guards the future edit, not just today's code).

---

## MINOR

### m-1. The merged-pass copy carrier is the weaker of two available carriers

`countUnextractedSources` read *before* the pass is TOCTOU-racy (a journal entry from another tab between the read and the load skews it), and it's cap-blind (`maxEventsPerRun` can defer sources so the pass covers fewer than counted; `sourcesDeferred` exists for exactly this). The pass already returns the truth: `RunPassResult.sourcesExtracted`. **Action:** drive the catch-up-vs-single-answer branch from the run's own result (`sourcesExtracted > 1`), keep the pre-read count only for the pre-pass waiting copy if wanted.

### m-2. The watermark fix changes the entry point's early-return semantics — one sentence needed

Create-run-row-first means `runExtractionPass` mints a run row before it knows whether sources exist; the current `NO_NEW_SOURCES` early return (line 136) happens pre-create. The fix must define zero-source-run semantics (a zero-source run marked `complete` advancing the watermark is arguably *correct* — it verified emptiness as of its `startedAt` — but say so, or delete the row). The spec calls the fix "implementable against this code," which it is, but the regression test should cover the empty case or the journal's "nothing new to reflect on" copy path breaks.

### m-3. "Impossible for a chartless user by construction" is true only while the matcher is LENS-only — an undocumented dependency

The §2.4 chart-copy branch keys on `linksCreated > 0`. That implies "chart" today only because the hypothesis matcher is LENS-only in v1 (renderer-lens §3); `ReflectSummary.linksCreated` carries no provenance. When the real matcher lands (§7.1 bundle: semantic/evidence-overlap, and eventually becoming/practitioner hypotheses), `linksCreated > 0` stops implying a chart and the line becomes a silent lie for chartless wedge clients with practitioner hypotheses. **Action:** name the dependency in §2.4 and note that matcher expansion obligates provenance-discriminated counts in `ReflectSummary` — a tripwire sentence, not a build item.

### m-4. Two of v1.1's three schema deltas have named owners; the third doesn't

`IntakeSession` and `BECOMING_DECLARATION` each get "owning migration named in the build." The event-side intake-meta structure (§6.1 — spark identity, `intakePromptsVersion`, input mode) is explicitly *not* `signals`, but what it *is* — a column, a JSON field, a side table — is never named, and it has no owning-migration sentence. **Action:** name the carrier (a side table keyed by `sourceEventId` fits the "not overloading documented spaces" logic best) and give it the same owning-migration treatment.

### m-5. Doc-sync coherence nits (the round-2 brief asked for this check)

(a) Proposer spec v1.5-FINAL's closing line still reads "*End of proposer spec v1.4-FINAL*" — the version stamp the FINAL-drift amendment exists to keep honest is self-inconsistent within the synced file. (b) The v1.5 doc-sync added `heldShadowLabels` to a §3 `ProposerInput` block whose *adjacent* field is still wrong-layered: spec shows `priorExtractedNodes: PriorNodeView[]`, code's `ProposerInput` is `priorNodes: CandidatePriorNode[]` (`priorExtractedNodes`/`PriorNodeView` belongs to `BlindedExtractionContext`, `types.ts` lines 72–108) — pre-existing drift, but the sync edited that exact block and left it. (c) Intake §2.3's bare "§10.5" cross-ref resolves nowhere inside a 9-section spec; it means proposer spec §10.5 — say so. All doc-only ("neither spec's prose is the contract"), but this loop's founding precedent is that contract-doc drift gets killed on sight.

---

## ENHANCEMENT

### E-1. `intake.targetObjects` is config no predicate consumes

§5 names three config keys; `earlyCloseBound` and `minPromptsBeforeClose` drive the stated rule, `targetObjects` (7) drives nothing. Give it a consumer (e.g. the reveal's summary copy calibrates against it) or demote it to prose — a named-config key that no code reads is the inverse of the no-magic-numbers rule.

### E-2. Wedge-flow consent naming: is pre-session intake "between-session extraction"?

Proposer spec v1.4 D9 scopes PRACTITIONER_SUPPORTED extraction to the named consent line-item `consentScope.betweenSessionExtraction`. The wedge intake (§2, master concept §6.2) runs *before session one* — arguably not "between sessions." `livePolicyFor` will do whatever the policy constructor does, but the consent copy work already deferred to the §7.1 bundle (D9 entry) should explicitly cover the pre-session intake moment so the first extraction a client ever experiences isn't the one their consent line-item technically didn't name.

---

## What's genuinely strong

- **The round-1 integration is honest work, and it verifies.** Every code claim I checked holds: `INTAKE_SPARK` is in the enum and the `run-pass` allowlist exactly as §2 says; the conferring parenthetical in §4 matches `mass.ts` precisely, including the D8 subtlety (ENACTMENT confers everywhere, BECOMING requires it, DECLARATION confers nowhere — fail-closed allowlist); §5's charged-ghost predicate matches renderer-lens (`EXISTS(active link)`, CONTRADICTED counts, imported-not-restated); the two deferred items really do sit in master concept §7.1, verbatim, with round attributions.
- **The watermark diagnosis is exactly right.** `loadUnextractedSources` before `extractionRun.create` against the *last* run's `startedAt` genuinely strands the window; failed runs genuinely don't advance the watermark. §2.1's fix direction (create first, load against own `startedAt`, fixed in the shared entry point) is correct and implementable.
- **The becoming lane's trust design is the best paragraph in the spec.** Born `role=DECLARATION`, structurally unable to self-ignite regardless of copy or code; deterministic versioned drafting; consent as the only path; the "a check that cannot fail is stated as such" honesty inherited from the lens lane. The findings above are about the lane's *plumbing*, not its trust model.
- **§2.4's copy discipline is real product judgment**: deterministic templates only, veiled projection as the sole identity source (correctly leaning on renderer-lens's veil-in-the-projection property so the beat inherits it for free), branch-by-what-actually-happened, and the zero-change split that refuses to pretend "held" when nothing was.
- **The failure posture has the right values**: "immediacy is the pedagogy, not the integrity" is the correct hierarchy, and voice-lands-last in §9 is the cut-line pre-built rather than retrofitted — genuine solo-builder realism.

*— End of round-2 review (Claude lane), intake spec v1.1.*
