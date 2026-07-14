# Targeted diff verification — renderer-lens v1.3 integration (commit cf7f191)

*REVIEW-01 · post-escalation exit lane (charter: zero Criticals on the diff → stamp v1.3-FINAL; any Critical → back to Jacob). Fresh-context adversarial lane; scope = the diff and what it caused, not the base (both r3 lanes already endorsed the base shape). Verified against: the r3 punch-list (D-R6/D-R7, A-2…A-5, C-1…C-14, tripwire), spec v1.3 in full, gate spec v1.7 §6, schema.prisma, and `/src` code where the diff makes code claims.*

---

## (a) Per-item verification table

| Item | Constraint | Status | Evidence (v1.3 text / code) |
|---|---|---|---|
| D-R6.1 | Writer-owned retraction API = single sanctioned mutation surface (invalidation / supersession / Evidence erasure / LAW-8) | **CARRIED** | §3.1 retraction-API bullet ("the single sanctioned mutation surface for `SourceEvent.invalidatedAt`/`supersededById`, Evidence erasure, and the future LAW-8 path"); §7 migration-8 entry |
| D-R6.2 | Recompute synchronous inside the retraction transaction; no crash window; outbox named-first if async ever needed | **CARRIED** | §3.1 trigger 2 ("synchronously, inside the retraction transaction… the divergence window does not exist. If async ever becomes necessary, a transactional outbox row gets named in §7 FIRST") |
| D-R6.3 | Banner amendment ("a retraction performed anywhere else is a bug") | **CARRIED** | schema.prisma lines 179–185; exact sentence present |
| D-R6.4 | Choke-point, NOT a retention mechanism (tombstones = ids/causes/stamps, never content) — in BOTH spec and banner | **CARRIED** | §3.1 retraction bullet + §7 migration 8 + schema banner ("CHOKE-POINT, NOT A RETENTION MECHANISM… never content") |
| D-R6.5 | Crash-shaped test 7(b) assertion (retraction commit ⇒ recompute already committed) | **CARRIED** | §5 test 7(b) verbatim |
| D-R6.6 | Retraction surface assigned to the matcher build stage | **CARRIED** | §3.1 + §6 build order ("hypothesis matcher + the writer's retraction API (one build stage… migration 8)") |
| D-R7.1 | Overlay applied AFTER `nextState`; own carrier (who/when/which run) | **CARRIED** | §3.1 D-R7 bullet ("applied by the matcher AFTER `nextState`… `HypothesisConfirmation` records who confirmed, when, and which MatcherRun applied it"); §7 carrier gains `appliedByRunId`, `withdrawnAt` |
| D-R7.2 | Reversible + contestable; severance withdraws the overlay's effect | **CARRIED** | §3.1 constraint (2); §7 ("reversible (withdrawal recomputes via trigger 4); severed relationships withdraw the overlay's effect"); trigger 4 exists |
| D-R7.3 | State only, never mass — survives every sentence mentioning confirmation | **CARRIED** | Checked every occurrence: changelog, §3.1(3), §7 carrier, test 7(c) ("moves state (never mass)"), test 14, §2 pending-confirmation, §3 match rule. No sentence lets confirmation touch mass or the gate's arithmetic; gate §6.4's `nextState(prev, evidenceSet, now)` signature is untouched — consistent |
| A-2 | Trigger 4 (confirmation write/withdrawal → transactional recompute) + failing-first test | **CARRIED** | §3.1 trigger 4; test 7(c) |
| A-3 | Erasure tombstone mechanics: SetNull, `evidenceIdWas`, `invalidationCause`, invalidating run id, partial unique, ordering, honest-arithmetic sentence, 7(b) no-orphans | **PARTIAL** | All carriers present (§3.1 link lifecycle; §7 migration 8; honest-arithmetic sentence verbatim; test 7(b) asserts `evidenceIdWas` preserved + no orphan FKs). Defect: §3.1 and §7 contradict each other on WHEN `evidenceIdWas` is copied → **finding M-1** |
| A-4 | SourceEvent erasure cascades to Evidence rows (quote copies) first; panel fail-closed; test 7(b) whole-SourceEvent variant | **CARRIED** | §3.1 ("SourceEvent erasure cascades to its Evidence rows first — the `quote` column is a verbatim copy…"); §2 fail-closed sentence; test 7(b) whole-SourceEvent variant. (Ordering interaction with A-3's defect noted in M-1) |
| A-5 | Veiled-ALWAYS v1 (no release carrier, fail-closed); seam reserved (`viewer.releasedNodeIds`); §7.1 sketch; **test 10 restated in its v1-assertable form** | **PARTIAL** | §2 rule verbatim ("v1 has no release carrier… veiled ALWAYS (fail-closed)"); master-concept §7.1 entry with the `NodeVisibilityRelease` sketch verbatim. Test 10 was NOT restated — it still reads "client-in-supervised stays veiled-until-released" → **finding M-2** |
| C-1 | Post-match money-shot test | **CARRIED** | Test 13 |
| C-2 | Pending-confirmation test | **CARRIED** | Test 14 |
| C-3 | effectiveEvidence sort pinned + no-double-count sentence | **CARRIED** | §2 ("canonically sorted (occurredAt, then evidenceId)… double-counting is structurally impossible in v1 and kept so on purpose") |
| C-4 | "archival" out of trigger 2 + node-archival-does-not-un-charge sentence | **CARRIED** | Trigger 2 lists invalidation/supersession/erasure only; §3.1 retraction bullet carries the sentence |
| C-5 | D-R1 (b)/(c) as named executable CI jobs | **CARRIED** | §1 ("CI job (named, executable)… fails the co-modification check in CI — not review convention, a script"; denylist "runs over lens-map keys on every commit") |
| C-6 | Gate-spec doc-sync: `confidence.hypothesisFloor` key named | **CARRIED / ACCURATE** | Gate spec §6.3; matches `config.ts` line 88/179 exactly (`confidence.hypothesisFloor: 0.15`) |
| C-7 | Gate-spec LENS unreachable-by-construction note | **CARRIED / ACCURATE** | Gate spec §6.1. Verified against code: `ExtractableNodeType = Exclude<NodeType, "LENS" | "BECOMING">` (extraction-contracts.ts:45); parse.ts closed enum fails LENS at shape validation in every mode (guards.spec exercises it); lens creation flows through the lens lane only |
| C-8 | WHERE clause written down + **test 6 gains the negative case** | **PARTIAL** | §2 rule verbatim ("both recompute and `effectiveEvidence` consume only links with `invalidatedAt IS NULL` and sources with `invalidatedAt IS NULL`"). Test 6 was NOT amended — no negative case (invalidated source omitted from brightness/panel) anywhere in §5 → **finding M-3** |
| C-9 | Charged predicate `EXISTS(active link)` + index + budget-pressure test | **CARRIED** | Test 15; §7 migration 8 index (nodeId, invalidatedAt) |
| C-10 | Concrete arithmetic import path | **CARRIED / ACCURATE** | §3.1 (`/src/engine/citation-gate/mass`, `/confidence`, `/state`); all three modules exist on disk |
| C-11 | Server-side slice endpoint; mismatch = visible error | **CARRIED** | §2 tap-for-evidence ("sliced server-side… a slice/`quote` mismatch renders as a visible error, never a silent fallback") |
| C-12 | Import/remap serialized per user, inside import transaction, IMPORT_REMAP cause on MatcherRun.trigger | **CARRIED** | §3.1 trigger 3 |
| C-13 | Schema annotation duty + migration filenames in §7 | **CARRIED** (as duty) | §7 migration-8 entry states the duty; existing schema.prisma already carries "via migration" comments for landed CHECKs (lines 226–227, 355–361, 179–185 banner). Filenames pend the migrations that don't exist yet — consistent with §7's assign-to-owning-migration frame |
| C-14 | Cosmos init pattern + NOTICE file | **CARRIED** | §7 migration-8 entry; §2 hard-invariant bullet already carried the pattern |
| Tripwire | Charter amendment armed (rule-landed-test-didn't → auto-adopt on next occurrence) | **CARRIED — and TRIGGERED by this same diff** | reconciliation-charter.md line 32 verbatim. See M-2/M-3: the class occurred in this diff, so per the amendment's own text the hard rule now auto-adopts (see Findings) |

**Counts: 23 CARRIED · 3 PARTIAL (A-3, A-5, C-8) · 0 MISSING.**

---

## (b) The three hand-traces

### Trace (i) — invalidate a SourceEvent through the retraction API

App code calls the writer's retraction API to set `SourceEvent.invalidatedAt` (any other write path is declared a bug by the schema banner, lines 179–186 — the choke-point premise is now true by construction, closing r3's Critical). Which text guarantees same-transaction recompute? Three mutually consistent carriers: (1) §3.1 trigger 2 — "recomputes the affected hypotheses **synchronously, inside the retraction transaction**… a crash can never land between retraction and recompute — the divergence window does not exist"; (2) the schema banner — "recomputes affected hypotheses synchronously in the same transaction"; (3) test 7(b)'s crash-shaped assertion — "retraction commit ⇒ recompute already committed, never pending." Inside the transaction, the live-join rule reads `sourceInvalidatedAt` from the current SourceEvent and the gate's invalidation-aware mass filter drops the rows; the honest-arithmetic sentence covers the result (the merged set is smaller; mass is a pure function of survivors). The hypothesis reverts per `nextState`. **Trace holds.** One residual (Minor m-3 below): every recompute-duty sentence names *hypotheses* only; an invalidated SourceEvent also changes the mass of the EXTRACTED node whose evidence it carried (gate spec §6 filters invalidated evidence *at compute time*, but nothing names the trigger that recomputes the extracted node's *stored* mass). This scope predates the diff, but the diff crowned the API "the single sanctioned mutation surface," making it the natural — and now only — home for that duty.

### Trace (ii) — LAW-8-erase a whole SourceEvent

The shape a real "delete my entry" takes. Cascade order per §3.1: "**SourceEvent erasure cascades to its Evidence rows first** (the `quote` column is a verbatim copy of the person's words — erasure that leaves the words in a different table isn't erasure), **then link invalidation fires**," then recompute; one transaction. Content retention audit: SourceEvent.content gone; Evidence rows (including `quote` copies) gone; link tombstones carry `invalidatedAt`, `invalidationCause=LAW8_ERASURE`, invalidating run id, `evidenceIdWas` — ids/causes/stamps only, never content; `MatcherRun.inputs` holds trigger + prior hypothesis *states*, no text; §2 renders fail-closed ("not rendered, never sliced; a ghost with zero surviving effective evidence reverts to the provenance copy"). **Choke-point-not-retention holds — no step retains content.** But the cascade ORDER is not fully unambiguous: this bullet says Evidence rows go first, *then* link invalidation — the reverse of the same bullet's per-Evidence order ("sets invalidatedAt… copies evidenceId → evidenceIdWas… THEN deletes the Evidence row"). Under §3.1's copy-during-retraction reading, deleting Evidence first SetNulls `link.evidenceId`, so the subsequent link-invalidation step copies NULL into `evidenceIdWas` — the audit id is silently lost; and test 7(b)'s whole-SourceEvent variant asserts cascade/invalidation/fail-closed but not `evidenceIdWas`, so the audit-losing implementation ships green. Under §7's copy-at-insert (which is also the punch-list A-3's own wording), every ordering is safe. The spec says both. **Trace holds for erasure semantics and LAW 8; the tombstone-audit guarantee is ambiguous → finding M-1.**

### Trace (iii) — practitioner confirms, then the relationship is severed

Practitioner confirms: `HypothesisConfirmation` written (who/when/direction), trigger 4 fires transactionally, matcher recomputes — gate `nextState` over the evidence set first, overlay applied after; state moves (e.g. HYPOTHESIS→ACTIVE), mass untouched; a confirmed-but-thin node looks confirmed-but-thin. Relationship severed: §3.1 constraint (2) — "severance of the practitioner relationship withdraws the overlay's effect (**the underlying evidence-derived state stands**)"; §7 repeats it ("severed relationships withdraw the overlay's effect"); withdrawal recomputes via trigger 4; test 7(c) pins it ("withdrawal reverts it; the evidence-derived state stands underneath"). So the node lands, unambiguously, in whatever `nextState` yields over its surviving evidence — HYPOTHESIS if thin, ACTIVE if evidence independently cleared the threshold. **Unambiguous; trace holds.** (Mechanism nit, sub-Minor: which system observes severance and writes `withdrawnAt` is left to the governance bundle — acceptable at spec level since the carrier and the recompute path are both named.)

---

## (c) Findings (diff-scoped only)

### Critical
None.

### Major

- **M-1 — `evidenceIdWas` copy timing is stated two contradictory ways, and one reading loses the audit on the whole-SourceEvent path.** §3.1 link lifecycle: the retraction transaction "copies `evidenceId → evidenceIdWas`… THEN deletes the Evidence row" (copy at retraction time). §7 migration 8 (and punch-list A-3 itself): "`evidenceIdWas` copied **at insert**." Both texts are new in this diff. Functionally divergent: under copy-at-retraction combined with the whole-SourceEvent cascade order (Evidence rows deleted first → SetNull → *then* link invalidation), the copy source is already NULL and the audit id is lost — and test 7(b)'s whole-SourceEvent variant does not assert `evidenceIdWas`, so the lossy implementation passes. One-sentence fix: pin copy-at-insert (§7's/punch-list's form) and have §3.1 say the retraction transaction *verifies* the insert-time copy; optionally add `evidenceIdWas` to the whole-SourceEvent assertion. Not Critical: no law/invariant breaks (less retention, never more; state remains explainable via cause + run id), and the §7 reading — the one matching the ruled punch-list — is safe under every ordering.

- **M-2 — A-5 PARTIAL: test 10 not restated; it now contradicts §2's veiled-ALWAYS rule.** The punch-list's A-5 fix explicitly included "test 10 restated in its v1-assertable form." §2 landed ("v1 has no release carrier… veiled ALWAYS (fail-closed)") but test 10 still reads "client-in-supervised stays veiled-**until-released**" — naming a mechanism the same diff declares absent in v1. Behaviorally benign (with no release carrier, "until-released" degenerates to "always"; the fail-closed assertion still holds), but it is a ruled edit that did not land and a spec-internal contradiction the diff created. One-phrase fix.

- **M-3 — C-8 PARTIAL: the render-side invalidation filter landed with no test carrier.** §2 now carries the WHERE clause ("both recompute and `effectiveEvidence` consume only… `invalidatedAt IS NULL`"), but C-8's second half — "test 6 gains the negative case (invalidated source omitted from brightness and panel)" — is absent from §5. Test 7(b) covers the *recompute* half (mass 0, state reversion) and the *erased*-source panel fail-closed; nothing tests that an *invalidated* (still-existing) source's words leave brightness and the panel. This is the round-2 Critical's class at the rendering layer — "un-confirming must un-tell" on the surface the person actually looks at — and it is exactly the tripwire class: a behavior rule integrated without its named test carrier in the same edit. One-clause fix to test 6.

### Minor

- **m-1 —** §3.1 trigger 4 says "(D-R7 below)" but the D-R7 overlay bullet sits *above* the trigger list. Cross-reference direction error.
- **m-2 —** §7's `MatcherRun.trigger` enumeration ("pass/run id | retraction | import/remap") was not extended with a confirmation cause, though new trigger 4 plus `HypothesisConfirmation.appliedByRunId` imply one — and trigger 3's IMPORT_REMAP cause *was* named. Enumeration gap in a carrier §7 exists to make complete.
- **m-3 —** The retraction API's recompute duty names hypotheses only (spec + banner); invalidation also changes the affected EXTRACTED node's stored mass (gate spec §6's invalidation-aware filter has no named trigger for stored values). Pre-existing scope, but the diff's "single sanctioned mutation surface" claim makes the API the only legitimate owner; one sentence (or an explicit deferral to the writer/gate spec) closes it.

### Charter consequence (reported, per the armed tripwire)

The "rule-landed-test-didn't" class occurred in this diff — cleanly once (M-3), arguably twice (M-2, where a carrier exists but its ruled restatement didn't land). Per the amendment's own text ("On its NEXT occurrence in any round… becomes a hard rule automatically, no further discussion"), the hard rule now auto-adopts: **"every grammar/behavior rule lands with its §-tests carrier in the same edit."** This is the amendment's prescribed consequence — prospective rule adoption, not a verdict-Critical on the diff that triggered it; both instances have one-line fixes and existing partial coverage (test 10 asserts the fail-closed behavior; test 7(b) covers the recompute half of the WHERE clause).

---

## (d) Verdict

**PASS — zero Criticals on the diff. Stamp v1.3-FINAL per the charter's post-escalation exit.**

Both escalated decisions are faithfully and consistently implemented: every D-R6 constraint (API, synchronous in-transaction recompute, banner amendment, choke-point-not-retention) and every D-R7 constraint (own carrier, reversible/contestable with severance semantics, state-only-never-mass — verified against every sentence that mentions confirmation and against gate §6.4's untouched signature) has its carrier. All three hand-traces hold. The gate-spec doc-syncs are accurate against code. Test numbering 1–15 is intact; §6/§7/banner/changelog are mutually consistent.

Recommended (non-blocking, cheap — bundle into the FINAL-stamp commit or the first migration-8 work item): fix M-1 (pin copy-at-insert; §3.1 one sentence), M-2 (test 10: "stays veiled ALWAYS in v1 — no release carrier"), M-3 (test 6: negative case for invalidated sources), and the three Minors. Record the tripwire's hard rule as adopted in the charter.

*— End of targeted diff verification. Lane: fresh-context adversarial (Claude).*
