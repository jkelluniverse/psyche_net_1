// TAP-FOR-EVIDENCE — tests written before the module (tests-first).
//
// Spec §2 tap-for-evidence + test 6: the panel renders exactly
// content.slice(spanStart, spanEnd) — the spans the NFKC index map exists to
// protect — SERVER-SIDE, with:
// - ROUND-TRIP: slice === quote for non-ASCII fixtures (emoji, CJK,
//   combining marks); the snippet shown IS the person's words at the span.
// - MISMATCH IS VISIBLE: a slice/quote disagreement renders as an error
//   entry, never a silent fallback to the stored quote — if the span is
//   wrong the surface says so.
// - UN-TELL: evidence whose source was invalidated is OMITTED (and counted),
//   matching brightness — the panel and the glow tell the same story.
// - AUTHORSHIP RENDERED: practitioner-authored rows are visibly marked and
//   non-conferring (the gate's isConferring, imported — never restated).
// - COUNTERVAILING DISTINCT: carries the §1.1 model-assigned-polarity note.

import { describe, expect, it } from "vitest";
import {
  buildEvidencePanel,
  COUNTERVAILING_NOTE,
  type EvidencePanelRow,
} from "../snippets";

const row = (o: Partial<EvidencePanelRow> = {}): EvidencePanelRow => ({
  evidenceId: o.evidenceId ?? "ev-1",
  quote: "keep saying yes",
  spanStart: 2,
  spanEnd: 17,
  occurredAt: new Date("2026-07-01T00:00:00.000Z"),
  polarity: "SUPPORTING",
  role: "SUPPORT",
  authorship: "SELF",
  sourceInvalidatedAt: null,
  content: "I keep saying yes when I mean no.",
  ...o,
});

describe("buildEvidencePanel — server-side slice round-trip", () => {
  it("renders exactly content.slice(spanStart, spanEnd)", () => {
    const panel = buildEvidencePanel([row()], "PATTERN");
    expect(panel.entries).toHaveLength(1);
    const e = panel.entries[0];
    expect(e.status).toBe("ok");
    if (e.status !== "ok") return;
    expect(e.snippet).toBe("keep saying yes");
    expect(e.occurredAt).toBe("2026-07-01T00:00:00.000Z");
    expect(e.conferring).toBe(true);
  });

  it("non-ASCII round-trip: emoji, CJK, combining marks slice exactly", () => {
    // Spans live in UTF-16 code-unit space (what .slice uses and what the
    // gate persists) — derive them the way the gate's locator does, so the
    // fixtures stay honest even where an accent is decomposed or an emoji
    // is a surrogate pair.
    const cases = [
      { content: "今日は疲れた。でも書いた。", quote: "疲れた" },
      { content: "I felt 💔 then 🌱 grew", quote: "💔 then 🌱" },
      { content: "café mornings heal me", quote: "café mornings" },
    ].map((c) => {
      const start = c.content.indexOf(c.quote);
      return { ...c, start, end: start + c.quote.length };
    });
    for (const c of cases) {
      expect(c.start).toBeGreaterThanOrEqual(0);
      expect(c.content.slice(c.start, c.end)).toBe(c.quote); // fixture sanity
      const panel = buildEvidencePanel(
        [row({ content: c.content, quote: c.quote, spanStart: c.start, spanEnd: c.end })],
        "PATTERN",
      );
      const e = panel.entries[0];
      expect(e.status).toBe("ok");
      if (e.status === "ok") expect(e.snippet).toBe(c.quote);
    }
  });

  it("MISMATCH renders a visible error — never a silent fallback to the stored quote", () => {
    const panel = buildEvidencePanel(
      [row({ spanStart: 0, spanEnd: 6 })], // slice = "I keep" ≠ quote
      "PATTERN",
    );
    const e = panel.entries[0];
    expect(e.status).toBe("mismatch");
    if (e.status !== "mismatch") return;
    // No words rendered from either side of the disagreement.
    expect(e).not.toHaveProperty("snippet");
    expect(JSON.stringify(e)).not.toContain("I keep");
    expect(JSON.stringify(e)).not.toContain("keep saying yes");
  });

  it("UN-TELL: an invalidated source's words are omitted and counted", () => {
    const panel = buildEvidencePanel(
      [
        row({ evidenceId: "ev-live" }),
        row({
          evidenceId: "ev-dead",
          sourceInvalidatedAt: new Date("2026-07-13T00:00:00.000Z"),
        }),
      ],
      "PATTERN",
    );
    expect(panel.entries).toHaveLength(1);
    expect(panel.entries[0].evidenceId).toBe("ev-live");
    expect(panel.omittedInvalidated).toBe(1);
    expect(JSON.stringify(panel)).not.toContain("ev-dead");
  });

  it("practitioner-authored rows are marked and non-conferring (gate rule, imported)", () => {
    const panel = buildEvidencePanel(
      [row({ authorship: "PRACTITIONER" })],
      "PATTERN",
    );
    const e = panel.entries[0];
    expect(e.status).toBe("ok");
    if (e.status !== "ok") return;
    expect(e.authorship).toBe("PRACTITIONER");
    expect(e.conferring).toBe(false);
  });

  it("D8: ENACTMENT confers on non-BECOMING types too (the loader restated this wrong once)", () => {
    const panel = buildEvidencePanel([row({ role: "ENACTMENT" })], "PATTERN");
    const e = panel.entries[0];
    if (e.status === "ok") expect(e.conferring).toBe(true);
    // and DECLARATION never confers
    const p2 = buildEvidencePanel([row({ role: "DECLARATION" })], "BECOMING");
    const e2 = p2.entries[0];
    if (e2.status === "ok") expect(e2.conferring).toBe(false);
  });

  it("COUNTERVAILING is distinct and carries the model-assigned-polarity note", () => {
    const panel = buildEvidencePanel(
      [row({ polarity: "COUNTERVAILING" })],
      "PATTERN",
    );
    const e = panel.entries[0];
    expect(e.status).toBe("ok");
    if (e.status !== "ok") return;
    expect(e.polarity).toBe("COUNTERVAILING");
    expect(e.polarityNote).toBe(COUNTERVAILING_NOTE);
    // supporting rows carry no note
    const p2 = buildEvidencePanel([row()], "PATTERN");
    if (p2.entries[0].status === "ok") {
      expect(p2.entries[0].polarityNote).toBeNull();
    }
  });

  it("entries are canonically ordered: occurredAt, then evidenceId", () => {
    const panel = buildEvidencePanel(
      [
        row({ evidenceId: "ev-b", occurredAt: new Date("2026-07-02T00:00:00.000Z") }),
        row({ evidenceId: "ev-a", occurredAt: new Date("2026-07-02T00:00:00.000Z") }),
        row({ evidenceId: "ev-z", occurredAt: new Date("2026-06-01T00:00:00.000Z") }),
      ],
      "PATTERN",
    );
    expect(panel.entries.map((e) => e.evidenceId)).toEqual(["ev-z", "ev-a", "ev-b"]);
  });
});
