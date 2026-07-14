Version reviewed: Psyche-Net · the sky and its first ghosts · v1.1 · in REVIEW-01 iteration (round 2)

Verdict: Request Revisions

CRITICAL

1) Linked-evidence seam: renderer/view-model can’t see what charged a lens ghost
- Observation: §3.1 links evidence to LENS nodes via HypothesisEvidenceLink (evidenceId → lens nodeId), and arithmetic recomputes mass/state using the merged set. But §2’s renderer contract (“Brightness → named recency function computed from evidence.occurredAt[]; tap-for-evidence slices SourceEvent spans”) describes inputs as PersistedNodeView/PersistedEdgeView, with no carrier for evidence linked via HypothesisEvidenceLink. Consequences:
  - Brightness for charged lens ghosts will compute off an empty node.evidence[] (stays dim/0).
  - Tap-for-evidence on a charged ghost cannot list the linked spans or slice SourceEvent content.
  - “Matched pairs render LINKED, never merged” has no structural link the renderer can consume.
- Why it matters: Violates LAW 5 (temporal honesty and first-class uncertainty in rendering), contradicts the copy promise (“which independently-extracted words did it”), and makes tests 2/7/9 un-implementable or flaky for charged lens ghosts.
- Action:
  - Expand the renderer-side types: PersistedNodeView must carry effectiveEvidence: EvidenceView[] = own Evidence rows ∪ linked evidence (joined via HypothesisEvidenceLink → Evidence → SourceEvent). EvidenceView must include authorship, spanStart/end, occurredAt, polarity, conferring, normalizationVersion.
  - Add an overlay carrier for the “matched pair” relationship: LensMatchLinkView[] on the SkyViewModel (e.g., {lensNodeId, extractedNodeId, evidenceIds[]}). Computed from HypothesisEvidenceLink.evidenceId → Evidence.nodeId (EXTRACTED). Grammatically style this as a non-domain overlay (no persistence).
  - Update skyProjection to compute brightness from effectiveEvidence timestamps (not just attached evidence).
  - Tests:
    - Amend test 6 (span slice round-trip) to cover linked-evidence rendering for lens ghosts.
    - Add a projection test asserting brightness/uncertainty rings change once linked evidence exists.
    - Add a view-model test that LensMatchLinkView is present after a §3 match.

2) Lens-node idempotency is prose-only; no DB guard against double-mint
- Observation: §1 promises “upsert by (userId, provenance=LENS, ontologyKey)”, but schema.prisma has no unique index/constraint to enforce it. Under concurrent imports (test 2), two identical lens ghosts can mint.
- Why it matters: Violates “Idempotency is structural,” threatens determinism and ghost-budget ordering, and makes the import concurrency test unreliable.
- Action:
  - Migration 7: add a partial unique index at the DB layer:
    - CREATE UNIQUE INDEX idx_lens_user_key_active ON "PsycheNode" ("userId","ontologyKey") WHERE provenance = 'LENS' AND "archivedAt" IS NULL;
    - Ensure ontologyKey is NOT NULL for LENS provenance in code (or add a CHECK).
  - Adjust upsert code to use this key and handle conflict-update safely.
  - Extend test 2 to simulate concurrent inserts and assert only one row exists afterward.

3) Deletion cascade of ChartImport is specified but structurally absent
- Observation: §7 (“deletion cascade… archives UNCHARGED, severs FK on CHARGED”) is not represented in schema relations (no onDelete behavior, no trigger). With current schema, deleting ChartImport could violate invariants or orphan references inconsistently.
- Why it matters: Breaks LAW 8 (privacy wall/erasure) and the provenance integrity of lens nodes; risks silent data corruption.
- Action:
  - Migration 7:
    - Set PsycheNode.chartImportId onDelete: Set Null at DB level to allow FK sever for charged nodes.
  - App-level erasure transaction:
    - For a ChartImport delete: archive (set archivedAt) all lens nodes for that import with mass=0 and state=HYPOTHESIS; for others, set chartImportId = NULL and add a provenance note.
  - Add tests:
    - Deleting a ChartImport leads to zero FK violations; uncharged archived; charged severed; linked evidence and derivations unaffected.

