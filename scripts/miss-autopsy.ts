// Miss autopsy for a live fidelity run (diagnosis ONLY — reads persisted
// ExtractionRun/Proposal/PsycheNode/ShadowCandidate rows, changes nothing).
//
// For every expected node/edge the run failed to match, classify the miss:
//   (a) never-proposed              — no proposal corresponds to the expectation
//   (b) shadow-held                 — proposed, verified, held (which reason)
//   (c) match-rule-failure          — accepted with verified evidence, but the
//                                     scorer's type+labelMatch rule missed it
//                                     (records proposed vs expected type/label)
//   (d) rejected                    — wrapper or gate rejection (which reason);
//                                     wrapper-stage payloads carry no label, so
//                                     those are attributed per-case, honestly
//                                     marked unattributable per-expectation.
//
// Usage:
//   EVAL_DATABASE_URL=… npx tsx scripts/miss-autopsy.ts --prompt-version v2 \
//     [--model claude-sonnet-5] [--out eval/reports/miss-autopsy-v2.md]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseCorpus, requireValidCorpus } from "../src/engine/eval/corpus";
import { normalizeQuote } from "../src/engine/citation-gate/normalize";
import type { EvalCase, ExpectedEdge, ExpectedNode } from "../src/engine/eval/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const PROMPT_VERSION_FILTER = arg("prompt-version") ?? "v2";
const MODEL_FILTER = arg("model") ?? "claude-sonnet-5";

const labelMatches = (label: string, substrings: string[]): boolean => {
  const nl = normalizeQuote(label);
  return substrings.every((s) => nl.includes(normalizeQuote(s)));
};

const quotesOverlap = (a: string, b: string): boolean => {
  const na = normalizeQuote(a);
  const nb = normalizeQuote(b);
  return na.length > 0 && nb.length > 0 && (na.includes(nb) || nb.includes(na));
};

interface ProposalRow {
  kind: string;
  outcome: string;
  rejectionReason: string | null;
  payload: Record<string, unknown>;
}

/** A node proposal "corresponds" to an expectation when its label matches the
 * expectation's substrings, or any of its evidence quotes overlaps a
 * hand-labeled entailing span. */
function correspondsToNode(p: ProposalRow, e: ExpectedNode): boolean {
  const label = p.payload.label;
  if (typeof label === "string" && labelMatches(label, e.labelMatch)) return true;
  const evidence = p.payload.evidence;
  if (!Array.isArray(evidence)) return false;
  return evidence.some(
    (ev) =>
      typeof (ev as Record<string, unknown>)?.quote === "string" &&
      e.entailedQuotes.some((q) => quotesOverlap((ev as { quote: string }).quote, q.quote)),
  );
}

function correspondsToEdge(p: ProposalRow, e: ExpectedEdge): boolean {
  if (p.payload.type !== e.type) {
    // still allow evidence-overlap correspondence across types (mis-typed edge)
  }
  const evidence = p.payload.evidence;
  if (!Array.isArray(evidence)) return p.payload.type === e.type;
  const overlap = evidence.some(
    (ev) =>
      typeof (ev as Record<string, unknown>)?.quote === "string" &&
      e.entailedQuotes.some((q) => quotesOverlap((ev as { quote: string }).quote, q.quote)),
  );
  return overlap || p.payload.type === e.type;
}

interface MissRow {
  caseId: string;
  kind: "node" | "edge";
  expected: string;
  bucket: string;
  detail: string;
}

