# Punch-list — renderer-lens-spec v1.1 · Round 2 · REVIEW-01 loop

*Claude lane: Request Revisions — 1C/7M/6m/2E, plus closure verification of
round 1: 21 HOLDS / 4 PARTIAL (all missing-test carriers) / 0 MISSING; gate
v1.7 scoping and test 19 verified IN CODE. ChatGPT lane: Request Revisions —
5C/5M/3m/4E. The lanes are complementary this round: Claude found the missing
WHEN of §3.1 (no recompute trigger), ChatGPT the missing WHERE (linked
evidence has no path into the renderer's view model). Both independently
flagged D-R1 enforcement and list-view veil parity.*

**CHECKPOINT (enabled): STOP — punch-list to Jacob. No product-ethics forks
this round; one lane-vs-lane disagreement is resolved by REJECTION with
reason (R-1) and one architectural bookkeeping choice is proposed with
rationale (A-5) rather than escalated.**

---

## ACCEPT-NOW

### A-1 (Claude C-1) — A charged ghost has no recompute path
§3.1 recomputes only ON MATCH. Post-v1.7 the gate can't touch LENS nodes
(correct), so nobody recomputes when linked evidence's source is invalidated,
superseded, archived, or LAW-8-erased: persisted mass diverges from the
evidence set (pure-function invariant broken), replay produces HYPOTHESIS/0
where the graph says ACTIVE/>0 (event-sourcing broken), and the person who
retracts the words that "confirmed" their chart keeps being told the chart
was right — the exact dishonesty the product exists to prevent. **Fix:**
§3.1 gains (a) a recompute trigger rule — any invalidation/supersession/
erasure touching a SourceEvent/Evidence row referenced by a
HypothesisEvidenceLink schedules a matcher recompute of the affected
hypothesis (the writer sees these mutations; it is the trigger point), new
MatcherRun row, stamped; (b) explicit link lifecycle — link rows invalidate
(never silently cascade) when their Evidence row is erased; a hypothesis
whose last conferring link dies recomputes to mass 0 and reverts per
nextState; (c) the live-join rule — the matcher builds EvidenceRecord[] for
linked rows by reading authorship + sourceInvalidatedAt AT COMPUTE TIME,
never cached from link time; (d) test 7 gains the negative lifecycle: charge
→ invalidate source → recompute to 0 → replay equivalence.

### A-2 (ChatGPT C-1 ≡ C-5) — Linked evidence never reaches the renderer
§2's brightness/tap-for-evidence/matched-pair rules all consume node
evidence, but a charged ghost's evidence lives behind HypothesisEvidenceLink
and PersistedNodeView has no carrier for it: brightness computes off an
empty array (charged ghosts stay dim), the panel can't show "which words did
it," and the LINKED rendering has nothing to consume. **Fix:**
PersistedNodeView carries `effectiveEvidence` (own ∪ linked, each entry with
authorship/spans/occurredAt/polarity/conferring); SkyViewModel carries
`LensMatchLinkView[]` ({lensNodeId, extractedNodeId, evidenceIds}) as a
non-persisted rendering overlay; brightness computes from effectiveEvidence;
test 6 covers linked-evidence slicing, and a view-model test asserts the
link view + brightness change after a match.

### A-3 (Claude M-1) — The matcher is delta-only; a ghost created AFTER its evidence stays SILENT forever
Chart imported after months of journaling (or a remap minting new keys) is
never compared against the standing extracted graph — and the demo flow
"add a chart to a mature client map" is exactly this path; the ghost-first
match-rate canary can't see it. **Fix:** §3.1 second trigger — lens import/
remap enqueues a full-graph matcher run for that user (deterministic, cheap
at per-person sizes); test gains the evidence-first direction.

### A-4 (Claude M-2 ≡ ChatGPT #6, + Claude M-3, + Claude E-2) — The veil has no carrier, and two surfaces bypass it
The veil is role-dependent but `skyProjection(nodes, edges, now, seed,
config)` takes no viewer context — test 10 is unimplementable as written;
nothing veils the LIST view (content-parity would faithfully expose the raw
WOUND label on the canonical accessible surface); and the realization toast
"names" new nodes, which would announce a fresh WOUND raw at the exact 1 a.m.
moment D-R5 protects. **Fix:** viewer context (role + consentScope-derived
visibility) becomes an explicit projection parameter; veiling is computed
INTO the view model (veiled entries carry veil copy, not the raw label) — so
list-view parity and the toast inherit the veil for free; one sentence pins
the client-in-supervised case (veiled-until-released for the client even in
supervised engagements, per D9); test 10 gains list-view parity + toast
assertions.

### A-5 (Claude M-5) — The lens lane is an unacknowledged third writer
The schema banner says nodes are "never written except via the gate"; §3.1
sanctioned the matcher in writing; §1's lane is a third author nobody
sanctions. **Proposed resolution (loop-decidable, contract/seam class; noted
for visibility):** reframe the banner around the truth that already holds —
the GRAPH WRITER is the single writing module; gate, matcher, and lens lane
are its three sanctioned upstream computers, each deterministic, versioned,
and named in the banner. (The alternative — routing lens creation through
the gate's zero-evidence hypothesis path — was considered and declined: the
lane's upsert key is ontologyKey, the gate's is type+label, and forcing the
lane through the gate buys no trust for a mapping that is already
deterministic code.) Schema banner + §1/§3.1 sentences updated together.

### A-6 (ChatGPT C-2 + #9) — Lens-node idempotency has no DB guard
§1 promises upsert by (userId, provenance=LENS, ontologyKey) but §7's
migration-7 list carries no unique constraint for it — concurrent imports
double-mint and test 2 can't hold. **Fix:** §7 migration-7 adds the partial
unique index (`(userId, ontologyKey) WHERE provenance='LENS' AND archivedAt
IS NULL`) + ontologyKey NOT NULL for LENS; the import runs in a transaction
with retry-on-serialization-failure (ChatGPT E-15, one sentence); the lens
map pins key→type one-to-one with a CI test so an update-in-place can never
cross-type mutate (ChatGPT #9).

### A-7 (ChatGPT C-3) — The deletion cascade has no structural mechanics
§7 states the archive/sever split but names no onDelete behavior or
transaction shape. **Fix:** §7 migration-7 pins `chartImportId onDelete:
SetNull` at the DB layer + the app-level erasure transaction (archive
uncharged, sever + provenance-note charged) — and test 11 (new, with A-9)
asserts the split.

### A-8 (Claude M-4 ≡ ChatGPT C-4) — D-R1's direction rule is policy prose; make it structural
Nothing stops a lens-map author minting a chart-flavored key via a two-step
(add key to ontology, then target it). **Fix (structural-enforcement class):**
(a) lens-map targets are a TYPED subset — `ontologyKey: OntologyKey`, a
union generated from the ontology module (single source of truth), so an
unknown key is a compile error; (b) CI rule: an ontology-config diff adding
keys in the same change-set as a lens-map edit fails review; (c) the naming
rule written down (keys describe psychology, never chart features) with a
greppable denylist of system terms (centers, gates, houses, signs,
authorities); (d) runtime fail-closed: an import whose mapping references an
unknown key is refused and logged.

### A-9 (Claude M-6) — The archive/sever lifecycle has zero tests
lensMapVersion-bump semantics and the ChartImport cascade are prose-only.
**Fix:** new test 11 — remap with a removed key over one charged + one
uncharged ghost (uncharged archives, charged survives severed with
provenance note); ChartImport delete asserts the same split, zero FK
violations.

### A-10 (Claude M-7) — MatcherRun's §7 columns can't support §3.1's replay claim
Prior states and links-written have no column. **Fix:** §7 migration-8:
`MatcherRun.inputs JSON` (prior hypothesis states + trigger) and a `runId`
FK on HypothesisEvidenceLink (links derived from the run, not duplicated
into a JSON blob); test 7's replay asserts against these carriers.

## CHEAP (approve as a block)

- **C-1** (Claude m-4 ≡ round-1 PARTIALs A-7/A-8/C-7/C-9): one view-model
  snapshot test covering brightness recency + edge-confidence bands + fringe
  presence, plus a `@ts-expect-error` fixture for ShadowCandidate[] as
  projection input — closes all four PARTIAL closures.
- **C-2** (Claude m-1): restate the link-based "charged" definition (any
  validated evidence LINKED — so a CONTRADICTED mass-0 ghost counts as
  charged and survives deletion; being wrong is the product's claim) where
  §7's cascade rule lives.
- **C-3** (Claude m-2): test 9's lens-confirmation case labeled
  eval-corpus-scored (match rate per ontology version), never CI-gating —
  mirrors the proposer spec's CI vs canary split.
- **C-4** (Claude m-3): crisis-independence operationalized — classifier
  output invariant under veil-flag flip on identical input + import-boundary
  lint (classifier module cannot import rendererConfig).
- **C-5** (Claude m-5): gate spec closing line still says v1.6 — sync to
  v1.7.
- **C-6** (Claude m-6): budget × re-import interplay — charged ghosts live
  OUTSIDE the ghost budget (they've earned their place); the cap governs
  uncharged hypotheses only.
- **C-7** (ChatGPT #11): the runtime value is named `brightness` everywhere
  (never "luminosity"); a test asserts the projection never reads the
  persisted luminosity column.
- **C-8** (ChatGPT #12): cosmos integration test framed as a smoke test
  (spy on calls, no assumptions about internal queue structure); exact
  version pin.
- **C-9** (ChatGPT #13): supervised pending-confirmation copy — when a
  second COUNTERVAILING arrives but the confirmation carrier isn't deployed,
  the UI shows a "pending confirmation" state, fail-closed, never silent.
- **C-10** (ChatGPT #8, test half): the matcher unit-tests that the
  algorithm versions it stamps equal the gate's for the same recompute (the
  shared-package restructure half is rejected, R-2).
- **C-11** (Claude E-1): §7.1 pilot-feedback line — watch whether the static
  fringe still reads as a genuine boundary on mature maps.
- **C-12** (ChatGPT E-17 remainder): rendererConfig defaults checked into
  the repo with a canonical-view snapshot per version (C-14 closure already
  carries the type + versioning).

## DEFERRED

- *(nothing new — ChatGPT E-14 elaborates the already-deferred dry-run
  entry: its structured-counts shape is folded into the existing §7.1 text;
  ChatGPT E-16 restates the already-deferred birth-data governance entry.)*

## REJECTED (with reason)

- **R-1** (ChatGPT #7 — "byte-identity blinding test is brittle; use a
  semantic predicate"): REJECTED. The serialized proposer context is
  produced by an allowlist serializer with no volatile fields — byte
  identity is deterministic here, and it is the STRONGER assertion: a
  semantic predicate must enumerate what "counts," which is exactly the
  enumeration a leak slips past. Precedent: proposer round 1 deliberately
  moved this invariant TO context byte-identity from a weaker equality.
  (Verified: `serializeExtractionContext` is allowlist-based; the proposer
  keystone already relies on its determinism.)
- **R-2** (ChatGPT #8, restructure half — extract arithmetic into a shared
  package): REJECTED as substrate-before-evidence. §3.1 already mandates
  importing the gate's exported functions; a package move is directory
  churn that buys nothing the import doesn't. The version-equality test
  (the real protection) is accepted as C-10.
- **R-3** (ChatGPT #10 — "migration-7 fields missing from schema now"):
  REJECTED as a build-order misread. §7 exists precisely to assign those
  carriers to their owning migration ("when §1 is built" — §6's build
  order); landing empty columns before the lane exists is the un-Meta-01
  move. The finding's substance (tests wired when the fields land) is
  already §7's contract.

## STALE-ALREADY-FIXED

- *(none — both lanes reviewed v1.1 exactly; ChatGPT's #10 is classified
  above as a misread rather than stale.)*

---

## Checkpoint for Jacob

1. **ACCEPT-NOW block A-1…A-10** — approve? A-1 (recompute trigger) and A-2
   (effectiveEvidence into the renderer) are the load-bearing pair; A-1
   carries evidence-semantics adjacency, so per your charter amendment it
   integrates with failing-first tests including the pipeline-level
   negative-lifecycle case.
2. **A-5's proposed resolution** — the "graph writer is the single writing
   module; gate/matcher/lens-lane are its three named upstream computers"
   banner reframe, chosen over routing the lens lane through the gate.
   Loop-decidable by charter (contract/seam), but flagged since it words a
   trust-boundary inventory.
3. **CHEAP block C-1…C-12** — approve as a block? (C-10 is the accepted
   half of a finding whose other half is rejected in R-2.)
4. **Rejections R-1…R-3** — no Critical is rejected (R-1 rejects a Major's
   proposed weakening, not its concern; the concern is already covered by
   the stronger existing test). Standing rule: any objection reopens them.
5. **Exit trajectory:** if round 3 returns zero Criticals after this
   integration, the spec stamps v1.2-FINAL (or v1.3-FINAL if a round-3
   integration intervenes) under the standard exit; the charter's cap rule
   applies as always.
