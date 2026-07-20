Reviewed spec version: Seven Sparks Intake — Module Specification v1.0 (Psyche‑Net · the first ten minutes · governs `/src/app/(intake)/`, `/src/engine/intake/` · for REVIEW‑01 iteration)

Verdict: Request Revisions

CRITICAL

1) Contract seam: engine is passing un‑spec’d fields into the proposer (heldShadowLabels; priorNodes.provenance), leaking shadow labels into context
- Observation: In src/engine/extraction/run-pass.ts, ProposerInput includes heldShadowLabels (from loadShadowBuffer) and priorNodes include provenance. The proposer spec v1.4‑FINAL defines ProposerInput without heldShadowLabels and PriorNodeView without provenance, and explicitly limits context to SELF sources + prior EXTRACTED nodes. Shadow buffer labels are not part of the allowed context.
- Why it matters: This is a hard seam break against a FINAL module spec. It risks silent self‑reinforcement (feeding back un‑materialized labels), violates the contract, and can break type validation/shape schema. It also contradicts this intake spec’s promise of “no new trust machinery” by changing what the model can see.
- Action:
  - Remove heldShadowLabels from ProposerInput immediately or elevate it into the proposer spec with explicit safeguards and tests. If you retain it, formally revise proposer spec v1.5 to:
    - Add heldShadowLabels: string[] as a first‑class input with a justification (SELF‑authored, EXTRACTED‑lane only), a blinding assertion, and tests proving no LENS/BECOMING leakage.
    - Add PriorNodeView.provenance if needed, or stop sending it to preserve the spec’d shape.
  - Add a CI test asserting the serialized proposer context contains exactly the allowlisted fields from the spec (byte‑identity keystone already exists; extend it to fail on extra fields).
  - If shadow labels are disallowed, delete the pass‑through now (and update any prompt copy that assumed label reuse).

2) Intake “tag” vs engine filter is unspecified; engine expects a specific kind
- Observation: Intake spec says “one SourceEvent (authorship SELF, intake‑tagged)”. Engine pass filters kind ∈ ["JOURNAL_TEXT", "JOURNAL_VOICE", "INTAKE_SPARK"].
- Why it matters: If “intake‑tag” is not concretely defined as kind=INTAKE_SPARK, intake answers won’t be picked up by the live pass, breaking immediate reflect and tests.
- Action: Specify the exact carrier:
  - Set SourceEvent.kind = "INTAKE_SPARK" for intake submissions (plus optional metadata; see MAJOR #3).
  - Add a test: submitting an intake answer creates a SourceEvent with kind=INTAKE_SPARK and is consumed by runExtractionPass.

3) Per‑answer “immediate reflect” conflicts with current batch semantics; no per‑source delta exists
- Observation: runExtractionPass processes “all unextracted sources since last complete run” and returns aggregate counts. Intake needs to render consequence of the single answer just submitted and craft one‑line copy that accurately describes that one answer’s delta.
- Why it matters: You cannot honestly claim “each answer renders its consequence” if the engine processes multiple backlogged entries together or you lack attribution to the just‑submitted source. Copy like “one is forming… one brightened a star your chart placed” can be wrong/flaky.
- Action:
  - Add a targeted run API: runExtractionPassForSources({ sourceIds: string[] }) that:
    - Restricts proposer/gate to the stated sources only (caps still apply).
    - Returns a per‑source attribution in GateResult (acceptedNodesBySourceId, shadowBySourceId, rejectionsBySourceId) and per‑source matcher links.
  - Alternately (cheaper): ensure the intake UI always flushes the queue by calling runExtractionPass after every answer and blocks next question until pass completes, and persist a “last reflected at runId” pointer. Still add per‑run deltas you can narrate honestly (avoid per‑source phrasing if you can’t guarantee isolation).
  - Add tests: two answers queued quickly → reflect after answer 1 narrates only answer 1’s effects; answer 2 narrates only answer 2’s.

