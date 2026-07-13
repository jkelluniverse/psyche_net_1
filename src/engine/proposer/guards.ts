// Structural policy guards (proposer spec §7, §9): deterministic code that
// enforces what the prompt merely requests, AFTER parsing and BEFORE the
// gate. The wound-gate, provenance stamp, edge-ref resolution, third-party
// check, and recall caps all live here — none of them trusts the model.

import type {
  ProposedEdge,
  ProposedNode,
} from "../contracts/extraction-contracts";
import type { ProposerConfig } from "./config";
import type {
  DroppedItem,
  ExtractionPolicy,
  RawValidatedEdge,
  RawValidatedNode,
} from "./types";

/**
 * Semi-structural third-party heuristic (§9, honestly labeled): a label whose
 * grammatical subject is a named third party ("My mother is narcissistic")
 * is about someone else's psyche and is rejected. "I shut down when my
 * mother criticizes me" is the author's own pattern and passes. There is no
 * clean deterministic test for this; the failure rate is a tracked eval
 * metric, not an assumed zero.
 */
const THIRD_PARTY_SUBJECT_RE =
  /^\s*(my|his|her|their|our)\s+(step[- ]?)?(mother|mom|father|dad|parent|parents|partner|husband|wife|boyfriend|girlfriend|boss|sister|brother|friend|son|daughter|ex|therapist|coach|colleague|family)\b/i;

export interface GuardResult {
  output: { nodes: ProposedNode[]; edges: ProposedEdge[] };
  dropped: DroppedItem[];
}

export function applyPolicyGuards(
  nodes: RawValidatedNode[],
  edges: RawValidatedEdge[],
  policy: ExtractionPolicy,
  priorExtractedNodeIds: ReadonlySet<string>,
  totalSourceWords: number,
  config: ProposerConfig,
): GuardResult {
  const dropped: DroppedItem[] = [];
  const allowed = new Set(policy.allowedNodeTypes);

  // Guard 1 — node-type policy (the wound-gate made structural): dropped by
  // code regardless of what the model emitted.
  let surviving = nodes.filter((n) => {
    if (allowed.has(n.type)) return true;
    dropped.push({
      tempId: n.tempId,
      kind: "node",
      reason: "NODE_TYPE_NOT_ALLOWED_BY_POLICY",
      detail: `type ${n.type} is not allowed by policy ${policy.policyVersion} in ${policy.mode} mode`,
    });
    return false;
  });

  // Guard (§9) — third-party subject check.
  surviving = surviving.filter((n) => {
    if (!THIRD_PARTY_SUBJECT_RE.test(n.label)) return true;
    dropped.push({
      tempId: n.tempId,
      kind: "node",
      reason: "THIRD_PARTY_SUBJECT",
      detail: `label "${n.label}" reads as a claim about a third party's psyche, not the author's`,
    });
    return false;
  });

  // Recall caps (§12) — recall needs a precision floor. Deterministic: keep
  // in model order, drop the excess with a logged reason (never silent).
  const capTotal = Math.max(
    config.caps.minCandidateAllowance,
    Math.ceil((totalSourceWords / 1000) * config.caps.candidatesPer1000Words),
  );
  if (surviving.length > capTotal) {
    for (const n of surviving.slice(capTotal)) {
      dropped.push({
        tempId: n.tempId,
        kind: "node",
        reason: "CAP_EXCEEDED",
        detail: `candidate cap ${capTotal} for ${totalSourceWords} source words`,
      });
    }
    surviving = surviving.slice(0, capTotal);
  }
  const sensitive = new Set(config.sensitiveNodeTypes);
  let sensitiveSeen = 0;
  surviving = surviving.filter((n) => {
    if (!sensitive.has(n.type)) return true;
    sensitiveSeen++;
    if (sensitiveSeen <= config.caps.maxSensitiveCandidatesPerRun) return true;
    dropped.push({
      tempId: n.tempId,
      kind: "node",
      reason: "CAP_EXCEEDED",
      detail: `sensitive-type cap ${config.caps.maxSensitiveCandidatesPerRun} per run`,
    });
    return false;
  });

  // Guard 2 — provenance is stamped by the wrapper; the model's field (if
  // any) was already discarded at validation.
  const outNodes: ProposedNode[] = surviving.map((n) => ({
    tempId: n.tempId,
    type: n.type,
    provenance: "EXTRACTED",
    label: n.label,
    ...(n.ontologyKey !== undefined ? { ontologyKey: n.ontologyKey } : {}),
    evidence: n.evidence,
    ...(n.inferenceDistance !== undefined ? { inferenceDistance: n.inferenceDistance } : {}),
    ...(n.modelReportedConfidence !== undefined
      ? { modelReportedConfidence: n.modelReportedConfidence }
      : {}),
  }));

  // Guard 4 — edge-ref resolution: NodeRef → canonical string endpoints.
  // Dangling edges are dropped, never anchored to invented nodes.
  const survivingTempIds = new Set(outNodes.map((n) => n.tempId));
  const resolve = (ref: RawValidatedEdge["source"]): string | null => {
    if (ref.kind === "PROPOSED") return survivingTempIds.has(ref.tempId) ? ref.tempId : null;
    return priorExtractedNodeIds.has(ref.nodeId) ? ref.nodeId : null;
  };
  const outEdges: ProposedEdge[] = [];
  for (const e of edges) {
    const sourceId = resolve(e.source);
    const targetId = resolve(e.target);
    if (sourceId === null || targetId === null) {
      dropped.push({
        tempId: e.tempId,
        kind: "edge",
        reason: "EDGE_ENDPOINT_UNRESOLVED",
        detail: `endpoint ${sourceId === null ? JSON.stringify(e.source) : JSON.stringify(e.target)} does not resolve to a surviving or provided node`,
      });
      continue;
    }
    outEdges.push({
      tempId: e.tempId,
      sourceTempId: sourceId,
      targetTempId: targetId,
      type: e.type,
      evidence: e.evidence,
      ...(e.inferenceDistance !== undefined ? { inferenceDistance: e.inferenceDistance } : {}),
      ...(e.modelReportedConfidence !== undefined
        ? { modelReportedConfidence: e.modelReportedConfidence }
        : {}),
    });
  }

  return { output: { nodes: outNodes, edges: outEdges }, dropped };
}
