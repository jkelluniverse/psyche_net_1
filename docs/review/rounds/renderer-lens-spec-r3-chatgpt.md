Version reviewed: Psyche-Net · the sky and its first ghosts · v1.2 (renderer & lens spec, REVIEW-01 iteration, round 3)

Verdict: Request Revisions

CRITICAL

1) LAW-8 erasure vs link lifecycle: referential integrity contradiction
- Observation: §3.1 requires HypothesisEvidenceLink rows be “invalidated, never silently cascaded” when Evidence is erased (LAW-8), and that recompute work “from the link’s invalidation record alone.” But with an FK from link.evidenceId → Evidence(id), hard deletion creates three conflicts: (a) FK breaks (cascade defeats the “never silently cascaded” rule; restrict blocks erasure), (b) uniqueness on (evidenceId, nodeId) can’t be enforced post-delete, and (c) the overlay and view model reference evidenceIds that may no longer exist.
- Why it matters: This is the hardest negative lifecycle you promised (test 7). If the DB model can’t retain an auditable tombstone of a link whose Evidence was hard-deleted, you can’t (1) recompute deterministically, (2) pass replay, or (3) keep the “un-confirming must un-tell” guarantee without dangling FKs or silent drops. It’s also where consent stakes are highest.
- Action: Redesign the link schema and cascade rules:
  - HypothesisEvidenceLink:
    - Columns: evidenceId (FK, ON DELETE SET NULL), evidenceIdWas TEXT NOT NULL (copy at insert), nodeId, runId, matchedAt, matchRuleVersion, invalidatedAt, invalidationCause ENUM('SOURCE_INVALIDATED','LAW8_ERASURE','MANUAL'), invalidationRunId.
    - Unique: UNIQUE (nodeId, evidenceId) WHERE evidenceId IS NOT NULL (partial unique).
    - Index: (nodeId, invalidatedAt IS NULL) to find active links fast.
  - Erasure transaction in writer:
    - Before deleting Evidence, SELECT links, set invalidatedAt + cause + invalidationRunId, copy evidenceId → evidenceIdWas, then null out evidenceId (preserve the row).
    - Schedule recompute for affected hypotheses.
  - Renderer overlay: LensMatchLinkView should tolerate missing Evidence (evidenceIds filtered to those still existing). The panel must not attempt to slice erased content; it should omit the row (or render an “retracted” stub) explicitly.
  - Tests: Expand test 7 to assert FK survival (no orphans), preservation of evidenceIdWas, and that recompute from invalidated links alone returns to mass 0 and state reversion.

