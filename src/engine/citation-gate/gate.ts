// THE CITATION GATE — the deterministic trust boundary (spec §1–§4, LAW 2).
//
// A pure function: gate(proposals, sources, priorGraph, shadowBuffer, now,
// config) → GateResult. Zero model inference inside. The proposer runs
// BEFORE this function and its output is untrusted input; nothing becomes
// graph state without passing here. Fail-closed: any uncertainty about
// whether a quote is present resolves to rejection — it is always safe to
// reject a true proposal (the evidence will recur), never safe to accept a
// false one.
//
// Honest scope (§1.1): this verifies WORDS, not interpretation. Polarity,
// node type, and edge type are model-assigned meanings that pass through
// unverified, guarded downstream by recurrence thresholds, confidence
// penalties, the solo-mode interpretation guard (state.ts), and human
// curation in supervised skins.

import { GATE_CONFIG_V1, type GateConfig } from "./config";
import { computeConfidence } from "./confidence";
import { locateQuote } from "./locate";
import { computeMass, isConferring } from "./mass";
import { normalizeQuote, normalizeWithMap, type NormalizedText } from "./normalize";
import { nextState } from "./state";
import type {
  AcceptedEdge,
  AcceptedNode,
  EvidenceRecord,
  GateResult,
  GraphSnapshot,
  NodeType,
  ProposedEvidence,
  ProposedNode,
  ProposerOutput,
  RejectedItem,
  RejectionReason,
  ShadowCandidate,
  SourceRecord,
  VerifiedEvidence,
} from "./types";

interface EvidenceFailure {
  reason: RejectionReason;
  detail: string;
}

/** Documented dedupe/merge match key (spec §7): type + normalized label. */
function matchKey(type: NodeType, label: string): string {
  return `${type}::${normalizeQuote(label)}`;
}

function evidenceKey(e: {
  sourceEventId: string;
  spanStart: number;
  spanEnd: number;
  role: string;
  polarity: string;
}): string {
  return [e.sourceEventId, e.spanStart, e.spanEnd, e.role, e.polarity].join("|");
}

