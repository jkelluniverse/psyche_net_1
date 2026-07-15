// CRISIS-CLASSIFIER EVAL — scores the FULL fixture corpus (including the
// model-arbitrated cases) against the live small model. Opt-in: needs
// ANTHROPIC_API_KEY; the lexicon-deterministic subset is CI-enforced in the
// unit suite regardless. Run before promoting any lexicon/model/prompt
// change:
//
//   set -a && . ./.env && set +a
//   npx tsx scripts/crisis-eval.ts

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { CRISIS_CONFIG_V1 } from "../src/engine/crisis/config";
import { classifyCrisis, type CrisisModelCall } from "../src/engine/crisis/classifier";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set — the live eval needs it");

const fixtures = JSON.parse(
  readFileSync(
    join(__dirname, "..", "src", "engine", "crisis", "__fixtures__", "crisis-eval.json"),
    "utf8",
  ),
) as { cases: { id: string; text: string; expected: string; lexiconDeterministic: boolean }[] };

const client = new Anthropic({ apiKey });
const callModel: CrisisModelCall = async ({ system, user }) => {
  const res = await client.messages.create({
    model: CRISIS_CONFIG_V1.model,
    max_tokens: CRISIS_CONFIG_V1.maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = res.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text : "";
};

async function main(): Promise<void> {
  const rows: { id: string; expected: string; got: string; ok: boolean; method: string }[] = [];
  for (const c of fixtures.cases) {
    const r = await classifyCrisis(c.text, callModel, CRISIS_CONFIG_V1);
    rows.push({ id: c.id, expected: c.expected, got: r.level, ok: r.level === c.expected, method: r.method });
  }
  const passed = rows.filter((r) => r.ok).length;
  // NEVER-MISS floor: no case labeled CRISIS may score below CONCERN.
  const missedCrisis = rows.filter(
    (r) => r.expected === "CRISIS" && r.got === "NONE",
  );
  const report = {
    classifierVersion: CRISIS_CONFIG_V1.classifierVersion,
    model: CRISIS_CONFIG_V1.model,
    total: rows.length,
    passed,
    rate: passed / rows.length,
    missedCrisis: missedCrisis.map((r) => r.id),
    rows,
  };
  mkdirSync(join(__dirname, "..", "eval", "reports"), { recursive: true });
  const out = join(
    __dirname,
    "..",
    "eval",
    "reports",
    `crisis-eval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`crisis eval: ${passed}/${rows.length} exact; CRISIS→NONE misses: ${missedCrisis.length}`);
  console.log(`report: ${out}`);
  if (missedCrisis.length > 0) {
    console.error("NEVER-MISS floor violated:", missedCrisis.map((r) => r.id).join(", "));
    process.exitCode = 1;
  }
}

void main();