2) Schema/spec mismatch for migration 7/8 (columns/tables don’t exist)
- Observation: The spec relies on migration 7 (ChartImport.status, chartFingerprint, provider, lensMapVersion; partial unique index on (userId, ontologyKey) for LENS; onDelete: SetNull) and migration 8 (HypothesisEvidenceLink with runId, invalidatedAt; MatcherRun; HypothesisConfirmation). The provided prisma/schema.prisma contains none of these.
- Why it matters: Round-3 tests (3, 7, 8, 11) and multiple invariants depend on these carriers. Without them, the milestone can’t compile, let alone pass CI. Also, Prisma can’t express several of these constraints; you need raw SQL migrations now to keep the contracts honest.
- Action:
  - Author explicit SQL migrations (checked in) for:
    - ChartImport additions + @@unique([userId, system, chartFingerprint]).
    - PsycheNode partial unique index for LENS: CREATE UNIQUE INDEX … ON PsycheNode(userId, ontologyKey) WHERE provenance='LENS' AND archivedAt IS NULL.
    - PsycheNode.type <> 'LENS' CHECK (migration 6) and ontologyKey NOT NULL WHEN provenance='LENS' constraint.
    - ChartImport FK onDelete SET NULL.
    - CREATE TABLE HypothesisEvidenceLink (as redesigned in Critical #1) + runId FK + partial unique.
    - CREATE TABLE MatcherRun (id, trigger, inputs JSONB, matcherConfigVersion, matchRuleVersion, transitions JSONB, createdAt).
    - CREATE TABLE HypothesisConfirmation (practitionerId, nodeId, direction, at) as the supervised contradiction carrier.
  - Sync schema.prisma comments with a “raw SQL applies” note where Prisma can’t encode constraints; include migration filenames in §7 so seam-auditing is possible.
  - Bump contract version to v2.3 only when these types and migrations land.

3) WOUND veil “released” state has no carrier
- Observation: §2 promises “client-in-supervised stays veiled-until-released,” but there is no data model for a per-node release grant, nor a viewer/consent path to flip that bit. PractitionerClient.consentScope is too coarse to encode per-node releases; no NodeVisibilityRelease or equivalent exists.
- Why it matters: This is a safety/claims discipline control (LAW 7). Without a structural release carrier, the permissive misreading can slip back in via UI conditionals. Tests 10 can’t be made robust without an explicit state to read.
- Action:
  - Add NodeVisibilityRelease { id, nodeId, practitionerId, clientId, releasedAt, reason?, scope: 'LABEL'|'EVIDENCE' }.
  - Extend viewer type: { role, clientId?, practitionerId?, consentScope, releasedNodeIds: string[] } resolved server-side from NodeVisibilityRelease.
  - In skyProjection(viewer), compute veil from: node.type === WOUND AND viewer.role !== PRACTITIONER AND node.id ∉ viewer.releasedNodeIds.
  - Tests: update test 10 to cover pre/post-release rendering in all surfaces.

4) Renderer “effectiveEvidence” lacks a structural assembly path
- Observation: §2 moves “effectiveEvidence” and match-link overlay into the view model, requiring a 3-way join: Evidence (own), HypothesisEvidenceLink (linked), and SourceEvent (for authorship/invalidation). There is no defined PersistedNodeView/EdgeView carrier or query/view to guarantee this, and schema doesn’t expose a materialized view.
- Why it matters: The evidence panel and brightness logic depend on effectiveEvidence being complete and invalidation-aware. A missing/partial join silently corrupts brightness and the tap-for-evidence explanation — a trust breach surfaced to users.
- Action:
  - Define explicit TS types and assembly functions:
    - PersistedNodeView { id, type, provenance, label, ontologyKey, state, mass, confidence, effectiveEvidence: { evidenceId, sourceEventId, spanStart, spanEnd, occurredAt, authorship, polarity, role, conferring, normalizationVersion }[] }.
    - LensMatchLinkView { lensNodeId, extractedNodeId, evidenceIds: string[] }.
  - Implement assembly via:
    - SQL view or a single-resolver Prisma query + post-join to SourceEvent for authorship and invalidation filtering (filter out invalidated sources).
    - Ensure linked evidence excludes any link.invalidatedAt ≠ NULL and any evidence whose source.invalidatedAt ≠ NULL.
  - Tests: Update test 6 to assert authorship presence on linked evidence rows; add a negative case where a linked evidence’s source is invalidated and must be omitted from brightness and panel.

MAJOR

5) Recompute triggers: “writer is the trigger point” is not operationalized
- Observation: §3.1 declares the writer is the recompute trigger for match, retraction, and import/remap. There is no event bus or job de-dup policy described; no payload shape for a “schedule recompute” work item exists.
- Why it matters: Without a concrete trigger mechanism, recompute will be flaky (lost updates) or racy (duplicate runs), and test 7 replay claims won’t hold.
- Action:
  - Define RecomputeQueue table or enqueue to a durable job queue; key by (userId, nodeId), dedupe identical pending work; include trigger type, causal ids (evidenceId, sourceEventId, chartImportId), and createdAt.
  - Transactionally write recompute jobs within the same writer transaction that mutates Evidence/SourceEvent/ChartImport/links.
  - Worker runs matcher with a runId, stamps MatcherRun, and clears the job.
  - Tests: stress test concurrent invalidations and imports dedupe to a single full-graph run.

