Version reviewed: Psyche-Net · the adversarially-exposed front-end · v1.2 (proposer-spec.md)

Verdict: Request Revisions

CRITICAL

1) Inference-distance seam break (carrier missing in gate-side proposer contracts)
- Observation: §8 makes inference-distance a per-PROPOSAL field and claims it is now structural and consumed by gate v1.4 §6.1. However, the gate’s canonical ProposedNode/ProposedEdge interfaces (docs/citation-gate-spec.md §3.1) do not include any inferenceDistance field. ShadowCandidate does store lowest-seen inferenceDistance, but the gate cannot seed that without the proposer supplying it.
- Why it matters: This is precisely the “stated in prose; no downstream carrier” class the round says it fixed. Without a field on ProposedNode/ProposedEdge in the canonical contract, the gate cannot hold/release based on inference distance. High-inference proposals will materialize incorrectly or be treated as unclassified, defeating the safety control.
- Action: Amend /src/engine/contracts/extraction-contracts.ts v2 to add an explicit enum InferenceDistance = {DIRECT_DECLARATION, DIRECT_BEHAVIOR, LOW_INFERENCE_PATTERN, HIGH_INFERENCE_INTERPRETATION} and optional fields inferenceDistance?: InferenceDistance on ProposedNode and ProposedEdge. Update the gate parser to read it, seed ShadowCandidate.inferenceDistance with it, and implement the lowest-seen aggregation. Add schema validation to reject unknown strings. Add CI test asserting proposer→gate round-trips the field and gate test 16 exercises the hold/release using data supplied by the proposer.

2) evidenceRationale field is specified but not in the shared contract
- Observation: §6 defines per-evidence evidenceRationale “for evaluation/human review only.” Gate-side ProposedEvidence (spec §3.1) has no such field; Prisma Evidence has no such field; the spec otherwise emphasizes provider-enforced schema and a strict local validator.
- Why it matters: If the proposer emits evidenceRationale into ProposerOutput, strict schema validation will reject otherwise-valid candidates (unknown field). If it does not emit it, the spec’s stated evaluation plan is impossible or will silently drift into ad-hoc logging.
- Action: Choose one:
  a) Make it structural telemetry: add optional evidenceRationale?: string to ProposedEvidence in the canonical contracts (ignored by the gate; persisted only in Proposal.payload). OR
  b) Remove it from ProposerOutput entirely and log it in a separate ProposalTelemetry artifact tied to Proposal.id (define a minimal schema), keeping the ProposerOutput schema tight.
  Update the validator/spec/tests accordingly and state explicitly that the gate disregards this field.

3) Disconnected confidence penalty on “implausibly far” offsetHint
- Observation: Gate §5 says “If a hint is supplied but all matches are implausibly far, fall back to the first match and lower confidence.” Gate §6.3’s confidence formula has no input for hint error, and VerifiedEvidence carries no field enabling such a penalty.
- Why it matters: A rule stated in prose that cannot be computed is dead code on paper and a future source of “we thought we did that” bugs.
- Action: Either (preferred) drop the “lower confidence” clause and keep offsetHint strictly as a tie-break with no arithmetic effect; or add a mechanical carrier (e.g., VerifiedEvidence.matchChosenBy: "unique" | "hint-nearest" | "first-fallback") and incorporate a small, versioned penalty into confidence. Update tests to assert the effect or its absence consistently.

4) Version labeling inconsistency at spec footer
- Observation: The proposer spec ends with “— End of proposer spec v1.1” while the document is v1.2 throughout.
- Why it matters: Auditability and keystone tests rely on exact version strings. This mismatch will produce confusion in run audits and test harnesses keyed on version.
- Action: Fix the footer to v1.2 and ensure promptVersion/promptTemplateHash stamping logic does not rely on human-readable footers.

MAJOR

