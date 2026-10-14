import { describe, expect, test } from "bun:test";
import { FakeDocument, FakeElement, keyEvent, withDocument } from "../../tests/fixtures/fake-dom.js";
import { createKeyboardShortcutHandler, isEscapeShortcut } from "../utils/keyboard-shortcuts.js";
import type { EditorTool } from "./types.js";
import { createToolKeyDownHandler } from "./use-tool-dispatch.js";

type ToolId = "select" | "line";

function setup(options: { toolConsumesEscape?: boolean; contextual?: boolean } = {}) {
  const calls: string[] = [];
  const tool: EditorTool<ToolId> = {
    id: "line",
    cursor: "crosshair",
    onKeyDown(event) {
      calls.push(`tool:${event.key}`);
      return event.key === "Escape" && options.toolConsumesEscape === true;
    },
  };
  const handle = createToolKeyDownHandler<ToolId>(() => ({
    tool,
    toolShortcuts: { v: "select", l: "line" },
    onUndo: () => calls.push("undo"),
    onRedo: () => calls.push("redo"),
    onContextualKey: (event) => {
      if (options.contextual && event.key === "r") {
        calls.push("rotate");
        return true;
      }
      return false;
    },
    setActiveTool: (id) => calls.push(`tool=${id}`),
  }));
  return { calls, handle };
}

const canvas = new FakeElement("canvas");
const input = new FakeElement("input");
const dialogChild = new FakeElement("button");
new FakeElement("body").append(
  canvas,
  input,
  new FakeElement("div", { role: "dialog", "aria-modal": "true" }).append(dialogChild),
);
const run = (fn: () => void) => withDocument(new FakeDocument([]), fn);

describe("createToolKeyDownHandler", () => {
  test("canvas keys dispatch undo, redo, tool switch and tool keys", () => {
    const { calls, handle } = setup();
    run(() => {
      handle(keyEvent("z", canvas, { metaKey: true }));
      handle(keyEvent("z", canvas, { metaKey: true, shiftKey: true }));
      handle(keyEvent("v", canvas));
      handle(keyEvent("Delete", canvas));
    });
    expect(calls).toEqual(["undo", "redo", "tool=select", "tool:Delete"]);
  });

  test("typing tool letters, Delete or undo into an input dispatches nothing", () => {
    const { calls, handle } = setup();
    run(() => {
      for (const key of ["v", "l", "r", "Delete", "Backspace"]) handle(keyEvent(key, input));
      handle(keyEvent("z", input, { ctrlKey: true }));
      handle(keyEvent("a", input, { metaKey: true }));
    });
    expect(calls).toEqual([]);
  });

  test("keys inside a dialog, or while a modal is open, dispatch nothing", () => {
    const { calls, handle } = setup();
    run(() => handle(keyEvent("l", dialogChild)));
    withDocument(new FakeDocument([new FakeElement("div", { "aria-modal": "true" })]), () =>
      handle(keyEvent("l", canvas)),
    );
    expect(calls).toEqual([]);
  });

  test("IME composition and already-consumed events dispatch nothing", () => {
    const { calls, handle } = setup();
    run(() => {
      handle(keyEvent("l", canvas, { isComposing: true }));
      handle(keyEvent("Process", canvas, { keyCode: 229 }));
      handle(keyEvent("Escape", canvas, { defaultPrevented: true }));
    });
    expect(calls).toEqual([]);
  });

  test("auto-repeat repeats undo only; tool switch, contextual and tool keys do not", () => {
    const { calls, handle } = setup({ contextual: true });
    run(() => {
      handle(keyEvent("z", canvas, { ctrlKey: true, repeat: true }));
      handle(keyEvent("l", canvas, { repeat: true }));
      handle(keyEvent("r", canvas, { repeat: true }));
      handle(keyEvent("Delete", canvas, { repeat: true }));
    });
    expect(calls).toEqual(["undo"]);
  });

  test("a consumed contextual key is marked handled", () => {
    const { calls, handle } = setup({ contextual: true });
    const event = keyEvent("r", canvas);
    run(() => handle(event));
    expect(calls).toEqual(["rotate"]);
    expect(event.defaultPrevented).toBe(true);
  });

  test("Escape consumed by the tool gesture does not also close the outer layer", () => {
    for (const consumes of [true, false]) {
      const { calls, handle } = setup({ toolConsumesEscape: consumes });
      const outer = createKeyboardShortcutHandler([
        { matches: (e) => isEscapeShortcut(e), run: () => calls.push("close-wizard") },
      ]);
      const event = keyEvent("Escape", canvas);
      // Inner editor registers first (child effects run before parent effects).
      run(() => {
        handle(event);
        outer(event);
      });
      expect(calls).toEqual(consumes ? ["tool:Escape"] : ["tool:Escape", "close-wizard"]);
    }
  });
});
