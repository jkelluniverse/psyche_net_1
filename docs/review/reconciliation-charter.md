# Reconciliation Charter — how review findings become spec changes

*Psyche-Net · governs the automated REVIEW-01 loop · v1.0 · distilled from ledger IDEA-011/012/013 (three human-run rounds)*

This charter encodes the judgment used to reconcile dual-model spec reviews. The orchestrator applies it mechanically; anything it can't classify goes to the human checkpoint. The goal is the balance the manual rounds struck: **never ship a seam break; never let a reviewer's governance appetite stall a solo builder's build.**

## Classification rules (apply in order; first match wins)

**ACCEPT-NOW (integrate before this spec is stamped final):**
1. **Contract/seam breaks** — any finding that two modules disagree at a shared boundary (types, signatures, field flow, enum values). These are verified by reading both sides, then fixed on BOTH sides + the canonical contract module. *Precedent: role/polarity dropped at VerifiedEvidence (IDEA-013).* 
2. **Law contradictions** — spec text that violates or contradicts CLAUDE.md's nine laws or another spec's stated invariant. *Precedent: LAW 1 vs LAW 3 wording (IDEA-011).* 
3. **Structural-enforcement upgrades** — any control currently enforced by prompt/instruction that CAN be enforced by deterministic code. Move it into structure. *Precedent: wound-gate prompt→wrapper guard (IDEA-013).* 
4. **Invalid tests** — a specified test that cannot reliably assert what it claims (flaky, wrong layer). Replace with the deterministic equivalent. *Precedent: blinding output-equality → context byte-identity.* 
5. **Missing attack surfaces** — a genuine threat class the spec doesn't contain (not merely "add more process"). *Precedent: prompt injection via the journal.* 
6. **Correctness bugs** — convert directly into required failing-first tests, not prose. *Precedent: NFKC span corruption; invalidation-unaware mass.* 

**ACCEPT-CHEAP (integrate if the edit is small; never restructure for it):**
- Versioning/observability fields, canonical definitions, honest-scope caveats, naming an unstated tension, deterministic thresholds mirroring existing ones.

**DEFER-TO-BUNDLE (log verbatim in master concept §7.1 pre-pilot governance bundle; do NOT edit build specs):**
- Any finding whose harm requires REAL USERS to manifest: eligibility models, claims lexicons, boundary docs, threat-model documents, provider data-handling contracts, deletion architecture, privacy threat models, multilingual policy, batching schemas beyond v1 minimal. Test: "does this block building the module, or block piloting the product?" If pilot → bundle.

**REJECT-WITH-REASON (log the push-back in the changelog; do not integrate):**
1. **Substrate-before-evidence (META-01)** — architecture generalization before any evidence it's needed: multi-stage runtimes, anti-corruption layers, multi-dimensional stored decompositions, two-phase extraction splits. Where the reviewer's concern is real, log it as a POST-PILOT A/B EXPERIMENT with the metric that would decide it. *Precedent: blind-discovery split → SEED-AL experiment.* 
2. **Model-trust dressed as control** — proposals that give an LLM's self-report authority (self-confidence into stored confidence, LLM judges as truth gates). Downgrade to telemetry.
3. **Scope creep against the cut-line** — anything that adds v1 features beyond the master concept's IN list.

## Hard rules for the orchestrator
- Every finding gets exactly one classification and appears in the round's punch-list: `ACCEPTED / CHEAP / DEFERRED / REJECTED (reason)`.
- **Evidence-semantics edits are never CHEAP** *(added by Jacob after proposer round 2 — v1.2's C-4 "tidy normalization" inverted the gate's conservatism and severed the ignition supply while every unit test stayed green)*: any edit that alters evidence semantics (role, polarity, conferring, inference distance) is ACCEPT-NOW tier with its own failing-first test — including an end-to-end pipeline test where the semantics span wrapper and gate — or it doesn't happen.
- Every ACCEPT that changes a shared type touches the canonical contract module and BOTH specs in the same commit.
- **HARD RULE (tripwire fired — auto-adopted at the renderer-lens v1.3 diff verification, per the amendment's own text; no further discussion was required):** *"every grammar/behavior rule lands with its §-tests carrier in the same edit."* History: armed by Jacob after renderer-lens round 3 when the class occurred once post-warning; the v1.3 integration diff carried the class again (the render-side invalidation WHERE clause landed without its named test-6 carrier), so the rule adopted automatically.
- Reviews must state the exact spec version reviewed; findings against stale versions are marked `STALE-ALREADY-FIXED` (verify before dismissing — IDEA-013's seam break looked stale and wasn't).
- Owned bugs are owned: the changelog says "this was a bug in vX.Y," never passive voice.
- **Human checkpoint (while enabled):** after classification, STOP and present the punch-list to Jacob before integrating. Tier-1/Critical rejections ALWAYS go to the checkpoint even after it's otherwise disabled. Decisions that are product-ethics forks (e.g., gated-wound extract-vs-display) are NEVER decided by the loop — flag and stop.

## Exit criteria (when a spec is FINAL)
- Both reviews return zero Critical/Tier-1 findings, OR three full rounds have run.
- If capped at three rounds with Criticals outstanding: STOP and escalate to Jacob — never stamp final over an open Critical.
- **Post-escalation exit (added by Jacob after proposer round 3): when the human approves fixes for the escalated Criticals, the standard exit is a TARGETED DIFF VERIFICATION — one fresh-context adversarial lane reviewing only the integration diff and its new tests — not a full round 4. The cap exists to stop infinite loops, not to force full-spec re-reviews of scoped diffs. Zero Criticals on the diff → stamp FINAL; any Critical → back to the human.**
- On exit: bump to `vX.Y-FINAL`, write the cumulative changelog, commit, and proceed to build (tests first, per the spec's own test section).
