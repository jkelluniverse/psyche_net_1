# Citation Gate — Module Specification

*Psyche-Net · the load-bearing wall · v1.7 · governs `/src/engine/citation-gate/`*

> **v1.7 changelog (renderer-lens round 1, A-2/D-R3 — the cross-lane side door):** the generic type+label dedupe indexed the WHOLE prior graph, so an extracted proposal whose normalized label matched a same-type LENS (or PRACTITIONER) hypothesis merged into it INSIDE the gate — charging a hypothesis without the post-gate matcher's countervailing guards, on a different match rule than the matcher's, falsifying the renderer-lens spec's "one place the lanes legally meet." This was mine: v1.5 introduced the becoming-label matcher deliberately, but left the generic dedupe provenance-blind. v1.7: **dedupe/merge targets are scoped to the proposal's own provenance** (same-provenance merging preserved, so each hypothesis lane keeps its idempotence — a deliberate superset of the D-R3 ruling, flagged at integration); the single sanctioned cross-provenance path remains the gate-owned BECOMING label-matcher for EXTRACTED proposals; LENS and PRACTITIONER hypotheses are charged ONLY by the post-gate matcher (renderer-lens spec §3). Test 19: a same-type, same-label LENS node is never a merge target (failing-first); same-provenance dedupe and the becoming matcher pinned green. gateVersion → v1.7.
>
> **v1.6 changelog (REVIEW-01 round 3 — the escalated Critical, D8):** the conferring rule was too narrow for the role-pass-through world every prior round built: `role === SUPPORT` on non-BECOMING nodes zero-conferred CORRECTLY-labeled ENACTMENT evidence, silently starving behavior-heavy journals while every test stayed green. v1.6: **non-BECOMING conferring = `role !== DECLARATION`** — enactments confer everywhere (lived behavior is the most evidential class), declarations confer nowhere, the BECOMING arm stays ENACTMENT-only, and restrict-never-create holds in every direction. massAlgorithmVersion → v1.1; pipeline keystone added (behavior-heavy journal through real wrapper + real gate materializes; mutation-verified). Also: `WAITING_ENDPOINT` gains its per-item carrier in `RejectionReason` (the v1.5 outcome mapping referenced a reason the gate never emitted — mine, owned); the edge inference hold's ALL-types coverage is now stated in the body (§4/§6.1), not only the changelog; hypothesis-matcher precedence pinned (own-key dedupe first, becoming-label merge second; label-only match is deliberate v1 scope); §6.2 says "SUPPORTING-polarity" where the code always meant it; §3.1a notes the versioned GateConfig parameter (mode lives there — the solo polarity guard's structural carrier); §3.3 listings fully synced. Contract → v2.2.
>
> *v1.5 changelog (REVIEW-01 round 2):** (1) **The minimal deterministic hypothesis-matcher lands** (forced by D5's required pipeline test, which was unimplementable without it): an EXTRACTED proposal whose exact normalized label equals an existing BECOMING node's label merges its independently-extracted evidence into the hypothesis node — blinding-preserving (the proposer never saw the hypothesis; the match happens here, downstream, in deterministic code; fuzzy/semantic matching stays post-pilot). The target node's type governs conferring, so ENACTMENT charges ignition and DECLARATION never does. (2) **The inference hold now covers edges of every type** (round 2 caught v1.4 holding nodes and causal types only, falsifying the proposer spec's unqualified claim). (3) **Shadow edge endpoints are discriminated refs** (`{kind:"EXISTING"|"MATCH_KEY"}`), never inferred from string shape, and an edge whose endpoint node is itself subthreshold waits under the new `WAITING_ENDPOINT` reason instead of dangling or dropping. (4) `ShadowCandidate.ontologyKey` persists (first-seen wins) so the novelty penalty actually fires on promotion. (5) §3.1 listings synced with contract v2.1 (`inferenceDistance`/`evidenceRationale`/`modelReportedConfidence` — rationale and confidence are telemetry the gate disregards); §6.3's formula shows the `hintFallbackSignal` term the code has carried since v1.3. Gate → v1.5, contract → v2.1. Test 18 added.
>
> *v1.4 changelog (REVIEW-01 automated round 1 — punch-list A-1/A-2/A-6, decisions D1–D3):** v1.3 shipped the inference-distance rule as prose with no carrier — this spec never mentioned inference, `ShadowCandidate` couldn't hold the classification, and no distinct waiting reason existed; that was a bug of the exact class the v1.3 round was written to kill, and it is now structural: §6.1 gains **inference-aware materialization** (an EXTRACTED candidate whose lowest-seen distance is `HIGH_INFERENCE_INTERPRETATION` is held in the shadow buffer regardless of recurrence — reason `HELD_HIGH_INFERENCE` — and released only by a sighting at lower distance; the model's label can only RESTRICT, never create). **The shadow lane now holds edges** (D2): high-inference edge types (DRIVES/ROOTED_IN, versioned config) below ≥2-spans/≥2-distinct-sources wait as `kind:"edge"` shadow candidates instead of materializing as premature low-confidence causal claims — v1.3's "thin edges materialize as hypotheses" now applies only to non-causal types. **Edge endpoints are `NodeRef` end-to-end** (D3, overriding the v1.2 flatten-to-strings resolution): identity resolves by `kind`, never string membership, so a model-minted tempId colliding with a real node id is unrepresentable. `RejectedItem` carries `stage`; wrapper-stage reasons are canonical (`WrapperRejectionReason`, contract v2). `CONTRACT_VERSION` → v2; gateVersion → v1.4. Tests 16–17 added.
>
> *v1.3 changelog (proposer-review round — the seam fix):** both reviewers found the proposer→gate seam break: `role`/`polarity` were in `ProposedEvidence` (v1.2) but were **dropped at `VerifiedEvidence`**, and §4's algorithm still computed `conferring` from authorship alone — so the becoming-ignition fix was disconnected end-to-end. Fixed: `VerifiedEvidence` now carries `role`/`polarity` through; §4 computes conferring per the full §6 rule; ignition is explicitly **ENACTMENT-role with a deterministic ≥2-spans/≥2-events threshold** (a single mislabeled declaration cannot ignite); `offsetHint` is explicitly **non-authoritative** (find all matches first; hint = tie-break only, never a locator, never creates or rejects evidence). **NEW REQUIREMENT — one canonical contract module:** all shared types (`ProposedEvidence`, `ProposedNode`, `ProposedEdge`, `ProposerOutput`, `VerifiedEvidence`, `GateResult`, `ShadowCandidate`) live in ONE versioned source file (`/src/engine/contracts/extraction-contracts.ts`), imported by both proposer and gate; `contractVersion` is stamped on every `ExtractionRun`. The two module specs *describe* the contracts; the code file *is* the contract. This round's root cause was maintaining contracts in two documents — that ends here.
>
> *v1.2:* implementation-surfaced fixes (offsetHint/role/polarity into ProposedEvidence; shadowBuffer → ShadowCandidate[]; PII-span trap note). *v1.1:* honest-scope §1.1; gate signature; role-aware conferring; invalidation-aware mass; NFKC + tie-break hardening; tests 11–15; blinding invariant.

