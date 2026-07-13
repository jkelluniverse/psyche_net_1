// Shared test fixtures/builders for the citation-gate suite.
// All dates are fixed — the gate takes `now` explicitly, so tests are exact.

import type {
  Authorship,
  EvidencePolarity,
  EvidenceRecord,
  EvidenceRole,
  ExistingNode,
  GraphSnapshot,
  NodeType,
  ProposedEvidence,
  ProposedNode,
  Provenance,
  ProposerOutput,
  SourceRecord,
} from "../types";

/** The fixed "now" every test computes against. */
export const NOW = new Date("2026-07-01T12:00:00.000Z");

export function daysAgo(n: number, from: Date = NOW): Date {
  return new Date(from.getTime() - n * 24 * 60 * 60 * 1000);
}

export function src(
  id: string,
  content: string,
  opts: {
    authorship?: Authorship;
    occurredAt?: Date;
    invalidatedAt?: Date | null;
  } = {},
): SourceRecord {
  return {
    id,
    content,
    authorship: opts.authorship ?? "SELF",
    occurredAt: opts.occurredAt ?? daysAgo(7),
    invalidatedAt: opts.invalidatedAt ?? null,
  };
}

export function sourceMap(...records: SourceRecord[]): Map<string, SourceRecord> {
  return new Map(records.map((r) => [r.id, r]));
}

export function ev(
  sourceEventId: string,
  quote: string,
  opts: { offsetHint?: number; role?: EvidenceRole; polarity?: EvidencePolarity } = {},
): ProposedEvidence {
  return { sourceEventId, quote, ...opts };
}

export function node(
  tempId: string,
  label: string,
  evidence: ProposedEvidence[],
  opts: { type?: NodeType; provenance?: Provenance; ontologyKey?: string } = {},
): ProposedNode {
  return {
    tempId,
    type: opts.type ?? "BELIEF",
    provenance: opts.provenance ?? "EXTRACTED",
    label,
    ontologyKey: opts.ontologyKey,
    evidence,
  };
}

export function proposals(
  nodes: ProposedNode[] = [],
  edges: ProposerOutput["edges"] = [],
): ProposerOutput {
  return { nodes, edges };
}

export const EMPTY_GRAPH: GraphSnapshot = { nodes: [], edges: [] };

export function evidenceRecord(
  sourceEventId: string,
  quote: string,
  opts: {
    spanStart?: number;
    spanEnd?: number;
    occurredAt?: Date;
    authorship?: Authorship;
    role?: EvidenceRole;
    polarity?: EvidencePolarity;
    sourceInvalidatedAt?: Date | null;
  } = {},
): EvidenceRecord {
  return {
    sourceEventId,
    quote,
    spanStart: opts.spanStart ?? 0,
    spanEnd: opts.spanEnd ?? quote.length,
    occurredAt: opts.occurredAt ?? daysAgo(7),
    authorship: opts.authorship ?? "SELF",
    role: opts.role ?? "SUPPORT",
    polarity: opts.polarity ?? "SUPPORTING",
    sourceInvalidatedAt: opts.sourceInvalidatedAt ?? null,
  };
}

export function existingNode(
  id: string,
  label: string,
  evidence: EvidenceRecord[],
  opts: {
    type?: NodeType;
    provenance?: Provenance;
    state?: ExistingNode["state"];
    ontologyKey?: string;
  } = {},
): ExistingNode {
  return {
    id,
    type: opts.type ?? "BELIEF",
    provenance: opts.provenance ?? "EXTRACTED",
    label,
    ontologyKey: opts.ontologyKey,
    state: opts.state ?? "ACTIVE",
    evidence,
  };
}

/**
 * Deterministic PRNG (mulberry32) for the fail-closed fuzz test — seeded, so
 * the "random" adversarial inputs are identical on every run (idempotency of
 * the test itself).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
