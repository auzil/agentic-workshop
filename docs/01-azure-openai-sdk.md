# Azure OpenAI SDK — `openai`

A focused cheat sheet of the SDK surface we use across the workshops. Anything not in this doc is out of scope; reach for the [official reference](https://github.com/openai/openai-node#readme) if you need more.

> **Client choice.** We use the official `openai` npm package with the `AzureOpenAI` client, not `@azure/openai`. Both target Azure, but `openai` is the canonical package maintained by OpenAI, with first-class Azure support added in v4.

## Installation

```bash
npm install openai
```

Requires **Node.js 18 or newer** (we target Node 22+ — see [03-node-typescript-setup.md](./03-node-typescript-setup.md)).

## Authentication

The `AzureOpenAI` client needs three things from the environment: an API key, an endpoint URL, and an API version. We load them via Node's built-in `--env-file=.env` flag — no `dotenv` dependency needed.

```ts
import { AzureOpenAI } from 'openai';

const client = new AzureOpenAI({
  apiKey: process.env['AZURE_OPENAI_API_KEY'],
  endpoint: process.env['AZURE_OPENAI_ENDPOINT'],   // e.g. https://your-resource.openai.azure.com
  apiVersion: process.env['AZURE_OPENAI_API_VERSION'], // e.g. 2024-10-21
});
```

The `endpoint` comes from Azure Portal → your OpenAI resource → Keys and Endpoint.

## Hello world

```ts
import { AzureOpenAI } from 'openai';

const client = new AzureOpenAI({
  apiKey: process.env['AZURE_OPENAI_API_KEY'],
  endpoint: process.env['AZURE_OPENAI_ENDPOINT'],
  apiVersion: process.env['AZURE_OPENAI_API_VERSION'],
});

const response = await client.chat.completions.create({
  model: 'gpt-4o',   // your deployment name, not the base model name
  messages: [{ role: 'user', content: 'Explain how an agent loop works in one paragraph.' }],
});

console.log(response.choices[0]?.message.content);
```

The response object:

| Field | Description |
| ----- | ----------- |
| `response.choices[0].message.content` | The model's text reply (`string \| null`) |
| `response.choices[0].message.tool_calls` | Tool calls the model wants you to execute |
| `response.choices[0].finish_reason` | Why the model stopped (`'stop'`, `'tool_calls'`, `'length'`, `'content_filter'`) |

## Conversation shape

The `messages` field is a `ChatCompletionMessageParam[]`. There are four roles:

```ts
// System instruction — one per conversation, sent first
{ role: 'system', content: 'You are a helpful assistant.' }

// User turn
{ role: 'user', content: 'What is 2 + 2?' }

// Assistant text response
{ role: 'assistant', content: '4' }

// Assistant tool-call request (content is null when tool_calls is set)
{
  role: 'assistant',
  content: null,
  tool_calls: [{
    id: 'call_abc123',
    type: 'function',
    function: { name: 'calculator', arguments: '{"expression":"2+2"}' },
  }],
}

// Tool result — one message per tool call, keyed by tool_call_id
{ role: 'tool', tool_call_id: 'call_abc123', content: '{"result":4}' }
```

A typical multi-turn history:

```ts
const messages: ChatCompletionMessageParam[] = [
  { role: 'system', content: 'You are a math tutor.' },
  { role: 'user', content: 'What is 3 + 3?' },
  { role: 'assistant', content: '6' },
  { role: 'user', content: 'And 4 + 4?' },
];
```

## Function (tool) calling

### Declaring tools

Tools are JSON Schema objects wrapped in a `{ type: 'function', function: {...} }` envelope:

```ts
import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';

const calculator: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'calculator',
    description: 'Evaluate a basic arithmetic expression.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Arithmetic expression, e.g. "(2 + 3) * 4".',
        },
      },
      required: ['expression'],
    },
  },
};

const tools = [calculator];
```

Property `type` values follow JSON Schema: `'string'`, `'number'`, `'integer'`, `'boolean'`, `'array'`, `'object'`.

### `tool_choice`

Controls how the model uses tools (pass as a field in the request):

| Value | Behavior |
| ----- | -------- |
| `'auto'` (default) | Model picks: text reply *or* tool call |
| `'required'` | Must call at least one tool |
| `{ type: 'function', function: { name: '...' } }` | Forces a specific tool |
| `'none'` | Disables tool calling for this request |

### The agent loop

This is the canonical multi-turn tool-calling loop:

```ts
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';

const messages: ChatCompletionMessageParam[] = [
  { role: 'system', content: 'Use the calculator tool for any arithmetic.' },
  { role: 'user', content: 'What is (47 * 12) + (1024 / 8)?' },
];

while (true) {
  const response = await client.chat.completions.create({ model: 'gpt-4o', messages, tools });
  const message = response.choices[0]?.message;
  const toolCalls = message?.tool_calls ?? [];

  if (toolCalls.length === 0) {
    console.log(message?.content);
    break;
  }

  // Append the assistant's tool-call turn first.
  messages.push({ role: 'assistant', content: message.content, tool_calls: message.tool_calls });

  // Execute each tool call and append results.
  const results = await Promise.all(
    toolCalls.map(async (call) => {
      const args = JSON.parse(call.function.arguments);
      const result = await toolFunctions[call.function.name](args);
      return {
        role: 'tool' as const,
        tool_call_id: call.id,
        content: JSON.stringify(result),
      };
    }),
  );

  messages.push(...results);  // one 'tool' message per call
}
```

Key points:

- The assistant's tool-call turn must be pushed **before** the tool results.
- `tool_calls[n].function.arguments` is a **JSON string** — always `JSON.parse()` it.
- Tool results use `role: 'tool'` (not `'user'` — unlike Gemini's convention).
- `tool_call_id` links each result back to its request when the model emits **parallel** calls.
- The loop terminates when `tool_calls` is empty and `finish_reason` is `'stop'`.

### Best-practice notes

- **Tool count.** Aim for 10–20 tools max. Too many degrades selection quality.
- **Validate high-consequence calls.** Tools that mutate real-world state should require user confirmation in production.
- **Check `finish_reason`.** `'content_filter'` means Azure's content policy blocked the response; `'length'` means you hit `max_tokens`.
- **Parallel tool calls.** The model may emit multiple `tool_calls` in one turn. Always use `Promise.all` and push all results before the next request.

## System instructions

Pass as the first message with `role: 'system'`:

```ts
const messages: ChatCompletionMessageParam[] = [
  { role: 'system', content: 'You are a helpful research assistant. Cite sources.' },
  { role: 'user', content: userInput },
];
```

Unlike Gemini, there is no separate `config.systemInstruction` field — the system message is just part of the `messages` array.

## Streaming

We do not use streaming in the workshop core, but for completeness:

```ts
const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Write a 100-word poem.' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
}
```

## Error handling

The SDK throws `APIError` instances. We catch as `unknown` and narrow:

```ts
import { APIError } from 'openai';

try {
  await client.chat.completions.create({ /* ... */ });
} catch (err: unknown) {
  if (err instanceof APIError) {
    console.error(`[openai] ${err.status} ${err.name}: ${err.message}`);
  }
  throw err;
}
```

Common status codes on Azure:
- `401` — bad API key
- `404` — deployment name not found
- `429` — rate limit / quota exceeded
- `503` — the Azure endpoint is temporarily unavailable

## What we deliberately don't use

- **`client.beta.assistants`** — the stateful Assistants API. We manage the `messages` array ourselves so students can see the conversation state evolve.
- **Structured output / JSON mode** (`response_format: { type: 'json_object' }`). Out of scope for these workshops.
- **Streaming.** Interesting, but distracts from the loop.
