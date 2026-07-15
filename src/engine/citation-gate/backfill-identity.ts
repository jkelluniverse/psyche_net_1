// IDENTITY-V2 BACKFILL PLANNER (ruling #4, 2026-07-15) — one-time, pure.
//
// The persisted shadow buffer predates candidate identity v2: rows were keyed
// by TYPE::normalizedLabel alone, so the same once-heard theme reworded across
// entries sat as strangers and never accumulated. This planner re-clusters
// the buffer under the SAME rules the live shadow join now applies (gate
// v1.8: specific known key → join; `.core` → similarity + evidence-
// disjointness; novel keys never join on key) so already-held embers can meet
// the next entry as one candidate.
//
// PURE by design: rows in → plan out. No I/O, no clock, no randomness — the
// script wrapper (scripts/backfill-shadow-identity.ts) owns loading, applying,
// and the audit report. The planner NEVER materializes: even a merged cluster
// that now meets the threshold stays in the buffer (flagged report-only)
// until the gate sees it join a real pass — materialization stays the gate's.

import type {
  InferenceDistance,
  NodeType,
  Provenance,
  VerifiedEvidence,
} from "../contracts/extraction-contracts";
import type { GateConfig } from "./config";
import {
  dedupeVerified,
  isCoreKnownKey,
  isSpecificKnownKey,
  labelJaccard,
  lowestDistance,
  matchKey,
} from "./gate";
import { isConferring } from "./mass";

/** A ShadowCandidate row as persisted (nullable columns, parsed cache). */
export interface ShadowRow {
  id: string;
  candidateKey: string;
  kind: string; // "node" | "edge"
  type: NodeType | null;
  label: string | null;
  ontologyKey: string | null;
  provenance: Provenance;
  timesSeen: number;
  distinctSources: number;
  waitingReason: string;
  inferenceDistance: string | null;
  createdAt: Date;
  lastSeen: Date;
  evidenceCache: VerifiedEvidence[];
}

export type MergeReason =
  | "EXACT_LABEL_KEY"
  | "SPECIFIC_KEY"
  | "CORE_KEY_SIMILAR_DISJOINT";

export interface MergedShadowState {
  candidateKey: string;
  type: NodeType;
  label: string;
  ontologyKey: string | null;
  timesSeen: number;
  distinctSources: number;
  waitingReason: string;
  inferenceDistance: InferenceDistance | null;
  lastSeen: Date;
  evidenceCache: VerifiedEvidence[];
  /** Report-only: the merged cache alone would clear materialization. The
   * backfill never materializes — the gate does, on the next real pass. */
  meetsThresholdNow: boolean;
}

export interface MergePlanEntry {
  survivorId: string;
  absorbedIds: string[];
  reason: MergeReason;
  before: { id: string; candidateKey: string; label: string; ontologyKey: string | null; timesSeen: number; spans: number }[];
  after: MergedShadowState;
}

export interface BackfillPlan {
  identityVersion: string;
  gateVersion: string;
  merges: MergePlanEntry[];
  /** Singletons whose stored key drifted from matchKey(type, label). */
  rekeys: { id: string; from: string; to: string }[];
  untouched: number;
  edgesSkipped: number;
}

interface Cluster {
  rows: NodeRow[]; // createdAt/id order (earliest first — the survivor)
  reason: MergeReason | null; // null while singleton
}

type NodeRow = ShadowRow & { kind: "node"; type: NodeType; label: string };

const rowOrder = (a: ShadowRow, b: ShadowRow): number =>
  a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);

/** Mirrors the live join's holderOrder: richest cache first, key ascending. */
const clusterOrder = (a: Cluster, b: Cluster): number =>
  cacheSize(b) - cacheSize(a) ||
  a.rows[0].candidateKey.localeCompare(b.rows[0].candidateKey);
const cacheSize = (c: Cluster): number =>
  c.rows.reduce((n, r) => n + r.evidenceCache.length, 0);

function joinReason(
  cluster: Cluster,
  row: NodeRow,
  config: GateConfig,
): MergeReason | null {
  const head = cluster.rows[0];
  if (head.type !== row.type) return null;
  // Exact normalized-label identity — the pre-v2 key, still the strongest join.
  const rowKey = matchKey(row.type, row.label);
  if (cluster.rows.some((r) => matchKey(r.type, r.label) === rowKey)) {
    return "EXACT_LABEL_KEY";
  }
  const key = row.ontologyKey ?? undefined;
  if (isSpecificKnownKey(key)) {
    return cluster.rows.some((r) => r.ontologyKey === key) ? "SPECIFIC_KEY" : null;
  }
  if (isCoreKnownKey(key)) {
    const clusterSources = new Set(
      cluster.rows.flatMap((r) => r.evidenceCache.map((e) => e.sourceEventId)),
    );
    const similar = cluster.rows.some(
      (r) =>
        r.ontologyKey === key &&
        labelJaccard(r.label, row.label) >=
          config.candidateIdentity.coreJoinLabelJaccardMin,
    );
    const disjoint = !row.evidenceCache.some((e) =>
      clusterSources.has(e.sourceEventId),
    );
    return similar && disjoint ? "CORE_KEY_SIMILAR_DISJOINT" : null;
  }
  return null; // novel or absent key: never joins on key alone
}

