Version reviewed: Psyche-Net · the sky and its first ghosts · v1.0 (renderer & lens spec v1.0 — governs /src/engine/lens/, /src/engine/hypothesis-match/, /src/app/(sky)/ — for REVIEW-01 iteration)

Verdict: Request Revisions

CRITICAL

1) Lens node “type” vs matcher rule — structural contradiction blocks matching
- Observation: The matcher’s v1 rule = same type + same ontologyKey. But schema and contracts define NodeType including "LENS", and extractable types explicitly exclude "LENS". If lens nodes are created with type=LENS (as the enums suggest), no extracted node can ever have the “same type,” so matches will never fire. The mapping prose also says “each [template] with a type” without clarifying whether that is NodeType=LENS or the downstream domain type (BELIEF/TRAIT/etc.). This also infects tests (“exact-key match charges”) and the renderer’s grouping-by-type.
- Why it matters: It breaks the core promise that lens hypotheses can be confirmed/contradicted downstream of the gate without polluting the proposer’s context. As written, the matcher cannot match anything; confirmation never materializes; contradiction never fires; the “show your chart being wrong” claim is untestable.
- Action:
  - Decide and encode one of these, structurally:
    - Preferred: Lens nodes carry the domain type (BELIEF/TRAIT/…) and provenance=LENS; do not use NodeType=LENS in practice. Update the spec to say so explicitly; add a lint/test that lens nodes never use type=LENS. Or,
    - Alternate: Keep NodeType=LENS but add a required lensTargetType field on lens nodes (in Prisma + contracts, e.g., PsycheNode.lensTargetType?: NodeType) and make the matcher compare extracted.type to lensTargetType (not lens.type).
  - Update the matcher spec: “match on ontologyKey AND domain type (not NodeType=LENS).”
  - Add schema/tests: a type-level guard that proposer cannot emit type=LENS (already in contracts via ExtractableNodeType), and a test that lens nodes created by the mapping are matchable under the chosen rule.

2) Matcher “never touches mass arithmetic” vs HYPOTHESIS→ACTIVE transition — illegal state transitions without evidence attachment
- Observation: The matcher promises to update hypothesis state based on matched evidence and to “never touch mass arithmetic.” But CLAUDE.md + gate spec require that ACTIVE follows clearing a materialization threshold with conferring evidence, which necessarily implies (a) attaching verified evidence to the node and (b) recomputing mass/confidence/state from that evidence. If the matcher only flips state, you can get ACTIVE nodes at mass 0 with zero evidence pointers, violating LAW 1/2 and §6.4.
- Why it matters: Violates evidence mandate and replays; creates non-replayable, interpretation-only state jumps downstream of the gate.
- Action:
  - Make the matcher a deterministic, versioned MERGE step:
    - On match, re-parent the verified evidence (or, better, deterministically merge the extracted node into the lens node): move/attach the VerifiedEvidence rows to the lens node, de-duplicate, recompute arithmetic via the same pure functions, and only then allow HYPOTHESIS→ACTIVE.
    - Persist a canonical “mergedIntoNodeId” on the absorbed node (audit trail), or keep an idempotent merge map so replay produces the same associations.
  - Add tests: “lens confirmation attaches evidence to lens node; mass > 0; state ACTIVE; replay produces identical Evidence rows and node states.”
  - Stamp matcherVersion and include it in derivation metadata so auditability holds.

3) Domain/rendering separation vs persisted x/y — law breach in schema
- Observation: Renderer section restates the invariant: “No coordinate is persisted into domain state.” But Prisma schema persists PsycheNode.x/y with a note “position may be engine-managed; persisted for continuity.” That directly contradicts the restated invariant and CLAUDE.md.
- Why it matters: Coordinates creep back into the domain is the exact semantic-backflow failure the law prevents; it’s also how “proximity looks like meaning” leaks into code paths.
- Action:
  - Remove x and y from PsycheNode. If continuity is needed, store layout cache in a separate rendering-only store (e.g., RenderCache keyed by userId+nodeId, clearly out of domain modules) or client-local storage. Add a type-firewall so render layout types cannot be imported into engine modules.
  - Keep/extend the firewall test (spec §5.4) to fail if any view-model coordinate type crosses into the writer/domain.

