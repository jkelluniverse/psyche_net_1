// The eval harness: run ONE corpus case through the FULL PERSISTED PATH —
// proposer wrapper → citation gate → graph writer → Prisma → loaders — and
// read the observation back OUT OF THE DATABASE for scoring. Nothing is
// scored from in-memory gate output: the instrument measures what a user's
// graph would actually contain, including everything the writer layer could
// get wrong.
//
// Two model sources plug in here:
// - the ORACLE (below): a deterministic proposer built from the case's own
//   hand labels. It proves the instrument — corpus, pipeline, writer, loaders,
//   scorer — is sound end-to-end (perfect input must score 1.0; anything else
//   is a harness bug, and a broken instrument is worse than a broken model).
// - a LIVE model adapter (scripts/run-eval.ts): the actual fidelity
//   measurement, run before promoting any prompt/model change.

import type { PrismaClient } from "@prisma/client";
import { gate } from "../citation-gate/gate";
import { GATE_CONFIG_V1 } from "../citation-gate/config";
import type { GateConfig } from "../citation-gate/config";
import { runProposer } from "../proposer/proposer";
import {
  PRACTITIONER_ALLOWED_NODE_TYPES,
  SOLO_ALLOWED_NODE_TYPES,
} from "../proposer/config";
import type { CallModel, ExtractionPolicy, OntologyView, ProposerInput } from "../proposer/types";
import type {
  GateResult,
  ProposerOutput,
  ShadowCandidate,
  SourceRecord,
} from "../contracts/extraction-contracts";
import { loadGraphSnapshot, loadShadowBuffer, writeGateResult } from "../graph-writer/writer";
import { scoreCase } from "./scorer";
import type { CaseObservation, CaseScore, EvalCase } from "./types";

/** The eval ontology view — versioned data, not code (META-01). */
export const EVAL_ONTOLOGY: OntologyView = {
  ontologyVersion: "v1",
  nodeTypes: [
    { type: "SHADOW", definition: "a disowned or avoided aspect the person indicates in their own words" },
    { type: "BELIEF", definition: "a conviction the person states about self or world" },
    { type: "PROTECTION", definition: "a strategy that guards against feared outcomes" },
    { type: "PATTERN", definition: "a recurring behavior the person reports" },
    { type: "TRAIT", definition: "a stable characteristic the person claims" },
    { type: "RESOURCE", definition: "a strength or capacity the person evidences" },
    { type: "WOUND", definition: "a hurt the person names directly (supervised contexts only)" },
  ],
  knownOntologyKeys: [],
};

export function policyFor(c: EvalCase): ExtractionPolicy {
  const practitioner = c.policy === "PRACTITIONER_SUPPORTED";
  return {
    mode: c.policy,
    allowedNodeTypes: practitioner
      ? [...PRACTITIONER_ALLOWED_NODE_TYPES]
      : [...SOLO_ALLOWED_NODE_TYPES],
    practitionerRelationshipVerified: practitioner,
    userConsentVersion: "consent-eval-v1",
    consentScope: { betweenSessionExtraction: true },
    policyVersion: "policy-eval-v1",
  };
}

export function gateConfigFor(c: EvalCase): GateConfig {
  // PRACTITIONER_SUPPORTED runs supervised; solo journaling gets the §1.1
  // structural guard against single-quote state flips.
  return { ...GATE_CONFIG_V1, mode: c.policy === "SOLO" ? "SOLO" : "SUPERVISED" };
}

/**
 * The oracle: a "model" that answers with exactly the hand-labeled ground
 * truth (real DB source ids, labeled roles, DIRECT inference). Perfect input
 * for calibrating the instrument; useless for measuring a model.
 */
export function oracleModel(c: EvalCase, idByKey: Map<string, string>): CallModel {
  const output = {
    nodes: c.expectedNodes.map((e) => ({
      tempId: `oracle-${e.key}`,
      type: e.type,
      label: e.labelMatch.join(" "),
      inferenceDistance: "DIRECT_DECLARATION",
      evidence: e.entailedQuotes.map((q) => ({
        sourceEventId: idByKey.get(q.sourceKey),
        quote: q.quote,
        role: q.role ?? "SUPPORT",
        polarity: "SUPPORTING",
      })),
    })),
    edges: c.expectedEdges.map((ee, i) => ({
      tempId: `oracle-edge-${i}`,
      source: { kind: "PROPOSED", tempId: `oracle-${ee.sourceKey}` },
      target: { kind: "PROPOSED", tempId: `oracle-${ee.targetKey}` },
      type: ee.type,
      inferenceDistance: "DIRECT_DECLARATION",
      evidence: ee.entailedQuotes.map((q) => ({
        sourceEventId: idByKey.get(q.sourceKey),
        quote: q.quote,
        role: "SUPPORT",
        polarity: "SUPPORTING",
      })),
    })),
  };
  return async () => JSON.stringify(output);
}

export interface CaseRunResult {
  score: CaseScore;
  proposerStatus: "complete" | "error";
  observation: CaseObservation;
  versions: {
    promptVersion: string;
    contractVersion: string;
    gateVersion: string;
    normalizationVersion: string;
    massAlgorithmVersion: string;
    confidenceAlgorithmVersion: string;
    stateAlgorithmVersion: string;
    ontologyVersion: string;
  };
}

/**
 * Full persisted path for one case, on a FRESH user. `makeModel` receives the
 * corpus-key → real SourceEvent id map (the oracle needs it; a live adapter
 * ignores it).
 */
