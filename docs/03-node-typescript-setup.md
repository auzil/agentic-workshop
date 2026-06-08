# Node.js + TypeScript Setup

The runtime, build, and style choices for this repo. Each section names the choice, then justifies it.

## Runtime: Node.js 22+

- The `@google/genai` SDK requires **Node 18+**.
- Node 22 is the current LTS at the time of writing and supports ESM, top-level `await`, and `--env-file` natively.
- Node 22.18+ also runs `.ts` files natively (with `--experimental-strip-types`), which we treat as a future-proofing direction but do not yet rely on.

Pin in `package.json`:

```json
"engines": { "node": ">=22" }
```

## Module system: ESM end-to-end

We set `"type": "module"` in `package.json`. This is the modern default:

- `@google/genai` is ESM-first.
- Top-level `await` works without ceremony.
- Aligns with the direction Node native TS support is moving in.

CommonJS is not supported in this repo.

## TypeScript runner: `tsx`

We run `.ts` files directly via [`tsx`](https://github.com/privatenumber/tsx):

```bash
npx tsx workshops/01-agent-loop/starter.ts
```

Why not Node native TS (`--experimental-strip-types`)?

- Still flagged experimental as of Node 22 in our research.
- Doesn't support TS-only syntax (enums, decorators, namespaces) without an additional `--experimental-transform-types` flag.
- `@google/genai` exports the `Type` enum, which is TS-side and is erased at runtime — that works under strip-types, but we want students to focus on the agent loop, not on Node's TS flags.

Why not `ts-node`?

- `tsx` is faster, has zero config, and supports ESM out of the box.

When Node's native TS support stabilizes, the migration is one-line: drop `tsx` and run `node` directly. Our import style (see below) is already compatible.

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "allowImportingTsExtensions": false
  },
  "include": ["src", "workshops"]
}
```

Notable choices:

- **`module` / `moduleResolution`: `NodeNext`** — the orthodox setting for Node ESM in 2026. Plays correctly with `tsx` and is the path Node's native TS support is on. The alternative `bundler` would let us skip extensions in imports but isn't appropriate for a Node-targeted project.
- **`noEmit: true`** — we never run `tsc` for output; `tsx` handles execution. `tsc --noEmit` is what we run for type-checking.
- **`strict: true`** — non-negotiable for teaching material. Loose typing teaches the wrong habits.
- **`noUncheckedIndexedAccess: true`** — `array[i]` is `T | undefined`. Forces students to think about empty cases.

## Imports — use `.js` extensions

Even though source files are `.ts`, imports of *our own files* must use the `.js` extension:

```ts
// ✅ correct
import { Agent } from './agent.js';

// ❌ wrong — NodeNext doesn't allow this
import { Agent } from './agent';
```

This is a Node ESM rule, inherited by NodeNext module resolution. The `.js` specifier maps to the `.ts` source at compile/resolve time. It is what Node's native TS support also expects, so this style is portable.

Imports of npm packages are unaffected:

```ts
import { GoogleGenAI } from '@google/genai';
```

## Project layout

```
ai-agentic-workshop1/
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── docs/                         # research notes
├── src/
│   ├── core/                     # shared library — the base extended each workshop
│   │   ├── agent.ts              # Agent class (built in W1, used in W2–W5)
│   │   ├── tool.ts               # Tool interface + helpers
│   │   ├── llm.ts                # Gemini client wrapper
│   │   ├── messages.ts           # Content / Part types
│   │   ├── logger.ts             # Pretty step logger
│   │   └── index.ts              # Barrel — public exports
│   └── tools/                    # reusable tool implementations
│       └── calculator.ts
└── workshops/
    ├── 01-agent-loop/
    │   ├── README.md
    │   ├── starter.ts
    │   └── solution.ts
    ├── 02-sequential-pipeline/
    ├── 03-router-supervisor/
    ├── 04-parallel-fanout/
    └── 05-reflection-loop/
```

Each workshop folder is self-contained. Workshops 2–5 import from `src/core` — the artifact W1 produces.

## Style — Google TypeScript Style Guide

We follow the [Google TS Style Guide](https://google.github.io/styleguide/tsguide.html). The conventions that matter most for this repo:

| Concern | Convention |
| ------- | ---------- |
| Filenames | `snake_case.ts` |
| Classes / interfaces / types / enums | `UpperCamelCase` |
| Variables / functions / methods | `lowerCamelCase` |
| Module-level constants | `CONSTANT_CASE` |
| Exports | **Named only.** No default exports. |
| Object shapes | `interface`, not `type` |
| Enums | Plain `enum`, never `const enum` |
| Immutable properties | Mark `readonly` |
| Errors | Throw `new Error(...)` (or subclasses); never throw strings |
| `catch` | Type as `unknown`, narrow with `instanceof Error` |
| `any` | Don't. Use `unknown` and narrow. |
| Comments | `/** JSDoc */` for public APIs only; `// line` for implementation notes |

**Filename note.** The Google guide recommends `snake_case.ts`. We adopt that for all source files. Workshop folders themselves use `kebab-case` because they're distribution units, not modules (e.g., `01-agent-loop/`).

## Environment variables

We use Node's built-in `--env-file` flag — no `dotenv` dependency:

```jsonc
// package.json
"scripts": {
  "ws:01": "node --env-file=.env --import tsx workshops/01-agent-loop/starter.ts",
  "typecheck": "tsc --noEmit"
}
```

`.env.example` is committed; `.env` is `.gitignore`d. Students copy and fill in.

## Linting and formatting

Out of scope for the workshop repo. The constraint is that the code passes `tsc --noEmit` and follows the style guide manually. Adding ESLint/Prettier would turn a 1-hour workshop into a tooling tutorial.

## Dependency budget

Hard-cap on production dependencies for the workshop core:

- `@google/genai` — required.

That's it. Dev dependencies: `typescript`, `tsx`, `@types/node`. Anything else has to justify itself against the cost of one more thing students have to learn.
