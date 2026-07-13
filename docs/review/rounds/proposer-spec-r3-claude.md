# Adversarial Spec Review — Round 3 (Claude lane, FINAL round)

**Spec reviewed:** Extraction Proposer — Module Specification, **v1.3** (`docs/proposer-spec.md`, "Psyche-Net · the adversarially-exposed front-end · v1.3 · governs `/src/engine/proposer/`")

**Verdict: Request Revisions** — one Critical stands. It is small to fix and fully testable, but it is a semantic-evidence defect introduced by the round-2 edit itself, and the charter (Jacob's amendment) says edits that alter evidence semantics are never CHEAP. It cannot be waved through on the exit round.

**Cross-references checked line-by-line:** CLAUDE.md; citation-gate-spec.md v1.5; prisma/schema.prisma; extraction-contracts.ts CONTRACT_VERSION v2.1.

---

## Round-2 closure verification (both sides)

| Closure | Proposer side | Gate/contract/schema side | Holds? |
|---|---|---|---|
| Roles pass through untouched + pipeline ignition test | §6 role bullet (A-1) | Gate §6 conferring rule; gate §9 test 18 | **Structurally yes — but the passthrough semantics are broken for non-BECOMING nodes; see CRITICAL-1** |
| Gate v1.5 exact-label hypothesis-matcher | §5 (matching downstream), §6 ref to test 18 | Gate §7 v1.5 matcher paragraph | Yes — but precedence unspecified (MAJOR-4) and live hit-rate unexamined (MAJOR-5) |
| Inference hold on ALL edge types | §8 unqualified claim | **Changelog only** — gate body §4/§6.1/test 17 still read causal-only | **No — MAJOR-2** |
| Discriminated shadow endpoint refs + WAITING_ENDPOINT | §7.6 ("gate sole writer of shadow") | Contract `ShadowEndpointRef`, `ShadowWaitingReason`; schema `sourceRef`/`targetRef`/`waitingReason` | Refs: yes. WAITING_ENDPOINT: **no per-item carrier — MAJOR-1** |
| `ontologyKey` persisted on ShadowCandidate | — | Contract node branch + schema `ontologyKey String?` with first-seen comment | Yes |
| Per-policy model-facing schema | §4 `buildModelOutputSchema(policy)`, unit-tested, no provenance field | n/a | Yes |
| Chunking = post-pilot refuse+record | §4 caps, §12 D6 | Schema `ExtractionRun.omittedEventIds` | Yes |
| Contract v2.1 `ExtractableNodeType` | §3 `ExtractionPolicy` **still declares `NodeType[]`** | Contract defines the type and claims policy-unrepresentability | **Half — MAJOR-3** |

---

## CRITICAL

### CRITICAL-1 — The role-passthrough closure makes correctly-labeled ENACTMENT evidence confer ZERO mass on every extracted node, and the blinded proposer cannot avoid producing it

**Observation.** Gate spec §6 (and the contract's `VerifiedEvidence.conferring` doc, identically): `conferring = SELF ∧ not-invalidated ∧ (node.type === BECOMING ? role === ENACTMENT : role === SUPPORT)`. Proposer §6 defines the roles node-type-agnostically — ENACTMENT is "the person reporting actually living the quality ('I stayed calm when he yelled')" — and v1.3 passes labels through untouched. The proposer is blinded (§5), so it cannot know whether a proposal will land on a BECOMING node; it labels by the quote's character. "I stayed calm when he yelled" attached to an extracted TRAIT "calm under pressure" is a *correct* ENACTMENT label per the spec's own definitions — and it confers **nothing**, because non-BECOMING conferring demands `role === SUPPORT`. Worse, the spec actively wants generous ENACTMENT labeling: §6 calls ENACTMENT labels "the ignition supply for the gate's becoming-label merges." The same label that is essential supply for one lane is mass-poison in every other lane, and the blinded model cannot tell the lanes apart.

**Why it matters.** This is not the "mislabel can only UNDER-confer" case the spec owns — it is *correct* labels systematically under-conferring on the strongest class of evidence there is (lived behavior reports), in the most common journaling mode. A behavior-heavy journal yields evidence that never counts toward the ≥2-conferring-span materialization threshold: nodes silently never materialize, the map stays sparse, and every listed test stays green (test 6, test 14, test 18, gate tests 1–17 all pass). The evidence mandate is violated by omission — the person's lived words were given and structurally could never confer. Detection today is only the eval-corpus recall number, a post-hoc canary with no named cause. v1.2's flatten-to-SUPPORT made DECLARATION confer (round 2's Critical, correctly reversed); v1.3 over-corrected into the mirror defect for ENACTMENT. Both specs and the contract carry the rule consistently — the seam is closed, and the closed semantics are wrong.

**Action.** Change the non-BECOMING conferring rule to `role !== DECLARATION` (SUPPORT *and* ENACTMENT confer; DECLARATION confers nowhere, ever) in gate spec §6, the contract's `VerifiedEvidence.conferring` doc, and the Evidence-model comment in schema.prisma (which currently restates the `role == SUPPORT` form). This preserves every asymmetry the round-2 fix wanted: DECLARATION still cannot create mass on any type; ENACTMENT remains the only ignition fuel for BECOMING; test 18 stays green untouched. Add the missing test: *ENACTMENT-role SELF evidence on an extracted (non-BECOMING) node confers and counts toward materialization; DECLARATION-role evidence on the same node confers 0.* Per the charter this is a non-CHEAP evidence-semantics edit — version-bump the gate and re-run the eval corpus.

---

## MAJOR

### MAJOR-1 — `WAITING_ENDPOINT` has no per-item carrier: the v1.5 GateResult→Proposal outcome mapping is unimplementable as specified

**Observation.** Gate spec §7 (v1.5, C-3): hold reasons (`BELOW_MATERIALIZATION_THRESHOLD`, `HELD_HIGH_INFERENCE`, `WAITING_ENDPOINT`) map per-item to `Proposal.outcome = "shadow"`. The first two are members of the contract's `RejectionReason`, so a held item can surface as a `RejectedItem` with a `tempId` the writer can join to a persisted `Proposal` row. `WAITING_ENDPOINT` exists only in `ShadowWaitingReason` — it is not in `RejectionReason` nor in `GATE_REJECTION_REASONS` — and `ShadowCandidate` entries carry no `tempId`. So an edge held for a subthreshold endpoint has no per-item representation the post-gate writer can consume: its Proposal row either gets a wrong reason (`EDGE_ENDPOINT_REJECTED` means *rejected*, the opposite of the round-2 fix's intent) or no outcome at all. And if a row does get `rejectionReason = "WAITING_ENDPOINT"`, the tested "stage recoverable from reason alone" property silently fails — the value is in neither disjoint array.

**Why it matters.** This is a new crack introduced by the round-2 edit: the WAITING_ENDPOINT closure landed on the buffer side but not the outcome side. It breaks the audit chain (a "held, not lost" edge is unaccountable in Proposal telemetry) and un-tests the disjointness guarantee the contract advertises.

**Action.** Add `"WAITING_ENDPOINT"` to `RejectionReason` and `GATE_REJECTION_REASONS` in the contract (v2.2), specify that the gate emits a per-item `RejectedItem` (stage GATE, `tempId` intact) for **all three** hold reasons alongside the shadowBuffer entry, and extend the disjointness value-test to cover it. One sentence in gate §3.3 and §7 each.

### MAJOR-2 — "The inference hold covers ALL edge types" exists only in the changelogs; the gate's normative body and tests still say causal-only

**Observation.** Both v1.3 (proposer) and v1.5 (gate) changelogs announce the hold extends to edges of every type. But gate §4's edge rule still reads, unqualified: "Non-causal edge types (EXPRESSES_AS, REINFORCES, SOFTENED_BY, PROTECTS_FROM) may exist as low-confidence hypotheses when thin." Gate §6.1's D1 hold paragraph sits inside the *node*-materialization section; the edge-materialization paragraph (D2) mentions only DRIVES/ROOTED_IN recurrence thresholds and no `inferenceDistance` hold. Test 17 asserts "non-causal thin edges still materialize as low-confidence hypotheses" with no HIGH_INFERENCE qualifier, and no test fixture anywhere covers a `HIGH_INFERENCE_INTERPRETATION`-classified EXPRESSES_AS edge.

**Why it matters.** This is the disconnected-fix class this loop exists to kill — round 1's C-4 was exactly a changelog/prose rule with no downstream carrier. An implementer following the normative sections materializes a high-inference non-causal edge, passes every listed test, and falsifies proposer §8's unqualified "never auto-materialize" claim a second time.

**Action.** Sync the body: gate §4's non-causal sentence gains "unless held under §6.1's inference rule"; §6.1's D1 paragraph states explicitly that it applies to node AND edge candidates of every edge type (the contract already carries `inferenceDistance` on `ProposedEdge` and `ShadowCandidateCommon`, so this is prose + one fixture). Extend test 16 or 17 with a high-inference EXPRESSES_AS edge → held `HELD_HIGH_INFERENCE`, released on lower-distance sighting.

### MAJOR-3 — §3's `ExtractionPolicy` still types `allowedNodeTypes: NodeType[]`, defeating the stated purpose of contract v2.1's `ExtractableNodeType`

**Observation.** The v1.3 changelog and the contract's doc comment both claim LENS/BECOMING are "unrepresentable in an ExtractionPolicy." But the one interface that claim is about — `ExtractionPolicy` in proposer §3, which the spec says lives in `/src/engine/proposer/types.ts` — still declares `allowedNodeTypes: NodeType[]`. As written, `["LENS"]` type-checks. The unrepresentability move has no carrier in the type it exists to constrain.

**Why it matters.** Defense-in-depth survives (the derivation table never emits LENS/BECOMING; the extractable-enum shape guard fails them), so this is not a runtime breach — but it is a spec-internal contradiction stamped as a closure, and the per-policy schema builder (`buildModelOutputSchema`'s enum = `policy.allowedNodeTypes`) inherits the looser type, so a future policy-constructor bug could re-leak forbidden types into the model-facing schema with no compile error.

**Action.** §3: `allowedNodeTypes: ExtractableNodeType[]` (imported from the contract), and note that `buildModelOutputSchema`'s enum parameter is typed the same. Two-line edit; the derivation-table unit test is unchanged.

### MAJOR-4 — The v1.5 hypothesis-matcher's precedence against ordinary dedupe is unspecified, and its label-only match ignores type

**Observation.** Gate §7 now contains two deterministic merge rules that can claim the same proposal: (a) dedupe — "same type + normalized label" merges into an existing node; (b) the v1.5 matcher — an EXTRACTED proposal whose normalized label exactly equals an existing BECOMING node's label merges into the hypothesis. A proposal labeled "patience" arriving when the graph holds both an EXTRACTED TRAIT "patience" and a BECOMING "patience" matches both rules; the spec pins no precedence and doesn't say whether evidence may attach to both. Separately, the matcher is label-only: a SHADOW-typed proposal with a coincident label merges into a BECOMING node — a semantic mismatch the exact-label rule happily performs.

**Why it matters.** The gate's determinism is its identity ("same inputs → same output, always"); an unspecified precedence means two correct implementations diverge, and the idempotency/replay guarantees become implementation-defined. The type-blind merge can route countervailing shadow-flavored evidence into an aspiration node.

**Action.** Pin precedence in gate §7 (recommend: same-type dedupe wins; the becoming-matcher applies only when no same-type existing node matches), state that evidence attaches to exactly one target per pass, and either restrict the matcher to proposal types plausibly enactment-bearing (e.g., exclude SHADOW/WOUND) or explicitly own the type-blind merge. Add a gate test for the double-match case.

### MAJOR-5 — Ignition is formally reachable (test 18) but realistically near-unreachable live: the only route is a blinded proposer coincidentally emitting the byte-exact normalized becoming label

**Observation.** Round 2 forced the matcher into existence because IGNITED was unreachable in the live pipeline. The v1 matcher requires exact normalized-label equality — but the proposer never sees the becoming node's label (blinding, correctly) and is instructed to "prefer the person's own language" from *this entry's* words. The probability that an independently-extracted label equals the becoming label byte-for-byte after normalization is close to zero outside crafted fixtures. Test 18 passes; the September ceremony may never fire on a real client.

**Why it matters.** Delivery realism on the headline demo mechanic. Round 2 classified "IGNITED unreachable in the live pipeline while tests stay green" as its Critical; the exact-label matcher re-narrows the same door to a coincidence. Fuzzy matching is rightly post-pilot — but the spec should not leave the pilot with no realistic path.

**Action.** (1) Name matcher hit-rate as a tracked eval metric with an explicit go/no-go floor for the demo. (2) Add the deterministic bridge the spec already half-endorses: §8 accepts "practitioner/user confirmation" as a release mechanism for held candidates — extend the same confirmation lane to hypothesis matching (user/practitioner confirms "this extracted node is my becoming," a deterministic, consented, blinding-preserving merge). That is a small, structural v1 answer; fuzzy matching stays post-pilot.

---

## MINOR

### MINOR-1 — Test 18 is unassigned in the proposer's own suite split
Gate spec §9 says test 18 "lives in the proposer suite," and proposer §6 relies on it mutation-failing any reintroduced normalization — but §13's CI-deterministic/canary enumeration lists only tests 1–13. A test that must block CI to do its job has no suite. Add it to §13's CI-deterministic list explicitly (it is fixture-driven raw output through real wrapper + real gate, so it is CI-safe).

### MINOR-2 — `candidateKey`/`MATCH_KEY` embed `normalizedLabel` with no normalization version
Shadow identity is `type::normalizedLabel` (schema `candidateKey`, contract `ShadowEndpointRef.MATCH_KEY`), but unlike `Evidence.normalizationVersion`, keys carry no version. A normalization-rule upgrade silently mints new keys: recurrence counts reset, held evidence never promotes, and "held, not lost" quietly becomes "held, then stranded." Note the migration obligation (rekey shadow candidates on normalization version bump) or stamp the version into the key.

### MINOR-3 — Gate §6.2's mass formula omits the polarity filter the contract carries
§6.2 sums "over conferring evidence"; the contract's `VerifiedEvidence` doc and `MassDerivation.conferringSupportingCount` say only *conferring, SUPPORTING-polarity* evidence contributes. The code file is canonical, but a countervailing quote adding mass would be a real bug and §6.2 is where an implementer will look — add "SUPPORTING-polarity" to the §6.2 formula text.

### MINOR-4 — "Current required consent version" has no named config home
The §3 derivation table compares `consentVersion` to "the current required version," which appears nowhere as named, versioned configuration — a no-magic-numbers invariant miss on an authorization input. Name it (e.g., `consent.requiredVersion`) in versioned config and cite it from the table.

---

## ENHANCEMENT

### ENH-1 — Say out loud that PRACTITIONER_SUPPORTED is relationship-scoped, not session-scoped
As specified, a client with a verified relationship + current consent gets WOUND extraction on every entry — including the 1 a.m. solo journal written with no practitioner anywhere near it. That is probably intended (consent covers it; the wound *layer* is display-gated per LAW 7), but §7's rationale ("don't extract what you're not equipped to hold") was argued for solo mode and the boundary case is never named. One sentence in §3 or §7 making it a decision rather than an accident; consider a `consentScope` flag for clients who want practitioner-session-only wound extraction.

### ENH-2 — Finish the gate-spec prose sync the v1.5 changelog claims
v1.5 says "§3.1 listings synced with contract v2.1," but §3.3's listings still lag: `GateResult` lacks `ontologyCandidates` and the five version-stamp fields; `VerifiedEvidence` lacks `authorship`, `normalizationVersion`, `hintFallback`; `AcceptedNode` lacks `existingNodeId` and `derivation`. Harmless under code-is-contract doctrine, but a claimed sync that is half-done is exactly the drift the doctrine was written against. Sync §3.3 or scope the changelog claim to §3.1.

---

## What's genuinely strong

- **The loop is visibly working on itself.** v1.3's changelog opens by owning that round 1's own fix was round 2's Critical, in the active voice, and amends the charter accordingly. That epistemic posture — plus the D-numbered decision trail — is rare and worth protecting through these final edits.
- **The unrepresentability discipline is the right instinct everywhere it's applied**: NodeRef discriminated end-to-end, `ExtractableNodeType`, the typed `BlindedExtractionContext`, disjoint value-tested reason sets. MAJOR-3 is a carrier slip, not a philosophy failure.
- **Quote-transparent nonce fencing (§4) is a genuinely elegant solve** for the injection/verbatim collision: deterministic per-run, byte-preserving, fail-refuse on collision, with the 2d3 round-trip keystone. This is the hardest constraint pair in the spec and it's handled cleanly.
- **The §2 threat table with control-class honesty** (structural / semi-structural / soft, each with test-id traceability) is exactly the artifact to hand a clinical advisor, and the spec resists the temptation to overclaim its soft controls (§9's third-party guard honesty is exemplary).
- **The CI/canary suite split** — refusing to let stochastic model behavior into CI while refusing to let green CI masquerade as behavioral coverage — is the correct testing epistemology for an LLM pipeline, stated crisply.
- **Blinding remains uncompromised through three rounds of pressure**, including the v1.5 matcher, which was placed downstream in deterministic code precisely so the ignition fix wouldn't erode the invariant. The honest edge (prior-label priming) stays named rather than hidden.

*— End of round-3 Claude review. 1 CRITICAL · 5 MAJOR · 4 MINOR · 2 ENHANCEMENT.*
