# Citation Gate — Module Specification

*Psyche-Net · the load-bearing wall · v1.2 · governs `/src/engine/citation-gate/`*

> **v1.2 changelog (implementation-surfaced contract fixes, from the first Claude Code build):** building the gate exposed two spec inconsistencies that survived two review rounds — now corrected. (1) `ProposedEvidence` (§3.1) now carries `offsetHint`, `role`, and `polarity` — the §5 tie-break and §6 conferring rule *described* these behaviors but the input interface didn't thread them through. (2) `GateResult.shadowBuffer` (§3.3) is now `ShadowCandidate[]`, not the literal `ProposedNode[]` — recurrence (`timesSeen`/`distinctSources`) can't accumulate across passes on a raw proposal. Also added the PII-redaction span-preservation trap note (§5, OUT of v1). Reference build: 75 tests green, keystone rejection test + NFKC span test #11 (with genuinely length-changing fixtures) passing, mutation-tested, DB CHECK constraints verified against live Postgres 16.
>
> *v1.1 changelog (Round A):* §1.1 honest-scope; gate signature takes priorGraph/shadowBuffer/now; conferring role dimension; invalidation-aware mass; NFKC span-mapping + multi-occurrence hardening; tests 11–15; AMBIGUOUS_QUOTE; proposer-blinding invariant.

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
}

