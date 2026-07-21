Reviewed spec version: Seven Sparks Intake — Module Specification v1.2 (Psyche-Net · the first ten minutes · v1.2 · for REVIEW-01 iteration)

Verdict: Request Revisions

CRITICAL

1) runExtractionPass still load-before-create; zero-source run semantics contradicted
- Observation: Spec §2.1 requires “create run first, then load sources against its startedAt” to close the watermark window and to permit zero-source runs to complete and advance the watermark. In code (src/engine/extraction/run-pass.ts), loadUnextractedSources() is called before creating the ExtractionRun row. If no sources, the function returns { ok: false, reason: "NO_NEW_SOURCES" } without creating a run. This is the v1.1 bug the spec says it fixed.
- Why it matters: This reintroduces the race that strands events ingested in the load→create window (silent loss of extractability). It also breaks the “zero-source run completes and advances honestly” invariant the UI copy and tests depend on.
- Action:
  - Change runExtractionPass to create the ExtractionRun row first (status='running'), then load sources with where: ingestedAt > run.startedAt.
  - If zero sources, mark the run complete and return ok: true with sourcesExtracted=0 (advance watermark by design).
  - Add/repair the regression test called out in test 9 (watermark window + zero-source-run).

2) No serialization guard at the shared entry point; cross-surface forged recurrence still possible
- Observation: §2.1 mandates “one in-flight pass per user, enforced at the shared entry point” via a partial unique index on ExtractionRun(userId) WHERE status='running' (or advisory lock). run-pass.ts has no such guard, and prisma/schema.prisma has no partial unique or advisory-lock mechanism.
- Why it matters: Concurrent intake and journal-triggered passes can still double-extract the same utterance and inflate timesSeen, violating “one utterance counts once.” The keystone test (test 9) as specced cannot pass reliably.
- Action:
  - Add a raw SQL migration for the partial unique index on extraction_run (user_id) where status='running', and code-path to fail fast on conflict; alternatively, take a per-user PG advisory lock in runExtractionPass.
  - Add a unit/integration test that exercises the cross-surface race (journal reflect firing during an intake pass).

3) Classify-then-persist on intake entries risks data loss or drop-on-failure; no structural “pending” carrier
- Observation: §2.2 and §4 require classification to run synchronously before persisting the SourceEvent with signals.crisis embedded. The spec says “classifier failure posture is the classifier’s own,” but does not define what is persisted when the classifier errors or times out. The claim “the entry still saves” (for CRISIS) doesn’t address other failure modes, and there is no allowed “pending” verdict carrier.
- Why it matters: Treating classification as a precondition to persistence creates a crash/timeout window where the person’s words can be lost (LAW 1: evidence mandate) or the UI stalls indefinitely. The “event is immutable so the verdict has no legal carrier post-create” constraint is solvable without risking loss by allowing an explicit pending/failed status as first-class uncertainty (LAW 5).
- Action:
  - Adjust the ingest contract to persist the SourceEvent atomically with crisis verdict metadata that permits status: 'OK' | 'CRISIS' | 'PENDING' | 'ERROR' (or a separate CrisisVerdict row linked to the event). The beat must not render before a terminal verdict; PENDING/ERROR is an allowed, explicit value.
  - Update tests (3, 13) to include classifier timeout/error cases: words persist; beat waits; resume is correct; resource surface never blocked.

MAJOR

4) Becoming lane seams: schema and writer not amended; carrier missing; allowlist pin test not enforceable
- Observation:
  - Spec §4 introduces SourceKind.BECOMING_DECLARATION and a writer door writeBecomingDeclaration, and says the writer’s banner/comments are amended to name the fourth upstream computer. In prisma/schema.prisma: SourceKind has no BECOMING_DECLARATION; comments still enumerate “exactly THREE sanctioned upstream computers” (no becoming); there is no Intake/Becoming migration or writer API named here.
  - Spec §4.6 requires BECOMING_DECLARATION to be extraction-ineligible; run-pass’s allowlist excludes it, but the kind doesn’t exist, so test 14 can’t assert the intended exclusion.
- Why it matters: This is a direct contract break between spec and code. Without the kind and door, implementers will either (a) misuse existing kinds (making extraction eligibility unpredictable), or (b) bypass the writer (violating LAW 2/graph-authority discipline).
- Action:
  - Add SourceKind.BECOMING_DECLARATION to schema with owning migration; wire writer entry point writeBecomingDeclaration; amend the writer banner/header comments to list the fourth sanctioned upstream computer in the same commit.
  - Update run-pass kind allowlist and add the regression test pinning extraction ineligibility for BECOMING_DECLARATION.

