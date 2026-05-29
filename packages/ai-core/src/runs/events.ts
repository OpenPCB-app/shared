import type { AiSourceRef } from "../sources/source-ref.js";
import type { AiToolCall } from "../tools/types.js";

export type AiRunEventType =
  | "run.started"
  | "run.message.delta"
  | "run.message.completed"
  | "run.tool.requested"
  | "run.tool.running"
  | "run.tool.succeeded"
  | "run.tool.failed"
  | "run.warning"
  | "run.completed"
  | "run.failed"
  | "run.cancelled";

export interface AiRunEventBase {
  type: AiRunEventType;
  runId: string;
  timestamp: string;
}

export interface AiRunStartedEvent extends AiRunEventBase {
  type: "run.started";
  data: { model: string; toolCount: number };
}

export interface AiRunMessageDeltaEvent extends AiRunEventBase {
  type: "run.message.delta";
  data: { delta: string };
}

export interface AiRunMessageCompletedEvent extends AiRunEventBase {
  type: "run.message.completed";
  data: {
    content: string;
    toolCallCount: number;
    toolCalls?: AiToolCall[];
    /** Chain-of-thought from reasoning models (OpenAI `reasoning_content`). */
    reasoningContent?: string;
    /** Raw provider finish_reason for this turn (e.g. "stop", "length", "tool_calls"). */
    finishReason?: string;
  };
}

export interface AiRunToolRequestedEvent extends AiRunEventBase {
  type: "run.tool.requested";
  data: {
    toolCallId: string;
    toolName: string;
    argumentsJson: string;
  };
}

export interface AiRunToolRunningEvent extends AiRunEventBase {
  type: "run.tool.running";
  data: { toolCallId: string; toolName: string };
}

export interface AiRunToolSucceededEvent extends AiRunEventBase {
  type: "run.tool.succeeded";
  data: {
    toolCallId: string;
    toolName: string;
    resultJson: string;
    sources: AiSourceRef[];
    truncated: boolean;
    warnings: string[];
  };
}

export interface AiRunToolFailedEvent extends AiRunEventBase {
  type: "run.tool.failed";
  data: {
    toolCallId: string;
    toolName: string;
    errorMessage: string;
    errorCode?: string;
  };
}

export interface AiRunWarningEvent extends AiRunEventBase {
  type: "run.warning";
  data: { code: string; message: string };
}

export interface AiRunCompletedEvent extends AiRunEventBase {
  type: "run.completed";
  data: { iterations: number; finishReason?: string };
}

export interface AiRunFailedEvent extends AiRunEventBase {
  type: "run.failed";
  data: { errorMessage: string; errorCode?: string };
}

export interface AiRunCancelledEvent extends AiRunEventBase {
  type: "run.cancelled";
  data: { reason?: string };
}

export type AiRunEvent =
  | AiRunStartedEvent
  | AiRunMessageDeltaEvent
  | AiRunMessageCompletedEvent
  | AiRunToolRequestedEvent
  | AiRunToolRunningEvent
  | AiRunToolSucceededEvent
  | AiRunToolFailedEvent
  | AiRunWarningEvent
  | AiRunCompletedEvent
  | AiRunFailedEvent
  | AiRunCancelledEvent;
