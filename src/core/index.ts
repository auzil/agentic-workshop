/**
 * Public surface of the workshop core library.
 *
 * Workshop code (and your own demos) should import from here, not from the
 * individual modules — this is the contract Workshops 02–05 build on.
 */

export { Agent, type AgentConfig } from './agent.js';
export { pipeline, type PipelineStep } from './pipeline.js';
export { Type, toOpenAITools, type Tool, type ToolParameters } from './tool.js';
export { DEFAULT_MODEL, getLlm } from './llm.js';
export { Logger } from './logger.js';
export type { Content } from './messages.js';
