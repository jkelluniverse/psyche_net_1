#!/usr/bin/env node
// D-R1 CI guard (renderer-lens spec v1.3-FINAL §1, enforcement (b) + (c)).
//
// (b) CO-MODIFICATION CHECK: a change-set that modifies BOTH the ontology
//     module and any lens-map file FAILS — the vocabulary must land first,
//     in its own reviewed change-set, so a lens-map edit can never smuggle
//     chart-shaped keys into the proposer's world.
// (c) DENYLIST LINT: no lens-map ontologyKey may carry chart vocabulary.
//     (Key membership + label linting live in lens-map.spec.ts, which runs
//     in the same CI; this script is the change-set-shaped half tests can't
//     see.)
//
// Usage: node scripts/ci/lens-ontology-guard.mjs [<diff-range>]
//   diff-range defaults to HEAD~1..HEAD (per-commit). CI should pass the
//   PR/push range (e.g. origin/main...HEAD).

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const range = process.argv[2] ?? "HEAD~1..HEAD";
const changed = execSync(`git diff --name-only ${range}`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const ontologyTouched = changed.some((f) => f.startsWith("src/engine/ontology/"));
const lensMapTouched = changed.some((f) => /^src\/engine\/lens\/lens-map\./.test(f));

if (ontologyTouched && lensMapTouched) {
  console.error(
    `D-R1 co-modification check FAILED (${range}): this change-set edits both the ontology module and a lens-map file.\n` +
      `The vocabulary lands FIRST in its own change-set; the lens map targets it in a SEPARATE one.\n` +
      `Ontology files: ${changed.filter((f) => f.startsWith("src/engine/ontology/")).join(", ")}\n` +
      `Lens-map files: ${changed.filter((f) => /^src\/engine\/lens\/lens-map\./.test(f)).join(", ")}`,
  );
  process.exit(1);
}

// (c) denylist over lens-map keys — greppable, chart terms as whole segments.
const DENYLIST =
  /\b(hd|astro|natal|zodiac|gate|gates|center|centers|house|houses|authority|authorities|sacral|splenic|spleen|ajna|chart|planet|planetary|ascendant)\b/i;
for (const f of changed.filter((f) => /^src\/engine\/lens\/lens-map\..*\.ts$/.test(f))) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/ontologyKey:\s*"([^"]+)"/g)) {
    if (DENYLIST.test(m[1])) {
      console.error(`D-R1 denylist FAILED: chart term in ontologyKey "${m[1]}" (${f})`);
      process.exit(1);
    }
  }
}

console.log(`lens-ontology-guard OK (${range}): co-modification clean, keys denylist-clean.`);
