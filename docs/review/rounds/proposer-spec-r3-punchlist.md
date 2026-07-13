# Punch-list — proposer-spec v1.3 · Round 3 (EXIT ROUND) · REVIEW-01 loop

*Claude lane: Request Revisions — 1C/5M/4m/2E (round-2 closures verified: all
hold; the Critical was introduced BY a round-2 closure). ChatGPT lane (with
the contract module in its xrefs for the first time): Request Revisions —
5C/3M/4m/5E, of which the genuinely-critical residue after code verification
is zero (its findings reduce to doc-sync and pin-the-invariant items; no
false "missing from contract" claims this round — the xref fix worked).*

**ESCALATION (charter exit rule): three rounds are complete and ONE genuine
Critical survives. The loop must NOT stamp FINAL — this goes to Jacob.**

---

## THE SURVIVING CRITICAL → ESCALATED AS D8

### A-1 ⚠ (Claude C-1) — The conferring rule starves correctly-labeled ENACTMENT evidence on extracted nodes
The gate's rule (`role === SUPPORT` for non-BECOMING nodes — consistent in
gate spec §6, contract, schema comment, and code) means a model that
CORRECTLY labels "I stayed calm when he yelled" as ENACTMENT on a PATTERN
node produces zero-conferring evidence. v1.3 simultaneously encourages
generous ENACTMENT labeling (it is the ignition supply) — so behavior-heavy
journals under-materialize, silently, with every listed test green. The
chain: round 0 required role-aware conferring; round 2 made roles pass
through; round 3 finds the conferring rule was always too narrow for the
pass-through world.
**Proposed fix:** non-BECOMING conferring = `SELF ∧ not-invalidated ∧ role !== DECLARATION`
(ENACTMENT confers everywhere — it is lived behavior, the MOST evidential
class; DECLARATION confers nowhere; BECOMING still requires ENACTMENT).
Every existing invariant survives: declarations never charge anything;
restating a wish never ignites; the restrict-never-create asymmetry holds.
**Charter class (as amended by Jacob after round 2):** evidence-semantics
edit → ACCEPT-NOW with failing-first tests INCLUDING a pipeline test
(behavior-heavy journal with ENACTMENT labels through real wrapper + real
gate → node materializes with mass > 0).
**➤ DECISION D8 (Jacob — the charter forbids the loop deciding this):**
approve `role !== DECLARATION` conferring for non-BECOMING nodes?

## ACCEPT-NOW (with D8's contract stamp)

### A-2 (Claude M-1) — WAITING_ENDPOINT has no per-item carrier
It exists as a `ShadowWaitingReason` but not in `RejectionReason`/
`GATE_REJECTION_REASONS`; the gate emits `BELOW_MATERIALIZATION_THRESHOLD`
for waiting-endpoint holds, so the v1.5 outcome mapping's third hold reason
is unimplementable per-item and telemetry can't distinguish the holds.
**Fix:** add `WAITING_ENDPOINT` to the rejection union + value array; gate
emits it; mapping doc already lists it. Contract → v2.2 with D8.

## CHEAP (approved-criteria block — all doc-sync/pins; NO evidence semantics)

