"use client";

// SKY CANVAS — a living constellation, hand-rolled canvas-2d.
//
// Reimplements (and improves on) the valentinaapp ConstellationMap concept
// against OUR view-model contract: every visual decision (veil, watermark,
// ghost styling, brightness, opacity, dimming) arrives IN the SkyViewModel —
// this component styles and animates; it never decides. Positions are
// canvas-local stochastic artifacts: never persisted, never read as meaning
// (domain/rendering firewall).
//
// Why not cosmos.gl here: the product's look needs labels, rings, gradient
// halos, and gentle ambient drift — none expressible through cosmos's
// point-sprite API. At Tier-0 scale (dozens of stars) canvas-2d does all of
// it in one file. @cosmos.gl/graph (MIT) remains the intended engine if node
// counts ever outgrow this — the spec's cosmos line needs Jacob's amendment
// either way (flagged at handoff, not silently edited).
//
// Motion: gentle physics (repulsion + min-distance, springs along evidence
// edges, mild center gravity) + ambient sinusoidal drift — alive, never
// frantic, and it can't coalesce because repulsion enforces spacing.
// prefers-reduced-motion: drift off, physics settles to stillness.

import { useEffect, useRef, useState } from "react";
import type {
  SkyNodeVM,
  SkyViewModel,
} from "@/src/engine/sky-projection/types";

// Rendering-only palette (per node type) — warm, luminous star tones.
// High-chroma on purpose: ghost desaturation (grammar, from the VM) pulls
// toward grey; these keep their hue through the veil of uncertainty.
const TYPE_COLORS: Record<string, [number, number, number]> = {
  WOUND: [225, 130, 245],
  SHADOW: [150, 130, 235],
  BELIEF: [255, 200, 80],
  PROTECTION: [110, 180, 255],
  PATTERN: [255, 240, 200],
  TRAIT: [130, 240, 170],
  RESOURCE: [90, 225, 240],
  BECOMING: [255, 160, 90],
  LENS: [205, 200, 255],
};
const CREAM = "rgba(252,246,232,";

const CONFIDENCE_LABEL: Record<string, string> = {
  low: "low confidence — lightly held",
  medium: "moderate confidence",
  high: "well-supported by your words",
};

/** mulberry32 over the seed — deterministic star placement per user. */
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

