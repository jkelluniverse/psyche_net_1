# Seven Sparks Intake — Module Specification

*Psyche-Net · the first ten minutes · v1.1 · governs `/src/app/(intake)/`, `/src/engine/intake/`, and (v1.1) the shared becoming lane in `/src/engine/becoming/` · for REVIEW-01 iteration*

> **v1.1 changelog (REVIEW-01 round 1 integration — both lanes Request Revisions; Jacob's four rulings applied):** owned bugs in the active voice: (1) **I routed the §4 seed ceremony through a becoming lane that did not exist** — the schema banner forbade it as written, the edited seed statement had no legal evidence carrier, and the drafting mechanism was unnamed, all under a "no new trust machinery" headline that wasn't true. v1.1: this spec owns the lane contract (§4) — fourth sanctioned writer computer via banner amendment, `SourceKind.BECOMING_DECLARATION` as the carrier, deterministic versioned drafting template, headline rescoped honestly. Ruled constraints: the declaration evidence is born `role=DECLARATION` (non-conferring, mass 0 at birth — the lane structurally cannot self-ignite); the lane is built as THE becoming lane, intake merely its first caller. (2) **I specified the consequence loop with no concurrency contract** against an entry point whose real watermark semantics corrupt at intake cadence — overlapping passes can forge recurrence from ONE utterance; the load-before-create window strands answers; failed passes mis-attribute stars. v1.1: §2.1 serialization contract + the forged-recurrence keystone test (Jacob: "one utterance counts once, and answer N's stars belong to answer N's beat"). (3) **I claimed the crisis floor as "existing invariant" without naming the ingest contract intake must reuse** — §2.2 now names it (verdict before the beat; no delta celebration after a crisis answer; crisis step added to §9). (4) Carriers that didn't exist now do: IntakeSession + spark/promptsVersion/input-mode stamps (§6.1), computable stopping-rule predicate + named config keys (§5), latency budget + failure posture (§2.3), veiled-projection rule for beat/reveal copy (§2.4), two-stage transcript ownership (§3), STT third-party transit named honestly (§3), zero-change copy split (§2.4), spark-shaped eval fixtures (§8). Deferred to the §7.1 bundle: STT provider data-handling; deletion cascade over intake artifacts. Cross-spec in the same commit: proposer spec v1.5 doc-sync (`heldShadowLabels` — the FINAL-drift amendment's founding precedent) and the charter's FINAL-drift amendment itself.

> *v1.0 changelog:* initial draft (INTAKE-01 realized) — entered the REVIEW-01 loop.

> INTAKE-01 realized: the Tier-1 guided intake that turns a stranger into a person with a sky, in ~10 minutes, on their own phone. This is the September demo itself. Governing rule (master concept §5.1): **each answer renders its consequence before the next question is asked** — intake is the tutorial for the core loop, not a form. Everything here orchestrates the EXISTING pipeline (SourceEvent → crisis floor → proposer → gate → writer → matcher → sky); the module adds sequencing, prompts, voice, and pacing — **no new trust machinery except the becoming lane this spec introduces (§4), under the existing conferring rules.** Cross-refs: master concept §5.1/§7, proposer spec v1.5-FINAL, renderer-lens v1.3-FINAL, CLAUDE.md, `src/engine/extraction/run-pass.ts`.

## 1. The flow

Entry: post-signup, after Tier 0 (birth data → ghost sky) or skipping it (no chart → intake begins on an empty-but-fringed sky; both paths first-class). Seven prompts, one screen each, in order:

1. **A shaping moment** — "Tell me about a moment that shaped how you move through the world."
2. **A repeated pattern** — "What's something you notice yourself doing again and again?"
3. **What you'd protect** — "If everything else were negotiable, what would you protect?"
4. **What people misunderstand** — "What do people most often get wrong about you?"
5. **Key relationships** — "Who matters most, and what are you like with them?"
6. **What you're proud of** — "What have you done or become that you're quietly proud of?"
7. **Who you're becoming** — "Who are you in the middle of becoming?"

