# Agentic AI — Hands-On Workshop Series

Build multi-agent systems, one pattern at a time. Five 1-hour, hands-on workshops in TypeScript + Node.js, using Gemini as the LLM provider.

| # | Workshop | Pattern |
| - | -------- | ------- |
| 01 | The Agent Loop | Augmented LLM + autonomous agent |
| 02 | Sequential Pipeline | Prompt chaining |
| 03 | Router & Supervisor | Routing + orchestrator-workers |
| 04 | Parallel Fan-Out | Parallelization (sectioning + voting) |
| 05 | Reflection Loop | Evaluator-optimizer |

The codebase is **one progressive build** — Workshop 01 produces the `Agent` class that Workshops 02–05 then import and extend.

## Setup

You'll need **Node.js 22+** and a **Gemini API key** (free tier works — get one at [aistudio.google.com](https://aistudio.google.com/)).

```bash
git clone <this repo>
cd ai-agentic-workshop1
npm install
cp .env.example .env          # then put your GEMINI_API_KEY in
```

## Run a workshop

```bash
npm run ws:01                 # runs Workshop 01 — the agent loop
npm run ws:01:solution        # runs the reference solution for W1
```

Each workshop has its own README with the exercise brief — start there:

- [Workshop 01 — The Agent Loop](./workshops/01-agent-loop/README.md)
- [Workshop 02 — Sequential Pipeline](./workshops/02-pipeline/README.md)

## Project layout

```
ai-agentic-workshop1/
├── docs/                        # research notes — the "why" behind every decision
├── src/
│   ├── core/                    # shared library extended each workshop
│   └── tools/                   # reusable tool implementations
└── workshops/0X-name/           # one folder per workshop
    ├── README.md                # exercise brief
    ├── starter.ts               # what you start from
    └── solution.ts              # reference implementation
```

For deeper context — SDK choices, model lineup, conventions — read [`docs/`](./docs/00-research-overview.md). For project-wide rules, read [`CLAUDE.md`](./CLAUDE.md).

## Type-check

```bash
npm run typecheck
```

There is no build step. We run `.ts` files directly via `tsx`.
