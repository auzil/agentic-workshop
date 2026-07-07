# Agentic Patterns

The five patterns we teach, with authoritative definitions and the exact mapping to workshops. Terminology and definitions are taken from Anthropic's ["Building Effective Agents"](https://www.anthropic.com/engineering/building-effective-agents), the most-cited public taxonomy.

A note on terminology from that post:

> **Workflows** are systems where LLMs and tools are orchestrated through predefined code paths. **Agents** are systems where LLMs dynamically direct their own processes and tool usage.

W1 builds an **agent**. W2–W4 build **workflows** that compose agents. W5 builds an evaluator-optimizer **workflow** around an agent.

---

## The augmented LLM (foundation)

> A single LLM enhanced with retrieval, tools, and memory.

Every workshop assumes this baseline. In our codebase the augmented LLM **is** the `Agent` class: an LLM call wrapped with system instructions, a tool registry, and conversation history.

---

## Workshop 01 — The Agent Loop (Autonomous Agent)

> *"LLM using tools based on environmental feedback in a loop."* The agent maintains control over tool selection and planning; the loop continues until the model decides it's done.

**Structure**

```
┌────────┐   prompt    ┌─────────┐  tool calls  ┌──────────┐
│  user  │────────────▶│  Agent  │─────────────▶│  tools   │
└────────┘             │ (LLM)   │◀─────────────│          │
                       │  loop   │  results     └──────────┘
                       └─────────┘
                          │ final answer
                          ▼
```

**When to use:** Open-ended problems where you can't predict the number of steps.

**When NOT to use:** Latency-sensitive tasks; untrusted environments where unbounded tool use is dangerous; tasks with a fixed, known path (use a workflow instead).

**Critical principle from the source:** *"Design toolsets and their documentation clearly and thoughtfully."* Most agent failures are tool-design failures.

**What we build:** `src/core/agent.ts` — an `Agent` class with a `run(input: string): Promise<string>` method that loops over `chat.completions.create` calls, executing tool calls until the model emits text.

---

## Workshop 02 — Sequential Pipeline (Prompt Chaining)

> *"Each LLM call processes the output of the previous one,"* with optional programmatic gates between steps.

**Structure**

```
input ──▶ Agent A ──▶ (gate?) ──▶ Agent B ──▶ Agent C ──▶ output
```

**When to use:** Tasks decomposable into fixed subtasks; trading latency for accuracy; when each step has a clear, narrow responsibility.

**When NOT to use:** Step structure is unpredictable; needs dynamic decision-making.

**Examples from the source:** Generating marketing copy, then translating it. Outline → validate → full document.

**What we build:** A `pipeline(...agents)` helper that runs agents in order, threading each agent's output into the next. Exercise: a research → outline → draft → polish chain, with one programmatic gate (e.g., word count check).

---

## Workshop 03 — Router & Supervisor (Routing + Orchestrator-Workers)

This workshop teaches two related patterns.

### Routing (start here)

> *"Classification of input directs it to specialized downstream tasks."*

**Structure**

```
                  ┌──▶ Agent A (refunds)
input ──▶ Router ─┼──▶ Agent B (technical)
                  └──▶ Agent C (general)
```

**When to use:** Complex tasks with distinct categories better handled separately. Also: cost/quality routing — cheap model for easy queries, expensive for hard ones.

**When NOT to use:** Categories overlap; classification is unreliable.

### Orchestrator-Workers (the supervisor variant)

> *"A central LLM dynamically breaks down tasks, delegates to worker LLMs, and synthesizes results."*

**Structure**

```
              ┌──▶ Worker A ──┐
input ──▶ Orchestrator ──▶ Worker B ──▶ synthesize ──▶ output
              └──▶ Worker C ──┘
```

**Difference from routing:** The router classifies once and hands off. The orchestrator decides what to delegate, in what order, possibly multiple times, and synthesizes the results.

**When to use:** Complex tasks where subtasks cannot be pre-defined.

**When NOT to use:** Task structure is fixed and predictable — use a pipeline.

**What we build:** A simple LLM-as-router that routes a customer-support-style input to one of three specialist agents, then a small orchestrator that may call multiple workers.

---

## Workshop 04 — Parallel Fan-Out (Parallelization)

Two variants from the source:

### Sectioning

Independent subtasks run simultaneously, results merged.

```
            ┌──▶ Agent A ─┐
input ──┬──▶│  Agent B    │──▶ merge ──▶ output
            └──▶ Agent C ─┘
```

**Example from the source:** Content guardrails — one instance screens, another responds, in parallel.

### Voting

Same task run multiple times for diverse outputs / confidence.

```
            ┌──▶ Agent (run 1) ─┐
input ──┬──▶│  Agent (run 2)    │──▶ vote/aggregate ──▶ output
            └──▶ Agent (run 3) ─┘
```

**Example from the source:** Code vulnerability review across multiple prompts.

**When to use:** Speed improvement, or diverse perspectives needed for confidence.

**When NOT to use:** Sequential dependencies between subtasks.

**What we build:** A `fanOut(agents, input)` helper using `Promise.all`, plus a `merge` step (with a final LLM call to synthesize, or a deterministic merge depending on the task).

---

## Workshop 05 — Reflection Loop (Evaluator-Optimizer)

> *"One LLM generates responses; another provides iterative feedback in a loop."*

**Structure**

```
input ──▶ Generator ──┬──▶ Evaluator ──▶ pass? ──▶ output
              ▲       │
              │       └──▶ feedback
              └────────────┘
```

**When to use:** Clear evaluation criteria exist, and iterative refinement provides measurable value.

**When NOT to use:** Single-pass solutions suffice; criteria are vague.

**Examples from the source:** Literary translation refining nuance; comprehensive search requiring multiple analysis rounds.

**What we build:** A reflection loop: a writer agent produces a draft, a critic agent evaluates against rubric criteria, and the writer revises until the critic passes or a max-iterations cap is hit.

---

## Cross-cutting principles

Pulled from the same source — these apply to every workshop:

1. **Start simple.** Add complexity only when measured improvements warrant it. A single well-prompted LLM call beats a misconfigured agent.
2. **Workflows over agents when the path is known.** Determinism is cheaper, faster, and more debuggable.
3. **Tool design is most of the work.** Names, descriptions, and parameter shapes drive whether the model picks the right tool.
4. **Cap your loops.** Always have a max-step bound. Unbounded loops + flaky tools = unbounded cost.
5. **Make traces visible.** Students should *see* every step. Our `Logger` exists specifically for this.
