// Structural policy guards (proposer spec §7, §9): deterministic code that
// enforces what the prompt merely requests, AFTER parsing and BEFORE the
// gate. The wound-gate, provenance stamp, edge-ref resolution, third-party
// check, and recall caps all live here — none of them trusts the model.

import type {
  NodeRef,
  ProposedEdge,
  ProposedNode,
  WrapperRejection,
} from "../contracts/extraction-contracts";
import type { ProposerConfig } from "./config";
import type {
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
  dropped: WrapperRejection[];
  /** v1.3 (round-2 A-1): role labels pass through UNTOUCHED — counted here as
   * telemetry only. Round 1's normalization reversed gate conservatism
   * (aspirational quotes conferred mass) and severed the ignition supply. */
  roleLabelCounts: { DECLARATION: number; ENACTMENT: number };
}

export function applyPolicyGuards(
  nodes: RawValidatedNode[],
  edges: RawValidatedEdge[],
  policy: ExtractionPolicy,
  priorExtractedNodeIds: ReadonlySet<string>,
  totalSourceWords: number,
  config: ProposerConfig,
): GuardResult {
  const dropped: WrapperRejection[] = [];
  const allowed = new Set(policy.allowedNodeTypes);

  // Guard 1 — node-type policy (the wound-gate made structural): dropped by
  // code regardless of what the model emitted.
  let surviving = nodes.filter((n) => {
    if (allowed.has(n.type)) return true;
    dropped.push({
      tempId: n.tempId,
      kind: "node",
      stage: "WRAPPER",
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
      stage: "WRAPPER",
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
        stage: "WRAPPER",
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
      stage: "WRAPPER",
      reason: "CAP_EXCEEDED",
      detail: `sensitive-type cap ${config.caps.maxSensitiveCandidatesPerRun} per run`,
    });
    return false;
  });

  // Guard 2 — provenance is stamped by the wrapper; the model's field (if
  // any) was already discarded at validation. Roles pass through UNTOUCHED
  // (round-2 A-1): a DECLARATION label is non-conferring on EVERY node type
  // by the gate's rule — the label can only restrict mass, never create it —
  // and ENACTMENT labels are the ignition supply for becoming-label merges.
  const roleLabelCounts = { DECLARATION: 0, ENACTMENT: 0 };
  const outNodes: ProposedNode[] = surviving.map((n) => ({
    tempId: n.tempId,
    type: n.type,
    provenance: "EXTRACTED",
    label: n.label,
    ...(n.ontologyKey !== undefined ? { ontologyKey: n.ontologyKey } : {}),
    evidence: n.evidence.map((ev) => {
      if (ev.role === "DECLARATION" || ev.role === "ENACTMENT") {
        roleLabelCounts[ev.role]++;
      }
      return ev;
    }),
    ...(n.inferenceDistance !== undefined ? { inferenceDistance: n.inferenceDistance } : {}),
    ...(n.modelReportedConfidence !== undefined
      ? { modelReportedConfidence: n.modelReportedConfidence }
      : {}),
  }));

  // Guard 4 — edge-ref guard (D3: NodeRef is carried END-TO-END; the wrapper
  // verifies resolvability but never flattens — identity stays discriminated
  // all the way into the gate). Dangling refs are dropped, never anchored to
  // invented nodes.
  const survivingTempIds = new Set(outNodes.map((n) => n.tempId));
  const resolvable = (ref: NodeRef): boolean =>
    ref.kind === "PROPOSED"
      ? survivingTempIds.has(ref.tempId)
      : priorExtractedNodeIds.has(ref.nodeId);
  const outEdges: ProposedEdge[] = [];
  for (const e of edges) {
    if (!resolvable(e.source) || !resolvable(e.target)) {
      dropped.push({
        tempId: e.tempId,
        kind: "edge",
        stage: "WRAPPER",
        reason: "DANGLING_EDGE_REF",
        detail: `endpoint ${JSON.stringify(!resolvable(e.source) ? e.source : e.target)} does not resolve to a surviving or provided node`,
      });
      continue;
    }
    outEdges.push({
      tempId: e.tempId,
      source: e.source,
      target: e.target,
      type: e.type,
      evidence: e.evidence,
      ...(e.inferenceDistance !== undefined ? { inferenceDistance: e.inferenceDistance } : {}),
      ...(e.modelReportedConfidence !== undefined
        ? { modelReportedConfidence: e.modelReportedConfidence }
        : {}),
    });
  }

  return { output: { nodes: outNodes, edges: outEdges }, dropped, roleLabelCounts };
}