4) Lens versioning/idempotency carriers missing — “stamped” in prose, absent in schema
- Observation: Spec promises to stamp lensMapVersion and to make re-import idempotent (same chart upserts, never duplicates). Prisma has no lensMapVersion on ChartImport or PsycheNode, no chart fingerprint, and no uniqueness constraint to enforce idempotency. There’s also no node-level unique key to dedupe lens re-materializations across mapping versions.
- Why it matters: Without carriers and constraints, re-import can duplicate lens nodes; later mapping tweaks can’t be audited; “same chart → same ghosts” test becomes flaky or false.
- Action:
  - Schema changes:
    - ChartImport: add chartFingerprint (hash of canonicalized birth inputs + resolved timezone + provider id), lensMapVersion, provider, retentionPolicy fields; add unique index on (userId, system, chartFingerprint).
    - PsycheNode: add lensMapVersion (string) and unique (userId, provenance, ontologyKey) to dedupe lens nodes; if ontologyKey can collide across types, include lensTargetType in the key.
  - Lane code: upsert by (userId, provenance=LENS, ontologyKey[, lensTargetType]); on mapping version bump, update in place where keys are unchanged; where keys change, archive old and create new; record both versions on the nodes for audit.
  - Tests: determinism includes stable ordering and identical ids across re-import for unchanged keys.

5) BECOMING match ownership split between gate and matcher — double-rules, conflicting carriers
- Observation: Gate v1.5 already ships the minimal deterministic hypothesis-matcher for BECOMING (exact-normalized-label merge inside the gate). This spec says the matcher handles “standing LENS (and BECOMING)” with “same type + ontologyKey,” which conflicts with the gate’s exact-label merge and likely won’t fire (becoming nodes often lack ontologyKey).
- Why it matters: Two competing matching rules for BECOMING across two layers yield contradictions, flaky tests, and non-replayable outcomes.
- Action:
  - Scope the post-gate matcher to LENS only for v1. Leave BECOMING merging inside the gate per v1.5.
  - State precedence explicitly: gate own-key/node dedupe → gate becoming label-merge → post-gate lens matcher by ontologyKey+domain type.
  - Add a test asserting this precedence and that the post-gate matcher refuses to “re-match” already-merged becoming nodes.

MAJOR

6) Re-import idempotency and duplicate control not structurally enforced
- Observation: Prose promises “same chart upserts, never duplicates,” but schema lacks uniqueness on (userId, system) or a fingerprint; JSON equivalence depends on provider field order; ghost budget and skipping unknown features can make output non-deterministic if ties aren’t broken.
- Why it matters: Duplicate chart imports and/or duplicate lens nodes; flakiness in the keystone “byte-identical node set” test.
- Action:
  - Implement canonical fingerprinting (normalize birth inputs, provider id, resolved timezone, round lat/lng deterministically) and persist it; enforce unique (userId, system, chartFingerprint).
  - In mapping code, produce a deterministic sort: priority desc, then ontologyKey asc, then label asc; persist mappingPriority on nodes so keystone test is stable.

7) Luminosity/recency mapping undefined at the projection seam
- Observation: Renderer maps “luminosity/recency → brightness,” but the domain’s luminosity is explicitly deferred; skyProjection inputs are “nodes, edges, now,” with no recency stats guaranteed unless nodes include evidence. The mapping currently has no structural carrier for recency if the projection isn’t allowed to inspect evidence.
- Why it matters: Either the projection quietly re-derives recency from evidence (violating “projection is just a projection”) or brightness is undefined/hand-wavy; tests can’t be written deterministically.
- Action:
  - Pick one:
    - Add a domain field lastConferringAt (or presentMass, presentRecency) computed in the arithmetic layer, and make skyProjection consume only that; or,
    - Pass evidence metadata to skyProjection as part of the view-model build (but keep pure by passing “now” and pre-aggregated stats).
  - Update tests to snapshot the view-model with explicit recency input; forbid projection from touching raw Evidence rows.

8) Accessibility requirement vs build order — list view “v1” vs ghost-sky milestone
- Observation: Renderer mandates a list view shipped in v1; build order says ghost sky milestone requires only mapping+projection+cosmos. If the demo ships without the list view, reduced-motion and non-spatial access (LAW 5) are violated.
- Why it matters: Violates the non-negotiable “no information may exist only spatially or in motion” at the demo.
- Action:
  - Move “list view” into the ghost-sky milestone cut; define a minimal but complete list (group by type/state; tap opens evidence) before external demo.
  - Add a test asserting keyboard reachability over all nodes/evidence in list-mode.

9) COUNTERVAILING guard path is prose-only here
- Observation: The matcher claims “COUNTERVAILING evidence (recurrence ≥2 or practitioner confirmation) → CONTRADICTED” but no config carrier, no mode gate (solo vs supervised), and no state-derivation hook are specified in this module’s interface.
- Why it matters: High-visibility contradiction transitions could fire on a single mislabeled polarity — a breach of gate §1.1’s solo guard.
- Action:
  - Make the matcher consume a versioned config with explicit thresholds and mode (SUPERVISED|SOLO) — mirror gate’s GateConfig pattern and guards.
  - Add tests: single countervailing never contradicts in SOLO; supervised with confirmation does.

