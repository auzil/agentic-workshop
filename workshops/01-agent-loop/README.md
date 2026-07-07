# Workshop 01 — The Agent Loop

**Pattern:** Augmented LLM + autonomous agent
**Time:** ~60 minutes
**You'll build:** `src/core/agent.ts` — the `Agent` class consumed by Workshops 02–05.

## What an "agent" actually is

An agent is just an LLM in a loop. On each turn, the model either:

- **emits text** → we're done, return it; or
- **emits tool calls** → we execute them, hand back the results, and let the model continue.

That's the whole pattern. No frameworks needed. By the end of this hour you'll have written it yourself.

```
┌────────┐  prompt   ┌─────────┐  tool calls  ┌──────────┐
│  user  │──────────▶│  Agent  │─────────────▶│  tools   │
└────────┘           │ (LLM)   │◀─────────────│          │
                     │  loop   │   results    └──────────┘
                     └─────────┘
                        │ final answer
                        ▼
```

## Before you start

```bash
npm install
cp .env.example .env       # then fill in your Azure OpenAI credentials
```

Confirm types compile:

```bash
npm run typecheck
```

You'll edit one file: [`src/core/agent.ts`](../../src/core/agent.ts). Specifically the body of `Agent.run()`.

The demo entry points (`starter.ts` and `solution.ts` in this folder) call `new Agent({...}).run(...)` — they will fail until you implement `run()`.

## Tour of the code

Skim these in order before writing anything:

| File | What it does |
| ---- | ------------ |
| [`src/core/messages.ts`](../../src/core/messages.ts) | Re-exports the SDK's `Content` type (`ChatCompletionMessageParam`). The conversation history is a `Content[]`. |
| [`src/core/tool.ts`](../../src/core/tool.ts) | Defines our `Tool` interface and `toOpenAITools()` — converts our tools into the shape the API expects. |
| [`src/core/llm.ts`](../../src/core/llm.ts) | `getLlm()` returns the Azure OpenAI client. `DEFAULT_MODEL` comes from `AZURE_OPENAI_MODEL` in `.env`. |
| [`src/core/logger.ts`](../../src/core/logger.ts) | Pretty terminal logger — call `this.logger.llmCall(...)`, `.toolCall(...)`, etc. |
| [`src/core/agent.ts`](../../src/core/agent.ts) | **Your job.** Constructor and types are done; `run()` is the exercise. |
| [`src/tools/calculator.ts`](../../src/tools/calculator.ts) | The first tool. The starter agent uses it. |

For the SDK shape (what `chat.completions.create` returns, what a `tool_calls` entry looks like), keep the [OpenAI function calling docs](https://platform.openai.com/docs/guides/function-calling) open.

## The exercise — step by step

### Step 1 — Run the starter and watch it fail

```bash
npm run ws:01
```

You'll see a clear error: `Agent.run() is not yet implemented`. Good — that means the wiring works.

### Step 2 — Sketch the loop in your head

Open `src/core/agent.ts`. The `run(input)` method needs to:

1. Initialize a `ChatCompletionMessageParam[]` history with a `system` message (instructions) and the first `user` message.
2. Loop up to `this.maxSteps` times:
   - Call `getLlm().chat.completions.create({...})` with the current history and tool declarations.
   - If the response contains `tool_calls`, execute each tool, append both the assistant turn and the tool-result turns to history, then loop.
   - If the response is text, log it and return it.
3. If we exhaust `maxSteps`, throw with a useful error.

### Step 3 — Build the request

Inside the loop, the request looks like this (adapt to use your fields):

```ts
const response = await getLlm().chat.completions.create({
  model: this.model,
  messages,
  tools: toOpenAITools([...this.tools.values()]),
});
```

Log the call with `this.logger.llmCall(this.model, [...this.tools.keys()])` *before* the call so the trace shows what you're about to do.

### Step 4 — Branch on tool calls vs text

```ts
const message = response.choices[0]?.message;
const toolCalls = message.tool_calls ?? [];
if (toolCalls.length === 0) {
  const text = message.content ?? '';
  this.logger.llmText(text);
  return text;
}
```

### Step 5 — Append the assistant's tool-call turn

The assistant's turn (which carries the tool call requests) must be added to history *before* the results:

```ts
messages.push({
  role: 'assistant',
  content: message.content,
  tool_calls: message.tool_calls,
});
```

### Step 6 — Execute each tool, append results

For each `call` in `toolCalls`:

- Name and args come from `call.function.name` and `JSON.parse(call.function.arguments)`.
- Look the tool up: `const tool = this.tools.get(name);` — if missing, throw.
- Execute and add one `role: 'tool'` message per result, keyed by `tool_call_id`:

```ts
messages.push({
  role: 'tool',
  tool_call_id: call.id,
  content: JSON.stringify(result),
});
```

Use `Promise.all` to run independent tool calls in parallel, then push all results before looping.

Don't forget to log: `this.logger.toolCall(name, args)` before, `.toolResult(name, result)` after.

### Step 7 — Run it

```bash
npm run ws:01
```

You should see the agent call the calculator, get a result, and produce a final answer. The terminal should look something like:

```
[math-tutor] → llm    model=gpt-4o tools=[calculator]
[math-tutor] → tool   calculator({"expression":"47 * 12"})
[math-tutor] ← result calculator → {"result":564}
[math-tutor] → llm    model=gpt-4o tools=[calculator]
[math-tutor] → tool   calculator({"expression":"1024 / 8"})
[math-tutor] ← result calculator → {"result":128}
[math-tutor] → llm    model=gpt-4o tools=[calculator]
[math-tutor] ← text   The result is 692.
```

### Step 8 — Try the harder demo

```bash
npm run ws:01:solution
```

It runs three scenarios — multi-step math, a non-tool conversation, and a deliberately ambiguous question. Watch how the loop behaves across all three.

## Stretch goals

- **Tool error recovery.** Wrap each `tool.execute` call in `try/catch`. On error, send `{ functionResponse: { ..., response: { error: message } } }` back to the model — does it self-correct?
- **Step counting in logs.** Add `step=3/10` to each log line so students can see how many iterations the loop ran.
- **A second tool.** Write a `getCurrentTime()` tool and ask the agent "How many minutes until midnight?" — it has to call two different tools.

## Reference solution

Stuck or want to compare? Expand:

<details>
<summary><b>Reference implementation of <code>Agent.run()</code></b></summary>

```ts
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

    messages.push({
      role: 'assistant',
      content: message.content,
      tool_calls: message.tool_calls,
    });

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
          return { role: 'tool' as const, tool_call_id: call.id, content: JSON.stringify(result) };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`tool ${name} threw: ${msg}`);
          return { role: 'tool' as const, tool_call_id: call.id, content: JSON.stringify({ error: msg }) };
        }
      }),
    );

    messages.push(...toolResults);
  }

  throw new Error(
    `Agent ${this.name} exceeded maxSteps (${this.maxSteps}) without producing a final answer.`,
  );
}
```

</details>

## What you've built

By the end of this workshop, `src/core/agent.ts` is a working autonomous agent — and it's also the foundation for the next four workshops:

- **W2 (Pipeline)** chains `Agent`s together.
- **W3 (Router & Supervisor)** uses one `Agent` to dispatch to others.
- **W4 (Parallel)** runs `Agent`s concurrently with `Promise.all`.
- **W5 (Reflection)** runs a writer `Agent` and a critic `Agent` in a loop.

You wrote that. Move on to W2.
