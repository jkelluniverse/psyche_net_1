// THE PROJECTION WRITER (master concept §4.3): GateResult → Postgres.
//
// The only code that writes graph state. Everything it persists has passed
// the citation gate; the DB CHECK constraints (Evidence.validated = true;
// exactly one of nodeId/edgeId) are the final structural backstop under it.
// One transaction per pass — a pass lands whole or not at all.
//
// Outcome mapping (gate spec v1.6 §7): accepted → "accepted"; hold reasons
// (BELOW_MATERIALIZATION_THRESHOLD, HELD_HIGH_INFERENCE, WAITING_ENDPOINT)
// → "shadow"; everything else rejected → "rejected". Holds are excluded from
// rejection-rate telemetry. The wrapper never writes "shadow" — this module,
// downstream of the gate, is the sole writer of that outcome.

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { normalizeQuote } from "../citation-gate/normalize";
import type {
  EvidenceRecord,
  GateResult,
  GraphSnapshot,
  NodeRef,
  ProposerOutput,
  ShadowCandidate,
  VerifiedEvidence,
  WrapperRejection,
} from "../contracts/extraction-contracts";

type Tx = Prisma.TransactionClient;

const HOLD_REASONS = new Set([
  "BELOW_MATERIALIZATION_THRESHOLD",
  "HELD_HIGH_INFERENCE",
  "WAITING_ENDPOINT",
]);

export interface WriteGateResultInput {
  userId: string;
  /** Must equal the persisted ExtractionRun.id (proposer spec §4). */
  runId: string;
  /** What entered the gate — persisted per-proposal with its outcome. */
  proposerOutput: ProposerOutput;
  /** Wrapper-stage drops/rejections (stage WRAPPER, reasons disjoint from gate's). */
  wrapperRejections: WrapperRejection[];
  gateResult: GateResult;
  /** candidateKeys that were LOADED into this gate pass — rows absent from
   * the output buffer among these were promoted and leave the table (their
   * evidence now lives as real Evidence rows; nothing is lost). */
  loadedShadowKeys: string[];
  /** Explicit clock for computedAt stamps (replay-exact, like the gate). */
  now: Date;
}

export interface WriteReport {
  nodeIdByTempId: Record<string, string>;
  createdNodes: number;
  updatedNodes: number;
  createdEdges: number;
  updatedEdges: number;
  evidenceRows: number;
  proposals: { accepted: number; rejected: number; shadow: number };
  shadowUpserts: number;
  shadowDeletes: number;
}

const evidenceKey = (e: {
  sourceEventId: string;
  spanStart: number;
  spanEnd: number;
  role: string;
  polarity: string;
}): string => [e.sourceEventId, e.spanStart, e.spanEnd, e.role, e.polarity].join("|");

/** Serialize a VerifiedEvidence cache for the Json column (dates → ISO). */
function serializeCache(cache: VerifiedEvidence[]): Prisma.InputJsonValue {
  return cache.map((e) => ({ ...e, occurredAt: e.occurredAt.toISOString() }));
}

async function writeEvidence(
  tx: Tx,
  target: { nodeId: string } | { edgeId: string },
  evidence: VerifiedEvidence[],
): Promise<number> {
  const existing = await tx.evidence.findMany({
    where: target,
    select: { sourceEventId: true, spanStart: true, spanEnd: true, role: true, polarity: true },
  });
  const seen = new Set(existing.map(evidenceKey));
  let written = 0;
  for (const e of evidence) {
    if (seen.has(evidenceKey(e))) continue; // idempotent re-merge: same span skipped
    seen.add(evidenceKey(e));
    await tx.evidence.create({
      data: {
        ...target,
        sourceEventId: e.sourceEventId,
        quote: e.quote,
        spanStart: e.spanStart,
        spanEnd: e.spanEnd,
        occurredAt: e.occurredAt,
        role: e.role,
        polarity: e.polarity,
        normalizationVersion: e.normalizationVersion,
        validated: true, // set ONLY here, ONLY for gate output (LAW 2; DB CHECK)
      },
    });
    written++;
  }
  return written;
}

