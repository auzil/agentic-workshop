/**
 * Re-exports the SDK's conversation types so workshop code has a single
 * source of truth for "what is a message."
 *
 * Every exchange with Gemini boils down to a `Content[]` history, where
 * each `Content` has a `role` (`'user'` or `'model'`) and an array of
 * `Part`s. A `Part` is one of:
 *
 *   • `{ text: string }`                                        — plain text
 *   • `{ functionCall: { name, args, id? } }`                   — model wants a tool run
 *   • `{ functionResponse: { name, response, id? } }`           — the tool's result
 *
 * The agent loop is mostly bookkeeping over this list.
 *
 * Note: tool **results** are sent back with `role: 'user'` — the SDK uses the
 * user role for *anything coming into the model*, including tool outputs.
 */

export type {
  Content,
  Part,
  FunctionCall,
  FunctionResponse,
} from '@google/genai';
