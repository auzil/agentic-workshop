/**
 * Workshop 02 — starter.
 *
 * Until you implement `pipeline()` in src/core/pipeline.ts, this script will
 * fail with a clear error pointing you at the exercise. Once the helper is
 * working, you'll see four agents run in sequence in the terminal —
 * researcher → outliner → drafter → polisher.
 *
 * See workshops/02-pipeline/README.md for the walkthrough.
 */

import { Agent, pipeline } from '../../src/core/index.js';

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

const topic = 'Why teams adopt TypeScript over plain JavaScript for new projects.';

const finalPost = await pipeline(
  topic,
  researcher,
  outliner,
  drafter,
  polisher,
);

console.log('\nFinal post:\n');
console.log(finalPost);
