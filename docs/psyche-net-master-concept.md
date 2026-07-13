# PSYCHE-NET — MASTER CONCEPT & BUILD SPECIFICATION
### The convergence pass: ten ideas, fifteen modules, and one governing stance, resolved into a single buildable v1

*Version 1.1 · 2026-07-13 · Governing stance: META-01 (polymath navigation over certainty; macro-micro structure). This document is itself provisional and revisable — it is the current best map, not the territory.*

> **v1.1 changelog (dual-review integration, Claude + ChatGPT):** added the extractor-blinding invariant (§4.3, also in CLAUDE.md + gate spec); resolved Graphiti-vs-Postgres in favor of **Postgres for v1, Graphiti post-pilot** (§4.2, §8.2, matching the schema); added the **seeded longitudinal demo account** as v1 IN #8 and a ranked **cut-line** (§7); reframed schedule as a risk **co-equal** with extraction fidelity, with **blocking pre-conditions** for the PSYCH-K wedge (§9, §10); changed wholesale rsync to **selective seed** (§8.1); added voice-in-a-noisy-room rehearsal + a **demo-day human safety protocol** (§9); named the modality-agnostic-vs-PSYCH-K-shaped and concrete-vs-jazz tensions honestly (§6.1); added the bounded-context pipeline diagram (§4.3). Deferred-but-logged from ChatGPT: full multi-stage runtime, multi-dimensional confidence, ADRs (`/docs/adr`), and a `Glossary.md` — all post-pilot or lightweight-later. Reconciliation lives in the build thread + ledger IDEA-011.

---

## 0. How to read this document

This is the single source of truth that folds the entire idea ledger into one coherent, buildable concept. It is organized so that a developer (human or Claude Code) can read top-to-bottom and understand *what to build, in what order, and why each constraint exists*. Five layers, in dependency order:

1. **Identity & stance** — what this is and the philosophy it runs under.
2. **The structural laws** — the non-negotiable constraints every feature answers to.
3. **The engine** — the data architecture (the "psyche-net" itself).
4. **The experience** — what the user does and sees.
5. **The plan** — v1 scope, the September 23 target, the tech stack, and the Claude Code kickoff runbook.

Throughout, module IDs (CORE-xx, LAW-xx, etc.) refer to the idea ledger, where each is developed in full with its cautions and provenance.

---

## 1. Identity

**Psyche-Net is a living, evidence-bound map of a person's inner architecture, where change is visible as physics, and where nothing is treated as true until the person's own life confirms it.**

It is, at the data layer, a longitudinal temporal knowledge graph of a human psyche — nodes (wounds, beliefs, protections, patterns, traits, resources, and aspirations) connected by typed edges, each carrying mass earned only from the person's own words, each rendered as a body in a navigable night sky whose gravity, light, and motion express the real state of that person's inner world and its change over time.

It is, at the product layer, three things wearing one engine: a **discovery-and-outcome instrument for practitioners** (the wedge), a **guided developmental program for individuals** (Seasons), and — later — a **group resonance field** for facilitators. All three run the same core; they differ only in who curates, who sees what, and what claims the surface makes.

Its one-sentence positioning candidate: **the self-knowledge instrument that shows you what it doesn't know.**

## 2. The governing stance (META-01)

Every decision in this document is made under one philosophy, stated two ways:

**Navigation over certainty.** The goal of a capable system is not to reach a final, correct model of a person — it is to continually increase its capacity to move well through changing information. This is requisite variety (control theory), evolvability (biology), graceful adaptation (ML). Practically: the ontology stays loose and self-revising, the engine is built to improve its own calibration rather than to "finish," and uncertainty is represented honestly everywhere.

**Macro-micro structure, held as resonance not dogma.** The same network topology — small-world clustering, hub nodes, sparse long-range links, criticality at the edge of order and chaos — recurs across neurons, cosmic webs, ecosystems, and language. Psyche-Net treats this as a *structural design commitment* (the psyche graph should behave like a small-world network near criticality; the cosmic-web visual is a claim, not decoration) — and refuses the unfalsifiable version ("as above so below explains everything"). The safeguard is the first clause: never assume certainty.

**The level-separation rule (critical for build).** The *dance* — adaptation, polymathic revision, comfort with flux — lives in the **architecture and the meta-level**. The *user-facing surface* is the opposite: calm, paced, grounded, bounded. A vulnerable person at 1 a.m. needs a stable floor and one clear next step, not a lesson in epistemic humility. **The architecture dances so the user doesn't have to.**

