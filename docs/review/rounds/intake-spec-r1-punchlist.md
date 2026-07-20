# Intake spec v1.0 — Round 1 punch-list (reconciled per charter)

*Lanes: Claude (Request Revisions — 2 C / 6 M / 4 m / 2 E) · ChatGPT gpt-5 (Request Revisions — 4 C / 6 M / 4 m / 3 E). Both reviewed v1.0. Overlap was high; findings merged below with both citations. Orchestrator verified every contested factual claim against the code before classifying (charter: verify before dismissing).*

**Checkpoint status: STOPPED for Jacob.** Both lanes returned Criticals; nothing integrates until this list is approved or edited. One item (A-1) edits a FINAL-stamped sister spec — flagged explicitly.

---

## ACCEPTED (integrate into intake v1.1; failing-first tests where marked ⊕)

**A-1. Proposer spec v1.5 doc-sync: `heldShadowLabels` is real but undeclared** *(ChatGPT C-1, part)* — the identity ruling's D change (2026-07-15) added `ProposerInput.heldShadowLabels` / `BlindedExtractionContext.heldShadowThemes` to the code with your canonical blinding analysis, serializer-allowlist byte-identity tests, and the anchoring canary — but proposer spec v1.4-FINAL §3 never gained the field. That is a genuine contract-doc seam and the charter's rule 1 catches it. **Resolution: doc-sync the proposer spec to v1.5** (declare the field, the labels-only minimal surface, the ruled instruction, the canary as permanent eval item) — NOT a revert; the code is ruled canon. ⚑ *Edits a FINAL spec — needs your explicit OK.* The finding's second half (`PriorNodeView.provenance` leak) is **STALE-ALREADY-FIXED**: `CandidatePriorNode` is the spec'd pre-filter input shape; the builder strips provenance structurally and the keystone test proves it.

**A-2. Pin the intake tag** *(ChatGPT C-2)* — "intake-tagged" becomes concrete: `SourceEvent.kind = INTAKE_SPARK` (enum member and run-pass allowlist already exist; the spec just never says so). Test 1 gains the assertion. ⊕