> This is the single most important module in the codebase. It is the deterministic trust boundary between what an LLM *claims* about a person and what becomes true on their map. Build it first, test it first, and never let anything write graph state that bypasses it. If this module is correct, LAW 1 (evidence mandate) and LAW 2 (citation gate) hold structurally rather than by good intentions.

---

## 1. What this module is (and is not)

**Is:** a pure, deterministic function that takes (a) an LLM's proposed nodes/edges with quoted evidence and (b) the original source events, and returns only the proposals whose every quote is verifiably present in the source — with mass, confidence, and state computed by arithmetic, not by the model.

**Is not:** an LLM call. There is zero model inference inside the gate. The model runs *before* the gate (the proposer) and its output is untrusted input. The gate's entire job is to be the thing the model cannot talk its way past.

**The one-sentence contract:** *No `Evidence` row, and therefore no `PsycheNode` or `PsycheEdge`, ever exists unless a deterministic string check confirmed its quote appears in a real `SourceEvent` written by the person.*

### 1.1 The honest scope of the guarantee (read this before trusting the gate too much)

The gate verifies **words, not interpretation.** It deterministically proves a quote *exists* in the person's own source text. It does **not** — because it cannot without model inference, which is banned inside the gate — prove that the model *interpreted* that real quote correctly. Three interpretive decisions are model-assigned and pass through the gate unverified:

- **Polarity** — whether a real quote *supports* or *countervails* a node. This drives `ACTIVE → QUESTIONED → LOOSENING` and `HYPOTHESIS(lens) → CONTRADICTED`. The model cannot invent the quote, but it can mislabel a real one's polarity, and that flows straight into state.
- **Node type** (WOUND vs BELIEF) and **edge type** (DRIVES vs PROTECTS_FROM).
- **Which node** a real quote is attached to.

So the accurate statement of LAW 2's guarantee is narrower than "the thing the model cannot talk its way past." It is: **no fabricated words enter; the interpretation of real words is the model's and is not deterministically verified.** Still a strong and rare guarantee — most products verify neither — but not a total one.

**The compensating controls** (these are why the crack is acceptable, not ignored): recurrence thresholds (a mislabel must recur across distinct events to matter), confidence penalties (novelty and contradiction lower confidence), and **the human curator** in supervised skins. This is an independent, load-bearing reason the venture sequences practitioner-supervised first and solo last: *the gate makes fabrication impossible; the human makes misinterpretation improbable.*

**Hard rule for solo mode:** solo mode must NOT auto-commit `QUESTIONED`/`LOOSENING`/`CONTRADICTED` transitions on model-assigned polarity alone. Require corroboration (recurrence across ≥2 distinct events) or a lightweight user confirmation before an interpretation-dependent transition changes a node's state. For the September practitioner-supervised demo this is already covered by the human in the loop.