6) “Charged ghosts live outside the budget” needs an enforceable query
- Observation: Budget excludes any lens node that is “charged,” defined as “link-based — any validated evidence LINKED via §3.1 — never mass-based; a CONTRADICTED mass-0 ghost counts as charged.” No algorithm or query is provided to compute “charged” at selection time.
- Why it matters: Without a precise, efficient predicate, charged-but-dim ghosts can be dropped by the cap — violating the trust promise to users.
- Action:
  - Define charged predicate as EXISTS(SELECT 1 FROM HypothesisEvidenceLink L WHERE L.nodeId = N.id AND L.invalidatedAt IS NULL).
  - Selection order: rank all uncharged LENS nodes by total order (priority desc, ontologyKey asc, label asc), cap to ghostBudget; include all charged LENS nodes in addition.
  - Index: create (nodeId, invalidatedAt) on HypothesisEvidenceLink.
  - Test: Add a view-model snapshot where a CONTRADICTED, mass-0 lens node with an active link remains in the model despite budget pressure.

7) Arithmetic import path from the gate isn’t concretized
- Observation: The matcher “imports the gate’s exported pure functions” for mass/confidence/state and stamps algorithm versions equality (tripwire). There is no module location or export named; the gate spec doesn’t define a published API surface.
- Why it matters: Subtle code drift between two copies will silently fork the math and defeat replay/test 7.
- Action:
  - Publish a small npm-in-repo package “@psychenet/arithmetic” used by gate and matcher, exporting mass(), confidence(), nextState(), types, and versions. Consume only this from both modules.
  - Test: a matcher unit test asserting algorithm version equality and output identity for shared fixtures (already mentioned — make it concrete).

8) Tap-for-evidence slices need a data path to SourceEvent.content
- Observation: §2 requires the UI to slice SourceEvent.content by spanStart/spanEnd. The view model doesn’t carry content; no API contract is defined to fetch it on demand.
- Why it matters: If the panel silently falls back to Evidence.quote, you regress to the exact class of “span mapping lies” this system promised to avoid.
- Action:
  - Define an app-layer endpoint: GET /api/evidence/:evidenceId -> { content, spanStart, spanEnd, occurredAt, authorship } with auth checks; or include a short “snippet” assembled server-side by slicing, to avoid shipping full content if not needed.
  - Test: Update test 6 to confirm the UI path actually slices from fetched content (spy or integration-level assert), including linked evidence.

9) Full-graph trigger after import/remap: idempotency and back-pressure
- Observation: §3.1(3) triggers a “full-graph matcher run” per import/remap. There’s no idempotency window, no concurrency cap, nor a strategy to coalesce sequential imports for the same user.
- Why it matters: A rapid sequence (e.g., chart retry + map tweak) can queue multiple full runs, starving other work or racing version stamps.
- Action:
  - Cohere runs by a (userId) run key; store lastScheduledAt; merge multiple triggers within a debounce window.
  - Ensure the worker serializes runs per userId.
  - Stamp MatcherRun.trigger with a distinct “IMPORT_REMAP” cause carrying chartImportId(s)/lensMapVersion for audit.

10) Proposer context byte-identity test: protect against accidental fields
- Observation: You rely on allowlist determinism; but the matcher will change states on LENS nodes which a naive “current graph summary” builder might include.
- Why it matters: A single accidental addition to the proposer context (like non-extracted node counts) will fail test 7 or worse, breach blinding.
- Action:
  - Codify the context builder as a pure function over a type that cannot represent non-extracted nodes (e.g., ExtractedGraphSummary). Add a schema-level lint test that the context module does not import LENS/BECO/PRACTITIONER models. Keep the byte-identity test (as spec’d) to protect against drift.

MINOR

11) Viewer type and veil mapping need to be explicit
- Observation: skyProjection(viewer) depends on a viewer param (role + consentScope-derived visibility), but the type shape and consent-to-visibility mapping rules are implicit.
- Why it matters: Prompt-level controls drift; type-level carriers keep you honest across surfaces.
- Action: Define Viewer = { role: 'INDIVIDUAL'|'PRACTITIONER'|'ADMIN', clientId?: string, practitionerId?: string, consentScope: ConsentScope, releasedNodeIds: string[] } and a pure function veilDecision(node, viewer, config). Property-test invariants (classifier independence, role transitions).