4) Crisis pause is not structurally wired into intake
- Observation: Intake spec requires “crisis floor runs on every answer unconditionally … pauses the intake.” Provided engine files don’t show classifier invocation on ingest; proposer spec says classifier runs upstream of extraction, but intake module has no named interface to that floor, nor tests for pausing/reentry.
- Why it matters: LAW 7; safety is non‑negotiable. A missing structural hook makes Crisis pause test (#3) non‑implementable or flaky at demo time.
- Action:
  - Define the ingest contract for intake submit: create SourceEvent → run crisis classifier synchronously → if high severity, route to resources and DO NOT enqueue/run extraction; persist a resumable intake state.
  - Add a product‑layer integration test: a crisis‑level answer pauses the intake, saves the entry, and resume returns to the next prompt later.

MAJOR

1) Becoming seed lane is underspecified; no writer path, no evidence carrier, no tests
- Observation: Intake promises spark 7 can author a BECOMING node “via its own lane (DECLARATION evidence, mass 0)”. There’s no contract here defining the writer endpoint, evidence attachment, or how the seed statement is persisted/used by the gate’s becoming matcher.
- Why it matters: Without a concrete writer + schema carrier, seed placement risks being a UI illusion or ends up misusing the extraction path. Matching/ignition later depends on exact label and ENACTMENT spans; the seed text must be stably persisted and the proposer must remain blinded to it.
- Action:
  - Define a BecomingWriter.createSeed({ userId, label, seedStatement, authoredAt, promptsVersion, promptId }): creates PsycheNode{type=BECOMING, provenance=BECOMING, mass=0, state=HYPOTHESIS}, and persists a DECLARATION Evidence row (authorship SELF) linked to that node (non‑conferring by gate semantics).
  - Ensure proposer blinding: BECOMING nodes and their text are excluded from proposer context (already enforced by EXTRACTED‑only filter).
  - Add tests: no seed without explicit accept; seed persists exactly the edited text; later ENACTMENT spans on matching label drive IGNITED via gate’s becoming merger; decline leaves no BECOMING artifacts.

2) “Transcript ownership” needs structural guards at ingest
- Observation: The spec states the reviewed transcript must equal the SourceEvent content; audio is never stored. There’s no enforceable interface specified to prevent raw STT from being saved or extracted pre‑review.
- Why it matters: LAW 1, privacy, and product trust. A race or code path that saves raw STT breaks the “their exact words” principle and risks unsafe extractions.
- Action:
  - Implement a two‑stage submission: STT buffer (client‑side only) → editable draft → explicit Submit writes SourceEvent.content. Block network extraction until Submit.
  - Add a unit/integration test: verified SourceEvent.content byte‑equals the reviewed text; raw STT is never persisted server‑side; proposer never sees raw STT.

3) Prompt system versioning lacks carriers; cannot audit/replay
- Observation: Intake mentions intakePromptsVersion but there’s no persistence of which prompt was answered, which version, or the prompt text at time of answer.
- Why it matters: Replay/auditability (CLAUDE.md versioning discipline) and honest copy; you must be able to answer “which question elicited this answer?” and not have that change under editorial edits.
- Action:
  - Extend SourceEvent.meta to include { promptId: string, intakePromptsVersion: string, promptTextSnapshot: string }. Persist on submit.
  - Add tests: changing prompt copy does not alter historical events; the meta is carried through the evidence panel.

4) Stopping rule is UI copy today; needs a computable carrier
- Observation: Stopping rule says “~7±2 evidence‑bearing objects” including materialized nodes, forming embers, charged ghosts; never before prompt 4. No method exists to compute these totals during intake.
- Why it matters: Without a deterministic count, the early‑close offer becomes hand‑wavy or wrong.
- Action:
  - Add an engine query: getEvidenceBearingCounts(userId, sinceIntakeStartAt?) → { materialized, forming (unique candidates), chargedGhosts }. Consider scoping to “this intake session” by startedAt timestamp.
  - Enforce “never before prompt 4” in the intake state machine.
  - Add tests: counts hit threshold → early‑close offer; never triggers before prompt 4; chartless and charted cases both covered.

5) Resume state is unowned; no schema or tests
- Observation: Spec requires resumable intake (current prompt, completed set) and re‑runnable to answer skipped sparks. No storage contract or tests.
- Why it matters: Demo‑day UX; without durable state, real users dropping off will restart at the wrong place or duplicate answers.
- Action:
  - Create IntakeSession { id, userId, startedAt, currentPromptIndex, completedPromptIds[], skippedPromptIds[], finishedAt? } persisted; idempotent reads/writes.
  - Tests: kill app at each prompt boundary; resume lands correctly with prior answers intact; skipped prompts remain answerable later and append events (no re‑ask of answered).

