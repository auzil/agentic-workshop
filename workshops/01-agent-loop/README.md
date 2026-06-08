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
cp .env.example .env       # then put your GEMINI_API_KEY in
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
| [`src/core/messages.ts`](../../src/core/messages.ts) | Re-exports the SDK's `Content` / `Part` types. The conversation history is a `Content[]`. |
| [`src/core/tool.ts`](../../src/core/tool.ts) | Defines our `Tool` interface and `toGeminiTools()` — converts our tools into the SDK's expected shape. |
| [`src/core/llm.ts`](../../src/core/llm.ts) | `getLlm()` returns the Gemini client. `DEFAULT_MODEL` is `gemini-2.5-flash`. |
| [`src/core/logger.ts`](../../src/core/logger.ts) | Pretty terminal logger — call `this.logger.llmCall(...)`, `.toolCall(...)`, etc. |
| [`src/core/agent.ts`](../../src/core/agent.ts) | **Your job.** Constructor and types are done; `run()` is the exercise. |
| [`src/tools/calculator.ts`](../../src/tools/calculator.ts) | The first tool. The starter agent uses it. |

For the SDK shape (what `generateContent` returns, what a `functionCall` part looks like), keep [`docs/01-gemini-sdk.md`](../../docs/01-gemini-sdk.md) open.

## The exercise — step by step

### Step 1 — Run the starter and watch it fail

```bash
npm run ws:01
```

You'll see a clear error: `Agent.run() is not yet implemented`. Good — that means the wiring works.

### Step 2 — Sketch the loop in your head

Open `src/core/agent.ts`. The `run(input)` method needs to:

1. Initialize a `Content[]` history with the user input.
2. Loop up to `this.maxSteps` times:
   - Call `getLlm().models.generateContent({...})` with the current history, plus your tools and the system instruction.
   - If the response contains `functionCalls`, execute each tool, append both turns to history, and continue the loop.
   - If the response is text, log it and return it.
3. If we exhaust `maxSteps`, throw with a useful error.

### Step 3 — Build the request

Inside the loop, the request looks like this (adapt to use your fields):

```ts
const response = await getLlm().models.generateContent({
  model: this.model,
  contents,
  config: {
    systemInstruction: this.instructions,
    tools: toGeminiTools([...this.tools.values()]),
  },
});
```

Log the call with `this.logger.llmCall(this.model, [...this.tools.keys()])` *before* the call so the trace shows what you're about to do.

### Step 4 — Branch on tool calls vs text

```ts
const calls = response.functionCalls ?? [];
if (calls.length === 0) {
  const text = response.text ?? '';
  this.logger.llmText(text);
  return text;
}
```

### Step 5 — Append the model's tool-call turn

The model's tool-call response has to be added to history *before* the tool results, with `role: 'model'`:

```ts
contents.push({
  role: 'model',
  parts: calls.map((call) => ({ functionCall: call })),
});
```

### Step 6 — Execute each tool, append results

For each `call`:

- Look it up: `const tool = this.tools.get(call.name);`
- If missing, throw — the model called something we don't have.
- Otherwise, execute and capture the result.

Append all results as a single `role: 'user'` turn (yes, *user* — the SDK uses the user role for anything coming back into the model, including tool outputs):

```ts
contents.push({
  role: 'user',
  parts: results.map((r) => ({
    functionResponse: { id: r.id, name: r.name, response: { result: r.result } },
  })),
});
```

Use `Promise.all` to run independent tool calls in parallel — the SDK matches results to calls via `id`, so order doesn't matter.

Don't forget to log: `this.logger.toolCall(name, args)` before, `.toolResult(name, result)` after.

### Step 7 — Run it

```bash
npm run ws:01
```

You should see the agent call the calculator, get a result, and produce a final answer. The terminal should look something like:

```
[math-tutor] → llm    model=gemini-2.5-flash tools=[calculator]
[math-tutor] → tool   calculator({"expression":"47 * 12"})
[math-tutor] ← result calculator → {"result":564}
[math-tutor] → llm    model=gemini-2.5-flash tools=[calculator]
[math-tutor] → tool   calculator({"expression":"1024 / 8"})
[math-tutor] ← result calculator → {"result":128}
[math-tutor] → llm    model=gemini-2.5-flash tools=[calculator]
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
        // call.name is typed as string | undefined in the SDK, so narrow first.
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
```

</details>

## What you've built

By the end of this workshop, `src/core/agent.ts` is a working autonomous agent — and it's also the foundation for the next four workshops:

- **W2 (Pipeline)** chains `Agent`s together.
- **W3 (Router & Supervisor)** uses one `Agent` to dispatch to others.
- **W4 (Parallel)** runs `Agent`s concurrently with `Promise.all`.
- **W5 (Reflection)** runs a writer `Agent` and a critic `Agent` in a loop.

You wrote that. Move on to W2.
