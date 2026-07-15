// SKY LOADER — persisted graph → the projection's input views.
//
// The only module that turns Prisma rows into PersistedNodeView /
// PersistedEdgeView. Active (non-archived) rows only. Since migration 8:
// - effectiveEvidence (r2 A-2) = the node's OWN Evidence rows ∪ rows linked
//   via live HypothesisEvidenceLink — each LIVE-JOINED to the current
//   SourceEvent (authorship, invalidatedAt read at load time, never cached),
//   canonically sorted (occurredAt, then evidenceId), deduplicated. A
//   charged ghost brightens and explains itself exactly like an extracted
//   node, because it reads the same rows.
// - matchLinks: the NON-PERSISTED rendering overlay (LensMatchLinkView[])
//   computed from the link table — what the matched-pair treatment renders.
// - pendingConfirmation: derived through the matcher's OWN exported rule
//   (isPendingConfirmation) — a second definition here would drift.
// Conferring is the GATE's isConferring, imported — never restated.

import { Prisma, type PrismaClient } from "@prisma/client";
import { GATE_CONFIG_V1 } from "../citation-gate/config";
import { isConferring } from "../citation-gate/mass";
import { isPendingConfirmation } from "../hypothesis-match/recompute";
import type {
  EvidenceRecord,
  NodeState,
  NodeType,
  Provenance,
} from "../contracts/extraction-contracts";
import type {
  EffectiveEvidenceView,
  FormingPointView,
  LensMatchLinkView,
  PersistedEdgeView,
  PersistedNodeView,
} from "./types";

export interface SkyGraph {
  nodes: PersistedNodeView[];
  edges: PersistedEdgeView[];
  matchLinks: LensMatchLinkView[];
  /** Shadow EXISTENCE only (Jacob's LAW-5 ruling): id + dates + count.
   * The candidate's content never leaves this loader. */
  forming: FormingPointView[];
}

interface JoinedEvidence {
  id: string;
  spanStart: number;
  spanEnd: number;
  quote: string;
  occurredAt: Date;
  polarity: "SUPPORTING" | "COUNTERVAILING";
  role: "SUPPORT" | "DECLARATION" | "ENACTMENT";
  sourceEventId: string;
  sourceEvent: { authorship: "SELF" | "PRACTITIONER"; invalidatedAt: Date | null };
}

const evidenceInclude = {
  sourceEvent: {
    select: { authorship: true, invalidatedAt: true },
  },
} as const;

function toView(e: JoinedEvidence, nodeType: NodeType): EffectiveEvidenceView {
  return {
    evidenceId: e.id,
    authorship: e.sourceEvent.authorship,
    spanStart: e.spanStart,
    spanEnd: e.spanEnd,
    occurredAt: e.occurredAt,
    polarity: e.polarity,
    conferring: isConferring(
      {
        authorship: e.sourceEvent.authorship,
        role: e.role,
        sourceInvalidatedAt: e.sourceEvent.invalidatedAt,
      },
      nodeType,
    ),
    normalizationVersion: "v1",
    invalidatedAt: null, // Evidence-row-level invalidation has no column: LAW-8 erasure deletes the row
    sourceInvalidatedAt: e.sourceEvent.invalidatedAt,
  };
}

function toRecord(e: JoinedEvidence): EvidenceRecord {
  return {
    sourceEventId: e.sourceEventId,
    quote: e.quote,
    spanStart: e.spanStart,
    spanEnd: e.spanEnd,
    occurredAt: e.occurredAt,
    authorship: e.sourceEvent.authorship,
    role: e.role,
    polarity: e.polarity,
    sourceInvalidatedAt: e.sourceEvent.invalidatedAt,
  };
}

