/**
 * Re-exports the SDK's conversation type so workshop code has a single
 * source of truth for "what is a message."
 *
 * Every exchange with the model boils down to a `Content[]` (alias for
 * `ChatCompletionMessageParam[]`), where each message has a `role`:
 *
 *   • `'system'`    — one-time instructions sent before the conversation starts
 *   • `'user'`      — a user turn
 *   • `'assistant'` — the model's text response or tool-call request
 *   • `'tool'`      — the result of a single tool call, keyed by `tool_call_id`
 *
 * The agent loop is mostly bookkeeping over this list.
 */

export type { ChatCompletionMessageParam as Content } from 'openai/resources/chat/completions.js';
