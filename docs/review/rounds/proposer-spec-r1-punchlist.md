# Punch-list — proposer-spec v1.1 · Round 1 · REVIEW-01 automated loop

*Lanes: Claude (fresh-context subagent) — Request Revisions, 1C/6M/6m/2E.
ChatGPT (gpt-5-2025-08-07) — Request Revisions, 4 CRITICAL / 4 MAJOR / 4 MINOR + test-layer note.
Both lanes reviewed exactly v1.1. Findings merged where the lanes converged
(they did, on every top item). Classification per the reconciliation charter,
first-match-wins.*

**Checkpoint status: STOPPED — awaiting Jacob's approval. Nothing integrated.**

---

## ACCEPTED (ACCEPT-NOW — integrate before v1.2 is stamped)

### A-1. Inference-distance lane is disconnected end-to-end ⚠ CRITICAL
*(Claude C-1 ≡ ChatGPT #2; the exact seam-break class gate v1.3 was written to kill, recurring one round later.)*
`HIGH_INFERENCE_INTERPRETATION never auto-materializes` is prose with no carrier:
gate spec never mentions inference; `VerifiedEvidence`/`ShadowCandidate` drop the
field; no distinct waiting reason exists; §6 (per-evidence) contradicts §8 +
contract (per-proposal).
**Charter class:** contract/seam break + disconnected fix → ACCEPT-NOW.
**Proposed fix:** per-proposal granularity (fix §6 list); add `inferenceDistance`
+ `HELD_HIGH_INFERENCE` waiting reason to `ShadowCandidate` (contract + schema);
gate spec → v1.4 with inference-aware materialization (HIGH_INFERENCE ⇒ held
regardless of recurrence, until lower-distance recurrence or confirmation);
aggregation rule: max-distance-wins across sightings; move the deterministic half
of proposer test 7 into the gate suite; bump `CONTRACT_VERSION` → v2.
**➤ DECISION D1:** structural (as above — my recommendation; it's what §8
already promises) vs telemetry-only (strip the auto-materialization claim).

### A-2. High-inference edges have nowhere to wait; gate spec says the opposite ⚠ CRITICAL-adjacent
*(Claude M-1 ≡ ChatGPT #3.)* Proposer: DRIVES/ROOTED_IN "wait as candidates";
shadow lane is nodes-only in contract AND schema; gate §4 materializes thin edges
as low-confidence hypotheses. Test 8 is unimplementable as written.
**Charter class:** seam break → ACCEPT-NOW.
**Proposed fix:** extend the shadow lane to edges — `kind: "node"|"edge"` +
nullable endpoint fields on `ShadowCandidate` (contract + schema + migration);
gate rule: DRIVES/ROOTED_IN below ≥2-distinct-source threshold → shadow, not
low-confidence materialization; other edge types keep the hypothesis-edge path.
Update gate spec §4/§6.1 and proposer §6/test 8 to say the same thing.
**➤ DECISION D2:** edge shadow lane (recommendation — preserves "held, not
lost") vs "materialize at stricter confidence floor" (smaller, but keeps the
over-interpretation surface live on the map).

### A-3. NodeRef flattening reintroduces the tempId/nodeId collision it exists to kill
*(Claude M-2 ≡ ChatGPT #1.)* §3 mandates NodeRef; canonical output is flat
strings; gate disambiguates by string membership; tempIds are model-controlled →
a minted tempId colliding with a real node id is silently ambiguous. Resolution
currently lives only in a contract-file comment.
**Charter class:** seam break + missing attack surface → ACCEPT-NOW.
**Proposed fix (minimal):** state the NodeRef→string resolution in §3 prose of
BOTH specs; add wrapper guard #5 — reject any proposed tempId that collides with
a provided prior node id (one line + test). ChatGPT's alternative (NodeRef
end-to-end through gate + contract) noted but not taken: bigger diff, same
safety, gate tests all churn.
**➤ DECISION D3:** strings + collision guard (recommendation) vs NodeRef
end-to-end.

### A-4. Delimiter escaping (and future chunking) silently breaks the gate's verbatim match
*(Claude M-3 ≡ ChatGPT #8 + #10.)* The model quotes from the ESCAPED text it was
shown; the gate validates the ORIGINAL; no unescape step exists → true quotes
from delimiter-bearing entries get QUOTE_NOT_FOUND, systematically, on exactly
the adversarial inputs §4 exists for. offsetHints are also chunk-relative in any
future chunked run (spurious far-hint confidence penalties).
**Charter class:** correctness bug → ACCEPT-NOW as failing-first test + spec
invariant.
**Proposed fix:** new §4 invariant — *the context encoding must be
quote-transparent*: collision-proof nonce fences (deterministic per-run nonce
derived from runId, so the blinding keystone's byte-identity holds) instead of
character rewriting; wrapper must rebase offsetHint by chunk base when chunking
lands. Failing-first test: entry containing a literal delimiter → quote still
verifies with a correct original span. (Implementation note: current code DOES
rewrite ⟦→⟪ — this finding is live in the shipped wrapper and the fix touches
code + spec.)

### A-5. Test 4 asserts the wrong layer; `allowedNodeTypes` derivation is unspecified
*(Claude M-4; ChatGPT's "invalid tests" note.)* LENS/BECOMING are valid members
of the closed NodeType enum, so "fails the closed-enum check" can't be literally
true; the real enforcement (policy derivation) is unspecified in the spec.
**Charter class:** invalid test → ACCEPT-NOW.
**Proposed fix:** spec §3 gains the derivation table (SOLO → exactly {SHADOW,
BELIEF, PROTECTION, PATTERN, TRAIT, RESOURCE}; PRACTITIONER_SUPPORTED → +WOUND;
LENS/BECOMING never, in any mode); rewrite test 4 to target the policy guard +
the extractable-enum shape check. *Code already conforms* (extractable-type enum
in parse.ts + assertPolicyCoherent) — this is a spec-catches-up-to-code edit.

### A-6. Wrapper-stage rejections have no canonical typed reasons
*(Claude M-5 ≡ ChatGPT #5 + #6.)* Policy drops, third-party rejections, shape
failures, dangling edges — all contract-less; §12's telemetry has nothing typed
to count; "one contract module" violated by the wrapper's own outputs.
**Charter class:** contract/seam → ACCEPT-NOW.
**Proposed fix:** promote `WrapperRejectionReason` (POLICY_TYPE_DROPPED /
THIRD_PARTY_SUBJECT / SHAPE_INVALID / DANGLING_EDGE_REF / CAP_EXCEEDED /
TEMPID_COLLISION) + a `stage: "WRAPPER"|"GATE"` discriminator into
`extraction-contracts.ts` (code has proposer-local versions today — move them);
one rule sentence: **the gate is the sole writer of "shadow" outcomes** (settles
ChatGPT #6; code already conforms).

---

## CHEAP (ACCEPT-CHEAP — small edits, no restructuring)

- **C-1. ExtractionRun audit fields** *(Claude M-6)*: add `attempts`,
  `responseHash`, `rawResponseRef`, `parserVersion`, `omittedEventIds` to schema
  + migration; name the retention policy governing the raw payload.
- **C-2. Canonical serializer named in spec** *(ChatGPT #4)*: keystone test must
  specify canonical serialization (sorted keys, ISO dates, pinned version).
  *Code already does this* — spec edit only.
- **C-3. Repair boundary tightened** *(ChatGPT #7)*: enumerate repairable
  envelope errors; repair prompt carries the validation error + prior OUTPUT,
  never the source text (code conforms); semantic-never-repaired test exists.
- **C-4. Role guidance for EXTRACTED nodes** *(ChatGPT #9)*: §6 sentence — role
  is meaningful for becoming-related evidence; EXTRACTED evidence defaults
  SUPPORT.
- **C-5. Local validator always-on** *(ChatGPT #11)*: one sentence — provider
  schema enforcement is an optimization; the local shape validator always runs.
  Code conforms.
- **C-6. Wrapper types' code home named** *(Claude m-1)*: spec names
  `src/engine/proposer/types.ts` as the owner of ProposerInput/ExtractionPolicy/
  BlindedExtractionContext (policy snapshot shape shared via contracts if D1
  bumps CONTRACT_VERSION anyway).
- **C-7. Verification/consent schema backing** *(Claude m-2)*:
  `PractitionerClient.verifiedAt DateTime?` + `consentVersion String?` +
  migration; policy constructor reads these, never a request field.
- **C-8. Retry/backoff named config** *(Claude m-3)*: `maxExtractionRetries` +
  backoff schedule in versioned config.
- **C-9. §13 split: CI-deterministic vs eval-corpus canaries** *(Claude m-4)*:
  relabel tests 5/6/7/9/12/13 as canaries; 1/2/3/4/8/10/11 as CI.
- **C-10. ShadowCandidate contract alignment** *(Claude m-5)*: add
  `distinctSources`/`waitingReason` to the contract interface (folds into A-1/A-2
  contract work).
- **C-11. Crisis-classification seam named** *(Claude m-6)*: one §14 sentence —
  safety classification is upstream of and independent from the extraction
  queue; retry backoff can never delay crisis routing (LAW 7).
- **C-12. Eval corpus sized + timeboxed** *(Claude E-1)*: minimum viable corpus
  spec (per-type coverage counts, ~10 adversarial, ~5 flat).
- **C-13. Threat table test-traceability column** *(Claude E-2)*.

## DEFERRED (→ pre-pilot governance bundle, master concept §7.1)

- **D-1. Language-detection method + threshold** *(ChatGPT #12)*: multilingual
  policy is explicitly bundle-class per the charter. v1 stays en-only with an
  honest refusal.
- **D-2. Full chunking algorithm** *(ChatGPT #8, remainder)*: overlap strategy,
  cross-chunk dedupe, ordering evals — already logged post-pilot by §12 itself;
  only the quote-transparency invariant (A-4) enters v1.

## REJECTED

- None. (ChatGPT's NodeRef-end-to-end and structural-vs-telemetry alternatives
  are recorded as decisions D3/D1, not rejections.)

## STALE-ALREADY-FIXED

- None strictly stale (both lanes reviewed v1.1 exactly). Five findings are
  spec-behind-code — the shipped wrapper already implements the fix (noted
  inline: A-5, A-6 partially, C-2, C-3, C-5); the spec edits still land so the
  documents match reality.

---

## Checkpoint questions for Jacob

1. **D1** — inference distance: structural in the gate (recommended) or telemetry-only?
2. **D2** — high-inference edges: edge shadow lane (recommended) or stricter-floor materialization?
3. **D3** — edge endpoints: strings + tempId-collision guard (recommended) or NodeRef end-to-end?
4. Approve the CHEAP list as a block, or strike any?

**Integration plan on approval:** proposer spec → v1.2; gate spec → v1.4 (A-1/A-2
touch its §4/§6.1); `extraction-contracts.ts` → CONTRACT_VERSION v2 + both specs
in the same commit (charter hard rule); schema migration 3; wrapper code updated
for A-3/A-4/A-6 with failing-first tests; DEFERRED items appended verbatim to
master concept §7.1. Then round 2.