5) Shadow ownership vs. Proposal.outcome semantics are under-specified
- Observation: Spec states “the gate is the sole writer of ‘shadow’ outcomes” (proposer-spec §7, gate-spec), but Prisma Proposal.outcome allows "shadow" and the proposer persist step is positioned to set outcomes. There’s no explicit coordinator step defined that maps gate ShadowCandidate to Proposal rows.
- Why it matters: If the wrapper or an upstream writer sets Proposal.outcome=shadow prematurely, you’ve broken the separation of powers. Conversely, if no one sets it, Proposal telemetry won’t reflect held candidates.
- Action: Specify the pipeline step that takes GateResult and updates corresponding Proposal rows: only after gate runs, mark outcome = "accepted" | "rejected" | "shadow". Disallow the wrapper from ever setting "shadow". Add a stage field or stage column if needed, or record stage in Proposal.rejectionReason for rejections. Add an integration test to prove a held-high-inference candidate results in Proposal.outcome="shadow" only after the gate.

6) Unsupported language handling is deferred but required for live use
- Observation: §12 names supportedLanguages=["en"] and promises an honest refusal for unsupported input, but there is no structural pre-check or wrapper rejection reason enumerated for language.
- Why it matters: Without a deterministic pre-check, non-English input will be sent to the model, degrading extraction, or will fail unpredictably. This violates the evidence mandate by omission.
- Action: Add a deterministic language gate pre-proposer (fastText/compactlangid or an equivalent lightweight detector). On mismatch, refuse the run with a canonical WrapperRejection reason UNSUPPORTED_LANGUAGE and a user-visible precise message. Add a CI test for this path.

7) Third-party guard remains underspecified for the deterministic layer
- Observation: §9 calls the post-proposer subject check “deterministic-ish” with a lightweight grammatical-subject heuristic, but no concrete rule is given. Tests (9) expect deterministic accept/reject/flag outcomes.
- Why it matters: Without naming the heuristic (e.g., “quotes must contain first-person pronouns unless label starts with ‘my …’ pattern”), the “deterministic” wrapper step will drift into prompt-only behavior or produce flaky results.
- Action: Specify the heuristic and its failure mode. Example, v1 rule: reject if neither label nor any quote contains first-person tokens (I/me/my/mine/myself) and at least one contains a named third party (proper noun or kinship term + diagnosis adjective), else flag for review. Make the allow/flag/reject thresholds config-backed. Add CI fixtures to lock behavior (mother narcissistic → reject; I shut down when my mother … → allow).

8) Policy constructor edge cases unaddressed (consent/verification)
- Observation: §3 says PRACTITIONER_SUPPORTED mode requires practitionerRelationshipVerified=true, and captures userConsentVersion. It’s unspecified what happens if consentVersion is null or stale, or verifiedAt exists but consent is missing.
- Why it matters: A mismatch between verification and consent should deterministically fall back to SOLO; otherwise WOUND extraction might occur without consent.
- Action: Specify constructor truth table: allowedNodeTypes = SOLO unless verifiedAt != null AND consentVersion matches current policy-required version; else SOLO. Unit-test constructor across edge cases.

9) Provider JSON schema fallback behavior not explicit
- Observation: §4 and §10 recommend provider-enforced schema “where available,” and v1.2 says the local validator always runs; but there is no statement on what happens to unknown fields (e.g., evidenceRationale) in strict vs. lax modes.
- Why it matters: If provider rejects unknown fields while local validator would salvage them, behavior diverges across providers/models.
- Action: Declare a single source of truth: the local schema (contract v2) is canonical and strict; provider schemas may be a superset only. Set provider client to “ignore unknowns” where supported; otherwise strip unknown fields before sending/repair to keep outputs stable across providers. Test 11 should include unknown-field stripping when provider schema is strict.

10) Long-input chunking is deferred but required to satisfy caps behavior
- Observation: §4/§12 promise splitting oversized inputs by batch layer; chunking algorithm is deferred. Without it, “refuse the run” becomes common on real entries.
- Why it matters: For demo viability and LAW 1 (don’t silently drop significant entries), an MVP chunker is needed now.
- Action: Define a minimal, deterministic chunking v1: split on paragraph boundaries with a target N tokens ± overlap K; ban quote-splitting by ensuring chunk window moves only at paragraph boundaries; include chunkBaseOffset for offsetHint rebase (even if hints are non-authoritative). Add a test asserting offsetHint rebase logic is present (even if offsetHint is only a tiebreaker).