(Prompt copy is versioned config — `intakePromptsVersion` — and oral-history-crafted per CORE-07: open, concrete, second-person warm. Exact wording is editorial; Jacob's ear passes it like the lens labels. **Publishing process (v1.1):** every prompt-config change passes an editorial checklist before its version ships — no wound-origin phrasing, no diagnosis-adjacent language, second-person warmth — a documented human gate, deliberately process-not-code.)

**No wound-origin questions, ever** (§5.1 rule). The sparks open real material by invitation, not excavation.

## 2. Per-answer mechanics (the consequence loop)

Each answer → one `SourceEvent` with **`kind = INTAKE_SPARK`** (v1.1 — the "intake tag" is this kind, already present in the schema enum and in the pass entry point's kind allowlist; nothing else marks intake-ness for extraction purposes), `authorship = SELF` → crisis floor (§2.2) → **immediate reflect** (intake is the sanctioned exception to batched extraction — the batching rule exists for cost/calm; intake's whole pedagogy is immediacy; cap: 7 passes/session, the prompts ARE the cap) → the between-screens beat (§2.4) → the next prompt.

**Extraction mode (v1.1):** intake runs under whatever `livePolicyFor` derives — SOLO for a fresh signup, PRACTITIONER_SUPPORTED for a pre-verified client in the wedge flow (master concept §6.2). Both are in-scope; §2.4's veil rule exists for the supervised case.

**Skippable, always:** every prompt has a visible, unpenalized "skip this one." Skipping writes **no SourceEvent and no content**; it writes only the session-state mark (§6.1) that lets the spark be re-offered later. The intake never pressures disclosure (LAW 6: no scoring of depth).

### 2.1 Concurrency & ordering (v1.1 — the loop's integrity contract)

The real entry point (`runExtractionPass`) processes *all* un-extracted sources since the last complete run and returns a per-run summary. Called at intake cadence without a contract, that corrupts:

- **One in-flight pass per user, enforced.** The submit affordance for spark N+1 is disabled until spark N's beat resolves (pass complete, failed, or timed out per §2.3) — UI gating backed by a server-side per-user run guard in the intake orchestration (both named; the UI alone is not the enforcement). Overlapping passes double-extract the same utterance, and double-extraction is not duplicate work — it is **forged recurrence**: `timesSeen` inflated past the materialization threshold by a race, a node minted from a single mention. The keystone test (§8, test 9) asserts exactly this stake.
- **The watermark window is fixed in `run-pass`, failing-first:** the run row is created *first* and sources load against its own `startedAt` — the current load-before-create sequence strands any event ingested in the window (ineligible for every future pass: silently unmapped words). This is a correctness bug in the shared entry point, fixed there (not intake-side), with its own regression test; the journal inherits the fix.
- **Merged-pass honesty.** A failed pass does not advance the watermark, so the next pass may cover more than one answer. When a pass covers >1 source, the beat **must say so** — "catching up on your last two answers…" — and must never attribute the merged delta to the single answer just given. Carrier: `countUnextractedSources` (already exported) read before the pass; >1 → catch-up copy. Answer N's stars belong to answer N's beat, or to an honestly-labeled catch-up — never to answer N+1.

### 2.2 The crisis floor (ingest contract, named)

The crisis classifier runs on **every answer, unconditionally** — before extraction, never gated by mode, veil, or session timing. Intake reuses the journal ingest pattern (`app/(sky)/journal/actions.ts`: persist event → `classifyCrisis` synchronously → then and only then extraction), and names its own additions:

- **The beat never renders before the crisis verdict.** The verdict is serial and blocking; its latency is inside §2.3's budget.
- **On a CRISIS-level answer:** the intake **pauses** into the resource surface calmly; the entry still saves (the words are never lost); the reflect pass for that answer is **deferred, and its delta celebration is suppressed** — "I heard two things — one brightened a star" immediately after active ideation is a concrete failure of the calm this product promises. The remaining sparks wait; on resume, the deferred material rides the next pass under §2.1's merged-pass copy rule.
- Classifier failure posture is the classifier's own (fail-closed on soft-signal + model failure); intake adds nothing and removes nothing.

### 2.3 Latency budget & failure posture (v1.1)

The beat sits on a crisis verdict + a full model round-trip with an unbounded tail. Named budget: **`intake.reflectTimeoutMs`** (versioned config). The waiting state is designed, not accidental: the sky glimpse may *start* (settle animation on the existing sky) while the pass runs, resolving into the delta — or into honest copy. On timeout or a thrown pass: **"that one's saved — I'll keep listening as we go"** — the material folds into the next answer's pass (§2.1 merged-pass rule), never a silent skip, never a blocking retry, and the §10.5 backoff-notice machinery never surfaces mid-flow. **A failed reflect never blocks progression to the next spark.** The words are safe in the event store; immediacy is the pedagogy, not the integrity.

### 2.4 The between-screens beat (copy provenance pinned)

A one-line plain-language result + a 2–3s sky glimpse animating the delta, then the next prompt.

- **Deterministic templates only.** Beat and reveal copy are composed by deterministic templates over pipeline results (`ReflectSummary`, `matcher.transitions`). No model-authored copy anywhere in intake v1.
- **Identities come from the veiled projection.** Any node/ghost identity the copy or glimpse names is drawn from the veiled `SkyViewModel` (renderer-lens v1.3: the veil is a property of the projection), **never** from raw `GateResult`/`MatcherRunResult`. A supervised-mode intake answer that extracts a WOUND renders the veil copy in the beat — never the label (§8, test 11).
- **Copy branches by what actually happened**, so no line can claim what didn't: `linksCreated > 0` → "…brightened a star your chart placed" (impossible for a chartless user by construction); else `materialized > 0` → "…lit a new star"; else `forming > 0` → "…one is forming at the edge"; else rejected-only → honest not-yet copy. **Zero-change split (v1.1):** `forming > 0` → "held onto that — it'll take shape as themes recur"; all-zero → "saved — nothing new took shape from this one yet" (nothing was "held" in any graph sense; the copy doesn't pretend otherwise).
- **Reduced motion:** under `prefers-reduced-motion`, the beat is the text result + a static sky diff (or list-view delta) and the reveal drops the slow settle — the renderer-lens accessibility contract does not lapse in the first ten minutes.
- **Renderer warmth:** the sky renderer pre-warms at intake start behind a pre-ready skeleton; the list view is the always-warm fallback.

## 3. Voice (the hero path, honestly hedged)

Voice-first: tap-to-talk, browser Web Speech API, live transcript visible AS the person speaks, **editable before submit** — the person always reviews and owns the words that become evidence (the OCR-review principle from IDEA-018 applied to STT: transcription errors must not become "their exact words" unreviewed).

**Two-stage submission, structural (v1.1):** the STT stream fills a client-side buffer only → the person reviews/edits the draft → explicit Submit writes `SourceEvent.content`. Raw STT text is never persisted server-side and never reaches crisis classification or extraction pre-review; the submitted content byte-equals the reviewed draft (§8, test 4 asserts both halves).

**The honest privacy claim (v1.1 reword):** *we* never store audio; only the reviewed transcript becomes the SourceEvent. The browser Web Speech API itself may transmit raw audio to the browser vendor's cloud for recognition — a third-party transit this product does not control and does not hide; the STT provider's data-handling terms are a named pre-pilot governance item (master concept §7.1). Text entry is the co-equal fallback, one tap away, no mode shame. Per the cut-line (§7 item 1): if rehearsal in a noisy room degrades voice, text-first with voice as the try-it path is the fallback posture — a config flip, not a rebuild.

## 4. The seventh spark and the becoming lane

Spark 7's answer extracts normally (words about becoming are still words). But BECOMING nodes are **authored intentions, never extractions** (lane ownership, absolute). After spark 7's reflect, the intake offers — explicitly, consentfully: *"Would you like to place this as a seed on your sky — a quality you're becoming, that your future words can ignite?"* with a one-line editable seed statement drafted from their answer. Accept → a BECOMING node via the becoming lane. Decline → nothing; the extraction stands alone. The seed moment is the intake's closing ceremony.

**The becoming lane (v1.1 — this spec owns the seam contract; ruled, option (a)):**

- **The lane is THE becoming lane, not intake's** — `/src/engine/becoming/`, with the future becoming-design UI (master concept v1 IN #4) as its second caller. Nothing intake-specific lives in the lane itself; intake passes it the accepted statement and provenance stamps, nothing more.
- **Fourth sanctioned writer computer.** The schema banner ("exactly THREE sanctioned upstream computers") is amended — a named schema delta in the same build commit that creates the lane — to list the becoming lane as the fourth. The banner did its job in review (a forbidden write path was findable by reading); the amendment keeps it able to do that job.
- **The declaration carrier:** the accepted seed statement is written as its **own `SourceEvent`, new `SourceKind.BECOMING_DECLARATION`** (schema delta, owning migration named in the build). The BECOMING node (provenance BECOMING, `state = HYPOTHESIS`, mass 0) carries one Evidence row citing that event's **full span verbatim** — deterministic validation (the quote is the whole content; a check that cannot fail is stated as such, same honesty rule as the lens lane's gate exemption).
- **Born unable to self-ignite (ruled constraint i):** the declaration evidence is created `role = DECLARATION` — non-conferring under the standing allowlist rule (`SUPPORT | ENACTMENT` confer; BECOMING ignition requires ENACTMENT only). Mass 0 at birth, structurally: the lane cannot charge the node it creates, no matter what copy or code calls it. Ignition comes only from future lived words through the gate.
- **The drafting template is deterministic and versioned (ruled constraint ii):** `becomingSeedTemplateVersion`, a named transform over the spark-7 answer (no model call, no free prose). The draft is a *suggestion rendered from their words*; the person's edit is the statement. What is persisted is exactly what they accepted, byte-for-byte.
- **Consent is the only path:** no accept → no SourceEvent, no node, no evidence, zero becoming artifacts (§8, test 5).

