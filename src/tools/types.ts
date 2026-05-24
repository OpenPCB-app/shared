import type { AiJsonSchemaObject } from "../json-schema.js";
import type { AiContextBinding } from "../context/bindings.js";
import type { AiSourceRef } from "../sources/source-ref.js";
import type { AiToolLimits } from "./limits.js";

export type AiToolEffect = "read" | "write";

export type AiToolStatus =
  | "requested"
  | "running"
  | "succeeded"
  | "failed"
  | "rejected";

export const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export interface AiToolDefinition {
  name: string;
  version: string;
  effect: AiToolEffect;
  capability: string;
  description: string;
  inputSchema: AiJsonSchemaObject;
  outputSchema?: AiJsonSchemaObject;
}

export interface AiToolCall {
  id: string;
  name: string;
  argumentsJson: string;
}

export interface AiToolExecutionContext {
  runId: string;
  chatId?: string;
  userId?: string;
  bindings: AiContextBinding[];
  limits: AiToolLimits;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface AiToolResult<T = unknown> {
  ok: boolean;
  data: T;
  sources: AiSourceRef[];
  warnings: string[];
  truncated: boolean;
  limits: AiToolLimits;
}

export interface AiTool<TInput = unknown, TOutput = unknown> {
  definition: AiToolDefinition;
  execute(
    ctx: AiToolExecutionContext,
    input: TInput,
  ): Promise<AiToolResult<TOutput>>;
}
