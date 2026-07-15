// CRISIS LEXICON v1 — the deterministic floor (LAW 7).
//
// Curated, versioned, and deliberately conservative in the HARD tier:
// a HARD match means explicit self-harm/suicidal language and resolves to
// CRISIS with no model in the loop. SOFT terms are real signals with benign
// readings — the small model arbitrates those (and its failure fails
// CLOSED). Matching is phrase-level with word boundaries over normalized
// text (lowercase, straight apostrophes, collapsed whitespace) so casing,
// spacing, and curly quotes can't slip a phrase past the floor — while
// metaphors ("this deadline is killing me") never trip HARD.
//
// Term KEYS are what results carry — never the matched content.

export const LEXICON_VERSION = "v1";

export interface LexiconTerm {
  key: string;
  /** Phrase matched with \b boundaries; spaces match any whitespace run. */
  phrase: string;
}

export const HARD_TERMS: LexiconTerm[] = [
  { key: "hard.kill-myself", phrase: "kill myself" },
  { key: "hard.killing-myself", phrase: "killing myself" },
  { key: "hard.end-my-life", phrase: "end my life" },
  { key: "hard.ending-my-life", phrase: "ending my life" },
  { key: "hard.take-my-own-life", phrase: "take my own life" },
  { key: "hard.suicide", phrase: "suicide" },
  { key: "hard.suicidal", phrase: "suicidal" },
  { key: "hard.want-to-die", phrase: "want to die" },
  { key: "hard.wish-i-was-dead", phrase: "wish i was dead" },
  { key: "hard.wish-i-were-dead", phrase: "wish i were dead" },
  { key: "hard.better-off-dead", phrase: "better off dead" },
  { key: "hard.no-reason-to-live", phrase: "no reason to live" },
  { key: "hard.hurt-myself", phrase: "hurt myself" },
  { key: "hard.hurting-myself", phrase: "hurting myself" },
  { key: "hard.harm-myself", phrase: "harm myself" },
  { key: "hard.self-harm", phrase: "self harm" },
  { key: "hard.cut-myself", phrase: "cut myself" },
  { key: "hard.cutting-myself", phrase: "cutting myself" },
  { key: "hard.overdose", phrase: "overdose" },
  { key: "hard.end-it-all", phrase: "end it all" },
];

export const SOFT_TERMS: LexiconTerm[] = [
  { key: "soft.cant-go-on", phrase: "can't go on" },
  { key: "soft.cant-do-this-anymore", phrase: "can't do this anymore" },
  { key: "soft.hopeless", phrase: "hopeless" },
  { key: "soft.no-way-out", phrase: "no way out" },
  { key: "soft.want-to-disappear", phrase: "want to disappear" },
  { key: "soft.burden-to-everyone", phrase: "burden to everyone" },
  { key: "soft.everyone-better-off-without-me", phrase: "better off without me" },
  { key: "soft.no-point-anymore", phrase: "no point anymore" },
  { key: "soft.give-up-on-everything", phrase: "give up on everything" },
  { key: "soft.nothing-matters-anymore", phrase: "nothing matters anymore" },
];

/** Casing/whitespace/typography are the writer's, not meaning. Apostrophes
 * normalize both ways (can't / cant / can’t). */
export function normalizeForLexicon(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+/g, " ");
}

function phraseRegex(phrase: string): RegExp {
  const escaped = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/'/g, "'?") // "can't" also matches "cant"
    .replace(/ /g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "u");
}

const HARD = HARD_TERMS.map((t) => ({ ...t, re: phraseRegex(t.phrase) }));
const SOFT = SOFT_TERMS.map((t) => ({ ...t, re: phraseRegex(t.phrase) }));

export interface LexiconResult {
  hard: string[]; // term keys only
  soft: string[];
  lexiconVersion: string;
}

export function scanLexicon(text: string): LexiconResult {
  const normalized = normalizeForLexicon(text);
  return {
    hard: HARD.filter((t) => t.re.test(normalized)).map((t) => t.key),
    soft: SOFT.filter((t) => t.re.test(normalized)).map((t) => t.key),
    lexiconVersion: LEXICON_VERSION,
  };
}
