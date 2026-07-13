# Adversarial Spec Review — Round 2 (Claude lane)

**Spec reviewed:** `Extraction Proposer — Module Specification · Psyche-Net · v1.2` (header, line 3 of `/docs/proposer-spec.md`). Note: the document's own footer still reads "*End of proposer spec v1.1*" — see MINOR-1.

**Cross-references checked line-by-line:** CLAUDE.md; citation-gate-spec.md v1.4; prisma/schema.prisma; extraction-contracts.ts (`CONTRACT_VERSION = "v2"`).

**Verdict: Request Revisions.**

One CRITICAL: the v1.2 role-normalization edit (C-4) deterministically defeats a gate conservatism rule and orphans the becoming-ignition mechanic's only specified evidence supply — the round-1 fix disconnected the round-0 fix. The MAJORs are mostly one-paragraph fixes, but three of them are new cracks introduced by the round-1 edits themselves, which is exactly what this round exists to catch.

---

## Round-1 closure verification (checked on both sides, not re-reported)

| Round-1 finding | Status |
|---|---|
| Inference-distance disconnect | **CLOSED for nodes.** Gate v1.4 §6.1 (`HELD_HIGH_INFERENCE`, lowest-seen release), contract `ShadowCandidateCommon.inferenceDistance` + `ShadowWaitingReason`, schema `ShadowCandidate.inferenceDistance`/`waitingReason`, gate test 16. **PARTIAL for edges** — see MAJOR-2. |
| NodeRef seam | **CLOSED at contract/wrapper/gate** (v2 `NodeRef` end-to-end, `AcceptedEdge` included, resolve-by-kind in gate §4). **Regressed at the persistence layer** — see MAJOR-3. |
| Delimiter escaping | **CLOSED** (quote-transparent nonce fences, refuse-never-rewrite, tests 2d2/2d3, real-gate round-trip). Residual couplings: MAJOR-1 (chunking contradiction), MINOR-7 (nonce/runId/retry semantics). |
| Edge shadow lane | **CLOSED** (gate §6.1 D2, schema `kind`/`edgeType`/`sourceKey`/`targetKey`, contract discriminated union, gate test 17). Promotion-resolution gap folded into MAJOR-3. |
| Typed wrapper reasons | **CLOSED** (`WrapperRejection` in contract v2, §7.6; reason sets disjoint from gate's). Persistence mapping gap — MINOR-2. |
| Test-4 layer | **CLOSED** (rewritten against the extractable-type enum + the §3 `allowedNodeTypes` derivation table, policy constructor unit-tested against the table). |

---

## CRITICAL

### CRITICAL-1 — §6 C-4 role normalization severs the becoming lane and reverses a gate conservatism rule (introduced by the round-1 edit)

**Observation.** §6 (C-4): "on EXTRACTED-node evidence a DECLARATION/ENACTMENT label has no defined meaning and would only zero mass, so the wrapper deterministically normalizes it to SUPPORT." But within this pipeline, *all* evidence is EXTRACTED-node evidence: LENS/BECOMING are never extractable (§3 table), `priorExtractedNodes` excludes BECOMING nodes (§5), so no proposal here can ever target a BECOMING node. The normalization therefore applies to 100% of this pipeline's output. Three consequences:

1. **Mass-conservatism regression.** The gate's conferring rule (gate §6: `role === SUPPORT` required for non-BECOMING nodes) exists so that a quote the model itself flagged as a stated wish does not confer mass. Under C-4, the model labels "I want to be someone who stays calm" as DECLARATION on a TRAIT node — and the wrapper rewrites it to SUPPORT, making it *conferring*. C-4's rationale ("would only zero mass") treats the gate's intended restraint as a bug and silently picks the permissive side: mass now accrues from aspiration on extracted nodes.
2. **The ignition supply line is severed.** Gate v1.3's headline seam fix carried `role` through `VerifiedEvidence` end-to-end precisely so ignition (gate §6.4: ≥2 ENACTMENT spans, ≥2 events) could fire. The proposer is the only model touchpoint in the pipeline; §14's hypothesis-matching module is deterministic code and cannot classify enactment-vs-declaration. With the wrapper flattening every role to SUPPORT *upstream of the gate*, no specified component can ever produce an ENACTMENT-role `VerifiedEvidence`. Gate test 14 will pass forever on hand-crafted input while the live pipeline can never produce its precondition — `IGNITED`, a headline product mechanic, becomes unreachable. The entire role plumbing (schema `EvidenceRole`, gate §4 step 4 carry-through, §6 conferring rule, tests 6/14) is now dead code fed a constant.
3. **Internal contradictions.** §2's role-mislabel row ("proposer biased to DECLARATION when unsure") and canary test 6 ("wishes label DECLARATION, not ENACTMENT") assert model behavior the wrapper then deterministically discards — the same dead-layer-test class as round-1's test-4 finding. And §6 still instructs the model to produce a field the code overwrites.

**Why it matters.** This is a disconnected fix in reverse: round 0 found the role field dropped at the gate; round 1's edit re-drops it at the wrapper. It changes mass semantics (aspirational quotes confer) without acknowledging it, and it breaks the ASPIRE-01 lane structurally while every test stays green.

**Recommended action.** Choose explicitly, in the spec:
- **(i) Pass roles through.** Delete the normalization; let the gate's type-conditional conferring rule consume them. A DECLARATION-labeled quote stays non-conferring on *every* node type — state that as intended semantics. Test 6 and §2's row become live again. (This is the smaller edit and the more conservative system.)
- **(ii) Or, if role classification genuinely belongs to a separate becoming-lane pass:** specify that lane's existence and interface (who classifies against what text, with what model touchpoint), remove `role` from this proposer's prompt and from test 6, update §2's row, and note in the gate spec where ENACTMENT-role evidence actually originates. Never request a field you deterministically erase.

Either way, the decision "can a declaration-quote confer mass on an extracted node?" must be made on the page, not implied by a wrapper default.

---

## MAJOR

### MAJOR-1 — §4 vs §12 contradict on whether chunking is v1, leaving v1 offsetHints un-rebased

**Observation.** §4: "When chunking lands (**post-pilot**), the wrapper must rebase `offsetHint` by the chunk's base offset." §12 (v1 minimal policy): "a too-long entry **is chunked** at paragraph boundaries with source IDs preserved." Both cannot be true. If v1 chunks and does not rebase, every hint from chunk ≥2 indexes chunk-relative positions.

**Why it matters.** The hint is the multi-occurrence tie-break (gate §5). A systematically wrong hint never rejects a quote, but it picks the *wrong occurrence* — producing a verified span that highlights the wrong place in tap-for-evidence — or trips the far-hint fallback and spuriously depresses confidence via `hintFallbackSignal`, on exactly the long, significant entries §10.5 worries about.

**Recommended action.** One sentence, pick one: (a) chunking is wholly post-pilot — v1 refuses/defers oversized entries, recorded in `omittedEventIds`; or (b) chunking is v1 and the rebase ships now, with a test (quote in chunk 2, hint rebased, correct occurrence chosen). Delete the losing sentence from the other section.

### MAJOR-2 — The high-inference hold does not cover non-causal edges, falsifying §8's own claim

**Observation.** §8 (and the contract comment on `InferenceDistance`): "`HIGH_INFERENCE_INTERPRETATION` candidates **never auto-materialize**" — unqualified, and the contract puts `inferenceDistance` on `ProposedEdge`. But gate v1.4 §6.1's inference-aware paragraph (D1) is written about node materialization, and the edge paragraph (D2) keys **only on edge type** (DRIVES/ROOTED_IN). A REINFORCES or EXPRESSES_AS edge labeled `HIGH_INFERENCE_INTERPRETATION` follows gate §4's "non-causal edge types may exist as low-confidence hypotheses when thin" — it auto-materializes, label ignored.

**Why it matters.** The round-1 closure is partial: the rule the proposer spec advertises has a carrier for nodes and for two edge types, and silently no carrier for the other four. A model that (correctly) flags an over-interpreted REINFORCES edge as HIGH gets no restraint benefit — the exact "prose rule nothing carries" class.

**Recommended action.** Either extend gate §6.1's inference hold to edge candidates of any type (lowest-seen rule identical; the edge shadow lane already exists to hold them), or scope §8's sentence honestly ("nodes and causal edge types; non-causal edges rely on confidence penalties") and update the contract comment. Add a fixture to gate test 16 or 17 for a HIGH-labeled non-causal edge either way.

### MAJOR-3 — ShadowCandidate edge endpoint keys reintroduce string-format discrimination, and promotion with an unresolvable endpoint is unspecified

**Observation.** D3's whole point was that identity resolves by `kind`, never by string shape. Yet the edge shadow candidate (contract + schema) stores each endpoint as a single string (`sourceKey`/`targetKey`) holding *either* a persisted node id *or* a match key (`type::normalizedLabel`) — the kind is recoverable only via the accidental invariant that match keys contain `::` and cuids don't. Undocumented, untested, and the exact sin at a different layer. Second gap: the contract says PROPOSED endpoints are "resolved against the graph when the candidate clears its threshold" — but nothing specifies what happens when resolution *fails*: the endpoint node is itself still in shadow, or its label changed under a gate §7 merge so the stored match key is stale. The edge clears ≥2-sources; the endpoint doesn't resolve; drop? hold? There is no waiting reason for it (`ShadowWaitingReason` has two members, neither fits).

**Why it matters.** The persistence layer is where the shadow lane's "held, not lost" promise lives across passes; a silent drop at promotion loses accumulated evidence, and a format-inferred kind is a latent collision bug in the one place the codebase just declared collisions unrepresentable.

**Recommended action.** Store discriminated endpoint refs (e.g., `sourceKind`/`targetKind` columns, or a JSON `{kind, id|matchKey}`). Define promotion behavior when an endpoint is unresolvable: remain held under a new named reason (e.g., `WAITING_ENDPOINT`), re-evaluated when the endpoint materializes; and re-key affected candidates when a merge changes a node's match key. Add a gate test: edge clears threshold while its PROPOSED endpoint is still in shadow → held, not dropped, not dangling.

### MAJOR-4 — schema.prisma's ShadowCandidate drops `ontologyKey`, which the contract's node variant carries

**Observation.** Contract v2 node-variant `ShadowCandidate` has `ontologyKey?`. The Prisma model has `type` and `label` only — no `ontologyKey` column. A field emitted on one side and dropped on the other: the reviewer prompt's highest-value find, present in the round-1 edits' own new model.

**Why it matters.** A shadowed candidate with a novel ontology key loses the key between passes. On materialization the node's `ontologyKey` is gone, `ConfidenceDerivation.ontologyNovelty` computes from nothing (the −0.25 penalty silently never applies), and the META-01 ontology-candidate log misses the candidate entirely.

**Recommended action.** Add `ontologyKey String?` to the `ShadowCandidate` model; define which key wins when sightings disagree (first-seen, deterministic); cover in the shadow round-trip test.

### MAJOR-5 — The model-facing output schema is unspecified, and deriving it naively from the canonical contract re-leaks the very type names §6 removes

**Observation.** §6 deliberately never shows the model LENS/BECOMING (and hides WOUND in SOLO) because "asking the model not to use types you showed it is asking for category leakage." §4 mandates provider-enforced JSON schema. But the only specified output shape is the canonical contract, where `NodeType` has nine members and `ProposedNode` *requires* `provenance` (a four-member enum including LENS and BECOMING). A schema derived from the contract advertises, in a second channel, exactly the names the prompt carefully withholds — and requires the model to emit `provenance`, which §6/§7.2 say it doesn't choose. If instead the model emits some narrower shape, that shape is defined nowhere.

**Why it matters.** The structural guards still catch disallowed output, but the leakage rationale §6 states for the prompt applies identically to the schema channel; and "the schema the provider enforces" is a real deliverable currently missing from a spec that otherwise enumerates every artifact.

**Recommended action.** Specify a *derived, policy-narrowed model-facing schema*, distinct from the canonical contract: `type` enum = `policy.allowedNodeTypes` exactly; no `provenance` field; no `inferenceDistance` values beyond the four; wrapper maps model JSON → `ProposedNode` (stamping provenance). Make the derivation a function unit-tested against the §3 table, alongside the policy constructor.

---

## MINOR

### MINOR-1 — Stale footer version strings in both specs
Proposer spec header says v1.2; its footer says "End of proposer spec v1.1." Gate spec header says v1.4; its footer says "End of citation gate spec v1.3." In a project whose audit story is keyed to exact version stamps, a document that self-identifies two ways is a small integrity leak. Fix both footers; consider a single version constant per doc.

### MINOR-2 — GateResult→Proposal mapping is undefined; holds conflate with rejections
`RejectionReason` includes hold reasons (`BELOW_MATERIALIZATION_THRESHOLD`, `HELD_HIGH_INFERENCE`) while `Proposal.outcome` has a distinct `"shadow"` value. Is a held candidate emitted in `rejected[]` *and* `shadowBuffer`, or shadow-only? If the former, §12's "rejection telemetry" counts holds as rejections and the tuning instrument reads wrong. Also, `Proposal` has no `stage` column — wrapper vs gate is recoverable only because the two reason enums happen to be disjoint, an undocumented invariant. Action: exclude holds from `rejected[]` (shadow entries already carry `waitingReason`) or define the outcome mapping explicitly; add `stage` to `Proposal` or document + test the enum disjointness.

### MINOR-3 — `ExtractionRun.contractVersion` defaults to `"v1"` while `CONTRACT_VERSION` is `"v2"`
A writer that forgets to stamp silently records the wrong contract on the audit row whose entire purpose is replaying against the exact contract spoken. Drop the default (make it required) or keep it mechanically synced to the contract constant.

### MINOR-4 — Tests 2a/2e are phrased behaviorally but listed CI-deterministic
"Task unchanged" (2a) and "no hidden context appears [in output]" (2e) are live-model assertions; with a stub model, CI can only assert properties of the *constructed request*. Restate their CI forms at the context layer (source text never interpolated into instruction segments; the serialized request contains no hidden state) and keep behavioral twins in the canary suite — the same layer-discipline the spec already applies to the blinding keystone.

### MINOR-5 — `CAP_EXCEEDED` selection is unspecified
When the per-run candidate ceiling trips, which candidates are dropped? Unspecified order is nondeterminism inside the deterministic layer (and "drop the last N" couples outcomes to model output ordering). Name a deterministic rule (e.g., stable order by tempId after policy guards) and note the bias it introduces.

### MINOR-6 — "SELF-authored only" on `ProposerInput.sources` is a comment, not a guard
No wrapper or context-builder step asserts `authorship === SELF`, and no test covers it. The gate's authorship-aware conferring means a leaked `PRACTITIONER_NOTE` can't confer mass, but it *can* seed shadow candidates and labels from someone else's words about the person — a LAW 3 smell. One deterministic filter in the context builder (drop + log non-SELF sources) plus a test.

### MINOR-7 — Nonce security now rides on runId unpredictability, and retry semantics disagree
The fence nonce is `f(runId)` in an eventually-public codebase, so nonce unpredictability = runId unpredictability — state the entropy requirement (cuid suffices; sequential ids would not). And §10 tracks retries as `attempts` on the *same* run (same runId ⇒ same nonce across attempts) while §4's collision path retries "under a new runId." Specify per-attempt derivation (e.g., `f(runId, attempt)`) or document why nonce reuse across attempts is safe.

---

## ENHANCEMENT

### ENHANCEMENT-1 — Type-narrow `ExtractionPolicy.allowedNodeTypes`
It is typed `NodeType[]`, so a policy containing LENS is representable and prevented only by the (tested) constructor. Define `ExtractableNodeType = Exclude<NodeType, "LENS" | "BECOMING">` in the contract and use it — the same unrepresentability move as D3, making a third of the §3 table type-enforced for free.

### ENHANCEMENT-2 — Name the inference hold's merge bypass as a decision
Gate §6.1: "merges into already-materialized nodes are unaffected" — so a HIGH-inference sighting attaches evidence (including COUNTERVAILING polarity) to a real node with no inference scrutiny, guarded only by §1.1's recurrence rules. Probably acceptable; say so in §8 so the asymmetry (held pre-materialization, free post-materialization) reads as chosen, not accidental.

---

## What's genuinely strong

- **The changelog owns its bugs in the active voice.** "I specified the rule with no downstream carrier" is the right culture for a solo builder's review loop, and it makes drift diagnosable later.
- **Quote-transparency via runId-derived nonce fences** is a genuinely elegant resolution of an ugly three-way constraint (verbatim gate matching × injection containment × blinding byte-identity), and "refuse, never rewrite" is exactly the fail-closed posture the laws demand.
- **NodeRef end-to-end (D3)** is the correct kind of fix: the collision is now unrepresentable at the type level in wrapper, gate, and `AcceptedEdge` alike — not merely checked.
- **The lowest-seen-distance release rule** shows real adversarial self-review: the spec itself notes a max-wins rule would hold candidates forever.
- **The control-class table with per-row test traceability (E-2)** and the honest labeling of soft controls (polarity, third-party) is the artifact a clinical advisor actually needs.
- **The CI-deterministic vs eval-canary split** ("a red canary must not block CI; a green CI must not be mistaken for behavioral coverage") is the right testing epistemology for an LLM stage, and it is stated crisply enough to enforce.
- **Gate §3.1a's explicit-inputs pure signature** (`now` as a parameter, prior graph and shadow buffer passed in) keeps the replay/audit story real rather than aspirational.
- **Crisis classification named as upstream of the extraction queue** closes a LAW 7 timing hole (retry-with-backoff can never delay crisis routing) that would have been easy to miss until it mattered terribly.

*— End of round-2 Claude review of proposer spec v1.2.*
