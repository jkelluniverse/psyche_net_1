# Intake spec v1.2 → v1.3 — Targeted diff verification (charter post-escalation exit)

*Fresh-context adversarial lane · scope: the integration diff ONLY (`git diff d9cd1f2..8f4a344 -- docs/intake-spec.md docs/proposer-spec.md`) against the round-3 punch-list (`intake-spec-r3-punchlist.md`) · spec verified: intake v1.3 (+ proposer v1.5 changelog self-audit append) · code cross-refs spot-checked: `src/engine/extraction/run-pass.ts`, `src/engine/crisis/classifier.ts`, `src/engine/crisis/config.ts`, `app/(sky)/journal/actions.ts` · 2026-07-21*

## Verdict: **PASS** — zero Criticals on the diff. 3 MAJOR / 4 MINOR recorded for the build.

## Punch-list conformance (question 1: faithful implementation)

Every ACCEPTED and CHEAP item is present in the diff, and neither REJECTED item leaked in:

| Item | Landed at | Test carrier | Faithful? |
|---|---|---|---|
| A-1 abort boundary + atomic `complete` | §2.3 new para | test 10 race case | ✓ (both halves: pre-write checkpoint; flip inside writer txn; run-pass crash window named) |
| A-2 staleness reaper | §2.1 | test 9 orphaned-row case | ✓ verbatim — but the punch-list's own composition clause does not survive contact with A-1's atomicity (MAJOR-1 below) |
| A-3 ceremony one transaction | §4 | test 5 crash-shaped assertion | ✓ (four rows; classify-before-txn consistent with §2.2's order) |
| A-4 classifier timeout + budget scope | §2.2 (`crisis.modelArbitrationTimeoutMs`) + §2.3 budget-scope para | **none** | ✓ mechanism / ✗ carrier (MAJOR-2) |
| A-5 meta-stamp carrier | test 16; test 6 extended with `intake.targetObjects` consumer | test 16 | ✓ |
| A-6 idempotent submission | §2.1 + test 17 | test 17 | ✓ (carrier row left unnamed — MINOR-2) |
| C-1 verdict-in-create | test 3 | ✓ | ✓ |
| C-2 declaration meta shape | §4 (DECLARATION sentinel, EDITED_DRAFT) | test 16 | ✓ in §4/§8; §6.1 owning carrier not updated (MINOR-1) |
| C-3 fork carriers | §2.2 (`celebrationSuppressed`, resume token) | behavior in test 3 | ✓ |
| C-4 static-diff derivation | §2.4 | test 15 parity | ✓ |
| C-5 `signals.crisis` typed shape | §2.2 | test 3 | ✓ — field list `{level, method, matchedTermKeys, classifierVersion, lexiconVersion, degraded, checkedAt}` byte-matches what `actions.ts` writes |
| C-6 proposer changelog self-audit | proposer-spec v1.5 changelog append | n/a | ✓ (names intake r2/r3, §3 layer fix, closing-stamp; zero-behavior) |
| C-7 owner-citation practice | process (changelog notes it) | n/a | ✓ |
| C-8 time-target harmonization | §6.2 | n/a | ✓ |
| C-9 build-priority note | §9 | n/a | ✓ (the three named match the punch-list) |
| REJECTED: persisted PENDING/ERROR verdicts | not present; test 3's "no persisted-but-unclassified row" reinforces the terminal-verdict invariant | — | ✓ stayed out |
| REJECTED: provenance link-counters now | §2.4 tripwire sentence unchanged | — | ✓ stayed out |

Code-claim spot-checks all verified true: `run-pass.ts` really does commit the writer (`writeGateResult`, l.203) and flip status in a separate await (l.212) — the pre-existing crash window A-1 cites is real; the crisis model call really has no timeout anywhere (`classifier.ts` awaits `callModel` bare; `actions.ts` builds the Anthropic call with no timeout; `config.ts` has no timeout key), and "expiry = model failure" drops cleanly into the classifier's actual branch structure (`modelFailed = true` → soft→CRISIS / none→NONE+degraded); `RunPassResult.sourcesExtracted`/`sourcesDeferred` and `ReflectSummary.linksCreated` exist as the spec cites them.

---

## CRITICAL

*None.*

## MAJOR

**MAJOR-1 — The reaper's "complete-shaped truth" branch contradicts the abort boundary it claims to compose with, and "dead by definition" is false for exactly the runs A-1 protects.**
*Observation:* §2.3 (v1.3) makes the `complete` flip atomic with the writer's transaction: mutations committed ⟺ `status = complete` committed. Therefore a `running` row with real committed mutations is **unrepresentable** — and §2.1's new clause "a stale run that had passed the write checkpoint reaps to `complete`-shaped truth (its mutations are real…)" describes a state the reaper can never legally observe. Conversely, §2.1 declares any `running` row older than `reflectTimeoutMs + runReapGraceMs` "dead by definition," while §2.3 explicitly lets a pass that crossed the write checkpoint run to completion with **no upper bound** — so age does not imply death, and nothing stated stops the next caller from reaping a live-but-late writer/matcher to `error`, creating its own run against a watermark that excludes the in-flight pass's sources, and re-opening concurrent double-extraction — the forged-recurrence stake itself. The branch's "narrated as catch-up" also has no carrier: a reaped-complete run's watermark advances, so the next pass's `sourcesExtracted` is 1 and merged-pass copy can never fire for it.
*Why:* two new v1.3 rules are mutually inconsistent as integrated; any implementation that makes the complete-shaped branch reachable must reintroduce exactly the non-atomic checkpoint state A-1 abolished. (The clause is the punch-list's own wording — this is an integration-level composition defect, not a re-litigation of the ruling; the ruling's intent — no lockout, no forged recurrence — is fully preserved by the fix.)
*Action:* one edit to §2.1: under the abort boundary's atomicity, the reaper **always reaps an observed stale `running` row to `error`** (zero committed mutations is guaranteed by construction — delete the complete-shaped branch); the reap is a conditional update (`WHERE status='running'`) that loses to the in-flight flip; `intake.runReapGraceMs` is explicitly required to bound the post-checkpoint (writer+matcher) stage so a live late pass is never reaped. Test 9's orphaned-row case then pins reap-to-`error` explicitly.

**MAJOR-2 — A-4's classifier timeout has no test carrier — the charter tripwire's exact class, in the same diff that added test 16 for that exact class.**
*Observation:* `crisis.modelArbitrationTimeoutMs` and "expiry = model failure → fail-closed rules" appear in §2.2, but no test in §8 (1–17), and nothing else in the diff, asserts it: hung model call → classification terminates at the timeout → soft-signal→CRISIS / no-signal→NONE+`degraded:true` verdict persisted in the create.
*Why:* a lost, ignored, or unwired timeout config fails silently forever with every test green — the precise failure mode A-5 was accepted to prevent. "The fix lives in the classifier" may mean the test belongs to the classifier's own suite, but the spec names no carrier anywhere.
*Action:* extend test 3 with the hung-arbiter case (or add one sentence naming the classifier-suite test that owns it — either satisfies the tripwire; unnamed satisfies nothing).

**MAJOR-3 — "One atomic truth, no window where the sky and the ledger disagree" overclaims: the matcher transaction sits outside the atomicity, after `complete`.**
*Observation:* in `run-pass.ts` the matcher runs in its **own** transaction after the writer (and, under v1.3, after `complete` has committed). A crash between the writer-transaction and the matcher leaves a `complete` run whose newly validated material was never matched against standing hypotheses — and since the matcher's trigger is per-pass (`PASS:{runId}`) and the watermark advanced, nothing stated ever re-runs it: hypothesis charging for that answer is silently and permanently lost (the "chart shown right/wrong" evidence — the differentiated claim). This window pre-exists in code, but the new v1.3 sentence now certifies an atomicity the specified mechanism doesn't deliver, which is how the seam gets masked from future review. Related build detail the spec is silent on: the run-row's `promptVersion`/`contractVersion`/`attempts` currently ride the status update — moving the flip in-transaction must carry them.
*Why:* a new sentence asserting an invariant broader than its mechanism is a seam of the same species round 3 existed to close.
*Action:* scope the claim honestly in §2.3 — atomicity covers the writer's mutations + status; state the matcher's posture explicitly (inside the same transaction, or outside with a stated recovery/acceptance: e.g., matcher-not-run is recoverable because trigger 2 (journal cadence) re-covers standing hypotheses — whichever is true, say it).

## MINOR

**MINOR-1 — §6.1's owning carrier definition was not updated for C-2's shape.** `SourceEventIntakeMeta.inputMode` still reads `(VOICE_REVIEWED | TYPED)` — no `EDITED_DRAFT` — and `sparkIndex`'s sentinel representation (nullable? enum? reserved value?) is undefined at the one place the migration will read. §4/test 16 now contradict §6.1. The migration §6.1 names would fossilize the very guess C-2 exists to prevent; self-catching once test 16 is written, hence MINOR. *Action:* one-line §6.1 edit adding `EDITED_DRAFT` and the sentinel's column-level representation.

**MINOR-2 — A-6's uniqueness carrier is unnamed, and the punch-list's named one doesn't fit the schema.** The punch-list said "(sessionId, sparkIndex) on the spark-state/meta row," but `SourceEventIntakeMeta` has no session column (PK is `sourceEventId`); the natural home is §6.1's per-spark `IntakeSession` row (unique `(sessionId, sparkIndex)` + `sourceEventId` set-once). Also worth one clause: the §6.2 re-run flow must reuse the session's spark rows (the ANSWERED mark) so a later answer to a SKIPPED spark inserts rather than collides — as written it composes, but only implicitly. *Action:* name the row in §2.1 or §6.1.

**MINOR-3 — Test 10's inherited absolute "no sky change ever lands un-narrated" is no longer strictly true under v1.3's own chosen trade.** A pass that crosses the write checkpoint, completes atomically, and then loses its orchestrator (crash after commit, before the late beat) yields a real, narrated-by-no-beat delta that no later merged pass can cover (watermark advanced). A-1 knowingly chose attribution-integrity-over-narration-completeness; the v1.2 clause should be softened to "never mis-attributed; a late delta surfaces honestly (late beat or the reveal), never as answer N+1's" so the test doesn't assert an invariant the spec traded away.

**MINOR-4 — §2.2's fail-closed parenthetical attaches `degraded: true` only to the no-signal branch.** The classifier records `degraded: true` on the soft-signal→CRISIS timeout branch too (`classifier.ts` l.92); the spec's wording under-describes the code it defers to. Cosmetic alignment.

---

## Stamp recommendation

**Stamp v1.3-FINAL.** Zero Criticals: every punch-list item is faithfully integrated, both rejections held, and all contested code claims verified true. The three Majors are each a one-to-three-sentence spec edit (MAJOR-1's reap-to-`error` simplification, MAJOR-2's test-carrier sentence, MAJOR-3's atomicity-scope honesty) — recommend they ride the stamp commit or the first build commit as recorded items; none re-opens a ruling.