---

## 3. The structural laws (non-negotiable)

These are the constraints that make Psyche-Net itself rather than a generic journaling app. No feature may violate them; when a good idea collides with one (as the "addictive gamification" idea did), the idea is transmuted, not the law.

**LAW 1 — Evidence mandate (CORE-01).** Nothing exists on the map without citing the person's own words. Every node and edge traces to specific entries in the person's record. The map structurally cannot confabulate a psyche.

**LAW 2 — The citation gate (CORE-02).** The LLM *proposes* nodes/edges with mandatory quoted evidence; a deterministic validator checks every citation against the source text and rejects anything unverifiable; arithmetic (not the model) computes mass. Machine-checkable honesty.

**LAW 3 — Provenance-agnostic hypothesis nodes (LAW-HYP).** Nodes may enter from four doors — symbolic (birth chart / lens), intentional (a designed "becoming" quality), practitioner (a coach/therapist observation), or extracted (a candidate from the person's text) — but *only lived words confer mass*. Hypothesis nodes carry zero mass and are charged only by subsequent evidence. One gate, four provenances.

**LAW 4 — Words create; signals corroborate (LAW-SIG).** Only the person's language can create or charge a node. Voice tone, wearable/body data, and behavioral signals may strengthen, contextualize, or time what words have earned — never create or charge on their own.

**LAW 5 — Uncertainty is first-class (LAW-MAP).** Every rendered element carries visible confidence; the map always shows the edge of the unexplored (not blank, not falsely complete). Uncertainty is a visual citizen, never hidden.

**LAW 6 — Mastery mechanics, not casino mechanics (CORE-08 + AUTH-01).** Allowed: progress visibility, earned realization moments, integration milestones. Banned permanently: streaks that punish absence, variable-ratio reward schedules, any scoring of disclosure depth, leaderboards, social comparison of maps, daily-active-use as a north star. The product refuses addictive mechanics on principle — and says so, as a trust asset.

**LAW 7 — Safety & claims discipline (CORE-08).** On-device crisis classification; human-support routing; the wound layer is gated (strengths-forward by default, deep wound work in supervised skins only); minors excluded; and the product never claims to diagnose or treat — it is a self-knowledge and reflection instrument, forever, against all marketing pressure.

**LAW 8 — Privacy wall (CORE-06).** Cross-user learning happens only through a k-floored abstraction schema structurally incapable of holding individual identifiers or content. Deletion is a first-class feature. This is the most sensitive data a person can generate and is treated accordingly.

**LAW 9 — Entity & IP separation.** Psyche-Net is its own venture and its own codebase — never mixed with the founder's other entities' data or infrastructure. Modality-agnostic at the core (works *with* belief-change practices; dependent on none; any trademarked modality's name used in marketing only with permission).

---

## 4. The engine — the psyche-net data architecture

### 4.1 The graph model
Nodes are typed (wound, shadow, belief, protection, pattern, trait, resource, becoming, lens). Each node carries: `type`, `provenance` (extracted / lens / becoming / practitioner), `mass` (deterministic function of validated evidence), `state` (for the change machine), `confidence` (LAW 5), `evidence[]` (pointers to source entries), and rendering properties (position, luminosity, color). Edges are typed per the grammar — *drives, protects-from, expresses-as, rooted-in, reinforces, softened-by* — with strength, recency, and their own confidence.

### 4.2 The temporal substrate (build-vs-buy resolved)
Everything is an immutable, timestamped event (journal entry, worksheet answer, chart import, experiment result). This is event-sourcing, because the time-scrub and the change state-machine both require replaying history. **Substrate decision for v1: Postgres, full stop.** Per-person graphs are small (dozens to low hundreds of nodes), so plain relational node/edge/event tables are entirely sufficient, and `schema.prisma` is already committed to Postgres. **Graphiti (open-source temporal knowledge graph) is explicitly a post-pilot evaluation, removed from the critical path** — a substrate swap that could reverse the data layer in week 4 is a schedule landmine an eleven-week solo build cannot absorb. Graphiti's bi-temporal edges and fact-invalidation are attractive and our schema's shape doesn't preclude adopting them later, but the IP lives in our layers (the citation gate, evidence-mass arithmetic, the physics state machine, hypothesis-node law, the ontology), never the substrate — so the substrate choice is reversible and deferred by design.

### 4.3 The extraction/curation pipeline
New events queue into an async extraction pass (batched, not per-keystroke — cost and calm both favor this). The pass, as explicit bounded contexts (each independently testable and replaceable):

```
SourceEvent → ExtractionRun → CandidateGraph → CitationGate → VerifiedGraph → ProjectionWriter → Database → Renderer
  (immutable)   (proposer,      (proposed        (deterministic  (accepted +     (writes derived   (Postgres)   (cosmos.gl)
                 untrusted)      nodes/edges)      validator)      arithmetic)     graph state)
```

Concretely: (1) an LLM proposes candidate nodes/edges *with quoted evidence*; (2) the deterministic citation gate confirms each quote exists in the source and rejects the rest; (3) conservative, per-construct thresholds require recurring evidence before a node materializes (single mentions wait in the `ShadowCandidate` staging area); (4) arithmetic computes mass, recency-light, and state transitions. **The proposer is blinded to hypotheses** (lens/becoming/practitioner): when extracting native candidates it sees only the person's SELF-authored text plus existing extracted nodes — never the chart hypotheses — so lens "confirmation" can never be self-fulfilling (this protects the "shows you your chart being wrong" claim; it is a hard invariant, in `CLAUDE.md` and the gate spec). Humans are in the loop at two tiers: practitioner curation in supervised skins, and an internal review queue for safety-flagged material. Every pass is recorded as an `ExtractionRun` (provider, model, prompt/ontology/gate versions, cost) so the deterministic gate stage is replayable over persisted proposals. Per META-01, the pipeline is built to **self-calibrate** — periodically re-scored against a ground-truth eval corpus, reporting its own drift, re-benchmarked each model generation before promotion. *(The elaborate multi-stage runtime above is the target architecture; v1 may implement it as a simpler linear pass so long as the bounded-context seams exist for later separation.)*

### 4.4 The physics grammar (CORE-03) — the change state machine
Mass = evidential weight. Proximity = connection strength. Luminosity = recency/activity AND integration. The state machine per node: `active → loosening → transmutation-candidate → integrated`, driven deterministically by the evidence stream (countervailing evidence, decay, confirmation). Global **cumulative luminosity**: the whole sky brightens as integration accumulates — computed only from integration signals (loosenings, completed experiments, transmutations), never from journal sentiment (or users would perform positivity). Illuminated shadow becomes *crisp and defined, still present* — seen, not deleted. **Salience upgrade (from ecology lens):** a node's importance is cascade-centrality (how much of the graph would shift if it changed), not mass alone — so experiments target keystone beliefs.

### 4.5 The four input lanes (all under LAW 3 & LAW 4)
- **Native lane** — the person's journals, voice entries, worksheet answers → full evidence, creates and charges nodes.
- **Lens lane (LENS-01)** — birth-chart / symbolic data (Human Design, Western, etc.) → hypothesis nodes, zero mass, charged only by lived evidence; states: confirmed / contradicted / silent. The only product that shows you your chart being *wrong* about you.
- **Becoming lane (ASPIRE-01)** — the person's designed future qualities → seed/ember hypothesis nodes that *ignite* into real Resource nodes when lived evidence charges them. The "ultimate reward."
- **Archive lane (ARCH-01)** — historical journals/notes → mass-bearing evidence with original timestamps (builds the past of the time-scrub); clinician-authored notes enter as practitioner-hypotheses; temporal-honesty rule prevents resurrecting a former self.
- **Corroboration signals (LAW-SIG)** — voice prosody, opt-in wearable/EMA "Body lane" → annotate and time, never create.

---

## 5. The experience — what the user does

### 5.1 The first hour (INTAKE-01)
Governing rule: **each answer renders its consequence before the next question is asked.** Intake is the tutorial for the core loop, not a form.
- **Tier 0 (~1 min):** birth data → the ghost sky ignites (a populated, beautiful, honestly-labeled-hypothetical constellation). Cold start solved.
- **Tier 1 (~10–15 min, voice-first):** the **Seven Sparks** — high-yield prompts answered aloud (a shaping moment; a repeated pattern; what you'd protect; what people misunderstand; key relationships; what you're proud of; who you're becoming). Real nodes charge on screen as they speak; lens ghosts begin confirming or dimming.
- **Tier 2 (pull, never push):** archive upload and/or assessments, offered only after the Tier-1 win lands.
- **Stopping rule:** ~7±2 evidence-bearing nodes — personal enough to feel unmistakable, few enough to feel like a beginning. No wound-origin questions at intake, ever.

### 5.2 The core loop (FLOW-01 + MOVE-01): Reveal → Realize → Rehearse → Result
- **Reveal:** the person journals (voice or text), freely and unrewarded — honesty stays uncorrupted (LAW 6).
- **Realize:** when the citation gate validates a new node/edge/loosening, it fires as a **Realization Event** — the constellation animates, the thread draws itself, evidence one tap away. Dopamine from truth; can't be farmed.
- **Rehearse:** the person authors an **Experiment** targeting a node ("when X fires, I will Y instead"), with an if-then plan auto-drafted from that node's real evidence, plus a logged prediction + confidence %.
- **Result:** subsequent lived evidence charges or dims the experiment — the same citation gate judges it. Confidence tracked across repetitions renders as **visible belief-decay**. Ceremonies close 2–4 week cycles.
- **Rhythm:** bounded 5–10 min sessions that end cleanly; ≤1 daily nudge; a weekly "Sky Shift" digest as the appointment mechanic. The open loop that pulls returns is the person's own running experiment in their life — not a manufactured cliffhanger.
- **Nested reward horizons (the ever-expanding win):** charge-ticks (micro) → experiment results & loosenings (meso) → ignitions & transmutations (macro, ceremonial) → cumulative luminosity & anniversaries (meta). The trophy room *is* the map; it never resets. Each ignition unlocks a new becoming-seed slot — winning opens new frontier.

### 5.3 The reframe on "results" (jazz lens)
The endgame is not installing a better fixed program; it is becoming a fluent improviser with your own material — increased range and responsiveness. This is both a healthier north star and a more honest claim than "we fixed your beliefs," and it governs all outcome language.

---

## 6. Go-to-market — the converged strategy

### 6.1 The wedge (BEACH-01): PSYCH-K practitioners, September 23
The strongest first cohort the venture has, for a structural reason: a belief-change balance produces a specific new belief statement, which *is* a becoming node — and the community's unmeasured gap ("did the balance hold?") is exactly what Psyche-Net answers natively (belief statement → becoming node → weeks of the person's own words charge or dim it → visible belief-decay). Plus founder-market fit (Jacob is an insider) and a training on **September 23** that doubles as a design-partner recruiting event.
- **Pitch:** *the instrument that shows your client's new belief taking hold, in their own words.*
- **Guardrails:** modality-agnostic core; measures outcomes in lived words, never mechanisms (neither validates nor disputes any modality's theory of change); PSYCH-K name in marketing only with permission; design partners still pay (willingness-to-pay is the assumption under test).
- **A tension named honestly (not a flaw, but don't pretend it away):** this section argues PSYCH-K is the ideal wedge *because* the product is shaped to its mechanism (a balance produces a belief statement, which *is* a becoming node). That means the v1 core is more PSYCH-K-shaped than "modality-agnostic" fully admits — which is fine, if named: modality-agnostic is a v2 architectural aspiration, not a v1 claim to make loudly to this audience. Relatedly, the jazz reframe (§5.3 — the endgame is fluent improvisation, not "we fixed your beliefs") pulls against the concrete practitioner pitch ("see the balance *hold*"). For September, let the practitioner surface lead with the **concrete** (belief-decay, balance-held) and hold the jazz reframe as the deeper philosophy behind it, not the front-line pitch. Both tensions are healthy; both should be conscious.

### 6.2 The dual product (IDEA-007)
- **Practitioner instrument** — *"Meet your client before you meet them."* Client completes intake (+ optional archive) before session one; practitioner walks in with a curated draft constellation. The discovery report is also the demo — a low-cost/free Client Discovery tier funnels the full suite.
- **Solo program (PROGRAM-01)** — a *program wearing an app*: Seasons (6–12 week guided arcs, the SKU), map-dripped micro-curriculum, tiered human touchpoints (circles → marketplace bridge to certified practitioners), and measured outcomes (validated wellbeing self-reports + integration metrics) so "real results" is substantiated internally and claims-disciplined externally.

### 6.3 The growth engine (GROWTH-01), sequenced
Practice licensing now (co-branded, never white-label) → pedigreed **Founding Constellation** seeding *after* pilot data exists (credibility over reach; budget for 2–3 real advisor arrangements) → referral engine last, **gated behind practitioner certification** (never an open affiliate marketplace — that invites overpromised-healing claims, FTC exposure, and an MLM odor that would poison the trust moat). The flywheel: individuals discover → some bridge to certified practitioners → practitioners bring their clients → mature cohorts form circles. Each market distributes the other.

### 6.4 The moat (converged)
Ranked by durability: clinical-trust & safety reputation → practitioner workflow embed + certification community → the eval-corpus & extraction craft (trade secret) → the k-floored pattern library (slow data effect) → patents (defensive) → brand. Not on the list: the technology itself (the substrate is commodity; the IP is our layers). The deepest, doubly-sourced moat is **epistemic humility** — the instrument that shows what it doesn't know, in a category full of confident oracles.

### 6.5 IP candidates for counsel (not legal advice; a registered patent attorney + prior-art search required)
The unified framing is strongest: **"graph nodes of arbitrary provenance whose state transitions are computed exclusively from citation-validated longitudinal evidence"** (folds the citation gate, evidence-mass, hypothesis-node law, experiment outcomes, and belief-decay telemetry into one method family). Secondary: the k-floored abstraction-transfer architecture (likely better as trade secret); the self-revising ontology mechanism. Trademark the name and the constellation visual identity.

---

## 7. v1 SCOPE — the minimum lovable prototype for September 23

The demo must make one person, live, feel the core magic: *"it heard me, and the sky is mine."* Everything else is cut. Under META-01, v1 uses a **fixed ontology with a logging mechanism for candidate new types** (self-revision is a post-pilot engine capability), and adopts the two cheapest high-value LENS-KIT upgrades — **uncertainty rendering (LAW 5)** and **oral-history question craft (CORE-07)** — deferring cascade-centrality and self-calibration to post-pilot.

### IN for v1 (the spine, end to end)
1. **Intake (INTAKE-01):** Tier 0 birth-data ghost sky + Tier 1 Seven Sparks (voice-first, with text fallback).
2. **The extraction pipeline (CORE-02) with the citation gate (LAW 2):** propose → validate → arithmetic mass. This is the irreducible core; if only one thing works, it is this.
3. **The constellation (CORE-03)** rendered with **`@cosmos.gl/graph`** (MIT): mass, luminosity, confidence, hypothesis-vs-native rendering, tap-for-evidence. Basic loosening animation.
4. **Becoming nodes (ASPIRE-01):** design a quality → seed in the sky. (Ignition can be demoed via seeded/simulated evidence for the pilot.)
5. **The core loop (FLOW-01):** journal (voice/text) → Realization Event → author one Experiment with prediction + confidence. Belief-decay chart as the practitioner-facing "wow."
6. **Practitioner view (BEACH-01/SEED-T):** per-client becoming nodes with charge status — the session-prep screen and the pitch made literal.
7. **Safety floor (LAW 7):** crisis keyword classifier + support-resource surfacing (on-device if feasible; server-side acceptable for a closed pilot). Non-negotiable even in a demo.
8. **The pre-seeded longitudinal demo account (the pitch made visible, not asserted).** The live 10-minute self-intake sells *"it heard me"* — but the practitioner pitch (§6.1) is belief-decay *over weeks*, which a live first-touch structurally cannot show. So v1 must include a second demo surface: a clearly-labeled fictional client with ~6 weeks of entries and a belief node visibly decaying across them. Without this, the hero demo sells the solo self-mapping experience (which the venture sequences *last*) while under-showing the supervised client instrument that is the actual wedge. Two surfaces: the live intake sells "it heard me"; the seeded account sells "here's what you've never been able to see in your clients." Both are required; only the first was originally planned.

### OUT for v1 (deliberately deferred, logged so nothing is lost)
Group resonance field (CORE-05); full archive-lane OCR/batch (manual paste acceptable for demo); wearable/Body lane; cross-system convergence scoring (ship HD + Western natal only, or even HD only); the marketplace, circles, certification, referral engine; self-revising ontology; error-bar self-calibration; cumulative-luminosity global arc (per-node light is enough for the demo); Seasons infrastructure (the *concept* is shown; the scaffolding comes later).

### The cut-line (what falls off first if the schedule slips — decide now, while calm)
IN/OUT says what's excluded; it does not say what falls first if week 5 slips. For a solo builder with a hard date, this ordered fallback is the most useful thing to have written *before* the pressure. Strip inward from the bottom:
1. **First to cut:** voice-first intake → text-only intake (removes the STT-in-a-noisy-room risk entirely; see §7 voice note). The seeded account (#8) becomes the hero if live intake is fragile.
2. **Then:** the live self-intake's real-time extraction → a *scripted* live intake on 2–3 pre-tested inputs that reliably produce a good sky. Still "their words, live," but de-risked.
3. **Then:** becoming-node *design UI* → becoming nodes pre-created in the seeded account only (design flow deferred).
4. **Then:** the loosening animation and cosmos.gl physics polish → static-but-honest constellation rendering.
5. **Never cut (the irreducible core):** the citation gate + a constellation that renders a real sky from real words + the seeded longitudinal account + the safety floor. If only these four survive, the §7 success test can still be met via the seeded account plus a controlled live moment. Below this line there is no demo.
**Rule:** cut top-down, and never let a cut breach the "never cut" line — if you're there, the honest move is to move the date, not ship something that violates a law to hit it.

### The demo's single success test
A PSYCH-K practitioner at the training does a 10-minute intake on their own phone, watches their sky build from their own spoken words, designs one becoming node, and says some version of *"I need this for my clients."* That sentence is the entire goal of September 23.

### 7.1 Pre-pilot governance bundle (deferred findings log)

*Findings whose harm requires real users to manifest are deferred HERE, verbatim, by the REVIEW-01 reconciliation charter — they block piloting, not building. Nothing on this list may be silently dropped; each must be resolved before any real user's journal enters the system.*

- **[proposer-spec r1 · ChatGPT #12] Language gating method is unnamed.** "supportedLanguages = ['en']" is stated, but the detection method is not. Rejections could be inconsistent or exploitable (e.g., adversarial Unicode to bypass). Action: state the detector (fastText/CLD3 or a deterministic heuristic) and the confidence threshold, and add tests for obvious non-English entries.
- **[proposer-spec r2 · ChatGPT #18] Third-party clarity to the end-user.** Specify the user-facing copy when a candidate is flagged/rejected for third-party reasons and where it appears (e.g., review queue vs. silent drop). Honest UX prevents confusion.
- **[proposer-spec r1 · ChatGPT #8 remainder] Chunking guarantees not fully specified.** §12 claims "quotes never split across chunks where avoidable," but no algorithm is defined; source-ID/offset mapping across chunks is unspecified. Action: specify the chunking algorithm (paragraph split, minimum token window, overlap), per-chunk sourceEventId + original absolute offsets, gate mapping against the original SourceRecord, and a boundary-quote fixture. (The v1 quote-transparency invariant and offsetHint-rebase rule already landed in proposer spec v1.2 §4; this item is the full batching schema.)

---

## 8. THE BUILD — Claude Code kickoff runbook

**Philosophy for the build itself (META-01 applied to engineering):** start from what exists, keep the ontology and pipeline loose and revisable, vendor open-source aggressively, and optimize for the capacity to keep changing — not for a "finished" v1. Small, composable modules; the citation gate and the graph model are the load-bearing walls; everything else is remodelable.

### 8.1 Repository setup (run in your environment — Claude Code or terminal)
> These are the exact commands. Replace `<YOUR-GH>` with your GitHub username/org. This assumes `valentinaapp` is the repo to seed from and `psyche-net` is the empty target you created.

```bash
# 1. Clone both repos side by side
git clone https://github.com/<YOUR-GH>/valentinaapp.git
git clone https://github.com/<YOUR-GH>/psyche-net.git
cd psyche-net

# 2. Seed psyche-net SELECTIVELY from valentinaapp (a conscious decision, not a default).
#    Keep the genuinely reusable scaffolding — Next.js shell, auth, Railway/deploy
#    config, UI primitives. Build the ENGINE (event store, citation gate, graph model)
#    FRESH against the specs. Reason: valentinaapp was almost certainly NOT built around
#    an event-sourced, citation-gated core, so inheriting its data-model assumptions
#    wholesale means spending week 1 fighting code that contradicts CLAUDE.md invariant #1.
#    A wholesale rsync is a false economy here.
#    Copy only the directories you've decided are reusable, e.g.:
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' \
      --exclude='dist' --exclude='build' \
      ../valentinaapp/app ../valentinaapp/components ../valentinaapp/lib/auth \
      ../valentinaapp/package.json ../valentinaapp/next.config.js \
      ../valentinaapp/railway.json ./  2>/dev/null || true
#    (Adjust paths to valentinaapp's actual structure. Do NOT copy its data layer,
#    schema, or domain models — those are built fresh.)

# 3. Commit the seed as the clean starting point
git add -A
git commit -m "seed: selectively copy valentinaapp scaffolding (shell/auth/deploy only)"

# 4. Vendor the MIT-licensed cosmos.gl graph engine
npm install @cosmos.gl/graph
#    IMPORTANT: install ONLY @cosmos.gl/graph (MIT). Do NOT install
#    @cosmograph/cosmograph — it is CC-BY-NC-4.0 (non-commercial) and
#    would require a paid license for a commercial product.

# 5. (optional, for reference while building the renderer) shallow-clone the source
git clone --depth 1 https://github.com/cosmosgl/graph.git vendor/cosmos-gl-reference

git add -A && git commit -m "chore: add @cosmos.gl/graph (MIT) rendering engine"
```

### 8.2 Open-source stack at our disposal (all permissively licensed unless noted)
- **`@cosmos.gl/graph`** (MIT) — GPU force-graph rendering. The constellation. ✅ commercial-safe. *(Avoid the `@cosmograph/cosmograph` wrapper — non-commercial license.)*
- **Graphiti** (open source) — temporal knowledge-graph substrate, **post-pilot evaluation only** (removed from the v1 critical path; see §4.2). Not a v1 dependency.
- **Postgres + Prisma** — the v1 event store and graph model, committed (you already know this stack from Villa Siesta). This is the substrate, full stop, for the demo.
- **Next.js** (your existing stack, carried from valentinaapp) — app shell.
- **Web Speech API / Whisper-class STT** — voice journaling (LAW-SIG native lane). Browser STT for the demo; server Whisper later.
- **Transformers.js / WebLLM (+ WebGPU)** — on-device crisis classification and PII scrubbing (LAW 7 / privacy).
- **astrology-api.io** (already researched; MCP server + OpenAPI) — the lens lane. HD + Western natal for v1.
- **An LLM API** for the extraction proposer (the citation *validator* is deterministic code, not a model — that's the point).

### 8.3 First build milestones (suggested order for Claude Code)
1. **Data model first** — implement the node/edge schema (§4.1) and the event store (§4.2). Everything hangs off this.
2. **The citation gate (§4.3)** — the deterministic validator + mass arithmetic. Build and unit-test this before any UI; it is the product's integrity.
3. **The extraction proposer** — LLM call that returns candidate nodes/edges with quoted evidence, fed through the gate.
4. **The renderer** — `@cosmos.gl/graph` constellation reading from the graph model; hypothesis-vs-native styling; tap-for-evidence; confidence rendering (LAW 5).
5. **Intake flow (§5.1)** — Tier 0 chart call + Tier 1 Seven Sparks, each answer rendering its consequence.
6. **The loop (§5.2)** — journal → Realization Event → one Experiment with prediction/confidence → belief-decay chart.
7. **Practitioner view + safety floor** — session-prep screen; crisis classifier.

### 8.4 A `CLAUDE.md` for the repo (paste into psyche-net root so Claude Code inherits the stance)
> Create `psyche-net/CLAUDE.md` with the project's non-negotiables so every coding session stays aligned:
- Build under META-01: loose, revisable, composable; optimize for changeability, not a "finished" v1.
- The nine structural laws (§3) are inviolable. The citation gate (LAW 2) and evidence mandate (LAW 1) are the load-bearing walls — never let a node exist without validated evidence.
- Use `@cosmos.gl/graph` (MIT) only; never add `@cosmograph/cosmograph` (non-commercial).
- Uncertainty is always rendered (LAW 5). Never ship a confident oracle.
- No casino mechanics, ever (LAW 6). No streaks, no variable rewards, no disclosure scoring.
- Safety floor is required even in demos (LAW 7).
- This is its own entity — no cross-contamination with other projects/data (LAW 9).

---

## 9. The September 23 plan (≈10 weeks out)

**Blocking pre-conditions (resolve BEFORE trusting the 10-week clock).** The entire plan's spine is the September 23 date, which rests on two things the plan must not treat as settled: (a) **confirmed standing to demo** at the PSYCH-K training (are you presenting, or attending? can you run live demos there?), and (b) **permission to use the PSYCH-K name** in any recruiting material (§6.1's own guardrail requires it; Ledger OQ9 is open). If either is unsecured, the dated wedge is at risk and the timeline is built on sand. These are go/no-go gates, not GTM niceties — resolve them first.

**Two co-equal risks, not one.** §10 names extraction fidelity as the core risk — true for whether the product *works*. But the risk most likely to determine whether *September 23 happens* is **schedule**: a solo, non-technical operator building the full spine (data model → gate → proposer → renderer → intake → loop → practitioner view → safety floor) plus voice STT, the lens API, becoming nodes, belief-decay, and a crisis classifier in ~10 weeks — when the Venture Exploration's own *narrower* MVP was budgeted at months 2–8. Some compression is legitimate (this is a demo, not a pilot), but delivery risk is co-equal with technical risk, and the §7 cut-line exists precisely because of it. Treat the cut-line as a living instrument, re-checked weekly.

**Weeks 1–2 — Foundation.** Repo selectively seeded; data model + event store; citation gate built and tested; LLM proposer wired (blinded to hypotheses); extraction producing validated nodes from pasted text. *Riskiest assumption tested first: does the pipeline produce a map a person recognizes as true of them?* If not, everything downstream is premature — this is the week to find out.

**Weeks 3–5 — The sky & the loop.** cosmos.gl renderer live; intake Tier 0 + Tier 1; the core loop (journal → realization → experiment → belief-decay). Voice journaling in.

**Weeks 6–7 — Practitioner surface & polish.** Session-prep view; becoming-node design; safety floor; the seeded longitudinal demo account (§7 IN #8) built and rehearsed; the demo script rehearsed on real people (not the team). **Rehearse voice intake in a deliberately noisy, multi-speaker room** — a training hall is the worst case for browser STT, and a live transcription error corrupts the exact "it heard me" payload that is the demo. Decide from that rehearsal whether voice is the *hero* path or the "try-it-yourself" path with a controlled narration as the hero (this is also cut-line item #1).

**Weeks 8–9 — Pilot-hardening.** Fix what real test users break; ensure the *first ten minutes* are flawless (that's all the training audience will see); prepare the paid design-partner offer and a one-page ROI framing. **Write the one-page demo-day safety protocol:** the Seven Sparks deliberately open real material ("a shaping moment," "what you'd protect"), so real distress may surface in the room. Name a human support target present at the event, decide what the on-screen resource surfacing says, and plan how a distressed participant is handled discreetly. The classifier is necessary, not sufficient — a human protocol is the rest of the obligation (and the venture's stated ethics stance).

**Week 10 / Sept 23 — The training.** Live demos; recruit 10–15 paying design partners; capture feedback as structured input for the next ledger cycle.

### Optimization & network-leverage strategy for the training
- **Demo on *their* phone, with *their* words** — the founder-market-fit magic only lands first-person. Pre-load nothing; let them watch their own sky build.
- **Lead with the outcome gap, not the tech** — "you never get to see if the balance held; this shows you, in their own words." Sell the belief-decay chart.
- **Recruit design partners, not customers** — frame it as shaping the instrument for their field; paid but discounted; credibility-first names prioritized (they become the Founding Constellation and the first certified cohort).
- **Capture everything as ledger input** — every objection, feature request, and "can it also…" is IDEA-011+ material. The training is a data-collection event for the meta-map, fully in the spirit of META-01.
- **Respect the guardrails on-site** — modality-agnostic language, outcomes-not-mechanisms, no clinical claims. The discipline *is* the differentiator in a room full of practitioners tired of overpromising tools.

---

## 10. Verdict & the one thing that matters most

The concept is converged and coherent: one engine, nine laws, four input lanes, one loop, three products, a wedge with a date. The architecture and the philosophy are the same shape — a living, evidence-bound, uncertainty-honest graph that improves its own navigation — which is why it holds together.

The single thing that most determines whether the product **works**: **extraction fidelity under the citation gate.** If a person reads their auto-built sky and says *"yes — that's me, in my own words,"* everything else in this document becomes worth building. If they don't, no amount of beautiful physics rescues it. So build the gate first, test it on real journals first, and let that result tell you whether the rest of the plan earns its September.

Its co-equal — the thing that most determines whether **September 23 happens at all** — is **delivery/schedule**, for a solo non-technical builder on a hard date. These are different risks and the plan treats both as first-class: extraction fidelity is tested in week 1–2 (fail fast), and the §7 cut-line + the blocking pre-conditions in §9 exist so the date is protected by conscious triage rather than week-8 panic. If the cut-line ever reaches the "never cut" floor, the honest move is to move the date, not to ship something that breaks a law to hit it.

Build the instrument. Keep it honest. Let their life be the only judge.

*— End of convergence pass v1.1. This document is provisional and will be revised as the build and the pilot teach us what the map got wrong.*
