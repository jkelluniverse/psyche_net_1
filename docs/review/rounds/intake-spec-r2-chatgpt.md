Exact version reviewed:
Psyche-Net · the first ten minutes · v1.1 · governs `/src/app/(intake)/`, `/src/engine/intake/`, and (v1.1) the shared becoming lane in `/src/engine/becoming/` · for REVIEW-01 iteration

Verdict: Request Revisions

CRITICAL

1) Run-pass watermark/ordering is not fixed as spec’d (forged-recurrence window remains)
- Observation: intake §2.1 requires “create run row first and load sources against its own startedAt.” In src/engine/extraction/run-pass.ts the code still loads sources (loadUnextractedSources) before creating the run row; it anchors only to the last completed run’s startedAt. Any SourceEvent ingested between the load and the new run’s startedAt is stranded forever. This directly contradicts §2.1 and makes test 9 (forged-recurrence keystone) unwritable.
- Why it matters: Violates “one utterance counts once” and can silently lose evidence (LAW 1 via omission). Live intake cadence will race; this will appear as spurious “recurrence” or missing deltas in the beat.
- Action:
  - Change run-pass to: (a) read lastComplete.startedAt; (b) create a new run row immediately with startedAt = now; (c) load sources where ingestedAt > lastComplete.startedAt AND ingestedAt <= thisRun.startedAt; (d) proceed. Write an integration test that proves no event ingested in the window is stranded and no source is double-processed.
  - Keep the “deferred” accounting identical.
  - Ship the keystone test (spec §8 test 9) against this corrected semantics.

2) Becoming lane seam: schema and writer banner contradict the spec; carrier kind missing
- Observation: Intake §4 adds a fourth sanctioned writer (“becoming lane”) and a new SourceKind.BECOMING_DECLARATION. In prisma/schema.prisma, the writer banner still states “exactly THREE sanctioned upstream computers,” and SourceKind has no BECOMING_DECLARATION. No engine module `/src/engine/becoming/` or writer surface exists to create a BECOMING node + DECLARATION evidence outside the gate.
- Why it matters: This is a hard trust-boundary seam (LAW 1/2/3). Without the amendment and a sanctioned writer surface, any becoming write is either impossible, or must tunnel through ad hoc code that the banner calls a bug. Tests 5 (becoming consent, role=DECLARATION, mass=0) are unwriteable.
- Action:
  - Amend schema banner to “exactly FOUR sanctioned upstream computers” and list the becoming lane.
  - Add SourceKind.BECOMING_DECLARATION to the enum and explicitly EXCLUDE it from run-pass allowlist (intentional non-extractable).
  - Implement `/src/engine/becoming/` with a single sanctioned function, e.g., createBecomingDeclarationAndSeed({ userId, content, templateVersion }): writes:
    - SourceEvent { kind=BECOMING_DECLARATION, authorship=SELF, content, occurredAt=now }
    - PsycheNode { type=BECOMING, provenance=BECOMING, state=HYPOTHESIS, mass=0, confidence=hypothesis floor, label=the user-edited statement }
    - Evidence row pointing at the full span of the declaration SourceEvent with role=DECLARATION, polarity=SUPPORTING, validated=true (gate-exempt for the same stated reason as lens).
  - Add tests to assert: no node/evidence is created without explicit accept; created evidence has role=DECLARATION; node mass=0; decline leaves zero artifacts.

3) Intake session carriers are unspecified in schema; skip/resume/telemetry are impossible to implement as spec’d
- Observation: Intake §6.1 defines IntakeSession and event-side intake stamps (sparkIndex, intakePromptsVersion, inputMode) in a “dedicated intake-meta structure, not in signals.” No such model or fields exist in prisma/schema.prisma. SourceEvent has no intakeMeta or related table.
- Why it matters: Skips cannot be structurally recorded without content (LAW 6/8), resumption is brittle, early-close gating is unimplementable, and editorial traceability (“which prompt wording elicited which answer”) is lost. Tests 2 (skip is data-free) and 8 (resume integrity) are currently unwriteable.
- Action:
  - Add model IntakeSession { id, userId, status, currentPrompt, intakePromptsVersion, startedAt, finishedAt } and IntakeSparkState { sessionId, sparkIndex, state, sourceEventId? }.
  - Add SourceEventIntakeMeta { sourceEventId PK/FK, sparkIndex, intakePromptsVersion, inputMode } as the “dedicated intake-meta structure.” Do not overload signals.
  - Wire creation on submit and update IntakeSession state on each answer/skip. Implement resume logic keyed off these rows.
  - Add LAW-6-safe aggregated telemetry tables or jobs over IntakeSession × sparkIndex × intakePromptsVersion.