async function main(): Promise<void> {
  const dbUrl = process.env.EVAL_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  if (!dbUrl) throw new Error("set EVAL_DATABASE_URL (the eval database the run wrote to)");
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  const corpus = parseCorpus(
    JSON.parse(readFileSync(join(__dirname, "../eval/corpus/corpus.json"), "utf8")),
  );
  const cases = requireValidCorpus(corpus);

  const runs = await prisma.extractionRun.findMany({
    where: { promptVersion: PROMPT_VERSION_FILTER, model: MODEL_FILTER },
    select: { id: true, userId: true },
  });
  if (runs.length === 0) {
    throw new Error(`no ExtractionRun rows with promptVersion=${PROMPT_VERSION_FILTER}, model=${MODEL_FILTER}`);
  }

  // Map each run to its corpus case via the user's first source-event content.
  const caseByRun = new Map<string, EvalCase>();
  for (const run of runs) {
    const firstEvent = await prisma.sourceEvent.findFirst({
      where: { userId: run.userId },
      orderBy: { occurredAt: "asc" },
      select: { content: true },
    });
    const c = cases.find((k) => k.sources.some((s) => s.content === firstEvent?.content));
    if (c) caseByRun.set(run.id, c);
  }
  if (caseByRun.size !== cases.length) {
    console.warn(`mapped ${caseByRun.size}/${cases.length} cases to runs (unmapped cases are skipped)`);
  }

  const misses: MissRow[] = [];
  const bucketCounts: Record<string, number> = {};
  const bump = (b: string) => (bucketCounts[b] = (bucketCounts[b] ?? 0) + 1);

  for (const run of runs) {
    const c = caseByRun.get(run.id);
    if (!c) continue;

    const persistedNodes = await prisma.psycheNode.findMany({
      where: { userId: run.userId, provenance: "EXTRACTED", archivedAt: null },
      select: { type: true, label: true, ontologyKey: true },
    });
    const persistedEdges = await prisma.psycheEdge.findMany({
      where: { userId: run.userId, archivedAt: null },
      include: { source: { select: { type: true, label: true } }, target: { select: { type: true, label: true } } },
    });
    const proposalsRaw = await prisma.proposal.findMany({
      where: { runId: run.id },
      select: { kind: true, outcome: true, rejectionReason: true, payload: true },
    });
    const proposals: ProposalRow[] = proposalsRaw.map((p) => ({
      kind: p.kind,
      outcome: p.outcome,
      rejectionReason: p.rejectionReason,
      payload: (p.payload ?? {}) as Record<string, unknown>,
    }));
    const wrapperNodeRejects = proposals.filter(
      (p) => p.kind === "node" && p.payload.stage === "WRAPPER",
    );
    const wrapperEdgeRejects = proposals.filter(
      (p) => p.kind === "edge" && p.payload.stage === "WRAPPER",
    );

    // ── expected nodes ─────────────────────────────────────────────────────
    const claimed = new Set<number>();
    for (const e of c.expectedNodes) {
      const idx = persistedNodes.findIndex(
        (n, i) => !claimed.has(i) && n.type === e.type && labelMatches(n.label, e.labelMatch),
      );
      if (idx >= 0) {
        claimed.add(idx); // matched — not a miss
        continue;
      }
      const row = (bucket: string, detail: string) => {
        misses.push({ caseId: c.id, kind: "node", expected: `${e.key} [${e.type}]`, bucket, detail });
        bump(bucket);
      };
      // labeled proposals (gate-stage rejects, shadows, accepted) that correspond
      const corr = proposals.filter(
        (p) => p.kind === "node" && p.payload.stage === undefined && correspondsToNode(p, e),
      );
      const accepted = corr.find((p) => p.outcome === "accepted");
      const shadow = corr.find((p) => p.outcome === "shadow");
      const gateRejected = corr.find((p) => p.outcome === "rejected");
      if (accepted) {
        row(
          "(c) match-rule-failure",
          `proposed type=${String(accepted.payload.type)} label="${String(accepted.payload.label)}" ontologyKey=${String(accepted.payload.ontologyKey ?? "—")} vs expected type=${e.type} labelMatch=[${e.labelMatch.join(", ")}]`,
        );
      } else if (shadow) {
        row(
          "(b) shadow-held",
          `${shadow.rejectionReason} — proposed type=${String(shadow.payload.type)} label="${String(shadow.payload.label)}"`,
        );
      } else if (gateRejected) {
        row(
          "(d) rejected-gate",
          `${gateRejected.rejectionReason} — proposed label="${String(gateRejected.payload.label)}"`,
        );
      } else if (wrapperNodeRejects.length > 0) {
        row(
          "(d) rejected-wrapper (unattributable)",
          `${wrapperNodeRejects.length} wrapper-stage node rejection(s) in this case (${[...new Set(wrapperNodeRejects.map((p) => p.rejectionReason))].join(", ")}); wrapper payloads carry no label, so per-expectation attribution is impossible from persisted rows`,
        );
      } else {
        row("(a) never-proposed", "no corresponding proposal in this run");
      }
    }

    // ── expected edges ─────────────────────────────────────────────────────
    const expectedNodeByKey = new Map(c.expectedNodes.map((e) => [e.key, e]));
    const claimedEdges = new Set<number>();
    for (const ee of c.expectedEdges) {
      const se = expectedNodeByKey.get(ee.sourceKey)!;
      const te = expectedNodeByKey.get(ee.targetKey)!;
      const idx = persistedEdges.findIndex(
        (pe, i) =>
          !claimedEdges.has(i) &&
          pe.type === ee.type &&
          pe.source.type === se.type &&
          labelMatches(pe.source.label, se.labelMatch) &&
          pe.target.type === te.type &&
          labelMatches(pe.target.label, te.labelMatch),
      );
      if (idx >= 0) {
        claimedEdges.add(idx);
        continue;
      }
      const row = (bucket: string, detail: string) => {
        misses.push({
          caseId: c.id,
          kind: "edge",
          expected: `${ee.sourceKey} -${ee.type}-> ${ee.targetKey}`,
          bucket,
          detail,
        });
        bump(bucket);
      };
      const corr = proposals.filter(
        (p) => p.kind === "edge" && p.payload.stage === undefined && correspondsToEdge(p, ee),
      );
      const accepted = corr.find((p) => p.outcome === "accepted");
      const shadow = corr.find((p) => p.outcome === "shadow");
      const gateRejected = corr.find((p) => p.outcome === "rejected");
      if (accepted) {
        row("(c) match-rule-failure", `accepted edge type=${String(accepted.payload.type)} did not match rule (endpoint labels/types)`);
      } else if (shadow) {
        row("(b) shadow-held", `${shadow.rejectionReason} — proposed type=${String(shadow.payload.type)}`);
      } else if (gateRejected) {
        row("(d) rejected-gate", `${gateRejected.rejectionReason} — proposed type=${String(gateRejected.payload.type)}`);
      } else if (wrapperEdgeRejects.length > 0) {
        row(
          "(d) rejected-wrapper (unattributable)",
          `${wrapperEdgeRejects.length} wrapper-stage edge rejection(s) (${[...new Set(wrapperEdgeRejects.map((p) => p.rejectionReason))].join(", ")}); wrapper payloads carry no endpoints`,
        );
      } else {
        row("(a) never-proposed", "no corresponding edge proposal in this run");
      }
    }
  }

  await prisma.$disconnect();

  // ── report ───────────────────────────────────────────────────────────────
  const now = new Date();
  const lines: string[] = [];
  lines.push(`# Miss autopsy — live fidelity run (promptVersion=${PROMPT_VERSION_FILTER}, model=${MODEL_FILTER})`);
  lines.push("");
  lines.push(`*Generated ${now.toISOString()} · diagnosis only — no prompt, threshold, or match-rule change made · corpus ${corpus.corpusVersion}*`);
  lines.push("");
  lines.push("## Bucket counts");
  lines.push("");
  for (const [bucket, n] of Object.entries(bucketCounts).sort()) {
    lines.push(`- **${bucket}**: ${n}`);
  }
  lines.push(`- **total misses**: ${misses.length}`);
  lines.push("");
  lines.push("## Per-miss table");
  lines.push("");
  lines.push("| case | kind | expected | bucket | detail |");
  lines.push("|---|---|---|---|---|");
  for (const m of misses) {
    lines.push(`| ${m.caseId} | ${m.kind} | ${m.expected} | ${m.bucket} | ${m.detail.replace(/\|/g, "\\|")} |`);
  }
  lines.push("");

  const reportsDir = join(__dirname, "../eval/reports");
  mkdirSync(reportsDir, { recursive: true });
  const out =
    arg("out") ??
    join(reportsDir, `miss-autopsy-${PROMPT_VERSION_FILTER}-${now.toISOString().replace(/[:.]/g, "-")}.md`);
  writeFileSync(out, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nreport → ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
