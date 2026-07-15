// PRODUCTION EXTRACTION PASS — the pipeline the eval harness proved, run
// for a real user: un-extracted SELF sources → REAL proposer (blinded
// context, live server-derived policy) → citation gate → graph writer →
// hypothesis matcher (trigger 1). Batched/async by design; the journal's
// "reflect now" affordance calls it deliberately.
//
// Hard rules:
// - The LIVE path requires ANTHROPIC_API_KEY and refuses to start without
//   it — the proposer is never stubbed silently (tests inject callModel).
// - The proposer sees ONLY what buildBlindedContext allows (SELF sources +
//   EXTRACTED prior nodes) — hypothesis blinding is the wrapper's, enforced
//   there; this service just hands it honest inputs.
// - Everything model-touched flows through the gate; the writer is the only
//   thing that mutates the graph; the matcher runs AFTER the write, with
//   mode derived from the live engagement.

import type { PrismaClient } from "@prisma/client";
import { GATE_CONFIG_V1 } from "../citation-gate/config";
import { gate } from "../citation-gate/gate";
import type { GateResult, SourceRecord } from "../contracts/extraction-contracts";
import {
  loadGraphSnapshot,
  loadShadowBuffer,
  writeGateResult,
} from "../graph-writer/writer";
import { MATCHER_CONFIG_V1 } from "../hypothesis-match/config";
import { runMatcherForUser } from "../hypothesis-match/matcher";
import type { MatcherRunResult } from "../hypothesis-match/matcher";
import { buildOntologyView } from "../ontology/view";
import {
  ANTHROPIC_ADAPTER_DEFAULTS,
  buildAnthropicCaller,
} from "../proposer/adapters/anthropic";
import { PROPOSER_CONFIG_V1 } from "../proposer/config";
import { runProposer } from "../proposer/proposer";
import type { CallModel, ProposerInput } from "../proposer/types";
import { livePolicyFor } from "./live-policy";

export interface ReflectSummary {
  /** Node-shaped things the gate verified this pass (materialized + forming). */
  heard: number;
  /** Now on the sky as stars. */
  materialized: number;
  /** Verified but below the recurrence threshold — forming in the fringe. */
  forming: number;
  /** Proposed but unverifiable — rejected by the gate, recorded, not shown. */
  rejected: number;
  /** Ghosts that moved HYPOTHESIS → ACTIVE this pass. */
  ghostsCharged: number;
  /** Evidence links written to standing hypotheses (brightening). */
  linksCreated: number;
}

export interface RunPassResult {
  ok: true;
  runId: string;
  proposerStatus: string;
  sourcesExtracted: number;
  /** Sources beyond the per-run cap — deferred, recorded, never silent. */
  sourcesDeferred: number;
  matcher: MatcherRunResult | null;
  /** Zero-change is never a silent outcome: the summary always lands. */
  summary: ReflectSummary;
}

/** The live model caller — throws loudly when the key is absent. */
export function liveCallModel(): CallModel {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — the live extraction pass refuses to start. " +
        "Set it in the environment; the proposer is never stubbed silently.",
    );
  }
  return buildAnthropicCaller({
    apiKey,
    model: ANTHROPIC_ADAPTER_DEFAULTS.model,
    maxTokens: ANTHROPIC_ADAPTER_DEFAULTS.maxTokens,
  });
}

/** Sources not yet seen by any completed pass: ingested after the newest
 * complete run started. First pass = everything eligible. */
async function loadUnextractedSources(
  prisma: PrismaClient,
  userId: string,
): Promise<SourceRecord[]> {
  const lastRun = await prisma.extractionRun.findFirst({
    where: { userId, status: "complete" },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });
  const rows = await prisma.sourceEvent.findMany({
    where: {
      userId,
      authorship: "SELF",
      invalidatedAt: null,
      kind: { in: ["JOURNAL_TEXT", "JOURNAL_VOICE", "INTAKE_SPARK"] },
      ...(lastRun ? { ingestedAt: { gt: lastRun.startedAt } } : {}),
    },
    orderBy: { ingestedAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    authorship: "SELF" as const,
    occurredAt: r.occurredAt,
    invalidatedAt: r.invalidatedAt,
  }));
}

/** How many saved entries the next pass will read — the journal surfaces
 * this so "Reflect now" visibly operates on SAVED entries, not the form. */
export async function countUnextractedSources(
  prisma: PrismaClient,
  userId: string,
): Promise<number> {
  return (await loadUnextractedSources(prisma, userId)).length;
}

