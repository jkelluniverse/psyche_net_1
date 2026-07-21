# PSYCHE MAP — IDEA LEDGER & META-MAP
### A living constellation where the entity being mapped is the Psyche Map itself

**How this works:** Every idea you feed in gets recorded as a node with a permanent ID, typed edges to existing nodes, an honest mass assessment (how much evidence/leverage it carries), open questions, and any seed-ideas it spawns. Nothing is deleted — weak ideas loosen, they don't vanish. The goal state: a converged, ultra-connected, buildable concept.

**Session note:** This file lives in this conversation. To continue in a future session, re-upload this file and we pick up exactly where we left off.

---


**GOVERNING STANCE:** This ledger runs under **META-01 — Polymath Navigation, Macro-Micro Structure** (full entry below the idea log). Every module is held as provisional, revisable, and evidence-answerable. Never assume certainty.

## THE META-MAP — CURRENT STATE

**Core entity (the gravity well):** THE PSYCHE MAP — an evidence-bound, longitudinal graph of a person's inner architecture where healing is visible as physics.

**Established nodes (from the venture exploration):**
| ID | Node | Type |
|---|---|---|
| CORE-01 | Evidence mandate (every node cites the person's own words) | Structural law |
| CORE-02 | Extraction pipeline (LLM proposes → citation gate validates → arithmetic decides mass) | Engine |
| CORE-03 | Physics grammar (mass/gravity/light; loosening → transmutation state machine) | Interface law |
| CORE-04 | Segment skins (coach / therapist / solo / group) | Product structure |
| CORE-05 | Group resonance field | Product module |
| CORE-06 | Privacy wall (k-floored abstraction schema) | Structural law |
| CORE-07 | Deepening engine (paced, safety-railed questioning) | Engine |
| CORE-08 | Safety layer (crisis classifier, human routing, claims discipline) | Structural law |
| CORE-09 | Cold-start problem (the map is empty on day one) | Known weakness |

---

## IDEA-001 — Symbolic Chart Ingestion via API (the Lens Layer)
**Date:** 2026-07-12 · **Source:** Jacob · **Status:** Active, high mass
**Raw idea:** API input of comprehensive charts (astrology-api.io Human Design bodygraph and every other modality on the site) as person-data feeding the individual's psyche map, toward a more powerful understanding and application of the self.

### What the API actually offers (verified 2026-07-12)
astrology-api.io: 100+ endpoints, ~300ms responses, Swiss Ephemeris precision, OpenAPI specs per namespace. Relevant modalities: **Human Design** (full bodygraph: type, authority, profile, centers, gates, channels + SVG rendering + transit overlays, spec at `/openapi/human-design.json`); **Western astrology** (natal, transits, progressions, solar/lunar returns, Sabian symbols, archetypes endpoint); **Vedic** (27 nakshatras, 16 divisional charts, Vimshottari Dasha — a full 120-year timing timeline); **Chinese** (BaZi four pillars, Zi Wei Dou Shu, luck pillars); **Numerology** (life path, destiny, personal year cycles); plus an **Astrology Chat API with pre-summarized, LLM-ready chart context** and an **MCP server** — both directly compatible with our extraction pipeline. Pricing is trivial at our scale: $11/mo for 1,000 requests, $37/mo for 55,000; charts are computed once per person, so even the free tier covers early development.

### The core design decision this idea forces: TWO-LANE EPISTEMICS
This is the make-or-break architecture point. The Psyche Map's spine is the evidence mandate (CORE-01): nothing exists on the map without the person's own words. Chart data is *not* evidence about the psyche — it is symbolic/archetypal content derived from a birth timestamp. If chart output flows into the same lane as journal evidence, the map's integrity — and its entire safety and trust story — collapses. So charts enter through a second lane:

**Lens nodes (new node class).** Deterministic, computed once from birth data, rendered visually distinct (suggestion: wireframe/ghost bodies vs. the solid evidence-earned bodies). A lens node has **zero mass at birth and can never gain mass from the chart itself.** It carries a different property: **resonance**, which only the person's lived data can charge.

### The genuinely novel feature this unlocks: THE SYMBOLIC CROSS-VALIDATED AGAINST THE LIVED
Every HD app, astrology app, and Gene Keys tool on earth delivers the chart as *pronouncement*. We deliver it as *hypothesis* — and then the person's own longitudinal data votes. Each lens node lives in one of three states:
- **Confirmed** — the person's journals/patterns independently echo it (e.g., chart says undefined emotional center; six months of entries show absorbing others' moods). The lens node brightens and links to its evidence, exactly like a native node.
- **Contradicted** — lived evidence opposes it. The lens node visibly dims/fractures. We are, to my knowledge, the only product that would ever *show a user their chart being wrong about them* — which paradoxically makes the confirmations trustworthy and is a category-level differentiator.
- **Silent** — untested. Rendered as open question, and fed to CORE-07 as gentle inquiry material.

This converts the esoteric layer from a credibility liability into an epistemically honest instrument: "here is what the symbolic systems predict about you; here is what your own life actually shows." Nobody does this. It also gives the clinical skin a defensible story if it ever wants a softened version ("archetypal hypothesis generation"), though default stays OFF for therapists per CORE-04.

### Four concrete product powers
1. **Cold-start solved (kills CORE-09).** Day one, before a single journal entry, the person enters their birth data and receives a full night sky of ghost-lens nodes — a beautiful, populated, personalized map that is honestly labeled as *unverified hypothesis*. The onboarding narrative writes itself: "Here is the map the symbols predict. Now let's find out who you actually are." Every journal entry thereafter visibly charges, dims, or ignores lens nodes — making the evidence mandate *felt* from the first week.
2. **The deepening engine gets a question bank (feeds CORE-07).** Chart features become paced, optional inquiries, not statements: undefined emotional center → "Some people notice they take on the moods around them. Is that familiar?" Gate/channel themes, life path numbers, nakshatra qualities — all become question generators. The chart never tells; it only asks.
3. **A temporal trigger layer (new capability).** Transits, dashas, personal-year cycles give the product a *calendar*: time-based reflection prompts ("this month touches the part of your chart about X — anything stirring there?"). And — the spicy part — the system can score these *retroactively against the person's actual data*: did mood/pattern shifts in your journals correlate with your transits, or not? Personal, private, empirical. No product has ever let a person test astrology against their own longitudinal record.
4. **Cross-system convergence scoring (the "ultra-connected" move).** Pull HD + Western + Vedic + BaZi + numerology for one person and detect where *independent symbolic systems converge on the same theme*. A theme flagged by three unrelated systems gets a higher prior as a lens node than a theme flagged by one. Convergence detection across modalities is itself a distinctive engine feature — and a natural extraction-pipeline job, since the Astrology Chat API already ships LLM-ready summaries.

### Cautions (recorded with equal weight)
- **Barnum effect:** symbolic statements are engineered to feel true of everyone. Mitigation: the confirmation threshold for lens nodes must be *stricter* than for native nodes — resonance requires specific, recurring, citable evidence, not vibes.
- **Determinism/identity fixation:** "my chart says I am X" is the lens-layer version of "I am my wounds." Mitigation: contradicted-state visibility, hypothesis language everywhere, lens nodes never appear in the wound layer at all.
- **Segment skins hold:** lens layer ON by default for coach/solo skins, OFF by default (hard) for clinical. Non-negotiable per the venture doc's claims-discipline logic.
- **Vendor dependency:** single API vendor for a core onboarding feature. Mitigation: their OpenAPI specs make an abstraction layer cheap; Swiss Ephemeris self-hosting is a known fallback; charts are computed once and stored, so an outage never breaks existing users.
- **Data note:** birth date/time/place is PII and quasi-special-category in context. It joins the existing GDPR Art. 9 posture; no new regime, but it goes in the DPIA.

### Edges added to the meta-map
- IDEA-001 —**extends**→ CORE-02 (new ingestion source class + convergence job)
- IDEA-001 —**constrained-by**→ CORE-01 (two-lane rule; evidence mandate stays pure)
- IDEA-001 —**resolves**→ CORE-09 (cold start)
- IDEA-001 —**feeds**→ CORE-07 (question bank)
- IDEA-001 —**skinned-by**→ CORE-04 (per-segment defaults)
- IDEA-001 —**expresses-as**→ CORE-03 (ghost-body rendering; resonance charge as light)

### Seeds spawned (unclaimed ideas this one suggests — grab or discard later)
- **SEED-A:** Do confirmed-resonance statistics across users belong in the pattern library? ("Undefined emotional centers confirm at 61%, contradict at 22%") — potentially the first large-scale empirical dataset on these systems. Powerful, controversial, needs the ethics treatment before touching.
- **SEED-B:** Group field + synastry/composite endpoints — a symbolic lens layer for the *space between* people, feeding CORE-05 under the same two-lane rule.
- **SEED-C:** The temporal trigger layer generalizes beyond charts — any calendar (seasons, anniversaries detected in journals) could drive reflection timing.

---

## IDEA-002 — Gamified "Addictive" Self-Exploration → transmuted into THE AUTHORSHIP LOOP
**Date:** 2026-07-12 · **Source:** Jacob · **Status:** TRANSMUTED — raw form rejected, gift form adopted as new core module
**Raw idea:** A gamified, social-media-esque, "addictive," highly engaging means of self-exploration that drives users into more vulnerable sharing to achieve a richer map; instant gratification via new connections and realizations; the more they reveal, the more they see the map build; personalized feedback and real implementation strategies along the way; guiding people to become the author of their lived experience (only possible after illuminating unconscious drivers). People getting hooked on self-improvement.

