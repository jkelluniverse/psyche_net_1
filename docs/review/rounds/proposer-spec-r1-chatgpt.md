Exact spec version reviewed: Psyche-Net · the adversarially-exposed front-end · v1.1

Verdict: Request Revisions

CRITICAL

1) Contract mismatch on edge endpoints (NodeRef vs strings)
- Observation: This spec mandates a discriminated NodeRef union for edge endpoints:
  type NodeRef = { kind: "PROPOSED"; tempId: string } | { kind: "EXISTING"; nodeId: string }.
  The gate spec (v1.3 §3.1) still defines ProposedEdge with sourceTempId/targetTempId: string (described as “refers to a ProposedNode.tempId or existing node id”). That is an unresolved seam.
- Why it matters: Ambiguity on endpoint identity allows namespace collisions and breaks structural validation. If the proposer emits NodeRef and the gate expects strings, edges will fail validation or be mis-wired. This is the exact class of seam break the “one canonical contract” rule was meant to eliminate.
- Action:
  - Pick one canonical shape in /src/engine/contracts/extraction-contracts.ts and update both specs to match it. Strongly recommend adopting NodeRef for unambiguous resolution.
  - Update gate’s ProposedEdge in the contract to use NodeRef[]; revise gate parsing/validation and tests accordingly.
  - Add a contract version bump and a migration note so the Proposal.payload schema in Prisma aligns.

2) High-inference classification fields exist in prose but not in the shared contract (and no structural consumer exists)
- Observation: The proposer spec introduces inferenceDistance and evidenceRationale per evidence (and mentions modelReportedConfidence telemetry “per proposal”). Gate’s ProposedEvidence (v1.3 §3.1) has no inferenceDistance or evidenceRationale; VerifiedEvidence doesn’t either. The downstream rule “HIGH_INFERENCE_INTERPRETATION never auto-materializes” has no structural place to run.
- Why it matters: This is a disconnected control: the text defines levers the system can’t read. Without a contract field and an algorithmic consumer, classification is dead weight; worse, tests that assume it changes behavior will be invalid/flaky.
- Action:
  - Decide the scope: telemetry-only vs. structural input.
  - If telemetry-only: explicitly exclude inferenceDistance, evidenceRationale, and modelReportedConfidence from the canonical contract used by the gate; store them only inside Proposal.payload (telemetry). Remove auto-materialization claims from the proposer spec; treat classification as a bias for human review + evaluation only.
  - If structural: add inferenceDistance to ProposedNode (or to each candidate) in the canonical contract; define a deterministic gate rule (per ontology config) that prevents auto-materialization for HIGH_INFERENCE. Update gate arithmetic/thresholding and tests. Keep evidenceRationale telemetry-only; never store as evidence.

3) “High-inference edges cannot auto-materialize from one event” is not implemented in gate
- Observation: The proposer spec hardens DRIVES/ROOTED_IN with “cannot auto-materialize from a single event; they wait as candidates.” The gate spec has no per-edge-type recurrence thresholds or special handling for causal edges.
- Why it matters: Without a gate-level rule, these edges will accept on a single verified quote if present, contradicting the spec’s containment intent; proposer prompts cannot enforce safety.
- Action:
  - Add per-edge-type materialization thresholds to the gate (ontology-configurable, versioned), e.g., DRIVES/ROOTED_IN require ≥2 distinct-source conferring spans, or practitioner confirmation.
  - Update GateResult and tests to exercise single-occurrence rejection/deferral into shadowBuffer for such edges.
  - Document the exact edge-threshold policy in the gate spec and reflect it here.

4) Keystone blinding test is underspecified re: canonical serialization; equality may be flaky
- Observation: Test 1 asserts byte-identity of the “constructed context.” JSON stringification order is not guaranteed across runtimes unless a canonical serializer is used; embedding Date/object keys can reorder, breaking byte equality without an actual context difference.
- Why it matters: A flaky keystone test erodes trust in the blinding invariant and can mask real regressions or generate noise.
- Action:
  - Specify a canonical, deterministic serializer (stable key ordering, stable whitespace, deterministic Date → ISO, and explicit encoding/escaping of delimiters). Pin its version and include its hash in the run record.
  - Extend the property test to assert both structural equality (deep-equal) and byte-equality of the canonical serialization.

MAJOR

5) Third-party guard is not wired as a structural pre-gate step with explicit reasons
- Observation: §9 describes a post-proposer “subject check” and says machine-readable rejection reasons are retained. §7’s Structural policy guards list does not include this check; there is no enumeration of rejection reasons in a contract. Proposal.outcome supports rejected/shadow, but no shared reason codes include third-party subject.
- Why it matters: Without a codified guard and reason taxonomy, this control risks living only in prompt text. You lose auditability and consistent behavior.
- Action:
  - Add an explicit wrapper step: subjectGuard(candidate) → {action: “accept|reject|flag”, reasonCode?}.
  - Define a reason code enum including THIRD_PARTY_SUBJECT and AMBIGUOUS_SUBJECT; write outcomes into Proposal.outcome and rejectionReason.
  - Add tests under §13 to assert reason codes and telemetry are persisted (and that “flag” routes to human review surfaces in practitioner mode).