---

## 2. Where it sits in the pipeline

```
person's words → SourceEvent (immutable)
                      │
                      ▼
        ┌──────────────────────────┐
        │  PROPOSER (LLM, untrusted)│   returns candidates + quoted evidence
        └──────────────────────────┘
                      │  ProposedNode[] / ProposedEdge[]
                      ▼
        ╔══════════════════════════╗
        ║   CITATION GATE (this)   ║   deterministic, no model, pure
        ║  1. verify every quote   ║
        ║  2. reject unverifiable  ║
        ║  3. dedupe & merge       ║
        ║  4. threshold check      ║
        ║  5. arithmetic: mass,    ║
        ║     confidence, state    ║
        ╚══════════════════════════╝
                      │  GateResult (accepted / rejected + reasons)
                      ▼
        graph writer → PsycheNode / PsycheEdge / Evidence (validated=true only)
```

The proposer is replaceable and swappable (different models, different prompts). The gate is fixed, versioned, and the trust boundary. This separation is an architecture invariant (see CLAUDE.md).

**Proposer blinding (a hard invariant that lives at the pipeline boundary).** When the proposer generates *extracted* (native) candidates, its input is ONLY the person's SELF-authored source text plus existing *extracted* graph state. It is never shown lens / becoming / practitioner hypothesis nodes. If it could see a chart hypothesis, its confirmation of that hypothesis would be self-fulfilling — and the product's most differentiated epistemic claim (showing a person their chart being *wrong*) would silently collapse into circular self-confirmation. Lens/becoming confirmation must therefore arise from *independently* extracted evidence that happens to match a hypothesis — never from an extractor that was handed the hypothesis. Enforce this at the proposer call site (construct its context from SELF text + extracted nodes only) and test it: a proposer given a lens hypothesis in context must not be able to "confirm" it without independent source evidence.

---

## 3. Data contracts

### 3.1 Input from the proposer
```ts
interface ProposedEvidence {
  sourceEventId: string;   // which event the quote is from
  quote: string;           // the EXACT substring the model claims supports this
  evidenceRationale?: string; // telemetry/eval ONLY — the gate disregards it (v1.5 doc-sync)
  offsetHint?: number;     // approximate char offset of the quote in the source;
                           // used by the §5 multi-occurrence tie-break to pick the
                           // right occurrence. Absent → gate requires the quote to be
                           // unique or rejects it AMBIGUOUS_QUOTE.
  role?: EvidenceRole;     // SUPPORT | DECLARATION | ENACTMENT (§6 conferring rule).
                           // A BECOMING seed's originating wish is DECLARATION and
                           // does NOT confer mass; only ENACTMENT charges toward ignition.
                           // Defaults to SUPPORT if the proposer omits it.
  polarity?: EvidencePolarity; // SUPPORTING | COUNTERVAILING — MODEL-ASSIGNED
                           // interpretation the gate cannot verify (§1.1). Drives
                           // QUESTIONED/LOOSENING/CONTRADICTED, guarded by recurrence +
                           // confidence + curation, never by the gate. Defaults to SUPPORTING.
}

interface ProposedNode {
  tempId: string;                 // proposer-local id, used to wire edges
  type: NodeType;
  provenance: Provenance;         // EXTRACTED | LENS | BECOMING | PRACTITIONER
  label: string;
  ontologyKey?: string;           // may be a NEW key (loose ontology, META-01)
  evidence: ProposedEvidence[];   // may be empty for pure hypothesis seeds
  inferenceDistance?: InferenceDistance; // per-PROPOSAL (§6.1 consumes it); v1.5 doc-sync
  modelReportedConfidence?: number;      // telemetry ONLY — never confidence input
}

type NodeRef =
  | { kind: "PROPOSED"; tempId: string }   // a ProposedNode.tempId in this pass
  | { kind: "EXISTING"; nodeId: string };  // a persisted PsycheNode id

interface ProposedEdge {
  tempId: string;
  source: NodeRef;                // v1.4 (D3): discriminated END-TO-END — identity
  target: NodeRef;                // resolves by kind, never by string membership
  type: EdgeType;
  evidence: ProposedEvidence[];
}

interface ProposerOutput {
  nodes: ProposedNode[];
  edges: ProposedEdge[];
}
```

### 3.1a The gate's true signature (pure function of ALL its inputs)

The gate is asked to dedupe/merge against existing nodes (§7), threshold against prior mentions held from earlier passes (§6.1), and compute recency-weighted mass over the *accumulated* evidence set (§6.2). None of that is derivable from one pass's proposals + sources alone. To stay a **pure function** (which the tests depend on), the gate must take all its real inputs explicitly — never reach into global state:

```ts
function gate(
  proposals: ProposerOutput,
  sources:   Map<string, SourceRecord>,   // events cited this pass
  priorGraph: GraphSnapshot,               // existing nodes/edges + their evidence, for merge/threshold/mass
  shadowBuffer: ShadowCandidate[],         // prior valid-but-subthreshold candidates
  now: Date,                               // explicit, so recency/dormancy stay deterministic
  config?: GateConfig                      // versioned rule set — thresholds, half-life, AND mode
                                           // (SUPERVISED|SOLO: the §1.1 interpretation guard's
                                           // structural carrier lives here, consumed by nextState)
): GateResult
```

Same inputs → same output, always. `now` is a parameter, not `Date.now()`, so replay is exact.

### 3.2 The source lookup (what the gate checks against)
```ts
interface SourceRecord {
  id: string;
  content: string;         // the verbatim text the person produced
  authorship: Authorship;  // SELF | PRACTITIONER
  occurredAt: Date;
}
// The gate receives a Map<sourceEventId, SourceRecord> for O(1) lookup.
```

### 3.3 Output
```ts
interface VerifiedEvidence {
  sourceEventId: string;
  quote: string;
  spanStart: number;       // index in source.content where quote was found
  spanEnd: number;
  occurredAt: Date;        // copied from the source (for temporal honesty)
  role: EvidenceRole;      // carried through from ProposedEvidence (default SUPPORT).
                           // REQUIRED downstream: §6's conferring rule and becoming-ignition
                           // read this. Dropping it here disconnects the becoming fix.
  polarity: EvidencePolarity; // carried through (default SUPPORTING); feeds the state
                           // machine (QUESTIONED/LOOSENING/CONTRADICTED) under §1.1's guards.
  conferring: boolean;     // authorship AND role aware — see §6. NOT authorship alone.
}

interface AcceptedNode {
  tempId: string;
  type: NodeType;
  provenance: Provenance;
  label: string;
  ontologyKey?: string;
  evidence: VerifiedEvidence[];
  mass: number;            // arithmetic (§6)
  confidence: number;      // arithmetic (§6)
  state: NodeState;        // arithmetic (§6)
}

interface RejectedItem {
  tempId: string;
  kind: "node" | "edge";
  reason: RejectionReason;
  detail: string;          // e.g. the quote that could not be located
}

type RejectionReason =
  | "QUOTE_NOT_FOUND"          // the string is not in the cited source
  | "SOURCE_NOT_FOUND"         // cited a sourceEventId that doesn't exist
  | "SOURCE_INVALIDATED"       // cited an event that was superseded
  | "BELOW_MATERIALIZATION_THRESHOLD"  // valid but too little evidence yet
  | "HELD_HIGH_INFERENCE"      // v1.4: held on inference distance, distinct from a recurrence hold
  | "EDGE_ENDPOINT_REJECTED"   // an edge whose node was rejected
  | "EMPTY_EVIDENCE_NON_HYPOTHESIS"  // extracted node with no evidence at all
  | "AMBIGUOUS_QUOTE";         // quote occurs multiple times, no offset to disambiguate

interface GateResult {
  acceptedNodes: AcceptedNode[];
  acceptedEdges: AcceptedEdge[];   // analogous shape
  shadowBuffer: ShadowCandidate[]; // valid-but-subthreshold candidates, with accumulated
                                   // recurrence (timesSeen / distinctSources / evidenceCache).
                                   // NOT ProposedNode[] — a raw proposal can't carry the
                                   // cross-pass recurrence §6.1 requires. This is the updated
                                   // buffer to persist for the next pass.
  rejected: RejectedItem[];
  gateVersion: string;             // for auditability
}
// ShadowCandidate mirrors the schema model (see schema.prisma) and is, since
// v1.4, a discriminated node|edge union: { candidateKey, kind, provenance,
// timesSeen, distinctSources, waitingReason, inferenceDistance?, evidenceCache,
// lastSeen } + node fields (type/label/ontologyKey) or edge fields
// (edgeType/sourceKey/targetKey — EXISTING endpoints stored by node id,
// PROPOSED endpoints by match key, stable across passes). inferenceDistance
// stores the LOWEST distance seen across sightings. RejectedItem carries
// stage:"GATE"; wrapper-stage rejections use the canonical WrapperRejection
// (contract v2). The gate is the SOLE writer of "shadow" outcomes. AcceptedEdge
// endpoints are NodeRef (PROPOSED tempIds aliased to their in-pass merge
// representative). The gate takes the prior shadowBuffer in and returns the
// updated one out, so recurrence accumulates deterministically across passes.
```

---

## 4. The verification algorithm (the core check)

For each proposed node/edge, for each `ProposedEvidence`:

