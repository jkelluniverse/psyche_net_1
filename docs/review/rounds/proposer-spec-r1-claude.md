# Proposer Spec Review — Round 1 (Claude lane)

**Spec reviewed:** `Extraction Proposer — Module Specification · Psyche-Net · the adversarially-exposed front-end · v1.1 · governs /src/engine/proposer/` — exact version string: **v1.1**

**Verdict: Request Revisions**

The spec is substantially stronger than a typical v1.1 — injection containment, the byte-identity blinding keystone, and structural wound-gating are correctly designed. But the review found the same *class* of bug that v1.3 of the gate spec was written to kill (a field required by prose being dropped by the contracts that must carry it), recurring one round later on the inference-distance lane — plus a cluster of wrapper→gate and spec→schema seam breaks. Cross-references checked line-by-line: `CLAUDE.md`, `docs/citation-gate-spec.md` (v1.3), `prisma/schema.prisma`, `src/engine/contracts/extraction-contracts.ts` (CONTRACT_VERSION "v1").

---

## CRITICAL

### C-1. The inference-distance lane (§8, changelog item 4) is disconnected end-to-end — no downstream carrier exists

**Observation.** §8 states a deterministic downstream rule:

> "`HIGH_INFERENCE_INTERPRETATION` candidates **never auto-materialize** — they wait in the shadow buffer for recurrence at *lower* inference distance, or for practitioner/user confirmation."

Trace where that rule would have to execute, and the data is gone at every step:

1. **The gate spec never mentions it.** The string "inference" does not appear anywhere in `citation-gate-spec.md` v1.3. The gate's materialization rule (§6.1) reads only recurrence: *"≥ 2 distinct conferring evidence spans from ≥ 2 distinct source events"* — it has no inference-distance input, no stricter-threshold hook for sensitive types, nothing. Materialization is the gate's decision, and the gate has never heard of this field.
2. **The contract drops the field at the verification boundary.** `ProposedNode.inferenceDistance?` exists in `extraction-contracts.ts` — but `VerifiedEvidence` has no such field, `ShadowCandidate` has no such field (its fields are `candidateKey, type, provenance, label, ontologyKey?, timesSeen, evidenceCache, lastSeen`), and `GateResult` carries nothing inference-related. So a HIGH_INFERENCE candidate parked in the shadow buffer loses its classification: the buffer cannot know it is "waiting for recurrence at lower inference distance," because neither the candidate nor its cached evidence records any distance at all.
3. **No rejection/waiting reason exists for it.** `RejectionReason` in the contract has only `BELOW_MATERIALIZATION_THRESHOLD` (and schema `ShadowCandidate.waitingReason` is a free string with the same example) — a HIGH_INFERENCE hold is indistinguishable from an ordinary recurrence hold, so it can never be released under different rules.
4. **The spec contradicts itself on the field's granularity.** §6 lists `inferenceDistance` under "**Per-evidence fields** (canonical definitions)", while §8 says "every **proposal** carries a model-assigned classification" and the contract puts it on `ProposedNode`/`ProposedEdge` (per-proposal), not `ProposedEvidence`. A builder writing the prompt's JSON schema from §6 emits per-evidence distances the shape validator has no slot for; and either way, the aggregation rule for a node with one DIRECT quote and one HIGH_INFERENCE quote is undefined.

**Why it matters.** This is changelog item 4 — a headline fix of this round — and it is currently prose with no interface, algorithm step, or test on the deciding side. It is the exact failure pattern the gate v1.3 changelog describes for role/polarity: *"were in `ProposedEvidence` (v1.2) but were dropped at `VerifiedEvidence` … so the becoming-ignition fix was disconnected end-to-end."* The compensating story for LAW 2's honest scope ("guarded by … recurrence thresholds") leans on this rule working; as specified, an overreaching proposal with two recurring perfect quotes materializes exactly like a direct declaration.