6) Copy branch logic can mislead in chartless paths
- Observation: Between‑screens line “one brightened a star your chart placed” is only true if linksCreated>0 and a chart exists. Chartless flow is first‑class but copy assumes lens presence.
- Why it matters: Claims discipline and honest UX.
- Action: Branch copy by presence of lens nodes and actual matcher outcomes:
  - If linksCreated>0 → “…brightened a star your chart placed.”
  - Else if materialized>0 → “…lit a new star.”
  - Else if forming>0 → “…one is forming at the edge.”
  - Else if rejected>0 → “…I couldn’t verify a quote from that yet.”
  - Add tests for each branch in charted/chartless states.

MINOR

1) “No wound‑origin questions” has no structural guard
- Observation: It’s editorially enforced, but nothing prevents a future prompt edit from violating the rule.
- Why it matters: LAW 7 discipline should be structurally backed where possible.
- Action: Add a lint/checklist in the prompt config publishing pipeline: “no wound‑origin phrasing” checklist and a human review gate. Keep as process, not code; document it.

2) Early‑close UX timing and batching latency
- Observation: Immediate reflect implies waiting for the pass to complete before advancing. If passes queue or stall, users can double‑tap into the next prompt before reflect finishes.
- Why it matters: Calm pacing is a core teaching mechanic.
- Action: Lock next‑prompt navigation behind reflect completion (with a visible spinner + honest “processing” copy), and add a timeout/retry path that offers to continue without reflect if the run fails, logging it for retry (respecting LAW 7 route‑independence).

3) Cosmos.gl readiness race at the “between‑screens beat”
- Observation: The 2–3s delta animation assumes the renderer is warm.
- Why it matters: A cold init on mobile will hitch, undermining the “calm” bar.
- Action: Pre‑warm the renderer at intake start; show a pre‑ready skeleton; ensure list view parity is always available as fallback.

4) “Skip is data‑free” telemetry clarity
- Observation: Spec allows “no telemetry beyond the skip itself.” Define where that lives and how it respects LAW 8.
- Why it matters: Avoid back‑channel content in analytics.
- Action: Persist a minimal IntakeSession.skip at timestamp only; no text/content fields; exclude from any cross‑user abstraction layer.

ENHANCEMENT

1) Cost/calm math for seven immediate passes
- Observation: Orchestrator notes allow exception; demo reality still needs token/cost constraints.
- Action: Add a budget log and cap per intake session (7 passes max); surface a “we’ll finish the last two in the background” fallback if a provider throttles; add a simple cost estimator to the run record.

2) Safety UX polish for live room
- Observation: The master concept mandates a demo‑day safety protocol; integrate its hooks in intake: a calm pause screen with prominent human support affordance and discreet exit.
- Action: Add a CrisisPause component and test it with a simulated high‑severity classification.

3) Deletion path assertion for intake artifacts
- Observation: Deletion governance is covered elsewhere; intake needs to be named as a source.
- Action: Ensure user‑initiated deletion cascades erase intake SourceEvents (and any DECLARATION evidence on BECOMING seeds) per LAW 8; add a test in the retraction API suite that an intake‑authored evidence row erasure recomputes and un‑tells.

What’s genuinely strong

- The pedagogical spine is crisp and aligned with META‑01: “each answer renders its consequence” teaches the core loop; skip is unpenalized; zero‑change honesty is explicitly called out.
- The reuse mandate is correct: intake emits standard SourceEvents and rides the real proposer→gate→writer→matcher→sky path; no new trust machinery is proposed.
- Seed ceremony consent is thoughtful: explicit, editable, and mass‑0 by design — aligned with LAW 3 and guarded against accidental charging.
- Delivery realism is already acknowledged with a clear cut‑line; building text‑only first de‑risks the demo.

Address the contract seam (shadow labels), define the becoming writer, wire the crisis floor structurally, and provide a per‑answer reflect you can narrate honestly. Once those land with tests, this module will sit cleanly on the existing engine and be demo‑safe.