1. **Resolve the source.** Look up `sourceEventId` in the source map. Missing → reject item with `SOURCE_NOT_FOUND`. Present but `invalidatedAt != null` → `SOURCE_INVALIDATED`.
2. **Normalize both strings identically.** Apply the SAME normalization to the quote and to the source content before comparison (see §5). Store the span using indices into the *original* content, not the normalized copy.
3. **Locate the quote.** Search for the normalized quote as a substring of the normalized source. Not found → reject that evidence with `QUOTE_NOT_FOUND`.
4. **Record the span.** On a hit, map the match back to `[spanStart, spanEnd]` in the original content and build a `VerifiedEvidence`, copying `occurredAt` from the source, carrying `role` and `polarity` through from the proposal (defaults SUPPORT/SUPPORTING), and computing `conferring` per the **full §6 rule — authorship AND role AND invalidation aware**, never authorship alone. (A SELF-authored becoming DECLARATION is verified but non-conferring.)

Then, per item:
- **Nodes:** partition evidence into verified vs. unverified. Drop the unverified. If the node's provenance is `EXTRACTED` and it has **zero** verified evidence → reject `EMPTY_EVIDENCE_NON_HYPOTHESIS`. If provenance is `LENS`/`BECOMING`/`PRACTITIONER`, zero evidence is *allowed* — it becomes a `HYPOTHESIS` node at mass 0 (LAW 3).
- **Edges:** an edge survives only if BOTH `NodeRef` endpoints resolve by kind (EXISTING → prior graph id; PROPOSED → accepted-this-pass tempId). Otherwise `EDGE_ENDPOINT_REJECTED`. Edge evidence is verified the same way. **Non-causal edge types** (EXPRESSES_AS, REINFORCES, SOFTENED_BY, PROTECTS_FROM) may exist as low-confidence hypotheses when thin. **High-inference edge types** (DRIVES, ROOTED_IN — versioned config) below the §6.1 edge threshold do NOT materialize: a causal claim that renders at all, even dim, is the overreach being prevented — they wait in the edge shadow lane instead (v1.4, D2). **And an edge of ANY type whose lowest-seen `inferenceDistance` is HIGH_INFERENCE_INTERPRETATION is held the same way (v1.5/A-2 — the body now says what the changelog said); an edge whose endpoint node is itself subthreshold holds under `WAITING_ENDPOINT` (per-item carrier in `RejectionReason` since v2.2).**

**Critical rule:** the gate is *fail-closed*. Any uncertainty about whether a quote is present resolves to rejection. It is always safe to reject a true proposal (the evidence will recur and be caught next pass); it is never safe to accept a false one.

---

## 5. String normalization (get this exactly right — it is where bugs hide)

The proposer will rarely reproduce a quote byte-for-byte. Over-strict matching rejects true evidence; over-loose matching lets hallucinated paraphrase through. The v1 normalization is deliberately conservative:

**Apply to both quote and source before matching:**
- Unicode NFKC normalization.
- Collapse all runs of whitespace (spaces, tabs, newlines) to a single space.
- Trim leading/trailing whitespace.
- Normalize curly quotes/apostrophes to straight, and en/em dashes to hyphen.
- Case-fold (lowercase) — a quote that differs only in case is still the person's words.