**Recommended action.**
- Pick one granularity (per-proposal is simpler and matches the contract) and fix §6's field list.
- Carry the classification through: add `inferenceDistance` to `ShadowCandidate` (contract + `schema.prisma`), define the deterministic aggregation (max-distance-wins across sightings, or per-sighting history), and add a distinct waiting reason (e.g. `HELD_HIGH_INFERENCE`).
- Amend gate spec §6.1 (→ v1.4) with the inference-aware materialization rule and the per-construct stricter thresholds §8 promises ("in the per-construct ontology config" — currently the gate spec has no such hook), bump `contractVersion`, and add a gate-side test mirroring proposer test 7 (the current test 7 asserts the model *classifies* correctly, which is the soft half; the deterministic half — "classified HIGH_INFERENCE ⇒ held" — must be a gate/threshold test).

---

## MAJOR

### M-1. High-inference edges "wait as candidates," but the shadow lane structurally holds only nodes — and the gate spec does the opposite

**Observation.** Proposer §6 (and changelog item 9): DRIVES/ROOTED_IN *"cannot auto-materialize from a single event (recurrence or confirmation required; **they wait as candidates**)."* But the only waiting mechanism is `ShadowCandidate`, whose `type` is `NodeType` in both the contract and `schema.prisma` — there is no edge shadow candidate anywhere. Meanwhile gate spec §4 says the opposite thing for thin edges: *"an edge may exist as a low-confidence hypothesis if its endpoints exist but its own evidence is thin"* — i.e. it **materializes** immediately at low confidence rather than waiting.

**Why it matters.** Test 8 ("DRIVES/ROOTED_IN from single co-occurrence → candidate only, never auto-materialized") is unimplementable as specified — there is nowhere for the candidate to live — and the two specs give a builder contradictory instructions for the same input. Causal/origin edges are precisely the over-interpretation surface §8 worries about.

**Recommended action.** Either add an edge shadow lane (`ShadowEdgeCandidate` or a `kind` discriminator on `ShadowCandidate`, contract + schema + gate §6.1 edge threshold), or explicitly change the rule to "materializes as low-confidence hypothesis edge with a stricter confidence floor" and update proposer §6/§13-test-8 to match. Pick one; both documents must say the same thing.

### M-2. Edge-endpoint contract contradiction: §3 mandates `NodeRef`, but the declared canonical output uses flat strings — and flattening reintroduces the collision `NodeRef` exists to kill

**Observation.** Spec §3: *"Edge endpoints use a discriminated ref to kill namespace collisions: `type NodeRef = { kind: "PROPOSED"; tempId } | { kind: "EXISTING"; nodeId }`"* — and, in the same section: *"**Output:** exactly the canonical `ProposerOutput` from the contract module."* But the canonical `ProposedEdge` is `sourceTempId: string; targetTempId: string`. The contract file resolves this only in a comment: *"NodeRef is the raw-model shape; the proposer's edge-ref guard resolves NodeRef → the plain string endpoints … before anything reaches the gate."* The spec body never states this resolution. Worse, after flattening, the PROPOSED/EXISTING distinction is erased: gate spec §3.1 says the string *"refers to a ProposedNode.tempId **or** existing node id"*, so the gate disambiguates by string membership — and a model-minted `tempId` that collides with a real node id (tempIds are model-controlled text; §4 says the model "cannot mint or reference IDs outside the provided set" for *sources*, but nothing constrains tempIds) is silently ambiguous again.

**Why it matters.** The stated purpose of `NodeRef` ("kill namespace collisions") is defeated by the layer that consumes it, and a builder reading only the spec will emit `NodeRef` in `ProposerOutput` and fail against the gate. tempIds are attacker-influenceable via injection (the model writes them), so "unlikely collision" is not a boundary.

**Recommended action.** State the raw-shape→canonical resolution in §3 prose. Make collisions structural non-events: have the wrapper rewrite proposed tempIds into a reserved namespace (e.g. prefix `p:`) or reject any tempId that matches an id in `priorExtractedNodes` (a fifth policy guard, one line, plus a test). Alternatively adopt `NodeRef` end-to-end in the contract and gate — but then bump `contractVersion` and gate spec.

### M-3. Injection escaping and chunking can silently break the citation gate's verbatim match — the two specs' string spaces are not reconciled

