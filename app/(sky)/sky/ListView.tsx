// LIST VIEW — the canonical accessible surface (renderer-lens spec §2,
// LAW 5: no information may exist only spatially or in motion).
//
// Renders the pure SkyListModel (list-model.ts), which is content-parity
// tested against the SAME veiled view model the canvas draws — labels arrive
// here already veiled and already draft-watermarked; this component styles,
// it never decides. Keyboard reachability is native: <details>/<summary>
// per node, headings per group, no JS required, nothing hover-only, nothing
// motion-only. Server component on purpose.

import type { SkyListModel } from "@/src/engine/sky-projection/list-model";
import { EvidenceList } from "./EvidenceList";

const CONFIDENCE_LABEL: Record<string, string> = {
  low: "low confidence — lightly held",
  medium: "moderate confidence",
  high: "well-supported by your words",
};

export function ListView({ list }: { list: SkyListModel }) {
  return (
    <section aria-label="Sky as a list" className="mx-auto w-full max-w-2xl">
      <h2 className="text-lg font-semibold">Everything on your sky</h2>
      <p className="mt-1 text-sm text-ink/70">
        The same map, as a list — every star, every connection, nothing that
        exists only in motion.
      </p>

      {list.nodeGroups.map((group) => (
        <div key={`${group.type}/${group.state}`} className="mt-6">
          <h3 className="text-sm font-medium uppercase tracking-wide text-ink/60">
            {group.type.toLowerCase()} · {group.state.toLowerCase().replace(/_/g, " ")}
          </h3>
          <ul className="mt-2 space-y-2">
            {group.entries.map((entry) => (
              <li key={entry.id}>
                <details className="rounded-md border border-ink/10 px-3 py-2">
                  <summary
                    className={`cursor-pointer text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine ${
                      entry.dimmed ? "opacity-60" : ""
                    } ${entry.struck ? "line-through" : ""}`}
                  >
                    {entry.label}
                    {entry.hypothesisBadge && (
                      <span className="ml-2 rounded border border-dashed border-ink/40 px-1.5 py-0.5 text-xs text-ink/70">
                        {entry.hypothesisBadge}
                      </span>
                    )}
                    {entry.veiled && (
                      <span className="ml-2 text-xs text-ink/50">(veiled)</span>
                    )}
                  </summary>
                  <div className="mt-2 space-y-1 text-sm text-ink/80">
                    <p>{CONFIDENCE_LABEL[entry.confidenceBand]}</p>
                    <p>
                      {entry.evidenceCount === 0
                        ? (entry.provenanceCopy ?? "No evidence recorded yet.")
                        : `${entry.evidenceCount} piece${entry.evidenceCount === 1 ? "" : "s"} of evidence from your own words:`}
                    </p>
                    {entry.pendingConfirmationCopy && (
                      <p className="text-wine/90">{entry.pendingConfirmationCopy}</p>
                    )}
                    {entry.evidenceCount > 0 && !entry.veiled && (
                      <EvidenceList nodeId={entry.id} />
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {list.edgeGroups.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium uppercase tracking-wide text-ink/60">
            Connections
          </h3>
          {list.edgeGroups.map((group) => (
            <ul key={group.type} className="mt-2 space-y-1">
              {group.entries.map((edge) => (
                <li key={edge.id} className="text-sm text-ink/80">
                  <span>{edge.sourceLabel}</span>
                  <span className="mx-2 text-ink/50">
                    {group.type.toLowerCase().replace(/_/g, " ")} →
                  </span>
                  <span>{edge.targetLabel}</span>
                  <span className="ml-2 text-xs text-ink/50">
                    ({CONFIDENCE_LABEL[edge.confidenceBand]})
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      )}

      {list.forming.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium uppercase tracking-wide text-ink/60">
            Forming at the edge
          </h3>
          <ul className="mt-2 space-y-2">
            {list.forming.map((f) => (
              <li
                key={f.id}
                className="rounded-md border border-dashed border-ink/20 px-3 py-2 text-sm text-ink/70"
              >
                {f.copy}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-10 border-t border-ink/10 pt-4 text-sm italic text-ink/60">
        {list.fringe.copy}
      </p>
    </section>
  );
}
