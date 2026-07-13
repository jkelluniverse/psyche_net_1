Reviewed spec version: Psyche-Net · the adversarially-exposed front-end · v1.3 (proposer-spec.md)

Verdict: Request Revisions

CRITICAL

1) Type seam: allowedNodeTypes still NodeType[] in §3 (should be ExtractableNodeType[])
- Observation: The policy example/type in §3 shows allowedNodeTypes: NodeType[]. Contract v2.1 introduces ExtractableNodeType (excludes LENS/BECOMING) to make forbidden types unrepresentable. Tests in §13.4 depend on this. The prose elsewhere claims this fix landed in v1.3, but the spec’s interface still uses NodeType[].
- Why it matters: This reopens the very seam the round claims to close. If allowedNodeTypes is NodeType[], an implementation or codegen can accidentally include LENS/BECOMING and defeat the structural guarantee (prompt-only prevention). This is exactly the class of “prompt-enforced control that could be structural.”
- Action: Change ExtractionPolicy.allowedNodeTypes to ExtractableNodeType[] in proposer/types.ts and in the spec. Update buildModelOutputSchema(policy) to emit the enum from ExtractableNodeType only. Add a CI test asserting that policy.allowedNodeTypes never includes "LENS" or "BECOMING" (value-level). Keep the existing policy-constructor table test. Re-run the end-to-end pipeline test.

2) Provenance vs provider schema: “No provenance field in provider schema” contradicts contract (ProposedNode.provenance is required)
- Observation: §4 says the model-facing schema omits provenance and the wrapper stamps provenance=EXTRACTED. But ProposedNode.provenance is required by the canonical contracts. §10 makes validation “canonical and strict,” and §7 applies the provenance stamp “after parsing.” If you validate provider output directly to ProposedNode, it fails missing required field; if you relax validation, you’ve split the shape.
- Why it matters: Ambiguous order-of-operations is a seam that will produce flaky “shape invalid” drops or encourage silent acceptance of partial shapes. It also risks reintroducing prompt-enforced controls if the fix is “tell the model to send provenance=EXTRACTED.”
- Action: Make the augmentation step structural and explicit:
  - Define a RawModelNode/RawModelEdge shape (no provenance) for provider IO.
  - Parse into RawModel*, then deterministically stamp provenance=EXTRACTED, then validate against the canonical ProposedNode/ProposedEdge.
  - Document and test the sequence (unit: provider omits provenance → wrapper adds it → canonical validation passes). Keep provider schema without provenance; keep canonical local validator strict.
  - Amend §10 sequence to specify augmentation-before-validation at per-candidate level.

3) runId/ExtractionRun.id identity is not specified, yet runId drives nonce fences and audit
- Observation: §3 ProposerInput.runId “ties proposals to an ExtractionRun”; §4 fences derive nonce from runId; Prisma ExtractionRun.id is a cuid; but the spec never requires runId=ExtractionRun.id nor requires pre-creating the run. If they diverge, auditability and re-run mapping break; nonce entropy rule might be subverted by a weak runId generator at the call site.
- Why it matters: Evidence keystone integrity depends on fence nonce (derived from runId), and audit replay depends on exact run linkage. Divergence can make a context unreplayable by post-hoc inspection.
- Action: Pin the invariant: runId MUST equal the persisted ExtractionRun.id. Create the ExtractionRun row first, pass its id as runId, derive fences from it. Add a CI test asserting fence nonce == f(ExtractionRun.id). Add a guard that rejects externally supplied runIds (wrapper generates/receives only server-issued ExtractionRun.id). Document f() explicitly (e.g., nonce = sha256(runId || “proposer”)[0..N]).