function dedupeVerified(evidence: VerifiedEvidence[]): VerifiedEvidence[] {
  const seen = new Set<string>();
  const out: VerifiedEvidence[] = [];
  for (const e of evidence) {
    const k = evidenceKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function toRecord(e: VerifiedEvidence): EvidenceRecord {
  return {
    sourceEventId: e.sourceEventId,
    quote: e.quote,
    spanStart: e.spanStart,
    spanEnd: e.spanEnd,
    occurredAt: e.occurredAt,
    authorship: e.authorship,
    role: e.role,
    polarity: e.polarity,
    // Verified against a non-invalidated source this/a prior pass. Persisted
    // evidence carries live invalidation status via GraphSnapshot instead.
    sourceInvalidatedAt: null,
  };
}

function dedupeRecords(records: EvidenceRecord[]): EvidenceRecord[] {
  const seen = new Set<string>();
  const out: EvidenceRecord[] = [];
  for (const r of records) {
    const k = evidenceKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export function gate(
  proposals: ProposerOutput,
  sources: Map<string, SourceRecord>,
  priorGraph: GraphSnapshot,
  shadowBuffer: ShadowCandidate[],
  now: Date,
  config: GateConfig = GATE_CONFIG_V1,
): GateResult {
  const rejected: RejectedItem[] = [];
  const acceptedNodes: AcceptedNode[] = [];
  const acceptedEdges: AcceptedEdge[] = [];
  const ontologyCandidates: { tempId: string; ontologyKey: string }[] = [];

  // Normalize each cited source once (deterministic, cached per call — the
  // cache never escapes, so purity holds).
  const normCache = new Map<string, NormalizedText>();
  const normalizedSource = (record: SourceRecord): NormalizedText => {
    let n = normCache.get(record.id);
    if (!n) {
      n = normalizeWithMap(record.content);
      normCache.set(record.id, n);
    }
    return n;
  };

  // ── The core check (spec §4): verify every quote, fail-closed ─────────────
  function verifyEvidence(
    evidence: ProposedEvidence[],
    nodeType: NodeType | null,
  ): { verified: VerifiedEvidence[]; failures: EvidenceFailure[] } {
    const verified: VerifiedEvidence[] = [];
    const failures: EvidenceFailure[] = [];
    for (const e of evidence) {
      const source = sources.get(e.sourceEventId);
      if (!source) {
        failures.push({
          reason: "SOURCE_NOT_FOUND",
          detail: `cited source event "${e.sourceEventId}" does not exist (quote: "${e.quote}")`,
        });
        continue;
      }
      if (source.invalidatedAt != null) {
        failures.push({
          reason: "SOURCE_INVALIDATED",
          detail: `cited source event "${e.sourceEventId}" was invalidated/superseded (quote: "${e.quote}")`,
        });
        continue;
      }
      const normQ = normalizeQuote(e.quote);
      const hit = locateQuote(normQ, normalizedSource(source), e.offsetHint);
      if (hit.kind === "not_found") {
        failures.push({
          reason: "QUOTE_NOT_FOUND",
          detail: `quote not found in source "${e.sourceEventId}": "${e.quote}"`,
        });
        continue;
      }
      if (hit.kind === "ambiguous") {
        failures.push({
          reason: "AMBIGUOUS_QUOTE",
          detail: `quote occurs ${hit.occurrences} times in source "${e.sourceEventId}" and no offset hint was supplied: "${e.quote}"`,
        });
        continue;
      }
      const role = e.role ?? "SUPPORT";
      verified.push({
        sourceEventId: e.sourceEventId,
        // Canonical quote = the person's words as written in the ORIGINAL.
        quote: source.content.slice(hit.spanStart, hit.spanEnd),
        spanStart: hit.spanStart,
        spanEnd: hit.spanEnd,
        occurredAt: source.occurredAt,
        authorship: source.authorship,
        conferring: isConferring(
          { authorship: source.authorship, role, sourceInvalidatedAt: null },
          nodeType,
        ),
        role,
        polarity: e.polarity ?? "SUPPORTING",
        normalizationVersion: config.normalizationVersion,
      });
    }
    return { verified: dedupeVerified(verified), failures };
  }

  // ── Prior-graph and shadow lookups (spec §3.1a, §7) ────────────────────────
  const existingByKey = new Map(
    priorGraph.nodes.map((n) => [matchKey(n.type, n.label), n] as const),
  );
  const existingIds = new Set(priorGraph.nodes.map((n) => n.id));
  const knownOntologyKeys = new Set<string>([
    ...config.knownOntologyKeys,
    ...priorGraph.nodes.flatMap((n) => (n.ontologyKey ? [n.ontologyKey] : [])),
  ]);
  const shadowByKey = new Map(shadowBuffer.map((s) => [s.candidateKey, s] as const));
  const consumedShadowKeys = new Set<string>();
  const updatedShadow = new Map<string, ShadowCandidate>();

  // ── In-pass dedupe: group proposals sharing a match key (spec §7) ─────────
  const groups = new Map<string, ProposedNode>();
  const tempAlias = new Map<string, string>(); // any grouped tempId → representative
  for (const p of proposals.nodes) {
    const key = matchKey(p.type, p.label);
    const rep = groups.get(key);
    if (!rep) {
      groups.set(key, { ...p, evidence: [...p.evidence] });
      tempAlias.set(p.tempId, p.tempId);
    } else {
      rep.evidence.push(...p.evidence);
      tempAlias.set(p.tempId, rep.tempId);
    }
  }

  // ── Nodes ──────────────────────────────────────────────────────────────────
  for (const [key, p] of groups) {
    const { verified, failures } = verifyEvidence(p.evidence, p.type);

    if (p.provenance === "EXTRACTED") {
      if (p.evidence.length === 0) {
        rejected.push({
          tempId: p.tempId,
          kind: "node",
          reason: "EMPTY_EVIDENCE_NON_HYPOTHESIS",
          detail: `extracted node "${p.label}" proposed with no evidence at all`,
        });
        continue;
      }
      if (verified.length === 0) {
        // Fail-closed: nothing verifiable survives — reject with the first
        // concrete failure (the hallucinated quote is surfaced for telemetry).
        rejected.push({ tempId: p.tempId, kind: "node", ...failures[0] });
        continue;
      }
    }
    // Hypothesis provenances (LENS/BECOMING/PRACTITIONER) may proceed with
    // zero verified evidence — they become mass-0 HYPOTHESIS nodes (LAW 3).
    // Their failed evidence is silently dropped (fail-closed per quote).

    const existing = existingByKey.get(key);
    const shadow =
      !existing && p.provenance === "EXTRACTED" ? shadowByKey.get(key) : undefined;

    const combined = dedupeRecords([
      ...(existing ? existing.evidence : []),
      ...(shadow ? shadow.evidenceCache.map(toRecord) : []),
      ...verified.map(toRecord),
    ]);

    // Materialization threshold (spec §6.1): recurrence, not a single mention.
    if (p.provenance === "EXTRACTED" && !existing) {
      const conferringSupporting = combined.filter(
        (r) => isConferring(r, p.type) && r.polarity === "SUPPORTING",
      );
      const spans = conferringSupporting.length;
      const distinct = new Set(conferringSupporting.map((r) => r.sourceEventId)).size;
      const m = config.materialization;
      if (spans < m.minConferringSpans || distinct < m.minDistinctSources) {
        const cache = dedupeVerified([...(shadow?.evidenceCache ?? []), ...verified]);
        updatedShadow.set(key, {
          candidateKey: key,
          type: p.type,
          provenance: p.provenance,
          label: p.label,
          ontologyKey: p.ontologyKey,
          timesSeen: (shadow?.timesSeen ?? 0) + 1,
          evidenceCache: cache,
          lastSeen: now,
        });
        consumedShadowKeys.add(key);
        rejected.push({
          tempId: p.tempId,
          kind: "node",
          reason: "BELOW_MATERIALIZATION_THRESHOLD",
          detail: `${spans} conferring span(s) across ${distinct} distinct source(s); requires ≥${m.minConferringSpans} across ≥${m.minDistinctSources} — held in shadow buffer`,
        });
        continue;
      }
      if (shadow) consumedShadowKeys.add(key); // promoted out of the buffer
    }

    // Arithmetic — mass, state, confidence: pure functions, versioned.
    const massR = computeMass(combined, p.type, now, config);
    const stateR = nextState(
      existing?.state ?? "HYPOTHESIS",
      combined,
      { nodeType: p.type, provenance: p.provenance },
      now,
      config,
    );
    const ontologyNovel = !!p.ontologyKey && !knownOntologyKeys.has(p.ontologyKey);
    const confR = computeConfidence(combined, { ontologyNovel }, config);
    // LAW 5: an uncharged hypothesis is an explicit low number, never null.
    const confidence =
      stateR.state === "HYPOTHESIS" ? config.confidence.hypothesisFloor : confR.value;
    if (ontologyNovel) {
      ontologyCandidates.push({ tempId: p.tempId, ontologyKey: p.ontologyKey! });
    }

    acceptedNodes.push({
      tempId: p.tempId,
      ...(existing ? { existingNodeId: existing.id } : {}),
      type: p.type,
      provenance: p.provenance,
      label: p.label,
      ontologyKey: p.ontologyKey,
      // Newly verified spans, plus the promoted shadow cache on materialization.
      evidence: dedupeVerified([...(shadow?.evidenceCache ?? []), ...verified]),
      mass: massR.value,
      confidence,
      state: stateR.state,
      derivation: {
        mass: massR.derivation,
        confidence: confR.derivation,
        state: stateR.derivation,
      },
    });
  }

  // ── Edges (spec §4: both endpoints must have survived) ────────────────────
  const acceptedTempIds = new Set(acceptedNodes.map((n) => n.tempId));
  const endpointOk = (ref: string): boolean => {
    const rep = tempAlias.get(ref) ?? ref;
    return acceptedTempIds.has(rep) || existingIds.has(ref);
  };

  for (const e of proposals.edges) {
    if (!endpointOk(e.sourceTempId) || !endpointOk(e.targetTempId)) {
      rejected.push({
        tempId: e.tempId,
        kind: "edge",
        reason: "EDGE_ENDPOINT_REJECTED",
        detail: `edge ${e.sourceTempId} -[${e.type}]-> ${e.targetTempId}: an endpoint was rejected or does not exist`,
      });
      continue;
    }
    const { verified, failures } = verifyEvidence(e.evidence, null);
    if (e.evidence.length > 0 && verified.length === 0) {
      // Evidence was claimed and none of it verified — fail closed.
      rejected.push({ tempId: e.tempId, kind: "edge", ...failures[0] });
      continue;
    }
    // Zero-evidence edges between surviving endpoints are allowed as
    // low-confidence hypothesis edges (spec §4).
    const records = verified.map(toRecord);
    const strengthR = computeMass(records, null, now, config);
    const confR = computeConfidence(records, { ontologyNovel: false }, config);
    const confidence =
      verified.length === 0 ? config.confidence.hypothesisFloor : confR.value;

    const existingEdge = priorGraph.edges.find(
      (pe) =>
        pe.sourceId === e.sourceTempId &&
        pe.targetId === e.targetTempId &&
        pe.type === e.type,
    );

    acceptedEdges.push({
      tempId: e.tempId,
      ...(existingEdge ? { existingEdgeId: existingEdge.id } : {}),
      sourceTempId: tempAlias.get(e.sourceTempId) ?? e.sourceTempId,
      targetTempId: tempAlias.get(e.targetTempId) ?? e.targetTempId,
      type: e.type,
      evidence: verified,
      strength: strengthR.value,
      confidence,
      derivation: { strength: strengthR.derivation, confidence: confR.derivation },
    });
  }

  // ── Assemble, deterministically ordered (idempotency, spec §7) ─────────────
  const shadowOut = [
    ...shadowBuffer.filter((s) => !consumedShadowKeys.has(s.candidateKey)),
    ...updatedShadow.values(),
  ].sort((a, b) => a.candidateKey.localeCompare(b.candidateKey));

  acceptedNodes.sort((a, b) => a.tempId.localeCompare(b.tempId));
  acceptedEdges.sort((a, b) => a.tempId.localeCompare(b.tempId));
  rejected.sort(
    (a, b) => a.tempId.localeCompare(b.tempId) || a.reason.localeCompare(b.reason),
  );
  ontologyCandidates.sort((a, b) => a.tempId.localeCompare(b.tempId));

  return {
    acceptedNodes,
    acceptedEdges,
    shadowBuffer: shadowOut,
    rejected,
    ontologyCandidates,
    gateVersion: config.gateVersion,
    normalizationVersion: config.normalizationVersion,
    massAlgorithmVersion: config.massAlgorithmVersion,
    confidenceAlgorithmVersion: config.confidenceAlgorithmVersion,
    stateAlgorithmVersion: config.stateAlgorithmVersion,
    ontologyVersion: config.ontologyVersion,
  };
}
