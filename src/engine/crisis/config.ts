// CRISIS CONFIG — versioned carrier for the LAW 7 floor.
//
// The classifier runs on EVERY inbound entry, unconditionally — never gated
// by mode, veil, or session timing. The resource copy is a self-knowledge
// instrument pointing at HUMAN support: calm, direct, never ominous, and it
// never claims to diagnose or treat.

export type CrisisLevel = "NONE" | "CONCERN" | "CRISIS";

export interface CrisisConfig {
  classifierVersion: string;
  /** The small arbitration model (server-side; key from env). */
  model: string;
  maxTokens: number;
  resources: {
    headline: string;
    body: string;
    lines: { label: string; value: string }[];
  };
}

export const CRISIS_CONFIG_V1: CrisisConfig = {
  classifierVersion: "v1",
  model: "claude-haiku-4-5-20251001",
  maxTokens: 128,
  resources: {
    headline: "It sounds like you might be carrying something heavy right now.",
    body:
      "This journal is a place for reflection, not a substitute for a person. " +
      "If any part of you is thinking about harming yourself, please reach a human who can be with you in it:",
    lines: [
      { label: "Call or text 988 (US Suicide & Crisis Lifeline)", value: "988" },
      { label: "Text HOME to 741741 (Crisis Text Line)", value: "741741" },
      {
        label: "Outside the US: find a helpline",
        value: "https://findahelpline.com",
      },
    ],
  },
};