function rgba(c: [number, number, number], a: number): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
function blend(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** The star's paint color: type hue → VM desaturation → VM dimming. */
function starColor(n: SkyNodeVM): [number, number, number] {
  const base = TYPE_COLORS[n.type] ?? TYPE_COLORS.PATTERN;
  const grey = (base[0] + base[1] + base[2]) / 3;
  const desat = blend([grey, grey, grey], base, n.saturation);
  return n.dimmed ? blend(desat, [20, 22, 34], 0.45) : desat;
}

type Sim = { x: number; y: number; vx: number; vy: number; r: number; phase: number };

export function SkyCanvas({ vm }: { vm: SkyViewModel }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<SkyNodeVM | null>(null);
  const vmRef = useRef(vm);
  vmRef.current = vm;
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected?.id ?? null;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || vm.nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let raf = 0;
    let running = true;
    let tick = 0;

    function size() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = wrap!.clientWidth * dpr;
      canvas!.height = wrap!.clientHeight * dpr;
      canvas!.style.width = `${wrap!.clientWidth}px`;
      canvas!.style.height = `${wrap!.clientHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    const ro = new ResizeObserver(size);
    ro.observe(wrap);

    const W = () => wrap!.clientWidth;
    const H = () => wrap!.clientHeight;

    // Seeded golden-angle spiral: same user, same starting sky.
    const rng = seededRandom(vm.seed);
    const sims = new Map<string, Sim>();
    vm.nodes.forEach((n, i) => {
      const angle = i * 2.39996 + (rng() - 0.5) * 0.6;
      const rad = (46 + 30 * Math.sqrt(i)) * (0.85 + rng() * 0.3);
      sims.set(n.id, {
        x: W() / 2 + Math.cos(angle) * rad,
        y: H() / 2 + Math.sin(angle) * rad,
        vx: 0,
        vy: 0,
        r: n.size * 0.85 + n.brightness * 2.5, // mass sets the body; light breathes on top
        phase: (i * 137) % 100,
      });
    });

    const view = { x: 0, y: 0, k: 1 };
    const drag = { id: null as string | null, panning: false, sx: 0, sy: 0 };
    let hover: string | null = null;
    let pinch: number | null = null;

    function step() {
      const nodes = vmRef.current.nodes;
      const edges = vmRef.current.edges;
      const arr = nodes
        .map((n) => ({ n, s: sims.get(n.id) }))
        .filter((x): x is { n: SkyNodeVM; s: Sim } => Boolean(x.s));

      // O(n²) repulsion with a spacing floor — stars can never stack.
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i].s;
          const b = arr[j].s;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            dx = (Math.random() - 0.5) * 2;
            dy = (Math.random() - 0.5) * 2;
            d2 = dx * dx + dy * dy;
          }
          const d = Math.sqrt(d2);
          const min = a.r + b.r + 34;
          const f = d < min ? (min - d) * 0.06 : 900 / d2;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
      // Springs along EVIDENCE edges only — connection reads as closeness.
      for (const e of edges) {
        const a = sims.get(e.sourceId);
        const b = sims.get(e.targetId);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const rest = a.r + b.r + 46 + 90 / (0.6 + e.weight);
        const f = (d - rest) * 0.012;
        a.vx += (dx / d) * f;
        a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f;
        b.vy -= (dy / d) * f;
      }
      for (const { s } of arr) {
        // Mild center gravity keeps the constellation framed.
        s.vx += (W() / 2 - s.x) * 0.0012;
        s.vy += (H() / 2 - s.y) * 0.0012;
        // Ambient drift — alive, never frantic.
        if (!reduceMotion) {
          s.vx += Math.sin(tick / 90 + s.phase) * 0.012;
          s.vy += Math.cos(tick / 110 + s.phase) * 0.012;
        }
        if (drag.id === null || sims.get(drag.id) !== s) {
          s.vx *= 0.86;
          s.vy *= 0.86;
          s.x += s.vx;
          s.y += s.vy;
        }
      }
    }

    function draw() {
      const nodes = vmRef.current.nodes;
      const edges = vmRef.current.edges;
      ctx!.clearRect(0, 0, W(), H());
      ctx!.save();
      ctx!.translate(view.x, view.y);
      ctx!.scale(view.k, view.k);

      // Edges — hairlines of starlight (only ever drawn from evidence).
      for (const e of edges) {
        const a = sims.get(e.sourceId);
        const b = sims.get(e.targetId);
        if (!a || !b) continue;
        ctx!.strokeStyle = `${CREAM}${(0.12 + 0.25 * e.opacity).toFixed(2)})`;
        ctx!.lineWidth = Math.max(0.7, e.weight * 0.5);
        if (e.dashed) ctx!.setLineDash([4, 5]);
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }

      for (const n of nodes) {
        const s = sims.get(n.id);
        if (!s) continue;
        const hue = starColor(n);
        const alpha = n.opacity;
        const r = s.r;

        // Halo — brightness IS the glow (recency, from the VM).
        const haloR = r * (1.9 + n.brightness * 1.8);
        const halo = ctx!.createRadialGradient(s.x, s.y, r * 0.4, s.x, s.y, haloR);
        halo.addColorStop(0, rgba(hue, 0.45 * n.brightness * alpha));
        halo.addColorStop(1, rgba(hue, 0));
        ctx!.fillStyle = halo;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, haloR, 0, Math.PI * 2);
        ctx!.fill();

        // Body — crisp orb with an off-center highlight.
        const body = ctx!.createRadialGradient(
          s.x - r * 0.3,
          s.y - r * 0.3,
          r * 0.1,
          s.x,
          s.y,
          r,
        );
        body.addColorStop(0, rgba(blend(hue, [254, 248, 238], 0.35), 0.95 * alpha));
        body.addColorStop(1, rgba(hue, 0.9 * alpha));
        ctx!.fillStyle = body;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx!.fill();

        // Ghost grammar: the dashed hypothesis ring, finally drawn as designed.
        if (n.ghost) {
          ctx!.setLineDash([3, 4]);
          ctx!.strokeStyle = rgba(blend(hue, [254, 248, 238], 0.4), 0.75 * alpha);
          ctx!.lineWidth = 1.2;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, r + 5, 0, Math.PI * 2);
          ctx!.stroke();
          ctx!.setLineDash([]);
        }
        // CONTRADICTED: struck through, still present.
        if (n.struck) {
          ctx!.strokeStyle = `${CREAM}${(0.7 * alpha).toFixed(2)})`;
          ctx!.lineWidth = 1.4;
          ctx!.beginPath();
          ctx!.moveTo(s.x - r - 4, s.y + r + 4);
          ctx!.lineTo(s.x + r + 4, s.y - r - 4);
          ctx!.stroke();
        }
        // Selection ring.
        if (selectedRef.current === n.id) {
          ctx!.strokeStyle = `${CREAM}0.9)`;
          ctx!.lineWidth = 1.4;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, r + 8, 0, Math.PI * 2);
          ctx!.stroke();
        }

        // Label — the words themselves (already veiled/watermarked upstream).
        if (view.k > 0.5) {
          ctx!.font = "11px Inter, system-ui, sans-serif";
          ctx!.textAlign = "center";
          ctx!.fillStyle = `${CREAM}${(0.5 + 0.35 * alpha).toFixed(2)})`;
          const label =
            n.label.length > 30 ? `${n.label.slice(0, 30)}…` : n.label;
          ctx!.fillText(label, s.x, s.y + r + 16);
        }
      }
      ctx!.restore();
    }

    function loop() {
      if (!running) return;
      tick++;
      step();
      draw();
      raf = requestAnimationFrame(loop);
    }
    loop();

    // ---- interactions: tap select, drag star, pan, wheel + pinch zoom ----
    const toWorld = (cx: number, cy: number) => {
      const rect = canvas!.getBoundingClientRect();
      return {
        x: (cx - rect.left - view.x) / view.k,
        y: (cy - rect.top - view.y) / view.k,
      };
    };
    const hit = (cx: number, cy: number): string | null => {
      const p = toWorld(cx, cy);
      let best: string | null = null;
      let bestD = Infinity;
      for (const n of vmRef.current.nodes) {
        const s = sims.get(n.id);
        if (!s) continue;
        const d = Math.hypot(p.x - s.x, p.y - s.y);
        if (d < s.r + 10 && d < bestD) {
          best = n.id;
          bestD = d;
        }
      }
      return best;
    };

    function onPointerDown(e: PointerEvent) {
      canvas!.setPointerCapture(e.pointerId);
      const id = hit(e.clientX, e.clientY);
      drag.id = id;
      drag.panning = !id;
      drag.sx = e.clientX;
      drag.sy = e.clientY;
    }
    function onPointerMove(e: PointerEvent) {
      if (pinch !== null) return; // two fingers = zoom, not drag
      if (drag.id) {
        const p = toWorld(e.clientX, e.clientY);
        const s = sims.get(drag.id);
        if (s) {
          s.x = p.x;
          s.y = p.y;
          s.vx = 0;
          s.vy = 0;
        }
      } else if (drag.panning && (e.buttons & 1) === 1) {
        view.x += e.clientX - drag.sx;
        view.y += e.clientY - drag.sy;
        drag.sx = e.clientX;
        drag.sy = e.clientY;
      } else {
        hover = hit(e.clientX, e.clientY);
        canvas!.style.cursor = hover ? "pointer" : "grab";
      }
    }
    function onPointerUp(e: PointerEvent) {
      const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6;
      if (drag.id && !moved) {
        const node = vmRef.current.nodes.find((n) => n.id === drag.id) ?? null;
        setSelected(node);
      } else if (!drag.id && !moved) {
        setSelected(null);
      }
      drag.id = null;
      drag.panning = false;
    }
    function zoomAt(mx: number, my: number, k: number) {
      const clamped = Math.min(3.5, Math.max(0.3, k));
      view.x = mx - ((mx - view.x) / view.k) * clamped;
      view.y = my - ((my - view.y) / view.k) * clamped;
      view.k = clamped;
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      zoomAt(
        e.clientX - rect.left,
        e.clientY - rect.top,
        view.k * (e.deltaY < 0 ? 1.12 : 0.89),
      );
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        if (pinch !== null) {
          const rect = canvas!.getBoundingClientRect();
          zoomAt(
            (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
            (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
            view.k * (d / pinch),
          );
        }
        pinch = d;
      }
    }
    function onTouchEnd() {
      pinch = null;
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
    // The sim rebuilds only when the view model identity changes.
  }, [vm]);

  if (vm.nodes.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={wrapRef}
        className="relative h-[65vh] min-h-[420px] w-full overflow-hidden rounded-xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 38%, #16203c 0%, #0d1226 55%, #05070f 100%)",
        }}
        aria-label="Night-sky graph of your inner map. The full content is available in the list below."
        role="img"
      >
        <canvas ref={canvasRef} className="block h-full w-full touch-none" />
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ boxShadow: "inset 0 0 90px 30px rgba(3, 5, 12, 0.85)" }}
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
            {selected.type.toLowerCase()} ·{" "}
            {selected.state.toLowerCase().replace(/_/g, " ")}
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