export async function writeGateResult(
  prisma: PrismaClient,
  input: WriteGateResultInput,
): Promise<WriteReport> {
  const { userId, runId, gateResult: gr, now } = input;

  return prisma.$transaction(async (tx) => {
    const report: WriteReport = {
      nodeIdByTempId: {},
      createdNodes: 0,
      updatedNodes: 0,
      createdEdges: 0,
      updatedEdges: 0,
      evidenceRows: 0,
      proposals: { accepted: 0, rejected: 0, shadow: 0 },
      shadowUpserts: 0,
      shadowDeletes: 0,
    };
    const versionStamps = {
      massAlgorithmVersion: gr.massAlgorithmVersion,
      confidenceAlgorithmVersion: gr.confidenceAlgorithmVersion,
      stateAlgorithmVersion: gr.stateAlgorithmVersion,
      gateVersion: gr.gateVersion,
      computedAt: now,
    };

    // ── Nodes ────────────────────────────────────────────────────────────────
    for (const n of gr.acceptedNodes) {
      let nodeId: string;
      if (n.existingNodeId) {
        await tx.psycheNode.update({
          where: { id: n.existingNodeId },
          data: { mass: n.mass, confidence: n.confidence, state: n.state, ...versionStamps },
        });
        nodeId = n.existingNodeId;
        report.updatedNodes++;
      } else {
        const created = await tx.psycheNode.create({
          data: {
            userId,
            type: n.type,
            provenance: n.provenance,
            label: n.label,
            ontologyKey: n.ontologyKey,
            mass: n.mass,
            confidence: n.confidence,
            state: n.state,
            ...versionStamps,
          },
        });
        nodeId = created.id;
        report.createdNodes++;
      }
      report.nodeIdByTempId[n.tempId] = nodeId;
      report.evidenceRows += await writeEvidence(tx, { nodeId }, n.evidence);
    }

    // ── Edges (NodeRef → persisted ids, resolved by KIND) ────────────────────
    const resolve = (ref: NodeRef): string => {
      if (ref.kind === "EXISTING") return ref.nodeId;
      const id = report.nodeIdByTempId[ref.tempId];
      if (!id) {
        throw new Error(
          `writer invariant violated: accepted edge references PROPOSED tempId "${ref.tempId}" with no accepted node`,
        );
      }
      return id;
    };
    for (const e of gr.acceptedEdges) {
      const sourceId = resolve(e.source);
      const targetId = resolve(e.target);
      const existing = await tx.psycheEdge.findUnique({
        where: { sourceId_targetId_type: { sourceId, targetId, type: e.type } },
      });
      let edgeId: string;
      if (existing) {
        await tx.psycheEdge.update({
          where: { id: existing.id },
          data: { strength: e.strength, confidence: e.confidence },
        });
        edgeId = existing.id;
        report.updatedEdges++;
      } else {
        const created = await tx.psycheEdge.create({
          data: { userId, sourceId, targetId, type: e.type, strength: e.strength, confidence: e.confidence },
        });
        edgeId = created.id;
        report.createdEdges++;
      }
      report.evidenceRows += await writeEvidence(tx, { edgeId }, e.evidence);
    }

    // ── Shadow buffer sync (upsert output; remove promoted) ─────────────────
    const outputKeys = new Set(gr.shadowBuffer.map((c) => c.candidateKey));
    for (const c of gr.shadowBuffer) {
      const common = {
        provenance: c.provenance,
        timesSeen: c.timesSeen,
        distinctSources: c.distinctSources,
        waitingReason: c.waitingReason,
        inferenceDistance: c.inferenceDistance ?? null,
        evidenceCache: serializeCache(c.evidenceCache),
        lastSeen: c.lastSeen,
      };
      const kindFields =
        c.kind === "node"
          ? { kind: "node", type: c.type, label: c.label, ontologyKey: c.ontologyKey ?? null, edgeType: null, sourceRef: Prisma.JsonNull, targetRef: Prisma.JsonNull }
          : { kind: "edge", type: null, label: null, ontologyKey: null, edgeType: c.edgeType, sourceRef: c.sourceRef as unknown as Prisma.InputJsonValue, targetRef: c.targetRef as unknown as Prisma.InputJsonValue };
      await tx.shadowCandidate.upsert({
        where: { userId_candidateKey: { userId, candidateKey: c.candidateKey } },
        update: { ...common, ...kindFields },
        create: { userId, candidateKey: c.candidateKey, ...common, ...kindFields },
      });
      report.shadowUpserts++;
    }
    const promoted = input.loadedShadowKeys.filter((k) => !outputKeys.has(k));
    if (promoted.length > 0) {
      const del = await tx.shadowCandidate.deleteMany({
        where: { userId, candidateKey: { in: promoted } },
      });
      report.shadowDeletes = del.count;
    }

    // ── Proposals: the outcome mapping ───────────────────────────────────────
    const acceptedTemp = new Set([
      ...gr.acceptedNodes.map((n) => n.tempId),
      ...gr.acceptedEdges.map((e) => e.tempId),
    ]);
    const gateRejectedByTemp = new Map(gr.rejected.map((r) => [r.tempId, r] as const));
    const wrapperByTemp = new Map(input.wrapperRejections.map((r) => [r.tempId, r] as const));

    type Outcome = { outcome: "accepted" | "rejected" | "shadow"; rejectionReason: string | null };
    const outcomeForTemp = (tempId: string): Outcome | null => {
      if (acceptedTemp.has(tempId)) return { outcome: "accepted", rejectionReason: null };
      const gateR = gateRejectedByTemp.get(tempId);
      if (gateR) {
        return HOLD_REASONS.has(gateR.reason)
          ? { outcome: "shadow", rejectionReason: gateR.reason }
          : { outcome: "rejected", rejectionReason: gateR.reason };
      }
      const wr = wrapperByTemp.get(tempId);
      if (wr) return { outcome: "rejected", rejectionReason: wr.reason };
      return null;
    };
    // In-pass duplicates merge inside the gate under a representative tempId;
    // an uncovered node proposal inherits its representative's outcome via the
    // SAME match key the gate grouped by (type::normalizedLabel).
    const outcomeByKey = new Map<string, Outcome>();
    for (const p of input.proposerOutput.nodes) {
      const o = outcomeForTemp(p.tempId);
      if (o) outcomeByKey.set(`${p.type}::${normalizeQuote(p.label)}`, o);
    }

    const rows: Prisma.ProposalCreateManyInput[] = [];
    const record = (kind: "node" | "edge", payload: unknown, o: Outcome) => {
      rows.push({
        runId,
        kind,
        payload: payload as Prisma.InputJsonValue,
        outcome: o.outcome,
        rejectionReason: o.rejectionReason,
      });
      report.proposals[o.outcome]++;
    };
    for (const p of input.proposerOutput.nodes) {
      const o =
        outcomeForTemp(p.tempId) ??
        outcomeByKey.get(`${p.type}::${normalizeQuote(p.label)}`) ?? {
          outcome: "rejected" as const,
          rejectionReason: "UNMAPPED",
        };
      record("node", p, o);
    }
    for (const p of input.proposerOutput.edges) {
      const o = outcomeForTemp(p.tempId) ?? {
        outcome: "rejected" as const,
        rejectionReason: "UNMAPPED",
      };
      record("edge", p, o);
    }
    // Wrapper rejections never reached the gate — their canonical shape does
    // not exist; persist the typed rejection itself as the payload (the raw
    // model blob lives under ExtractionRun.rawResponseRef, spec §10.4).
    for (const wr of input.wrapperRejections) {
      record(wr.kind, { tempId: wr.tempId, stage: wr.stage, detail: wr.detail }, {
        outcome: "rejected",
        rejectionReason: wr.reason,
      });
    }
    if (rows.length > 0) await tx.proposal.createMany({ data: rows });

    return report;
  });
}

