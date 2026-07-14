// GHOST SELECTION — deterministic budget cut (renderer-lens spec §1).
//
// Total order: priority-STRENGTH first (1 = strongest, so ascending numeric),
// then ontologyKey asc, then label asc — ties can never make the determinism
// keystone flaky. The cap and the diversity minimum live in named, versioned
// config (no magic numbers). NO SILENT CAPS: every matched-but-dropped
// template is reported.
//
// Jacob's tier-3 diversity rule (post-FINAL amendment, ruled at lens-map
// review): pure priority-ordering kills the conditioning themes, and those
// undefined-center ghosts are often the "how did it know that" moment —
// uncomfortable-but-recognizable. So at least `minTier3Ghosts` tier-3 ghosts
// survive the cut when the chart offers them, evicting the LOWEST-ranked
// non-tier-3 selections. Charged ghosts are outside the budget entirely
// (spec §1) — this selector runs at mint time, where no ghost is charged yet.

import type { LensTemplate } from "./lens-map.v1";
import { LENS_MAP_VERSION, lensMap } from "./lens-map.v1";

export interface LensConfig {
  configVersion: string;
  /** Cap on materialized ghosts per import (spec §1: ~9–15). */
  ghostBudget: number;
  /** Diversity floor: tier-3 ghosts that must survive the cut when available. */
  minTier3Ghosts: number;
}

export const LENS_CONFIG_V1: LensConfig = {
  configVersion: "v1",
  ghostBudget: 12,
  minTier3Ghosts: 2,
};

export interface GhostSelection {
  ghosts: LensTemplate[];
  /** Matched the chart but lost the budget cut — reported, never silent. */
  dropped: LensTemplate[];
  lensMapVersion: string;
  configVersion: string;
}

const totalOrder = (a: LensTemplate, b: LensTemplate): number =>
  a.priority - b.priority ||
  (a.ontologyKey < b.ontologyKey ? -1 : a.ontologyKey > b.ontologyKey ? 1 : 0) ||
  (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);

export function selectGhosts(features: string[], config: LensConfig): GhostSelection {
  const featureSet = new Set(features);
  // Unknown feature strings are simply non-matches: the PARSER is the
  // vocabulary gate (skip-and-log lives there); the selector is a pure
  // intersection + ordering.
  const matched = lensMap.filter((t) => featureSet.has(t.feature)).sort(totalOrder);

  const selected = matched.slice(0, config.ghostBudget);

  // Diversity rule: ensure min(minTier3Ghosts, available tier-3) survive.
  const tier3Available = matched.filter((t) => t.priority === 3);
  const want = Math.min(config.minTier3Ghosts, tier3Available.length);
  let have = selected.filter((t) => t.priority === 3).length;
  if (have < want) {
    const incoming = tier3Available.filter((t) => !selected.includes(t));
    // Evict the lowest-ranked non-tier-3 ghosts (end of the total order),
    // swap in the highest-ranked missing tier-3 ones. Deterministic.
    for (const inbound of incoming) {
      if (have >= want) break;
      for (let i = selected.length - 1; i >= 0; i--) {
        if (selected[i].priority !== 3) {
          selected.splice(i, 1);
          break;
        }
      }
      selected.push(inbound);
      have++;
    }
    selected.sort(totalOrder);
  }

  const chosen = new Set(selected);
  return {
    ghosts: selected,
    dropped: matched.filter((t) => !chosen.has(t)),
    lensMapVersion: LENS_MAP_VERSION,
    configVersion: config.configVersion,
  };
}
