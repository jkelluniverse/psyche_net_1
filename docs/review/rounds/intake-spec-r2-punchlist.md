# Intake spec v1.1 — Round 2 punch-list (reconciled per charter)

*Lanes: Claude (Request Revisions — 1 C / 5 M / 5 m / 2 E) · ChatGPT gpt-5 (Request Revisions — 5 C / 5 M / 3 m / 3 E). Both reviewed v1.1. All contested factual claims verified against code before classifying (actions.ts classify-before-persist ✓; writer.ts "ONLY for gate output" comment ✓; proposer closing-line stamp drift ✓).*

**Checkpoint status: STOPPED for Jacob.** One Critical (law-level) this round.

**The round's shape:** the two lanes diverged usefully. ChatGPT's five "Criticals" are mostly *build-tracking* — "v1.1's mandates aren't in code yet" (watermark fix, becoming module, IntakeSession schema, lock, beat builder), which is true and is what §9 exists for; the loop reviews the spec, the build follows FINAL. Claude's round is the sharper one: the round-1 *fixes themselves* opened four real seams, including one law-level gap in the becoming lane we just built.

---

## ACCEPTED (integrate into intake v1.2)

**A-1. The becoming declaration must pass the crisis floor** *(Claude C-1 — the round's Critical; charter class 2, law contradiction)* — §4's seed statement is person-**edited** free text persisted as a SELF SourceEvent, and nothing classifies it: §2.2's mandate covers "answers," LAW 7 covers "every inbound entry," and the declaration is an inbound entry. The most emotionally loaded moment of the flow ("I'm becoming someone who won't be needed here much longer", 1 a.m.) is currently the one SELF-text path that skips the floor — opened by the very fix that made the lane structurally honest everywhere else. Integration: §4 routes the declaration write through the same ingest step as every entry (classify → persist with verdict in `signals.crisis`); a CRISIS-level declaration completes the ceremony **without celebration** and engages the resource surface. New test 13. ⊕

**A-2. Serialization moves to the shared entry point** *(Claude M-1 + ChatGPT C-4/ENH-15)* — v1.1 placed the per-user guard "in the intake orchestration," but journal `reflectNow` calls the same entry point unguarded: a user mid-intake with the journal open in another tab races it, and forged recurrence returns across surfaces while intake-scoped test 9 stays green. The spec's own argument convicts its own fix — "one utterance counts once" is a property of the user's extraction stream, not the intake flow. Integration: the guard lives in/at `runExtractionPass` for **every** caller (named mechanism: partial unique index on `ExtractionRun(userId) WHERE status='running'` — house style, raw-SQL migration; advisory lock noted as the alternative, decided at build); intake UI gating stays as UX. Test 9's serialization half restated entry-point-level + explicit cross-surface case. ⊕

**A-3. Timeout ≠ failure — the §2.3 posture split** *(Claude M-2 + ChatGPT M-7 overlap)* — v1.1's fold-forward copy is true for a *thrown* pass (watermark holds) and **false for a timed-out pass that later completes** (watermark advances; no catch-up fires; answer N's stars land un-narrated — dishonest copy through the most likely degraded path at demo time). Integration: pick posture (a): **on timeout the orchestrator aborts server-side and marks the run `error`** — the watermark holds and the fold-in copy is true by construction; define the guard's behavior for a submit arriving while a timed-out pass unwinds (reject-into-waiting, never a second concurrent run). Test 10 gains the timed-out-then-completed case. ⊕

