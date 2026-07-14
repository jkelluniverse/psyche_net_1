"use client";

// EVIDENCE LIST — the shared tap-for-evidence surface (spec §2).
// Lazily fetches the server-sliced snippets for one node and renders them
// with temporal honesty (occurredAt shown), authorship visibly marked,
// COUNTERVAILING visually distinct with its model-assigned-polarity note,
// and mismatch errors VISIBLE. Used by both the sky panel and the list view
// (same data, same honesty, either surface).

import { useEffect, useState } from "react";

interface OkEntry {
  status: "ok";
  evidenceId: string;
  snippet: string;
  occurredAt: string;
  authorship: "SELF" | "PRACTITIONER";
  polarity: "SUPPORTING" | "COUNTERVAILING";
  polarityNote: string | null;
  conferring: boolean;
}
interface MismatchEntry {
  status: "mismatch";
  evidenceId: string;
  occurredAt: string;
  error: string;
}
interface PanelResponse {
  veiled: boolean;
  entries: (OkEntry | MismatchEntry)[];
  omittedInvalidated: number;
  error?: string;
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function EvidenceList({ nodeId }: { nodeId: string }) {
  const [panel, setPanel] = useState<PanelResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPanel(null);
    setFailed(false);
    fetch(`/api/node-evidence?nodeId=${encodeURIComponent(nodeId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: PanelResponse) => {
        if (!cancelled) setPanel(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  if (failed) {
    return (
      <p className="text-sm text-wine" role="alert">
        The evidence couldn&apos;t be loaded just now.
      </p>
    );
  }
  if (!panel) {
    return <p className="text-sm text-ink/50">Loading their words…</p>;
  }
  if (panel.veiled || panel.entries.length === 0) {
    return null; // the caller's provenance copy already tells this story
  }

  return (
    <ul className="mt-2 space-y-2">
      {panel.entries.map((e) =>
        e.status === "mismatch" ? (
          <li
            key={e.evidenceId}
            className="rounded border border-wine/40 px-2 py-1.5 text-xs text-wine"
            role="alert"
          >
            {e.error}
          </li>
        ) : (
          <li
            key={e.evidenceId}
            className={`rounded border px-2 py-1.5 text-sm ${
              e.polarity === "COUNTERVAILING"
                ? "border-wine/50 bg-wine/5"
                : "border-ink/10"
            }`}
          >
            <blockquote className="italic text-ink/90">
              &ldquo;{e.snippet}&rdquo;
            </blockquote>
            <p className="mt-1 text-xs text-ink/55">
              {dateFmt.format(new Date(e.occurredAt))}
              {e.authorship === "PRACTITIONER" && (
                <span className="ml-2 rounded bg-ink/10 px-1 py-0.5">
                  practitioner-noted · carries no weight
                </span>
              )}
              {e.polarity === "COUNTERVAILING" && (
                <span className="ml-2 text-wine">countervailing</span>
              )}
            </p>
            {e.polarityNote && (
              <p className="mt-1 text-xs text-ink/50">{e.polarityNote}</p>
            )}
          </li>
        ),
      )}
      {panel.omittedInvalidated > 0 && (
        <li className="text-xs italic text-ink/50">
          {panel.omittedInvalidated} retracted{" "}
          {panel.omittedInvalidated === 1 ? "entry is" : "entries are"} no longer
          shown.
        </li>
      )}
    </ul>
  );
}
