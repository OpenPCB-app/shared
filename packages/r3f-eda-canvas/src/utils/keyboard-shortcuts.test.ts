import { describe, expect, test } from "bun:test";
import { FakeDocument, FakeElement, keyEvent, withDocument } from "../../tests/fixtures/fake-dom.js";
import {
  createKeyboardShortcutHandler,
  isEditableShortcutTarget,
  isEscapeShortcut,
  isInsideShortcutOverlay,
  isShortcutEventBlocked,
  isShortcutModalOpen,
  matchesKey,
  type KeyboardShortcutBinding,
} from "./keyboard-shortcuts.js";

function tree() {
  const canvas = new FakeElement("div", { "data-canvas": "" });
  const input = new FakeElement("input", { type: "text" });
  const textarea = new FakeElement("textarea");
  const select = new FakeElement("select");
  const richChild = new FakeElement("span");
  const rich = new FakeElement("div", { contenteditable: "true" }).append(richChild);
  const plainChild = new FakeElement("span");
  const notEditable = new FakeElement("div", { contenteditable: "false" }).append(plainChild);
  const comboChild = new FakeElement("span");
  const combo = new FakeElement("div", { role: "combobox" }).append(comboChild);
  const dialogButton = new FakeElement("button");
  const dialog = new FakeElement("div", { role: "dialog" }).append(dialogButton);
  const menuItem = new FakeElement("div", { role: "menuitem" });
  const menu = new FakeElement("div", { role: "menu" }).append(menuItem);
  const overlayChild = new FakeElement("div");
  const overlay = new FakeElement("div", { "data-overlay": "" }).append(overlayChild);
  const closedChild = new FakeElement("div");
  const closed = new FakeElement("div", { role: "dialog", "data-state": "closed" }).append(closedChild);
  const body = new FakeElement("body").append(canvas, input, textarea, select, rich, notEditable, combo, dialog, menu, overlay, closed);
  return { body, canvas, input, textarea, select, richChild, plainChild, comboChild, dialogButton, menuItem, overlayChild, closedChild };
}

describe("isEditableShortcutTarget", () => {
  const t = tree();
  test.each([
    ["input", t.input, true],
    ["textarea", t.textarea, true],
    ["select", t.select, true],
    ["contenteditable descendant", t.richChild, true],
    ["role=combobox descendant", t.comboChild, true],
    ["contenteditable=false descendant", t.plainChild, false],
    ["canvas", t.canvas, false],
  ] as const)("%s → %p", (_label, element, expected) => {
    expect(isEditableShortcutTarget(element as unknown as EventTarget)).toBe(expected);
  });

  test("non-element targets are not editable and do not throw without a DOM", () => {
    expect(isEditableShortcutTarget(null)).toBe(false);
    expect(isEditableShortcutTarget({} as EventTarget)).toBe(false);
    expect(isEditableShortcutTarget({ nodeType: 9 } as unknown as EventTarget)).toBe(false);
  });
});

describe("isInsideShortcutOverlay / isShortcutModalOpen", () => {
  const t = tree();
  test.each([
    ["dialog descendant", t.dialogButton, true],
    ["menu descendant", t.menuItem, true],
    ["data-overlay descendant", t.overlayChild, true],
    ["closed dialog descendant", t.closedChild, false],
    ["canvas", t.canvas, false],
  ] as const)("%s → %p", (_label, element, expected) => {
    expect(isInsideShortcutOverlay(element as unknown as EventTarget)).toBe(expected);
  });

  test("visible aria-modal anywhere counts as open; hidden ones do not", () => {
    const open = new FakeElement("div", { "aria-modal": "true" });
    const hidden = new FakeElement("div", { "aria-modal": "true", hidden: "" });
    expect(isShortcutModalOpen(new FakeDocument([hidden]))).toBe(false);
    expect(isShortcutModalOpen(new FakeDocument([hidden, open]))).toBe(true);
    expect(isShortcutModalOpen(null)).toBe(false);
  });
});

