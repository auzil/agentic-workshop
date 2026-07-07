# Azure OpenAI Models — Deployments and Default

How Azure OpenAI models work and the default we use across the workshops.

## The deployment model

Azure OpenAI is not a raw model API — it is a **deployment API**. Before you can call a model, you must deploy it in [Azure AI Foundry](https://ai.azure.com/) and give it a name. That name is what you pass as `model` in every API call.

```
Azure AI Foundry
  └── your resource (e.g. "my-openai")
        └── deployment (e.g. "gpt-4o")   ← this is what AZURE_OPENAI_MODEL holds
              └── base model: gpt-4o (2024-11-20)
```

Two different resources can both have a deployment named `gpt-4o` running completely different base model versions. The deployment name is yours to choose — it does not have to match the base model name, though it usually does.

## Available base models (as of July 2026)

These are the most relevant base models for function-calling workloads. Availability varies by Azure region.

| Base model | Positioning |
| ---------- | ----------- |
| `gpt-4o` (2024-11-20) | Best balance of speed, capability, and cost. The workshop default. |
| `gpt-4o-mini` (2024-07-18) | Cheaper and faster; lower capability ceiling. Good for high-volume steps. |
| `gpt-4.1` (2025-04-14) | Stronger long-context reasoning; higher cost. |
| `gpt-4.1-mini` (2025-04-14) | Trimmed version of 4.1 for cost-sensitive tasks. |
| `o3` | Advanced reasoning (chain-of-thought); slow and expensive. Not appropriate for fast loops. |
| `o4-mini` | Lighter reasoning model; better for iterative workflows than o3. |

Source: [Azure OpenAI Service models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models).

## Our default: `gpt-4o`

Every workshop defaults to a deployment of **`gpt-4o`**, set via `AZURE_OPENAI_MODEL` in `.env`. Reasoning:

1. **Function-calling capable.** All five workshops use tool calling — it is a requirement.
2. **Good price-performance.** Five workshops × N attendees × many iterations = a lot of inference. `gpt-4o` is not the cheapest, but it is fast and reliable enough that workshops don't stall.
3. **Widely available.** `gpt-4o` is available in most Azure regions with reasonable quota.
4. **Sufficient for the patterns.** None of the patterns we teach require frontier reasoning — the point is the *orchestration*, not the model's intrinsic capability.

The default lives in `src/core/llm.ts` and can be overridden per agent via `AgentConfig.model`.

## When to use a different model

| Situation | Suggestion |
| --------- | ---------- |
| Cost-sensitive, high-volume pipeline steps | `gpt-4o-mini` — lower cost, still function-calling capable |
| Demo requiring deep reasoning | `gpt-4.1` for that one demo |
| Reflection loop evaluator (W5) | `gpt-4o` or `gpt-4.1` for the critic; `gpt-4o-mini` for the writer |

## API version

Azure OpenAI requires an explicit `apiVersion` in every request. We set it via `AZURE_OPENAI_API_VERSION` in `.env`.

Recommended stable version: **`2024-10-21`**

This version supports:
- Chat completions with tool calling
- Parallel function calls
- JSON mode
- Structured outputs

Newer GA versions (e.g. `2025-01-01-preview`) add features but may have subtle behavioral differences. Stick to `2024-10-21` for the workshops unless you specifically need a newer feature.

The full list of API versions is at [Azure OpenAI API versions](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#rest-api-versioning).

## Getting your credentials

1. In [Azure Portal](https://portal.azure.com/), open your Azure OpenAI resource.
2. **Keys and Endpoint** — copy Key 1 (→ `AZURE_OPENAI_API_KEY`) and the Endpoint URL (→ `AZURE_OPENAI_ENDPOINT`).
3. In [Azure AI Foundry](https://ai.azure.com/), open **Deployments** for your resource — copy the deployment name (→ `AZURE_OPENAI_MODEL`).

Put all three in `.env` (copied from `.env.example`).
