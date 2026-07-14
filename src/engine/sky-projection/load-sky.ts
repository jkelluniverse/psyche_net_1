// SKY LOADER — persisted graph → the projection's input views.
//
// The only module that turns Prisma rows into PersistedNodeView /
// PersistedEdgeView. Active (non-archived) rows only; effectiveEvidence is
// the node's own Evidence rows with `sourceInvalidatedAt` live-joined from
// the SourceEvent — the projection re-filters fail-closed, but the truth is
// loaded here, never cached. HypothesisEvidenceLink (linked evidence, r2 A-2)
// and Evidence-row invalidation arrive with migration 8: until then linked
// evidence is an empty contribution and `invalidatedAt` is honestly null —
// the CONTRACT (types.ts) already carries both, so the matcher build extends
// this query without touching the projection.

import type { PrismaClient } from "@prisma/client";
import { isConferring } from "../citation-gate/mass";
import type {
  EffectiveEvidenceView,
  PersistedEdgeView,
  PersistedNodeView,
} from "./types";

export interface SkyGraph {
  nodes: PersistedNodeView[];
  edges: PersistedEdgeView[];
}

export async function loadSkyGraph(
  prisma: PrismaClient,
  userId: string,
): Promise<SkyGraph> {
  const [nodes, edges] = await Promise.all([
    prisma.psycheNode.findMany({
      where: { userId, archivedAt: null },
      include: {
        evidence: {
          include: {
            sourceEvent: { select: { invalidatedAt: true, authorship: true } },
          },
          orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.psycheEdge.findMany({
      where: { userId, archivedAt: null },
      orderBy: { id: "asc" },
    }),
  ]);

  return {
    nodes: nodes.map((n) => ({
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
      effectiveEvidence: n.evidence.map(
        (e): EffectiveEvidenceView => ({
          evidenceId: e.id,
          authorship: e.sourceEvent.authorship,
          spanStart: e.spanStart,
          spanEnd: e.spanEnd,
          occurredAt: e.occurredAt,
          polarity: e.polarity,
          // The GATE's rule, imported — never restated (this line once
          // restated it wrong: D8 makes ENACTMENT confer on every type).
          conferring: isConferring(
            {
              authorship: e.sourceEvent.authorship,
              role: e.role,
              sourceInvalidatedAt: e.sourceEvent.invalidatedAt,
            },
            n.type,
          ),
          normalizationVersion: e.normalizationVersion,
          invalidatedAt: null, // Evidence-row invalidation is a migration-8 column
          sourceInvalidatedAt: e.sourceEvent.invalidatedAt,
        }),
      ),
    })),
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
  };
}
