/**
 * Workshop 01 — starter.
 *
 * Until you implement `Agent.run()` in src/core/agent.ts, this script will
 * fail with a clear error pointing you at the exercise. Once your loop is
 * working, you'll see the agent reason through a multi-step calculation in
 * the terminal — every LLM call, every tool call, every tool result.
 *
 * See workshops/01-agent-loop/README.md for the walkthrough.
 */

import { Agent } from '../../src/core/index.js';
import { calculator } from '../../src/tools/calculator.js';

const agent = new Agent({
  name: 'math-tutor',
  instructions:
    'You are a careful math tutor. When the user asks for a calculation, ' +
    'use the calculator tool. After getting results, briefly explain the ' +
    'reasoning in plain language.',
  tools: [calculator],
});

const answer = await agent.run(
  'What is (47 * 12) + (1024 / 8)? Show your reasoning briefly.',
);

console.log('\nFinal answer:\n', answer);