/** Rule 3 across N rows: most evidence spans names the node; tie → earliest. */
function clusterLabel(rows: NodeRow[]): NodeRow {
  return rows.reduce((best, r) =>
    r.evidenceCache.length > best.evidenceCache.length ? r : best,
  );
}

function mergedState(rows: NodeRow[], config: GateConfig): MergedShadowState {
  const winner = clusterLabel(rows);
  const cache = dedupeVerified(rows.flatMap((r) => r.evidenceCache));
  const distance = rows.reduce<InferenceDistance | undefined>(
    (acc, r) =>
      lowestDistance(
        acc,
        (r.inferenceDistance as InferenceDistance | null) ?? undefined,
        config.inference.distanceOrder,
      ),
    undefined,
  );
  const heldHighInference = distance === config.inference.heldDistance;
  const conferringSupporting = cache.filter(
    (e) => isConferring(toRecordLike(e), winner.type) && e.polarity === "SUPPORTING",
  );
  const distinct = new Set(cache.map((e) => e.sourceEventId)).size;
  const m = config.materialization;
  return {
    candidateKey: matchKey(winner.type, winner.label),
    type: winner.type,
    label: winner.label,
    // First-seen wins (A-4): the earliest row that carried a key.
    ontologyKey: rows.find((r) => r.ontologyKey !== null)?.ontologyKey ?? null,
    timesSeen: rows.reduce((n, r) => n + r.timesSeen, 0),
    distinctSources: distinct,
    waitingReason: heldHighInference
      ? "HELD_HIGH_INFERENCE"
      : "BELOW_MATERIALIZATION_THRESHOLD",
    inferenceDistance: distance ?? null,
    lastSeen: rows.reduce((d, r) => (r.lastSeen > d ? r.lastSeen : d), rows[0].lastSeen),
    evidenceCache: cache,
    meetsThresholdNow:
      !heldHighInference &&
      conferringSupporting.length >= m.minConferringSpans &&
      new Set(conferringSupporting.map((e) => e.sourceEventId)).size >=
        m.minDistinctSources,
  };
}

/** isConferring reads EvidenceRecord; cached VerifiedEvidence carries the
 * same fields plus its own precomputed flag — shape-bridge, no reinterpretation. */
function toRecordLike(e: VerifiedEvidence) {
  return {
    sourceEventId: e.sourceEventId,
    quote: e.quote,
    spanStart: e.spanStart,
    spanEnd: e.spanEnd,
    occurredAt: e.occurredAt,
    authorship: e.authorship,
    role: e.role,
    polarity: e.polarity,
    sourceInvalidatedAt: null,
  };
}

export function planShadowBackfill(
  rows: ShadowRow[],
  config: GateConfig,
): BackfillPlan {
  const nodeRows = rows
    .filter((r): r is NodeRow => r.kind === "node" && r.type !== null && r.label !== null)
    .sort(rowOrder);
  const edgesSkipped = rows.filter((r) => r.kind !== "node").length;

  // Greedy deterministic clustering: rows in (createdAt, id) order; each row
  // joins the best-ordered matching cluster (mirrors the live holderOrder) or
  // founds its own. Same rows → same clusters, regardless of input order.
  const clusters: Cluster[] = [];
  for (const row of nodeRows) {
    const candidates = clusters
      .map((c) => ({ c, reason: joinReason(c, row, config) }))
      .filter((x): x is { c: Cluster; reason: MergeReason } => x.reason !== null)
      .sort((a, b) => clusterOrder(a.c, b.c));
    if (candidates.length > 0) {
      candidates[0].c.rows.push(row);
      candidates[0].c.reason = candidates[0].reason;
    } else {
      clusters.push({ rows: [row], reason: null });
    }
  }

  const merges: MergePlanEntry[] = [];
  const rekeys: BackfillPlan["rekeys"] = [];
  let untouched = 0;
  for (const cluster of clusters) {
    if (cluster.rows.length > 1) {
      const [survivor, ...absorbed] = cluster.rows;
      merges.push({
        survivorId: survivor.id,
        absorbedIds: absorbed.map((r) => r.id),
        reason: cluster.reason!,
        before: cluster.rows.map((r) => ({
          id: r.id,
          candidateKey: r.candidateKey,
          label: r.label,
          ontologyKey: r.ontologyKey,
          timesSeen: r.timesSeen,
          spans: r.evidenceCache.length,
        })),
        after: mergedState(cluster.rows, config),
      });
      continue;
    }
    const only = cluster.rows[0];
    const derived = matchKey(only.type, only.label);
    if (only.candidateKey !== derived) {
      rekeys.push({ id: only.id, from: only.candidateKey, to: derived });
    } else {
      untouched++;
    }
  }

  return {
    identityVersion: config.candidateIdentity.identityVersion,
    gateVersion: config.gateVersion,
    merges,
    rekeys,
    untouched,
    edgesSkipped,
  };
}
