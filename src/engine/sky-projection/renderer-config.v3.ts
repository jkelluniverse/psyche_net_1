// RENDERER CONFIG v3 — v2's grammar + the FORMING-POINT grammar (Jacob's
// LAW-5 ruling, 2026-07-15: "kill silent success" — shadow candidates render
// in the unexplored fringe as faint forming points, visually distinct from
// both ghosts and stars, with NO label claim; the domain materialization
// threshold is UNTOUCHED). Canonical-view snapshot for v3 checked in with
// this edit (same-edit rule). Every v2 constant carries over unchanged.

import type { RendererConfig } from "./renderer-config.v1";
import { RENDERER_CONFIG_V2 } from "./renderer-config.v2";

export const RENDERER_CONFIG_V3: RendererConfig = {
  ...RENDERER_CONFIG_V2,
  rendererConfigVersion: "v3",
  forming: {
    // Smaller than any star's minimum radius, fainter than any ghost —
    // an ember at the edge, not a body on the map.
    radius: 3,
    alpha: 0.5,
    copyOnce:
      "Forming — you mentioned this once, on {date}. It will take shape on your sky if it comes up again.",
    copyRecurring:
      "Forming — mentioned {count} times, most recently on {date}. Still taking shape.",
  },
};
