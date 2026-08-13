import Anthropic from "@anthropic-ai/sdk";

// ANTHROPIC_API_KEY is read from the environment automatically.
export const anthropic = new Anthropic();

// Per Anthropic's current model guidance: default to the flagship model
// unless the user names a different one. This is the most expensive tier
// ($5/$25 per MTok) — worth knowing given this only runs on a bounded set
// of "needs attention" clients, not every thread on every sync.
export const CLAUDE_MODEL = "claude-opus-5";
