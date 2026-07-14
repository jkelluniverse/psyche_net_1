// LIST MODEL — the canonical accessible surface's data (renderer-lens spec
// §2, LAW 5: no information may exist only spatially or in motion).
//
// A pure function of the SkyViewModel — the SAME model the canvas renders,
// already veiled and already watermarked. That is the whole trick: the list
// cannot leak what the projection never gave it (content parity IS the veil
// proof), and it cannot drift from the sky because both read one model.
// Grouped by node type then state, deterministically ordered; edges grouped
// by type with endpoint labels resolved from the same veiled entries.

import type {
  ConfidenceBand,
  SkyEdgeVM,
  SkyNodeVM,
  SkyViewModel,
} from "./types";
import type { NodeState, NodeType, EdgeType } from "@prisma/client";

export interface ListNodeEntry {
  id: string;
  /** Verbatim from the view model — veil copy / watermark already applied. */
  label: string;
  state: NodeState;
  veiled: boolean;
  confidence: number;
  confidenceBand: ConfidenceBand;
  evidenceCount: number;
  /** The ghost badge for HYPOTHESIS entries; null otherwise. */
  hypothesisBadge: string | null;
  provenanceCopy: string | null;
  dimmed: boolean;
  struck: boolean;
}

export interface ListNodeGroup {
  type: NodeType;
  state: NodeState;
  entries: ListNodeEntry[];
}

export interface ListEdgeEntry {
  id: string;
  sourceId: string;
  targetId: string;
  /** Endpoint labels from the same veiled view model. */
  sourceLabel: string;
  targetLabel: string;
  confidence: number;
  confidenceBand: ConfidenceBand;
}

export interface ListEdgeGroup {
  type: EdgeType;
  entries: ListEdgeEntry[];
}

export interface SkyListModel {
  projectionVersion: string;
  rendererConfigVersion: string;
  nodeGroups: ListNodeGroup[];
  edgeGroups: ListEdgeGroup[];
  fringe: { copy: string; treatment: string };
}

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function listModel(vm: SkyViewModel): SkyListModel {
  const labelById = new Map(vm.nodes.map((n) => [n.id, n.label]));

  const nodeGroups = new Map<string, ListNodeGroup>();
  for (const n of vm.nodes) {
    const key = `${n.type}/${n.state}`;
    let group = nodeGroups.get(key);
    if (!group) {
      group = { type: n.type, state: n.state, entries: [] };
      nodeGroups.set(key, group);
    }
    group.entries.push(toNodeEntry(n));
  }

  const edgeGroups = new Map<EdgeType, ListEdgeGroup>();
  for (const e of vm.edges) {
    let group = edgeGroups.get(e.type);
    if (!group) {
      group = { type: e.type, entries: [] };
      edgeGroups.set(e.type, group);
    }
    group.entries.push(toEdgeEntry(e, labelById));
  }

  return {
    projectionVersion: vm.projectionVersion,
    rendererConfigVersion: vm.rendererConfigVersion,
    nodeGroups: [...nodeGroups.values()]
      .map((g) => ({ ...g, entries: [...g.entries].sort((a, b) => cmp(a.id, b.id)) }))
      .sort((a, b) => cmp(`${a.type}/${a.state}`, `${b.type}/${b.state}`)),
    edgeGroups: [...edgeGroups.values()]
      .map((g) => ({ ...g, entries: [...g.entries].sort((a, b) => cmp(a.id, b.id)) }))
      .sort((a, b) => cmp(a.type, b.type)),
    fringe: vm.fringe,
  };
}

function toNodeEntry(n: SkyNodeVM): ListNodeEntry {
  return {
    id: n.id,
    label: n.label,
    state: n.state,
    veiled: n.veiled,
    confidence: n.confidence,
    confidenceBand: n.confidenceBand,
    evidenceCount: n.evidenceCount,
    hypothesisBadge: n.ghost?.badge ?? null,
    provenanceCopy: n.provenanceCopy,
    dimmed: n.dimmed,
    struck: n.struck,
  };
}

function toEdgeEntry(
  e: SkyEdgeVM,
  labelById: Map<string, string>,
): ListEdgeEntry {
  return {
    id: e.id,
    sourceId: e.sourceId,
    targetId: e.targetId,
    sourceLabel: labelById.get(e.sourceId) ?? "(unknown)",
    targetLabel: labelById.get(e.targetId) ?? "(unknown)",
    confidence: e.confidence,
    confidenceBand: e.confidenceBand,
  };
}
