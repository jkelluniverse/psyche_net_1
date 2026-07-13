# CLAUDE.md — Psyche-Net

This file governs every coding session in this repository. Read it before writing code. It is authoritative; if a request conflicts with it, surface the conflict rather than silently violating it.

## What this project is
Psyche-Net is a living, evidence-bound map of a person's inner psychological architecture — a longitudinal temporal knowledge graph rendered as a navigable "night sky." Every node traces to the person's own words. Change is shown as physics (mass, gravity, light). It serves practitioners (client-discovery + outcome instrument) and individuals (guided self-development). Full spec: `/docs/psyche-net-master-concept.md`.

## The build philosophy (META-01)
- Optimize for **changeability, not a finished v1.** Small, composable, well-named modules. Assume every part will be revised.
- Keep the ontology and pipeline **loose and revisable.** Prefer configuration and data-driven behavior over hard-coded assumptions.
- The **citation gate** and the **graph model** are the load-bearing walls. Everything else is remodelable. Do not compromise these two for speed.
- Represent uncertainty honestly in code as in product: nullable confidence is a bug; unknown should be explicit, never faked.

## The nine non-negotiable laws (no feature may violate these)
1. **Evidence mandate** — every node that *carries mass* cites the person's own words via ≥1 validated evidence pointer to a real source event. Hypothesis nodes (lens/becoming/practitioner) may exist at mass 0 with zero evidence until lived words charge them (see LAW 3). Nothing carries mass without validated self-authored evidence.
2. **The citation gate** — the LLM *proposes* with quoted evidence; deterministic code *validates* every quote against the source and rejects the unverifiable; **arithmetic, not the model, computes mass.** Never let a model's claim become graph state without passing the gate. **Honest scope of this guarantee:** the gate proves a quote *exists* in the person's own words; it does NOT prove the model *interpreted* that quote correctly (polarity, node type, edge type are model-assigned meanings the gate cannot verify). No fabricated words enter; interpretation of real words is the model's and is guarded only by confidence penalties, recurrence thresholds, and human curation — never treat "quote verified" as "claim verified."
3. **Provenance-agnostic hypothesis nodes** — nodes enter from four provenances (extracted / lens / becoming / practitioner). Only lived words confer mass. Hypothesis nodes start at mass 0 and are charged only by validated evidence.
4. **Words create; signals corroborate** — only the person's language creates or charges nodes. Voice tone, wearable/body data, behavior may annotate/time, never create or charge.
5. **Uncertainty is first-class** — every rendered element carries visible confidence; the UI always shows the edge of the unexplored. Never ship a confident oracle.
6. **Mastery mechanics, not casino mechanics** — no streaks that punish absence, no variable-ratio rewards, no scoring of disclosure depth, no leaderboards, no social comparison of maps, no daily-active-use as a north-star metric. Rewards come only from validated realization events.
7. **Safety & claims discipline** — crisis classification runs on every inbound entry (on-device where feasible) and routes to human support; wound layer gated (strengths-forward by default); minors excluded; the product never claims to diagnose or treat. Copy is a self-knowledge/reflection instrument, never a medical one.
8. **Privacy wall** — cross-user learning only through a k-floored abstraction layer that structurally cannot hold identifiers or free text. Deletion is a first-class feature (including derived nodes and abstraction contributions). This is the most sensitive data a person can generate.
9. **Entity & IP separation** — this is its own venture and codebase. Never import data, credentials, or infrastructure from any other project. Modality-agnostic core (works *with* belief-change practices; depends on none).

## Dependency rules
- Rendering engine: **`@cosmos.gl/graph`** (MIT) ONLY. **NEVER add `@cosmograph/cosmograph`** — it is CC-BY-NC-4.0 (non-commercial) and would poison commercial use. If you need higher-level features, build them on the MIT core.
- Before adding any dependency, check its license. Prefer MIT / Apache-2.0 / BSD. Flag anything copyleft or non-commercial before installing.
- Temporal-graph substrate: evaluate **Graphiti** (open source) as the base; if deferred, use Postgres + Prisma (graphs are small per person). IP lives in our layers regardless.

## Architecture invariants
- **Event-sourced core.** All inputs are immutable, timestamped events. Graph state is derived from events and must be reproducible by replaying them (this powers the time-scrub and the state machine). Never mutate history; append and invalidate.
- **The proposer is replaceable; the validator is not.** The LLM extraction proposer is swappable and untrusted. The citation validator is deterministic, tested, and the trust boundary. All model output flows through it.
- **The proposer is BLINDED to hypotheses.** When generating extracted (native) candidates, the proposer receives ONLY the person's SELF-authored source text plus existing *extracted* graph state. It never sees lens / becoming / practitioner hypothesis nodes. Reason: if the extractor can see a chart hypothesis, its "confirmation" of that hypothesis becomes self-fulfilling — which silently destroys the product's most differentiated claim (that it can show a person their chart being *wrong*). Lens confirmation must come from independently-extracted evidence, never from an extractor that was shown the lens. This is a hard invariant, not an optimization.
- **Mass, light, and state transitions are pure functions** of the validated evidence set. Given the same events, they produce the same graph. No randomness, no model calls, in these functions.
- **Confidence is required, not optional**, on every node, edge, and rendered element.
- **No magic numbers; every derived field is explainable.** Every threshold, weight, and half-life lives in named, versioned configuration (ontology config where construct-specific), never as an inline literal. Every derived value (mass, confidence, state) must be able to report *why* it has the value it does — which evidence, which rule version, which inputs. If a value can't be explained, it's a bug.
- **Version every algorithm and rule set.** Persist `massAlgorithmVersion`, `confidenceAlgorithmVersion`, `stateAlgorithmVersion`, `normalizationVersion`, `ontologyVersion`, and `gateVersion` with derived artifacts so any result is replayable and auditable after the rules are tuned. Tuning is expected (META-01); un-versioned tuning is not allowed.

## Testing expectations
- The citation gate ships with unit tests first, before any UI. Its rejection behavior (unverifiable quote → rejected) is the single most important test in the codebase.
- Pure functions (mass, state machine) get property tests: same events → same output; adding countervailing evidence never increases mass; etc.
- Maintain a small ground-truth eval corpus (synthetic journals with known expected nodes) and a script that scores extraction fidelity against it. Re-run before promoting any model change.

## When in doubt
Ask, or choose the option that (a) preserves the nine laws, (b) keeps the code more changeable, and (c) represents uncertainty more honestly. In that order.