### The collision (recorded honestly)
The raw form conflicts directly with CORE-08 and the venture doc's solo-product conclusion ("refuse engagement-maximizing mechanics in solo mode entirely"). Three specific mechanisms make the raw form unbuildable:
1. **Rewarding disclosure depth is the dark-pattern version of this product.** Variable-reward loops applied to trauma disclosure = engineered destabilization. It is also the exact viral-headline kill shot named in the risk register ("an app addicted me to reopening my wounds").
2. **Goodhart corruption of the evidence lane.** The moment vulnerability is scored, people perform vulnerability. Performative depth is fake data — it pollutes CORE-01/CORE-02 at the source. An incentive to reveal is an incentive to fabricate, and the map's entire integrity rests on unincentivized honesty.
3. **Insight addiction is a real failure mode, not a win.** "Hooked on self-awareness" without integration is rumination with a progress bar — endless excavation, identity fusion with the wound layer, no life change. Engagement metrics would call this success while the person gets worse.

### The gift inside it (what survives transmutation — and it's substantial)
Strip the casino mechanics and the raw idea contains two things the concept genuinely lacked:

**1. The reward already exists and is legitimate — make it felt.** The map visibly building IS instant gratification, and it's *aligned* gratification: the reward and the insight are the same object. Formalize this as **Realization Events** — when the extraction pipeline validates a new node, edge, lens-confirmation, or loosening transition, it's delivered as a *moment*: the constellation animates, the new thread draws itself, the evidence is one tap away. Dopamine from truth, not from points. This extends CORE-03 (the physics grammar becomes the reward system) and costs nothing in safety because realizations can't be farmed — they only fire when the citation gate passes.

**2. The Authorship Arc — a genuine new core module (AUTH-01).** Jacob's framing "become the author of your lived experience, only possible after illuminating unconscious drivers" gives the product the *endgame* it was missing. The venture-doc product is contemplative: map, understand, loosen. The authorship arc adds the second act: **from reading your program to writing it.** Concretely, a new first-class graph object: the **Experiment** — an authored pattern the person commits to trying ("when the abandonment node activates, I will name it aloud instead of withdrawing"). Experiments attach to the nodes they target, run for a defined window, and then — here's the beauty — **their outcomes are judged by the same evidence lane as everything else.** If subsequent journals show the new pattern taking hold, the experiment gains mass and can mature into a Resource node; the targeted wound's loosening arc accelerates on real evidence. If not, it dims honestly. This closes the insight-to-action gap that kills every journaling app, gives implementation strategies a home in the graph itself, and creates the only progression system this product should ever have: **progress = integration, measured in lived evidence.**

### The design law this idea produces: MASTERY MECHANICS, NOT CASINO MECHANICS
Adopted as a standing rule (extends CORE-08):
- **Allowed:** progress visibility; realization-event moments; milestones tied to integration and completed experiments; the time-scrub as "look how far you've come"; a weekly "your map shifted" digest; celebration of transmutation events (rare, earned, meaningful).
- **Banned, permanently:** streaks that punish absence; variable-ratio reward schedules; any scoring of disclosure depth or volume; social comparison of maps; leaderboards; FOMO notifications; daily-active-use as a north-star metric. The product's public stance — "we refuse addictive mechanics on principle" — is itself a trust asset and a differentiator worth marketing.
- **The loop, named:** *Reveal → Realize → Rehearse → Result.* Journal freely (unrewarded) → realization events fire when the map genuinely grows → author an experiment → lived results feed back as evidence. **The loop rewards completion of the cycle, never depth of the wound.** "Hooked on self-improvement" becomes real precisely here — hooked on running experiments on your own life and watching them verifiably work.
- **Anti-rumination governor:** the app monitors its own insight-to-action ratio per user; heavy excavation with zero experiments triggers gentle redirection toward authorship (and, in supervised skins, a practitioner signal). The product actively resists being used as a rumination machine.
- **"Social-media-esque" resolves into CORE-05:** resonance-without-exposure is the only social layer. No public maps, no likes on wounds, ever.

### Edges added to the meta-map
- IDEA-002 —**conflicts-with**→ CORE-08 (raw form; tension resolved by transmutation)
- IDEA-002 —**transmutes-into**→ AUTH-01 (Authorship arc — new core module: Experiments, Reveal→Realize→Rehearse→Result loop, anti-rumination governor)
- IDEA-002 —**expresses-as**→ CORE-03 (realization events as the native reward system)
- IDEA-002 —**constrained-by**→ CORE-01 (no incentives on disclosure; evidence lane stays unincentivized)
- AUTH-01 —**judged-by**→ CORE-02 (experiment outcomes validated by the same citation gate)
- AUTH-01 —**connects-to**→ IDEA-001 (temporal triggers can time experiments; lens confirmations count as realization events)

