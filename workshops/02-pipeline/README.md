# Workshop 02 — Sequential Pipeline

**Pattern:** Prompt chaining
**Time:** ~60 minutes
**You'll build:** `src/core/pipeline.ts` — a `pipeline(input, ...steps)` helper that wires `Agent`s together in order, with room for programmatic gates between them.

## The pattern

> Each LLM call processes the output of the previous one, with optional programmatic gates between steps. — *[Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)*

```
input ──▶ Agent A ──▶ (gate?) ──▶ Agent B ──▶ Agent C ──▶ output
```

Where W1 builds *one* agent that loops over its own tool calls, W2 builds a **fixed sequence** of agents — a workflow. Each agent has a narrower job, which means narrower prompts, easier debugging, and the option to slot in deterministic code between LLM calls.

**When to use:** the task decomposes into known subtasks; you're willing to trade latency for accuracy and clarity.
**When NOT to use:** the path through the work is unpredictable — that's an agent, not a pipeline.

## Before you start

You should already have:

- Finished Workshop 01 (or copied its `Agent.run()` body into `src/core/agent.ts`).
- A working `GEMINI_API_KEY` in `.env`.
- Types clean: `npm run typecheck`.

## Tour of the code

| File | What it does |
| ---- | ------------ |
| [`src/core/pipeline.ts`](../../src/core/pipeline.ts) | **Your job.** Implements `pipeline(input, ...steps)`. |
| [`src/core/agent.ts`](../../src/core/agent.ts) | Unchanged from W1. Each step in the pipeline is just an `Agent`. |
| [`workshops/02-pipeline/starter.ts`](./starter.ts) | A four-agent blog-post chain — researcher → outliner → drafter → polisher. |
| [`workshops/02-pipeline/solution.ts`](./solution.ts) | The same chain with a programmatic word-count gate between LLM calls. |

## The exercise — step by step

### Step 1 — Run the starter and watch it fail

```bash
npm run ws:02
```

You'll see an error pointing at `pipeline()`. Good — the wiring works.

### Step 2 — Sketch the shape

Open [`src/core/pipeline.ts`](../../src/core/pipeline.ts). The signature is:

```ts
export async function pipeline(
  input: string,
  ...steps: readonly PipelineStep[]
): Promise<string>
```

where a step is either an `Agent` or a plain function:

```ts
export type PipelineStep =
  | Agent
  | ((input: string) => Promise<string> | string);
```

That union is the whole point — it lets you drop a programmatic check in between two LLM steps without inventing a "gate" type. A function step is a gate.

### Step 3 — Implement the loop

It's five lines. Walk the steps array, carry the current text, branch on whether the step is an `Agent` or a function:

```ts
let current = input;
for (const step of steps) {
  current = step instanceof Agent
    ? await step.run(current)
    : await step(current);
}
return current;
```

Why no logging in `pipeline()` itself? Each `Agent` already logs through its own `Logger` — the step's `name` shows up in every line. The trace narrates itself.

### Step 4 — Run the starter

```bash
npm run ws:02
```

You should see four agents run in sequence — each one printing `→ llm` and `← text` lines — and a polished blog post at the end:

```
[researcher] → llm    model=gemini-2.5-flash
[researcher] ← text   - TypeScript adds static types to JavaScript…
[outliner]   → llm    model=gemini-2.5-flash
[outliner]   ← text   ## Intro …
[drafter]    → llm    model=gemini-2.5-flash
[drafter]    ← text   ## Intro …
[polisher]   → llm    model=gemini-2.5-flash
[polisher]   ← text   ## Intro …
```

### Step 5 — Add a programmatic gate

A gate is just a `PipelineStep` function: it inspects the previous step's output and either returns it (pass) or throws (fail). Drop one between any two agents.

```ts
function requireMinWords(min: number): PipelineStep {
  return (text) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words < min) {
      throw new Error(`Gate failed: ${words} words (need >= ${min}).`);
    }
    return text;
  };
}

await pipeline(
  topic,
  researcher,
  requireMinWords(30),   // ← gate
  outliner,
  drafter,
  polisher,
);
```

A throw aborts the chain and skips downstream LLM calls — that's the whole point of gating: catch bad intermediate output before you spend more tokens on it.

### Step 6 — Run the solution

```bash
npm run ws:02:solution
```

Two topics run through the gated chain. Watch how the agent traces interleave; notice that if a gate throws, the chain stops cleanly.

## Stretch goals

- **Transforming gate.** Write a gate that *modifies* the text — e.g., strips a leading "Here is your outline:" preamble — instead of throwing.
- **Branching pipeline.** Add a fifth agent (`translator`) that converts the polished post to another language. Now your `pipeline()` produces multilingual output for free.
- **Per-step model override.** Configure the `researcher` to use `gemini-2.5-pro` (slower, more thorough) while the others stay on `flash`. Where does it actually help?
- **Structured handoff.** Have the outliner return JSON and the drafter consume it. What changes in the agent prompts? What does it cost you in robustness?

## Reference solution

<details>
<summary><b>Reference implementation of <code>pipeline()</code></b></summary>

```ts
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
```

</details>

## What you've built

A 30-line helper that turns any list of `Agent`s into a workflow. Later workshops compose on top of this:

- **W3 (Router & Supervisor)** uses one `Agent` to choose *which* downstream agent to call. The pipeline is no longer linear.
- **W4 (Parallel)** runs steps with `Promise.all` instead of `for`. Same shape, different control flow.
- **W5 (Reflection)** wraps a two-agent loop (writer + critic) until the critic passes.

You wrote that. Move on to W3.
