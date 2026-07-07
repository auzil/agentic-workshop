import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';

/**
 * JSON Schema property types, matching the values expected by the OpenAI
 * function-calling API. Use these when declaring `Tool.parameters` so
 * workshop code reads clearly without magic strings.
 */
export const Type = {
  OBJECT: 'object',
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
} as const;
export type Type = (typeof Type)[keyof typeof Type];

/** JSON Schema shape for a tool's accepted arguments. */
export interface ToolParameters {
  readonly type: 'object';
  readonly properties: Record<
    string,
    { readonly type: string; readonly description?: string; readonly enum?: string[] }
  >;
  readonly required?: readonly string[];
}

/**
 * A tool an {@link Agent} can call.
 *
 * Tool design is most of the work in agent engineering. The `name`,
 * `description`, and `parameters` are what the LLM sees — they decide
 * whether the model picks the right tool and supplies the right arguments.
 *
 * Args arrive from the LLM as untyped JSON, so `execute` receives a
 * `Record<string, unknown>` and is responsible for narrowing to the shape
 * declared in `parameters`. This keeps the LLM boundary visible.
 */
export interface Tool<TResult = unknown> {
  readonly name: string;
  readonly description: string;
  readonly parameters: ToolParameters;
  readonly execute: (
    args: Record<string, unknown>,
  ) => Promise<TResult> | TResult;
}

/**
 * Convert a list of {@link Tool}s into the shape `chat.completions.create`
 * expects under `tools`. Returns an empty array when there are no tools so
 * we can omit the field cleanly.
 */
export function toOpenAITools(tools: readonly Tool[]): ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters as unknown as Record<string, unknown>,
    },
  }));
}