## 5. Stopping rule & the reveal

Target: **7±2 evidence-bearing objects**. **The counting predicate (v1.1, computable):** `COUNT(EXTRACTED nodes, archivedAt IS NULL)` + `COUNT(node-kind ShadowCandidate rows)` + `COUNT(hypothesis-provenance nodes WHERE EXISTS(active HypothesisEvidenceLink))` — the charged-ghost predicate **imported from the renderer's definition, never restated**. (Chosen explicitly: a CONTRADICTED mass-0 ghost still counts — being shown wrong is sky-worthy; that is the product's claim.) Pure hypotheses (uncharged ghosts) don't count.

**Named config (versioned):** `intake.targetObjects` (7), `intake.earlyCloseBound` (9), `intake.minPromptsBeforeClose` (4). If the count reaches `earlyCloseBound` before prompt 7, offer an early graceful close ("your sky has plenty to begin with — the rest of the sparks will wait for you"); never before prompt `minPromptsBeforeClose`. After the final spark (or early close): the **reveal** — full-screen sky, slow settle (reduced-motion per §2.4), the summary of everything heard (deterministic template, veiled projection — §2.4's rules govern the reveal too), and the standing invitation into the journal loop. The reveal is the demo's money shot; it gets the ceremony styling budget.

## 6. Session mechanics

### 6.1 Schema & carriers (v1.1)

- **`IntakeSession`** (owning migration named in the build): `id, userId, status (IN_PROGRESS | COMPLETED | EARLY_CLOSED), currentPrompt, intakePromptsVersion, startedAt, finishedAt?`, plus per-spark status rows or embedded array: `sparkIndex, state (PENDING | ANSWERED | SKIPPED), sourceEventId?` (the answering event, when answered). The skip mark lives here and only here — no content, no timestamps-of-hesitation, nothing scoreable (LAW 6/8).
- **Event-side stamps:** each intake `SourceEvent` carries spark identity, `intakePromptsVersion`, and input mode (`VOICE_REVIEWED | TYPED`) — an explicit carrier decision made here: these ride in a dedicated intake-meta structure, **not** in `SourceEvent.signals` (documented corroboration-signal space; not quietly overloaded). Which prompt wording elicited which answer is reconstructable forever (version-everything invariant), and editorial changes never alter historical events.
- **Per-prompt yield telemetry (LAW-6-safe by construction):** aggregate per `intakePromptsVersion` × sparkIndex only — pass yield (heard/forming/rejected), skip rate, early-close rate, per-session pass count (structurally ≤7, logged on the session row). Never per-person; this must never become disclosure-depth scoring, and saying so here is what keeps it structural.

### 6.2 Resume & re-run

Resumable: `IntakeSession` persists current prompt + per-spark state; abandonment mid-intake is fine and resumes where left (§8, test 8: kill at every prompt boundary). Re-runnable: completed intake can be revisited to answer skipped sparks (events append; nothing re-asked that was answered — the ANSWERED mark is the guard). Total time target: 8–12 min voice, comparable typed. Every screen: calm, one action, generous whitespace — the §9 "first ten minutes flawless" bar applies to THIS module above all.

## 7. Out of scope

Tier 2 (archive upload — IDEA-018's lane, post-September); assessments; practitioner-side intake orchestration (client-link flows); localization; native app wrappers. Routed to the §7.1 pre-pilot bundle this round: STT provider data-handling terms; deletion-cascade coverage of intake artifacts.

## 8. Tests

1. **Pipeline reuse keystone:** an intake answer flows through the REAL wrapper→gate→writer→matcher path identically to a journal entry (zero intake-specific extraction code paths; the only differences are `kind = INTAKE_SPARK` — asserted — and immediacy).
2. **Skip is data-free:** skipped prompt → no SourceEvent, no pass, no content anywhere; only the IntakeSession spark-state mark exists.
3. **Crisis pause:** a crisis-level answer pauses the flow into resources; the entry still saves; **the beat never renders before the crisis verdict, and a CRISIS answer renders no delta celebration**; remaining sparks resume later, deferred material under merged-pass copy.
4. **Transcript ownership:** the submitted SourceEvent content byte-equals the reviewed/edited transcript; **raw STT text is never persisted server-side and never reaches classification/extraction pre-review**.
5. **Becoming consent:** no BECOMING node exists without the explicit accept; the seed statement is the person's edited words byte-for-byte; the declaration evidence is `role = DECLARATION` and the node's mass is exactly 0 post-ceremony; decline leaves zero becoming artifacts.
6. **Stopping rule:** counts computed by the §5 predicate trigger the early-close offer at `intake.earlyCloseBound`, never before prompt `intake.minPromptsBeforeClose`; asserts against the config keys.
7. **Both entries:** chartless intake works end-to-end (no lens dependency anywhere; the chart-copy branch is unreachable chartless).
8. **Resume integrity:** kill mid-intake at every prompt boundary → resume lands on the correct prompt with prior answers intact.
9. **The forged-recurrence keystone (v1.1):** rapid submit of two answers → exactly two serialized runs; **no source extracted twice** (one utterance counts once — `timesSeen` never inflated by a race; a node can never materialize from a single mention via overlap); **no source stranded** by the watermark window; answer N's delta narrated in answer N's beat (or an honestly-labeled catch-up), never attributed to answer N+1.
10. **Merged-pass honesty:** a failed pass followed by a new answer → one pass covering both, and the beat renders catch-up copy, never single-answer attribution.
11. **The veil holds in the beat (v1.1):** supervised-mode intake answer extracting a WOUND → the beat/reveal render veil copy from the veiled projection, never the raw label.
12. **Spark-shaped eval fixtures:** ≥7 hand-labeled spark-answer fixtures (one per prompt, incl. one thin answer and one rambling voice-style transcript) live in the eval corpus **before the intake build starts**; fidelity scored over the genre the demo actually runs on.

## 9. Build order

Prompt config + flow state machine + IntakeSession carriers → **crisis ingest step (§2.2 — before any beat work)** → per-answer reflect orchestration (reusing the journal's exact pass entry point; §2.1 serialization + the run-pass watermark fix, failing-first) → between-screens beat + summaries (deterministic templates, veiled projection) → **becoming lane as its own engine module** + spark-7 ceremony → stopping rule + reveal → resume → voice layer with review-before-submit. Voice lands LAST deliberately: the flow must be fully demo-able text-only first (that's the cut-line fallback pre-built, not retrofitted). Spark fixtures (§8.12) land before the first build commit.

*— End of intake spec v1.1. For REVIEW-01 iteration (round 2). The first ten minutes are the product's whole first impression; nothing here is allowed to be clever at the cost of being calm.*
