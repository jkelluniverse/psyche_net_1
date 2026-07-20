# Orchestrator notes to reviewers — intake-spec (from Jacob, product owner)

*Identical text goes to both review lanes. These are binding scope rulings for this spec's rounds, not suggestions.*

1. **The per-answer immediate reflect (§2) is a deliberate, argued exception to the batching rule** (proposer spec §12: batched/async, never per-keystroke). The argument on record: the batching rule exists for cost and calm; intake's whole pedagogy is immediacy — "each answer renders its consequence before the next question is asked" (master concept §5.1); and the pass count is structurally capped by the seven prompts themselves. **Challenge the argument if it is weak** — cost math, calm, failure modes of seven rapid live passes are all fair game — **but do not flag the exception's existence as an oversight.** It is intentional and already ruled.

2. **Prompt copy is versioned configuration pending Jacob's editorial pass** (`intakePromptsVersion` — the seven spark prompts, between-screens copy, seed-ceremony copy). Wording-level findings go to CHEAP at most, never Critical. Structural findings about the copy *system* (versioning, honesty of zero-change copy, claims discipline) remain fully in scope at any tier.
