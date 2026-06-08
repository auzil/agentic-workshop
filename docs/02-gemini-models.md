# Gemini Models — Lineup and Default

Snapshot of the Gemini model lineup as of April 2026 and the default we use across the workshops.

Source: [Gemini API — Models](https://ai.google.dev/gemini-api/docs/models).

## Lineup

### Gemini 2.5 (stable, generally available)

| Model ID | Positioning |
| -------- | ----------- |
| `gemini-2.5-flash` | "Best price-performance for low-latency, high-volume tasks." |
| `gemini-2.5-flash-lite` | Most economical multimodal option. |
| `gemini-2.5-pro` | Most advanced reasoning and coding capabilities in the 2.5 line. |

### Gemini 3 (preview)

| Model ID | Positioning |
| -------- | ----------- |
| `gemini-3-flash-preview` | High performance, cost-efficient. |
| `gemini-3.1-pro-preview` | Advanced reasoning and agentic capabilities. |
| `gemini-3.1-flash-lite-preview` | Fastest, budget-friendly. |

## Our default: `gemini-2.5-flash`

Every workshop defaults to **`gemini-2.5-flash`**. Reasoning:

1. **Stable**, not preview. Workshops should not break because a preview model rotated.
2. **Cheap and fast.** Five workshops × N attendees × many iterations = a lot of inference. Flash is the price-performance leader.
3. **Function-calling capable.** All five workshops use tool calling.
4. **Sufficient for the patterns.** None of the patterns we teach require frontier reasoning — the point is the *orchestration*, not the model's intrinsic capability.

The default lives in `src/core/llm.ts` and can be overridden per agent via `AgentConfig.model`.

## When to use a different model

| Situation | Suggestion |
| --------- | ---------- |
| You want to demo agentic reasoning depth | Try `gemini-2.5-pro` for that one demo |
| You want to test the latest preview behavior | `gemini-3-flash-preview` — but read the temperature note below |
| You're cost-sensitive even within Flash | `gemini-2.5-flash-lite` |

## Gotcha — Gemini 3 and temperature

Per the [function-calling docs](https://ai.google.dev/gemini-api/docs/function-calling): *"When using Gemini 3 models, we strongly recommend keeping the `temperature` at its default value of 1.0. Changing the temperature (setting it below 1.0) may lead to unexpected behavior, such as looping or degraded performance."*

If you swap to a Gemini 3 model, **do not set `temperature`** in the request config. Leave it unset.

## API key

All models are accessed with a single `GEMINI_API_KEY`. Get one at [aistudio.google.com](https://aistudio.google.com/) — the Gemini Developer API has a free tier sufficient for the workshops.
