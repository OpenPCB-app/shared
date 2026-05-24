import { TOOL_NAME_PATTERN, type AiTool } from "./types.js";

export class AiToolRegistry {
  private readonly tools = new Map<string, AiTool>();

  register(tool: AiTool): void {
    const name = tool.definition.name;
    if (!TOOL_NAME_PATTERN.test(name)) {
      throw new Error(
        `Invalid tool name "${name}": must match ${TOOL_NAME_PATTERN.source} (no dots or spaces).`,
      );
    }
    if (this.tools.has(name)) {
      throw new Error(`Duplicate tool registration: "${name}"`);
    }
    this.tools.set(name, tool);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  get(name: string): AiTool | undefined {
    return this.tools.get(name);
  }

  list(): AiTool[] {
    return Array.from(this.tools.values());
  }

  listDefinitions() {
    return this.list().map((t) => t.definition);
  }

  size(): number {
    return this.tools.size;
  }
}