// ── Loaders: the persisted → gate-input projections (replay/next pass) ──────

export async function loadGraphSnapshot(
  prisma: PrismaClient,
  userId: string,
): Promise<GraphSnapshot> {
  const toRecord = (ev: {
    sourceEventId: string;
    quote: string;
    spanStart: number;
    spanEnd: number;
    occurredAt: Date;
    role: string;
    polarity: string;
    sourceEvent: { authorship: string; invalidatedAt: Date | null };
  }): EvidenceRecord => ({
    sourceEventId: ev.sourceEventId,
    quote: ev.quote,
    spanStart: ev.spanStart,
    spanEnd: ev.spanEnd,
    occurredAt: ev.occurredAt,
    authorship: ev.sourceEvent.authorship as EvidenceRecord["authorship"],
    role: ev.role as EvidenceRecord["role"],
    polarity: ev.polarity as EvidenceRecord["polarity"],
    sourceInvalidatedAt: ev.sourceEvent.invalidatedAt, // invalidation-aware mass (§6)
  });
  const nodes = await prisma.psycheNode.findMany({
    where: { userId, archivedAt: null },
    include: { evidence: { include: { sourceEvent: { select: { authorship: true, invalidatedAt: true } } } } },
  });
  const edges = await prisma.psycheEdge.findMany({
    where: { userId, archivedAt: null },
    include: { evidence: { include: { sourceEvent: { select: { authorship: true, invalidatedAt: true } } } } },
  });
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      provenance: n.provenance,
      label: n.label,
      ontologyKey: n.ontologyKey ?? undefined,
      state: n.state,
      evidence: n.evidence.map(toRecord),
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId,
      type: e.type,
      evidence: e.evidence.map(toRecord),
    })),
  };
}