**A-4. §2.2's ingest order corrected to match the code it cites** *(Claude M-3)* — verified: `actions.ts` classifies **first**, then persists with the verdict in the create's `signals.crisis`. v1.1 stated it inverted (persist → classify), which has no legal verdict carrier on an immutable event and opens a persisted-but-unclassified crash window. Integration: §2.2 reads classify → persist-with-verdict → beat-after-verdict → extraction; `signals.crisis` named as the verdict carrier on intake events (explicitly compatible with §6.1's "intake-meta not in signals" sentence — crisis verdict is a signal, intake-meta is not).

**A-5. The writer gets the fourth computer's actual door** *(Claude M-4 + ChatGPT C-2 remainder)* — v1.1 amended the banner but not the writer: `writer.ts`'s only public surface is `writeGateResult`, and line 103's "validated: true — set ONLY here, ONLY for gate output" plus the file header become false the moment the lane lands. The one seam §4 left unowned is the actual INSERT. Integration: §4 names `writeBecomingDeclaration` as the writer-side entry point (deterministic, transactional; the writer remains the sole graph-state author), and lists the writer header + "set ONLY here" comment amendments alongside the banner amendment in the same build commit. Test 5 extended: artifacts written by the writer path only. ⊕

**A-6. `BECOMING_DECLARATION` extraction-ineligibility pinned** *(Claude M-5 + ChatGPT MIN-13 + C-2 sub-item — both lanes independently)* — today's exclusion is an accident of an inclusive allowlist; the natural future "cleanup" adds it and double-counts spark 7's themes (forged recurrence through §4's side door). Integration: one §4 sentence (ceremonial carrier, themes already extracted, deliberately excluded) + a regression test pinning the allowlist exclusion. ⊕

**A-7. Merged-pass copy drives off the run's own result** *(Claude m-1 + ChatGPT M-10)* — the pre-read `countUnextractedSources` is TOCTOU-racy and cap-blind; the pass already returns the truth. Integration: the catch-up-vs-single-answer branch keys on `RunPassResult.sourcesExtracted > 1` (with `sourcesDeferred` honesty); pre-read count survives only for pre-pass waiting copy.

**A-8. Zero-source-run semantics under the watermark fix** *(Claude m-2)* — create-first means a run row can exist with zero sources; §2.1 states the choice: a zero-source run marked `complete` advances the watermark (it verified emptiness as of its `startedAt`) and the regression test covers the empty case.

**A-9. Intake-meta carrier named** *(Claude m-4 + ChatGPT C-3 sub-item + MIN-11 — both lanes)* — §6.1 gets concrete: **`SourceEventIntakeMeta { sourceEventId PK/FK, sparkIndex, intakePromptsVersion, inputMode }`** side table, with the same owning-migration sentence as the other two deltas.

## CHEAP (small edits, same integration pass)

**C-1.** Doc-sync coherence nits *(Claude m-5)* — all three verified: proposer spec closing line updated to v1.5-FINAL (the FINAL-drift amendment's own stamp kept honest); the §3 `ProposerInput` block's layer drift fixed while we're in the file (`priorNodes: CandidatePriorNode[]` pre-filter at the input layer; `priorExtractedNodes: PriorNodeView[]` at the context layer — the doc-sync edited that block and left the pre-existing drift); intake §2.3's bare "§10.5" becomes "proposer spec §10.5."
**C-2.** Chart-copy tripwire *(Claude m-3)* — §2.4 names the dependency: `linksCreated > 0` implies "chart" only while the matcher is LENS-only; matcher expansion obligates provenance-discriminated counts in `ReflectSummary`.
**C-3.** `intake.targetObjects` gets a consumer *(Claude E-1)* — the reveal's summary copy calibrates against it ("a beginning sky of about seven"); a named key nothing reads is the inverse of no-magic-numbers.
**C-4.** Seed-draft function named *(ChatGPT M-9 nub)* — §4 names `makeSeedDraft(answerText, version)` pure + versioned; template version stamped on the declaration's intake-meta.
**C-5.** Orchestration surface named *(ChatGPT ENH-14 + M-6 nub)* — §2 names the single intake submit action (save → classify → reflect-or-defer → beat from veiled projection) as the surface tests 3/9/10/11 target.
**C-6.** Reduced-motion acceptance criteria *(ChatGPT MIN-12)* — test list gains the §2.4 reduced-motion assertion.
**C-7.** Telemetry counter shape *(ChatGPT ENH-16)* — one sentence: incremental counters keyed (`intakePromptsVersion`, `sparkIndex`); never per-user rows.

## BUILD-CONFIRMED (charter class 6 already carried — no spec delta; the finding converts to the build checklist)

*ChatGPT C-1 (watermark fix not yet in run-pass), C-2 core (banner still THREE; kind/module/migrations absent), C-3 core (IntakeSession absent), C-5 (beat builder absent), M-6 (intake crisis handler absent), M-7 (reflectTimeoutMs absent), M-8 (stopping-rule query absent), M-9 core (template absent).* All true; all already mandated by v1.1 §§2.1–2.4/4/5/6.1 + tests 3/6/9/10/11 with failing-first obligations. The spec is the contract; §9 is their build order. Nothing to integrate beyond A-items above.

## DEFERRED (§7.1 bundle)

**D-1.** Wedge consent naming *(Claude E-2)* — pre-session intake is arguably not "between-session extraction"; the existing D9 consent-copy bundle entry is extended to explicitly cover the pre-session intake moment, so the first extraction a client ever experiences is one their consent line-item named.

## REJECTED

*None this round.*

## STALE-ALREADY-FIXED

*None this round (both lanes reviewed v1.1 accurately; every factual claim I checked verified).*

---

## Checkpoint notes for Jacob

1. **A-1 is the round's Critical and it's ours:** round 1's becoming-lane fix built a SELF-text ingest path that skips the crisis floor. The fix is one paragraph + one test; the class (new write surface → floor coverage) is worth remembering every time a lane is added.
2. **A-2 moves your serialization ruling one level down** — same ruling ("one in-flight pass per user"), enforced at the entry point every caller shares instead of intake-side. The cross-surface race (journal tab open mid-intake) made the intake-side placement insufficient.
3. **A-3 picks posture (a)** — timeout aborts the run server-side so the fold-forward copy is always true. The alternative (let it finish, reconcile next beat) keeps a completed-but-unnarrated pass alive and needs more machinery for less honesty.
4. ChatGPT's lane went build-shaped this round; classified as BUILD-CONFIRMED rather than spec deltas — flagging the classification itself for your OK since it's a new punch-list category (charter has no explicit class for "true, already mandated, awaiting build").

*Exit math: round 2 carries a Critical → round 3 runs after v1.2 integration (cap is three).*
