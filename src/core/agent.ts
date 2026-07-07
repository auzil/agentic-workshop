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
    // TASK 1 — Add a system message so the model receives its persona on every turn.
    // It must come before the user message in the array.
    // Shape: { role: 'system', content: this.instructions }
    const messages: ChatCompletionMessageParam[] = [
      { role: 'user', content: input },
    ];

    const tools = toOpenAITools([...this.tools.values()]);

    // TASK 2 — Wrap everything below in a for loop that runs up to this.maxSteps
    // iterations. A model that keeps calling tools will loop forever without a cap —
    // maxSteps is that safety net. After the loop, throw if no answer was produced.

    this.logger.llmCall(this.model, [...this.tools.keys()]);

    const response = await getLlm().chat.completions.create({
      model: this.model,
      messages,
      ...(tools.length > 0 ? { tools } : {}),
    });

    const message = response.choices[0]?.message;
    if (!message) throw new Error('Azure OpenAI returned a response with no choices.');

    const toolCalls = message.tool_calls ?? [];

    // TASK 4 — No tool calls: the model is done. Log the text and return it.
    // Use this.logger.llmText to surface the answer in the terminal trace.
    if (toolCalls.length === 0) {
      throw new Error('Not yet implemented — see workshops/01-agent-loop/README.md.');
    }

    // TASK 3 — Handle tool calls.
    //
    // Step A — append the assistant turn to history BEFORE the results.
    //   The API enforces this order; pushing results first returns a 400.
    //   { role: 'assistant', content: message.content, tool_calls: message.tool_calls }
    //
    // Step B — execute each tool in parallel and return one result message per call.
    //   Log each call with this.logger.toolCall and each result with toolResult.
    //   Link every result back to its request by tool_call_id:
    //   { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) }
    const toolResults = await Promise.all(
      toolCalls.map(async (call) => {
        const name = call.function.name;
        const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
        const tool = this.tools.get(name);
        if (!tool) throw new Error(`Model called unknown tool: ${name}`);
        this.logger.toolCall(name, args);

        throw new Error('Not yet implemented — see workshops/01-agent-loop/README.md.');
      }),
    );

    messages.push(...toolResults);

    // This throw belongs after your loop — reached only when maxSteps is exhausted.
    throw new Error(
      `Agent ${this.name} exceeded maxSteps (${this.maxSteps}) without producing a final answer.`,
    );
  }
}