export async function loadShadowBuffer(
  prisma: PrismaClient,
  userId: string,
): Promise<ShadowCandidate[]> {
  const rows = await prisma.shadowCandidate.findMany({ where: { userId } });
  return rows.map((r) => {
    const cache = (r.evidenceCache as Array<Record<string, unknown>>).map((e) => ({
      ...(e as unknown as VerifiedEvidence),
      occurredAt: new Date(e.occurredAt as string),
    }));
    const common = {
      candidateKey: r.candidateKey,
      provenance: r.provenance,
      timesSeen: r.timesSeen,
      distinctSources: r.distinctSources,
      waitingReason: r.waitingReason as ShadowCandidate["waitingReason"],
      inferenceDistance: (r.inferenceDistance ?? undefined) as ShadowCandidate["inferenceDistance"],
      evidenceCache: cache,
      lastSeen: r.lastSeen,
    };
    if (r.kind === "edge") {
      return {
        ...common,
        kind: "edge" as const,
        edgeType: r.edgeType! as Extract<ShadowCandidate, { kind: "edge" }>["edgeType"],
        sourceRef: r.sourceRef as unknown as Extract<ShadowCandidate, { kind: "edge" }>["sourceRef"],
        targetRef: r.targetRef as unknown as Extract<ShadowCandidate, { kind: "edge" }>["targetRef"],
      };
    }
    return {
      ...common,
      kind: "node" as const,
      type: r.type! as Extract<ShadowCandidate, { kind: "node" }>["type"],
      label: r.label!,
      ontologyKey: r.ontologyKey ?? undefined,
    };
  });
}

// ── The lens lane's write surface (renderer-lens spec §1; banner computer 3) ─
//
// Lens ghosts arrive through the writer like everything else — the writer is
// the single choke-point where version stamps land. Upsert semantics honor
// the migration-7 partial unique ((userId, ontologyKey) WHERE provenance=LENS
// AND active): unchanged keys update in place (same node id, never re-minted),
// new keys create, and keys absent from the new selection archive their
// UNCHARGED ghosts (charged = has an active HypothesisEvidenceLink — that
// table lands in migration 8; until then every lens ghost is structurally
// uncharged and the predicate is constant, revisited with the matcher build).

export interface LensGhostInput {
  type: string;
  label: string;
  ontologyKey: string;
  lensMapVersion: string;
}

export interface WriteLensGhostsInput {
  userId: string;
  chartImportId: string;
  ghosts: LensGhostInput[];
  /** From gate config — the module that owns the constants owns the stamps. */
  confidenceFloor: number;
  stamps: {
    massAlgorithmVersion: string;
    confidenceAlgorithmVersion: string;
    stateAlgorithmVersion: string;
    gateVersion: string;
  };
  now: Date;
}

/** Runs inside the caller's transaction (the import transaction owns atomicity). */
export async function writeLensGhosts(
  tx: Prisma.TransactionClient,
  input: WriteLensGhostsInput,
): Promise<{ created: number; updated: number; archived: number }> {
  const { userId, chartImportId, ghosts, confidenceFloor, stamps, now } = input;
  const report = { created: 0, updated: 0, archived: 0 };
  const keptKeys = new Set(ghosts.map((g) => g.ontologyKey));

  const active = await tx.psycheNode.findMany({
    where: { userId, provenance: "LENS", archivedAt: null },
  });
  const activeByKey = new Map(active.map((n) => [n.ontologyKey!, n]));

  for (const g of ghosts) {
    const existing = activeByKey.get(g.ontologyKey);
    if (existing) {
      await tx.psycheNode.update({
        where: { id: existing.id },
        data: {
          label: g.label,
          chartImportId,
          lensMapVersion: g.lensMapVersion,
          confidence: confidenceFloor,
          ...stamps,
          computedAt: now,
        },
      });
      report.updated++;
    } else {
      await tx.psycheNode.create({
        data: {
          userId,
          type: g.type as never,
          provenance: "LENS",
          label: g.label,
          ontologyKey: g.ontologyKey,
          chartImportId,
          lensMapVersion: g.lensMapVersion,
          mass: 0,
          confidence: confidenceFloor,
          state: "HYPOTHESIS",
          ...stamps,
          computedAt: now,
        },
      });
      report.created++;
    }
  }

  // Keys the new selection dropped: archive UNCHARGED ghosts (spec §1 —
  // nothing is deleted; charged ghosts sever gracefully per §7, and the
  // charged predicate joins HypothesisEvidenceLink at migration 8).
  for (const n of active) {
    if (!keptKeys.has(n.ontologyKey!)) {
      await tx.psycheNode.update({ where: { id: n.id }, data: { archivedAt: now } });
      report.archived++;
    }
  }
  return report;
}