**A-3. Concurrency & ordering contract for the consequence loop** *(Claude C-2 + ChatGPT C-3 + ChatGPT MIN-2 — the round's most substantive merged finding)* — three verified behaviors of the real entry point corrupt state at intake cadence: (1) no per-user pass serialization → overlapping passes double-extract and can materialize a node from ONE utterance (recurrence defeated by a race); (2) sources load before the run row is created → an event ingested in that window is stranded forever; (3) failed passes don't advance the watermark → answer N's stars get attributed to answer N+1's beat. §2 gains a "Concurrency & ordering" subsection: **one in-flight pass per user** (submit gated until the beat resolves — named enforcement, not vibes); **watermark window fixed in run-pass** (create run row first, load against its own startedAt) as a required failing-first test — this is a charter rule-6 correctness bug ⊕; **honest merged-catch-up copy rule** (a pass covering >1 answer must say so — "catching up on your last two answers…" — never attribute a merged delta to one answer; carrier: `countUnextractedSources`, per Claude E-2). New intake-shaped test: rapid double-submit → two runs, zero double-extraction, zero stranded sources. ⊕ *(ChatGPT's alternative — a new `runExtractionPassForSources` API — is not taken: serialization + honest narration is cheaper and keeps one entry point; noted as a post-pilot option if serialization proves too rigid.)*

**A-4. The becoming seed lane gets owned, here** *(Claude C-1 + ChatGPT M-1 — the worst finding)* — §4 routes through a lane that does not exist, that schema.prisma's writer banner currently forbids ("exactly THREE sanctioned upstream computers… anything else is a bug"), with no evidence carrier (the *edited* seed statement can't cite the spark-7 event verbatim) and an unnamed drafting mechanism — while the spec claims "no new trust machinery." Integration per Claude's option (a), this spec owns the seam contract: the becoming lane is named the writer's **fourth sanctioned upstream computer** (banner amendment listed as a schema delta); the declaration carrier is the accepted seed statement written as its **own SourceEvent, new `SourceKind.BECOMING_DECLARATION`**, with the Evidence row citing that event's full span verbatim (deterministic, gate-exempt for the same stated reason as the lens lane); the drafting mechanism is a **deterministic template over the spark-7 answer** (no model-authored copy anywhere in intake v1); the "no new trust machinery" headline is scoped honestly ("one new deterministic write surface, spec'd here; no new model-trusting machinery"). Test 5 becomes writable. ⊕

**A-5. Crisis ingest contract named (premise corrected)** *(Claude M-1 + ChatGPT C-4)* — both lanes claimed the crisis floor has zero production callers; **that premise is false** — `app/(sky)/journal/actions.ts:69` runs `classifyCrisis` on every save (both reviewers looked under `/src/app/`; the app dir is at repo root). Marked partially STALE. What stands and integrates: the intake spec must *name* the ingest contract it reuses (persist event → classify synchronously, **verdict before the beat renders** → on CRISIS: suppress the delta celebration, enter the resource surface, remaining sparks wait, pass deferred to resume with A-3's merged-summary copy rule); the crisis step joins §9's build order (before "between-screens beat"); test 3 gains "the beat never renders before the crisis verdict; a CRISIS answer renders no delta celebration." ⊕

**A-6. Latency budget + failure posture for the beat** *(Claude M-2 — the sanctioned-exception challenge, argument-level as ruled)* — cost half of the argument holds (7 capped passes is noise); the calm half is exposed: the beat sits on an LLM round-trip with an unbounded tail and the spec has no budget, no waiting state, no thrown-pass copy. §2 gains: named config `intake.reflectTimeoutMs`; the waiting stance (glimpse settle may start while the pass runs); failure copy ("that one's saved — I'll keep listening as we go"), material folds into the next pass per A-3's rule; a failed reflect **never blocks progression** (the words are safe in the event store; immediacy is the pedagogy, not the integrity); §10.5's backoff-notice machinery never surfaces mid-flow.

**A-7. Schema & carriers section** *(Claude M-3 + ChatGPT M-3 + ChatGPT M-5)* — nothing carries session state, spark identity, prompt version, or the skip record; tests 2 and 8 are unwritable. Adds: **IntakeSession** model (userId, status, currentPrompt, per-spark status ANSWERED|SKIPPED|PENDING with answering `sourceEventId`, `intakePromptsVersion`, timestamps) with its owning migration; event-side spark-identity + promptsVersion + input-mode (voice-reviewed vs typed) stamp as an **explicit** carrier decision (`SourceEvent.signals` is documented corroboration space — not silently overloaded); skip wording reconciled: "skip writes no SourceEvent and no content; it writes only the session-state mark that permits re-offering" (also answers ChatGPT MIN-4's LAW-8 concern). ⊕

**A-8. Stopping rule made computable** *(Claude M-4 + ChatGPT M-4)* — the counting predicate becomes a spec'd query (extracted nodes + node-kind shadow candidates + hypothesis nodes with an active evidence link — reusing the renderer's charged predicate by import, not restatement; the "CONTRADICTED ghosts count" choice made explicitly) and the three thresholds become named versioned config: `intake.targetObjects`, `intake.earlyCloseBound`, `intake.minPromptsBeforeClose`. Test 6 asserts against the keys. ⊕

**A-9. Beat/reveal copy provenance + the veil** *(Claude M-5 + ChatGPT M-6 branch logic)* — pinned: beat and reveal copy are **deterministic templates** over pipeline results (no model-authored copy in intake v1); any node identity they mention comes from the **veiled projection**, never raw `GateResult`/`MatcherRunResult` — closing the real hole where a supervised-mode intake (the wedge's pre-session flow) extracts a WOUND and the celebration one-liner prints its raw label. Copy branches by actual outcome (linksCreated>0 → "brightened a star your chart placed"; chartless → "lit a new star" / forming / honest-nothing), so the chart line can never render for a chartless user. Veil test added (supervised WOUND during intake → veil copy, never the label). ⊕

**A-10. Transcript ownership made structural** *(ChatGPT M-2)* — two-stage submission contract in §3: client-side STT buffer → editable draft → explicit Submit writes `SourceEvent.content`; raw STT is never persisted server-side and never reaches extraction pre-review. Test 4 extended to assert the negative. ⊕

**A-11. STT honesty reword** *(Claude M-6, reword half)* — §3's "STT audio is never stored" claims more than the architecture delivers: browser Web Speech API ships raw audio to the browser vendor's cloud. Reworded to what is true and ours ("*we* never store audio; only the reviewed transcript becomes the SourceEvent") + one honest sentence naming the third-party transit. (Provider governance → D-1.)

**A-12. Zero-change copy split** *(Claude m-2 + ChatGPT M-6 overlap)* — "held onto that — it'll take shape as themes recur" is only true when forming>0; the all-zero pass gets its own honest line ("saved — nothing new took shape from this one yet"). Copy-*system* honesty, in scope per your ruling.

**A-13. Spark-shaped eval fixtures** *(Claude m-4)* — ≥7 hand-labeled spark-answer fixtures (one per prompt, incl. one thin answer + one rambling voice-style transcript) join the corpus **before** the intake build starts; the demo rides on fidelity over exactly this genre. ⊕

## CHEAP (small edits, integrated same pass)

**C-1.** Intake's extraction mode named: "runs under whatever `livePolicyFor` derives; SOLO and PRACTITIONER_SUPPORTED both in-scope; A-9's veil rule covers the supervised case." *(Claude m-1)*
**C-2.** Reduced-motion beat posture: text result + static sky diff / list-view delta; the reveal honors `prefers-reduced-motion` per renderer-lens. *(Claude m-3)*
**C-3.** Prompt-config publishing checklist ("no wound-origin phrasing" editorial gate) documented as process. *(ChatGPT MIN-1)*
**C-4.** Renderer pre-warm at intake start + pre-ready skeleton; list view as warm fallback. *(ChatGPT MIN-3)*
**C-5.** Per-prompt yield telemetry, aggregate per `intakePromptsVersion` × spark only, never per-person — named in-spec as LAW-6-safe (never disclosure-depth scoring). *(Claude E-1 + ChatGPT ENH-1's budget log folded in: per-session pass count is already structurally capped at 7; log it on the session row.)*

## DEFERRED (verbatim to master concept §7.1 pre-pilot bundle)

**D-1.** STT provider data-handling line item (provider, terms, region, retention) parallel to the LLM provider entry — LAW 8 work before any real user speaks. *(Claude M-6, governance half)*
**D-2.** Deletion cascade covers intake artifacts: intake SourceEvents + BECOMING seed declaration events/evidence named as sources in the LAW-8 erasure design; retraction-suite test noted for when that architecture lands. *(ChatGPT ENH-3)*

## REJECTED

*None this round.* (ChatGPT C-3's new per-source pass API is a road-not-taken within A-3, not a rejection — logged there as a post-pilot option.)

## STALE-ALREADY-FIXED

**S-1.** `PriorNodeView.provenance` "leak" *(ChatGPT C-1, second half)* — `CandidatePriorNode` is the spec'd pre-filter shape; the context builder strips provenance structurally; keystone byte-identity test covers it.
**S-2.** "Crisis classifier has zero production callers / no ingest wiring exists" *(Claude M-1 premise, ChatGPT C-4 premise)* — `app/(sky)/journal/actions.ts` wires `classifyCrisis` on every save, before extraction. The actionable remainder integrated as A-5.
**S-3.** "`INTAKE_SPARK` may not be consumable by the pass" *(ChatGPT C-2, half)* — already in the enum and the run-pass kind allowlist; remainder (spec pins it) integrated as A-2.

---

## Checkpoint questions for Jacob

1. **A-1 edits proposer spec v1.4-FINAL → v1.5 (doc-sync only, no behavior change).** OK to touch a FINAL-stamped spec for this?
2. **A-4 commits to `SourceKind.BECOMING_DECLARATION` + the fourth-computer banner amendment.** That's the biggest architectural addition in the list — confirm option (a) (this spec owns the lane) over option (b) (separate mini-spec first).
3. **A-3 chooses serialization over a per-source pass API.** Confirm.
4. Everything else is spec-text + carriers + tests in the intake spec itself. Approve as classified, or edit.

*Round 2 runs after integration (both lanes returned Criticals; exit requires a clean round or the 3-round cap).*
