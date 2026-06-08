# Research Overview

This folder captures the investigation we did **before** writing any code, so the choices the workshops are built on are explicit and auditable. Workshop attendees and future maintainers can read the docs in order to understand *why* the codebase looks the way it does.

## How to read these docs

| # | File | What it covers | Why it exists |
| - | ---- | -------------- | ------------- |
| 01 | [Gemini SDK](./01-gemini-sdk.md) | The `@google/genai` SDK surface we use — client, `generateContent`, function calling, multi-turn loop | Every workshop calls Gemini through this SDK |
| 02 | [Gemini models](./02-gemini-models.md) | Model lineup as of April 2026 and our default choice | We need a stable, cheap, fast default |
| 03 | [Node + TypeScript setup](./03-node-typescript-setup.md) | ESM, `tsx`, `tsconfig`, project layout, style guide | The base every workshop builds on |
| 04 | [Agentic patterns](./04-agentic-patterns.md) | The five patterns we teach — definitions, when to use, when not to | One workshop per pattern |

## Mapping to workshops

| Workshop | Pattern | Primary docs |
| -------- | ------- | ------------ |
| 01 — The Agent Loop | Augmented LLM + autonomous agent | 01, 04 |
| 02 — Sequential Pipeline | Prompt chaining | 04 |
| 03 — Router & Supervisor | Routing + orchestrator-workers | 04 |
| 04 — Parallel Fan-Out | Parallelization (sectioning + voting) | 04 |
| 05 — Reflection Loop | Evaluator-optimizer | 04 |

## Sources cited

All claims in these docs come from primary sources:

- [`@google/genai` API docs](https://googleapis.github.io/js-genai/release_docs/index.html)
- [Gemini API: Function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [Gemini API: Models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini API: Node.js quickstart](https://ai.google.dev/gemini-api/docs/quickstart?lang=node)
- [Node.js: Run TypeScript natively](https://nodejs.org/en/learn/typescript/run-natively)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Anthropic — Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)

## Decisions captured

A short list of decisions that came out of this research and that drive the codebase. Each is justified in its respective doc.

1. **SDK:** `@google/genai` (the actively-maintained Google Gen AI SDK), not the legacy `@google/generative-ai`.
2. **Default model:** `gemini-2.5-flash` (stable, low-cost, low-latency, function-calling capable).
3. **Runtime:** Node.js 22+ with `tsx` for zero-build TypeScript execution; `"type": "module"` and ESM throughout.
4. **Imports use `.js` extensions** in source even though files are `.ts` — required for Node's NodeNext module resolution and for the path forward to native Node TS execution.
5. **Naming:** Google TypeScript Style Guide conventions — `snake_case` filenames, `UpperCamelCase` types, `lowerCamelCase` values, `CONSTANT_CASE` module-level constants. Named exports only.
6. **No agent framework.** Students build the agent loop in W1 themselves; that artifact powers W2–W5. The pedagogical point is the loop, and frameworks hide it.
7. **Pattern terminology:** we use Anthropic's "Building Effective Agents" taxonomy. It is the most-cited public taxonomy and maps cleanly onto our five workshops.
