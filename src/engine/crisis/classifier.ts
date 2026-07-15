// CRISIS CLASSIFIER — LAW 7's floor, layered deterministic-first.
//
//   1. LEXICON (always, deterministic): HARD hit → CRISIS, no model in the
//      loop, no override possible.
//   2. MODEL (small, server-side): arbitrates SOFT hits in both directions
//      and screens non-lexical phrasing when no lexicon signal fired.
//   3. FAIL-CLOSED where ambiguity exists: a SOFT hit whose arbitration
//      fails resolves to CRISIS — we would rather surface resources to
//      someone who didn't need them than stay silent for someone who did.
//      With NO lexicon signal, a model failure resolves NONE with
//      degraded=true recorded: the deterministic floor still ran, and the
//      record says the second layer didn't.
//
// The result carries term KEYS, levels, and versions — NEVER the person's
// words (it lands in SourceEvent.signals; content there would be retention).

import type { CrisisConfig, CrisisLevel } from "./config";
import { scanLexicon } from "./lexicon";

/** Injectable small-model call (system+user → text). Null = no model
 * available; the fail-closed rules apply. */
export type CrisisModelCall =
  | ((args: { system: string; user: string }) => Promise<string>)
  | null;

export interface CrisisResult {
  level: CrisisLevel;
  method: "LEXICON" | "LEXICON+MODEL" | "MODEL";
  matchedTermKeys: string[];
  classifierVersion: string;
  lexiconVersion: string;
  /** True when the model layer failed or was unavailable. */
  degraded: boolean;
  checkedAt: string;
}

const SYSTEM_PROMPT = `You are a safety triage assistant for a private journaling tool.
Classify ONLY the immediate self-harm/suicide risk expressed by the writer about THEMSELVES in the entry.
Respond with EXACTLY one JSON object, nothing else: {"risk":"NONE"} or {"risk":"CONCERN"} or {"risk":"CRISIS"}.
CRISIS = expressed intent, plan, or active ideation. CONCERN = warning signs without explicit ideation (e.g. giving possessions away, farewell framing, recent ideation now denied). NONE = no self-directed risk (metaphor, fiction, third parties, ordinary distress).`;

function parseModelRisk(raw: string): CrisisLevel | null {
  const match = /\{[^{}]*\}/.exec(raw);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { risk?: unknown };
    return parsed.risk === "NONE" || parsed.risk === "CONCERN" || parsed.risk === "CRISIS"
      ? parsed.risk
      : null;
  } catch {
    return null;
  }
}

export async function classifyCrisis(
  text: string,
  callModel: CrisisModelCall,
  config: CrisisConfig,
): Promise<CrisisResult> {
  const checkedAt = new Date().toISOString();
  const lexicon = scanLexicon(text);
  const base = {
    classifierVersion: config.classifierVersion,
    lexiconVersion: lexicon.lexiconVersion,
    matchedTermKeys: [...lexicon.hard, ...lexicon.soft],
    checkedAt,
  };

  // 1. The deterministic floor: HARD → CRISIS, unconditionally.
  if (lexicon.hard.length > 0) {
    return { ...base, level: "CRISIS", method: "LEXICON", degraded: false };
  }

  // 2. Model arbitration / screening.
  let modelRisk: CrisisLevel | null = null;
  let modelFailed = false;
  if (callModel) {
    try {
      const raw = await callModel({ system: SYSTEM_PROMPT, user: text });
      modelRisk = parseModelRisk(raw);
      if (modelRisk === null) modelFailed = true; // unparseable IS failure
    } catch {
      modelFailed = true;
    }
  } else {
    modelFailed = true;
  }

  if (lexicon.soft.length > 0) {
    // 3a. Fail-closed on ambiguity: soft signal + no working arbiter → CRISIS.
    if (modelFailed || modelRisk === null) {
      return { ...base, level: "CRISIS", method: "LEXICON", degraded: true };
    }
    return { ...base, level: modelRisk, method: "LEXICON+MODEL", degraded: false };
  }

  // 3b. No lexicon signal: the model screens; its absence degrades, honestly.
  if (modelFailed || modelRisk === null) {
    return { ...base, level: "NONE", method: "LEXICON", degraded: true };
  }
  return { ...base, level: modelRisk, method: "MODEL", degraded: false };
}