4) Ontology-direction rule is not enforced structurally
- Observation: §1 “ontology direction rule” forbids chart-specific keys from entering the shared ontology; enforcement is by policy text and an eval canary (§5 test 9), but there’s no build-time or run-time gate keeping lens-map targets to an existing, chart-agnostic ontology set.
- Why it matters: Violates the blinding invariant’s other half (ontology becoming chart-shaped), risks leakage into proposer vocabulary, and makes the “measured, not assumed away” stance weak at the interface.
- Action:
  - Define a single source of truth for ontology keys (ontology module), versioned.
  - Make lens-map targets a typed subset: ontologyKey: OntologyKey (TS union generated from ontology module).
  - Add a CI test that fails if any lens-map target references a non-existent key.
  - At runtime, reject any lens import whose mapping references unknown keys (fail-closed log), and surface count in “unknown-feature telemetry.”

5) “Matched pairs render LINKED” has no testable surface
- Observation: The renderer grammar requires linked pairs, but there is no explicit view-model field nor a test asserting this link exists. Without a structural carrier, this remains a prose-only claim.
- Why it matters: Users could see “two unrelated stars” or, worse, merged semantics in copy; also undercuts the honesty of the blinding invariant.
- Action:
  - As in CRITICAL #1, introduce LensMatchLinkView[] in the SkyViewModel and render treatment constants in rendererConfig (badge/caption strings).
  - Add a snapshot test that a charged lens ghost and its contributing extracted node appear with the link/badge in the view model.

MAJOR

6) WOUND veil parity in list view is unspecified
- Observation: §2 gates WOUND nodes in INDIVIDUAL skins in the sky render; list view is the canonical accessible surface, but the veil behavior there is not stated.
- Why it matters: Violates accessibility parity and LAW 5 (the list view must not expose what the sky veils).
- Action:
  - Add rendererConfig.woundGate rules for both canvas and list view surfaces. State copy/treatment for list view explicitly.
  - Extend test 10 to assert list-view parity (veiled in INDIVIDUAL; full in SUPERVISED).

7) “Proposer’s serialized context byte-identical pre/post matcher” is brittle as stated
- Observation: Test 7 asserts byte identity, but harmless serialization differences (ordering, unrelated timestamps) could cause flakiness. The substantive invariant is “no lens hypotheses enter the proposer context.”
- Why it matters: A flaky test erodes trust and may be disabled, losing coverage of a hard invariant (blinding).
- Action:
  - Refactor the test to assert a stable semantic predicate:
    - The set of node ids/types/labels passed to the proposer excludes all non-EXTRACTED nodes, before and after matcher runs.
    - Optionally assert a cryptographic hash of a normalized proposer-input form that explicitly excludes volatile fields.

8) Arithmetic reuse between gate and matcher risks version skew
- Observation: §3.1 imports pure functions (mass, confidence, nextState) “from the gate,” but there is no structural packaging rule to ensure a single shared module/version.
- Why it matters: Divergent versions or code clones will drift, yet tests can stay green independently.
- Action:
  - Extract arithmetic into a shared, versioned package (e.g., /src/engine/arithmetic, stamped with massAlgorithmVersion/confidenceAlgorithmVersion/stateAlgorithmVersion).
  - Add a unit test in matcher that asserts imported algorithm versions equal those stamped by the gate for a given recompute.

9) Lens-node uniqueness key ignores type; mapping must guarantee key→type stability
- Observation: Upsert key uses ontologyKey alone (scoped to LENS). If a future map revision changes the type for a key, an update-in-place could corrupt semantics.
- Why it matters: Silent cross-type mutation degrades auditability and replayability.
- Action:
  - Codify a one-to-one ontologyKey→type mapping in lens-map and test that any map version bump that attempts to change it fails CI.
  - Optionally include type in the unique index if you are not ready to lock key→type invariance.

