import { newRunId, newToolEventId, nowIso } from "../ids.js";
import type { AiChatMessage, AiProviderClient } from "../providers/types.js";
import type { AiToolRegistry } from "../tools/registry.js";
import type { AiContextBinding } from "../context/bindings.js";
import type { AiToolLimits } from "../tools/limits.js";
import type { AiTool, AiToolCall, AiToolResult } from "../tools/types.js";
import type { AiRunEvent } from "./events.js";
import { parseToolArguments } from "../tools/validation.js";

export interface RunChatInput {
  client: AiProviderClient;
  registry: AiToolRegistry;
  model: string;
  messages: AiChatMessage[];
  bindings?: AiContextBinding[];
  limits: AiToolLimits;
  chatId?: string;
  userId?: string;
  temperature?: number;
  maxOutputTokens?: number;
  maxToolIterations?: number;
  maxToolCallsPerIteration?: number;
  signal?: AbortSignal;
  /** Override runId for deterministic tests. */
  runId?: string;
}

const DEFAULT_MAX_TOOL_ITERATIONS = 4;
const DEFAULT_MAX_TOOL_CALLS_PER_ITERATION = 8;

/**
 * Run a multi-turn chat with tool calls. Yields normalized AiRunEvents.
 * Mutates the messages array in place (appending assistant + tool messages).
 */
