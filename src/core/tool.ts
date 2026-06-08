import { Type, type FunctionDeclaration } from '@google/genai';

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
  readonly parameters: FunctionDeclaration['parameters'];
  readonly execute: (
    args: Record<string, unknown>,
  ) => Promise<TResult> | TResult;
}

export { Type };

/**
 * Convert a list of {@link Tool}s into the shape `generateContent` expects
 * under `config.tools`. Returns an empty array when there are no tools so
 * we can omit the field cleanly.
 */
export function toGeminiTools(
  tools: readonly Tool[],
): Array<{ functionDeclarations: FunctionDeclaration[] }> {
  if (tools.length === 0) return [];
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}
