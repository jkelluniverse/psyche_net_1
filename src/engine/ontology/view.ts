// PRODUCTION ONTOLOGY VIEW — what the proposer is shown about the ontology
// (proposer spec: type definitions + known keys; nothing else). Definitions
// are plain-language and versioned with the ontology; the key list is the
// full v2 vocabulary so the extractor can land on keys the matcher (exact
// key match) and the lens map can actually reach.

import type { OntologyView } from "../proposer/types";
import { ONTOLOGY_KEYS, ONTOLOGY_VERSION } from "./ontology";

export function buildOntologyView(): OntologyView {
  return {
    ontologyVersion: ONTOLOGY_VERSION,
    nodeTypes: [
      { type: "SHADOW", definition: "a disowned or avoided aspect the person indicates in their own words" },
      { type: "BELIEF", definition: "a conviction the person states about self or world" },
      { type: "PROTECTION", definition: "a strategy that guards against feared outcomes" },
      { type: "PATTERN", definition: "a recurring behavior the person reports" },
      { type: "TRAIT", definition: "a stable characteristic the person claims" },
      { type: "RESOURCE", definition: "a strength or capacity the person evidences" },
      { type: "WOUND", definition: "a hurt the person names directly (supervised contexts only)" },
    ],
    knownOntologyKeys: [...ONTOLOGY_KEYS],
  };
}
