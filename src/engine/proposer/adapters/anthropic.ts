// Anthropic provider adapter — the ONLY file that knows a provider exists.
// The wrapper takes any CallModel; swap this freely (the proposer is the
// replaceable, adversarially-exposed front-end; the gate beneath it is not).
//
// Untested by design (network); the wrapper suite runs on deterministic
// stubs. Provider/model are configured server-side, never client-selectable.

import Anthropic from "@anthropic-ai/sdk";
import type { CallModel } from "../types";

export interface AnthropicAdapterConfig {
  /** Server-side only; never reaches the browser. */
  apiKey: string;
  /** The untrusted proposer model, recorded on every ExtractionRun. */
  model: string;
  maxTokens: number;
}

export const ANTHROPIC_ADAPTER_DEFAULTS = {
  model: "claude-sonnet-5",
  maxTokens: 4096,
  // Low temperature reduces variance; it does not create trust (§12).
  temperature: 0,
} as const;

export function buildAnthropicCaller(config: AnthropicAdapterConfig): CallModel {
  const client = new Anthropic({ apiKey: config.apiKey });
  return async ({ system, user }) => {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: ANTHROPIC_ADAPTER_DEFAULTS.temperature,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = response.content.find((b) => b.type === "text");
    return text && text.type === "text" ? text.text : "";
  };
}