- **C-1** (Claude M-3 ≡ ChatGPT #1): §3's code block still `NodeType[]` —
  sync to `ExtractableNodeType[]` (code/contract already narrowed).
- **C-2** (Claude M-2): gate body §4/§6.1/test-17 text still reads
  causal-only for the edge inference hold; code+tests cover all types — sync.
- **C-3** (Claude M-4): hypothesis-matcher precedence specified (own-key
  dedupe first, becoming-label merge second) + the label-only, type-blind
  match named as deliberate v1 scope.
- **C-4** (Claude m-1): test 18 explicitly listed in §13's CI-deterministic
  suite (it is fixture-driven and CI-safe).
- **C-5** (Claude m-2): match-key normalization-version obligation noted
  (rekey shadow candidates on normalization bump — migration duty).
- **C-6** (Claude m-3): §6.2 formula text gains "SUPPORTING-polarity".
- **C-7** (Claude m-4): `consent.requiredVersion` named in versioned config.
- **C-8** (ChatGPT #2 — stale-vs-code): §10 states the implemented sequence:
  parse raw shape (no provenance) → stamp EXTRACTED → validate canonically.
- **C-9** (ChatGPT #3 + MIN#3): pin `runId ≡ ExtractionRun.id` (server-issued,
  cuid-class); document `nonce = sha256(runId).hex[0:16]`.
- **C-10** (ChatGPT #4 + ENH#2): `Proposal.payload` = sanitized canonical
  shape (unknown fields stripped, test), raw blob only under
  `rawResponseRef`; note a sanitizationVersion.
- **C-11** (ChatGPT #5 — stale-vs-code: the carrier is `GateConfig.mode`,
  gate test 15): gate spec §3.1a notes the versioned config parameter
  carries mode; solo guard is already structural.
- **C-12** (ChatGPT MAJ#6): provider enforcement never a trust boundary —
  one sentence + lock one provider path for September.
- **C-13** (ChatGPT MAJ#7): cap stage pinned (post-guard, pre-gate — matches
  code); kept-order persisted note.
- **C-14** (ChatGPT MAJ#8): policy constructor is the sole source of
  ExtractionPolicy (server module); `practitionerClientId` recorded in
  policySnapshot.
- **C-15** (ChatGPT MIN#1 + Claude ENH-2): finish the gate-spec §3.1/§3.3
  listing sync (edge `inferenceDistance`; GateResult/VerifiedEvidence/
  AcceptedNode fields).
- **C-16** (ChatGPT MIN#2): oversize-refusal lifecycle wording (refuse
  pre-call; `omittedEventIds` = the oversized ids; status=error; no
  proposals persisted).

## DEFERRED (→ §7.1 bundle)

- **D-1** (Claude M-5): the real hypothesis-matcher (semantic/fuzzy;
  exact-label is demo-scope — a blinded proposer only coincidentally emits
  the byte-exact becoming label). Honest-scope sentence in §14 lands now
  (CHEAP); the matcher design goes to the bundle.
- **D-2** (ChatGPT ENH#3): third-party guard miss-rate metrics over a larger
  adversarial phrase set (eval-corpus work).
- **D-3** (ChatGPT ENH#4): retry/notice UX copy + crisis-bypass integration
  test at the product layer.

## STALE-ALREADY-FIXED (verified in code)

- ChatGPT #5's "no structural carrier" for the solo polarity guard
  (`GateConfig.mode` + `state.ts` + gate test 15); #2's stamping order (code
  already parses provenance-free and stamps in guards); #1's claim against
  code (contract/types narrowed — only the spec's §3 block lags → C-1).

---

## Checkpoint questions for Jacob (escalation, per the cap rule)

1. **D8 — the surviving Critical:** approve non-BECOMING conferring =
   `role !== DECLARATION`? (Evidence-semantics: yours by charter. My
   recommendation: yes — ENACTMENT is lived behavior, the most evidential
   class; the current rule points restraint at the wrong target.)
2. **D9 — a boundary the loop may not decide (Claude ENH-1, product-ethics):**
   PRACTITIONER_SUPPORTED wound extraction is currently RELATIONSHIP-scoped —
   a verified client's 1 a.m. solo journal gets WOUND extraction with no
   practitioner near it. Intended (consent covers it; display stays gated)?
   Or session/scope-flagged via `consentScope`?
3. **Exit path after integrating D8 + A-2 + CHEAP block:** stamp
   `v1.4-FINAL` with a targeted single-lane verification of the D8 diff
   (recommended — three full rounds are done; the diff is small and
   test-pinned), or explicitly override the cap for a full round 4?
4. **CHEAP block C-1…C-16** — approve?
