import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { DEFAULT_MODEL, getLlm } from './llm.js';
import { Logger } from './logger.js';
import { toOpenAITools, type Tool } from './tool.js';

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
   *   2. If the model responded with `tool_calls` — execute each, append
   *      both the assistant's tool-call turn and the tool-result turns to
   *      history, then loop.
   *   3. If the model responded with text — log it and return.
   *   4. If we've looped `maxSteps` times without finishing, throw.
   */
  async run(input: string): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.instructions },
      { role: 'user', content: input },
    ];
    const tools = toOpenAITools([...this.tools.values()]);

    for (let step = 0; step < this.maxSteps; step++) {
      this.logger.llmCall(this.model, [...this.tools.keys()]);

      const response = await getLlm().chat.completions.create({
        model: this.model,
        messages,
        ...(tools.length > 0 ? { tools } : {}),
      });

      const message = response.choices[0]?.message;
      if (!message) {
        throw new Error('Azure OpenAI returned a response with no choices.');
      }

      const toolCalls = message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        const text = message.content ?? '';
        this.logger.llmText(text);
        return text;
      }

      // Append the assistant's turn (contains the tool_calls the model wants run)
      messages.push({
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls,
      });

      // Execute each tool call and collect results
      const toolResults = await Promise.all(
        toolCalls.map(async (call) => {
          const name = call.function.name;
          const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
          const tool = this.tools.get(name);
          if (!tool) {
            throw new Error(`Model called unknown tool: ${name}`);
          }
          this.logger.toolCall(name, args);
          try {
            const result = await tool.execute(args);
            this.logger.toolResult(name, result);
            return {
              role: 'tool' as const,
              tool_call_id: call.id,
              content: JSON.stringify(result),
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`tool ${name} threw: ${msg}`);
            return {
              role: 'tool' as const,
              tool_call_id: call.id,
              content: JSON.stringify({ error: msg }),
            };
          }
        }),
      );

      // Each tool result is its own 'tool' message (one per call)
      messages.push(...toolResults);
    }

    throw new Error(
      `Agent ${this.name} exceeded maxSteps (${this.maxSteps}) without producing a final answer.`,
    );
  }
}
