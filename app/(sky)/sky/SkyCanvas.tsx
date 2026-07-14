"use client";

// SKY CANVAS — cosmos.gl v3 rendering of the SkyViewModel.
//
// This component STYLES; it never decides. Every visual value it draws comes
// from the view model (already veiled, already watermarked) — the only things
// born here are stochastic layout artifacts: initial scatter positions from
// the per-user seed and the GPU force layout, which never leave this file and
// are never persisted (domain/rendering firewall).
//
// cosmos.gl v3 contract: the constructor returns immediately and public
// methods queue until init completes — we still `await graph.ready` before
// pushing data, per the documented API. @cosmos.gl/graph is MIT; the
// non-commercial @cosmograph/cosmograph wrapper must never appear here.

import { useEffect, useRef, useState } from "react";
import { Graph } from "@cosmos.gl/graph";
import type {
  SkyNodeVM,
  SkyViewModel,
} from "@/src/engine/sky-projection/types";

// Rendering-only palette (hex per node type). Not domain state.
const TYPE_COLORS: Record<string, [number, number, number]> = {
  WOUND: [180, 120, 200],
  SHADOW: [120, 110, 160],
  BELIEF: [235, 200, 120],
  PROTECTION: [140, 180, 220],
  PATTERN: [240, 240, 255],
  TRAIT: [170, 220, 190],
  RESOURCE: [130, 220, 230],
  BECOMING: [250, 170, 130],
  LENS: [200, 200, 220],
};

const SPACE = 4096;

/** mulberry32 over the fnv-style numeric seed — deterministic initial
 * scatter so the same user starts from the same sky between sessions. */
function seededRandom(seed: string): () => number {
  let a = parseInt(seed, 16) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nodeColor(n: SkyNodeVM): [number, number, number, number] {
  const base = TYPE_COLORS[n.type] ?? TYPE_COLORS.PATTERN;
  const grey = (base[0] + base[1] + base[2]) / 3;
  const mix = (c: number) =>
    Math.round((c * n.saturation + grey * (1 - n.saturation)) * n.brightness);
  const dim = n.dimmed ? 0.55 : 1;
  return [
    Math.min(255, mix(base[0]) * dim),
    Math.min(255, mix(base[1]) * dim),
    Math.min(255, mix(base[2]) * dim),
    n.opacity,
  ];
}

const CONFIDENCE_LABEL: Record<string, string> = {
  low: "low confidence — lightly held",
  medium: "moderate confidence",
  high: "well-supported by your words",
};

export function SkyCanvas({ vm }: { vm: SkyViewModel }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SkyNodeVM | null>(null);

  useEffect(() => {
    const div = containerRef.current;
    if (!div || vm.nodes.length === 0) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const graph = new Graph(div, {
      backgroundColor: [0, 0, 0, 0],
      enableSimulation: !reducedMotion,
      randomSeed: vm.seed,
      fitViewOnInit: true,
      simulationGravity: 0.25,
      simulationRepulsion: 1.0,
      simulationDecay: 5000,
      onPointClick: (index: number) => {
        setSelected(vm.nodes[index] ?? null);
      },
    });

    let cancelled = false;
    void (async () => {
      await graph.ready; // v3 async init — explicit, per the documented API
      if (cancelled) return;

      const rng = seededRandom(vm.seed);
      const positions = new Float32Array(vm.nodes.length * 2);
      for (let i = 0; i < vm.nodes.length; i++) {
        positions[i * 2] = rng() * SPACE;
        positions[i * 2 + 1] = rng() * SPACE;
      }
      const colors = new Float32Array(vm.nodes.length * 4);
      const sizes = new Float32Array(vm.nodes.length);
      vm.nodes.forEach((n, i) => {
        const [r, g, b, a] = nodeColor(n);
        colors[i * 4] = r / 255;
        colors[i * 4 + 1] = g / 255;
        colors[i * 4 + 2] = b / 255;
        colors[i * 4 + 3] = a;
        sizes[i] = n.size * 2;
      });
      const indexById = new Map(vm.nodes.map((n, i) => [n.id, i]));
      const links: number[] = [];
      const linkWidths: number[] = [];
      const linkColors: number[] = [];
      for (const e of vm.edges) {
        const s = indexById.get(e.sourceId);
        const t = indexById.get(e.targetId);
        if (s === undefined || t === undefined) continue;
        links.push(s, t);
        linkWidths.push(e.weight);
        linkColors.push(0.7, 0.7, 0.85, e.opacity);
      }

      graph.setPointPositions(positions);
      graph.setPointColors(colors);
      graph.setPointSizes(sizes);
      if (links.length > 0) {
        graph.setLinks(new Float32Array(links));
        graph.setLinkWidths(new Float32Array(linkWidths));
        graph.setLinkColors(new Float32Array(linkColors));
      }
      // Reduced motion: render the seeded scatter statically — no simulation,
      // no transitions; the list view below stays the canonical surface.
      graph.render(reducedMotion ? 0 : undefined);
    })();

    return () => {
      cancelled = true;
      graph.destroy();
    };
  }, [vm]);

  if (vm.nodes.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[60vh] w-full rounded-lg bg-[#0b0e1a]"
        aria-label="Night-sky graph of your inner map. The full content is available in the list below."
        role="img"
      />
      {selected && (
        <div
          className="absolute bottom-3 left-3 right-3 max-w-md rounded-md border border-ink/15 bg-canvas/95 p-4 shadow-lg"
          role="dialog"
          aria-label="Star details"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{selected.label}</p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-ink/60 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-wine"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-xs uppercase tracking-wide text-ink/50">
            {selected.type.toLowerCase()} · {selected.state.toLowerCase().replace(/_/g, " ")}
            {selected.ghost && (
              <span className="ml-2 rounded border border-dashed border-ink/40 px-1 py-0.5">
                {selected.ghost.badge}
              </span>
            )}
          </p>
          <p className="mt-2 text-sm text-ink/80">
            {CONFIDENCE_LABEL[selected.confidenceBand]}
          </p>
          <p className="mt-1 text-sm text-ink/80">
            {selected.evidenceCount === 0
              ? (selected.provenanceCopy ?? "No evidence recorded yet.")
              : `${selected.evidenceCount} piece${selected.evidenceCount === 1 ? "" : "s"} of evidence from your own words.`}
          </p>
        </div>
      )}
    </div>
  );
}