export async function loadSkyGraph(
  prisma: PrismaClient,
  userId: string,
  now: Date = new Date(),
): Promise<SkyGraph> {
  const [nodes, edges, supervised, shadowRows] = await Promise.all([
    prisma.psycheNode.findMany({
      where: { userId, archivedAt: null },
      include: {
        evidence: {
          include: evidenceInclude,
          orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
        },
        hypothesisLinks: {
          where: { invalidatedAt: null, evidenceId: { not: null } },
          include: {
            evidence: { include: evidenceInclude },
          },
        },
        confirmations: {
          where: { withdrawnAt: null },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.psycheEdge.findMany({
      where: { userId, archivedAt: null },
      orderBy: { id: "asc" },
    }),
    prisma.practitionerClient.findFirst({
      where: { clientId: userId },
      select: { id: true },
    }),
    // Node-kind shadow candidates (edge candidates carry sourceRef). The
    // SELECT is the redaction: label/evidenceCache never leave the row.
    prisma.shadowCandidate.findMany({
      // AnyNull: node-kind rows store sourceRef as SQL NULL (column omitted
      // at insert); JSON-null would also mean "not an edge". Both count.
      where: { userId, sourceRef: { equals: Prisma.AnyNull } },
      select: { id: true, createdAt: true, lastSeen: true, timesSeen: true },
      orderBy: { id: "asc" },
    }),
  ]);
  const mode = supervised ? ("SUPERVISED" as const) : ("SOLO" as const);
  const gateConfig = { ...GATE_CONFIG_V1, mode };

  const matchLinks: LensMatchLinkView[] = [];

  const nodeViews = nodes.map((n): PersistedNodeView => {
    // Merged, deduplicated, canonically ordered effective evidence.
    const seen = new Set<string>();
    const joined: JoinedEvidence[] = [];
    for (const e of n.evidence as unknown as JoinedEvidence[]) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        joined.push(e);
      }
    }
    const byExtractedNode = new Map<string, string[]>();
    for (const l of n.hypothesisLinks) {
      const ev = l.evidence as unknown as (JoinedEvidence & { nodeId: string | null }) | null;
      if (!ev) continue;
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        joined.push(ev);
      }
      if (ev.nodeId) {
        const list = byExtractedNode.get(ev.nodeId) ?? [];
        list.push(ev.id);
        byExtractedNode.set(ev.nodeId, list);
      }
    }
    for (const [extractedNodeId, evidenceIds] of byExtractedNode) {
      matchLinks.push({
        lensNodeId: n.id,
        extractedNodeId,
        evidenceIds: evidenceIds.sort(),
      });
    }
    joined.sort(
      (a, b) =>
        a.occurredAt.getTime() - b.occurredAt.getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );

    const pendingConfirmation =
      n.provenance === "LENS" &&
      isPendingConfirmation(joined.map(toRecord), {
        currentState: n.state as NodeState,
        nodeType: n.type as NodeType,
        provenance: n.provenance as Provenance,
        mode,
        hasActiveGround: n.confirmations.some((c) => c.direction === "GROUND"),
        now,
        gateConfig,
      });

    return {
      id: n.id,
      type: n.type,
      provenance: n.provenance,
      label: n.label,
      ontologyKey: n.ontologyKey,
      mass: n.mass,
      confidence: n.confidence,
      state: n.state,
      lensMapVersion: n.lensMapVersion,
      chartImportId: n.chartImportId,
      pendingConfirmation,
      effectiveEvidence: joined.map((e) => toView(e, n.type as NodeType)),
    };
  });

  return {
    nodes: nodeViews,
    edges: edges.map(
      (e): PersistedEdgeView => ({
        id: e.id,
        sourceId: e.sourceId,
        targetId: e.targetId,
        type: e.type,
        strength: e.strength,
        confidence: e.confidence,
      }),
    ),
    forming: shadowRows.map(
      (r): FormingPointView => ({
        id: r.id,
        firstSeenAt: r.createdAt,
        lastSeenAt: r.lastSeen,
        timesSeen: r.timesSeen,
      }),
    ),
    matchLinks: matchLinks.sort(
      (a, b) =>
        (a.lensNodeId < b.lensNodeId ? -1 : a.lensNodeId > b.lensNodeId ? 1 : 0) ||
        (a.extractedNodeId < b.extractedNodeId ? -1 : 1),
    ),
  };
}