**Observation.** §4 requires: *"Delimiter collisions in the text are **escaped/encoded**"* and §12 allows chunking (*"a too-long entry is chunked at paragraph boundaries"*). The model therefore quotes from the **escaped, chunk-relative** text it was shown. The gate validates against the **original** `SourceRecord.content` under a fixed normalization whose steps are exactly: *"Unicode NFKC … collapse whitespace … curly quotes/apostrophes to straight, en/em dashes to hyphen … case-fold"* (gate §5) — there is no unescape step. So a journal entry containing delimiter-like text (the very entries §4 exists for — and test 2d deliberately constructs them) yields quotes that are verbatim to what the model saw but *not* verbatim to the source → `QUOTE_NOT_FOUND` → true evidence rejected, systematically, for exactly the adversarial-looking inputs. Relatedly, `offsetHint` is defined in the contract as an offset *"in the ORIGINAL source content"*, but the model can only count positions in the escaped chunk it received; for every chunk after the first, hints are wrong by the chunk base, triggering the far-hint fallback and its confidence penalty (`hintFallback` / `hintFallbackSignal` in the contract) as an artifact of chunking, not model error.

**Why it matters.** The evidence mandate is violated by omission for the entries most likely to matter in an adversarial review, and confidence is silently depressed by an architectural artifact. Test 2d only asserts containment, not that quotes from delimiter-bearing entries still round-trip through the gate.

**Recommended action.** Add an explicit invariant to §4: *the context builder's encoding must be quote-transparent* — either (a) use collision-proof delimiters (random per-run nonce fences) and refuse/flag rather than rewrite source characters, or (b) if any character rewriting occurs, the wrapper must deterministically reverse it on emitted quotes before the gate. Require the wrapper to rebase `offsetHint` by the chunk's base offset. Add a test: an entry containing the literal delimiter string produces a quote that the gate accepts with a correct original-content span.

### M-4. Test 4 asserts the wrong layer: LENS/BECOMING are valid members of the closed enum, so the closed-enum check cannot fail them

**Observation.** §13 test 4: *"a model-emitted LENS/BECOMING type **fails the closed-enum check**."* But the contract's closed `NodeType` includes `"BECOMING" | "LENS"` (it must — the gate and graph use them), so shape validation passes them. The only thing that can drop them is guard §7.1 (`type ∉ policy.allowedNodeTypes`) — and the spec never pins down how `allowedNodeTypes` is constructed; §6 lists the *prompted* types per mode, but nothing states that the server-side policy constructor structurally excludes LENS/BECOMING (and WOUND-in-solo) from `allowedNodeTypes`. If policy construction is buggy, no other layer catches a model-emitted LENS node, which — after the wrapper stamps `provenance = EXTRACTED` — would sail through the gate as an evidenced EXTRACTED node of type LENS.

**Why it matters.** This is an invalid test (it will be written, will fail for the wrong reason or be "fixed" by weakening the enum), and the actual enforcement rests on an unspecified function. The reviewer prompt calls this class out directly: a prose rule no interface or test actually carries.

**Recommended action.** Rewrite test 4 to target guard §7.1 (hand-crafted LENS/BECOMING/WOUND output + each policy mode → dropped and logged). Specify the `allowedNodeTypes` derivation table in §3 (SOLO → exactly {SHADOW, BELIEF, PROTECTION, PATTERN, TRAIT, RESOURCE}; PRACTITIONER_SUPPORTED → +WOUND; LENS/BECOMING never) and add a unit test on the policy constructor itself.

### M-5. Wrapper-stage rejections have no canonical machine-readable type — the "one contract module" rule is violated by the wrapper's own outputs

**Observation.** The spec's own principle: *"All shared types now live in one canonical contract module."* Yet every drop the wrapper performs is contract-less: §7.1 policy drops ("dropped **and logged**"), §9 third-party rejections ("**Machine-readable rejection reasons retained**"), §10.3 per-candidate shape failures ("rejected individually **with a machine-readable reason**"), and M-2's dangling-edge drops. The only rejection type in the contract is `RejectionReason`, whose seven values are all gate-stage (`QUOTE_NOT_FOUND` … `AMBIGUOUS_QUOTE`) — there is no `POLICY_TYPE_DROPPED`, `THIRD_PARTY_SUBJECT`, `SHAPE_INVALID`, or `DANGLING_EDGE_REF`, and no wrapper result envelope at all. §12's tuning telemetry (*"third-party rejection rate, dangling-edge rate"*) has nothing typed to count.

