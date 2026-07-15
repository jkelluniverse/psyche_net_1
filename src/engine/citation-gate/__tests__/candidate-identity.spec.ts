// CANDIDATE IDENTITY v2 — failing-first tests for the D + scoped-A ruling
// (Jacob + reviewer, 2026-07-15). Gate v1.8.
//
// The flaw these exist to kill: candidateKey = TYPE::normalizedLabel made
// cross-pass recurrence require byte-identical labels, so a solo journaler
// could never materialize a node across sessions (reproduced live: two
// same-theme passes, zero accumulation, three stranded keys).
//
// The ruled identity, scoped to the SHADOW JOIN exclusively (in-pass dedupe
// and outcome inheritance untouched):
//   1. exact label-key hit → join (unchanged);
//   2. same type + same SPECIFIC known-vocabulary ontologyKey → join
//      (novel keys and `.core` fallbacks never join on key alone);
//   3. `.core` key match → join ONLY with the label-similarity tiebreak
//      (token Jaccard ≥ config) AND the evidence-disjointness guard
//      (incoming evidence from source events disjoint from the cache);
//   4. label on join is DETERMINISTIC: most evidence spans wins; tie →
//      earliest (the already-held candidate).
// Everything below drives the gate as a pure function across two passes —
// pass 2 consumes pass 1's returned shadowBuffer, exactly like production.

import { describe, expect, it } from "vitest";
import { gate } from "../gate";
import { GATE_CONFIG_V1 } from "../config";
import {
  EMPTY_GRAPH,
  NOW,
  daysAgo,
  ev,
  node,
  proposals,
  sourceMap,
  src,
} from "./fixtures";

const SPECIFIC_KEY = "pattern.deep-feeling-needs-safety"; // in the v2 vocabulary
const NOVEL_KEY = "pattern.some-theme-the-vocabulary-lacks";

const SRC_A = src("src-a", "Entry one. I only really open up when I feel safe first.", {
  occurredAt: daysAgo(2),
});
const SRC_B = src("src-b", "Entry two. I volunteered for extra tasks just to feel needed and safe.", {
  occurredAt: daysAgo(1),
});
const QUOTE_A = "I only really open up when I feel safe first";
const QUOTE_B = "I volunteered for extra tasks just to feel needed and safe";

const config = GATE_CONFIG_V1;

function passOne(opts: { key?: string; label?: string } = {}) {
  return gate(
    proposals([
      node("p1-n1", opts.label ?? "Deriving worth from being needed", [ev("src-a", QUOTE_A)], {
        type: "PATTERN",
        ontologyKey: opts.key ?? SPECIFIC_KEY,
      }),
    ]),
    sourceMap(SRC_A),
    EMPTY_GRAPH,
    [],
    NOW,
    config,
  );
}

