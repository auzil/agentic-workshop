import type { Content } from '@google/genai';
import { DEFAULT_MODEL, getLlm } from './llm.js';
import { Logger } from './logger.js';
import { toGeminiTools, type Tool } from './tool.js';

/** Configuration for a new {@link Agent}. */
export interface AgentConfig {
  /** Used in logs to identify which agent is talking. */
  readonly name: string;
  /** System instruction shown to the model on every turn. */
  readonly instructions: string;
  /** Tools the agent may call. Optional — agents can run text-only. */
  readonly tools?: readonly Tool[];
  /** Override the default model. See `src/core/llm.ts`. */
  readonly model?: string;
  /** Hard cap on loop iterations. Defaults to 10 — prevents runaway agents. */
  readonly maxSteps?: number;
}

/**
 * The autonomous-agent loop: an LLM that calls tools until it has an answer.
 *
 * Built in **Workshop 01** and used unchanged by Workshops 02–05. The
 * constructor and types are complete; `run()` is the exercise.
 *
 * @see workshops/01-agent-loop/README.md
 */
export class Agent {
  readonly name: string;
  protected readonly instructions: string;
  protected readonly tools: Map<string, Tool>;
  protected readonly model: string;
  protected readonly maxSteps: number;
  protected readonly logger: Logger;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.instructions = config.instructions;
    this.tools = new Map((config.tools ?? []).map((t) => [t.name, t]));
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxSteps = config.maxSteps ?? 10;
    this.logger = new Logger(config.name);
  }

  /**
   * Run the agent on a single user input and return its final text answer.
   *
   * The loop, in plain English:
   *   1. Send the conversation so far + tool declarations to the LLM.
   *   2. If the model responded with `functionCalls` — execute each, append
   *      both the model's tool-call turn and the tool-result turn to history,
   *      then loop.
   *   3. If the model responded with text — log it and return.
   *   4. If we've looped `maxSteps` times without finishing, throw.
   */
  async run(input: string): Promise<string> {
    const contents: Content[] = [
      { role: 'user', parts: [{ text: input }] },
    ];
    const tools = toGeminiTools([...this.tools.values()]);

    for (let step = 0; step < this.maxSteps; step++) {
      this.logger.llmCall(this.model, [...this.tools.keys()]);

      const response = await getLlm().models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: this.instructions,
          ...(tools.length > 0 ? { tools } : {}),
        },
      });

      const calls = response.functionCalls ?? [];
      if (calls.length === 0) {
        const text = response.text ?? '';
        this.logger.llmText(text);
        return text;
      }

      contents.push({
        role: 'model',
        parts: calls.map((call) => ({ functionCall: call })),
      });

      const responseParts = await Promise.all(
        calls.map(async (call) => {
          const name = call.name;
          if (!name) {
            throw new Error('Model returned a function call without a name.');
          }
          const tool = this.tools.get(name);
          if (!tool) {
            throw new Error(`Model called unknown tool: ${name}`);
          }
          this.logger.toolCall(name, call.args);
          try {
            const result = await tool.execute(
              (call.args ?? {}) as Record<string, unknown>,
            );
            this.logger.toolResult(name, result);
            return {
              functionResponse: {
                id: call.id,
                name,
                response: { result },
              },
            };
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`tool ${name} threw: ${message}`);
            return {
              functionResponse: {
                id: call.id,
                name,
                response: { error: message },
              },
            };
          }
        }),
      );

      contents.push({ role: 'user', parts: responseParts });
    }

    throw new Error(
      `Agent ${this.name} exceeded maxSteps (${this.maxSteps}) without producing a final answer.`,
    );
  }
}
