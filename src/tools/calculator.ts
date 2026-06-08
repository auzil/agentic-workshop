import { Type, type Tool } from '../core/index.js';

const SAFE_EXPRESSION = /^[\d+\-*/().\s]+$/;

/**
 * Evaluate a basic arithmetic expression.
 *
 * Useful as the first tool in a workshop because LLMs are notoriously bad at
 * arithmetic — the model has a real reason to delegate.
 *
 * Safety: the regex restricts input to digits, decimal points, parentheses,
 * whitespace, and the four basic operators *before* the expression reaches
 * `Function`. Anything outside that set is rejected.
 */
export const calculator: Tool<{ result: number }> = {
  name: 'calculator',
  description:
    'Evaluate a basic arithmetic expression. Supports + - * / and parentheses. ' +
    'Use this whenever the user asks for a numeric calculation.',
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
  execute: (args) => {
    const expression = String(args.expression ?? '');
    if (!SAFE_EXPRESSION.test(expression)) {
      throw new Error(`Calculator received an unsafe expression: ${expression}`);
    }
    const value = Function(`"use strict"; return (${expression})`)();
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(
        `Expression did not evaluate to a finite number: ${expression}`,
      );
    }
    return { result: value };
  },
};