interface ProposedEdge {
  tempId: string;
  sourceTempId: string;           // refers to a ProposedNode.tempId or existing node id
  targetTempId: string;
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
  now: Date                                // explicit, so recency/dormancy stay deterministic
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
  conferring: boolean;     // true only if source.authorship === SELF (LAW 3/4)
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
// ShadowCandidate mirrors the schema model (see schema.prisma): { candidateKey, type,
// provenance, label, timesSeen, distinctSources, waitingReason, evidenceCache, ... }.
// The gate takes the prior shadowBuffer in and returns the updated one out, so recurrence
// accumulates deterministically across passes.
```

---

## 4. The verification algorithm (the core check)

For each proposed node/edge, for each `ProposedEvidence`:

1. **Resolve the source.** Look up `sourceEventId` in the source map. Missing → reject item with `SOURCE_NOT_FOUND`. Present but `invalidatedAt != null` → `SOURCE_INVALIDATED`.
2. **Normalize both strings identically.** Apply the SAME normalization to the quote and to the source content before comparison (see §5). Store the span using indices into the *original* content, not the normalized copy.
3. **Locate the quote.** Search for the normalized quote as a substring of the normalized source. Not found → reject that evidence with `QUOTE_NOT_FOUND`.
4. **Record the span.** On a hit, map the match back to `[spanStart, spanEnd]` in the original content and build a `VerifiedEvidence`, copying `occurredAt` from the source and setting `conferring = (source.authorship === SELF)`.

Then, per item:
- **Nodes:** partition evidence into verified vs. unverified. Drop the unverified. If the node's provenance is `EXTRACTED` and it has **zero** verified evidence → reject `EMPTY_EVIDENCE_NON_HYPOTHESIS`. If provenance is `LENS`/`BECOMING`/`PRACTITIONER`, zero evidence is *allowed* — it becomes a `HYPOTHESIS` node at mass 0 (LAW 3).
- **Edges:** an edge survives only if BOTH endpoints survived (existing nodes or accepted-this-pass nodes). Otherwise `EDGE_ENDPOINT_REJECTED`. Edge evidence is verified the same way; an edge may exist as a low-confidence hypothesis if its endpoints exist but its own evidence is thin.

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

**Multiple-occurrence tie-break:** when the normalized quote appears more than once in the source (e.g. "i feel" five times), substring search alone picks an arbitrary match and tap-for-evidence lands on the wrong sentence. Rule for v1: the proposer supplies an approximate character offset with each quote; the gate selects the occurrence nearest that offset. If no offset is supplied, require the quote to be long/unique enough to occur once, else reject as ambiguous. Documented and tested.

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
                                  : role === SUPPORT )
```
Practitioner-authored evidence (LAW 3) has `authorship !== SELF` → never conferring. A becoming declaration has `role === DECLARATION` → never conferring. Both still attach for display and provenance.

**Invalidation-aware mass (was missing in v1.0).** The mass sum must exclude evidence whose `SourceEvent.invalidatedAt != null` at compute time — otherwise a correction (invalidate + supersede) won't actually reduce mass on already-built nodes. Recompute filters invalidated evidence before summing.

### 6.1 Materialization threshold
A node materializes (becomes a real graph node) only when it clears a conservative threshold. v1 rule: **≥ 2 distinct conferring evidence spans from ≥ 2 distinct source events** (recurrence, not a single mention). Valid-but-subthreshold proposals go to the `shadowBuffer` — retained and re-evaluated as new events arrive, never discarded (nothing is deleted). Hypothesis-provenance nodes (lens/becoming/practitioner) skip this and materialize at mass 0 in `HYPOTHESIS` state.

### 6.2 Mass
```
mass = f(conferring evidence) — monotonic non-decreasing in evidence count,
       with recency weighting and diminishing returns.
```
v1 concrete form (tunable, kept simple and honest):
```
rawMass  = Σ over conferring evidence of  recencyWeight(e.occurredAt)
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
                    - 0.25 * ontologyNovelty )            // a brand-new ontologyKey is less certain
base = 0.4
```
Hypothesis nodes start at a low confidence floor (e.g. 0.15) and rise only as lived evidence confirms them. Confidence is ALWAYS written; there is no "unknown = null" — unknown is represented as an explicit low number and rendered as such (LAW 5).

### 6.4 State (the machine, deterministic)
Given prior state + the new validated evidence delta:
- `HYPOTHESIS` → `ACTIVE` when conferring evidence first clears the materialization threshold (lens/becoming "confirmed").
- `HYPOTHESIS(lens)` → `CONTRADICTED` when conferring evidence opposes it (opposition detection is itself an evidence-tagged signal from the proposer, then gate-verified like any quote).
- `BECOMING` → `IGNITED` when conferring evidence for the designed quality clears an ignition threshold (stricter than materialization; e.g. ≥ 3 spans across ≥ 3 events, weighted toward spontaneous mentions).
- `ACTIVE` → `LOOSENING` when countervailing evidence accumulates against a previously-massive node.
- `LOOSENING` → `TRANSMUTATION_CANDIDATE` → `INTEGRATED` along the documented change arc.
- any → `DORMANT` when a node has substantial historical evidence but no recent conferring evidence (present mass falls below the dormancy floor) — the honest "documented then, quiet now."
State transitions are a pure function `nextState(prev, evidenceSet, now)`; no randomness, no model.

---

## 7. Idempotency, dedupe, and re-runs

- The gate is **idempotent** over the same (proposals, sources): same input → same `GateResult`, including identical spans. No time-dependent behavior except where `now` is an explicit parameter (mass recency, dormancy) — and even then, same `now` → same output.
- **Dedupe/merge:** if a proposal matches an existing node (same type + normalized label + overlapping evidence, per a documented match key), the gate merges evidence into the existing node rather than creating a duplicate, then recomputes arithmetic. Merge logic is deterministic and unit-tested.
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

Maintain a small **ground-truth eval corpus**: synthetic journals with hand-labeled expected nodes. A script scores extraction fidelity (precision/recall of accepted nodes vs. expected) end-to-end (proposer+gate). Re-run before promoting any proposer/model change; record the score. This is how "does the map feel true?" becomes a measured number rather than a vibe — and it is the September go/no-go instrument.

---

## 10. Why this module is the whole product

Every distinctive claim Psyche-Net makes — "nothing is true until your life says so," "we show you your chart being wrong," "the instrument that shows what it doesn't know," the entire trust and safety story, the patent framing — reduces to this: *a deterministic gate that only lets validated, self-authored evidence confer reality on the map.* The beautiful physics, the constellation, the ceremonies are all downstream. If the gate is honest, the product is honest. Build it first. Test it hardest. Never route around it.

*— End of citation gate spec v1.2. Provisional and revisable, like everything here — but the nine laws it enforces are not.*