**Why it matters.** These reasons will be invented ad hoc as strings in `Proposal.rejectionReason`, drift between builders/rounds, and make the §2 table's honest-inventory claim un-auditable. This is a seam the round's own root-cause analysis ("contracts in two documents — that ends here") should have closed.

**Recommended action.** Add to `extraction-contracts.ts`: a `WrapperRejectionReason` union, a `WrapperResult` (or extend `RejectedItem` with a `stage: "WRAPPER" | "GATE"` discriminator and widen the reason union), bump `CONTRACT_VERSION`, and reference it from §7/§9/§10.

### M-6. Spec-mandated run-audit fields have no home in `schema.prisma`

**Observation.** §12: *"Every `ExtractionRun` records: provider, model, `promptVersion`, `promptTemplateHash`, `ontologyVersion`, `contractVersion`, `policySnapshot`, token counts, cost, latency, status, **attempts**"*; §10.4: *"Persist everything: **original response (hash + payload** under the retention policy), **repair request/response** if any, **parser version**, per-candidate outcomes. **Attempts are tracked separately** on the `ExtractionRun`"*; §4: *"**omitted events are recorded on the run**."* The `ExtractionRun` model in `schema.prisma` has none of: `attempts`, raw response hash/payload, repair request/response, `parserVersion`, omitted/deferred event ids. (Everything else checks out: provider/model/promptVersion/promptTemplateHash/ontologyVersion/gateVersion/contractVersion/policySnapshot/tokensIn/tokensOut/costUsd/status are present; latency is derivable from startedAt/finishedAt.)

**Why it matters.** Retry semantics (§10.5) and the "never silently truncated" cap rule (§4) are audit claims with no persistence; the first errored run in production will have no record of what was attempted or omitted, and replaying the gate over persisted proposals cannot reconstruct a run whose raw response was never stored.

**Recommended action.** Add to `ExtractionRun`: `attempts Int @default(1)` (or an `ExtractionAttempt` child table if repair req/resp are stored per attempt), `responseHash String?`, `rawResponseRef String?` (pointer under the retention policy, not necessarily inline), `parserVersion String?`, `omittedEventIds Json?`. Note the retention policy governing the raw payload explicitly.

---

## MINOR

### m-1. The wrapper's structural types exist only in prose, contradicting "the code file is the contract"

§3's `ProposerInput`, `ExtractionPolicy`, `PriorNodeView` and §5's `BlindedExtractionContext` — including the blinding allowlist type, the keystone structural control — appear in no code module; `extraction-contracts.ts` does not contain them and the spec names no other home. Either add them to the contract module (they are shared with the run-persistence layer via `policySnapshot`) or name the wrapper module file that owns them, so the keystone test has a typed target from day one.

### m-2. `practitionerRelationshipVerified` and `userConsentVersion` have no schema backing

The policy is *"constructed from authenticated server state — the **verified** practitioner↔client relationship, the **accepted consent version**"* — but `PractitionerClient` in `schema.prisma` carries only `createdAt` and `consentScope Json @default("{}")`: no verification status/timestamp, and no consent-version record anywhere. As modeled, "verified" can only mean "a link row exists," which is exactly the mutable-input-as-authorization mistake §3 corrects for `userRole`. Add `verifiedAt DateTime?` (and how verification happens) and a consent-version field, or specify that `consentScope` JSON carries them with a documented shape.

### m-3. Retry "N failures" and backoff are unnamed magic numbers

§10.5: *"after **N failures**, surface a gentle non-nagging notice"* — CLAUDE.md: *"Every threshold, weight, and half-life lives in named, versioned configuration … never as an inline literal."* The spec is diligent about this everywhere else (§12 caps are "in versioned config"). Name them (`maxExtractionRetries`, backoff schedule) in the same config.