4) Concurrency guard is only in prose; no server-side lock
- Observation: §2.1 requires “one in-flight pass per user, enforced… backed by a server-side per-user run guard.” No guard exists in run-pass or orchestration to prevent concurrent runs; UI gating alone is not an enforcement boundary.
- Why it matters: Forged recurrence remains reachable by racing submits; tests 9/10 become flaky at best.
- Action:
  - Add a server-side per-user lock: e.g., PostgreSQL advisory lock keyed on userId or a lightweight “extraction_run_lock” row with a unique(userId) + status, acquired before calling run-pass, with timeout consistent with §2.3. Release on pass completion/failure/timeout.
  - Negative case tests: double-submit under race → exactly one run proceeds; the second receives a deterministic “busy” result and the UI copies the merged-pass honesty line on the next beat.

5) Beat must use veiled projection; current path will likely leak raw labels
- Observation: §2.4 requires all beat/reveal copy and node identities to come from the veiled SkyViewModel. run-pass only returns GateResult + matcher; there is no named intake beat builder that computes a projection for the correct viewer and uses it to compose copy. Test 11 (“veil holds in the beat”) is unwriteable as-is.
- Why it matters: In supervised intakes, WOUND labels can surface in celebration copy if built from raw gate/matcher outputs, violating LAW 7 and the renderer-lens veil invariant.
- Action:
  - Implement an intake beat builder that, after writeGateResult completes, calls skyProjection(nodes, edges, now, seed, viewer) with viewer derived from policy (INDIVIDUAL vs PRACTITIONER vs client-in-supervised). Compose beat text from ReflectSummary + the veiled SkyViewModel; never from GateResult labels. Add test 11 to assert WOUND is veiled in both beat and reveal.

MAJOR

6) Crisis verdict-before-beat is not wired for intake
- Observation: §2.2 mandates “persist → classifyCrisis synchronously → then extraction; beat never renders before the crisis verdict; CRISIS suppresses delta celebration.” The journal path does this; the intake path is unnamed and untested.
- Why it matters: Safety floor (LAW 7) at the most sensitive first ten minutes; failing to block celebration on CRISIS breaches the calm claim and the safety protocol.
- Action:
  - Add an explicit intake submit handler: save SourceEvent(kind=INTAKE_SPARK) → classifyCrisis → if CRISIS: render resources, enqueue deferred extraction; else proceed to reflect. Add test 3 to assert both “verdict-before-beat” and “no delta celebration on CRISIS.”

7) Latency/failure posture config is unimplemented
- Observation: §2.3 names intake.reflectTimeoutMs and a fold-forward behavior, but no such config or orchestration exists.
- Why it matters: Without a real timeout and copy path, the “immediacy pedagogy” collapses on unpredictable model tails; retries or spinner hangs will damage the demo.
- Action:
  - Add intake.reflectTimeoutMs (versioned) and implement: on timeout or pass error, show the honest copy, advance prompt, and let the next pass cover merged material with “catch-up” copy (using countUnextractedSources read before the run). Add UI tests for timeout and thrown-pass paths.

8) Early-close stopping rule and reveal are not implementable yet
- Observation: §5’s computable predicate and config keys are spec’d, but there is no code to compute the combined count (extracted nodes + node-kind shadow candidates + hypothesis nodes with active links) or to trigger early close/reveal screens.
- Why it matters: This is a visible flow branch (“your sky has plenty to begin with…”). Without it, sessions overrun and the money-shot reveal timing breaks.
- Action:
  - Implement a server function that computes the count per §5 (reusing renderer’s charged predicate; do not restate). Add named config keys intake.targetObjects, intake.earlyCloseBound, intake.minPromptsBeforeClose. Gate the reveal/early-close offer from this function and log acceptance/refusal on IntakeSession.

