69d449310124c56ad8184f1aa969c57efa22b358

**Verdict: PASS — zero Criticals on the diff.** (1 MAJOR, 3 MINOR below; none blocks the FINAL stamp under the charter's post-escalation exit.)

Reviewed: targeted diff verification of the D8/D9 round-3 integration commit — gate spec v1.5→v1.6, proposer spec v1.3→v1.4, contract v2.1→v2.2, `massAlgorithmVersion` v1→v1.1 — against `src/engine/citation-gate/mass.ts`, `gate.ts`, `state.ts`, `src/engine/contracts/extraction-contracts.ts`, `src/engine/proposer/{parse,context,policy,types}.ts`, both test diffs, and citation-gate-spec §4/§6/§6.2/§7.

## Findings

### MAJOR-1 — The conferring rule is now a denylist at the trust boundary; its "restrict-never-create" claim holds only inside today's closed enum
`mass.ts:31`: `return nodeType === "BECOMING" ? e.role === "ENACTMENT" : e.role !== "DECLARATION";`
The old arm was an allowlist (`role === "SUPPORT"`); the new arm confers for *anything that is not DECLARATION*. The diff's own comment claims "a mislabel can still only UNDER-confer, never create" — true for the three current `EvidenceRole` members, false the moment a fourth member exists or a non-enum value reaches the function. Two ingress paths were traced:
- **Model output:** cannot carry a junk role — `parse.ts:98-99` rejects unknown roles fail-closed (`ROLES` allowlist), and `verifyEvidence` defaults absent role to `SUPPORT`. Closed today.
- **Prior-graph `EvidenceRecord`s (persisted rows) and future enum extension:** a corrupted role, or a future contract bump adding e.g. a `REFLECTION`/practitioner-observation role, silently *defaults to conferring* on every non-BECOMING node and every edge — and none of the diff's tests would go red (they enumerate only the three current roles). This is exactly the silent-inversion class D8 itself was.
**Why not Critical:** `EvidenceRole` is a closed 3-member union; extension requires a contract-version bump that gets its own review; no input reachable today creates wrong mass. **Action:** state the rule as a positive set — `e.role === "SUPPORT" || e.role === "ENACTMENT"` (or a named `CONFERRING_ROLES` set in `GateConfig`, which also satisfies the no-magic-literals invariant) — in both `mass.ts` and spec §6, so a new role defaults to non-conferring, fail-closed.

### MINOR-1 — The canonical contract file still documents the pre-D8 rule
`extraction-contracts.ts:233-237` (`VerifiedEvidence.conferring` doc): "role rule (ENACTMENT for BECOMING nodes, **SUPPORT otherwise**)". The file self-describes as "this code file *is* the contract"; the diff synced two specs and `mass.ts` but missed this comment. Doc drift of exactly the seam class the loop hunts. Action: one-line comment fix to `role !== DECLARATION` (or the MAJOR-1 allowlist wording).

### MINOR-2 — Rejected-reason vs shadow-waitingReason ladders still disagree on one cell (pre-existing, but the diff rewrote the expression)
For a new edge with `waitingEndpoint=false` where BOTH `heldHighInference` and `belowCausalThreshold` are true (e.g. a DRIVES edge at HIGH_INFERENCE_INTERPRETATION with 1 span): `RejectedItem.reason = BELOW_MATERIALIZATION_THRESHOLD` (`gate.ts:523-527` checks `belowCausalThreshold` first) but `ShadowCandidate.waitingReason = HELD_HIGH_INFERENCE` (`gate.ts:499-503` checks `heldHighInference` first). Same item, same pass, two different "why"s. No state impact — both map to `"shadow"` in the §7 outcome mapping and the release ladder recomputes fully each sighting — but telemetry and the "every derived value is explainable" invariant want one ordering. Pre-dates this diff (the old ternary produced the same pair); the diff touched these exact lines and preserved it. Action: align both ladders to WAITING → HELD → BELOW.

### MINOR-3 — `consentScope.betweenSessionExtraction` is carried but consumed by nothing in the engine
Grep across `src/`: the D9 field appears only in `proposer/types.ts` and the two test fixtures. `assertPolicyCoherent` (`policy.ts`) does not reference it; no guard refuses anything when it is `false`. This is acceptable-by-design — session timing is invisible to this module, enforcement lives in the server policy constructor/scheduler, and the master-concept punch-list explicitly logs the consent-scope UX as pre-client deferred work — but it is currently a field with no carrier, the loop's named "disconnected fix" pattern. Action: when the server policy constructor lands, its refusal path for `betweenSessionExtraction:false` runs needs a test, or this stays prose.

## Diff-hunt checklist (the four targeted questions)

- **(a) Conferring semantics:** no cell creates mass that shouldn't (see matrix). Declarations still never ignite (BECOMING arm untouched; DECLARATION excluded everywhere). Practitioner words never confer (`authorship !== SELF` short-circuits first). Countervailing never adds mass — every call site ANDs `isConferring` with `polarity === "SUPPORTING"` (`mass.ts:53`, `gate.ts:307`, `gate.ts:488`, `state.ts:43`). Restrict-never-create holds for in-enum roles; the denylist caveat is MAJOR-1. Hypothesis-matcher interplay safe: conferring is computed against the **target** node's type (`gate.ts:260`), so an extracted proposal merging into a BECOMING node stays ENACTMENT-only.
- **(b) WAITING_ENDPOINT:** consistent both sides now. In `RejectionReason` (v2.2), in `GATE_REJECTION_REASONS`, in `ShadowWaitingReason`; emitted in both the `RejectedItem` (`gate.ts:524`) and the shadow candidate (`gate.ts:500`) for the same condition; disjoint from `WRAPPER_REJECTION_REASONS`; spec §4 body and §7 outcome mapping (→ `"shadow"`) both name it. The v1.5 gap (mapping referenced a reason never emitted) is closed. Only residue is the MINOR-2 both-holds cell.
- **(c) consentScope leakage:** none. `buildBlindedContext` field-picks exactly `mode`/`allowedNodeTypes`/`policyVersion` (`context.ts:53-57`), and the hard allowlist serializer THROWS on any extra policy field (`SHAPES.policy`, `context.ts:73`) — `consentScope` structurally cannot serialize toward the model. The fixture changes only satisfy the required type. `model-schema.ts` derives from `allowedNodeTypes` only and was not touched.
- **(d) Test pinning — mutation-traced by hand:** reverting `mass.ts:31` to `role === "SUPPORT"` fails (1) `arithmetic.spec.ts:134` (`ENACTMENT`/`BELIEF` → expected `true`), and (2) the D8 pipeline keystone (`pipeline.spec.ts:127-154`): both ENACTMENT spans become non-conferring → 0 conferring spans < materialization minimum → node shadowed → `acceptedNodes` length 0 fails the first assertion, and mass/state assertions fail independently. The fixtures it leans on (`ENACT_1`/`ENACT_2`, `selfSource`, `sourceMap`) pre-exist in the file/shared fixtures. Version-stamp test (`gate.spec.ts:1145`) pins v1.6/v1.1. The change is genuinely pinned. (Gap noted in MAJOR-1: no test pins behavior for an *out-of-enum* role.)

## Traced cells (conferring matrix, post-D8; precondition authorship=SELF ∧ source not invalidated — either failing ⇒ false, unchanged)

| nodeType | role | old | new | verdict |
|---|---|---|---|---|
| BECOMING | SUPPORT | ✗ | ✗ | unchanged — support never ignites |
| BECOMING | DECLARATION | ✗ | ✗ | unchanged — declarations never ignite |
| BECOMING | ENACTMENT | ✓ | ✓ | unchanged — ignition lane |
| non-BECOMING (WOUND…LENS) | SUPPORT | ✓ | ✓ | unchanged |
| non-BECOMING | DECLARATION | ✗ | ✗ | unchanged — a wish charges nothing |
| non-BECOMING | ENACTMENT | ✗ | ✓ | **the D8 fix** — intended, spec-matched, test-pinned |
| null (edges) | SUPPORT | ✓ | ✓ | unchanged |
| null (edges) | DECLARATION | ✗ | ✗ | unchanged |
| null (edges) | ENACTMENT | ✗ | ✓ | side-cell of D8; deliberate ("same non-BECOMING rule", mass.ts docstring) — behavioral evidence on edge strength, laws-consistent |
| any | authorship=PRACTITIONER | ✗ | ✗ | unchanged (LAW 3/4) |
| any | source invalidated | ✗ | ✗ | unchanged |
| any conferring | polarity=COUNTERVAILING | 0 mass | 0 mass | polarity filter at all 4 call sites |
| extracted→BECOMING label-merge | any | target-type rule | target-type rule | conferring vs TARGET type (`gate.ts:260`) — ENACTMENT-only preserved |
| out-of-enum role | non-BECOMING | ✗ | **✓** | unreachable today (parse.ts:98 fail-closed; closed union) — MAJOR-1 |

Doc-sync spot-checks: spec §6 formula, §6.2 "conferring, SUPPORTING-polarity" wording, §7 precedence note, §3.1a config param, and §4's WAITING_ENDPOINT sentence all match the code as shipped. Migration 5 default (`v2.2`) matches `CONTRACT_VERSION`. Charter exit clause matches this lane's mandate.

*— Targeted diff verification lane, fresh context, 2026-07-13.*
