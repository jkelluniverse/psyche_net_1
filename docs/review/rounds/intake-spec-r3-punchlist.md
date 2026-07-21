# Intake spec v1.2 — Round 3 punch-list (CAP ROUND — reconciled, escalated per charter)

*Lanes: Claude (**Approve with Changes — 0 C / 5 M / 4 m / 1 E**) · ChatGPT gpt-5 (Request Revisions — 3 C / 4 M / 3 m / 2 E). Both reviewed v1.2. Contested code claims verified before classifying (crisis classifier has NO model-call timeout — confirmed by grep; all of Claude's round-2-integration verification spot-checks consistent with the code).*

**Checkpoint status: STOPPED — this is the three-round cap with Criticals still labeled in one lane, so per the charter this goes to Jacob rather than stamping FINAL.** The honest read of the cap: the Claude lane returned **zero Criticals** and verified the full round-2 integration landed; ChatGPT's three "Criticals" are two build-tracking items (BUILD-CONFIRMED below, per-entry owners cited) and one classifier-posture concern that reconciles into Claude's M-4. **No unresolved spec-defect Critical exists** — but the label exists, and the charter says never stamp over one without the human. Proposed exit below.

---

## ACCEPTED (integrate as v1.3 — all five Majors are failure-path scoping of round 2's own mechanisms)

**A-1. Abort gets a point of no return; `complete` becomes atomic with the write** *(Claude M-1 — the round's worst)* — v1.2's abort-on-timeout never says which pipeline stages honor the abort. An abort landing after the writer's transaction commits but before the run flips `complete` yields `status=error` **with sky mutations committed**: the held watermark re-extracts the same sources — `timesSeen` re-inflation, new-span evidence from one utterance (span-exact dedupe can't catch different spans) — forged recurrence through the very mechanism built to keep the copy honest. Integration: (i) the abort is a **checkpoint honored only before the write stage**; a pass that has entered the writer runs to completion and narrates as an honestly-labeled catch-up (late ≠ aborted); (ii) the run's `complete` transition commits **inside the writer's transaction** — which also closes the pre-existing writer-commit/status-update crash window in `run-pass.ts` (same double-extraction bug, no timeout needed). Test 10 gains the race case: abort vs. write-stage → either `complete`+narrated or `error`+zero mutations, never `error`+mutations. ⊕

**A-2. Orphaned `running` rows get a staleness rule — the guard must not become a permanent lockout** *(Claude M-2)* — v1.2's partial unique index turns a crash-orphaned `running` row (deploy, OOM, platform timeout — the marker never runs) into an immortal per-user extraction wedge across ALL surfaces, with intake copy promising "I'll keep listening" forever. Integration: a `running` run older than `intake.reflectTimeoutMs` + named grace is dead by definition; the **next caller** reaps it before creating its own run (deterministic, versioned config, no daemon) — composing with A-1: a stale run past the write checkpoint reaps to `complete`-shaped truth, not `error`. Test 9 gains the orphaned-row case. ⊕

**A-3. The ceremony write is one transaction** *(Claude M-3 — the third and last unowned becoming seam, one per round)* — §4's classify → persist → `writeBecomingDeclaration` sequence has an unowned crash window whose orphan is uniquely bad: a persisted `BECOMING_DECLARATION` event with no node **can never fold forward, by v1.2's own A-6 design** (extraction-ineligible). Integration: `writeBecomingDeclaration`'s transaction spans SourceEvent create + node + evidence + intake-meta (classification runs before the transaction; verdict rides the create). Test 5 gains the crash-shaped assertion: mid-ceremony failure ⇒ zero artifacts *including the event*, retryable; success ⇒ all four rows, one transaction. ⊕

**A-4. The classifier gets a model-call timeout; the reflect budget is scoped post-persist** *(Claude M-4 + ChatGPT C-3 core — verified: no timeout exists in `crisis/classifier.ts`/`config.ts`)* — §2.3's abort semantics are defined over the *pass*; a hang in the pre-persist classify stage has no run to abort and no persisted event ("the event persists" is false exactly when it matters). The fail-closed posture covers a thrown/absent model, not a hung one. Integration: (i) a named timeout on the classifier's model-arbitration call **in crisis config** (expiry = model failure → the classifier's existing fail-closed rules: soft-signal → CRISIS, no signal → NONE + `degraded: true`) — classification always terminates, persist always proceeds, the journal inherits it free; (ii) one §2.3 sentence: `intake.reflectTimeoutMs` starts at pass start, post-persist. ⊕
*ChatGPT C-3's specific mechanism (persisted PENDING/ERROR verdict states) is REJECTED-WITH-REASON below — the timeout keeps the terminal-verdict invariant instead.*

**A-5. Meta stamps get their test carrier** *(Claude M-5 — the charter tripwire's exact class, fired before at renderer-lens v1.3)* — none of the 15 tests asserts a single `SourceEventIntakeMeta` stamp; an unstamped row fails silently forever and editorial history becomes unreconstructable with every test green. Integration: **test 16** (every answered spark's event has a meta row with correct sparkIndex/promptsVersion/inputMode; the declaration's row carries `becomingSeedTemplateVersion`; a skipped spark has none — pairs with test 2); test 6 extended to cover `intake.targetObjects`' reveal-copy consumer. ⊕

**A-6. Idempotent spark submission** *(ChatGPT M-7 — the source-creation half of "one utterance counts once")* — double-tap/network retry can mint two SourceEvents for one spark; a perfect pass guard can't help if the duplicate exists at ingest. Integration: server-enforced uniqueness per (sessionId, sparkIndex) on the spark-state/meta row; duplicate submits coalesce deterministically; test added. ⊕

## CHEAP (same integration pass)

**C-1.** Test 3 gains the verdict-in-create assertion — the persisted event carries `signals.crisis` at create; no persisted-but-unclassified row is ever observable *(Claude m-1)*.
**C-2.** Declaration meta-row shape defined before the migration fossilizes a guess: `sparkIndex` nullable with a DECLARATION sentinel; explicit `inputMode` value for the edited-draft path *(Claude m-2)*.
**C-3.** Resource-surface orchestration named: the suppression flag that drives beat copy + the resume token, at the server/UI boundary *(ChatGPT m-9)*.
**C-4.** Reduced-motion static diff derivation named: before/after veiled `SkyViewModel`, parity asserted in test 15 *(ChatGPT m-10)*.
**C-5.** `signals.crisis` minimal typed shape documented (status/level/versions — the fields `actions.ts` already writes), validated at ingest *(ChatGPT E-11)*.
**C-6.** Proposer v1.5 changelog appends one sentence naming intake r2/r3 as the source of its §3 layer fix + closing-stamp correction — the FINAL spec stays self-auditing *(Claude m-4)*.
**C-7.** BUILD-CONFIRMED guard practice: per-entry §9 owners cited from now on (this punch-list complies); guard text stands strict *(Claude m-3)*.
**C-8.** Time-target harmonization: intake's "8–12 min voice" noted as inside §5.1's "~10–15" envelope *(Claude E-1; wording-level per the notes)*.
**C-9.** §9 gains the build-priority note: entry-point guard + watermark fix, then carriers, then writer door — the three that must not slip; cut-line applies beyond them *(ChatGPT E-12)*.

## BUILD-CONFIRMED (true, already mandated; per-entry §9 owners cited per the guard)

- **ChatGPT C-1** (watermark still load-before-create in code; zero-source semantics not yet real) → owner: §9 *"per-answer reflect orchestration … the entry-point serialization guard + the run-pass watermark fix, both failing-first, land here"*.
- **ChatGPT C-2** (no partial unique index in schema yet) → owner: same §9 clause.
- **ChatGPT M-4** (BECOMING_DECLARATION/banner/writer door absent from schema & writer) → owner: §9 *"becoming lane as its own engine module (`writeBecomingDeclaration` door + banner AND writer-comment amendments …)"*.
- **ChatGPT M-5** (IntakeSession/SourceEventIntakeMeta models absent) → owner: §9 *"Prompt config + flow state machine + IntakeSession/SourceEventIntakeMeta carriers"*.
- **ChatGPT M-6** (no abort mechanism in code) → owner: §9 *"between-screens beat + summaries (… abort-on-timeout posture)"*; its semantics gap is A-1, integrated.

## REJECTED (reason logged)

- **ChatGPT C-3's persisted PENDING/ERROR verdict mechanism** — model-trust/complexity trade rejected in favor of A-4's timeout: the classifier's contract is that it *always returns a terminal verdict* (fail-closed, `degraded: true` as the LAW-5 uncertainty carrier); introducing persisted non-terminal verdict states would allow observable unclassified entries and re-open the beat-before-verdict door §2.2 just closed. The concern (hangs) is real and A-4 fixes it at the source.
- **ChatGPT m-8 (provenance-discriminated link counters NOW)** — substrate-before-evidence: the matcher is LENS-only in v1 by design; v1.2's tripwire sentence already obligates the counters at matcher expansion, which is the moment evidence exists.

## STALE-ALREADY-FIXED

*None. (Both lanes reviewed v1.2 accurately.)*

---

## Escalation & proposed exit (charter: cap reached; post-escalation exit available)

Round math: r1 both-Critical → r2 one Critical (ours) → r3 **zero spec-defect Criticals** (Claude clean; ChatGPT's labels reconcile to BUILD-CONFIRMED ×2 + A-4). All five of Claude's r3 Majors are deterministic failure-path fixes to round 2's own mechanisms — no architecture moves, no law tensions.

**Proposed exit (the proposer-round-3 precedent, verbatim from the charter's post-escalation rule):** Jacob approves this punch-list → integrate v1.3 → **one targeted diff verification** (fresh-context adversarial lane on the v1.2→v1.3 diff + its new tests only) → zero Criticals on the diff → stamp **v1.3-FINAL** and proceed to build (tests first, §8's list, spark fixtures before the first build commit per §9). Any Critical on the diff → back to Jacob.
