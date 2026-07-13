# Punch-list — proposer-spec v1.2 · Round 2 · REVIEW-01 automated loop

*Lanes: Claude — Request Revisions, 1C/5M/7m/2E (verified all six round-1
closures on both sides: four hold, two partial). ChatGPT (gpt-5) — Request
Revisions, 4C/6M/4m/4E. Both reviewed v1.2 exactly.*

*Verification note: the ChatGPT lane's cross-references do not include the
contract module (`scripts/chatgpt-review.mjs` xrefs list — flagged at install),
so three of its four CRITICALs claim fields are "missing from the contract"
that are in fact present in `extraction-contracts.ts` v2. Per the charter these
were verified, not dismissed: they reduce to real DOC-SYNC gaps (the gate
spec's §3.1/§6.3 code listings lag the canonical file). Classified CHEAP.*

**Checkpoint status: STOPPED — awaiting Jacob. Nothing integrated. Round 2 has
an open genuine Critical, so per the exit criteria a round 3 follows
integration (3-round cap, never stamp FINAL over an open Critical).**

---

## ACCEPTED (ACCEPT-NOW)

### A-1 ⚠ CRITICAL — Round 1's C-4 role normalization reverses gate conservatism and severs the becoming lane *(Claude C-1; introduced by the round-1 integration — my edit, owned)*
Flattening every DECLARATION/ENACTMENT label to SUPPORT applies to 100% of
this pipeline's output (all its evidence is EXTRACTED-node evidence). So:
(1) a quote the model flagged as a stated wish becomes CONFERRING — mass now
accrues from aspiration, the exact thing the gate's role rule exists to stop;
(2) no specified component can ever emit ENACTMENT-role evidence → IGNITED is
unreachable in the live pipeline while gate test 14 stays green; (3) test 6
and §2's role row assert model behavior the wrapper then erases.
**Charter class:** correctness bug + law-adjacent (LAW 3 conservatism) → ACCEPT-NOW.
**Proposed fix (option i, recommended):** delete the normalization; roles pass
through untouched and the gate's type-conditional conferring rule consumes
them — a DECLARATION-labeled quote is non-conferring on EVERY node type,
stated as intended semantics (the label can only restrict mass, never create
it — the same asymmetry as the inference hold). Failing-first test flips the
C-4 test; telemetry keeps a role-label count (no normalization).
**➤ DECISION D5:** pass-through (recommended) vs specifying a separate
becoming-lane classification pass (bigger; builds a module on no evidence).

### A-2 — High-inference hold doesn't cover non-causal edges *(Claude M-2)*
§8 says "never auto-materializes," unqualified; gate v1.4 holds nodes and
DRIVES/ROOTED_IN only — a HIGH-labeled REINFORCES edge materializes, label
ignored. **Fix:** extend the gate's inference hold (lowest-seen rule) to edge
candidates of ANY type via the existing edge shadow lane; gate test fixture.

### A-3 — Shadow edge endpoints reintroduce string-format discrimination; unresolvable-endpoint promotion undefined *(Claude M-3)*
`sourceKey`/`targetKey` encode id-vs-matchKey by string shape — the sin D3
just made unrepresentable, at the persistence layer; and an edge clearing its
threshold while its endpoint is still in shadow has no defined behavior and
no fitting waiting reason. **Fix:** discriminated endpoint refs in contract +
schema (`sourceKind`/`targetKind`); new `ShadowWaitingReason:
"WAITING_ENDPOINT"` (held, re-evaluated, never dropped); stale-match-key
candidates age honestly (new sightings accumulate under the new key; nothing
deleted); gate test: threshold-clearing edge with in-shadow endpoint → held.

### A-4 — Prisma ShadowCandidate drops `ontologyKey` *(Claude M-4)*
Contract node-variant carries it; the table doesn't — novel keys are lost
between passes, the −0.25 novelty penalty silently never applies on
promotion, the META-01 candidate log misses it. **Fix:** add column
(migration 4), first-seen-wins on disagreement, shadow round-trip test.

### A-5 — Model-facing output schema unspecified; naive derivation re-leaks LENS/BECOMING through the schema channel *(Claude M-5 ≡ ChatGPT #9)*
§6 scrubs forbidden type names from the prompt, then §4's provider-enforced
schema would advertise all nine NodeTypes + a `provenance` enum in a second
channel. **Fix:** a derived, policy-narrowed model-facing schema (type enum =
`allowedNodeTypes` exactly; no provenance; unit-tested against the §3 table);
local validator stays canonical and strict; unknown fields stripped
deterministically before validation (provider schema may only be a superset).

## CHEAP (small edits; no restructuring)

- **C-1. Doc-sync the gate spec's §3.1/§3.3/§6.3 listings with contract v2**
  *(ChatGPT #1/#2/#3 — verified: fields exist in the canonical file; the doc
  listings lag)*: add `inferenceDistance`/`evidenceRationale`/
  `modelReportedConfidence` to the §3.1 interfaces with "gate disregards
  rationale/confidence (telemetry)" noted; add the `hintFallbackSignal` term
  to §6.3's formula text (code/contract have it since v1.3).
- **C-2. Footers** *(Claude m-1 ≡ ChatGPT #4)*: both spec footers still say
  the previous version. Fix both.
- **C-3. GateResult→Proposal outcome mapping** *(Claude m-2 ≡ ChatGPT #5)*:
  define the post-gate writer's mapping (accepted→"accepted"; hold reasons →
  "shadow"; others→"rejected"); holds excluded from rejection-rate telemetry;
  wrapper never writes "shadow"; document + test the wrapper/gate reason-enum
  disjointness (no schema column needed yet).
- **C-4. Chunking contradiction resolved as post-pilot** *(Claude M-1;
  ChatGPT #10's MVP-chunker alternative → stays DEFERRED)*: v1 refuses
  oversized entries and records `omittedEventIds`; delete §12's "is chunked"
  sentence. **➤ DECISION D6** if you'd rather ship a v1 chunker instead.
- **C-5. Third-party heuristic named in spec** *(ChatGPT #7)*: document the
  implemented v1 subject-possessive regex + that thresholds live in config;
  failure rate is a tracked eval metric.
- **C-6. Policy constructor truth table** *(ChatGPT #8)*: PRACTITIONER_SUPPORTED
  requires `verifiedAt != null` AND current `consentVersion`, else SOLO;
  unit-test the edge cases.
- **C-7. `ExtractionRun.contractVersion` default** *(Claude m-3)*: sync
  default to v2 / keep mechanically tied to the constant (migration 4 rider).
- **C-8. Tests 2a/2e CI forms restated at the context layer** *(Claude m-4)*:
  behavioral twins stay canaries (code already asserts at the right layer).
- **C-9. CAP_EXCEEDED selection order documented** *(Claude m-5)*: model
  output order, deterministic given persisted proposals; bias noted.
- **C-10. SELF-only guard stated in spec** *(Claude m-6 — stale-vs-code: the
  context builder already throws on non-SELF, tested)*: one sentence.
- **C-11. Nonce entropy + retry semantics** *(Claude m-7)*: runId must be
  cuid-class entropy; envelope-repair attempts reuse the run's nonce (safe:
  collision refusal precedes any model call); fence-collision retry is a
  queue-level NEW run. Three sentences.
- **C-12. `ExtractableNodeType` in the contract** *(Claude E-1 ≡ ChatGPT #16)*:
  `Exclude<NodeType, "LENS"|"BECOMING">`, used by `ExtractionPolicy.allowedNodeTypes`
  — the same unrepresentability move as D3. **➤ DECISION D7:** stamp the
  round's contract changes (this + A-3 endpoint refs) as CONTRACT_VERSION
  "v2.1" (recommended) or hold at "v2".
- **C-13. Ordering test: dropped node → dangling edge** *(ChatGPT #11)*.
- **C-14. DB inferenceDistance value note** *(ChatGPT #12)*: schema comment —
  permissible values are the contract union; the gate is the only writer.
- **C-15. Source-id allowlist enforcement stated** *(ChatGPT #13 — stale-vs-
  code: parse already filters minted ids)*: one sentence.
- **C-16. modelReportedConfidence persistence named** *(ChatGPT #14)*: rides
  in `Proposal.payload`; never anywhere else.
- **C-17. Fence-collision refusal recorded on the run** *(ChatGPT #15)*:
  status="error" + named detail string; retry-new-runId instruction.
- **C-18. Merge-bypass named as chosen** *(Claude E-2)*: post-materialization
  HIGH-inference evidence attaches under §1.1 guards — deliberate asymmetry,
  one sentence in §8.

## DEFERRED (→ §7.1 bundle)

- **D-1. Language detection method/threshold** *(ChatGPT #6 — re-raise of r1
  deferral; charter class: multilingual policy)*. Stays in the bundle.
- **D-2. MVP chunking algorithm** *(ChatGPT #10)*: folded into the existing
  bundle item; v1 refuses + records, per C-4.
- **D-3. Third-party user-facing copy/review-queue UX** *(ChatGPT #18)*:
  product surface; needs real users. New bundle entry.

## REJECTED

- None outright. *(ChatGPT #17 — config keys — is STALE: they exist in
  `PROPOSER_CONFIG_V1`.)*

## STALE-ALREADY-FIXED (verified in code before marking)

- ChatGPT #1/#2/#3 core claims (fields absent from contract / no hint-penalty
  carrier): present in `extraction-contracts.ts` v2 and implemented+tested;
  residual doc-sync → C-1. ChatGPT #13 (parse-time id allowlist), #17 (config
  keys), Claude m-6 (SELF guard): implemented and tested; residual spec
  sentences → C-10/C-15.

---

## Checkpoint questions for Jacob

1. **D5 — role semantics (the Critical):** pass roles through untouched
   (recommended — smaller, more conservative, revives ignition supply) or
   spec a separate becoming-lane classification pass?
2. **D6 — chunking:** post-pilot with refuse+record (recommended) or build a
   v1 MVP chunker?
3. **D7 — contract stamp:** bump to "v2.1" for this round's additive contract
   changes (recommended) or hold at "v2"?
4. **CHEAP block C-1…C-18:** approve as a block (same two strike criteria
   self-applied), or strike?

**On approval:** proposer → v1.3, gate → v1.5, contract v2.1, migration 4, one
commit; then **round 3** (final under the cap — any surviving Critical
escalates to you rather than stamping FINAL).
