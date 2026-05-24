import { nowIso } from "../ids.js";
import { parseSseStream } from "./sse.js";
import type {
  AiChatRequest,
  AiProviderCapabilities,
  AiProviderClient,
  AiProviderConfig,
  AiProviderKind,
  AiProviderModel,
} from "./types.js";
import type { AiRunEvent } from "../runs/events.js";
import type { AiToolCall, AiToolDefinition } from "../tools/types.js";

export interface OpenAiCompatibleClientOptions {
  id: string;
  kind: AiProviderKind;
  baseUrl: string;
  apiKey?: string;
  /** Override fetch for tests. */
  fetchImpl?: typeof fetch;
}

export class OpenAiCompatibleClient implements AiProviderClient {
  readonly id: string;
  readonly kind: AiProviderKind;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAiCompatibleClientOptions) {
    this.id = options.id;
    this.kind = options.kind;
    this.baseUrl = stripTrailingSlash(options.baseUrl);
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  static fromConfig(
    config: AiProviderConfig,
    fetchImpl?: typeof fetch,
  ): OpenAiCompatibleClient {
    return new OpenAiCompatibleClient({
      id: config.id,
      kind: config.kind,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      fetchImpl,
    });
  }

  async capabilities(signal?: AbortSignal): Promise<AiProviderCapabilities> {
    const checkedAt = nowIso();
    let modelList = false;
    let warning: string | undefined;
    try {
      const models = await this.listModels(signal);
      modelList = models.length > 0;
    } catch (err) {
      warning = `Model list failed: ${errMsg(err)}`;
    }
    let toolCalling = false;
    let streaming = true;
    try {
      const probe = await this.probeToolCall(signal);
      toolCalling = probe.toolCalling;
      streaming = probe.streaming;
      if (probe.warning && !warning) warning = probe.warning;
    } catch (err) {
      if (!warning) warning = `Capability probe failed: ${errMsg(err)}`;
    }
    return {
      streaming,
      toolCalling,
      modelList,
      checkedAt,
      warning,
    };
  }

  async listModels(signal?: AbortSignal): Promise<AiProviderModel[]> {
    const response = await this.fetchImpl(`${this.baseUrl}/models`, {
      method: "GET",
      headers: this.buildHeaders(),
      signal,
    });
    if (!response.ok) {
      throw new Error(
        `GET /models -> ${response.status}: ${await safeBody(response)}`,
      );
    }
    const payload = (await response.json()) as {
      data?: Array<{ id?: string; name?: string }>;
    };
    const fetchedAt = nowIso();
    return (payload.data ?? [])
      .filter(
        (m): m is { id: string; name?: string } => typeof m.id === "string",
      )
      .map((m) => ({
        providerId: this.id,
        modelId: m.id,
        displayName: m.name ?? null,
        fetchedAt,
      }));
  }

  async *streamChat(input: AiChatRequest): AsyncIterable<AiRunEvent> {
    const body = this.buildRequestBody(input, true);
    const runId = input.runId;
    yield {
      type: "run.started",
      runId,
      timestamp: nowIso(),
      data: { model: input.model, toolCount: input.tools?.length ?? 0 },
    };

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { ...this.buildHeaders(), "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: input.signal,
      });
    } catch (err) {
      if (input.signal?.aborted) {
        yield {
          type: "run.cancelled",
          runId,
          timestamp: nowIso(),
          data: { reason: errMsg(err) },
        };
        return;
      }
      yield {
        type: "run.failed",
        runId,
        timestamp: nowIso(),
        data: { errorMessage: errMsg(err) },
      };
      return;
    }

    if (!response.ok) {
      const errorMessage = `POST /chat/completions -> ${response.status}: ${await safeBody(response)}`;
      yield {
        type: "run.failed",
        runId,
        timestamp: nowIso(),
        data: { errorMessage, errorCode: String(response.status) },
      };
      return;
    }

    if (!response.body) {
      yield {
        type: "run.failed",
        runId,
        timestamp: nowIso(),
        data: { errorMessage: "Provider returned empty body" },
      };
      return;
    }

    let aggregatedContent = "";
    const toolCallAccumulators = new Map<number, ToolCallAccumulator>();
    let finishReason: string | undefined;

    try {
      for await (const line of parseSseStream(response.body, input.signal)) {
        let event: OpenAiStreamChunk | null = null;
        try {
          event = JSON.parse(line.data) as OpenAiStreamChunk;
        } catch {
          continue;
        }
        const choice = event.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta ?? {};
        if (typeof delta.content === "string" && delta.content.length > 0) {
          aggregatedContent += delta.content;
          yield {
            type: "run.message.delta",
            runId,
            timestamp: nowIso(),
            data: { delta: delta.content },
          };
        }
        if (delta.tool_calls) {
          for (const tcDelta of delta.tool_calls) {
            const idx = typeof tcDelta.index === "number" ? tcDelta.index : 0;
            let acc = toolCallAccumulators.get(idx);
            if (!acc) {
              acc = { id: "", name: "", argumentsJson: "" };
              toolCallAccumulators.set(idx, acc);
            }
            if (tcDelta.id) acc.id = tcDelta.id;
            const fn = tcDelta.function;
            if (fn) {
              if (typeof fn.name === "string" && fn.name.length > 0)
                acc.name = fn.name;
              if (typeof fn.arguments === "string")
                acc.argumentsJson += fn.arguments;
            }
          }
        }
        if (choice.finish_reason) {
          finishReason = choice.finish_reason;
        }
      }
    } catch (err) {
      if (input.signal?.aborted) {
        yield {
          type: "run.cancelled",
          runId,
          timestamp: nowIso(),
          data: { reason: errMsg(err) },
        };
        return;
      }
      yield {
        type: "run.failed",
        runId,
        timestamp: nowIso(),
        data: { errorMessage: errMsg(err) },
      };
      return;
    }

    const toolCalls: AiToolCall[] = Array.from(toolCallAccumulators.entries())
      .sort(([a], [b]) => a - b)
      .map(([, acc], i) => ({
        id: acc.id || `call_${i}`,
        name: acc.name,
        argumentsJson: acc.argumentsJson || "{}",
      }))
      .filter((tc) => tc.name.length > 0);

    yield {
      type: "run.message.completed",
      runId,
      timestamp: nowIso(),
      data: { content: aggregatedContent, toolCallCount: toolCalls.length },
    };

    for (const tc of toolCalls) {
      yield {
        type: "run.tool.requested",
        runId,
        timestamp: nowIso(),
        data: {
          toolCallId: tc.id,
          toolName: tc.name,
          argumentsJson: tc.argumentsJson,
        },
      };
    }

    // Stash finishReason on the last requested event by returning out; the run-loop owns run.completed.
    void finishReason;
  }

  /**
   * Probe whether the provider supports tool-calling by sending a tiny tool-enabled completion.
   * Returns toolCalling=true on a 2xx response with valid SSE/JSON; false otherwise (no throw).
   */
  private async probeToolCall(
    signal?: AbortSignal,
  ): Promise<{ toolCalling: boolean; streaming: boolean; warning?: string }> {
    const tools: AiToolDefinition[] = [
      {
        name: "echo",
        version: "1",
        effect: "read",
        capability: "probe",
        description:
          "Echo the provided text. Used only for capability probing.",
        inputSchema: {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        },
      },
    ];
    const body = this.buildRequestBody(
      {
        runId: "probe",
        model: "",
        messages: [
          { role: "user", content: 'Call the echo tool with text "ok".' },
        ],
        tools,
        maxOutputTokens: 16,
      },
      false,
    );
    // Strip model field so server can use its default; many local servers ignore unknown models.
    delete (body as { model?: unknown }).model;
    try {
      const response = await this.fetchImpl(
        `${this.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            ...this.buildHeaders(),
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
          signal,
        },
      );
      if (!response.ok) {
        return {
          toolCalling: false,
          streaming: true,
          warning: `Probe HTTP ${response.status}`,
        };
      }
      const json = (await response.json()) as {
        choices?: Array<{ message?: { tool_calls?: unknown[] } }>;
      };
      const toolCalls = json.choices?.[0]?.message?.tool_calls;
      return {
        toolCalling: Array.isArray(toolCalls) && toolCalls.length > 0,
        streaming: true,
      };
    } catch (err) {
      return {
        toolCalling: false,
        streaming: true,
        warning: `Probe failed: ${errMsg(err)}`,
      };
    }
  }

  private buildRequestBody(
    input: AiChatRequest,
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages.map((m) => {
        const out: Record<string, unknown> = {
          role: m.role,
          content: m.content,
        };
        if (m.name) out.name = m.name;
        if (m.toolCallId) out.tool_call_id = m.toolCallId;
        if (m.toolCalls && m.toolCalls.length > 0) {
          out.tool_calls = m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: tc.argumentsJson },
          }));
        }
        return out;
      }),
      stream,
    };
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.maxOutputTokens !== undefined)
      body.max_tokens = input.maxOutputTokens;
    if (input.tools && input.tools.length > 0) {
      body.tools = input.tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      }));
      body.tool_choice = "auto";
    }
    return body;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    return headers;
  }
}

interface ToolCallAccumulator {
  id: string;
  name: string;
  argumentsJson: string;
}

interface OpenAiStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      role?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string;
  }>;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function safeBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<unreadable body>";
  }
}