5) Intake carriers absent from schema; resume/telemetry impossible as written
- Observation: §6.1 defines IntakeSession and SourceEventIntakeMeta (sparkIndex, intakePromptsVersion, inputMode, becomingSeedTemplateVersion?), but there are no corresponding Prisma models. Resume logic (§6.2), skip marks (§2 Skippable), and per-prompt aggregate telemetry cannot function.
- Why it matters: Core user flows (resume, skip-with-no-data, re-run) and LAW-6-safe telemetry rely on these carriers. Their absence will surface as brittle UI state and/or privacy-unsafe ad hoc logging.
- Action:
  - Add IntakeSession and SourceEventIntakeMeta models (owning migrations), wire them into the intake state machine and submit action. Add tests 2, 6, 8 exercising these carriers.

6) No abort-on-timeout mechanism implemented; watermark integrity posture not realizable
- Observation: §2.3 mandates “abort-on-timeout” with the run marked error so the watermark holds. run-pass.ts has no timeout/abort support, and no cancellation path for proposer/model calls.
- Why it matters: Without cooperative cancellation and a server-side abort, timed-out runs may complete later and advance the watermark silently, violating attribution integrity (the very harm §2.3 was written to prevent).
- Action:
  - Add a timeout wrapper in the orchestration surface that can cancel the proposer call (AbortSignal) and short-circuit the pass; update run-pass to mark the run status=error without writes and guarantee the watermark does not advance. Extend test 10 to assert this path end-to-end.

7) Intake submission idempotency not defined; double-submit can mint duplicate events
- Observation: UI disables submit while waiting, but there’s no structural idempotency token keyed to (IntakeSession.id, sparkIndex). A rapid double-tap or network retry can create two SourceEvents for one spark.
- Why it matters: “One utterance counts once” is broken at source creation as well as extraction; duplicate events for the same spark will legitimately increase timesSeen even with a perfect pass guard.
- Action:
  - Introduce a server-enforced idempotency key per spark submission: a unique constraint on SourceEventIntakeMeta (sessionId, sparkIndex) with sourceEventId present only once; reject or coalesce duplicates; add an intake-side test for duplicate submits.

MINOR

8) “linksCreated” copy implication will break when matcher grows beyond LENS
- Observation: §2.4 uses ReflectSummary.linksCreated > 0 to infer “brightened a star your chart placed,” with a v1.2 note that this holds only while matcher is LENS-only.
- Why it matters: When matcher expands (e.g., becoming/practitioner overlays), this copy becomes dishonest without provenance-discriminated counts.
- Action:
  - Add provenance-discriminated link counters to ReflectSummary (e.g., linksFromLens, linksFrom…); gate usage of the chart-specific copy behind linksFromLens > 0.

9) Crisis-resource surface unspecified at the seam intake owns
- Observation: §2.2/§4 state “resource surface engages calmly,” but the orchestrated action for resume and suppression of celebration is not named at the server/UI boundary.
- Why it matters: For the lived user, this is the fork in the flow that must be flawless. Ambiguity here causes flaky tests and inconsistent behavior.
- Action:
  - Name the resource-surface orchestration function(s), the resume token, and the suppression flag that drives beat copy. Add a deterministic acceptance test around this state machine.

10) Reduced-motion acceptance depends on list-view parity with beat delta
- Observation: §2.4 and test 15 require reduced-motion (static diff or list-view delta). Intake does not explicitly state how it obtains the static diff.
- Why it matters: Accessibility regressions are pernicious. Being explicit reduces flakiness.
- Action:
  - Specify the static delta derivation (from the veiled SkyViewModel before/after) and assert parity in the test.

ENHANCEMENT

11) Tighten crisis signals schema
- Observation: signals.crisis is an untyped Json bag. Honest, but brittle.
- Action:
  - Document a minimal typed shape (status, level, version) and validate at ingest.

12) Delivery realism risk: too many unlanded migrations for the cap round
- Observation: This round introduces multiple schema deltas (new SourceKind, 2 new tables, partial-unique on ExtractionRun), a new writer door, and new orchestration semantics — all with tests — under a tight schedule.
- Action:
  - Prioritize landing: (a) entry-point serialization guard and watermark fix; (b) IntakeSession + SourceEventIntakeMeta; (c) writer door + SourceKind. Defer voice until after (as spec already intends). Use the cut-line aggressively if any of these three slip.

What’s genuinely strong

- The intake spec rides the existing pipeline cleanly: no new trust machinery beyond the becoming lane; the between-screens beat composes from the veiled projection and deterministic summaries; merged-pass honesty keyed to sourcesExtracted > 1 is the right carrier.
- Safety and attribution integrity posture are clear and principled: crisis verdict blocks beats; CRISIS suppresses celebration; abort-on-timeout to protect watermark truth; “one utterance counts once” stated as a stream property, not a UI courtesy.
- The becoming lane constraints are well-argued: authored intentions as mass-0; declaration evidence role=DECLARATION; ignition only via ENACTMENT; extraction-ineligible carrier to prevent double counting.
- The orchestration surface is named and test-scoped; the copy rules avoid overclaiming and respect first-class uncertainty.

Close the entry-point/run-lock seams and land the intake carriers in schema, and this module will hold under the product’s laws in real, messy intake sessions.