4) Proposal.payload persistence may store unsanitized model JSON, contradicting “unknown fields stripped”
- Observation: §4 “unknown fields are stripped deterministically,” yet Prisma Proposal.payload is described as “the raw ProposedNode / ProposedEdge,” and §10.4 promises persisting “original response (hash + payload).” It is unclear whether Proposal.payload holds canonicalized objects or the provider’s raw structure with unknown fields.
- Why it matters: Persisting unsanitized payload can smuggle policy-forbidden or prompt-injected fields into downstream/analytics code and violates the “controls structural” stance. It also breaks the “reason-set disjointness” guarantee if an analytics path ever keys on ad-hoc fields accidentally persisted.
- Action: Make canonicalization explicit:
  - Persist two things: (a) raw model response blob under rawResponseRef (audit only), and (b) Proposal.payload = the sanitized, canonical ProposedNode/ProposedEdge shape with unknown fields stripped and provenance stamped.
  - Add a unit test: injected extra fields in model output do not survive into Proposal.payload (but do exist in rawResponseRef).
  - Document this separation in §10.4 and §12. Add a payloadCanonicalized flag/version if helpful.

5) Solo-mode polarity guard is stated but has no structural carrier
- Observation: Gate spec v1.5 §1.1 mandates solo mode must not auto-commit interpretation-dependent transitions (QUESTIONED/LOOSENING/CONTRADICTED) on model-assigned polarity alone. The gate signature takes no policy; no interface in proposer or gate transports mode to the state computation. The spec hand-waves “covered by human in the loop” for the demo, but the structural rule is still prose-only.
- Why it matters: It’s a disconnected fix: rule declared with no algorithmic hook. In solo mode, without a deterministic guard, state can shift on a single COUNTERVAILING label, violating LAW 5’s honesty posture.
- Action: Choose and implement a structural location:
  - Option A (preferred): move the “solo-mode polarity corroboration” rule into the state machine (derivation code) with an explicit input (policy or mode) recorded in derivation.version, or:
  - Option B: add policy to the gate signature and make state computation policy-aware there.
  - Add a test mirroring gate test 15 but in the proposer/gate integration suite: solo mode proposal with single COUNTERVAILING span does not move state; corroborated/confirmed does.

MAJOR

6) Provider-enforced schema derivation realism/risk
- Observation: §4 relies on “provider-supported structured outputs / JSON schema” with a per-policy derived enum and omitted fields. In practice, provider behavior varies (enumeration enforcement, coercion of missing fields, unsupported union discriminators). This has delivery risk for a solo builder on a hard date.
- Why it matters: If provider enforcement is partial or flaky, you’ll fall back to local validation anyway. Building and maintaining schema variants per policy plus robust fallbacks is scope-heavy.
- Action: Lock a provider path for September (e.g., Anthropic structured JSON output or tool use). Specify the minimum: if provider schema fails to enforce, fail closed locally; never promote provider-level enforcement to a trust boundary. Add a “provider capability matrix” note (what’s enforced, what isn’t). Ensure the CI-deterministic tests stub provider enforcement to 0 so local validator is always exercised.

7) Cap ordering and fairness not pinned; selection bias risk
- Observation: §12 (CAP_EXCEEDED selection) says keep candidates “in model output order” and drop the excess. It does not state at which pipeline stage caps apply (pre/post wrapper guards). If caps apply pre-guard, you can waste capacity on soon-to-be-dropped items and spill allowed ones; if post-gate, “recall cap” is ill-defined.
- Why it matters: Invisible ordering choices can bias what users see and hurt measured recall/precision, and they are non-replayable if not pinned.
- Action: Pin the stage: apply recall caps after wrapper guards (shape/policy/third-party) but before gate. Persist the final kept-order index on each Proposal row for audit. Add a unit test: given mixed allowed/forbidden items beyond cap, post-guard kept set is deterministic and auditable.

8) Policy snapshot drift vector
- Observation: ExtractionPolicy contains practitionerRelationshipVerified and userConsentVersion booleans/strings, but the source of truth is PractitionerClient.verifiedAt/consentVersion. The spec says “server-derived only,” but nothing enforces alignment beyond prose.
- Why it matters: A future refactor could let a caller assemble an ExtractionPolicy-like object ad hoc, drifting from server state.
- Action: Make the policy constructor the only source of ExtractionPolicy (server-only module). Disallow accepting it from API requests. Add a type-level opaque brand to ExtractionPolicy (e.g., GeneratedPolicy) and an integration test that the proposer endpoint refuses client-supplied policy. Record the underlying practitionerClientId in policySnapshot for audit.