**Do NOT do in v1 (these cross the line from "same words" to "similar meaning"):**
- No stemming, lemmatization, or synonym expansion.
- No fuzzy/edit-distance matching. (Logged as a post-v1 question — if introduced, it must have a hard, low distance ceiling and be measured against the eval corpus for false-accept rate. Default answer: don't.)
- No removing words the model "probably meant."

**Span mapping (the highest-probability production bug in the gate — do not hand-wave this):** NFKC normalization *changes string length* (ligatures ﬁ→fi, full-width→half-width, some combining forms). So the naive "normalize → find index in normalized → slice the ORIGINAL at that index" is **wrong** the moment any earlier character normalized to a different length. It passes every ASCII test and then returns a corrupt span for the one entry containing a ligature or pasted full-width text — and that corrupt span is exactly what powers tap-for-evidence. The requirement is therefore specific: build an **explicit index map** from normalized positions back to original positions (or do a two-pass relocate that re-finds the quote in the original), so `spanStart/spanEnd` always index the ORIGINAL `content`. This gets a dedicated test with **non-ASCII fixtures** (ligatures, full-width, combining accents, emoji), not just ASCII.

**Multiple-occurrence tie-break (the hint is never a locator):** when the normalized quote appears more than once in the source, the gate **finds ALL verbatim matches first**, then uses the proposer's `offsetHint` only to choose among them (nearest match wins). The hint is model-counted and will often be wildly off — a mismatched hint never rejects a quote that verifiably exists, and the hint can never *create* evidence (the quote must still match verbatim regardless). If no hint is supplied and the quote is ambiguous (multiple matches), reject `AMBIGUOUS_QUOTE` rather than guess. If a hint is supplied but all matches are implausibly far, fall back to the first match and lower confidence. Documented and tested.

**PII redaction and spans (a trap for later — OUT of v1, noted now so it isn't wired in wrong).** A tempting privacy feature is to redact PII locally before sending text to a cloud proposer. Done naively, this *shifts character offsets* and breaks the gate's core guarantee: the proposer would cite spans in the redacted text that no longer map to the original, so the gate can't validate against the source. If PII handling is ever added, it must use **deterministic, reversible placeholder mapping** (stable tokens, offset map stored locally/under a user key) so that: the proposer cites placeholder text, the gate validates against a redacted *mirror*, and a local mapping resolves evidence back to exact original spans. Privacy preprocessing must never weaken the evidence mandate. For v1 this is entirely OUT of scope — the point of this note is that no one should add span-shifting redaction without solving span-resolvability first.

---

## 6. The arithmetic (mass, confidence, state — pure functions, no model)

All of these are deterministic functions of the *validated, conferring* evidence set for a node. Non-conferring evidence may attach for display but contributes **0** to mass.

**Conferring is NOT authorship alone (this was a bug in v1.0).** A `BECOMING` node's originating wish ("I want to stay calm under conflict") is SELF-authored — but it must NOT charge the node toward ignition, or the person restating their aspiration would ignite it. The declaration creates the seed at mass 0; only evidence of *enacting* the quality charges it. So:

```
conferring =
    (authorship === SELF)
    AND (evidence source is not invalidated)          // invalidation-aware (see below)
    AND ( node.type === BECOMING  ? role === ENACTMENT
                                  : role !== DECLARATION )   // v1.6 (D8)
```
**v1.6 (D8):** ENACTMENT confers on every node type — it is the person actually living something, the most evidential class of material; the old `role === SUPPORT` arm quietly inverted the evidence hierarchy. DECLARATION confers nowhere. A role mislabel can therefore only UNDER-confer, never create.
Practitioner-authored evidence (LAW 3) has `authorship !== SELF` → never conferring. A becoming declaration has `role === DECLARATION` → never conferring. Both still attach for display and provenance.

**Invalidation-aware mass (was missing in v1.0).** The mass sum must exclude evidence whose `SourceEvent.invalidatedAt != null` at compute time — otherwise a correction (invalidate + supersede) won't actually reduce mass on already-built nodes. Recompute filters invalidated evidence before summing.

### 6.1 Materialization threshold
A node materializes (becomes a real graph node) only when it clears a conservative threshold. v1 rule: **≥ 2 distinct conferring evidence spans from ≥ 2 distinct source events** (recurrence, not a single mention). Valid-but-subthreshold proposals go to the `shadowBuffer` — retained and re-evaluated as new events arrive, never discarded (nothing is deleted). Hypothesis-provenance nodes (lens/becoming/practitioner) skip this and materialize at mass 0 in `HYPOTHESIS` state.

**Inference-aware materialization (v1.4, D1).** An EXTRACTED candidate whose **lowest-seen** `inferenceDistance` across sightings is `HIGH_INFERENCE_INTERPRETATION` is held in the shadow buffer with reason `HELD_HIGH_INFERENCE` **regardless of recurrence** — perfect recurring quotes do not materialize an overreaching interpretation. A later sighting at any lower distance releases the candidate to the normal thresholds (proposer spec §8's "recurrence at lower inference distance," made deterministic; the lowest-seen aggregation is what makes release possible — a max-wins rule would hold forever). The classification is model-assigned and unverifiable (§1.1); the asymmetry is what makes it safe to consume: the label can only **restrict** (delay until corroboration), never create. An absent label follows normal rules. Merges into already-materialized nodes are unaffected (the node is already real; evidence just attaches).

**Edge materialization (v1.4, D2).** High-inference edge types (`DRIVES`, `ROOTED_IN` — named, versioned config `edgeMaterialization`) require **≥ 2 conferring spans from ≥ 2 distinct source events** to materialize; below that they wait as `kind:"edge"` shadow candidates, keyed `EDGE::type::srcKey=>tgtKey`, accumulating evidence exactly like node candidates and promoting with their cache when the threshold clears.

### 6.2 Mass
```
mass = f(conferring evidence) — monotonic non-decreasing in evidence count,
       with recency weighting and diminishing returns.
```
v1 concrete form (tunable, kept simple and honest):
```
rawMass  = Σ over conferring, SUPPORTING-polarity evidence of  recencyWeight(e.occurredAt)
recencyWeight(t) = 0.5 ^ (ageInDays(t) / HALF_LIFE_DAYS)   // default HALF_LIFE_DAYS = 180
mass     = log2(1 + rawMass)                               // diminishing returns
```
Properties that MUST hold (property-tested): adding evidence never decreases mass; two mentions outweigh one; a years-old-only node has low present mass (temporal honesty, ARCH-01).

### 6.3 Confidence (LAW 5 — never null-as-unknown)
Confidence is distinct from mass. Mass = "how much weight"; confidence = "how sure we are this node is real and correctly typed." v1:
```
confidence = clamp01( base
                    + 0.15 * (distinctSourceCount - 1)   // corroboration across events
                    - 0.20 * contradictionSignal          // countervailing evidence
                    - 0.25 * ontologyNovelty              // a brand-new ontologyKey is less certain
                    - 0.10 * hintFallbackSignal )         // far-hint first-match fallback (§5; v1.5 doc-sync)
base = 0.4
```
Hypothesis nodes start at a low confidence floor (e.g. 0.15) and rise only as lived evidence confirms them. Confidence is ALWAYS written; there is no "unknown = null" — unknown is represented as an explicit low number and rendered as such (LAW 5).

### 6.4 State (the machine, deterministic)
Given prior state + the new validated evidence delta:
- `HYPOTHESIS` → `ACTIVE` when conferring evidence first clears the materialization threshold (lens/becoming "confirmed").
- `HYPOTHESIS(lens)` → `CONTRADICTED` when conferring evidence opposes it (opposition detection is itself an evidence-tagged signal from the proposer, then gate-verified like any quote).
- `BECOMING` → `IGNITED` only when **ENACTMENT-role** conferring evidence clears the deterministic ignition threshold: **≥ 2 ENACTMENT spans from ≥ 2 distinct source events** (v1 config; stricter than materialization). DECLARATION-role evidence never counts toward ignition regardless of quantity — restating the wish cannot ignite it. Because `role` is model-assigned and unverifiable (§1.1), this recurrence threshold is the deterministic guard that makes a *single* mislabeled declaration unable to fire a ceremonial, high-visibility ignition; the proposer is additionally instructed to default to DECLARATION when uncertain (conservative bias against ignition).
- `ACTIVE` → `LOOSENING` when countervailing evidence accumulates against a previously-massive node.
- `LOOSENING` → `TRANSMUTATION_CANDIDATE` → `INTEGRATED` along the documented change arc.
- any → `DORMANT` when a node has substantial historical evidence but no recent conferring evidence (present mass falls below the dormancy floor) — the honest "documented then, quiet now."
State transitions are a pure function `nextState(prev, evidenceSet, now)`; no randomness, no model.

---

## 7. Idempotency, dedupe, and re-runs

- The gate is **idempotent** over the same (proposals, sources): same input → same `GateResult`, including identical spans. No time-dependent behavior except where `now` is an explicit parameter (mass recency, dormancy) — and even then, same `now` → same output.
- **Dedupe/merge:** if a proposal matches an existing node **of the proposal's own provenance** (same provenance + type + normalized label, per a documented match key — v1.7, D-R3: cross-provenance merging is forbidden; an extracted proposal can never merge into a LENS or PRACTITIONER hypothesis, whose charging belongs exclusively to the post-gate matcher in the renderer-lens spec §3), the gate merges evidence into the existing node rather than creating a duplicate, then recomputes arithmetic. Merge logic is deterministic and unit-tested. **Precedence (v1.6, C-3): own-key dedupe runs first; the becoming-label merge applies only when no same-key node exists. The label-only, type-blind match is deliberate v1 scope** (the extracted type is discarded in favor of the target's). **v1.5 — the hypothesis-matcher (exact-label, v1):** an EXTRACTED proposal whose normalized label exactly equals an existing BECOMING node's label merges into that hypothesis node (the target's type/provenance/label win; conferring computed against the target's type, so ENACTMENT charges ignition). This is the deterministic v1 form of §14's hypothesis-matching module; semantic/fuzzy matching is post-pilot.
- **GateResult→Proposal outcome mapping (v1.5, C-3):** the post-gate writer — and only it — maps per-item outcomes onto persisted `Proposal` rows: accepted → `"accepted"`; hold reasons (`BELOW_MATERIALIZATION_THRESHOLD`, `HELD_HIGH_INFERENCE`, `WAITING_ENDPOINT`) → `"shadow"`; everything else rejected → `"rejected"`. Holds are excluded from rejection-rate telemetry. The wrapper never writes `"shadow"`. Wrapper/gate reason unions are disjoint by design (value-level arrays in the contract, tested), so a row's stage is recoverable from its reason alone.
- **Match-key versioning duty (v1.6, C-5):** shadow `candidateKey`/`MATCH_KEY` values embed the normalized label under the CURRENT normalization version; a normalization bump obligates a shadow-candidate rekey migration, or held evidence strands under stale keys ("held, not lost" must survive rule tuning).
- **Re-runnability:** because the event store is immutable, the entire graph must be reconstructable by replaying all events through proposer+gate. In practice the proposer is non-deterministic, so we persist accepted results; but the *gate* stage alone, given persisted proposals, must replay identically. This is what makes the graph auditable.

---

## 8. Failure modes the gate must handle explicitly

| Situation | Correct behavior |
|---|---|
| Model hallucinates a quote not in the source | `QUOTE_NOT_FOUND`; item rejected; logged. This is the primary attack the gate exists to stop. |
| Model paraphrases (right meaning, wrong words) | Rejected in v1 (no fuzzy match). The real evidence will recur; better a missed catch than a fabricated node. |
| Model cites the wrong source id | `SOURCE_NOT_FOUND`; rejected. |
| Model quotes practitioner-authored text as if it confers mass | Verified as evidence but `conferring=false`; contributes 0 mass (LAW 3). |
| Single valid mention, no recurrence | Held in `shadowBuffer`; not materialized; not lost. |
| Brand-new ontology key | Node may materialize but with reduced confidence and an ontology-candidate log entry (META-01 loose ontology); flagged for later human/eval review. |
| Empty proposer output | Valid; returns empty accepted sets. Never a crash. |
| Quote spans a normalization boundary (curly quotes, line breaks) | Handled by §5 normalization; span still maps to original. Unit-tested. |

---

## 9. Tests to write FIRST (before any UI exists)

These are the highest-priority tests in the repository.

1. **The rejection test (the keystone).** Given a proposed node whose quote does NOT appear in the source, the gate rejects it and creates no Evidence/Node. This test failing = the product is broken at its core.
2. **The acceptance test.** A quote that IS present (modulo normalization) is accepted, with a span that slices back to the correct original text.
3. **Normalization matrix.** Curly vs straight quotes, case differences, collapsed whitespace, unicode NFKC pairs, dash variants — each accepted; a genuine paraphrase — rejected.
4. **Span-mapping test.** For a battery of quotes, `original.content.slice(spanStart, spanEnd)` reproduces the human-readable source of the quote.
5. **Conferring vs non-conferring.** Practitioner-authored evidence attaches but yields mass 0; self-authored yields mass > 0.
6. **Mass property tests.** Monotonic non-decrease with added evidence; recency weighting; log diminishing returns; historical-only node has low present mass.
7. **Threshold/shadow-buffer test.** One mention → shadow buffer; second distinct-source mention → materializes.
8. **State-machine tests.** Each documented transition fires on the right evidence delta and nowhere else; `nextState` is pure.
9. **Idempotency test.** Same input twice → byte-identical GateResult.
10. **Fail-closed fuzz test.** Random/adversarial proposer outputs never produce an unverified Evidence row and never throw.
11. **NFKC span-integrity test (highest-probability bug).** With non-ASCII fixtures (ligatures, full-width chars, combining accents, emoji before the quote), `original.content.slice(spanStart, spanEnd)` still returns the exact human-readable quote — proving the index map survives length-changing normalization.
12. **Multi-occurrence tie-break test.** A quote appearing N times resolves to the intended occurrence via the proposer offset; an ambiguous quote with no offset is rejected, not guessed.
13. **Invalidation-aware mass test.** Building a node from evidence, then invalidating/superseding that source, reduces the node's mass on recompute (a correction actually corrects).
14. **Becoming-conferring test.** A BECOMING declaration (role=DECLARATION, SELF) yields mass 0; later ENACTMENT evidence (SELF) charges it toward ignition. Restating the wish never ignites.
15. **Interpretation-guard test (solo mode).** A single model-labeled COUNTERVAILING quote does NOT auto-transition a node to QUESTIONED/LOOSENING in solo mode without corroboration or confirmation.

16. **Inference-hold test (v1.4).** A `HIGH_INFERENCE_INTERPRETATION` candidate with recurrence satisfied is held (`HELD_HIGH_INFERENCE`, in shadow), and a later lower-distance sighting releases it; an unclassified candidate follows normal thresholds (absence never restricts).
17. **Edge-shadow test (v1.4).** A DRIVES/ROOTED_IN edge from a single event goes to the edge shadow lane (not rendered, not lost) and materializes with its promoted cache on second-source recurrence; non-causal thin edges still materialize as low-confidence hypotheses; a PROPOSED tempId colliding with an existing node id resolves by kind.

18. **Pipeline ignition test (v1.5 — REQUIRED by the round-2 checkpoint; lives in the proposer suite).** Raw model output containing a DECLARATION and two ENACTMENTs, through the REAL wrapper and the REAL gate against a prior graph holding the becoming seed, reaches `IGNITED`; restating the wish through the same pipeline never does. Every future change to conferring semantics must keep this green — unit tests proved the gate; only an integration test proves the pipeline.

Maintain a small **ground-truth eval corpus**: synthetic journals with hand-labeled expected nodes. A script scores extraction fidelity (precision/recall of accepted nodes vs. expected) end-to-end (proposer+gate). Re-run before promoting any proposer/model change; record the score. This is how "does the map feel true?" becomes a measured number rather than a vibe — and it is the September go/no-go instrument.

---

## 10. Why this module is the whole product

Every distinctive claim Psyche-Net makes — "nothing is true until your life says so," "we show you your chart being wrong," "the instrument that shows what it doesn't know," the entire trust and safety story, the patent framing — reduces to this: *a deterministic gate that only lets validated, self-authored evidence confer reality on the map.* The beautiful physics, the constellation, the ceremonies are all downstream. If the gate is honest, the product is honest. Build it first. Test it hardest. Never route around it.

*— End of citation gate spec v1.6. Provisional and revisable, like everything here — but the nine laws it enforces are not.*
