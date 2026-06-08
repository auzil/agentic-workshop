# Gemini SDK — `@google/genai`

A focused cheat sheet of the SDK surface we use across the workshops. Anything not in this doc is out of scope; reach for the [official reference](https://googleapis.github.io/js-genai/release_docs/index.html) if you need more.

> **SDK choice.** Google ships two Gen AI SDKs for JS/TS. We use **`@google/genai`** — the new, unified one that targets both the Gemini Developer API and Vertex AI and is what Google's current docs and quickstarts recommend. The older `@google/generative-ai` package is in maintenance mode and we do not use it.

## Installation

```bash
npm install @google/genai
```

Requires **Node.js 18 or newer** (we target Node 22+ — see [03-node-typescript-setup.md](./03-node-typescript-setup.md)).

## Authentication

The SDK reads `GEMINI_API_KEY` from the environment by default. We load it via Node's built-in `--env-file=.env` flag — no `dotenv` dependency needed.

```ts
import { GoogleGenAI } from '@google/genai';

// Reads GEMINI_API_KEY from env automatically.
const ai = new GoogleGenAI({});

// Or be explicit:
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

## Hello world

```ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Explain how an agent loop works in one paragraph.',
});

console.log(response.text);
```

The response object exposes:

| Field | Description |
| ----- | ----------- |
| `response.text` | Convenience accessor for the model's text reply |
| `response.functionCalls` | Array of function calls the model wants you to execute |
| `response.candidates` | Underlying response candidates (rarely needed) |

## Conversation shape

The `contents` field accepts either a string (treated as a single user turn) or an array of `Content` objects for multi-turn:

```ts
type Content = {
  role: 'user' | 'model';
  parts: Part[];
};

type Part =
  | { text: string }
  | { functionCall: { id?: string; name: string; args: Record<string, unknown> } }
  | { functionResponse: { id?: string; name: string; response: { result: unknown } } };
```

A typical multi-turn history looks like:

```ts
const contents: Content[] = [
  { role: 'user', parts: [{ text: 'What is 2+2?' }] },
  { role: 'model', parts: [{ text: '4' }] },
  { role: 'user', parts: [{ text: 'And 3+3?' }] },
];
```

## Function (tool) calling

### Declaring tools

```ts
import { Type, type FunctionDeclaration } from '@google/genai';

const calculator: FunctionDeclaration = {
  name: 'calculator',
  description: 'Evaluate a basic arithmetic expression.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      expression: {
        type: Type.STRING,
        description: 'Arithmetic expression, e.g. "(2 + 3) * 4".',
      },
    },
    required: ['expression'],
  },
};

const tools = [{ functionDeclarations: [calculator] }];
```

Supported `Type` enum values: `Type.STRING`, `Type.NUMBER`, `Type.BOOLEAN`, `Type.ARRAY`, `Type.OBJECT`.

### `toolConfig.functionCallingConfig.mode`

Controls how the model uses tools:

| Mode | Behavior |
| ---- | -------- |
| `AUTO` (default) | Model picks: text reply *or* function call |
| `ANY` | Forces a function call from the allowed list |
| `VALIDATED` | Default for combined tools; enforces schema |
| `NONE` | Disables function calling for this request |

```ts
import { FunctionCallingConfigMode } from '@google/genai';

config: {
  tools,
  toolConfig: {
    functionCallingConfig: {
      mode: FunctionCallingConfigMode.AUTO,
    },
  },
}
```

### The agent loop

This is the canonical multi-turn function-calling loop, paraphrased from the [official guide](https://ai.google.dev/gemini-api/docs/function-calling):

```ts
const contents: Content[] = [
  { role: 'user', parts: [{ text: 'If London is warmer than 20°C, set thermostat to 20, else 18.' }] },
];

while (true) {
  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: { tools },
  });

  const calls = result.functionCalls ?? [];

  if (calls.length === 0) {
    console.log(result.text);
    break;
  }

  // Append the model's tool-call turn.
  contents.push({
    role: 'model',
    parts: calls.map((call) => ({ functionCall: call })),
  });

  // Execute each call and append its result as a single user turn.
  const responseParts = await Promise.all(
    calls.map(async (call) => {
      const fn = toolFunctions[call.name];
      const result = await fn(call.args);
      return {
        functionResponse: {
          id: call.id,
          name: call.name,
          response: { result },
        },
      };
    }),
  );

  contents.push({ role: 'user', parts: responseParts });
}
```

Key points:

- The model's tool-call turn has `role: 'model'` with `functionCall` parts.
- The tool result turn has `role: 'user'` with `functionResponse` parts. Yes, "user" — the SDK uses the user role for tool outputs returning to the model.
- The `id` field links request to response when the model emits **parallel** calls. Always echo it back.
- The loop terminates when `functionCalls` is empty and the model emits text instead.

### Best-practice notes from the docs

- **Tool count.** Aim for 10–20 tools max in the active set. Too many degrades selection quality.
- **Temperature on Gemini 3.** Keep it at the default (1.0). Lowering it can cause looping or degraded performance.
- **Validate high-consequence calls.** Tools that mutate real-world state should require user confirmation in production.
- **Always check `finishReason`** on responses to detect cases where the model didn't produce a valid call.

## System instructions

Pass via `config.systemInstruction`:

```ts
await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents,
  config: {
    systemInstruction: 'You are a helpful research assistant. Cite sources.',
    tools,
  },
});
```

## Streaming

We do not use streaming in the workshop core, but for completeness:

```ts
const stream = await ai.models.generateContentStream({
  model: 'gemini-2.5-flash',
  contents: 'Write a 100-word poem.',
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? '');
}
```

## Error handling

The SDK throws `ApiError` instances with `name`, `message`, and `status`. We catch as `unknown` and narrow:

```ts
try {
  await ai.models.generateContent({ /* ... */ });
} catch (err: unknown) {
  if (err instanceof Error) {
    console.error(`[gemini] ${err.name}: ${err.message}`);
  }
  throw err;
}
```

## What we deliberately don't use

- **`ai.chats`** — the SDK's stateful chat helper. We manage the `contents` array ourselves so students can see the conversation state evolve.
- **Vertex AI mode.** The workshops target the public Gemini Developer API only.
- **Structured output / JSON mode.** Out of scope for these workshops.