9) Deterministic seed draft template/version is unspecified in code
- Observation: §4 requires a deterministic, versioned becomingSeedTemplateVersion. No config path or function is named/implemented.
- Why it matters: Byte-equality of the accepted seed statement and auditability depend on a reproducible draft; without it, test 5 (“byte-for-byte”) is unwriteable.
- Action:
  - Add a pure function makeSeedDraft(answerText, version) with a stored template version; stamp version on the created SourceEventIntakeMeta or Becoming lane logs; assert byte-equality in tests.

10) Merged-pass honesty depends on pre-read count; current helper will drift after the run-pass fix
- Observation: §2.1 calls for reading countUnextractedSources before the pass to branch beat copy. The helper currently keys off last completed run; after the load-before-create fix, ensure the UI reads the count before creating the run.
- Why it matters: Honest copy: “catching up on your last two answers…” must not attribute deltas to the wrong answer.
- Action:
  - Expose a pre-run “next pass size” endpoint that returns the eligible count computed with the corrected watermark logic, and have the UI snapshot it before submit to branch copy deterministically.

MINOR

11) Intake event stamps location is unclear to implementers
- Observation: §6.1 says “dedicated intake-meta structure, not signals,” but doesn’t name the table/fields concretely.
- Why it matters: Builders will default to SourceEvent.signals without a concrete carrier.
- Action:
  - Name it explicitly: SourceEventIntakeMeta { sourceEventId PK, sparkIndex, intakePromptsVersion, inputMode }. Update §6.1 to use this exact name.

12) Reduced-motion and list-view fallback called out, but no acceptance criteria
- Observation: §2.4 references renderer accessibility, but intake’s own beat/reveal AC isn’t pinned.
- Why it matters: Easy to regress on the demo path.
- Action:
  - Add a simple test: when prefers-reduced-motion, beat renders text + static diff; reveal drops settle animation; list-view delta available and matches the view model.

13) Explicit exclusion of BECOMING_DECLARATION from extraction should be stated
- Observation: run-pass allowlist excludes it today by omission.
- Why it matters: Future edits could accidentally include it.
- Action:
  - Assert in tests that BECOMING_DECLARATION is not in the extraction allowlist and never reaches the proposer/gate.

ENHANCEMENTS

14) Server API contract for submitting a spark and reflecting
- Observation: The flow presumes orchestration glue that does: save → crisis → reflect (or defer) → compose beat from veiled projection.
- Action:
  - Define an explicit endpoint, e.g., POST /intake/sparks/:index/answer with well-typed request/response (session state, crisis, reflect summary, beat lines, veiled-delta preview). This makes the keystone tests target a real surface.

15) Hard per-user lock implementation detail
- Observation: Advisory lock vs table-guard tradeoffs not named.
- Action:
  - Prefer pg_advisory_lock(key(userId)) with timeout == reflectTimeoutMs + small margin; release on finally; log contention. Add a health metric.

16) LAW-6-safe telemetry shape
- Observation: Aggregate-only telemetry is named but not concretely specified.
- Action:
  - Add an explicit daily job or incremental counters keyed by (intakePromptsVersion, sparkIndex) recording: pass yield, skip rate, early-close rate, average per-session passes. Never store per-user variants.

Delivery realism flags

- The becoming lane + schema/banner changes + evidence write path is a non-trivial new engine module. If schedule pressure bites, defer the spark-7 ceremony per the cut-line, or ship the ceremony UI with a no-op backend and use the seeded longitudinal account to demo ignition instead. Do not “sneak-write” becoming artifacts around the writer.
- The run-pass watermark fix and per-user lock are must-do now. Without them, the seven-pass live cadence will produce flakiness you can’t rehearse away.
- The IntakeSession schema and intake-meta carriers are foundational for skip/resume; attempting to fake them in UI state will blow up live.

What’s genuinely strong

- The concurrency/ordering contract is named correctly (and finds real bugs) — serialization + watermark anchored to this-run is the right fix.
- Copy provenance, zero-change honesty, and the veiled-projection rule are disciplined and aligned with CLAUDE.md (LAW 5/7). The beat template branching (“held” vs “saved”) is claims-disciplined.
- Voice two-stage submission with explicit “we never store audio” and third-party STT honesty is a real trust asset, not marketing.
- The “immediacy exception” is argued, capped, and paired with a timeout/fold-forward posture — correct carve-out of the batching rule for this pedagogy.
- Tests are well-chosen and spec-pin real seams (forged recurrence; veil in the beat; transcript byte-equality). With the fixes above, they will harden the loop instead of papering cracks.