describe("isShortcutEventBlocked", () => {
  const t = tree();
  const doc = new FakeDocument([]);
  const blocked = (event: ReturnType<typeof keyEvent>, allowRepeat = false) =>
    isShortcutEventBlocked(event, { doc, allowRepeat });

  test("plain canvas key passes", () => {
    expect(blocked(keyEvent("r", t.canvas))).toBe(false);
  });
  test("defaultPrevented (consumed by an inner layer) blocks", () => {
    expect(blocked(keyEvent("Escape", t.canvas, { defaultPrevented: true }))).toBe(true);
  });
  test("IME composition blocks (isComposing and keyCode 229)", () => {
    expect(blocked(keyEvent("r", t.canvas, { isComposing: true }))).toBe(true);
    expect(blocked(keyEvent("Process", t.canvas, { keyCode: 229 }))).toBe(true);
  });
  test("auto-repeat blocks unless allowed", () => {
    expect(blocked(keyEvent("r", t.canvas, { repeat: true }))).toBe(true);
    expect(blocked(keyEvent("r", t.canvas, { repeat: true }), true)).toBe(false);
  });
  test("editable and overlay targets block; allowInEditable lifts only the former", () => {
    expect(blocked(keyEvent("r", t.richChild))).toBe(true);
    expect(isShortcutEventBlocked(keyEvent("r", t.input), { doc, allowInEditable: true })).toBe(false);
    expect(isShortcutEventBlocked(keyEvent("r", t.dialogButton), { doc, allowInEditable: true })).toBe(true);
  });
  test("composed path is checked, not only event.target (shadow/portal retargeting)", () => {
    const shadowInput = new FakeElement("input");
    const host = new FakeElement("div");
    expect(blocked(keyEvent("r", host, {}, [shadowInput, host]))).toBe(true);
  });
  test("an open modal blocks even when focus is on the canvas", () => {
    const modalDoc = new FakeDocument([new FakeElement("div", { "aria-modal": "true" })]);
    expect(isShortcutEventBlocked(keyEvent("Delete", t.canvas), { doc: modalDoc })).toBe(true);
  });
});

describe("createKeyboardShortcutHandler", () => {
  const t = tree();
  function setup() {
    const calls: string[] = [];
    const bindings: KeyboardShortcutBinding[] = [
      { matches: (e) => isEscapeShortcut(e), run: () => calls.push("escape") },
      { matches: (e) => matchesKey(e, "ArrowUp"), run: () => calls.push("nudge"), allowRepeat: true },
    ];
    return { calls, handle: createKeyboardShortcutHandler(bindings) };
  }
  const run = (fn: () => void) => withDocument(new FakeDocument([]), fn);

  test("matched binding runs once and consumes the key", () => {
    const { calls, handle } = setup();
    const event = keyEvent("Escape", t.canvas);
    run(() => handle(event));
    expect(calls).toEqual(["escape"]);
    expect(event.defaultPrevented).toBe(true);
  });
  test("Escape already consumed by an inner layer is not handled again", () => {
    const { calls, handle } = setup();
    run(() => handle(keyEvent("Escape", t.canvas, { defaultPrevented: true })));
    expect(calls).toEqual([]);
  });
  test("editable targets are ignored by default", () => {
    const { calls, handle } = setup();
    run(() => handle(keyEvent("Escape", t.input)));
    expect(calls).toEqual([]);
  });
  test("ignoreEditableTarget:false lets editable targets through", () => {
    const calls: string[] = [];
    const handle = createKeyboardShortcutHandler(
      [{ matches: (e) => isEscapeShortcut(e), run: () => calls.push("escape") }],
      { ignoreEditableTarget: false },
    );
    run(() => handle(keyEvent("Escape", t.input)));
    expect(calls).toEqual(["escape"]);
  });
  test("keys inside a dialog or menu, or during IME composition, are ignored", () => {
    const { calls, handle } = setup();
    run(() => {
      handle(keyEvent("Escape", t.dialogButton));
      handle(keyEvent("Escape", t.menuItem));
      handle(keyEvent("Escape", t.canvas, { isComposing: true }));
      handle(keyEvent("Escape", t.canvas, { keyCode: 229 }));
    });
    expect(calls).toEqual([]);
  });
  test("auto-repeat fires only bindings that opt in", () => {
    const { calls, handle } = setup();
    run(() => {
      handle(keyEvent("Escape", t.canvas, { repeat: true }));
      handle(keyEvent("ArrowUp", t.canvas, { repeat: true }));
    });
    expect(calls).toEqual(["nudge"]);
  });
  test("an open modal elsewhere blocks window shortcuts", () => {
    const { calls, handle } = setup();
    withDocument(new FakeDocument([new FakeElement("div", { "aria-modal": "true" })]), () =>
      handle(keyEvent("Escape", t.canvas)),
    );
    expect(calls).toEqual([]);
  });
});