MINOR

1) Gate spec doc drift: ProposedEdge is missing inferenceDistance in §3.1 listing
- Observation: v1.5 changelog claims doc sync for inferenceDistance/telemetry, but the code fence under §3.1 omits inferenceDistance for ProposedEdge.
- Why it matters: Spec/code drift invites accidental drops and tests targeting the wrong layer.
- Action: Update the gate spec §3.1 code listing to include inferenceDistance/modelReportedConfidence for both nodes and edges (as per contract v2.1).

2) Oversize-entry behavior vs omittedEventIds wording ambiguous
- Observation: §12 says “v1 does NOT chunk: an oversized entry REFUSES the run… recorded in omittedEventIds.” If the run is refused, “omittedEventIds” sounds like partial omission but no run processing actually occurs.
- Why it matters: Ambiguous operator ergonomics and unclear telemetry semantics.
- Action: Clarify: “Refuse the run pre-call; record omittedEventIds = [oversizedEventIds]; set status=error; no proposals persisted.” Add an integration test asserting this lifecycle and user notice surfacing.

3) Nonce derivation function unspecified
- Observation: §4 defines nonce = f(runId), but not f(). Without minimal length/entropy spec, implementations may pick weak derivations.
- Why it matters: Integrity of fence collision guarantees hinges on nonce entropy/length.
- Action: Specify f() and length (e.g., nonce = first 16 bytes of sha256(runId || “proposer-fence”); fence prefix uses <<<SRC:${nonce}:${id}>>>). Add a negative test ensuring a too-short nonce is rejected in dev.

4) Small doc nits
- Observation: Test id references (2d2/2d3) and “policy truth table includes consent currency” may confuse without a link to the policy constructor tests; minor.
- Action: Link test id → file path/name; link policy constructor → server module path.

ENHANCEMENT

1) Add a runtime validator for runId entropy
- Action: Assert ExtractionRun.id conforms to cuid (or configured generator). Log and refuse otherwise in non-prod; warn in prod. Test this in CI.

2) Make Proposal payload normalization explicit
- Action: Add payloadVersion/sanitizationVersion to Proposal to document that payload is canonicalized shape vN; record any strip count in telemetry.

3) Improve third-party guard coverage metrics
- Action: In §13.9, log false positives/negatives against a larger set of adversarial phrases (e.g., “the way my mother…” not starting with possessive). Track miss rate longitudinally.

4) End-user recovery UX
- Action: In §10.5, specify user-visible banner copy/timeouts for retries; allow “View original entry” regardless of processing state. Ensure crisis classification bypass is Asserted in an integration test (retry can’t block crisis routing).

5) Delivery plan realism
- Action: For September demo: lock MVP scope — one provider, English-only, no chunking, per-policy schema optional (local strict validator mandatory), minimal but complete guard/test set (CI set + canary corpus). Defer dynamic provider schema in favor of local strict parse + drop unknowns.

What’s genuinely strong

- Structural blinding and fence-based injection containment are specified with precision (quote-transparent encoding, refusal on collision, byte-identity keystone). This is the right “data only” stance and tested.
- End-to-end seam thinking is evident: discriminated NodeRef, shadow edges with WAITING_ENDPOINT, inference-distance hold, and exact-label hypothesis matcher in the gate — all close prior cracks.
- Typed, disjoint rejection reason sets with stage separation and explicit Proposal outcome mapping provide excellent auditability and testability.
- Honest scope and asymmetries are named: models assign roles/polarities; labels can only restrict; non-determinism quarantined to proposer; replayability lives in gate. This upholds the nine laws, especially LAW 1/2/5.
- Test plan is split correctly (CI-deterministic vs canary), with a realistic eval corpus and pipeline ignition test — this is the kind of backbone that prevents regressions.

Tighten the few remaining seams (ExtractableNodeType, provenance augmentation order, runId identity, solo-mode polarity carrier, payload sanitization), and this spec will carry its philosophy into code.