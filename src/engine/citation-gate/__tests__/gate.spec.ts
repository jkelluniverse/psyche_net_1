// The citation-gate suite — spec §9, tests written BEFORE the implementation.
// Test 1 (the keystone) is the single most important test in the codebase:
// if it fails, the product is broken at its core.

import { describe, expect, it } from "vitest";
import { gate } from "../gate";
import { GATE_CONFIG_V1, type GateConfig } from "../config";
import { normalizeQuote } from "../normalize";
import {
  EMPTY_GRAPH,
  NOW,
  daysAgo,
  ev,
  evidenceRecord,
  existingNode,
  mulberry32,
  node,
  proposals,
  sourceMap,
  src,
} from "./fixtures";

const JOURNAL_1 = "I keep saying yes when I want to say no. Every single time.";
const JOURNAL_2 =
  "Again today: I said yes to covering her shift even though I wanted to say no.";

describe("test 1 — the keystone rejection test", () => {
  it("rejects a node whose quote is NOT in the source, creating no evidence and no node", () => {
    const sources = sourceMap(src("e1", JOURNAL_1));
    const result = gate(
      proposals([
        node("n1", "I am not allowed to disappoint people", [
          ev("e1", "I am not allowed to disappoint people"),
        ]),
      ]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );

    expect(result.acceptedNodes).toHaveLength(0);
    expect(result.acceptedEdges).toHaveLength(0);
    expect(result.shadowBuffer).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toMatchObject({
      tempId: "n1",
      kind: "node",
      reason: "QUOTE_NOT_FOUND",
    });
    // The hallucinated quote is surfaced in the rejection detail (logged, §8).
    expect(result.rejected[0].detail).toContain("I am not allowed to disappoint people");
  });

  it("a mixed proposal drops only the fabricated evidence — never lets it attach", () => {
    const sources = sourceMap(src("e1", JOURNAL_1), src("e2", JOURNAL_2));
    const result = gate(
      proposals([
        node("n1", "Saying yes when I mean no", [
          ev("e1", "saying yes when I want to say no"), // real
          ev("e2", "I never stand up for myself"), // fabricated
          ev("e2", "even though I wanted to say no"), // real
        ]),
      ]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );

    expect(result.acceptedNodes).toHaveLength(1);
    const accepted = result.acceptedNodes[0];
    expect(accepted.evidence).toHaveLength(2);
    for (const e of accepted.evidence) {
      expect(e.quote).not.toContain("stand up for myself");
    }
  });
});

describe("test 2 — the acceptance test", () => {
  it("accepts a present quote with a span that slices back to the original text", () => {
    const sources = sourceMap(src("e1", JOURNAL_1), src("e2", JOURNAL_2));
    const result = gate(
      proposals([
        node("n1", "Saying yes when I mean no", [
          ev("e1", "I keep saying yes when I want to say no"),
          ev("e2", "I wanted to say no"),
        ]),
      ]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );

    expect(result.acceptedNodes).toHaveLength(1);
    const [a, b] = result.acceptedNodes[0].evidence;
    expect(JOURNAL_1.slice(a.spanStart, a.spanEnd)).toBe(
      "I keep saying yes when I want to say no",
    );
    expect(JOURNAL_2.slice(b.spanStart, b.spanEnd)).toBe("I wanted to say no");
    // Mass is arithmetic, not model opinion — and 2 recent spans > 0.
    expect(result.acceptedNodes[0].mass).toBeGreaterThan(0);
  });
});

describe("test 3 — normalization matrix", () => {
  const CONTENT =
    "She said “I’m the strong one — always” and I believed it.\nEvery   day I carry that.";
  const CONTENT_2 = "i'm the strong one - always. that is just who i am.";

  const accepted = (quote: string, content = CONTENT) => {
    const sources = sourceMap(src("e1", content), src("e2", CONTENT_2));
    const result = gate(
      proposals([
        node("n1", "The strong one", [ev("e1", quote), ev("e2", "the strong one - always")]),
      ]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );
    return result.acceptedNodes.length === 1 && result.acceptedNodes[0].evidence.length === 2;
  };

  it("curly vs straight quotes/apostrophes match", () => {
    expect(accepted("I'm the strong one — always")).toBe(true);
  });

  it("case differences match", () => {
    expect(accepted("i’m the STRONG one — always")).toBe(true);
  });

  it("collapsed whitespace (incl. newlines) matches", () => {
    expect(accepted("it.\nEvery day I carry that")).toBe(true);
    expect(accepted("it. Every    day I carry that")).toBe(true);
  });

  it("dash variants match", () => {
    expect(accepted("I'm the strong one - always")).toBe(true);
  });

  it("unicode NFKC pairs match (ligature quote vs plain source)", () => {
    const sources = sourceMap(
      src("e1", "The fire taught me caution."),
      src("e2", "fire changed everything for me."),
    );
    // Proposer's quote contains the ﬁ ligature; the source is plain ASCII.
    const result = gate(
      proposals([node("n1", "Fire", [ev("e1", "The ﬁre taught me"), ev("e2", "ﬁre changed")])]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(1);
  });

  it("a genuine paraphrase is rejected (no fuzzy matching in v1)", () => {
    const sources = sourceMap(src("e1", CONTENT));
    const result = gate(
      proposals([
        node("n1", "The strong one", [ev("e1", "I always have to be the strong person")]),
      ]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(0);
    expect(result.rejected[0].reason).toBe("QUOTE_NOT_FOUND");
  });
});

describe("test 4 — span mapping battery", () => {
  it("original.slice(spanStart, spanEnd) reproduces the human-readable source for a battery of quotes", () => {
    const content =
      "Some days I feel invisible at work. “Just keep your head down,” I tell myself — and I do.\n\nBut lately\tI wonder if being invisible is a choice I keep making.";
    const battery: Array<{ quote: string; expected: string }> = [
      { quote: "I feel invisible at work", expected: "I feel invisible at work" },
      {
        quote: '"Just keep your head down," I tell myself',
        expected: "“Just keep your head down,” I tell myself",
      },
      {
        quote: "lately I wonder if being invisible is a choice",
        expected: "lately\tI wonder if being invisible is a choice",
      },
    ];
    const sources = sourceMap(src("e1", content), src("e2", "I feel invisible at work again."));
    for (const { quote, expected } of battery) {
      const result = gate(
        proposals([
          node("n1", "Invisibility", [ev("e1", quote), ev("e2", "invisible at work again")]),
        ]),
        sources,
        EMPTY_GRAPH,
        [],
        NOW,
      );
      expect(result.acceptedNodes).toHaveLength(1);
      const found = result.acceptedNodes[0].evidence.find((e) => e.sourceEventId === "e1")!;
      expect(content.slice(found.spanStart, found.spanEnd)).toBe(expected);
      // The stored quote IS the original slice (the person's words as written).
      expect(found.quote).toBe(expected);
    }
  });
});

describe("test 5 — conferring vs non-conferring", () => {
  it("practitioner-authored evidence attaches with conferring=false and yields mass 0", () => {
    const noteContent = "Client presents a persistent core belief of unworthiness.";
    const sources = sourceMap(
      src("p1", noteContent, { authorship: "PRACTITIONER" }),
      src("p2", "Unworthiness theme again in session.", { authorship: "PRACTITIONER" }),
    );
    const result = gate(
      proposals([
        node(
          "n1",
          "Unworthiness",
          [ev("p1", "core belief of unworthiness"), ev("p2", "Unworthiness theme")],
          { provenance: "PRACTITIONER" },
        ),
      ]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );

    expect(result.acceptedNodes).toHaveLength(1);
    const accepted = result.acceptedNodes[0];
    // LAW 3: evidence attaches for display/provenance…
    expect(accepted.evidence).toHaveLength(2);
    expect(accepted.evidence.every((e) => e.conferring === false)).toBe(true);
    // …but confers NOTHING: mass 0, hypothesis state.
    expect(accepted.mass).toBe(0);
    expect(accepted.state).toBe("HYPOTHESIS");
  });

  it("self-authored evidence confers: mass > 0", () => {
    const sources = sourceMap(src("e1", JOURNAL_1), src("e2", JOURNAL_2));
    const result = gate(
      proposals([
        node("n1", "Saying yes when I mean no", [
          ev("e1", "saying yes when I want to say no"),
          ev("e2", "I wanted to say no"),
        ]),
      ]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedNodes[0].mass).toBeGreaterThan(0);
    expect(result.acceptedNodes[0].evidence.every((e) => e.conferring)).toBe(true);
  });
});

describe("test 7 — threshold / shadow buffer", () => {
  it("one mention → shadow buffer (held, not lost); second distinct-source mention → materializes", () => {
    const sources1 = sourceMap(src("e1", JOURNAL_1));
    const pass1 = gate(
      proposals([
        node("n1", "Saying yes when I mean no", [ev("e1", "saying yes when I want to say no")]),
      ]),
      sources1,
      EMPTY_GRAPH,
      [],
      NOW,
    );

    // Not accepted, not rejected-and-lost: held in the shadow buffer.
    expect(pass1.acceptedNodes).toHaveLength(0);
    expect(pass1.shadowBuffer).toHaveLength(1);
    expect(pass1.shadowBuffer[0].evidenceCache).toHaveLength(1);
    expect(
      pass1.rejected.find(
        (r) => r.tempId === "n1" && r.reason === "BELOW_MATERIALIZATION_THRESHOLD",
      ),
    ).toBeTruthy();

    // Pass 2: a new event mentions it again — the candidate clears the bar.
    const sources2 = sourceMap(src("e2", JOURNAL_2, { occurredAt: daysAgo(2) }));
    const pass2 = gate(
      proposals([
        node("n9", "Saying yes when I mean no", [ev("e2", "even though I wanted to say no")]),
      ]),
      sources2,
      EMPTY_GRAPH,
      pass1.shadowBuffer,
      NOW,
    );

    expect(pass2.acceptedNodes).toHaveLength(1);
    const materialized = pass2.acceptedNodes[0];
    // Promoted cache + this pass's evidence — both present.
    expect(materialized.evidence).toHaveLength(2);
    expect(materialized.mass).toBeGreaterThan(0);
    expect(materialized.state).toBe("ACTIVE");
    // The candidate left the shadow buffer on materialization.
    expect(pass2.shadowBuffer).toHaveLength(0);
  });

  it("hypothesis provenances (lens/becoming/practitioner) bypass the threshold and materialize at mass 0", () => {
    const result = gate(
      proposals([
        node("l1", "Bridge between worlds", [], { provenance: "LENS", type: "LENS" }),
        node("b1", "Calm under conflict", [], { provenance: "BECOMING", type: "BECOMING" }),
      ]),
      sourceMap(),
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(2);
    for (const n of result.acceptedNodes) {
      expect(n.mass).toBe(0);
      expect(n.state).toBe("HYPOTHESIS");
      expect(n.confidence).toBe(GATE_CONFIG_V1.confidence.hypothesisFloor);
    }
  });

  it("an EXTRACTED node with zero evidence is rejected (EMPTY_EVIDENCE_NON_HYPOTHESIS)", () => {
    const result = gate(
      proposals([node("n1", "Something", [])]),
      sourceMap(),
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(0);
    expect(result.rejected[0].reason).toBe("EMPTY_EVIDENCE_NON_HYPOTHESIS");
  });
});

describe("source resolution failures", () => {
  it("SOURCE_NOT_FOUND for an unknown sourceEventId", () => {
    const result = gate(
      proposals([node("n1", "X", [ev("ghost", "anything")])]),
      sourceMap(src("e1", JOURNAL_1)),
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(0);
    expect(result.rejected[0].reason).toBe("SOURCE_NOT_FOUND");
  });

  it("SOURCE_INVALIDATED for a superseded event", () => {
    const result = gate(
      proposals([
        node("n1", "X", [ev("e1", "saying yes when I want to say no")]),
      ]),
      sourceMap(src("e1", JOURNAL_1, { invalidatedAt: daysAgo(1) })),
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(0);
    expect(result.rejected[0].reason).toBe("SOURCE_INVALIDATED");
  });
});

describe("edges", () => {
  const sources = () =>
    sourceMap(
      src("e1", JOURNAL_1),
      src("e2", JOURNAL_2),
      src("e3", "I protect everyone so no one sees me tired. I am so tired."),
      src("e4", "Being tired is the cost of protecting everyone, I suppose."),
    );

  const twoNodes = () => [
    node("n1", "Saying yes when I mean no", [
      ev("e1", "saying yes when I want to say no"),
      ev("e2", "I wanted to say no"),
    ]),
    node("n2", "Protecting everyone", [
      ev("e3", "I protect everyone"),
      ev("e4", "protecting everyone"),
    ]),
  ];

  it("an edge between two accepted nodes survives, with verified evidence and derived strength", () => {
    const result = gate(
      proposals(twoNodes(), [
        {
          tempId: "g1",
          sourceTempId: "n2",
          targetTempId: "n1",
          type: "DRIVES",
          evidence: [ev("e3", "I protect everyone so no one sees me tired")],
        },
      ]),
      sources(),
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedEdges).toHaveLength(1);
    expect(result.acceptedEdges[0].strength).toBeGreaterThan(0);
    expect(result.acceptedEdges[0].confidence).toBeGreaterThan(0);
  });

  it("EDGE_ENDPOINT_REJECTED when an endpoint node was rejected", () => {
    const result = gate(
      proposals(
        [
          ...twoNodes(),
          node("n3", "Fabricated", [ev("e1", "this text is nowhere in the source")]),
        ],
        [
          {
            tempId: "g1",
            sourceTempId: "n3",
            targetTempId: "n1",
            type: "DRIVES",
            evidence: [],
          },
        ],
      ),
      sources(),
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedEdges).toHaveLength(0);
    expect(
      result.rejected.find((r) => r.tempId === "g1" && r.reason === "EDGE_ENDPOINT_REJECTED"),
    ).toBeTruthy();
  });

  it("an edge may reference an existing graph node as an endpoint", () => {
    const prior = {
      nodes: [
        existingNode("db-node-1", "Old belief", [
          evidenceRecord("old-e", "old quote"),
          evidenceRecord("old-e2", "old quote two"),
        ]),
      ],
      edges: [],
    };
    const result = gate(
      proposals(twoNodes(), [
        {
          tempId: "g1",
          sourceTempId: "n1",
          targetTempId: "db-node-1",
          type: "REINFORCES",
          evidence: [],
        },
      ]),
      sources(),
      prior,
      [],
      NOW,
    );
    expect(result.acceptedEdges).toHaveLength(1);
  });
});

describe("test 9 — idempotency", () => {
  it("same input twice → byte-identical GateResult", () => {
    const sources = sourceMap(src("e1", JOURNAL_1), src("e2", JOURNAL_2));
    const input = () =>
      proposals(
        [
          node("n1", "Saying yes when I mean no", [
            ev("e1", "saying yes when I want to say no"),
            ev("e2", "I wanted to say no"),
          ]),
          node("n2", "Only one mention", [ev("e1", "Every single time")]),
          node("n3", "Fabricated", [ev("e1", "utterly absent words")]),
        ],
        [],
      );
    const r1 = gate(input(), sources, EMPTY_GRAPH, [], NOW);
    const r2 = gate(input(), sources, EMPTY_GRAPH, [], NOW);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});

describe("test 10 — fail-closed fuzz", () => {
  it("random/adversarial proposer output never yields unverified evidence and never throws", () => {
    const contents = [
      JOURNAL_1,
      JOURNAL_2,
      "café ﬁre ＨＥＬＬＯ 🌙 some emoji and full-width",
      "",
      "a",
    ];
    const sources = sourceMap(
      ...contents.map((c, i) => src(`e${i}`, c, { authorship: i % 3 === 0 ? "SELF" : "PRACTITIONER" })),
    );
    const rnd = mulberry32(123456789);
    const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
    const randomString = () => {
      const pool = [
        "yes",
        "no",
        "I keep saying yes",
        "ﬁre",
        "“quote”",
        "🌙",
        "want to say no",
        "całkiem inny język",
        "   ",
        "",
        " ",
        "I keep saying yes when I want to say no. Every single time.",
      ];
      let s = "";
      const n = Math.floor(rnd() * 4);
      for (let i = 0; i <= n; i++) s += (s ? " " : "") + pick(pool);
      return s;
    };

    for (let iter = 0; iter < 200; iter++) {
      const nNodes = Math.floor(rnd() * 4);
      const nodes = Array.from({ length: nNodes }, (_, i) =>
        node(`n${iter}-${i}`, randomString() || "label", [
          ...Array.from({ length: Math.floor(rnd() * 3) }, () =>
            ev(pick(["e0", "e1", "e2", "e3", "e4", "missing"]), randomString(), {
              offsetHint: rnd() < 0.5 ? Math.floor(rnd() * 60) : undefined,
              role: pick(["SUPPORT", "DECLARATION", "ENACTMENT"] as const),
              polarity: pick(["SUPPORTING", "COUNTERVAILING"] as const),
            }),
          ),
        ], {
          provenance: pick(["EXTRACTED", "LENS", "BECOMING", "PRACTITIONER"] as const),
          type: pick(["BELIEF", "PATTERN", "BECOMING", "LENS"] as const),
        }),
      );
      const edges = Array.from({ length: Math.floor(rnd() * 3) }, (_, i) => ({
        tempId: `g${iter}-${i}`,
        sourceTempId: pick([...nodes.map((n) => n.tempId), "nonexistent"]),
        targetTempId: pick([...nodes.map((n) => n.tempId), "nonexistent"]),
        type: "DRIVES" as const,
        evidence: [ev(pick(["e0", "e1", "missing"]), randomString())],
      }));

      // Never throws…
      const result = gate(proposals(nodes, edges), sources, EMPTY_GRAPH, [], NOW);

      // …and every accepted/shadow evidence span verifiably slices the source.
      const allEvidence = [
        ...result.acceptedNodes.flatMap((n) => n.evidence),
        ...result.acceptedEdges.flatMap((e) => e.evidence),
        ...result.shadowBuffer.flatMap((s) => s.evidenceCache),
      ];
      for (const e of allEvidence) {
        const source = sources.get(e.sourceEventId);
        expect(source).toBeTruthy();
        const slice = source!.content.slice(e.spanStart, e.spanEnd);
        expect(slice).toBe(e.quote);
        expect(normalizeQuote(slice).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("test 12 — multi-occurrence tie-break", () => {
  const content =
    "i feel small at work. later, at home, i feel small again. and at night i feel small most of all.";
  // occurrences of "i feel small": index 0, 39(ish), and near the end.
  const first = content.indexOf("i feel small");
  const second = content.indexOf("i feel small", first + 1);
  const third = content.indexOf("i feel small", second + 1);

  it("resolves to the occurrence nearest the proposer offset", () => {
    const sources = sourceMap(src("e1", content), src("e2", "i feel small."));
    const result = gate(
      proposals([
        node("n1", "Feeling small", [
          ev("e1", "i feel small", { offsetHint: second + 3 }),
          ev("e2", "i feel small"),
        ]),
      ]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(1);
    const found = result.acceptedNodes[0].evidence.find((e) => e.sourceEventId === "e1")!;
    expect(found.spanStart).toBe(second);
    expect(content.slice(found.spanStart, found.spanEnd)).toBe("i feel small");
  });

  it("rejects an ambiguous quote with no offset — never guesses", () => {
    const sources = sourceMap(src("e1", content));
    const result = gate(
      proposals([node("n1", "Feeling small", [ev("e1", "i feel small")])]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(0);
    expect(result.rejected[0].reason).toBe("AMBIGUOUS_QUOTE");
  });
});

describe("test 13 — invalidation-aware mass", () => {
  it("invalidating a cited source reduces the node's mass on recompute", () => {
    const label = "Saying yes when I mean no";
    const before = existingNode("db1", label, [
      evidenceRecord("e1", "saying yes when I want to say no", { occurredAt: daysAgo(5) }),
      evidenceRecord("e2", "I wanted to say no", { occurredAt: daysAgo(3) }),
      evidenceRecord("e3", "yes again, no again", { occurredAt: daysAgo(1) }),
    ]);
    const after = existingNode("db1", label, [
      evidenceRecord("e1", "saying yes when I want to say no", { occurredAt: daysAgo(5) }),
      evidenceRecord("e2", "I wanted to say no", {
        occurredAt: daysAgo(3),
        sourceInvalidatedAt: NOW, // correction: this event was superseded
      }),
      evidenceRecord("e3", "yes again, no again", { occurredAt: daysAgo(1) }),
    ]);

    // Recompute path: a merging proposal triggers arithmetic over prior evidence.
    const sources = sourceMap(src("e9", "and still I keep saying yes when I want to say no"));
    const mergeProposal = () =>
      proposals([
        node("n1", label, [ev("e9", "I keep saying yes when I want to say no")]),
      ]);

    const massBefore = gate(mergeProposal(), sources, { nodes: [before], edges: [] }, [], NOW)
      .acceptedNodes[0].mass;
    const massAfter = gate(mergeProposal(), sources, { nodes: [after], edges: [] }, [], NOW)
      .acceptedNodes[0].mass;

    expect(massAfter).toBeLessThan(massBefore);
  });
});

describe("test 14 — becoming-conferring (a declaration never self-ignites)", () => {
  const wish = "I want to stay calm under conflict.";
  const enact1 = "Huge argument at dinner and I stayed calm the whole way through.";
  const enact2 = "He yelled; I breathed and stayed calm. It felt new.";
  const enact3 = "Stayed calm again in the meeting chaos today.";

  it("a DECLARATION (SELF) creates the seed at mass 0 — restating the wish never ignites", () => {
    const sources = sourceMap(
      src("w1", wish),
      src("w2", "Again: I want to stay calm under conflict. I really do."),
      src("w3", "Reminding myself that I want to stay calm under conflict."),
    );
    const result = gate(
      proposals([
        node(
          "b1",
          "Calm under conflict",
          [
            ev("w1", "I want to stay calm under conflict", { role: "DECLARATION" }),
            ev("w2", "I want to stay calm under conflict", { role: "DECLARATION" }),
            ev("w3", "I want to stay calm under conflict", { role: "DECLARATION" }),
          ],
          { provenance: "BECOMING", type: "BECOMING" },
        ),
      ]),
      sources,
      EMPTY_GRAPH,
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(1);
    const seed = result.acceptedNodes[0];
    expect(seed.evidence).toHaveLength(3); // attaches for display/provenance…
    expect(seed.mass).toBe(0); // …but confers nothing
    expect(seed.state).toBe("HYPOTHESIS"); // never IGNITED by declarations
  });

  it("ENACTMENT evidence (SELF) charges it toward ignition", () => {
    const prior = {
      nodes: [
        existingNode(
          "becoming-1",
          "Calm under conflict",
          [evidenceRecord("w1", "I want to stay calm under conflict", { role: "DECLARATION" })],
          { provenance: "BECOMING", type: "BECOMING", state: "HYPOTHESIS" },
        ),
      ],
      edges: [],
    };
    const sources = sourceMap(
      src("a1", enact1, { occurredAt: daysAgo(10) }),
      src("a2", enact2, { occurredAt: daysAgo(5) }),
      src("a3", enact3, { occurredAt: daysAgo(1) }),
    );
    const result = gate(
      proposals([
        node(
          "b1",
          "Calm under conflict",
          [
            ev("a1", "I stayed calm", { role: "ENACTMENT" }),
            ev("a2", "stayed calm. It felt new", { role: "ENACTMENT" }),
            ev("a3", "Stayed calm again", { role: "ENACTMENT" }),
          ],
          { provenance: "BECOMING", type: "BECOMING" },
        ),
      ]),
      sources,
      prior,
      [],
      NOW,
    );
    expect(result.acceptedNodes).toHaveLength(1);
    const charged = result.acceptedNodes[0];
    expect(charged.existingNodeId).toBe("becoming-1");
    expect(charged.mass).toBeGreaterThan(0);
    expect(charged.state).toBe("IGNITED"); // 3 enactment spans across 3 events
  });
});

describe("test 15 — interpretation guard (solo mode, spec §1.1)", () => {
  const label = "I must carry everything alone";
  const prior = () => ({
    nodes: [
      existingNode("db1", label, [
        evidenceRecord("h1", "I carry everything alone", { occurredAt: daysAgo(40) }),
        evidenceRecord("h2", "no one helps; I carry it all", { occurredAt: daysAgo(20) }),
      ]),
    ],
    edges: [],
  });
  const counterSource = src("c1", "Actually, my sister carried this with me today.");
  const counterProposal = () =>
    proposals([
      node("n1", label, [
        ev("c1", "my sister carried this with me", { polarity: "COUNTERVAILING" }),
      ]),
    ]);

  const soloConfig: GateConfig = { ...GATE_CONFIG_V1, mode: "SOLO" };

  it("a single model-labeled COUNTERVAILING quote does NOT transition state in solo mode", () => {
    const result = gate(
      counterProposal(),
      sourceMap(counterSource),
      prior(),
      [],
      NOW,
      soloConfig,
    );
    expect(result.acceptedNodes).toHaveLength(1);
    expect(result.acceptedNodes[0].state).toBe("ACTIVE"); // unmoved
  });

  it("the same single countervailing quote DOES transition in supervised mode (human in the loop)", () => {
    const result = gate(counterProposal(), sourceMap(counterSource), prior(), [], NOW);
    expect(result.acceptedNodes[0].state).toBe("QUESTIONED");
  });

  it("corroborated countervailing evidence (≥2 distinct events) transitions even in solo mode", () => {
    const sources = sourceMap(
      counterSource,
      src("c2", "And again today my sister carried this with me, without my asking."),
    );
    const withBoth = proposals([
      node("n1", label, [
        ev("c1", "my sister carried this with me", { polarity: "COUNTERVAILING" }),
        ev("c2", "my sister carried this with me, without my asking", {
          polarity: "COUNTERVAILING",
        }),
      ]),
    ]);
    const result = gate(withBoth, sources, prior(), [], NOW, soloConfig);
    expect(result.acceptedNodes[0].state).toBe("QUESTIONED");
  });
});

describe("empty and versioned output", () => {
  it("empty proposer output is valid: empty sets, never a crash", () => {
    const result = gate(proposals(), sourceMap(), EMPTY_GRAPH, [], NOW);
    expect(result.acceptedNodes).toEqual([]);
    expect(result.acceptedEdges).toEqual([]);
    expect(result.rejected).toEqual([]);
    expect(result.shadowBuffer).toEqual([]);
  });

  it("every GateResult carries the full version stamp set (auditability)", () => {
    const result = gate(proposals(), sourceMap(), EMPTY_GRAPH, [], NOW);
    expect(result.gateVersion).toBe("v1");
    expect(result.normalizationVersion).toBe("v1");
    expect(result.massAlgorithmVersion).toBe("v1");
    expect(result.confidenceAlgorithmVersion).toBe("v1");
    expect(result.stateAlgorithmVersion).toBe("v1");
    expect(result.ontologyVersion).toBe("v1");
  });

  it("a brand-new ontology key materializes with reduced confidence and an ontology-candidate log entry", () => {
    const sources = sourceMap(src("e1", JOURNAL_1), src("e2", JOURNAL_2));
    const mk = (key?: string) =>
      gate(
        proposals([
          node(
            "n1",
            "Saying yes when I mean no",
            [ev("e1", "saying yes when I want to say no"), ev("e2", "I wanted to say no")],
            { ontologyKey: key },
          ),
        ]),
        sources,
        EMPTY_GRAPH,
        [],
        NOW,
      );
    const known = mk("belief.core");
    const novel = mk("belief.selfabandonment.novel");
    expect(novel.acceptedNodes[0].confidence).toBeLessThan(known.acceptedNodes[0].confidence);
    expect(novel.ontologyCandidates).toEqual([
      { tempId: "n1", ontologyKey: "belief.selfabandonment.novel" },
    ]);
    expect(known.ontologyCandidates).toEqual([]);
  });
});
