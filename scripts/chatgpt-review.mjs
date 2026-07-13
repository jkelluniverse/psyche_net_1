#!/usr/bin/env node
// ChatGPT lane of the REVIEW-01 loop. Usage: node scripts/chatgpt-review.mjs <spec-path> <round>
// Requires: OPENAI_API_KEY in env. Writes /docs/review/rounds/<spec>-r<N>-chatgpt.md
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { basename } from "path";

const [specPath, round = "1"] = process.argv.slice(2);
if (!specPath) { console.error("usage: chatgpt-review.mjs <spec-path> <round>"); process.exit(1); }
if (!process.env.OPENAI_API_KEY) { console.error("OPENAI_API_KEY not set — cross-model lane cannot run."); process.exit(2); }

const reviewerPrompt = readFileSync("docs/review/spec-reviewer-prompt.md", "utf8");
const spec = readFileSync(specPath, "utf8");
// Cross-references the reviewer needs for seam checks (keep in sync with the loop command):
const xrefs = ["CLAUDE.md", "docs/citation-gate-spec.md", "prisma/schema.prisma", "src/engine/contracts/extraction-contracts.ts"]
  .map(p => { try { return `\n\n===== CROSS-REFERENCE: ${p} =====\n` + readFileSync(p, "utf8"); } catch { return ""; } })
  .join("");

const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: JSON.stringify({
    model: process.env.OPENAI_REVIEW_MODEL || "gpt-5",
    messages: [
      { role: "system", content: reviewerPrompt },
      { role: "user", content: `Review the following specification (round ${round}). State the exact version you reviewed.\n\n===== SPEC UNDER REVIEW: ${basename(specPath)} =====\n${spec}${xrefs}` },
    ],
  }),
});
if (!res.ok) { console.error(`OpenAI API error ${res.status}: ${await res.text()}`); process.exit(3); }
const data = await res.json();
const review = data.choices?.[0]?.message?.content ?? "";
if (!review.trim()) { console.error("Empty review returned — failing rather than writing a blank file."); process.exit(4); }

mkdirSync("docs/review/rounds", { recursive: true });
const out = `docs/review/rounds/${basename(specPath, ".md")}-r${round}-chatgpt.md`;
writeFileSync(out, review);
console.log(`wrote ${out} (${review.length} chars, model=${data.model})`);