### Seeds spawned
- **SEED-D:** Experiments as a patent-candidate mechanism — "behavioral experiment objects whose outcome state is computed from citation-validated longitudinal evidence" pairs naturally with Candidate 1; flag for counsel.
- **SEED-E:** Insight-to-action ratio as a published wellbeing metric — the anti-engagement stance as brand ("the app that wants you to need it less").
- **SEED-F:** Practitioner skin: coaches assign/co-author experiments between sessions — this may be the single stickiest practitioner feature yet identified (homework that grades itself from the client's own words).

---

## IDEA-003 — Illumination + the Designed Psyche → THE BECOMING MAP
**Date:** 2026-07-12 · **Source:** Jacob · **Status:** Adopted with one design law and one partial correction
**Raw idea:** As they illuminate more shadow, their map gets lighter. A "new program map" where the user designs the type of psyche they want, and via consistent implementation of new beliefs, feels their new psyche growing — the ultimate reward.

### Part 1 — "The map gets lighter" (sharpens CORE-03, with one correction)
The loosening/transmutation physics already brighten individual nodes; this idea adds the missing *global* arc: **cumulative luminosity** — the whole sky perceptibly brightening as integration accumulates across the map, so long-term progress is atmospheric, not just node-by-node. Adopted. Two guardrails come with it:
- **Light = seen, not gone.** Jungian correction: shadow illuminated is shadow *integrated*, not deleted. An illuminated shadow node doesn't vanish or turn white — it goes from murky/blurred to crisp and defined, luminous but still present, still itself. "Lighter" must never read as a moral gradient where a dark map means a bad person; a new user's dim sky is *unexplored*, not *broken*. The onboarding language and rendering both carry this.
- **Goodhart guard on lightness.** If luminosity responded to journal *sentiment*, users would chase it by performing positivity — the IDEA-002 corruption in pastel. Law: illumination is computed exclusively from integration signals (validated loosening transitions, completed experiment outcomes, transmutation events) — never from the emotional tone of entries. You cannot brighten your sky by writing happy; only by living differently, verifiably.

### Part 2 — The Designed Psyche → BECOMING NODES (new module ASPIRE-01)
This is the structural discovery of the session: **the mechanic already exists.** IDEA-001 invented hypothesis nodes charged only by lived evidence (lens nodes, from birth charts). The designed psyche is the *same class with a different provenance*: **Becoming nodes** — the person architects the beliefs, capacities, and patterns of who they intend to be; each renders as a seed/ember (visually distinct from both solid native bodies and wireframe lens ghosts), carries zero mass, and can only be charged by evidence of that quality actually showing up in the person's lived record. Experiments (AUTH-01) are the construction crew: each experiment targets a becoming node, and validated outcomes charge it. At threshold, the seed **ignites** into a real Resource node — a new, rare, earned realization-event class (the *ignition event*) that is exactly the "ultimate reward" Jacob named: feeling your designed psyche become real, proven in your own words.

This yields a unifying structural law worth stating as architecture: **PROVENANCE-AGNOSTIC HYPOTHESIS NODES.** Nodes may originate from the symbolic (lens), from intention (becoming), from the practitioner (suggested), or from extraction (native candidates in the shadow buffer) — but every provenance passes the same citation gate, and only lived words confer mass. One law, four doors. This is elegant engineering, a stronger unified patent story (extends Candidate 1 + SEED-D + SEED-G), and the deepest expression of the product's identity: *nothing is true on this map until your life says so — not your chart, not your wounds' old story, and not even your best intentions.*

Transmutation also gains a feature: a wound's gift-destination can now be *chosen* — the person (or practitioner) links a wound's transmutation target to a becoming node, making the shadow-to-gift arc user-authored rather than only grammar-derived.

### Cautions (recorded with equal weight)
- **Self-discrepancy trap (the big one).** A permanently visible gap between actual self and ideal self is a well-studied engine of shame (Higgins' self-discrepancy theory). Design law: **no gap dashboards, no second screen.** There is no separate "better you" map to compare against — becoming nodes live as seeds *inside the one sky*, among the existing stars. Progress is framed as growth-toward (seeds charging, igniting) and never distance-from (percent-complete toward an ideal). This is the difference between a garden and a report card.
- **Avoidance disguised as design.** "I want to never feel anger" is not a psyche design; it's a protection mechanism wearing aspiration's clothes. Guardrails: becoming nodes must be positive capacities, not absences; the design canvas is AI-co-drafted with gentle pushback on absence-shaped designs; supervised skins route designs through practitioner review.
- **Claims discipline extends here.** "Design your new personality" is a therapeutic-adjacent claim; the framing is behavioral practice and goal articulation — intention made measurable. Marketing language gets the same permanent discipline as everything else.
- **Ignition thresholds must be conservative.** A premature ignition (declaring a new capacity real before it is) is the false-pattern-authority risk pointed at the future self. Same conservative recurrence thresholds as native nodes; spontaneous evidence weighted over experiment-adjacent self-report.

### Edges added to the meta-map
- IDEA-003 —**extends**→ CORE-03 (cumulative luminosity; ignition events; seed rendering)
- IDEA-003 —**reuses**→ LENS-01 mechanic (hypothesis-node class, generalized)
- IDEA-003 —**completes**→ AUTH-01 (experiments now have destinations; the loop gets its horizon)
- IDEA-003 —**constrained-by**→ CORE-01 (lightness from integration evidence only; ignition via citation gate)
- IDEA-003 —**produces**→ structural law: provenance-agnostic hypothesis nodes (one gate, four provenances)
- IDEA-003 —**feeds**→ CORE-04 (practitioner skin: co-designed becoming maps as a coaching deliverable)

### Seeds spawned
- **SEED-G:** Unified hypothesis-node abstraction as the patent framing — "graph nodes of arbitrary provenance whose state transitions are computed exclusively from citation-validated longitudinal evidence." Cleaner and broader than claiming lens and becoming separately; flag for counsel alongside Candidate 1 and SEED-D.
- **SEED-H:** The becoming map as the practitioner's vision-work instrument — coaches already sell "future self" work with nothing to measure it; co-designed becoming nodes make it longitudinal and evidence-graded. Possibly the coach-market wedge feature.
- **SEED-I:** Render research task: prototype the seed/ember/ignition visual sequence and test that actual-vs-designed never reads as a deficit view.

---

## IDEA-004 — Belief-Change Move Set + Aligned Retention Flow
**Date:** 2026-07-12 · **Source:** Jacob (directed elaboration) · **Status:** Adopted as two modules
**Raw ask:** (1) The most efficient practitioner-free belief-change mechanisms users can be guided to employ in-app. (2) A social-media-game-engineer's ideal experience flow that keeps people participating, adds to the map, and delivers an ever-expanding sense of winning.

### MOVE-01 — The belief-change move set (solo-safe, ranked)
1. **Experiential disconfirmation with a prediction ledger** (upgrades AUTH-01 Experiments). Beliefs update fastest via prediction error, not argument. Flow: node belief stated as testable prediction in the person's own words → tiny test designed → prediction + confidence % logged → actual outcome recorded → delta = belief-change payload. Confidence tracked across repetitions renders as *visible belief decay* — a chart of a belief losing its grip. Reconsolidation-adjacent (prediction error is the active ingredient) with no trauma protocol.
2. **Implementation intentions (if-then plans), auto-drafted from citations.** Gollwitzer-class effects from "When X, I will Y." Unfair advantage: the map already knows the person's real triggers verbatim from node evidence — plans are personalized from lived data, not guessed on a worksheet. Uncopyable without our evidence architecture.
3. **Defusion + self-distancing micro-moves** (ACT "I'm having the thought that…"; Kross third-person self-talk). 60-second, in-the-moment, offered when a node activates. Changes relationship to belief, not content — safest technique class; ideal solo.
4. **Mental contrasting (WOOP)** as the design tool for becoming nodes/experiments; specifically counters positive-fantasy effort collapse.
5. **Values self-affirmation** as a 90-second pre-session ritual before heavier material — lowers defensiveness, opens updating.
6. **Tiny-habit scaffolding** (anchor, shrink, celebrate) carries rehearsal consistency.
7. **Expressive writing** — already the substrate.
**Excluded from solo, permanently:** exposure hierarchies, parts/IFS dialogues, regression work → practitioner skins only.
**Routing rule:** the deepening engine (CORE-07) recommends the move by node type and state — belief nodes get disconfirmation tests; protection nodes get defusion first; becoming nodes get WOOP + if-then + tiny habits.

### FLOW-01 — The aligned retention flow ("compulsion from anticipation, consequence, accumulation")
- **Onboarding (min 1–5):** birth data → ghost sky ignites → first entry → first charge animation. Session-one aha: "it heard me."
- **Session loop (bounded 5–10 min):** delta-first greeting (what changed) → exactly one right-sized move (reflect / test / record result) → consequence rendered on the map immediately → clean exit. No feed, no scroll. Bounded sessions still pull returns because the open loop is the user's own running experiment in their life (Zeigarnik on self-made commitments), not a manufactured cliffhanger.
- **Rhythm:** ≤1 daily nudge (temporal trigger or the user's own experiment check-in); **Weekly Sky Shift** digest as the appointment mechanic (anticipation = the legitimate dopamine); **Results Ceremony** closes each 2–4 week experiment cycle (prediction vs. actual reveal, confidence-decay chart, node physics shifting on screen).
- **Nested reward horizons (the ever-expanding win):** micro = charge ticks (most sessions); meso = experiment results, loosenings (weekly-ish); macro = ignitions, transmutations (rare, ceremonial); meta = cumulative luminosity + time-scrub anniversaries. The trophy room IS the map; it never resets.
- **Expansion mechanic:** each ignition unlocks a new becoming-seed slot — winning opens new frontier; the game grows instead of ending.
- **Progression identity:** earned chapters (Reader → Cartographer → Author), titled by integration milestones, never by activity volume.
- **Stated trade:** sacrifices DAU vanity metrics for durable weekly retention, LTV, and trust — the correct optimization for this product; publishable as brand stance (extends SEED-E).

### Edges added
- IDEA-004 —**operationalizes**→ AUTH-01 (moves are the loop's verbs; prediction ledger upgrades Experiments)
- IDEA-004 —**routes-via**→ CORE-07 (move recommendation by node type/state)
- IDEA-004 —**expresses-as**→ CORE-03 (charge ticks, ceremonies, decay charts as physics events)
- IDEA-004 —**constrained-by**→ CORE-08 + mastery-mechanics law (bounded sessions, no schedules-of-reinforcement)
- IDEA-004 —**feeds**→ ASPIRE-01 (WOOP as the seed-design canvas; ignition unlocks seed slots)

### Seeds spawned
- **SEED-J:** Confidence-slider belief telemetry — "visible belief decay" as chartable UX and possible extension of patent Candidate 1/SEED-G (belief-state variable computed from prediction-outcome deltas over citation-validated events). Flag for counsel.
- **SEED-K:** Auto-drafted implementation intentions from citation-derived trigger contexts — candidate signature feature for launch marketing.
- **SEED-L:** Results Ceremony share cards — tempting, but sharing psyche content is exposure risk; parked pending the CORE-05/privacy treatment. Default: no external sharing.

---

## RESEARCH-001 — Technology scan (companion doc)
**Date:** 2026-07-12 · Full findings in **"Psyche Map — Tech Research Brief v1"** (same Drive folder). Headlines adopted: evaluate **Graphiti** (open-source temporal knowledge graph; bi-temporal edges, fact invalidation, provenance) as CORE-02 substrate; **voice journaling into v1**; opt-in **Body lane** (wearables/EMA) as corroboration-only; **on-device crisis classifier + PII scrubbing** as architecture requirements; rendering upgraded to **GPU-compute physics** (cosmos.gl / WebGPU class). New standing law adopted: **LAW-SIG — words create; signals corroborate** (only the person's language can make or charge a node; prosody, body data, and behavior may only strengthen, contextualize, or time what words have earned).

---

## IDEA-005 — Historical Corpus Upload → THE ARCHIVE LANE
**Date:** 2026-07-12 · **Source:** Jacob · **Status:** Adopted with authorship-provenance and temporal-honesty laws
**Raw idea:** Permit users to upload previously documented psyche discoveries — journals, coaching or therapy notes/worksheets.

### Why this is bigger than a convenience feature
The evidence mandate is source-agnostic in principle: old journals and the person's own worksheet answers ARE their longitudinal record. Archive upload gives the map something the lens layer can't — **depth in time**. Cold start gets solved twice over: lens nodes populate the sky with hypotheses; the archive populates it with *real, mass-bearing evidence*, and the time-scrub gains a past that predates the app. For the practitioner market this is an onboarding superpower: a coach's existing client brings years of prior work in on day one.

### Two laws this idea forces
**1. Authorship provenance.** The person's own words (journals, their answers on worksheets) → full evidence lane. **Other people's words about them** — therapist notes, coach observations — are professional interpretations, not lived words. They map perfectly onto LAW-HYP's practitioner provenance: notes enter as **practitioner-hypothesis nodes**, chargeable only by the person's own material. (Third structural reuse of the hypothesis-node mechanic; the architecture keeps paying.) Extraction must classify authorship per document/segment; mixed documents (worksheet = coach's question + client's answer) split lanes.
**2. Temporal honesty — the archive must not resurrect a former self.** A wound heavily documented in 2019 with no recent trace is NOT a present massive wound; asserting it would misrepresent the person and could re-open processed material (the retraumatization-by-archive risk). Rule: archive evidence carries original timestamps and builds the historical sky; **present-tense mass is dominated by recent evidence**, and heavily-historical/currently-silent nodes render dim with an honest state ("documented then, quiet now") plus, at most, one gentle optional inquiry via CORE-07. The person's growth since their old journals must be visible as light, not erased by mass.

### Cautions
- Therapy notes may reference third parties (family, partners); extraction creates nodes only about the person's own patterns, never about named others. Goes in the DPIA.
- Upload consent language must be explicit that clinician-authored records are interpretations being treated as hypotheses.
- Practical scope: PDF/docx/image OCR parsing, batch extraction mode, and an "archive review" moment (the historical sky-build) as a designed experience, not a silent import.

### Edges: IDEA-005 —extends→ CORE-02 (batch/archive ingestion); —reuses→ LAW-HYP (practitioner provenance for notes); —feeds→ CORE-03 (historical time-scrub; "quiet now" rendering); —constrained-by→ CORE-01 + temporal-honesty law; —amplifies→ IDEA-007 (practitioner onboarding wedge).
### Seeds: **SEED-M** — "Life so far" replay: after archive ingestion, offer a narrated time-scrub of their documented journey as the emotional payoff of uploading. **SEED-N** — Therapist skin: import from practice-management/notes platforms (with consent) rather than manual upload.

---

## IDEA-006 — Intake Design: Minimum Input, Maximum Honest Wow → THE FIRST HOUR
**Date:** 2026-07-12 · **Source:** Jacob · **Status:** Adopted as onboarding spec (INTAKE-01)
**Raw idea:** What degree of intake information provides an immediate visual win without overkill? How do we design the best possible intake questions to feed the psyche net from the start?

### The governing principle
**Each answer renders its consequence before the next question is offered.** Intake is not a form; it is the tutorial for the Reveal→Realize loop. The person should watch the sky change with every answer. Overkill is defined behaviorally: any question whose answer doesn't visibly change the sky within the same session is premature.

### Three tiers, each with its own win
- **Tier 0 (≈1 min): birth data → the ghost sky ignites** (LENS-01). Immediate, beautiful, honestly labeled as hypothesis.
- **Tier 1 (≈10–15 min, voice-first): the Seven Sparks** — a small set of high-yield prompts chosen for structure-per-word, answered aloud:
  1. *A moment that shaped you* (self-defining memory → narrative anchor; wounds only if volunteered)
  2. *The pattern you keep repeating and wish you didn't* (pattern/protection nodes)
  3. *What matters most to you — what you'd protect* (values → resource nodes)
  4. *What people misunderstand about you* (shadow-adjacent, safe framing)
  5. *Who matters most, and where the friction lives* (relational edges)
  6. *What you're proud of surviving or building* (resources; strengths-forward law)
  7. *Who you're trying to become* (first becoming seed → ASPIRE-01 live on day one)
  Each answer extracts in-session; first REAL nodes charge while they watch; lens ghosts start confirming/dimming immediately — the evidence mandate is *felt* in minute ten.
- **Tier 2 (optional, offered after the Tier 1 win lands): archive upload (IDEA-005) and/or assessments.** Never front-loaded.
### The stopping rule
Intake ends when the sky holds roughly **7±2 evidence-bearing nodes** — enough to feel unmistakably personal, few enough to feel like a beginning rather than a verdict. Explicit anti-overkill: no wound-origin questions at intake, ever; no assessment batteries before the first win; Tier 2 is pull, not push.
### Edges: IDEA-006 —operationalizes→ FLOW-01 onboarding; —feeds→ CORE-02/CORE-07 (prompt bank + in-session extraction); —constrained-by→ CORE-08 (strengths-forward, no wound probing); —activates→ LENS-01 + ASPIRE-01 on day one.
### Seeds: **SEED-O** — Adaptive Tier 1: after spark 3, remaining prompts re-rank based on what's emerging (deepest structure-per-word path). **SEED-P** — Practitioner-customizable intake: coaches swap in their own discovery questions; answers still flow through the same gate.

---

## IDEA-007 — Dual GTM: Client-Discovery Instrument + Direct Solo Program
**Date:** 2026-07-12 · **Source:** Jacob · **Status:** Adopted; sharpens venture-doc GTM; solo requires PROGRAM-01
**Raw idea:** Market as a client discovery tool/aid for therapists and coaches; also market direct to individuals. If direct, what program support creates an ongoing developmental program that yields real results?

### Practitioner positioning, sharpened: "Meet your client before you meet them"
The venture doc chose coaches-first; this idea gives it the concrete spearhead. Coaches burn sessions 1–3 on discovery. Product motion: client completes INTAKE-01 (+ optional archive) before session one → coach walks in with a curated draft constellation and evidence links. Discovery becomes a pre-session artifact, session one starts at depth, and the client is already invested in their sky. The **discovery report is also the demo**: a low-cost/free "Client Discovery" tier is top-of-funnel for the full practitioner suite. Therapist version follows later per venture-doc sequencing (HIPAA-BA obligations), with SEED-N import paths.

### Direct-to-individual: the honest answer on "real results" (PROGRAM-01)
Tools don't produce results; programs do. Solo yields durable change for the self-directed minority; everyone else needs structure, cadence, and humans. The solo offering is therefore a **program wearing an app**, four layers:
1. **Seasons** — 6–12 week guided arcs: choose one becoming seed, run 2–3 experiments against it, close with a Results Ceremony + season time-scrub. FLOW-01's cycle, scaled to a narrative container. Seasons are the SKU.
2. **Curriculum dripped by the map** — 3-minute psychoeducation moments triggered by what actually emerges (first protection node → "how protections work"), never a course catalog.
3. **Human touchpoints, tiered** — (a) facilitated community circles under CORE-05's resonance-without-exposure rules (mid-tier); (b) a **marketplace bridge to map-certified practitioners** for those who want 1:1 — which converts the solo tier into the practitioner funnel and answers the safety architecture at the same time; (c) any AI voice companion for check-ins is parked pending its own ethics pass (per RESEARCH-001).
4. **Outcome measurement** — periodic validated wellbeing self-reports (WHO-5-class) + integration metrics (experiments completed, ignitions, loosenings). "Real results" is a claim we must be able to substantiate internally — and it stays inside claims discipline externally (wellbeing language, never treatment language).
### The flywheel
Individuals discover solo → some bridge to certified practitioners → practitioners bring their other clients → group programs form from mature cohorts. Each market is the other's distribution.
### Edges: IDEA-007 —sharpens→ venture-doc Pillar 7 (wedge = discovery); —depends-on→ IDEA-005 + IDEA-006 (discovery artifact = intake + archive); —creates→ PROGRAM-01 (seasons, curriculum, touchpoints, outcomes); —feeds→ CORE-04/CORE-05 (marketplace + circles); —constrained-by→ CORE-08 (claims discipline on "results").
### Seeds: **SEED-Q** — Map-certified practitioner directory as a moat asset (extends certification revenue line). **SEED-R** — Season marketplace: practitioners author/sell season templates through the platform (rev-share; content moat). **SEED-S** — Anonymized, consented aggregate outcomes as the trust asset for both markets (pattern-library ethics rules apply).


---

## IDEA-008 — PSYCH-K Practitioner Community as Test Beachhead
**Date:** 2026-07-13 · **Source:** Jacob (who is a PSYCH-K practitioner, attending the Health and Wellbeing training this September) · **Status:** Adopted as beachhead strategy (BEACH-01) with brand/IP and epistemics guardrails

### Why this community is an unusually strong first cohort
1. **Founder-market fit.** Jacob is an insider with warm access, practitioner credibility, and a September training that doubles as a recruiting event. The venture doc's Phase 1 called for 10–20 paying design-partner coaches; this names exactly who they are and where to find them.
2. **The product fit is almost suspiciously exact.** A PSYCH-K session produces a specific new belief statement — which is *precisely* a becoming node (ASPIRE-01). The community's entire practice is belief change, and its unmeasured gap is the between-session question: *did the balance hold?* Our stack answers it natively: belief statement → becoming node → weeks of the client's own journals charge it or don't → prediction-ledger/belief-decay telemetry (MOVE-01/SEED-J) shows the arc. The pitch writes itself: **"the instrument that shows your client's new belief taking hold, in their own words."** No tool on earth offers this community longitudinal outcome evidence for their work.
3. **Culture fit:** esoteric-friendly audience — the lens layer is a selling point here, not a liability; strengths/becoming language is their native tongue.

### Guardrails (recorded with equal weight)
- **Trademark/brand:** PSYCH-K is a trademarked, centrally controlled modality. The app must be **modality-agnostic at core** — "works beautifully with belief-change practices" — and any use of the PSYCH-K name in marketing needs permission (counsel + possibly a conversation with the organization; partnership is an option, dependence is not).
- **Epistemic honesty:** the app measures *outcomes in lived words*, never mechanisms. It neither validates nor disputes muscle testing or any modality's theory of change; it shows whether the new belief appears in the person's subsequent life-record. This framing is both our claims-discipline requirement and, genuinely, the most useful thing anyone could hand this community.
- **Selection discipline:** design partners must still *pay* (venture-doc rule) — friendly community ≠ free pilots; willingness-to-pay is the assumption being tested.

### The concrete play
Demo-ready prototype (INTAKE-01 first hour + becoming nodes + basic sky) by the **September training**; Jacob recruits 10–15 paying design partners there; Jacob's own practice is test bed #1 (entity separation note: this venture is its own entity — never mixed with NCH/Kell/Villa Siesta records or infrastructure).
### Edges: IDEA-008 —operationalizes→ venture-doc Phase 1 (names the design-partner cohort); —amplified-by→ ASPIRE-01 + MOVE-01 (belief statements as becoming nodes; decay telemetry as the practitioner deliverable); —feeds→ SEED-Q (first certified-practitioner cohort); —constrained-by→ CORE-08 (mechanism-agnostic claims) + trademark counsel flag.
### Seeds: **SEED-T** — "Balance tracker" practitioner view: per-client becoming nodes with charge status as the session-prep screen. **SEED-U** — September demo scope doc (what must exist in 8 weeks). **SEED-V** — Other organized modality communities as replicable beachheads after PSYCH-K (same playbook: named belief-artifact → becoming node).

---

## IDEA-009 — Organic Growth: Pedigreed Seeding, Practice Licensing, Referral Engine
**Date:** 2026-07-13 · **Source:** Jacob · **Status:** Adopted as growth architecture (GROWTH-01), sequenced and gated
**Raw idea:** Invite pedigreed personalities in the belief-change space to test free; license app to coaches/therapists as a practice add-on; incentivize large-audience thought leaders with referral commissions on end-user subscriptions.

### The three motions, ordered (sequence IS the strategy)
**1. Practice licensing (now — this is the core business, sharpened).** Practitioner seat license includes a client-seat allotment (venture-doc pricing holds); positioned per IDEA-007 as the discovery instrument + between-session evidence engine. **Co-branded, never white-label:** practitioners may present the sky inside their practice brand, but the platform identity, safety layer, and claims language remain visibly ours — white-labeling would put our crisis architecture and claims discipline behind someone else's logo, which is untenable.
**2. Pedigreed seeding (after design-partner data exists).** A small, invitation-only **Founding Constellation** cohort: respected belief-change educators and authors get white-glove onboarding, their own map built (archive lane on their published journals/books-as-corpus is a seductive personal artifact), and early input status. Choose *credibility over audience size* first — the clinical-trust moat is worth more than reach. Realism: marquee names expect advisory equity or fees, not just free access; budget for 2–3 real advisor arrangements rather than 20 comp accounts. Approach with pilot outcome data in hand, not promises.
**3. Referral engine (last, gated).** Recurring-commission referrals (industry-standard 20–30%) — but **only through the certified-practitioner directory (SEED-Q)**, not an open affiliate marketplace. Reasoning recorded bluntly: open affiliates + a psyche product = paid incentive to overpromise healing, FTC-disclosure exposure on every post, and an MLM-adjacent odor that would poison the trust moat in exactly the communities we're courting. Affiliate TOS enforce claims discipline (violation = removal); all sponsored mentions carry required disclosures; thought-leader promotion happens via the same certified/disclosed rails.

### Edges: IDEA-009 —extends→ venture-doc Pillar 7 + IDEA-007 flywheel (adds acquisition engine); —gated-by→ CORE-08 (claims discipline extends to every affiliate and endorser contractually); —depends-on→ IDEA-008 (pilot data precedes pedigreed outreach); —feeds→ SEED-Q (certification = referral eligibility = quality gate = moat).
### Seeds: **SEED-W** — "Your map from your books": archive-lane ingestion of a thought leader's published corpus as the personalized seeding hook. **SEED-X** — Practitioner ROI one-pager (retention lift + session-prep time saved) as the licensing sales asset, built from design-partner metrics. **SEED-Y** — FTC/endorsement compliance checklist as part of affiliate onboarding (counsel review).


---

## IDEA-010 — Cross-Disciplinary Lenses → design principles from other fields
**Date:** 2026-07-13 · **Source:** Jacob (directed synthesis) · **Status:** Adopted as a design-principles set (LENS-KIT); several promote to laws/backlog
**Raw ask:** What perspectives from other fields, sciences, technologies, and moments in time could dramatically aid this product's functionality and end-user value?

### The lenses that earned a place (each changes something concrete)
1. **Ecology / systems dynamics.** Psyche = ecosystem: feedback loops, keystone nodes, resilience, hysteresis. → **Salience should be cascade-centrality, not mass alone**; target experiments at keystone beliefs (max downstream destabilization). Hysteresis gives vocabulary for "wound reasserts / group re-tightens." *(Buildable now; upgrades CORE-03 salience + AUTH-01 targeting.)*
2. **Rehabilitation / physical therapy.** Progressive overload; plateaus are normal; overload → regression. → **Seasons escalate experiment difficulty as a becoming node charges**; plateaus rendered as expected, never shaming (reinforces the no-gap-dashboard / self-discrepancy guard). *(Upgrades ASPIRE-01 + PROGRAM-01.)*
3. **Cartography (and its history).** Map ≠ territory; mark uncertainty; "here be dragons" at the known edge. → **Visible edges of the unexplored** (not blank, not falsely complete) + **legible per-node confidence**. Structural fix for false-authority. *(New render law — see LAW-MAP below.)*
4. **Documentary film / oral history.** The interview is a craft: silence, following energy, opening vs. closing questions. → Richer, safer source for CORE-07's questioning style than clinical technique (already walled off from solo). *(Upgrades CORE-07.)*
5. **Metrology / measurement science.** No number without an error bar; calibrate against ground truth; report drift. → **Mass, resonance, belief-confidence carry error bars; pipeline self-calibrates against the eval corpus and reports reliability.** "Trust us" → "here is our measured reliability." *(Upgrades CORE-02; moat + ethics asset.)*
6. **Astronomy / observatories.** Observe vast slow systems patiently without perturbing; unseen = "not yet observed," not absent. → Posture for the solo product: **an instrument for seeing, not a hand that pushes.** *(Reinforces CORE-08 solo stance.)*
7. **Anthropology / ethnography.** Meaning is culturally specific; WEIRD-trained ontology mispathologizes others. → Hold categories loosely; the person's own frame leads. Fairness safeguard + global-market requirement + reinforcement of CORE-01. *(Upgrades ontology design; flag for eval-corpus diversity.)*

### Two moments in time to steal from
8. **Renaissance memory palaces (ars memoriae).** Self-knowledge encoded as navigable spatial architecture — the original "inner content as place." Validates the constellation interface; offers concrete memorability techniques.
9. **Early psychometrics — rigor AND its harms.** Adopt the founding rigor (reliability/validity, no overclaiming); treat its harm (ranking people as fixed types) as precisely what "nothing is fixed; only your life confers truth" exists to prevent.

### The reframe that touches the whole venture
10. **Jazz / improvisation.** Authorship ≠ installing a better fixed program; it = becoming a fluent improviser with your own material. → **Reframes "results" from a better script to increased range and responsiveness** — a healthier north star and a more honest claim than "we fixed your beliefs." *(Informs PROGRAM-01 outcome language + claims discipline.)*

### The meta-pattern (the important part)
Nearly every lens independently arrives at **represent uncertainty honestly; refuse false authority** (ecology, cartography, metrology, astronomy, anthropology, honest psychometrics). Convergence from unrelated fields is a strong signal: **epistemic humility is likely the product's true center of gravity** and its sharpest differentiator vs. every confident-oracle competitor. Candidate positioning line: *the self-knowledge instrument that shows you what it doesn't know.*

### Promotions
- **LAW-MAP (new structural law):** Every rendered element carries visible confidence; the map always shows the edge of the unexplored. Uncertainty is a first-class visual citizen, never hidden.
- **Backlog upgrades:** cascade-centrality salience (CORE-03); escalating experiments + plateau-normalizing (ASPIRE-01/PROGRAM-01); error bars + self-calibration (CORE-02); oral-history question craft (CORE-07); ontology cultural-humility + diverse eval corpus.
### Edges: IDEA-010 —upgrades→ CORE-02, CORE-03, CORE-07, CORE-08, ASPIRE-01, PROGRAM-01; —produces→ LAW-MAP; —reinforces→ CORE-01 + venture-doc trust moat.
### Seeds: **SEED-Z** — "Confidence & unknowns" UI study (error bars + unexplored edges without inducing anxiety). **SEED-AA** — Diverse-population eval corpus as fairness + global-readiness asset (extends Phase 0 corpus). **SEED-AB** — Positioning/brand exploration around epistemic humility as the core promise.


---

## META-01 — The Governing Build Philosophy: Polymath Navigation, Macro-Micro Structure
**Date:** 2026-07-13 · **Source:** Jacob (stated design philosophy) · **Status:** Adopted as the governing meta-stance the whole ledger runs under (not a feature — the lens above the lenses)

### The stance, as stated
Being a polymath: drawing from all sciences and perspectives, never assuming certainty, constantly increasing the propensity to *move well through ever-changing information* — a sharper, more versatile capacity to navigate the informational landscape. All models already exist (macrocosm ⟷ microcosm); the model we are running is the neural net / cosmic web. The build should run from this macro-micro polymath lens for constant dynamic improvement.

### Why this is adopted as governing (not filed as a feature)
1. **It is the same conclusion IDEA-010 reached from the outside, now named from the inside.** Ten unrelated disciplines converged on "represent uncertainty; refuse false authority." This philosophy states that convergence as the *operating principle* rather than an observed property. That makes it load-bearing.
2. **The "navigation over certainty" claim is rigorous, not vague.** It maps onto requisite variety (control theory), evolvability (biology), and graceful adaptation (ML). The goal of a capable system is not the right answer but the increasing capacity to keep finding better ones as the ground shifts. This is the correct optimization target for both the venture and the extraction engine.
3. **The macro-micro claim is buildable as structure.** The same network topology — small-world clustering, hub nodes, sparse long-range links, criticality at the edge of order/chaos — recurs across neurons, cosmic filaments, ecosystems, cities, language. Design commitments that follow: the psyche graph should *be* a small-world network; healthy psyches likely sit near criticality (rigid enough to hold, fluid enough to change); the constellation / cosmic-web visual language is a structural claim, not decoration.

### The guardrail that keeps it sharp (recorded with equal weight)
The macro-micro lens has one failure mode, and it is exactly the one this product exists to refuse: sliding from **structural resonance** (rigorous, falsifiable — "the same topology recurs") into **literal correspondence** (unfalsifiable — "as above so below explains everything"). The instant it explains everything it explains nothing, and becomes false authority in cosmic clothing. **The safeguard is the philosophy's own first clause: never assume certainty.** Polymath humility is the discipline that keeps macro-micro resonance from calcifying into dogma. The two halves are not merely compatible — clause one is the safeguard on clause two. Only the falsifiable, structural version is adopted.

### The builder's caution (level separation)
"Constant dynamic improvement / dance amongst changing information" is true north for the **meta-level** — how the venture evolves, how the extraction engine learns, how the ontology stays loose and self-revising. The **product surface** must often be the opposite: the vulnerable user needs a stable floor, a clear next step, a bounded session that ends (per FLOW-01/CORE-08). Resolution: *the dance lives in the architecture so the user doesn't have to dance.* The meta-level is adaptive and polymathic; the user-facing level is calm, paced, and grounded. Held this way the two are complementary, not in tension.

### What this changes operationally
- **Ontology stays loose and self-revising** (reinforces IDEA-010 ethnography/anthropology): categories are provisional, revisable against evidence, never frozen. The extraction engine should be able to grow new node/edge types, not just fill fixed ones.
- **The engine is designed to improve its own navigation**, not to reach a final model: self-calibration (metrology lens), drift reporting, eval-corpus expansion, model-generation re-benchmarking are core, not optional.
- **Network-topology as a design target and a health signal**: small-world structure, criticality, hub detection become first-class analytics (connects to cascade-centrality salience, IDEA-010 ecology).
- **Epistemic humility is confirmed as the product's center of gravity** — now doubly sourced (external convergence in IDEA-010; internal governing stance here). Strengthens LAW-MAP and the candidate positioning "the instrument that shows you what it doesn't know."
- **The ledger method itself is an instance of the philosophy** — a live, ever-connected, never-certain, always-revisable graph of ideas. The meta-map practices what the product preaches.

### Edges: META-01 —governs→ the entire ledger (stance above all modules); —formalizes→ IDEA-010's meta-pattern; —strengthens→ LAW-MAP + CORE-01; —constrains→ own failure mode via "never assume certainty"; —level-separates-from→ FLOW-01/CORE-08 (meta adapts; surface grounds).
### Seeds: **SEED-AC** — Network-health analytics (small-world metrics, criticality indicators, hub mapping) as a distinctive engine capability. **SEED-AD** — Self-revising ontology mechanism (engine proposes new types; human/eval gate approves) — patent-adjacent, flag for counsel. **SEED-AE** — Articulate the philosophy publicly as founder/brand narrative (polymath humility as the company's stated epistemics) — differentiator in a category full of certainty-merchants.


---

## IDEA-011 — The Dual-Model Review Round → REVIEW-01 (adversarial spec-hardening as a build discipline)
**Date:** 2026-07-13 · **Source:** Jacob (ran the Spec Reviewer Prompt in Claude + ChatGPT against the build specs) · **Status:** Adopted as a standing pre-build discipline; findings integrated into gate spec v1.1, schema, CLAUDE.md, and master concept v1.1
**Raw move:** Before building, run every spec through two different models using the adversarial reviewer prompt; reconcile; integrate; log. Repeat per spec.

### Why this earned a module (it's a process, and the process is working)
The review round did exactly what META-01 predicts a good navigation system should: it increased the specs' capacity to survive contact with reality *before* reality (build cost) was spent. Two rounds run so far — (A) citation-gate + schema + CLAUDE.md, (B) master concept + venture docs — and the pattern held both times: **the two models split by temperament and the split is the value.** ChatGPT reviews like a principal architect (versioning, bounded contexts, observability, ADRs, glossary — additive, substrate-hardening). Claude reviews like an adversarial collaborator (the load-bearing cracks that change signatures, tables, law-wording, and delivery viability). Running only one would have missed half. This is now a standing rule: **every spec gets both, worst-first reconciliation, then integration, before it becomes code.**

### The findings that were real fixes (not polish)
**Round A (gate/schema/CLAUDE):** conferring-rule bug (a becoming *declaration* would self-ignite — fixed with an evidence `role` dimension: DECLARATION vs ENACTMENT); the gate verifies *words not interpretation* (honest-scope §1.1 added; solo mode may not auto-transition on model polarity alone); gate signature under-parameterized (now takes priorGraph/shadowBuffer/now — stays pure); shadow buffer + proposals had nowhere to live (added ShadowCandidate, ExtractionRun, Proposal tables); LAW 1 wording contradicted LAW 3 (reworded to "every node that *carries mass*"); NFKC-changes-length span-corruption, multi-occurrence tie-break, invalidation-unaware mass (all now required tests). Plus versioning/QUESTIONED-state/per-construct-thresholds from ChatGPT.
**Round B (master concept):** **extractor-blinding** — the proposer must be blind to lens/becoming/practitioner hypotheses or lens "confirmation" is self-fulfilling, silently destroying the "shows you your chart being wrong" claim (now a hard invariant in CLAUDE.md + gate spec + §4.3 — this was a genuine hole); **the wow is un-demoable live** — belief-decay needs weeks, the 10-min success test can't show it, so a *seeded longitudinal demo account* is now v1 IN #8; **schedule is a co-equal risk** with extraction fidelity (added a ranked cut-line + blocking pre-conditions); Graphiti-vs-Postgres contradiction resolved to Postgres-for-v1 (matches schema); wholesale rsync → selective seed; voice-in-noisy-room + demo-day human safety protocol; modality-agnostic-vs-PSYCH-K-shaped tension named.

### The two design decisions the round forced (worth remembering as precedent)
1. **Fabrication-trust ≠ interpretation-trust.** The gate's guarantee is narrower than first written and now stated honestly. This is *another* independent reason the venture sequences practitioner-supervised first, solo last — the human covers what the gate structurally can't.
2. **The hero demo sells the solo experience; the pitch sells the supervised instrument.** These are different surfaces and v1 now plans both. Named tension, not papered over.

### Where I pushed back on the reviewers (META-01 discipline: don't over-build the substrate before evidence)
Declined for v1, logged for post-pilot: full multi-dimensional confidence decomposition (kept named inputs + single display score); the elaborate 7-stage runtime (kept the bounded-context *seams*, deferred the staging); anti-corruption layer. Accepted-cheap: ADRs (`/docs/adr`), `Glossary.md`, bounded-context diagram, versioning (already integrated Round A).

### Edges: IDEA-011 —hardens→ CORE-02 (gate), schema, CLAUDE.md, master concept; —produces→ extractor-blinding invariant + seeded-demo requirement + cut-line; —instance-of→ META-01 (the review IS the navigation system improving its own map); —feeds→ every future spec (standing pre-build discipline).
### Seeds: **SEED-AF** — a running "review findings → spec version" changelog as a project artifact (auditability of *why* specs changed). **SEED-AG** — add the extractor-blinding test + the seeded-demo builder to the September build plan explicitly. **SEED-AH** — ADR discipline (`/docs/adr`) + `Glossary.md` as the first two repo docs after CLAUDE.md.


---

## IDEA-012 — Round C Review (Venture Exploration + Tech Brief) → the governance/build split codified
**Date:** 2026-07-13 · **Source:** Jacob (ran REVIEW-01 on the two strategy docs — ChatGPT + Claude) · **Status:** Integrated into master concept v1.2, CLAUDE.md, gate spec; governance bundle logged as pre-pilot workstream
**Raw move:** Same dual-model discipline, now applied to strategy docs rather than build specs — and it forced a clean articulation of what blocks *the build* vs what blocks *the pilot*.

### The load-bearing distinction this round produced
Strategy-doc reviews generate a flood of governance asks (ChatGPT's Venture review alone wanted ~13 documents). The reconciliation that matters: **almost none of it blocks building the citation gate; almost all of it blocks the first real user.** Codifying that split *is* the value of Round C — it's now §7.1 (the pre-pilot governance bundle), explicitly gated so a solo builder doesn't invert META-01 by writing governance instead of building the thing governed. This is precedent: future strategy reviews sort findings into "touches this week's code" (rare, act now) vs "touches the pilot" (log to the bundle).

### What actually changed the build this week (small, surgical)
- **cosmos.gl v3** (Claude verified live 2026-07-13): free upgrade — luma.gl/WebGL2, native mobile touch, animated transitions by default; lands on time-scrub + ignition animations + the phone demo. Async init model → don't copy pre-v3 code. Commercial-safe split (`@cosmos.gl/graph` vs `@cosmograph/cosmograph`) intact.
- **Domain-state vs rendering-state invariant** (ChatGPT Tech CRITICAL-004): layout positions are stochastic artifacts, never psychological meaning, never feed domain state. Now a CLAUDE.md invariant + reduced-motion/list fallback (also the accessibility fix, ChatGPT Tech MAJOR-008).
- **PII-redaction span trap** (ChatGPT Tech CRITICAL-003): naive local redaction shifts offsets and breaks the gate; if ever added, must use deterministic reversible placeholder mapping preserving span-resolvability. Noted in gate spec §5, OUT of v1.
- **Crisis classifier: server-side for September, on-device as roadmap** (Claude B4 + both ChatGPT criticals converged): on-device WebLLM/WebGPU is high-variance and the false-negative rate is existential — wrong thing to race a deadline on.

### The governance items that became the pre-pilot bundle (logged, NOT this week)
IP-clearance BLOCKING gate (both reviews — the one governance item that gates a *build* step: don't seed from valentinaapp until code-ownership + method-license + client-data-consent are cleared in writing; if ambiguous, clean scaffold instead); safety operating model; practitioner eligibility/permissions; claims lexicon ("healing" is internal-only, never external copy); product-boundary docs; deletion-vs-event-sourcing architecture; third-party-content policy; multidimensional eval scorecard (accepted as eval-corpus enhancement); assumptions register + decision log; cross-user pattern library stays OUT pending privacy threat model.

### The two apparent contradictions Claude's Part A caught (now written down, not left latent)
1. **"Never solo first" vs the September solo self-demo** → the Phase 0.5 bridge: practitioners evaluating the instrument on their own material is a bounded demo by consenting professionals, not a solo product launch. One paragraph removes a contradiction that would otherwise surface in every diligence conversation.
2. **Gated wounds = display policy or data policy?** (Claude A4, the sharpest catch) → "strengths-forward, wound-gated" secretly means two different architectures: *don't extract* wounds vs *extract but hide*. The latter stores a wound map it hides (consent + breach-scope problem). Must be decided before solo mode; "don't extract" is a real proposer branch. Logged as an engine-affecting decision, not just governance.

### Deferred-tech currency notes (correct when revisited, not now)
Hume's standalone Expression Measurement API actually CLOSED 2026-06-14 (not "sunsetting") — re-scan vendors when the prosody lane is actually built. Body-lane *collection* of health signals is regulated regardless of whether anything is predicted from it (GDPR Art. 9, WA MHMDA) — "no prediction" does not confer safety on ingestion.

### Where I pushed back (META-01 discipline, same as prior rounds)
Declined to build the ~13 governance docs now; declined on-device crisis classifier for v1; kept the multidimensional scorecard as an enhancement not a blocker. All logged, none lost, none inverting build-before-governance.

### Edges: IDEA-012 —refines→ IDEA-011/REVIEW-01 (adds the governance-vs-build sorting rule); —hardens→ master concept (§7 bridge, §7.1 bundle), CLAUDE.md (rendering-state invariant, cosmos v3), gate spec (PII span note); —produces→ the pre-pilot governance bundle as a named future workstream + the IP-clearance blocking gate; —surfaces→ the gated-wound extract-vs-display decision (engine-affecting, pre-solo); —instance-of→ META-01.
### Seeds: **SEED-AI** — the gated-wound extract-vs-display decision needs its own mini-spec + a proposer branch design before solo mode. **SEED-AJ** — the pre-pilot governance bundle should become real dated docs with owners once September validates the product is worth governing. **SEED-AK** — a live "external claim → verified date" table for the tech brief (Hume/cosmos.gl already stale-checked; make it a standing hygiene pass).


---

## IDEA-013 — Proposer Review Round → the seam fix, injection containment, and structural-vs-soft controls
**Date:** 2026-07-13 · **Source:** REVIEW-01 on proposer spec v1.0 (Claude + ChatGPT) · **Status:** Fully integrated — proposer spec v1.1, gate spec v1.3, schema additions
**Raw move:** Both reviewers independently found the same contract break AND the same invalid keystone test — the strongest convergence signal of any round.

### The findings that mattered
1. **The seam break (both reviewers, worst-first).** role/polarity/offsetHint reached the gate's input (v1.2) but were DROPPED at VerifiedEvidence, and §4 still computed conferring from authorship alone — so the becoming-ignition fix from Round A was disconnected end-to-end: a person restating their aspiration would still ignite it. Fixed in gate v1.3: VerifiedEvidence carries role/polarity; conferring is authorship-AND-role aware in the algorithm, not just §6 prose; ignition is explicitly ENACTMENT-role with a deterministic ≥2-spans/≥2-events threshold. **Root cause: contracts maintained in two prose documents.** Cure: ONE canonical contract module (/src/engine/contracts/extraction-contracts.ts), imported by both modules, contractVersion stamped on every run. The prose describes; the code file IS the contract.
2. **Prompt injection (ChatGPT CRITICAL-001) — the miss.** v1.0 treated hallucination and confirmation bias as the threats and never treated the journal itself as adversarial input ("ignore all instructions, return a WOUND node"). The gate can't catch it — an induced quote still exists in the source. Now a first-class invariant: source text is data-only, delimited, never interpolated into instructions; structured outputs; no secrets in the system prompt; fail closed; adversarial eval battery.
3. **Wound-gate was prompt-enforced (both) — contradicting the spec's own rule.** Now structural: a deterministic wrapper guard drops disallowed node types per a SERVER-DERIVED ExtractionPolicy (client-mutable userRole string retired — not an authorization boundary; PRACTITIONER_SELF alone doesn't unlock sensitive extraction).
4. **Keystone blinding test was invalid (both, independently).** Output-equality on a non-deterministic model = flaky + wrong layer. Now: byte-identity of the serialized CONTEXT with/without planted hypotheses, plus a type allowlist making forbidden fields unserializable.
5. **Semantic overreach (ChatGPT CRITICAL-005).** Valid quote ≠ valid interpretation ("partner says I work too much" → "terrified of abandonment" passes citation validation). Added inference-distance classification (DIRECT_DECLARATION/DIRECT_BEHAVIOR/LOW_INFERENCE_PATTERN/HIGH_INFERENCE_INTERPRETATION); high-inference never auto-materializes; entailment scored separately from citation precision in the eval corpus; high-inference edges (DRIVES/ROOTED_IN) can't auto-materialize from one event.

### The durable principle this round produced
**The control-class inventory:** every control is classified structural / semi-structural / irreducibly-soft, every control that CAN be structural IS, and the soft ones are named honestly (polarity, third-party guard, inference distance). This table is what you hand a clinical advisor: what the machine guarantees vs. what it only discourages.

### Where I pushed back (META-01)
Declined ChatGPT's two-phase blind-discovery/reconciliation architecture (prior-node priming is the person's OWN earned graph, not a hypothesis — named the nuance, logged the split as a post-pilot A/B experiment per ChatGPT's own ENHANCEMENT-005). Threat-model doc, provider-adapter interface, full batching schema, provider data-handling contract → pre-pilot governance bundle. Model self-confidence → telemetry only, never stored confidence (retracting v1.0's "feeds the gate's confidence inputs").

### Also fixed
NodeType closed enum (extensibility via ontologyKey only, log-only in v1, never auto-promoted); LENS/BECOMING removed from the extraction prompt entirely (policy-filtered type list — don't show the model types it must not use); per-candidate partial validity (one bad candidate doesn't poison a pass); errored runs retryable with backoff + gentle notice (silent fail-closed on a long entry = evidence mandate violated by omission); offsetHint non-authoritative (find all matches first, hint = tie-break only); NodeRef discriminated union; prompt/policy hashes + contractVersion on ExtractionRun; en-only v1 language scope.

### Edges: IDEA-013 —closes→ the becoming-ignition arc (Round A found the bug, Claude Code carried the fields, this round connected the seam); —hardens→ proposer spec v1.1, gate spec v1.3, schema; —produces→ the canonical contract module requirement + the control-class inventory + injection battery; —refines→ REVIEW-01 (note: reviewers read stale spec versions — future rounds must state reviewed-version explicitly); —instance-of→ META-01.
### Seeds: **SEED-AL** — the blind-vs-prior-labels extraction A/B on the eval corpus (post-pilot). **SEED-AM** — publishable extraction-instructions doc (nothing secret in the system prompt = trust asset). **SEED-AN** — rejection-telemetry dashboard as the prompt-tuning instrument.


---

## IDEA-014 — REVIEW-01 automated: the loop becomes an agent
**Date:** 2026-07-13 · **Source:** Jacob ("use an agent to conduct spec iteration until final build specs are produced") · **Status:** Kit built; install pending in Claude Code
**Raw move:** Jacob has been the human router between four surfaces (build thread, Claude reviewer chat, ChatGPT reviewer chat, Claude Code). Automate the routing inside Claude Code; keep the judgment.

### What was built (4 repo files + install message)
`docs/review/reconciliation-charter.md` — the judgment layer distilled from IDEA-011/012/013 into mechanical classification rules: ACCEPT-NOW (seam breaks, law contradictions, structural upgrades, invalid tests, missing attack surfaces, correctness→tests) / ACCEPT-CHEAP / DEFER-TO-BUNDLE ("does it block building the module or piloting the product?") / REJECT-WITH-REASON (substrate-before-evidence per META-01, model-trust-as-control, cut-line scope creep). Exit: zero Criticals in both lanes or 3-round cap with escalation; never stamp final over an open Critical; ethics forks never decided by the loop. `.claude/commands/iterate-spec.md` — the orchestration loop (fresh-context Claude subagent + OpenAI-API ChatGPT lane, punch-list, human checkpoint ON by default). `scripts/chatgpt-review.mjs` — the cross-model lane (fails loudly if no API key; never silently single-model). `docs/review/spec-reviewer-prompt.md` — repo-adapted adversarial reviewer prompt (must state exact version reviewed — fixes the stale-version noise from Round D).

### Design decisions worth remembering
Cross-model lane is preserved (the temperament split caught ~2x every round); the Claude reviewer is a fresh-context subagent (same family as drafter — slightly less independent than a fresh chat, mitigated by adversarial prompt + the ChatGPT lane). Human checkpoint stays ON until the charter earns trust over ~2 specs; Tier-1 rejections and ethics forks go to Jacob forever. This build thread remains the strategy/ledger layer — the agent runs specs, not the venture.

### Edges: IDEA-014 —automates→ REVIEW-01 (IDEA-011); —encodes→ the reconciliation discipline of IDEA-011/012/013; —fixes→ the stale-version review noise (IDEA-013 process note); —instance-of→ META-01 (the navigation system improving its own loop).
### Seeds: **SEED-AO** — dry-run the loop on proposer-spec v1.1 (expect ~zero new Criticals = calibration check). **SEED-AP** — after 2 trusted specs, disable the routine checkpoint, keep the Critical/ethics escalation. **SEED-AQ** — pipe each round's punch-list back to this thread's ledger as auto-drafted IDEA entries.


---

## IDEA-015 — The intake campaign closes the September spec triad: a system that suspects itself
**Date:** 2026-07-21 · **Source:** REVIEW-01 loop, intake-spec v1.0→v1.3-FINAL (Jacob's naming directive at the stamp) · **Status:** Recorded — campaign record

**The record, named:** three September-critical specs (citation gate + proposer v1.4-FINAL, renderer-lens v1.3-FINAL, intake v1.3-FINAL) have now passed through REVIEW-01, and **every one of them had its worst finding caught before build** — the conferring-rule starvation, the veil bypass class, and the intake triad below. None of these would have surfaced as anything but a production incident.

**What makes the intake campaign the loop's proof:** all three rounds' worst findings were the *previous round's own repairs*. Round 1's worst: the spec's original becoming ceremony had no lane at all. Round 2's worst: the lane round 1 built to fix that skipped the crisis floor. Round 3's worst: the abort mechanism round 2 built to keep the beat's copy honest opened a fourth path to forged recurrence — and the diff verification then caught the round-3 repair's own composition defect (the reaper's unrepresentable branch) before the stamp. Four generations of fix, each audited by the next, each catch smaller than the last: **convergence by self-suspicion**, which is META-01's whole thesis applied to the loop itself.

**Recurring antagonist, named:** forged recurrence (one utterance counting twice) attempted entry four ways — candidate-identity keys (IDEA-021 ruling, gate v1.8), pass overlap, source-creation double-tap, and the abort race — and was closed at a different structural layer each time. The materialization threshold is evidently the product's most attacked invariant; treat any future mechanism that touches pass lifecycle, source creation, or shadow identity as presumptively hostile to it and test accordingly.

**Process artifacts the campaign minted (now charter law):** the FINAL-drift amendment (behavior-changing rulings doc-sync their FINAL specs in the same commit — founding precedent: `heldShadowLabels`); BUILD-CONFIRMED as a punch-list class (pointer, not parking lot — every entry cites its §9 owner); the escalation seat's precedent (surviving Critical *labels* come to Jacob even when reconciliation dissolves them — the human checks the dissolution).

### Edges: IDEA-015 —closes→ the September spec triad; —proves→ IDEA-014 (the automated loop caught what it was built to catch, including its own repairs); —names→ forged recurrence as the standing adversary of the materialization threshold; —feeds→ the build phase (intake §9, tests first).
### Seeds: **SEED-AR** — the intake build itself (spark fixtures before the first build commit; entry-point guard + watermark fix + carriers + writer door as the cannot-slip three). **SEED-AS** — post-build, re-read the 26% paraphrase tuning target (§7.1) with v4 passes accumulated.

---

## NEW MODULES REGISTER
| ID | Module | Born from | Status |
|---|---|---|---|
| LENS-01 | Symbolic lens layer (two-lane epistemics, ghost nodes, resonance states) | IDEA-001 | Adopted |
| AUTH-01 | Authorship arc (Experiments, R→R→R→R loop, mastery mechanics, anti-rumination governor) | IDEA-002 | Adopted |
| ASPIRE-01 | Becoming map (designed psyche as becoming nodes, ignition events, cumulative luminosity, no-gap-dashboard law) | IDEA-003 | Adopted |
| LAW-HYP | Provenance-agnostic hypothesis nodes (one citation gate, four provenances: symbolic / intentional / practitioner / extracted) | IDEA-001+003 | Structural law |
| MOVE-01 | Belief-change move set (disconfirmation + prediction ledger, if-then plans from citations, defusion/distancing, WOOP, affirmation, tiny habits) | IDEA-004 | Adopted |
| FLOW-01 | Aligned retention flow (bounded sessions, nested reward horizons, weekly Sky Shift, Results Ceremony, ignition-unlocks-seed-slot expansion) | IDEA-004 | Adopted |
| LAW-SIG | Words create; signals corroborate (prosody/body/behavior may strengthen or time nodes, never create or charge them) | RESEARCH-001 | Structural law |
| ARCH-01 | Archive lane (historical corpus upload, authorship provenance, temporal honesty, historical time-scrub) | IDEA-005 | Adopted |
| INTAKE-01 | First-hour intake (Tier 0 ghost sky, Tier 1 Seven Sparks voice-first, Tier 2 pull-only; 7±2 stopping rule; consequence-per-answer) | IDEA-006 | Adopted |
| PROGRAM-01 | Solo developmental program (seasons, map-dripped curriculum, circles + practitioner marketplace, outcome measurement) | IDEA-007 | Adopted |
| BEACH-01 | PSYCH-K practitioner beachhead (design-partner cohort at September training; balance→becoming-node fit; modality-agnostic core) | IDEA-008 | Adopted |
| GROWTH-01 | Growth architecture (co-branded practice licensing → pedigreed Founding Constellation → certified-only referral engine) | IDEA-009 | Adopted |
| LENS-KIT | Cross-disciplinary design principles (ecology/keystone salience, rehab/progressive overload, cartography/uncertainty, oral-history interviewing, metrology/error bars, astronomy/non-perturbing stance, ethnography/cultural humility, memory palaces, honest psychometrics, jazz/improvisation) | IDEA-010 | Adopted |
| LAW-MAP | Uncertainty is first-class: every element carries visible confidence; the map always shows the edge of the unexplored | IDEA-010 | Structural law |
| META-01 | GOVERNING STANCE — polymath navigation over certainty + macro-micro (small-world/criticality) structure; meta-level dances, user surface grounds; loose self-revising ontology | Jacob's philosophy | Governing meta-stance |
| REVIEW-01 | Dual-model adversarial spec review as a standing pre-build discipline (run every spec through Claude + ChatGPT, reconcile worst-first, integrate, log) | IDEA-011 | Adopted process |

## OPEN QUESTIONS ON THE TABLE
1. Which modalities ship in v1 of the lens layer? (Instinct: HD + Western natal only; Vedic/BaZi/numerology as expansion — convergence scoring needs ≥3 systems though.)
2. What is the resonance/ignition confirmation threshold, concretely? (N independent evidence events? Practitioner sign-off in supervised skins?)
3. Does the day-one ghost map risk anchoring the extractor? (Must the extraction pipeline be blinded to hypothesis layers? — leaning yes.)
4. Experiment design UX: fully free-form, template library, or AI-co-drafted? (Instinct: co-drafted from the targeted node's own evidence, person edits and commits.)
5. What counts as experiment "success" evidence without Goodharting the person's own journaling? (Leaning: same conservative thresholds as native nodes — recurring, spontaneous, citable mentions; never a self-graded checkbox.)
6. Becoming-node design ceiling: how many active seeds at once before the sky becomes a to-do list? (Instinct: hard cap, small — 3-5.)
7. Should ignition be reversible (a new capacity that fades loses light) or ratcheted (once real, always on the map, even if dimmed)? (Instinct: nodes are permanent, light is honest — matches "nothing is deleted.")

8. Demo scope for September (SEED-U): what is the minimum lovable prototype — INTAKE-01 + becoming nodes + basic sky + belief-decay view? What gets cut?
9. PSYCH-K organization relationship: seek blessing/partnership, or stay quietly modality-agnostic? (Counsel + Jacob's read on the community politics.)

*Next idea → IDEA-016.* · *(All future ideas evaluated under META-01; all specs pass REVIEW-01 before build; review findings sorted build-now vs pre-pilot-bundle.)*
