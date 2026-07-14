# Punch-list — renderer-lens-spec v1.2 · Round 3 (CAP ROUND) · REVIEW-01 loop

*Claude lane: Request Revisions, do-not-stamp — 1C/4M/6m/2E; round-2 closure
verification 21 HOLDS / 1 PARTIAL / 0 MISSING; the trigger-point claim
verified FALSE against writer.ts in code. ChatGPT lane: Request Revisions —
4C/6M/5m/4E, of which the genuinely-new residue after verification is the
link-FK tombstone mechanics (≡ Claude M-2) and the veil release carrier
(≡ Claude M-4); its "migrations don't exist" Critical repeats the round-2
R-3 build-order misread, and its queue/package prescriptions are resolved or
rejected below.*

**ESCALATION (charter cap rule): three rounds are complete and ONE genuine
Critical survives. The loop must NOT stamp FINAL — this goes to Jacob.**

---

## THE SURVIVING CRITICAL → ESCALATED AS D-R6

### A-1 ⚠ (Claude C-1; ChatGPT #5 is its queue-shaped shadow) — Trigger 2 names a trigger point that never sees the triggering mutations, and "schedules" is not durable
v1.2's closure of round 2's Critical faithfully implemented MY punch-list
instruction — and the instruction's premise was false. "The writer is the
trigger point (it already sees these mutations)" is wrong in code: the
writer's surface is GateResult→derived-tables only; nothing in /src writes
`SourceEvent.invalidatedAt`; the correction path is ingest-layer work that
has no reason to traverse the writer; LAW-8 erasure is an explicitly
separate audited path. So all four retraction classes flow AROUND the named
choke-point, and any app code calling
`prisma.sourceEvent.update({invalidatedAt})` retracts words with no
recompute ever firing — round 2's Critical (the sky keeps saying the chart
was right) reintroduced through a misassigned hook. And "schedules a
recompute" has no durability carrier: a crash between retraction and
recompute leaves the divergence forever (the 1 a.m. retractor who never
journals again is never healed).
**Proposed fix (cheap — one section, one banner sentence, one test shape):**
(i) a **writer-owned retraction API** becomes the single sanctioned mutation
surface for `SourceEvent.invalidatedAt`/`supersededById`, Evidence erasure,
and the future LAW-8 path — added to the schema banner: "the writer also
owns the retraction surface; a retraction performed anywhere else is a bug";
(ii) the recompute is **synchronous inside the retraction transaction**
(graphs are dozens-to-low-hundreds of nodes; there is nothing to queue —
this also disposes of ChatGPT #5's outbox/dedupe machinery, which is only
needed if we choose async; if async is ever needed, a transactional outbox
row gets named in §7 first); (iii) the retraction surface is assigned to the
matcher build stage (§6/migration 8 scope); (iv) test 7(b) gains the
crash-shaped assertion: retraction commit ⇒ recompute already committed,
same transaction, never pending.
**➤ DECISION D-R6 (Jacob):** approve the writer-owned retraction API +
synchronous in-transaction recompute + banner amendment? (My
recommendation: yes — it makes trigger 2's premise true by construction,
and it extends the writer's choke-point role honestly rather than bolting a
queue onto whichever module hosts the correction endpoint.)

## ACCEPT-NOW (integrate with D-R6)

### A-2 (Claude M-1) — Practitioner confirmation has no trigger and no arithmetic path
A `HypothesisConfirmation` write touches neither SourceEvent nor Evidence,
so no trigger fires; and the gate's `nextState(prev, evidenceSet, now)` has
no confirmation input while §3.1 bans reimplementation — contradiction-by-
confirmation is unreachable through the mandated functions. Fix: trigger 4
(confirmation write/withdrawal → recompute, transactional per D-R6);
severance semantics pinned; and the arithmetic seam resolved per **D-R7**.
**➤ DECISION D-R7 (Jacob — state-semantics fork):** practitioner
confirmation enters as (a — recommended) a **matcher-layer overlay applied
after `nextState`** — confirmation is practitioner authority, not evidence;
keeping it out of the gate's function preserves the gate's purity as a
function of the evidence set, and the overlay is documented as a distinct
input class, not a reimplementation; or (b) an explicit confirmations
parameter on the gate's `nextState` (gate spec v1.8 bump). Failing-first
test either way (evidence-semantics rule).

