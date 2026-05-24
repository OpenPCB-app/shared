import { describe, expect, it } from "bun:test";
import { runChat } from "../src/runs/run-loop.js";
import { AiToolRegistry } from "../src/tools/registry.js";
import { resolveToolLimits } from "../src/tools/limits.js";
import { MockProviderClient } from "./mocks/mock-provider.js";
import type { AiChatMessage } from "../src/providers/types.js";
import type { AiTool } from "../src/tools/types.js";
import type { AiRunEvent } from "../src/runs/events.js";

async function collect(
  input: Parameters<typeof runChat>[0],
): Promise<AiRunEvent[]> {
  const out: AiRunEvent[] = [];
  for await (const e of runChat(input)) out.push(e);
  return out;
}

function makeEchoTool(): AiTool<{ text: string }, { echoed: string }> {
  return {
    definition: {
      name: "echo",
      version: "1",
      effect: "read",
      capability: "test",
      description: "echo",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
    async execute(ctx, input) {
      return {
        ok: true,
        data: { echoed: input.text },
        sources: [],
        warnings: [],
        truncated: false,
        limits: ctx.limits,
      };
    },
  };
}

describe("runChat", () => {
  it("streams text-only response and completes", async () => {
    const client = new MockProviderClient();
    client.setScript([{ steps: [{ kind: "text", content: "Hello" }] }]);
    const messages: AiChatMessage[] = [{ role: "user", content: "hi" }];
    const events = await collect({
      client,
      registry: new AiToolRegistry(),
      model: "m",
      messages,
      limits: resolveToolLimits({ preference: "small" }),
    });
    expect(events.find((e) => e.type === "run.completed")).toBeDefined();
    expect(events.filter((e) => e.type === "run.message.delta").length).toBe(1);
    const last = messages.at(-1);
    expect(last?.role).toBe("assistant");
    expect(last?.content).toBe("Hello");
  });

  it("executes a tool call and re-invokes the model", async () => {
    const client = new MockProviderClient();
    client.setScript([
      {
        steps: [
          {
            kind: "tool_call",
            toolCallId: "c1",
            name: "echo",
            argumentsJson: '{"text":"ok"}',
          },
        ],
      },
      { steps: [{ kind: "text", content: "Done." }] },
    ]);
    const registry = new AiToolRegistry();
    registry.register(makeEchoTool() as unknown as AiTool);
    const messages: AiChatMessage[] = [{ role: "user", content: "go" }];
    const events = await collect({
      client,
      registry,
      model: "m",
      messages,
      limits: resolveToolLimits({ preference: "small" }),
    });
    expect(events.some((e) => e.type === "run.tool.succeeded")).toBe(true);
    expect(events.find((e) => e.type === "run.completed")).toBeDefined();
    // assistant tool_call message + tool result + final assistant
    const roles = messages.map((m) => m.role);
    expect(roles).toEqual(["user", "assistant", "tool", "assistant"]);
  });

  it("fails gracefully when tool not registered", async () => {
    const client = new MockProviderClient();
    client.setScript([
      {
        steps: [
          {
            kind: "tool_call",
            toolCallId: "c1",
            name: "missing",
            argumentsJson: "{}",
          },
        ],
      },
      { steps: [{ kind: "text", content: "Sorry." }] },
    ]);
    const events = await collect({
      client,
      registry: new AiToolRegistry(),
      model: "m",
      messages: [{ role: "user", content: "go" }],
      limits: resolveToolLimits({ preference: "small" }),
    });
    expect(events.some((e) => e.type === "run.tool.failed")).toBe(true);
    expect(events.find((e) => e.type === "run.completed")).toBeDefined();
  });

  it("respects maxToolIterations", async () => {
    const client = new MockProviderClient();
    client.setScript([
      {
        steps: [
          {
            kind: "tool_call",
            toolCallId: "c1",
            name: "echo",
            argumentsJson: '{"text":"a"}',
          },
        ],
      },
      {
        steps: [
          {
            kind: "tool_call",
            toolCallId: "c2",
            name: "echo",
            argumentsJson: '{"text":"b"}',
          },
        ],
      },
      {
        steps: [
          {
            kind: "tool_call",
            toolCallId: "c3",
            name: "echo",
            argumentsJson: '{"text":"c"}',
          },
        ],
      },
    ]);
    const registry = new AiToolRegistry();
    registry.register(makeEchoTool() as unknown as AiTool);
    const events = await collect({
      client,
      registry,
      model: "m",
      messages: [{ role: "user", content: "loop" }],
      limits: resolveToolLimits({ preference: "small" }),
      maxToolIterations: 2,
    });
    const warnings = events.filter((e) => e.type === "run.warning");
    expect(
      warnings.some(
        (w) => (w as { data: { code: string } }).data.code === "max_iterations",
      ),
    ).toBe(true);
  });
});
