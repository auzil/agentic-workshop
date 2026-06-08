import { GoogleGenAI } from '@google/genai';

/**
 * The default model for the workshops. Stable, cheap, low-latency, and
 * function-calling capable. See `docs/02-gemini-models.md` for the full
 * lineup and tradeoffs.
 *
 * Override per-agent via `AgentConfig.model`. Don't hardcode model names
 * elsewhere — keep this the single source of truth.
 */
export const DEFAULT_MODEL = 'gemini-2.5-flash';

let instance: GoogleGenAI | undefined;

/**
 * Lazily-instantiated singleton Gemini client.
 *
 * Lazy on purpose — importing this module at type-check time should not
 * require `GEMINI_API_KEY` to be set.
 */
export function getLlm(): GoogleGenAI {
  if (instance) return instance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Copy .env.example to .env and put your key in.',
    );
  }
  instance = new GoogleGenAI({ apiKey });
  return instance;
}
