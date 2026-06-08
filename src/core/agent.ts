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
    // ─────────────────────────────────────────────────────────────────
    //  TODO (Workshop 01) — implement the agent loop here.
    //
    //  Files you'll need:
    //    • getLlm()          from './llm.js'   — the Gemini client
    //    • toGeminiTools()   from './tool.js'  — converts Tool[] → SDK shape
    //    • this.logger       — call .llmCall, .toolCall, .toolResult, .llmText
    //    • this.tools        — Map<string, Tool> of available tools
    //    • Content type      from '@google/genai' — the conversation history shape
    //
    //  Walkthrough lives in:
    //    workshops/01-agent-loop/README.md
    //
    //  Reference (for the SDK call shape and multi-turn pattern):
    //    docs/01-gemini-sdk.md  →  "The agent loop"
    // ─────────────────────────────────────────────────────────────────
    void input;
    void getLlm;
    void toGeminiTools;
    const _placeholder: Content[] = [];
    void _placeholder;

    const history: Content[] = [
      { role: 'user', parts: [{text: input}] },
    ];

    let step = 0;
  
    while (step < this.maxSteps) {

      this.logger.llmCall(this.model, [...this.tools.keys()]);

      const response = await getLlm().models.generateContent({
        model: this.model,
        contents: history,
        config: {
          systemInstruction: this.instructions,
          tools: toGeminiTools(Array.from(this.tools.values())),
        },
      });

      const calls = response.functionCalls ?? [];
      if (calls.length === 0) {
        const text = response.text ?? '';
        this.logger.llmText(text);
        return text;
      }

      history.push({ role: 'model', parts: calls.map( call => ({functionCall: call})) });

      const toolResults = [];
      for (const call of calls) {
       console.log('Model called tool:', JSON.stringify(call));

       if (call.name === undefined) {
        throw new Error(`Model made a function call without a name!`);
       }

        const tool = this.tools.get(call.name);

        if (!tool) {
          throw new Error(`Model called unknown tool: ${call.name}`);
        }

        const args = call.args ?? {};
        const result = await tool.execute(args);
        this.logger.toolCall(tool.name, args);
        this.logger.toolResult(tool.name, result);
        toolResults.push({ id: call.id, name: tool.name, result }); 
      }

      history.push({ 
        role: 'user',
        parts: toolResults.map(tr => ({
          functionResponse: { id: tr.id, name: tr.name, response: { result: tr.result } }
        }))
      });

      step++;
    }

    throw new Error(
      `Agent.run() is not yet implemented — that's the Workshop 01 exercise. ` +
        `Open workshops/01-agent-loop/README.md to begin.`,
    );
  }
}
