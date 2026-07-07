import { AzureOpenAI } from 'openai';

/**
 * The default model for the workshops — this is your Azure OpenAI *deployment
 * name* (e.g. "gpt-4o"), set as `AZURE_OPENAI_MODEL` in `.env`. Override
 * per-agent via `AgentConfig.model`. Don't hardcode deployment names
 * elsewhere — keep this the single source of truth.
 */
export const DEFAULT_MODEL = process.env['AZURE_OPENAI_MODEL'] ?? 'gpt-4o';

let instance: AzureOpenAI | undefined;

/**
 * Lazily-instantiated singleton Azure OpenAI client.
 *
 * Lazy on purpose — importing this module at type-check time should not
 * require credentials to be set.
 */
export function getLlm(): AzureOpenAI {
  if (instance) return instance;
  const apiKey = process.env['AZURE_OPENAI_API_KEY'];
  const endpoint = process.env['AZURE_OPENAI_ENDPOINT'];
  const apiVersion = process.env['AZURE_OPENAI_API_VERSION'];
  if (!apiKey) {
    throw new Error(
      'AZURE_OPENAI_API_KEY is not set. Copy .env.example to .env and fill in your Azure credentials.',
    );
  }
  if (!endpoint) {
    throw new Error(
      'AZURE_OPENAI_ENDPOINT is not set. Copy .env.example to .env and fill in your Azure credentials.',
    );
  }
  if (!apiVersion) {
    throw new Error(
      'AZURE_OPENAI_API_VERSION is not set. Copy .env.example to .env and fill in your Azure credentials.',
    );
  }
  instance = new AzureOpenAI({ apiKey, endpoint, apiVersion });
  return instance;
}
