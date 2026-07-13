// Parsing and per-candidate validation (proposer spec §10). Fail-closed at
// the envelope; partial validity per candidate — one bad candidate never
// poisons a pass, and semantic problems are never "repaired" into content.

import type {
  EdgeType,
  EvidencePolarity,
  EvidenceRole,
  ExtractableNodeType,
  InferenceDistance,
  NodeRef,
  ProposedEvidence,
} from "../contracts/extraction-contracts";
import type { WrapperRejection } from "../contracts/extraction-contracts";
import type { RawValidatedEdge, RawValidatedNode } from "./types";

// The proposer's closed enum is the EXTRACTABLE types: LENS and BECOMING are
// never proposable by extraction in any mode (they enter through their own
// lanes, §6/§13.4) — a model emitting them fails shape validation outright.
// WOUND is structurally extractable but policy-governed (§7 guard 1).
const NODE_TYPES: ReadonlySet<string> = new Set([
  "WOUND",
  "SHADOW",
  "BELIEF",
  "PROTECTION",
  "PATTERN",
  "TRAIT",
  "RESOURCE",
]);
const EDGE_TYPES: ReadonlySet<string> = new Set([
  "DRIVES",
  "PROTECTS_FROM",
  "EXPRESSES_AS",
  "ROOTED_IN",
  "REINFORCES",
  "SOFTENED_BY",
]);
const ROLES: ReadonlySet<string> = new Set(["SUPPORT", "DECLARATION", "ENACTMENT"]);
const POLARITIES: ReadonlySet<string> = new Set(["SUPPORTING", "COUNTERVAILING"]);
const INFERENCE: ReadonlySet<string> = new Set([
  "DIRECT_DECLARATION",
  "DIRECT_BEHAVIOR",
  "LOW_INFERENCE_PATTERN",
  "HIGH_INFERENCE_INTERPRETATION",
]);

export type EnvelopeResult =
  | { ok: true; nodes: unknown[]; edges: unknown[] }
  | { ok: false; error: string };

/**
 * Parse the whole response and validate the top-level envelope. Anything
 * other than a JSON object with `nodes` and `edges` arrays — prose,
 * meta-commentary, code fences, truncation — is an envelope failure
 * (repairable exactly once; never partially salvaged).
 */
export function parseEnvelope(text: string): EnvelopeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch (e) {
    return { ok: false, error: `response is not valid JSON: ${(e as Error).message}` };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "response is not a JSON object" };
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
    return { ok: false, error: 'response must contain "nodes" and "edges" arrays' };
  }
  return { ok: true, nodes: obj.nodes, edges: obj.edges };
}

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;

interface EvidenceValidation {
  ok: boolean;
  evidence: ProposedEvidence[];
  reason?: string;
}

/**
 * Validate an evidence array. Shape-invalid entries fail the candidate
 * (fail-closed); entries citing ids outside the provided source set are
 * filtered (the model cannot mint or reference unknown ids, §4).
 */
function validateEvidence(raw: unknown, allowedSourceIds: ReadonlySet<string>): EvidenceValidation {
  if (!Array.isArray(raw)) return { ok: false, evidence: [], reason: "evidence is not an array" };
  const out: ProposedEvidence[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== "object") {
      return { ok: false, evidence: [], reason: "malformed evidence entry" };
    }
    const e = entry as Record<string, unknown>;
    if (!isNonEmptyString(e.sourceEventId) || !isNonEmptyString(e.quote)) {
      return { ok: false, evidence: [], reason: "evidence entry missing sourceEventId/quote" };
    }
    if (e.role !== undefined && !ROLES.has(e.role as string)) {
      return { ok: false, evidence: [], reason: `unknown evidence role "${String(e.role)}"` };
    }
    if (e.polarity !== undefined && !POLARITIES.has(e.polarity as string)) {
      return { ok: false, evidence: [], reason: `unknown polarity "${String(e.polarity)}"` };
    }
    if (!allowedSourceIds.has(e.sourceEventId)) continue; // minted id → filtered
    out.push({
      sourceEventId: e.sourceEventId,
      quote: e.quote,
      ...(typeof e.offsetHint === "number" && Number.isFinite(e.offsetHint)
        ? { offsetHint: e.offsetHint }
        : {}),
      ...(e.role !== undefined ? { role: e.role as EvidenceRole } : {}),
      ...(e.polarity !== undefined ? { polarity: e.polarity as EvidencePolarity } : {}),
      ...(isNonEmptyString(e.evidenceRationale)
        ? { evidenceRationale: e.evidenceRationale }
        : {}),
    });
  }
  return { ok: true, evidence: out };
}