10) Tap-for-evidence relies on authorship in UI — check seam with contracts
- Observation: The panel promises to mark practitioner-authored evidence as non-conferring. Gate docs’ VerifiedEvidence example omits authorship; contracts add authorship. The renderer depends on having it.
- Why it matters: If the view-model doesn’t carry authorship, the UI can mis-mark evidence or silently assume.
- Action:
  - Make the renderer input explicitly include VerifiedEvidence.authorship (per contracts), or join SourceEvent.authorship by sourceEventId when building the view-model. Add a snapshot test ensuring authorship is present and rendered.

11) Mobile “long-press = evidence” is brittle on iOS
- Observation: Long-press conflicts with OS gestures and is inconsistent across browsers.
- Why it matters: Demo on their phone; discovery of evidence is a core moment.
- Action:
  - Provide an explicit “Evidence” affordance in the node detail (tap → select; second tap → details), and keep long-press as an additional path, not the only one. Add mobile e2e test.

MINOR

12) Ghost-budget tie-breaking not specified
- Observation: With a 9–15 cap and a priority field, ties and deterministic ordering aren’t specified.
- Why it matters: Flaky determinism test and confusing re-import reorderings.
- Action:
  - Define a total order: priority desc, ontologyKey asc, label asc; apply before cap; assert in tests.

13) Shadow-lane edges “not rendered at all” should be structural
- Observation: Prose-only; relies on projection only receiving persisted edges.
- Why it matters: A future change could accidentally pass shadow candidates to the projection.
- Action:
  - Define the projection input type as PersistedEdgeView that excludes shadow; add a type-level ban on passing ShadowCandidate[] to projection; add a test that shadow edges are never present in the view-model.

14) Cosmos.gl v3 init/ready queueing — test the async seam
- Observation: Spec calls out v3’s async init; no test ensures no method is called before ready.
- Why it matters: Subtle race during demos.
- Action:
  - Add an integration test that verifies methods are queued pre-ready and flushed post-ready; pin package version in lockfile and record SPDX.

15) Chart PII retention and encryption are only comments
- Observation: “Encrypt at rest” and “retention noted” are prose; no schema or config carriers.
- Why it matters: Governance and deletion need real carriers (LAW 8).
- Action:
  - Add provider, retentionPolicy fields to ChartImport; document and test that raw responses are encrypted at rest (e.g., KMS) and redaction/erasure is feasible. Add governance bundle entry reference to code.

ENHANCEMENT

16) Lens mapping dry-run + unknown-feature telemetry
- Observation: Unknown features are “skipped and logged.”
- Action: Provide a mapping dry-run mode that outputs proposed nodes without writes and records counts of unknown/unused features; surface a dev panel to tune the ghost budget and priorities.

17) Deterministic seed for layout continuity
- Observation: “Fixed seed per user” is prose-only.
- Action: Define seed = stable hash(userId) and pass it explicitly to skyProjection; test that same seed + same input → identical layout.

18) Evidence re-parenting audit trail
- Observation: Merging extracted nodes into lens nodes loses the visible lineage unless tracked.
- Action: Add a MergeEvent (event-sourced) or a mergedIntoNodeId on absorbed nodes with matcherVersion; expose in node details (“original evidence gathered for [extracted label] on [date]”).

19) Confidence rendering grammar carrier
- Observation: “Opacity floor + subtle uncertainty ring” is a rule, not yet in config.
- Action: Add a versioned rendererConfig with ring thickness/opacity floors by confidence band; snapshot tests assert mapping.

20) List-view completeness for edges
- Observation: Nodes are emphasized; edges’ evidence also needs to be reachable in the list.
- Action: Ensure edges are groupable and navigable in the list view with their evidence slices.

What’s genuinely strong
- Clear lane separations: lens is deterministic and code-only; renderer is a pure projection; the matcher is the only legal bridge — aligned with blinding and LAW 3.
- Renderer grammar is principled: mass→size, confidence visibly rendered, hypothesis styling, and the “edge of the unexplored” motif embody LAW 5 in UI, not just data.
- Testing posture is excellent: projection purity, domain/rendering firewall, span-slice round-trip in the UI path, and matcher keystones are the right tests at the right layers.
- Failure modes are honest: API errors fail-closed with retryable imports; unknown chart features are skipped and logged instead of guessed into nodes.

Address the structural seams (lens node typing/matcher, evidence merge semantics, coordinate persistence, and versioning/idempotency carriers), and this module set will sit cleanly on the CLAUDE.md laws while remaining demo-realistic.