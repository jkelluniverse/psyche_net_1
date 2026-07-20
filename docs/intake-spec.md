# Seven Sparks Intake — Module Specification

*Psyche-Net · the first ten minutes · v1.0 · governs `/src/app/(intake)/`, `/src/engine/intake/` · for REVIEW-01 iteration*

> INTAKE-01 realized: the Tier-1 guided intake that turns a stranger into a person with a sky, in ~10 minutes, on their own phone. This is the September demo itself. Governing rule (master concept §5.1): **each answer renders its consequence before the next question is asked** — intake is the tutorial for the core loop, not a form. Everything here orchestrates the EXISTING pipeline (SourceEvent → crisis floor → proposer → gate → writer → matcher → sky); the module adds sequencing, prompts, voice, and pacing — no new trust machinery. Cross-refs: master concept §5.1/§7, proposer spec v1.4-FINAL, renderer-lens v1.3-FINAL, CLAUDE.md.

## 1. The flow

Entry: post-signup, after Tier 0 (birth data → ghost sky) or skipping it (no chart → intake begins on an empty-but-fringed sky; both paths first-class). Seven prompts, one screen each, in order:

1. **A shaping moment** — "Tell me about a moment that shaped how you move through the world."
2. **A repeated pattern** — "What's something you notice yourself doing again and again?"
3. **What you'd protect** — "If everything else were negotiable, what would you protect?"
4. **What people misunderstand** — "What do people most often get wrong about you?"
5. **Key relationships** — "Who matters most, and what are you like with them?"
6. **What you're proud of** — "What have you done or become that you're quietly proud of?"
7. **Who you're becoming** — "Who are you in the middle of becoming?"

(Prompt copy is versioned config — `intakePromptsVersion` — and oral-history-crafted per CORE-07: open, concrete, second-person warm. Exact wording is editorial; Jacob's ear passes it like the lens labels.)

**No wound-origin questions, ever** (§5.1 rule). The sparks open real material by invitation, not excavation.

## 2. Per-answer mechanics (the consequence loop)

Each answer → one `SourceEvent` (authorship SELF, intake-tagged) → **immediate reflect** (intake is the sanctioned exception to batched extraction — the §4.3 batching rule exists for cost/calm; intake's whole pedagogy is immediacy; cap: 7 passes/session, the prompts ARE the cap) → the between-screens beat: a one-line plain-language result ("I heard two things — one is forming at the edge, one brightened a star your chart placed") + a 2–3s sky glimpse animating the delta, then the next prompt. Zero-change answers get honest copy ("held onto that — it'll take shape as themes recur"). The crisis floor runs on every answer unconditionally (existing invariant; intake changes nothing about it) — and a crisis-level hit **pauses the intake** into the resource surface calmly; the remaining sparks wait.

**Skippable, always:** every prompt has a visible, unpenalized "skip this one." Skipping is data-free (no event written). The intake never pressures disclosure (LAW 6: no scoring of depth).

## 3. Voice (the hero path, honestly hedged)

Voice-first: tap-to-talk, browser Web Speech API, live transcript visible AS the person speaks, **editable before submit** — the person always reviews and owns the words that become evidence (this is also the OCR-review principle from IDEA-018 applied to STT: transcription errors must not become "their exact words" unreviewed). Text entry is the co-equal fallback, one tap away, no mode shame. Per the cut-line (§7 item 1): if rehearsal in a noisy room degrades voice, text-first with voice as the try-it path is the fallback posture — a config flip, not a rebuild. STT audio is never stored; only the reviewed transcript becomes the SourceEvent.

## 4. The seventh spark and the becoming lane

Spark 7's answer extracts normally (words about becoming are still words). But BECOMING nodes are **authored intentions, never extractions** (lane ownership, absolute). So after spark 7's reflect, the intake offers — explicitly, consentfully: *"Would you like to place this as a seed on your sky — a quality you're becoming, that your future words can ignite?"* with a one-line editable seed statement drafted FROM their answer (their words, their edit, their button). Accept → a BECOMING node via its own lane (DECLARATION evidence, mass 0, seed-styled). Decline → nothing; the extraction stands alone. The seed moment is the intake's closing ceremony.

## 5. Stopping rule & the reveal

Target: **7±2 evidence-bearing objects** (materialized nodes + forming embers + charged ghosts count; pure hypotheses don't). If the sky reaches ~9 before prompt 7, offer an early graceful close ("your sky has plenty to begin with — the rest of the sparks will wait for you"); never cut before prompt 4. After the final spark (or early close): the **reveal** — full-screen sky, slow settle, the summary of everything heard, and the standing invitation into the journal loop. The reveal is the demo's money shot; it gets the ceremony styling budget.

## 6. Session mechanics

Resumable: intake state (current prompt, completed set) persists; abandonment mid-intake is fine and resumes where left. Re-runnable: completed intake can be revisited to answer skipped sparks (events append; nothing re-asked that was answered). Total time target: 8–12 min voice, comparable typed. Every screen: calm, one action, generous whitespace — the §9 "first ten minutes flawless" bar applies to THIS module above all.

## 7. Out of scope

Tier 2 (archive upload — IDEA-018's lane, post-September); assessments; practitioner-side intake orchestration (client-link flows); localization; native app wrappers.

## 8. Tests

1. **Pipeline reuse keystone:** an intake answer flows through the REAL wrapper→gate→writer→matcher path identically to a journal entry (zero intake-specific extraction code paths; the only difference is the intake tag + immediacy).
2. **Skip is data-free:** skipped prompt → no SourceEvent, no pass, no telemetry beyond the skip itself.
3. **Crisis pause:** a crisis-level answer pauses the flow into resources; remaining sparks resume later; the entry still saves.
4. **Transcript ownership:** the submitted SourceEvent content byte-equals the reviewed/edited transcript, never the raw STT stream.
5. **Becoming consent:** no BECOMING node exists without the explicit accept; the seed statement is the person's edited words; decline leaves zero becoming artifacts.
6. **Stopping rule:** object-count thresholds trigger the early-close offer at the config bound, never before prompt 4.
7. **Both entries:** chartless intake works end-to-end (no lens dependency anywhere in the flow).
8. **Resume integrity:** kill mid-intake at every prompt boundary → resume lands on the correct prompt with prior answers intact.

## 9. Build order

Prompt config + flow state machine → per-answer reflect orchestration (reusing the journal's exact pass entry point) → between-screens beat + summaries → voice layer with review-before-submit → spark-7 becoming ceremony → stopping rule + reveal → resume. Voice lands LAST deliberately: the flow must be fully demo-able text-only first (that's the cut-line fallback pre-built, not retrofitted).

*— End of intake spec v1.0. For REVIEW-01 iteration. The first ten minutes are the product's whole first impression; nothing here is allowed to be clever at the cost of being calm.*