### A-3 (Claude M-2 ≡ ChatGPT C-1) — The erasure keystone's DB mechanics
Migration 8 pins: `HypothesisEvidenceLink.evidenceId` nullable with
`onDelete: SetNull` + an `evidenceIdWas` copy at insert (ChatGPT's tombstone
— the audit survives the FK) + `invalidationCause`
(SOURCE_INVALIDATED | LAW8_ERASURE | MANUAL) + invalidating-run id; the
uniqueness rule becomes a partial unique over non-null evidenceIds; the
D-R6 retraction transaction is the writer of link `invalidatedAt` (ordering:
invalidate links → then delete Evidence → recompute, one transaction). Plus
the one-sentence honest-arithmetic statement: **absence needs no positive
carrier — the merged set is simply smaller, and mass is a pure function of
the surviving records.** Test 7(b) asserts no orphans + `evidenceIdWas`
preserved.

### A-4 (Claude M-3) — SourceEvent erasure: cascade, rendering, and the quote-copy leak
SourceEvent erasure MUST cascade to its Evidence rows (the `quote` column is
a verbatim copy of the erased words — leaving it is a LAW-8 leak, and
`effectiveEvidence.quote` would put erased words back on screen) before link
invalidation fires; the evidence panel is fail-closed for any row whose
source is gone (row not rendered; a ghost with zero surviving effective
evidence reverts to the provenance copy); test 7(b) gains the
whole-SourceEvent variant — the shape a real "delete my entry" takes.