MINOR

11) NodeRef resolution after guard ordering needs an explicit test
- Observation: §7 lists guards in order; edges whose PROPOSED endpoints are dropped by guard §7.1 must be rejected by §7.4.
- Why it matters: Ordering bugs here create dangling edges sneaking through to the gate.
- Action: Add a CI test: model proposes a WOUND node (SOLO) plus an edge to it; wrapper drops the node then drops the edge as DANGLING_EDGE_REF. Assert two typed rejections.

12) InferenceDistance needs a canonical enum across code and DB
- Observation: Prisma ShadowCandidate.inferenceDistance is a naked String; proposer/gate specs list a 4-valued taxonomy.
- Why it matters: Free-form strings will drift and break the “lowest-seen” aggregation rule.
- Action: Define an ExtractionInferenceDistance enum in the contracts and use string-literal union types in TS; validate inbound values and map to DB strings. Add a migration-time comment noting permissible values; add a validator to coerce/flag unknowns to null.

13) “Stable opaque IDs” must be explicit in the context framing
- Observation: §4 says source events get stable opaque IDs; not shown in the context example.
- Why it matters: If the model can invent IDs and the wrapper fails to validate against the allowlist, edges/evidence can cite ghosts before wrapper drops them.
- Action: Include “Allowed SourceEvent IDs” list explicitly in the serialized context and assert at parse-time that every cited sourceEventId ∈ this set. Add a CI test.

14) Where modelReportedConfidence is persisted is not stated
- Observation: §11 allows a telemetry-only modelReportedConfidence per proposal. No contract or persistence target is named.
- Why it matters: If it rides in ProposerOutput but isn’t in the contract, shape validation breaks; if it’s not persisted, eval is impossible.
- Action: Add optional modelReportedConfidence?: number to ProposedNode/ProposedEdge (telemetry-only), or exclude it from ProposerOutput and persist via Proposal.payload. State which, and test it.

ENHANCEMENT

15) Add a refusal reason code and audit line for fence collisions
- Action: Define a RunRefusalReason enum that includes COLLIDING_FENCE_NONCE, store it on ExtractionRun.status/detail, and surface a retry-with-new-runId instruction. Add CI test 2d2 to assert the refusal path is recorded.

16) Make the EXTRACTABLE type set structural
- Action: Define a closed ExtractableNodeType enum in the contracts for proposer output validation; shape validator rejects LENS/BECOMING at parse-time, independent of policy. Tests already reference this; codify it in contracts.

17) Document the minimal batching schema fields now (even if full strategy is post-pilot)
- Action: Add config keys for maxEventsPerRun, maxTokensPerSource, and per-1k-word candidate ceilings with versioned names. Telemetry already planned; wire keys explicitly to the wrapper.

18) Third-party clarity to the end-user
- Action: Specify the user-facing copy when a candidate is flagged/rejected for third-party reasons and where it appears (e.g., review queue vs. silent drop). Honest UX prevents confusion.

What’s genuinely strong
- Structural injection containment and quote-transparency: nonce-fenced, quote-transparent encoding with a refusal-on-collision rule is the right, testable primitive. The 2d3 “delimiter-bearing round-trip” keystone is gold.
- Blinding invariant is enforced in types and tested at the context boundary with byte-identity. The test asserts the right layer and uses a deterministic serializer.
- NodeRef as a discriminated union end-to-end closes a classic identity collision seam and is reflected in the gate spec and Prisma shape.
- Structural wound gate by policy, not prompt, with authenticated, server-derived policy and a clear derivation table (plus verified practitioner relationship) is a solid safety boundary.
- Typed wrapper rejections with canonical reasons, and the explicit split between CI-deterministic tests and eval canaries, align with “mastery-not-casino” and make failures actionable.
- Honest scope statements: where controls are semi-structural (third-party, polarity), they’re labeled and paired with deterministic backstops downstream.
- Gate/prisma coherence on role/polarity carriage and becoming ignition thresholds: the earlier seam is closed and property-tested in the right module.

Address the listed carriers and disconnected rules, and this will be a tight, demo-ready proposer that respects the nine laws and keeps the trust boundary crisp.