function validNodeRef(raw: unknown): NodeRef | null {
  if (raw === null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind === "PROPOSED" && isNonEmptyString(r.tempId)) {
    return { kind: "PROPOSED", tempId: r.tempId };
  }
  if (r.kind === "EXISTING" && isNonEmptyString(r.nodeId)) {
    return { kind: "EXISTING", nodeId: r.nodeId };
  }
  return null;
}

export interface CandidateValidationResult {
  nodes: RawValidatedNode[];
  edges: RawValidatedEdge[];
  rejected: WrapperRejection[];
}

export function validateCandidates(
  rawNodes: unknown[],
  rawEdges: unknown[],
  allowedSourceIds: ReadonlySet<string>,
): CandidateValidationResult {
  const nodes: RawValidatedNode[] = [];
  const edges: RawValidatedEdge[] = [];
  const rejected: WrapperRejection[] = [];

  const tempIdOf = (raw: unknown): string => {
    const t = (raw as Record<string, unknown> | null)?.tempId;
    return isNonEmptyString(t) ? t : "(missing tempId)";
  };

  for (const raw of rawNodes) {
    const reject = (detail: string, reason: WrapperRejection["reason"] = "SHAPE_INVALID") =>
      rejected.push({ tempId: tempIdOf(raw), kind: "node", stage: "WRAPPER", reason, detail });
    if (raw === null || typeof raw !== "object") {
      reject("candidate is not an object");
      continue;
    }
    const n = raw as Record<string, unknown>;
    if (!isNonEmptyString(n.tempId)) {
      reject("missing tempId");
      continue;
    }
    if (!NODE_TYPES.has(n.type as string) ) {
      reject(
        `type "${String(n.type)}" is not an extractable node type (closed enum; extensibility is ontologyKey only)`,
      );
      continue;
    }
    if (!isNonEmptyString(n.label)) {
      reject("missing or malformed label");
      continue;
    }
    const ev = validateEvidence(n.evidence, allowedSourceIds);
    if (!ev.ok) {
      reject(`malformed evidence: ${ev.reason}`);
      continue;
    }
    if (ev.evidence.length === 0) {
      // Extraction proposes only evidence-bearing candidates; hypothesis
      // seeds enter through their own lanes, never through this wrapper.
      reject(
        Array.isArray(n.evidence) && n.evidence.length > 0
          ? "no valid evidence remains (cited source ids outside the provided set)"
          : "extracted candidate with no evidence",
        "NO_VALID_EVIDENCE",
      );
      continue;
    }
    if (n.inferenceDistance !== undefined && !INFERENCE.has(n.inferenceDistance as string)) {
      reject(`unknown inferenceDistance "${String(n.inferenceDistance)}"`);
      continue;
    }
    nodes.push({
      tempId: n.tempId,
      type: n.type as ExtractableNodeType,
      label: n.label,
      ...(isNonEmptyString(n.ontologyKey) ? { ontologyKey: n.ontologyKey } : {}),
      evidence: ev.evidence,
      ...(n.inferenceDistance !== undefined
        ? { inferenceDistance: n.inferenceDistance as InferenceDistance }
        : {}),
      ...(typeof n.modelReportedConfidence === "number" &&
      Number.isFinite(n.modelReportedConfidence)
        ? { modelReportedConfidence: n.modelReportedConfidence }
        : {}),
    });
  }

  for (const raw of rawEdges) {
    const reject = (detail: string, reason: WrapperRejection["reason"] = "SHAPE_INVALID") =>
      rejected.push({ tempId: tempIdOf(raw), kind: "edge", stage: "WRAPPER", reason, detail });
    if (raw === null || typeof raw !== "object") {
      reject("candidate is not an object");
      continue;
    }
    const e = raw as Record<string, unknown>;
    if (!isNonEmptyString(e.tempId)) {
      reject("missing tempId");
      continue;
    }
    if (!EDGE_TYPES.has(e.type as string)) {
      reject(`unknown edge type "${String(e.type)}"`);
      continue;
    }
    const source = validNodeRef(e.source);
    const target = validNodeRef(e.target);
    if (!source || !target) {
      reject("malformed endpoint NodeRef");
      continue;
    }
    const ev = validateEvidence(e.evidence ?? [], allowedSourceIds);
    if (!ev.ok) {
      reject(`malformed evidence: ${ev.reason}`);
      continue;
    }
    edges.push({
      tempId: e.tempId,
      source,
      target,
      type: e.type as EdgeType,
      evidence: ev.evidence,
      ...(e.inferenceDistance !== undefined && INFERENCE.has(e.inferenceDistance as string)
        ? { inferenceDistance: e.inferenceDistance as InferenceDistance }
        : {}),
      ...(typeof e.modelReportedConfidence === "number" &&
      Number.isFinite(e.modelReportedConfidence)
        ? { modelReportedConfidence: e.modelReportedConfidence }
        : {}),
    });
  }

  return { nodes, edges, rejected };
}
