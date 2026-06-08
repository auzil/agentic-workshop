import { Agent } from './agent.js';

/**
 * A single step in a {@link pipeline}.
 *
 * Either an {@link Agent} — its `run` receives the previous step's output —
 * or a plain (possibly async) function. Functions are the natural shape for
 * **programmatic gates**: validate the previous output, transform it, or
 * throw to short-circuit the chain.
 */
export type PipelineStep =
  | Agent
  | ((input: string) => Promise<string> | string);

/**
 * Run `steps` in order, threading each step's output into the next.
 *
 * Built in **Workshop 02** and reused by later workshops. Implements the
 * Anthropic *prompt-chaining* pattern: decompose a fixed task into smaller
 * subtasks, with optional programmatic gates between LLM calls.
 *
 * ```
 * input ──▶ Agent A ──▶ (gate?) ──▶ Agent B ──▶ Agent C ──▶ output
 * ```
 *
 * A step that throws aborts the pipeline — that is the gate mechanism.
 *
 * @see workshops/02-pipeline/README.md
 */
export async function pipeline(
  input: string,
  ...steps: readonly PipelineStep[]
): Promise<string> {
  let current = input;
  for (const step of steps) {
    current =
      step instanceof Agent ? await step.run(current) : await step(current);
  }
  return current;
}
