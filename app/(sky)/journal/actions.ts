"use server";

// JOURNAL ACTIONS — the words' front door.
//
// saveEntry: SourceEvent (immutable, SELF, bi-temporal) + the LAW 7 floor:
// crisis classification runs on EVERY entry, UNCONDITIONALLY — before mode,
// before veil, before anything about extraction; the entry SAVES regardless
// (a person reaching out must never lose their words to a classifier), and
// the result (term keys + level only, never content) lands in signals.
//
// reflectNow: the demo-appropriate deliberate trigger for the batched/async
// extraction pass — real proposer, live policy, gate, writer, matcher.

import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import { getSessionUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { classifyCrisis, type CrisisModelCall } from "@/src/engine/crisis/classifier";
import { CRISIS_CONFIG_V1 } from "@/src/engine/crisis/config";
import { runExtractionPass } from "@/src/engine/extraction/run-pass";

export interface JournalFormState {
  saved: boolean;
  error: string | null;
  crisis: {
    level: "NONE" | "CONCERN" | "CRISIS";
    resources: typeof CRISIS_CONFIG_V1.resources | null;
  } | null;
}

function crisisModel(): CrisisModelCall {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null; // classifier degrades honestly; lexicon floor still runs
  const client = new Anthropic({ apiKey });
  return async ({ system, user }) => {
    const res = await client.messages.create({
      model: CRISIS_CONFIG_V1.model,
      max_tokens: CRISIS_CONFIG_V1.maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content.find((b) => b.type === "text");
    return text && text.type === "text" ? text.text : "";
  };
}

export async function saveEntry(
  _prev: JournalFormState,
  formData: FormData,
): Promise<JournalFormState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const content = String(formData.get("content") ?? "").trim();
  if (content.length === 0) {
    return { saved: false, error: "Write something first — even a sentence.", crisis: null };
  }
  if (content.length > 20_000) {
    return {
      saved: false,
      error: "That entry is longer than one entry can hold — split it into parts.",
      crisis: null,
    };
  }

  // LAW 7: unconditionally, before anything else about the entry's fate.
  // classifyCrisis never throws; a degraded second layer is recorded, and
  // the deterministic lexicon floor has always run.
  const crisis = await classifyCrisis(content, crisisModel(), CRISIS_CONFIG_V1);

  await prisma.sourceEvent.create({
    data: {
      userId: user.id,
      kind: "JOURNAL_TEXT",
      content,
      authorship: "SELF",
      occurredAt: new Date(),
      // Term keys, levels, versions — never the person's words.
      signals: {
        crisis: {
          level: crisis.level,
          method: crisis.method,
          matchedTermKeys: crisis.matchedTermKeys,
          classifierVersion: crisis.classifierVersion,
          lexiconVersion: crisis.lexiconVersion,
          degraded: crisis.degraded,
          checkedAt: crisis.checkedAt,
        },
      },
    },
  });

  return {
    saved: true,
    error: null,
    crisis:
      crisis.level === "NONE"
        ? null
        : { level: crisis.level, resources: CRISIS_CONFIG_V1.resources },
  };
}

export interface ReflectState {
  error: string | null;
}

export async function reflectNow(): Promise<ReflectState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  let result;
  try {
    result = await runExtractionPass(prisma, { userId: user.id, now: new Date() });
  } catch {
    return {
      error:
        "Reflection couldn't run just now. Your words are safe — try again in a moment.",
    };
  }
  if (!result.ok) {
    return { error: "Nothing new to reflect on yet — write an entry first." };
  }
  redirect("/sky");
}