export async function runExtractionPass(
  prisma: PrismaClient,
  input: {
    userId: string;
    now: Date;
    /** Injectable for tests (oracle models); omitted = the live Anthropic caller. */
    callModel?: CallModel;
    model?: string;
  },
): Promise<RunPassResult | { ok: false; reason: "NO_NEW_SOURCES" }> {
  const { userId, now } = input;
  const callModel = input.callModel ?? liveCallModel();
  const modelName = input.model ?? ANTHROPIC_ADAPTER_DEFAULTS.model;

  const all = await loadUnextractedSources(prisma, userId);
  if (all.length === 0) return { ok: false, reason: "NO_NEW_SOURCES" };
  // Cap per run — the remainder is deferred and reported, never silent.
  const sources = all.slice(0, PROPOSER_CONFIG_V1.caps.maxEventsPerRun);
  const deferred = all.length - sources.length;

  const policy = await livePolicyFor(prisma, userId);
  const ontology = buildOntologyView();
  const gateMode = policy.mode === "PRACTITIONER_SUPPORTED" ? "SUPERVISED" : "SOLO";
  const gateConfig = { ...GATE_CONFIG_V1, mode: gateMode as "SOLO" | "SUPERVISED" };

  // Prior EXTRACTED nodes for dedupe context (the wrapper's blinding filter
  // is authoritative — it drops anything non-EXTRACTED regardless).
  const priorNodes = (
    await prisma.psycheNode.findMany({
      where: { userId, provenance: "EXTRACTED", archivedAt: null },
      select: { id: true, type: true, provenance: true, label: true, ontologyKey: true },
    })
  ).map((n) => ({
    id: n.id,
    type: n.type,
    provenance: n.provenance,
    label: n.label,
    ontologyKey: n.ontologyKey ?? undefined,
  }));

  const run = await prisma.extractionRun.create({
    data: {
      userId,
      provider: "anthropic",
      model: modelName,
      promptVersion: "pending",
      ontologyVersion: ontology.ontologyVersion,
      gateVersion: gateConfig.gateVersion,
      policySnapshot: policy as never,
      omittedEventIds: deferred > 0 ? all.slice(sources.length).map((s) => s.id) : undefined,
      status: "running",
    },
  });

  // D (identity ruling): the proposer sees the person's own once-heard
  // theme labels — LABELS ONLY — so recurring themes keep their wording.
  const priorShadow = await loadShadowBuffer(prisma, userId);
  const heldShadowLabels = priorShadow
    .filter((s): s is Extract<typeof s, { kind: "node" }> => s.kind === "node")
    .map((s) => s.label);

  const proposerInput: ProposerInput = {
    sources,
    priorNodes,
    heldShadowLabels,
    ontology,
    policy,
    runId: run.id,
  };

  try {
    const proposerRun = await runProposer(proposerInput, callModel);

    const priorGraph = await loadGraphSnapshot(prisma, userId);
    const gateResult: GateResult = gate(
      proposerRun.output,
      new Map(sources.map((s) => [s.id, s])),
      priorGraph,
      priorShadow,
      now,
      gateConfig,
    );
    await writeGateResult(prisma, {
      userId,
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
        status: "complete",
        promptVersion: proposerRun.promptVersion,
        contractVersion: proposerRun.contractVersion,
        attempts: proposerRun.attempts,
        finishedAt: now,
      },
    });

    // The plain-language summary (zero-change is never silent): forming =
    // node-kind shadow entries this pass created or re-sighted, computed
    // against the PRE-pass buffer.
    const priorSeen = new Map(priorShadow.map((s) => [s.candidateKey, s.timesSeen]));
    const forming = gateResult.shadowBuffer.filter(
      (s) =>
        s.kind === "node" &&
        (priorSeen.get(s.candidateKey) === undefined ||
          s.timesSeen > (priorSeen.get(s.candidateKey) ?? 0)),
    ).length;
    // TRUE rejections only: gateResult.rejected also carries HOLD-reason
    // entries (the forming set) — counting those double-told the person
    // their forming candidates were "set aside" (Jacob's walk, 2026-07-15).
    const HOLDS = new Set(["BELOW_MATERIALIZATION_THRESHOLD", "HELD_HIGH_INFERENCE", "WAITING_ENDPOINT"]);
    const rejectedNodes = gateResult.rejected.filter(
      (r) => r.kind === "node" && !HOLDS.has(r.reason),
    ).length;

    // Trigger 1: the pass's newly validated material vs standing hypotheses.
    const matcher = await prisma.$transaction((tx) =>
      runMatcherForUser(tx, {
        userId,
        trigger: `PASS:${run.id}`,
        config: { ...MATCHER_CONFIG_V1, mode: gateMode as "SOLO" | "SUPERVISED" },
        gateConfig,
        now,
      }),
    );

    return {
      ok: true,
      runId: run.id,
      proposerStatus: proposerRun.status,
      sourcesExtracted: sources.length,
      sourcesDeferred: deferred,
      matcher,
      summary: {
        heard: gateResult.acceptedNodes.length + forming,
        materialized: gateResult.acceptedNodes.length,
        forming,
        rejected: rejectedNodes,
        ghostsCharged: matcher.transitions.filter(
          (t) => t.from === "HYPOTHESIS" && t.to === "ACTIVE",
        ).length,
        linksCreated: matcher.linksCreated,
      },
    };
  } catch (err) {
    // The run row records the failure; sources stay eligible for retry
    // (only "complete" runs advance the un-extracted watermark).
    await prisma.extractionRun.update({
      where: { id: run.id },
      data: { status: "error", finishedAt: now },
    });
    throw err;
  }
}