export async function* runChat(
  input: RunChatInput,
): AsyncGenerator<AiRunEvent, void, unknown> {
  const runId = input.runId ?? newRunId();
  const maxIterations = input.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS;
  const maxCallsPerIter =
    input.maxToolCallsPerIteration ?? DEFAULT_MAX_TOOL_CALLS_PER_ITERATION;
  const toolDefinitions = input.registry.listDefinitions();
  let iteration = 0;
  let finishReason: string | undefined;

  for (let i = 0; i < maxIterations; i++) {
    iteration = i + 1;
    if (input.signal?.aborted) {
      yield {
        type: "run.cancelled",
        runId,
        timestamp: nowIso(),
        data: { reason: "aborted" },
      };
      return;
    }

    const turnContent: string[] = [];
    const turnToolCalls: AiToolCall[] = [];
    let turnFailed = false;
    let turnFailMessage: string | undefined;
    let turnFinishReason: string | undefined;

    for await (const event of input.client.streamChat({
      runId,
      model: input.model,
      messages: input.messages,
      tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
      signal: input.signal,
    })) {
      // Re-yield provider events with the canonical runId.
      const stamped = { ...event, runId } as AiRunEvent;
      switch (stamped.type) {
        case "run.message.delta":
          turnContent.push(stamped.data.delta);
          yield stamped;
          break;
        case "run.message.completed":
          turnFinishReason = stamped.data.finishReason;
          yield stamped;
          break;
        case "run.tool.requested":
          turnToolCalls.push({
            id: stamped.data.toolCallId,
            name: stamped.data.toolName,
            argumentsJson: stamped.data.argumentsJson,
          });
          yield stamped;
          break;
        case "run.failed":
          turnFailed = true;
          turnFailMessage = stamped.data.errorMessage;
          yield stamped;
          break;
        case "run.cancelled":
          yield stamped;
          return;
        case "run.started":
          if (iteration === 1) yield stamped;
          break;
        default:
          yield stamped;
      }
    }

    if (turnFailed) {
      yield {
        type: "run.failed",
        runId,
        timestamp: nowIso(),
        data: { errorMessage: turnFailMessage ?? "Provider failed" },
      };
      return;
    }

    const assistantContent = turnContent.join("");

    // If the assistant produced tool calls, append the assistant message with tool_calls
    // and execute each tool, appending role:'tool' messages with tool_call_id.
    if (turnToolCalls.length > 0) {
      const limitedToolCalls = turnToolCalls.slice(0, maxCallsPerIter);
      if (turnToolCalls.length > maxCallsPerIter) {
        yield {
          type: "run.warning",
          runId,
          timestamp: nowIso(),
          data: {
            code: "tool_call_cap",
            message: `Truncated ${turnToolCalls.length} tool calls to ${maxCallsPerIter} per iteration.`,
          },
        };
      }
      input.messages.push({
        role: "assistant",
        content: assistantContent,
        toolCalls: limitedToolCalls,
      });

      for (const tc of limitedToolCalls) {
        yield {
          type: "run.tool.running",
          runId,
          timestamp: nowIso(),
          data: { toolCallId: tc.id, toolName: tc.name },
        };
        const tool = input.registry.get(tc.name);
        if (!tool) {
          const err = `Tool not registered: ${tc.name}`;
          yield {
            type: "run.tool.failed",
            runId,
            timestamp: nowIso(),
            data: {
              toolCallId: tc.id,
              toolName: tc.name,
              errorMessage: err,
              errorCode: "tool_missing",
            },
          };
          input.messages.push({
            role: "tool",
            content: JSON.stringify({ ok: false, error: err }),
            toolCallId: tc.id,
            name: tc.name,
          });
          continue;
        }
        const parsed = parseToolArguments(tc.argumentsJson);
        if (!parsed.ok) {
          const err = `Invalid arguments JSON: ${parsed.error}`;
          yield {
            type: "run.tool.failed",
            runId,
            timestamp: nowIso(),
            data: {
              toolCallId: tc.id,
              toolName: tc.name,
              errorMessage: err,
              errorCode: "bad_args",
            },
          };
          input.messages.push({
            role: "tool",
            content: JSON.stringify({ ok: false, error: err }),
            toolCallId: tc.id,
            name: tc.name,
          });
          continue;
        }

        const result = await executeToolSafely(
          tool,
          {
            runId,
            chatId: input.chatId,
            userId: input.userId,
            bindings: input.bindings ?? [],
            limits: input.limits,
            signal: input.signal,
            metadata: { toolEventId: newToolEventId() },
          },
          parsed.value,
        );

        if (result.ok) {
          yield {
            type: "run.tool.succeeded",
            runId,
            timestamp: nowIso(),
            data: {
              toolCallId: tc.id,
              toolName: tc.name,
              resultJson: JSON.stringify(result.value.data),
              sources: result.value.sources,
              truncated: result.value.truncated,
              warnings: result.value.warnings,
            },
          };
          input.messages.push({
            role: "tool",
            content: JSON.stringify(result.value.data),
            toolCallId: tc.id,
            name: tc.name,
          });
        } else {
          yield {
            type: "run.tool.failed",
            runId,
            timestamp: nowIso(),
            data: {
              toolCallId: tc.id,
              toolName: tc.name,
              errorMessage: result.error,
              errorCode: "exec_failed",
            },
          };
          input.messages.push({
            role: "tool",
            content: JSON.stringify({ ok: false, error: result.error }),
            toolCallId: tc.id,
            name: tc.name,
          });
        }
      }
      // Loop again so the model can react to tool results.
      continue;
    }

    // No tool calls; commit final assistant message and finish.
    input.messages.push({ role: "assistant", content: assistantContent });
    finishReason = turnFinishReason ?? "stop";
    if (finishReason === "length") {
      yield {
        type: "run.warning",
        runId,
        timestamp: nowIso(),
        data: {
          code: "truncated",
          message:
            "Response truncated (finish_reason=length); increase max output tokens.",
        },
      };
    }
    yield {
      type: "run.completed",
      runId,
      timestamp: nowIso(),
      data: { iterations: iteration, finishReason },
    };
    return;
  }

  yield {
    type: "run.warning",
    runId,
    timestamp: nowIso(),
    data: {
      code: "max_iterations",
      message: `Reached maxToolIterations=${maxIterations} without final answer.`,
    },
  };
  yield {
    type: "run.completed",
    runId,
    timestamp: nowIso(),
    data: { iterations: iteration, finishReason: "max_iterations" },
  };
}

async function executeToolSafely<TInput, TOutput>(
  tool: AiTool<unknown, unknown>,
  ctx: Parameters<AiTool["execute"]>[0],
  input: unknown,
): Promise<
  { ok: true; value: AiToolResult<unknown> } | { ok: false; error: string }
> {
  try {
    const value = await tool.execute(ctx, input);
    return { ok: true, value };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  void (null as unknown as TInput);
  void (null as unknown as TOutput);
}
