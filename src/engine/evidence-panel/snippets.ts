// TAP-FOR-EVIDENCE — the pure panel builder (renderer-lens spec §2).
//
// The snippet shown is content.slice(spanStart, spanEnd), computed
// SERVER-SIDE from the persisted spans (the spans the NFKC index map exists
// to protect). Three honesty rules, all structural:
// - A slice/quote mismatch is a VISIBLE error entry carrying no words from
//   either side of the disagreement — never a silent fallback.
// - An invalidated source's words are OMITTED and counted — the panel and
//   brightness tell the same story (un-confirming un-tells here too).
// - Conferring is the GATE's rule, imported (isConferring) — never restated.

import type {
  Authorship,
  EvidencePolarity,
  EvidenceRole,
  NodeType,
} from "@prisma/client";
import { isConferring } from "../citation-gate/mass";

/** §1.1: polarity is model-assigned meaning the gate cannot verify. */
export const COUNTERVAILING_NOTE =
  "Read as countervailing by the model — the words are verified, the reading is interpretation.";

/** One evidence row joined with its source event (the loader's shape). */
export interface EvidencePanelRow {
  evidenceId: string;
  quote: string;
  spanStart: number;
  spanEnd: number;
  occurredAt: Date;
  polarity: EvidencePolarity;
  role: EvidenceRole;
  authorship: Authorship;
  sourceInvalidatedAt: Date | null;
  /** The SourceEvent's full content — stays server-side; only the slice leaves. */
  content: string;
}

export type EvidencePanelEntry =
  | {
      status: "ok";
      evidenceId: string;
      snippet: string;
      occurredAt: string;
      authorship: Authorship;
      polarity: EvidencePolarity;
      polarityNote: string | null;
      conferring: boolean;
    }
  | {
      status: "mismatch";
      evidenceId: string;
      occurredAt: string;
      error: string;
    };

export interface EvidencePanelModel {
  entries: EvidencePanelEntry[];
  /** Rows whose source was invalidated/erased — omitted, honestly counted. */
  omittedInvalidated: number;
}

export function buildEvidencePanel(
  rows: EvidencePanelRow[],
  nodeType: NodeType,
): EvidencePanelModel {
  let omittedInvalidated = 0;
  const entries: EvidencePanelEntry[] = [];

  const ordered = [...rows].sort(
    (a, b) =>
      a.occurredAt.getTime() - b.occurredAt.getTime() ||
      (a.evidenceId < b.evidenceId ? -1 : a.evidenceId > b.evidenceId ? 1 : 0),
  );

  for (const r of ordered) {
    if (r.sourceInvalidatedAt !== null) {
      omittedInvalidated++;
      continue;
    }
    const slice = r.content.slice(r.spanStart, r.spanEnd);
    if (slice !== r.quote) {
      entries.push({
        status: "mismatch",
        evidenceId: r.evidenceId,
        occurredAt: r.occurredAt.toISOString(),
        error:
          "This snippet can't be shown right now: the stored span no longer matches the verified quote.",
      });
      continue;
    }
    entries.push({
      status: "ok",
      evidenceId: r.evidenceId,
      snippet: slice,
      occurredAt: r.occurredAt.toISOString(),
      authorship: r.authorship,
      polarity: r.polarity,
      polarityNote: r.polarity === "COUNTERVAILING" ? COUNTERVAILING_NOTE : null,
      conferring: isConferring(
        {
          authorship: r.authorship,
          role: r.role,
          sourceInvalidatedAt: r.sourceInvalidatedAt,
        },
        nodeType,
      ),
    });
  }

  return { entries, omittedInvalidated };
}