### A-5 (Claude M-4 ≡ ChatGPT C-3) — "Veiled-until-released" has no release carrier
v1 resolution (fail-closed, honest): **client-in-supervised is veiled
ALWAYS in v1** — there is no release carrier, and the spec says so instead
of implying one; the per-node release carrier (ChatGPT's
`NodeVisibilityRelease` shape — nodeId, practitionerId, clientId,
releasedAt, scope — recorded verbatim as the design sketch) is §7.1 bundle
work with its projection seam explicitly reserved (release state feeds
`viewer.releasedNodeIds`); test 10 restated in its v1-assertable form.
Building the carrier now (ChatGPT's version) is declined as cut-line scope —
the reveal flow is D9 bundle work.

## CHEAP (approve as a block)

- **C-1** (Claude m-1, the round-2 A-2 PARTIAL): post-match view-model test —
  `LensMatchLinkView[]` emitted, charged ghost's brightness delta asserted
  (the demo's money shot gets its test).
- **C-2** (Claude m-2): pending-confirmation panel state test (SUPERVISED,
  second COUNTERVAILING, no carrier → pending, never CONTRADICTED, never
  silence).
- **C-3** (Claude m-3): `effectiveEvidence` sort pinned (occurredAt,
  evidenceId); the no-double-count sentence (LENS nodes have no own
  evidence in v1 — kept true on purpose).
- **C-4** (Claude m-4): the word "archival" leaves trigger 2's list;
  one sentence states that archiving an extracted NODE does not un-charge
  (its evidence rows remain valid; mass counts evidence, not nodes).
- **C-5** (Claude m-5 ≡ ChatGPT #14): D-R1 enforcement (b)/(c) named as
  executable CI jobs (co-modification check; denylist lint over lens-map
  keys), not review process.
- **C-6** (Claude m-6): gate-spec doc-sync — `confidence.hypothesisFloor`
  named as the config key §6.3's prose implies.
- **C-7** (Claude E-1): gate spec flags the LENS zero-evidence arm as
  unreachable-by-construction (so nobody "fixes" it by widening the
  wrapper).
- **C-8** (Claude E-2 ≡ ChatGPT C-4's filter half): the WHERE clause written
  down — recompute and `effectiveEvidence` consume only links with
  `invalidatedAt IS NULL` and sources with `invalidatedAt IS NULL`; test 6
  gains the negative case (invalidated source omitted from brightness and
  panel).
- **C-9** (ChatGPT #6): the charged predicate as an enforceable query —
  `EXISTS(active link)` — with its index and the budget-pressure test
  (CONTRADICTED mass-0 ghost with an active link survives the cap).
- **C-10** (ChatGPT #7's useful half): §3.1 names the concrete import path
  (`/src/engine/citation-gate/mass|confidence|state` exports) — the
  package restructure stays rejected (R-2, endorsed).
- **C-11** (ChatGPT #8): the evidence panel's data path named — server-side
  slice of `SourceEvent.content` by persisted spans (canonical snippet
  endpoint); a slice/quote mismatch renders as a visible error, never a
  silent fallback.
- **C-12** (ChatGPT #9): import/remap full-graph runs serialize per user and
  coalesce within the import transaction (synchronous per D-R6, so no
  debounce machinery); `MatcherRun.trigger` carries the IMPORT_REMAP cause
  with chartImportId/lensMapVersion.
- **C-13** (ChatGPT #13): schema.prisma annotations — "constraint enforced
  via migration N" comments + migration filenames in §7.
- **C-14** (ChatGPT #15): the cosmos init pattern documented (create →
  await ready → apply data); SPDX in a NOTICE file.

## DEFERRED

- *(nothing new — A-5's release carrier joins the existing D9 §7.1 entry
  with its design sketch; ChatGPT #16–#19 elaborate already-deferred items.)*

## REJECTED (with reason)

- **R-1** (ChatGPT C-2 — "migration 7/8 columns don't exist in schema now"):
  REJECTED, same reason as round-2 R-3 (endorsed): §7 exists to assign
  carriers to owning migrations; the modules they serve are not yet built
  (§6 build order). Its schema-annotation sub-point is accepted as C-13.
- **R-2** (ChatGPT C-4 remainder — SQL-view/resolver prescription for
  effectiveEvidence assembly): build-level implementation detail; the type
  shapes and the invalidation filter (accepted, C-8) are the spec's job;
  how the join is written is the builder's.
- **R-3** (ChatGPT #5 — RecomputeQueue/outbox/dedupe machinery): superseded
  by D-R6's synchronous-in-transaction choice; the outbox alternative is
  named in the D-R6 text as the escape hatch IF async is ever needed.
- **R-4** (ChatGPT #7 restructure half — `@psychenet/arithmetic` package):
  round-2 R-2, endorsed, no new argument; the import path is now concrete
  (C-10) which answers the "no published surface" concern.
- **R-5** (ChatGPT #10 — context-builder protections): STALE-ALREADY-FIXED
  in substance — `buildBlindedContext` is an allowlist over a type that
  cannot represent hypothesis nodes, and the byte-identity keystone exists
  and is mutation-verified (proposer round 1); no new carrier needed.

## STALE-ALREADY-FIXED

- ChatGPT #12 (onDelete SetNull for chartImportId): already in §7 migration
  7 — verified by the Claude lane's closure table (A-7 HOLDS).

---

## Checkpoint questions for Jacob (escalation, per the cap rule)

1. **D-R6 — the surviving Critical:** approve the writer-owned retraction
   API + synchronous in-transaction recompute + banner amendment? (This is
   the second consecutive round where the same seam — who observes
   retraction — produced the Critical; naming the choke-point closes the
   class, not just the instance.)
2. **D-R7 — the confirmation-semantics fork:** matcher-layer overlay after
   `nextState` (recommended — confirmation is practitioner authority, not
   evidence; the gate's function stays pure over the evidence set) or a
   confirmations parameter on the gate's `nextState` (gate v1.8)?
3. **Exit path after integrating D-R6 + A-2…A-5 + the CHEAP block:**
   targeted single-lane diff verification of the integration diff
   (recommended — the charter's post-escalation standard; three full rounds
   are done and the diff is small and test-pinned), or a full round 4?
4. **CHEAP block C-1…C-14** — approve?
5. **Rejections R-1…R-5** — endorse? (R-1 and R-4 rest on your round-2
   endorsements; R-3 is a consequence of D-R6's synchronous choice.)
6. **Charter-watch from your round-2 note:** "rule-landed-test-didn't"
   recurred exactly once this round (the A-2 PARTIAL → C-1 here). One
   recurrence in a round that added ~10 new grammar rules is below the
   amendment threshold in my read — but the amendment text is drafted and
   ready if you disagree: *"every grammar/behavior rule lands with its §5
   test carrier in the same edit."*
