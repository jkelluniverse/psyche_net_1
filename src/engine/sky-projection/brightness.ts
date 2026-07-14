// BRIGHTNESS — the named, versioned recency function (renderer-lens spec §2).
//
// The name is `brightness` everywhere in code, and the function lives inside
// the projection layer: it consumes effectiveEvidence occurrence times and an
// EXPLICIT `now` — no ambient clock. Exponential half-life decay from the
// NEWEST valid evidence, clamped to a floor so nothing ever fully vanishes.
// Pure, deterministic, explainable: same inputs → same glow, and the value is
// always "2^(-age/halfLife) of the newest evidence, floored."

import type { BrightnessConfig } from "./renderer-config.v1";

const MS_PER_DAY = 86_400_000;

export function brightness(
  occurredAts: readonly Date[],
  now: Date,
  config: BrightnessConfig,
): number {
  if (occurredAts.length === 0) return config.floor;
  let newest = -Infinity;
  for (const d of occurredAts) {
    const t = d.getTime();
    if (t > newest) newest = t;
  }
  const ageDays = Math.max(0, (now.getTime() - newest) / MS_PER_DAY);
  const glow = Math.pow(0.5, ageDays / config.halfLifeDays);
  return Math.min(1, Math.max(config.floor, glow));
}