10) ChartImport governance carriers missing for “status/provider/fingerprint/version”
- Observation: §7 outlines migration 7 fields (status, chartFingerprint unique, provider, lensMapVersion), but schema.prisma currently lacks them; the tests (1–2, 9) assume them.
- Why it matters: Delivery slip risk and test gap; import idempotency and failure handling are not verifiable.
- Action:
  - Land migration 7 fields and the @@unique([userId, system, chartFingerprint]) index. Implement status=error on API failures and re-import recovery paths. Wire tests 1–2/9 now.

MINOR

11) Brightness vs luminosity naming collision
- Observation: §2 uses “Brightness” for a recency function computed on-the-fly; PsycheNode.luminosity exists, deferred. Names are easy to conflate.
- Why it matters: Future devs may mistakenly wire the deferred column.
- Action:
  - Rename the runtime value in code to brightness (never “luminosity”), document clearly in rendererConfig, and assert in tests that persisted luminosity is not read by projection.

12) cosmos.gl v3 “queue until ready” test brittleness
- Observation: The library’s init queue is an internal contract that can change across minor versions.
- Why it matters: Integration test may become flaky or brittle on upgrades.
- Action:
  - Pin exact version and add a light smoke test that spies on calls without assuming internal queue structure. Keep the full queue-until-ready test gated behind a compat flag.

13) Copy scope for supervised contradiction confirmation is not named
- Observation: §7 (matcher) declares a practitioner-confirmation carrier but notes it’s deferred. The UI copy path when a contradicted transition is unreachable in SUPERVISED is unspecified.
- Why it matters: Practitioners need clarity; avoids silent non-responses.
- Action:
  - Add explicit UI copy and a “pending confirmation” badge when a second COUNTERVAILING appears but confirmation carrier is not deployed; treat as fail-closed.

ENHANCEMENT

14) Lens dry-run + unknown-feature telemetry should produce structured counts
- Observation: §7.1 defers this; it’s the tuning instrument for the ghost budget.
- Action:
  - Implement a dry-run function that returns: proposedGhosts[], prunedByBudget[], unknownChartFields[], and per-priority distribution. Persist aggregates for later analysis.

15) Concurrency around import runs
- Observation: Test 2 mentions “concurrent import attempts cannot double-mint” but no locking is described.
- Action:
  - Wrap import in a transaction that (a) computes fingerprint, (b) upserts ChartImport by the unique tuple, and (c) upserts lens nodes under the partial unique index. Add a retry on serialization failure.

16) Privacy hardening for birth fields
- Observation: §1 acknowledges PII sensitivity; encryption-at-rest and erasure coverage are deferred to §7.1.
- Action:
  - Add at-rest encryption for birthDate/birthTime/birthPlace/lat/lng (e.g., pgcrypto or application-layer envelope). Document erasure procedure covering ChartImport + derived LENS nodes + abstraction contributions.

17) Explicit renderer-config carriers
- Observation: Many render constants are described (uncertainty ring, edge dash/opacity, woundGate, brightness half-life).
- Action:
  - Provide a typed rendererConfig with versioning and default values checked into the repo; snapshot-test a couple of canonical views per version.

What’s genuinely strong

- Clear separation of concerns and invariants: lens lane determinism, rendering/domain firewall (with x/y/colorHint removed), and post-gate matcher as the sole cross-lane charging path are specified and cross-referenced to gate v1.7.
- Honest determinism boundary in the renderer: view-model is pure/deterministic; GPU layout is explicitly not — and the list view parity ensures accessibility and meaning are not spatially encoded.
- Charging carrier and replayability are now structural: evidence is linked (never copied), arithmetic is reused (not reimplemented), runs/stamps are persisted, and tests assert re-runs and proposer blinding.
- WOUND gating is thought-through and configurable: calm copy, veil semantics, and an explicit pilot fallback plan live in config, not prompts.
- Test plan is substantive and pipeline-aware: from NFKC span integrity and inference holds to the lens-confirmation eval canary that measures the ontology-direction gradient.

Address the structural seams above — especially the linked-evidence propagation to the renderer and the DB-level idempotency constraints — and this module will be ready to support a credible ghost-sky milestone without violating the nine laws.