/**
 * Workshop 02 — solution demo.
 *
 * Same four agents as starter.ts, but with one extra wrinkle: a programmatic
 * **gate** in the middle of the chain. The gate rejects outlines that are
 * suspiciously short — if it throws, the pipeline short-circuits and we
 * never spend tokens on the drafter or polisher.
 *
 * Watch the trace: each agent's `[name] → llm / ← text` lines tell the
 * story of one step handing off to the next.
 *
 * Run with `npm run ws:02:solution`.
 */

import { Agent, pipeline, type PipelineStep } from '../../src/core/index.js';

const researcher = new Agent({
  name: 'researcher',
  instructions:
    'You produce a tight bullet list of 4–6 key facts on a topic. ' +
    'Plain text only — no preamble, no headings, just dashes and one fact per line.',
});

const outliner = new Agent({
  name: 'outliner',
  instructions:
    'You turn a list of facts into a short blog-post outline. ' +
    'Return exactly four sections: "## Intro", "## Section 1", "## Section 2", "## Conclusion". ' +
    'Under each heading, write a single line describing what that section will cover.',
});

const drafter = new Agent({
  name: 'drafter',
  instructions:
    'You write a ~200-word blog post from an outline. Match the section ' +
    'headings exactly. Keep the tone informative and direct.',
});

const polisher = new Agent({
  name: 'polisher',
  instructions:
    'You tighten prose: cut filler, prefer concrete nouns and active verbs, ' +
    'and keep the meaning intact. Return only the polished post.',
});

/**
 * Programmatic gate: require the previous step's output to contain at least
 * `min` words. Anything shorter probably means the LLM degraded — fail loud
 * and skip the rest of the chain rather than papering over it downstream.
 */
function requireMinWords(min: number): PipelineStep {
  return (text) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words < min) {
      throw new Error(
        `Gate failed: previous step produced ${words} words (need >= ${min}).`,
      );
    }
    return text;
  };
}

const topics = [
  'Why teams adopt TypeScript over plain JavaScript for new projects.',
  'How a small engineering team should think about on-call rotation.',
];

for (const topic of topics) {
  console.log(`\n=== Topic ===\n> ${topic}\n`);
  const post = await pipeline(
    topic,
    researcher,
    requireMinWords(30),
    outliner,
    requireMinWords(30),
    drafter,
    polisher,
  );
  console.log(`\n--- Final post ---\n${post}`);
}