6) Placement and flow of “shadow” outcomes is ambiguous between proposer and gate
- Observation: Prisma Proposal.outcome allows "shadow". The proposer wrapper discusses pre-gate guards and §8/§13 tests talk about candidates waiting in a shadow buffer due to inference rules. Gate spec v1.3 owns the shadowBuffer and its recurrence across passes.
- Why it matters: Two stages claiming write-ownership of “shadow” confuses provenance and replay. Only the deterministic stage should manage subthreshold recurrence.
- Action:
  - Make the gate the sole writer of “shadow” outcomes and shadowBuffer mutations. The proposer wrapper should only produce accepted/rejected at its layer (pre-gate validation/policy guard). Update tests to assert that “shadow” results come from gate passes, not wrapper guards.

7) Serialization repair boundary needs a precise contract
- Observation: “Exactly one serialization-repair call” is good, but “envelope/serialization errors only” needs enforcement. Today there is no explicit list of acceptable repair errors and no test that semantic mistakes are not “repaired.”
- Why it matters: Without a strict boundary, repair becomes a hidden second extraction with a broom.
- Action:
  - Enumerate allowed repair errors (e.g., trailing commas, truncated JSON, schema shape mismatch) and explicitly ban semantic adjustments (adding evidence, changing enums, relabeling). Make the repair prompt include the diff of schema errors, not the original source text, and strip all instructions other than “fix JSON.”
  - Add a test: injected semantic error (e.g., missing evidence) remains missing after the repair attempt; run ends status=error.

8) Chunking guarantees not fully specified
- Observation: §12 claims “quotes never split across chunks where avoidable,” but no algorithm is defined. It also doesn’t specify how source IDs and offsets map across chunks.
- Why it matters: Adversarial/edge cases will split on paragraph boundaries in the middle of a long quote; without deterministic mapping, verified spans can’t be reproduced or may be wrongly rejected.
- Action:
  - Specify the chunking algorithm: split by paragraphs with a minimum token window and overlap; embed per-chunk sourceEventId plus original absolute character offsets in the context. Document how gate offset mapping remains based on the original SourceRecord, not chunked indices. Add a test fixture for a multi-paragraph quote near a boundary.

MINOR

9) Role defaulting edge-case could zero-out mass if misused
- Observation: The proposer is told to default DECLARATION when uncertain between DECLARATION vs ENACTMENT; gate defaults role to SUPPORT if omitted. For EXTRACTED nodes, mass conferring uses role==SUPPORT; a DECLARATION label on non-becoming could zero out conferring if later logic changes.
- Why it matters: Future changes could unintentionally reduce mass for EXTRACTED nodes due to mislabeled roles.
- Action:
  - Clarify that DECLARATION/ENACTMENT is only meaningful for BECOMING context; for EXTRACTED nodes the proposer should set role=SUPPORT unless unambiguously an enactment of a becoming-specified quality. Add a lint test that EXTRACTED nodes’ evidence role ∈ {SUPPORT} unless a future rule allows otherwise.

10) Source delimiters/escaping method not pinned
- Observation: §4 requires “delimiter collisions in the text are escaped/encoded” but the method (base64, length-prefix, JSON value embedding only, etc.) is not specified.
- Why it matters: Ambiguity here invites injection slip-through or accidental delimiter closure by adversarial text.
- Action:
  - Specify the exact containment method. Recommendation: treat all sources as JSON string values only; never render raw delimiters in the prompt. If you must wrap, use length-prefixed blocks (“BEGIN SRC len=…\n…\nEND”) with base64-encoded content.

11) Provider structured output fallback path not specified
- Observation: You ask for provider-enforced JSON schema “where available” but don’t define the fallback path when not available or when streaming is required.
- Why it matters: Different providers will bypass schema enforcement; without a clear local validator flow you risk leaky parsing.
- Action:
  - Specify: when provider lacks JSON schema, wrap with a local JSONSchema validator (contract-derived), enforce fail-closed, and run the single repair pass via a separate system prompt with the minimal error report.

12) Language gating method is unnamed
- Observation: “supportedLanguages = ['en']” is stated, but the detection method is not.
- Why it matters: Rejections could be inconsistent or exploitable (e.g., adversarial Unicode to bypass).
- Action:
  - State the detector (fastText/CLD3 or a deterministic heuristic) and the confidence threshold, and add tests for obvious non-English entries.

Invalid/mis-layered tests

- Test 7 (Inference-distance discipline) and Test 8 (High-inference edges) assert downstream materialization restrictions that are not implemented structurally in the gate. As written, they either test the wrong layer or will be flaky no-ops driven by prompt compliance.
- Action: Move these assertions to the gate’s test suite after you add type-specific thresholds and inferenceDistance consumption to the gate (or, if telemetry-only, remove these tests and replace with a pure “classification assigned” coverage check in the proposer tests).

What’s genuinely strong

- Structural blinding and the keystone test are framed correctly (context byte-identity over nondeterministic outputs), and the “do not build substrate before evidence” stance is explicit.
- Injection containment is handled as a first-class invariant with concrete mitigations (data-only blocks, schema-enforced outputs, fail-closed, adversarial cases in tests).
- Wound gating is truly structural via ExtractionPolicy and a deterministic wrapper guard, fixing the earlier prompt-only control.
- Clear separation of responsibilities: wrapper shape/policy guards; gate validates quotes and does arithmetic; proposer remains untrusted. The “three checks, three jobs” mantra keeps the boundary honest.
- Per-candidate validation with a single bounded repair attempt and complete audit logging aligns with LAW 2 and event-sourcing invariants.
- Honest scoping around citation vs. interpretation and role/polarity propagation is consistent with the gate v1.3 seam fix, preserving the conferring/ignition guarantees.

Address the contract seams and disconnects above, and this module will align with the nine laws and be demo-safe without relying on prompt luck.