### m-4. §13 mixes deterministic wrapper tests with stochastic model-behavior tests under one "write before wiring live" suite

Tests 6 (role conservatism), 7 (classification), 9 (third-party battery, partially), and 12 (empty-in-empty-out) assert on live model output — flaky by the spec's own §13.1 standard ("non-deterministic model ⇒ flaky test, wrong layer"). Test 5 is correctly labeled a "canary"; the others aren't. Split the list explicitly into (a) CI-deterministic wrapper tests (1, 2b–2d structural halves, 3, 4, 8-deterministic-half, 10, 11) and (b) eval-corpus canaries run on prompt/model change (5, 6, 7, 9, 12, 13), so a red canary doesn't block CI and a green CI isn't mistaken for behavioral coverage.

### m-5. Contract `ShadowCandidate` is missing `distinctSources` and `waitingReason` that both the gate spec and the schema require

Gate spec §3.3: *"ShadowCandidate mirrors the schema model … `{ candidateKey, type, provenance, label, timesSeen, **distinctSources**, **waitingReason**, evidenceCache, … }`"*; `schema.prisma` has both columns. The contract interface has neither (`distinctSources` is derivable from `evidenceCache` source ids, but then the schema column is denormalized against nothing; `waitingReason` is simply absent). Align the three — this also intersects C-1's new waiting reason.

### m-6. The crisis-classification seam (LAW 7) is unnamed in the pipeline

LAW 7: *"crisis classification runs on every inbound entry."* §14's pipeline diagram and §10's retry path never mention it. State explicitly that safety classification is upstream of / independent from the proposer queue, so an entry stuck in extraction retry-with-backoff (§10.5) cannot delay crisis routing — one sentence closes it, and its absence is exactly the kind of gap a clinical advisor will probe.

---

## ENHANCEMENT

### E-1. Size the eval corpus before it becomes the schedule risk

Test 13 is the go/no-go instrument and now requires hand-labeled **semantic entailment separately from citation precision, per node type and per edge type**, plus adversarial injection and third-party batteries. For a solo builder on a hard date, that labeling burden is the most likely silent slip. Specify a minimum viable corpus (e.g. N entries covering each node type ×3, each edge type ×2, ~10 adversarial, ~5 flat) and timebox it, so "run the eval corpus" is a bounded task rather than an open-ended one.

### E-2. Give the §2 table test-traceability

The threat table is the artifact you'll hand a clinical advisor; add a test-ID column mapping each containment row to the §13 test(s) that prove it (most map cleanly today; the rows that don't — polarity, third-party — are honestly labeled soft, which the column would make visible rather than implied).

---

## What's genuinely strong

- **Injection containment as a first-class invariant** (§4) is the right threat model at the right boundary, with the correct honest observation that the gate cannot catch maliciously-induced real quotes — few specs at this stage even name the journal as an attack surface.
- **The blinding keystone test at the context layer** (byte-identity of the serialized request, not output equality) is the correct layer and correctly explained; the "honest edge" paragraph about prior-label priming, with the two-phase design logged as a measurable A/B rather than built speculatively, is META-01 discipline done properly.
- **`ExtractionPolicy` replacing a client-mutable role string**, with the policy snapshot persisted per run and the explicit "a practitioner working on their own material is SOLO" rule, closes a real authorization hole with a real boundary.
- **The control-class principle** (§2: structural / semi-structural / soft, honestly labeled) is an unusually honest inventory, and the wound-gate reasoning ("display-gating does nothing for the database") is exactly right about consent posture and breach scope.
- **§10's partial-validity + bounded-repair + retryable-error design** correctly refuses to let fail-closed become fail-silent, and the observation that repair must never fix *semantic* content is a subtle line drawn in the right place.
- The becoming/role/polarity seam from the last round is verifiably closed on both sides (`VerifiedEvidence` carries `role`/`polarity`; gate §4 computes conferring per the full §6 rule) — the round's process works; C-1 is an argument for running it again, not for doubting it.

*— End of review. Proposer spec v1.1: Request Revisions — 1 CRITICAL, 6 MAJOR, 6 MINOR, 2 ENHANCEMENT.*
