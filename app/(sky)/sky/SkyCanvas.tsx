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

// Rendering-only palette (per node type) — the celestial theme: warm,
// luminous star tones against the deep field. Theme lives HERE (renderer),
// never in the projection; not domain state.
const TYPE_COLORS: Record<string, [number, number, number]> = {
  WOUND: [222, 168, 230],
  SHADOW: [168, 156, 214],
  BELIEF: [250, 224, 152],
  PROTECTION: [164, 202, 244],
  PATTERN: [252, 246, 232],
  TRAIT: [190, 238, 206],
  RESOURCE: [162, 233, 240],
  BECOMING: [252, 190, 148],
  LENS: [226, 224, 244],
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
  // Desaturation carries the ghost/earned distinction (grammar, from the VM).
  const desat = (c: number) => c * n.saturation + grey * (1 - n.saturation);
  // Brightness reads as EMBER→STAR: it eases the color toward its dim end,
  // never multiplies it toward black (that muddied every star to grey).
  const glow = 0.55 + 0.45 * n.brightness;
  const dim = n.dimmed ? 0.55 : 1;
  const ch = (c: number) => Math.round(Math.min(255, desat(c) * glow * dim));
  return [ch(base[0]), ch(base[1]), ch(base[2]), n.opacity];
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
      backgroundColor: [0, 0, 0, 0], // the field gradient is the card's, behind the canvas
      enableSimulation: !reducedMotion,
      randomSeed: vm.seed,
      fitViewOnInit: true,
      // Render at the device's real resolution — the default (1) upscales the
      // canvas 3x on phones and blurs every star.
      pixelRatio:
        typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 3) : 1,
      // Stars keep their pixel size across zoom — zooming explores the field;
      // it must not inflate sprites into soft blobs.
      scalePointsOnZoom: false,
      hoveredPointRingColor: "#f8e3b0", // warm tap/hover ring on the dark field
      // Constellation, not blob: low gravity, real repulsion, and collision
      // so unlinked mass-0 stars can never stack into one grey mass.
      simulationGravity: 0.08,
      simulationRepulsion: 2.0,
      simulationCollision: 1.0,
      simulationCollisionPadding: 24,
      simulationDecay: 3000,
      // When the layout settles, frame the constellation — this also fixes
      // the far-away initial view (fit-on-init framed the pre-layout scatter).
      onSimulationEnd: () => {
        graph.fitView(600, 120);
      },
      onPointClick: (index: number) => {
        setSelected(vm.nodes[index] ?? null);
      },
    });

    let cancelled = false;
    void (async () => {
      await graph.ready; // v3 async init — explicit, per the documented API
      if (cancelled) return;

      // Seeded phyllotaxis (golden-angle spiral) with a little jitter: evenly
      // spread, never stacked — a good sky on its own (reduced motion renders
      // exactly this), and a good starting layout for the simulation.
      const rng = seededRandom(vm.seed);
      const GOLDEN = Math.PI * (3 - Math.sqrt(5));
      const spacing = 90;
      const positions = new Float32Array(vm.nodes.length * 2);
      for (let i = 0; i < vm.nodes.length; i++) {
        const r = spacing * Math.sqrt(i + 0.6);
        const theta = i * GOLDEN + (rng() - 0.5) * 0.5;
        positions[i * 2] = SPACE / 2 + r * Math.cos(theta);
        positions[i * 2 + 1] = SPACE / 2 + r * Math.sin(theta);
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
      // Reduced motion: render the seeded spiral statically — no simulation,
      // no transitions; the list view below stays the canonical surface.
      graph.render(reducedMotion ? 0 : undefined);
      // Frame the constellation now; onSimulationEnd re-frames after settle.
      graph.fitView(reducedMotion ? 0 : 300, 120);
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
        className="relative h-[65vh] w-full overflow-hidden rounded-xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 38%, #16203c 0%, #0d1226 55%, #05070f 100%)",
        }}
      >
        <div
          ref={containerRef}
          className="absolute inset-0"
          aria-label="Night-sky graph of your inner map. The full content is available in the list below."
          role="img"
        />
        {/* The unexplored fringe (LAW 5): a soft edge treatment + the honest
            copy, styled for the dark field. Config owns the words. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            boxShadow: "inset 0 0 90px 30px rgba(3, 5, 12, 0.85)",
          }}
        />
        <p className="pointer-events-none absolute inset-x-0 bottom-3 px-6 text-center text-xs italic text-[#8b93b8]">
          {vm.fringe.copy}
        </p>
      </div>
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
