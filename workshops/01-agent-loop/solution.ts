/**
 * Workshop 01 — solution demo.
 *
 * Same `Agent` as starter.ts, but exercises the loop across three scenarios:
 *
 *   1. Multi-step math — should produce several tool calls and one final summary.
 *   2. Pure conversation — no tool calls; the loop should exit on the first turn.
 *   3. Ambiguous question — interesting because the model has to decide whether
 *      to use the tool at all (it shouldn't — there's no math to do).
 *
 * Watch the terminal: the trace tells you everything the agent is doing.
 *
 * Run with `npm run ws:01:solution` (assumes you've finished the W1 exercise
 * in src/core/agent.ts; see workshops/01-agent-loop/README.md).
 */

import { Agent } from '../../src/core/index.js';
import { calculator } from '../../src/tools/calculator.js';

const agent = new Agent({
  name: 'math-tutor',
  instructions:
    'You are a careful math tutor. Use the calculator tool whenever a ' +
    'calculation is required. If a question does not need math, answer ' +
    'directly without calling tools. Be concise.',
  tools: [calculator],
});

const scenarios: Array<{ label: string; prompt: string }> = [
  {
    label: '1. Multi-step math',
    prompt:
      'A small bakery sold 47 croissants on Monday at 3.50 each, and 62 ' +
      'on Tuesday at 3.75 each. What was the total revenue, and which day ' +
      'was higher?',
  },
  {
    label: '2. Pure conversation',
    prompt: 'In one sentence, what is the difference between a workflow and an agent?',
  },
  {
    label: '3. Ambiguous (no calculation needed)',
    prompt: 'Is the calculator tool available to you?',
  },
];

for (const { label, prompt } of scenarios) {
  console.log(`\n=== ${label} ===`);
  console.log(`> ${prompt}\n`);
  const answer = await agent.run(prompt);
  console.log(`\nFinal answer: ${answer}`);
}
