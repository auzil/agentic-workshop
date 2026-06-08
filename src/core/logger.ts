/**
 * Minimal terminal logger so students can *see* the agent loop running.
 *
 * Each agent gets its own logger labeled with its name; every step the
 * loop takes prints one line with the step kind (llm / tool / result /
 * error). The whole point is observability — the magic of an agent is
 * just a chain of these steps, and the terminal trace makes that obvious.
 *
 * Uses raw ANSI escapes rather than a colors library to keep the
 * dependency budget at zero.
 */

const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
} as const;

const PREVIEW_MAX = 240;

function preview(value: unknown): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (s === undefined) return 'undefined';
  return s.length > PREVIEW_MAX ? `${s.slice(0, PREVIEW_MAX)}…` : s;
}

export class Logger {
  constructor(private readonly name: string) {}

  step(message: string): void {
    console.log(`${ANSI.dim}[${this.name}]${ANSI.reset} ${message}`);
  }

  llmCall(model: string, toolNames: readonly string[]): void {
    const tools = toolNames.length > 0 ? ` tools=[${toolNames.join(', ')}]` : '';
    this.step(`${ANSI.cyan}→ llm${ANSI.reset}    model=${model}${tools}`);
  }

  llmText(text: string): void {
    this.step(`${ANSI.green}← text${ANSI.reset}   ${preview(text)}`);
  }

  toolCall(name: string, args: unknown): void {
    this.step(`${ANSI.yellow}→ tool${ANSI.reset}   ${name}(${preview(args)})`);
  }

  toolResult(name: string, result: unknown): void {
    this.step(`${ANSI.magenta}← result${ANSI.reset} ${name} → ${preview(result)}`);
  }

  error(message: string): void {
    this.step(`${ANSI.red}✗ error${ANSI.reset}  ${message}`);
  }
}