describe("candidate identity v2 — the shadow join (gate v1.8)", () => {
  it("config carries the ruled identity: gateVersion v1.8 + versioned join constants", () => {
    expect(config.gateVersion).toBe("v1.8");
    expect(config.candidateIdentity.identityVersion).toBe("v2");
    expect(config.candidateIdentity.coreJoinLabelJaccardMin).toBeGreaterThan(0);
  });

  it("RECURRENCE KEYSTONE: same theme, different words, same specific key, across passes → MATERIALIZES", () => {
    const r1 = passOne();
    expect(r1.acceptedNodes).toHaveLength(0); // one source — held, correctly
    expect(r1.shadowBuffer).toHaveLength(1);

    const r2 = gate(
      proposals([
        node("p2-n1", "Volunteers for extra tasks to feel needed", [ev("src-b", QUOTE_B)], {
          type: "PATTERN",
          ontologyKey: SPECIFIC_KEY, // same specific vocabulary key, fresh wording
        }),
      ]),
      sourceMap(SRC_A, SRC_B),
      EMPTY_GRAPH,
      r1.shadowBuffer,
      NOW,
      config,
    );
    expect(r2.acceptedNodes).toHaveLength(1); // 2 spans, 2 distinct sources — through the threshold
    const n = r2.acceptedNodes[0];
    expect(n.evidence).toHaveLength(2); // the pass-1 cache promoted with it
    // Rule 3: 1 cached span vs 1 incoming span → tie → EARLIEST label wins.
    expect(n.label).toBe("Deriving worth from being needed");
    // The joined key is consumed — no stranded sibling entry survives.
    expect(r2.shadowBuffer.filter((s) => s.kind === "node")).toHaveLength(0);
  });

  it("sub-threshold specific-key join still ACCUMULATES (timesSeen 2) instead of minting a sibling", () => {
    const r1 = passOne();
    const r2 = gate(
      proposals([
        node("p2-n1", "Completely different wording of the same theme", [ev("src-a", QUOTE_A)], {
          type: "PATTERN",
          ontologyKey: SPECIFIC_KEY,
        }),
      ]),
      sourceMap(SRC_A), // SAME source — still only 1 distinct source
      EMPTY_GRAPH,
      r1.shadowBuffer,
      NOW,
      config,
    );
    expect(r2.acceptedNodes).toHaveLength(0);
    const held = r2.shadowBuffer.filter((s) => s.kind === "node");
    expect(held).toHaveLength(1); // joined, not duplicated
    expect(held[0].timesSeen).toBe(2);
    expect(held[0].distinctSources).toBe(1); // honest: same entry re-heard
  });

  it("FALSE-JOIN NEGATIVE: two different beliefs at belief.core with disjoint labels NEVER join", () => {
    const r1 = passOne({ key: "belief.core", label: "If someone needs me, I matter" });
    const r2 = gate(
      proposals([
        node("p2-n1", "The world punishes rest", [ev("src-b", QUOTE_B)], {
          type: "PATTERN",
          ontologyKey: "belief.core",
        }),
      ]),
      sourceMap(SRC_A, SRC_B),
      EMPTY_GRAPH,
      r1.shadowBuffer,
      NOW,
      config,
    );
    expect(r2.acceptedNodes).toHaveLength(0); // NOTHING materialized from a false join
    const held = r2.shadowBuffer.filter((s) => s.kind === "node");
    expect(held).toHaveLength(2); // two genuinely different candidates, kept apart
    expect(new Set(held.map((s) => s.timesSeen))).toEqual(new Set([1]));
  });

  it(".core join REQUIRES label similarity: near-identical labels + disjoint evidence → joins and materializes", () => {
    const r1 = passOne({ key: "pattern.core", label: "restless when not needed" });
    const r2 = gate(
      proposals([
        node("p2-n1", "feels restless when not needed", [ev("src-b", QUOTE_B)], {
          type: "PATTERN",
          ontologyKey: "pattern.core",
        }),
      ]),
      sourceMap(SRC_A, SRC_B),
      EMPTY_GRAPH,
      r1.shadowBuffer,
      NOW,
      config,
    );
    expect(r2.acceptedNodes).toHaveLength(1);
    expect(r2.acceptedNodes[0].label).toBe("restless when not needed"); // tie → earliest
  });

  it(".core join BLOCKED by the evidence-disjointness guard: same source event → no join", () => {
    const r1 = passOne({ key: "pattern.core", label: "restless when not needed" });
    const r2 = gate(
      proposals([
        node("p2-n1", "feels restless when not needed", [ev("src-a", QUOTE_A)], {
          type: "PATTERN",
          ontologyKey: "pattern.core", // similar label BUT same source — re-reading, not recurrence
        }),
      ]),
      sourceMap(SRC_A),
      EMPTY_GRAPH,
      r1.shadowBuffer,
      NOW,
      config,
    );
    expect(r2.acceptedNodes).toHaveLength(0);
    expect(r2.shadowBuffer.filter((s) => s.kind === "node")).toHaveLength(2); // kept apart
  });

  it("NOVEL keys never join on key alone (the vocabulary is the warrant)", () => {
    const r1 = passOne({ key: NOVEL_KEY, label: "one wording" });
    const r2 = gate(
      proposals([
        node("p2-n1", "an entirely different wording", [ev("src-b", QUOTE_B)], {
          type: "PATTERN",
          ontologyKey: NOVEL_KEY,
        }),
      ]),
      sourceMap(SRC_A, SRC_B),
      EMPTY_GRAPH,
      r1.shadowBuffer,
      NOW,
      config,
    );
    expect(r2.acceptedNodes).toHaveLength(0);
    expect(r2.shadowBuffer.filter((s) => s.kind === "node")).toHaveLength(2);
  });

  it("type must match too: same specific key on a different domain type never joins", () => {
    const r1 = passOne(); // PATTERN + SPECIFIC_KEY
    const r2 = gate(
      proposals([
        node("p2-n1", "different words again", [ev("src-b", QUOTE_B)], {
          type: "BELIEF", // different type
          ontologyKey: SPECIFIC_KEY,
        }),
      ]),
      sourceMap(SRC_A, SRC_B),
      EMPTY_GRAPH,
      r1.shadowBuffer,
      NOW,
      config,
    );
    expect(r2.acceptedNodes).toHaveLength(0);
    expect(r2.shadowBuffer.filter((s) => s.kind === "node")).toHaveLength(2);
  });

  it("RULE 3: most evidence spans wins the label — the richer candidate names the node", () => {
    // Pass 1 holds TWO spans (one source, two DISTINCT quoted sentences).
    const QUOTE_A2 = "it has been true for as long as I can remember";
    const content = `Entry one. ${QUOTE_A}. Honestly, ${QUOTE_A2}.`;
    const srcRich = src("src-a", content, { occurredAt: daysAgo(2) });
    const r1 = gate(
      proposals([
        node(
          "p1-n1",
          "Deriving worth from being needed",
          [ev("src-a", QUOTE_A), ev("src-a", QUOTE_A2)],
          { type: "PATTERN", ontologyKey: SPECIFIC_KEY },
        ),
      ]),
      sourceMap(srcRich),
      EMPTY_GRAPH,
      [],
      NOW,
      config,
    );
    const held = r1.shadowBuffer.filter((s) => s.kind === "node");
    expect(held[0].evidenceCache.length).toBe(2);

    const r2 = gate(
      proposals([
        node("p2-n1", "Volunteers to feel needed", [ev("src-b", QUOTE_B)], {
          type: "PATTERN",
          ontologyKey: SPECIFIC_KEY,
        }),
      ]),
      sourceMap(srcRich, SRC_B),
      EMPTY_GRAPH,
      r1.shadowBuffer,
      NOW,
      config,
    );
    expect(r2.acceptedNodes).toHaveLength(1);
    // 2 cached spans beat 1 incoming span → the held candidate's label.
    expect(r2.acceptedNodes[0].label).toBe("Deriving worth from being needed");
  });

  it("SCOPE GUARD: in-pass dedupe still groups by exact label key only (untouched)", () => {
    // Two same-pass candidates, same specific key, DIFFERENT labels: they do
    // NOT merge in-pass (the ruling scopes the new identity to the shadow
    // join) — each verifies separately, then the second joins the first's
    // fresh shadow entry ONLY on the next pass, never within this one.
    const r = gate(
      proposals([
        node("n1", "one wording", [ev("src-a", QUOTE_A)], {
          type: "PATTERN",
          ontologyKey: SPECIFIC_KEY,
        }),
        node("n2", "another wording", [ev("src-b", QUOTE_B)], {
          type: "PATTERN",
          ontologyKey: SPECIFIC_KEY,
        }),
      ]),
      sourceMap(SRC_A, SRC_B),
      EMPTY_GRAPH,
      [],
      NOW,
      config,
    );
    expect(r.acceptedNodes).toHaveLength(0);
    expect(r.shadowBuffer.filter((s) => s.kind === "node")).toHaveLength(2);
  });

  it("deterministic multi-candidate resolution: joins the richest (then key-ascending) holder", () => {
    // Two standing same-key holders (minted pre-v1.8 or same-pass, above):
    // the join must pick deterministically — most cached spans, tie → key asc.
    const r1 = gate(
      proposals([
        node("n1", "alpha wording", [ev("src-a", QUOTE_A)], {
          type: "PATTERN",
          ontologyKey: SPECIFIC_KEY,
        }),
        node("n2", "beta wording", [ev("src-b", QUOTE_B)], {
          type: "PATTERN",
          ontologyKey: SPECIFIC_KEY,
        }),
      ]),
      sourceMap(SRC_A, SRC_B),
      EMPTY_GRAPH,
      [],
      NOW,
      config,
    );
    const srcC = src("src-c", `Entry three. ${QUOTE_A}.`, { occurredAt: NOW });
    const r2 = gate(
      proposals([
        node("n3", "gamma wording", [ev("src-c", QUOTE_A)], {
          type: "PATTERN",
          ontologyKey: SPECIFIC_KEY,
        }),
      ]),
      sourceMap(SRC_A, SRC_B, srcC),
      EMPTY_GRAPH,
      r1.shadowBuffer,
      NOW,
      config,
    );
    // Tie on cached spans (1 vs 1) → key ascending → "alpha wording" holder.
    // Joined: 2 spans across 2 distinct sources → materializes; earliest-tie
    // label between equal-span candidates is the HELD one.
    expect(r2.acceptedNodes).toHaveLength(1);
    expect(r2.acceptedNodes[0].label).toBe("alpha wording");
    // The other same-key holder remains, untouched.
    expect(r2.shadowBuffer.filter((s) => s.kind === "node")).toHaveLength(1);
  });
});
