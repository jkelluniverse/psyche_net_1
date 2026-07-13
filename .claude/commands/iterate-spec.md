Run the automated REVIEW-01 spec-iteration loop on the spec file given as $ARGUMENTS.

You are the orchestrator. Follow /docs/review/reconciliation-charter.md exactly — it is the judgment layer and it binds you. Loop:

1. **Version check.** Read the spec; confirm it has a version header + changelog block. If not, add one (v1.0).
2. **Claude review (fresh context).** Launch a subagent (Task tool) whose ENTIRE context is: /docs/review/spec-reviewer-prompt.md + the current spec file + the files its header lists as cross-references (typically CLAUDE.md, the citation gate spec, schema.prisma, and the canonical contract module). The subagent writes its review to /docs/review/rounds/<spec>-r<N>-claude.md. It must state the exact version reviewed.
3. **ChatGPT review (cross-model).** Run `node scripts/chatgpt-review.mjs <spec-path> <round>` — it calls the OpenAI API with the same reviewer prompt and writes /docs/review/rounds/<spec>-r<N>-chatgpt.md. If OPENAI_API_KEY is missing, STOP and tell Jacob; do not skip the cross-model lane silently.
4. **Reconcile.** Read both reviews. Classify EVERY finding per the charter into ACCEPTED / CHEAP / DEFERRED / REJECTED(reason) / STALE-ALREADY-FIXED. Write the punch-list to /docs/review/rounds/<spec>-r<N>-punchlist.md.
5. **Checkpoint.** While the checkpoint is enabled (it is, until Jacob disables it): STOP and show Jacob the punch-list. Wait for approval or edits. ALWAYS stop regardless for: any REJECTED Critical, or any product-ethics fork.
6. **Integrate.** Apply accepted edits; if a shared type changed, update /src/engine/contracts/extraction-contracts.ts AND both module specs in the same commit. Bump the version; write the changelog entry (own bugs in active voice). Append DEFERRED items verbatim to the pre-pilot governance bundle (/docs/psyche-net-master-concept.md §7.1). Commit: "spec: <name> vX.Y — round N review integration".
7. **Loop or exit** per the charter's exit criteria. On FINAL: commit, then ask Jacob whether to proceed straight to build (tests first, per the spec's own test list).

Never edit the nine laws, CLAUDE.md invariants, or the charter itself as part of integration — conflicts with those get escalated, not resolved.