export async function runCorpusCase(
  prisma: PrismaClient,
  c: EvalCase,
  makeModel: (idByKey: Map<string, string>) => CallModel,
  now: Date,
  modelName: string,
): Promise<CaseRunResult> {
  const user = await prisma.user.create({ data: { role: "INDIVIDUAL", ageVerified: true } });

  const idByKey = new Map<string, string>();
  const keyById = new Map<string, string>();
  const sources: SourceRecord[] = [];
  for (const s of c.sources) {
    const row = await prisma.sourceEvent.create({
      data: {
        userId: user.id,
        kind: "JOURNAL_TEXT",
        content: s.content,
        authorship: "SELF",
        occurredAt: new Date(now.getTime() - s.daysAgo * 86_400_000),
      },
    });
    idByKey.set(s.key, row.id);
    keyById.set(row.id, s.key);
    sources.push({
      id: row.id,
      content: s.content,
      authorship: "SELF",
      occurredAt: new Date(now.getTime() - s.daysAgo * 86_400_000),
      invalidatedAt: null,
    });
  }

  const gateConfig = gateConfigFor(c);
  const run = await prisma.extractionRun.create({
    data: {
      userId: user.id,
      provider: "eval-harness",
      model: modelName,
      promptVersion: "pending",
      ontologyVersion: EVAL_ONTOLOGY.ontologyVersion,
      gateVersion: gateConfig.gateVersion,
      status: "running",
    },
  });

  const input: ProposerInput = {
    sources,
    priorNodes: [],
    ontology: EVAL_ONTOLOGY,
    policy: policyFor(c),
    runId: run.id,
  };
  const proposerRun = await runProposer(input, makeModel(idByKey));

  const priorGraph = await loadGraphSnapshot(prisma, user.id);
  const priorShadow = await loadShadowBuffer(prisma, user.id);
  const sourcesMap = new Map(sources.map((s) => [s.id, s]));
  const gateResult: GateResult = gate(
    proposerRun.output,
    sourcesMap,
    priorGraph,
    priorShadow,
    now,
    gateConfig,
  );

  await writeGateResult(prisma, {
    userId: user.id,
    runId: run.id,
    proposerOutput: proposerRun.output,
    wrapperRejections: [...proposerRun.rejectedCandidates, ...proposerRun.dropped],
    gateResult,
    loadedShadowKeys: priorShadow.map((s) => s.candidateKey),
    now,
  });
  await prisma.extractionRun.update({
    where: { id: run.id },
    data: {
      status: proposerRun.status,
      promptVersion: proposerRun.promptVersion,
      contractVersion: proposerRun.contractVersion,
      attempts: proposerRun.attempts,
    },
  });

  const observation = await buildObservation(prisma, c.id, user.id, proposerRun.output, keyById);
  return {
    score: scoreCase(c, observation),
    proposerStatus: proposerRun.status,
    observation,
    versions: {
      promptVersion: proposerRun.promptVersion,
      contractVersion: proposerRun.contractVersion,
      gateVersion: gateResult.gateVersion,
      normalizationVersion: gateResult.normalizationVersion,
      massAlgorithmVersion: gateResult.massAlgorithmVersion,
      confidenceAlgorithmVersion: gateResult.confidenceAlgorithmVersion,
      stateAlgorithmVersion: gateResult.stateAlgorithmVersion,
      ontologyVersion: gateResult.ontologyVersion,
    },
  };
}

/** Read the observation back OUT OF THE DATABASE via the writer's loaders. */
async function buildObservation(
  prisma: PrismaClient,
  caseId: string,
  userId: string,
  proposerOutput: ProposerOutput,
  keyById: Map<string, string>,
): Promise<CaseObservation> {
  const toKey = (sourceEventId: string): string => keyById.get(sourceEventId) ?? sourceEventId;
  const snapshot = await loadGraphSnapshot(prisma, userId);
  const buffer = await loadShadowBuffer(prisma, userId);
  const nodeById = new Map(snapshot.nodes.map((n) => [n.id, n]));
  return {
    caseId,
    proposed: [
      ...proposerOutput.nodes.map((n) => ({
        kind: "node" as const,
        type: n.type as string,
        quotes: n.evidence.map((e) => ({ sourceKey: toKey(e.sourceEventId), quote: e.quote })),
      })),
      ...proposerOutput.edges.map((e) => ({
        kind: "edge" as const,
        type: e.type as string,
        quotes: e.evidence.map((q) => ({ sourceKey: toKey(q.sourceEventId), quote: q.quote })),
      })),
    ],
    persistedNodes: snapshot.nodes
      .filter((n) => n.provenance === "EXTRACTED")
      .map((n) => ({
        type: n.type,
        label: n.label,
        evidence: n.evidence.map((e) => ({ sourceKey: toKey(e.sourceEventId), quote: e.quote })),
      })),
    persistedEdges: snapshot.edges.map((e) => {
      const s = nodeById.get(e.sourceId);
      const t = nodeById.get(e.targetId);
      return {
        type: e.type,
        source: { type: s?.type ?? "?", label: s?.label ?? "?" },
        target: { type: t?.type ?? "?", label: t?.label ?? "?" },
        evidence: e.evidence.map((q) => ({ sourceKey: toKey(q.sourceEventId), quote: q.quote })),
      };
    }),
    shadowNodes: buffer
      .filter((s): s is Extract<ShadowCandidate, { kind: "node" }> => s.kind === "node")
      .map((s) => ({ type: s.type, label: s.label })),
  };
}