12) ChartImport deletion split requires onDelete: SET NULL
- Observation: §7 promises app-level split behavior (uncharged archives; charged severs FK). The current Prisma relation has no onDelete mode specified.
- Why it matters: Default RESTRICT or CASCADE will contradict the intended split.
- Action: Set onDelete: SetNull in the Prisma relation and enforce split in the application transaction. Test 11 should assert both outcomes and zero FK violations.

13) Partial unique/DB CHECK usage needs code comments and migration links
- Observation: Spec defers several constraints to migrations not expressible in Prisma. The schema hints at that for Evidence.validated, but not for all new constraints.
- Why it matters: Future maintainers will break invariants by refactoring the schema if they don’t see the “raw SQL applies” banner and the migration reference.
- Action: In schema.prisma, annotate fields/relations with “constraint enforced via migration N” comments; include migration filenames and a short rationale.

14) Naming denylist and CI rule (D-R1) should be demonstrably executable
- Observation: Prose says there’s a “greppable denylist” and CI checks to prevent co-edits to ontology and lens-map.
- Why it matters: Prompt-enforced controls are fragile.
- Action: Add a pre-commit/CI script that:
  - Fails if a diff includes edits to both /ontology/* and /src/engine/lens/lens-map.*.
  - Fails if lens-map contains any denylisted system terms. Check this in CI and reference the script from the spec.

15) Cosmos.gl v3 ready-queue contract
- Observation: Integration note is correct but brittle in practice; no code pattern shown.
- Why it matters: A subtle race condition will make the live demo flaky.
- Action: Document the init pattern (create, await graph.ready promise, then apply data) and add a smoke test that spies on calls post-ready. Pin exact version in package-lock and record SPDX in a NOTICE file.

ENHANCEMENTS

16) Lens mapping dry-run + unknown-feature telemetry
- Observation: Logged in §7.1; still valuable pre-pilot.
- Action: Add a dryRun: true flag to the lens import path that returns proposed ghosts, a count of unmapped chart features, and a log of unknown ontology keys. Store as a LensImportAttempt row for tuning.

17) Eval canary for lens confirmation
- Observation: §1 proposes tracking match rate per ontology version; no specific measurement plan.
- Action: Log a LensConfirmationCase eval entry and a periodic job that recomputes match rates per ontology version; chart in CI dashboards (canary only, not gating).

18) Static fringe honesty watch
- Observation: Good pilot watch item; consider an A/B config flag for presence vs. toned-down presence on mature maps to gather signal early.

19) API ergonomics for evidence panel
- Observation: The “slice on the server” option can reduce data-in-flight and keep privacy tight.
- Action: Make an endpoint that returns { quote, occurredAt, authorship } by slicing server-side using persisted spans; UI displays this canonical copy, not a local slice.

What’s genuinely strong

- The round-2 seam fixes are real: recompute triggers stated, link lifecycle thought through, live-join rule imported from the gate, and the rendering overlay for matched pairs defined. That closes the biggest epistemic hole (un-confirming must un-tell).
- The projection boundary is crisp: deterministic view model, GPU randomness acknowledged, and a rendering-only grammar with versioned config. The WOUND veil “as a property of the projection” is the right structural move.
- Domain/rendering firewall is enforced end-to-end (dropped coords, test to forbid reading luminosity); the cosmos.gl licensing constraint is explicit and safe.
- Lens lane is deterministic, idempotent, and chart-agnostic with D-R1 enforced structurally (typed ontology keys, CI guard, denylist, fail-closed runtime).
- Tests are brave and specific, including the negative lifecycle and NFKC traps; the proposer blinding invariant is carried through to a byte-identity test.

Address the CRITICAL schema/link lifecycle seams and the veil release carrier, and this spec can stamp FINAL with confidence that the hard safety/epistemic guarantees are actually carried by code, not prose.