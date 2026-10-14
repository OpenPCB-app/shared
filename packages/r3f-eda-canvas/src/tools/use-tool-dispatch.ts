import { useEffect, useMemo, useRef } from "react";
import type { InteractionHandler } from "../interaction/types.js";
import {
  isRedoShortcut,
  isShortcutEventBlocked,
  isUndoShortcut,
  matchesKey,
} from "../utils/keyboard-shortcuts.js";
import type { EditorTool } from "./types.js";

export interface UseToolDispatchOptions<TId extends string> {
  /** Currently-active tool id, driven by caller's store. */
  readonly activeToolId: TId;
  /** Factory that returns a fresh tool instance for the given id. */
  readonly createTool: (id: TId) => EditorTool<TId>;
  /** Single-character keyboard shortcuts to tool ids, e.g. `{ v: "select", l: "line" }`. */
  readonly toolShortcuts: Readonly<Record<string, TId>>;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  /**
   * Optional handler for shortcuts that depend on editor state
   * (e.g. R rotates when a selection exists, otherwise falls through to "Rect tool").
   * Return `true` when the key was consumed.
   */
  readonly onContextualKey?: (event: KeyboardEvent) => boolean;
  readonly setActiveTool: (id: TId) => void;
}

/** Live dispatch state, read on every keydown so the listener never re-registers. */
export interface ToolKeyDownState<TId extends string> {
  readonly tool: EditorTool<TId>;
  readonly toolShortcuts: Readonly<Record<string, TId>>;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onContextualKey?: (event: KeyboardEvent) => boolean;
  readonly setActiveTool: (id: TId) => void;
}

/**
 * Window keydown handler behind `useToolDispatch`. Ignores keys typed into
 * text-entry controls, pressed inside dialogs/menus/modals, belonging to an IME
 * composition, or already consumed by an inner layer. Undo/redo may repeat
 * while held; tool switches, contextual keys and tool keys never do. Anything
 * this handler consumes is `preventDefault`ed so outer Escape/Enter handlers
 * skip it.
 */
export function createToolKeyDownHandler<TId extends string>(
  readState: () => ToolKeyDownState<TId>,
): (event: KeyboardEvent) => void {
  return (event) => {
    if (isShortcutEventBlocked(event, { allowRepeat: true })) return;
    const state = readState();

    if (isUndoShortcut(event)) {
      event.preventDefault();
      state.onUndo();
      return;
    }
    if (isRedoShortcut(event)) {
      event.preventDefault();
      state.onRedo();
      return;
    }
    if (event.repeat) return;

    if (state.onContextualKey?.(event)) {
      event.preventDefault();
      return;
    }

    for (const [key, toolId] of Object.entries(state.toolShortcuts)) {
      if (matchesKey(event, key) && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        state.setActiveTool(toolId);
        return;
      }
    }

    if (state.tool.onKeyDown?.(event) === true) event.preventDefault();
  };
}

/**
 * Bridges the active `EditorTool` to an `InteractionHandler` consumed by
 * `EdaCanvas`, and registers a window-level keyboard listener for undo/redo,
 * tool-switching, and caller-supplied contextual shortcuts, gated by
 * `createToolKeyDownHandler`.
 *
 * Listeners are registered once on mount; callback bodies read from refs so
 * updated closures (e.g. a Zustand-derived `setActiveTool`) are honoured
 * without re-registering the listener.
 */
export function useToolDispatch<TId extends string>({
  activeToolId,
  createTool,
  toolShortcuts,
  onUndo,
  onRedo,
  onContextualKey,
  setActiveTool,
}: UseToolDispatchOptions<TId>): InteractionHandler {
  const toolRef = useRef<EditorTool<TId>>(createTool(activeToolId));

  const onUndoRef = useRef(onUndo);
  const onRedoRef = useRef(onRedo);
  const onContextualKeyRef = useRef(onContextualKey);
  const setActiveToolRef = useRef(setActiveTool);
  const toolShortcutsRef = useRef(toolShortcuts);

  onUndoRef.current = onUndo;
  onRedoRef.current = onRedo;
  onContextualKeyRef.current = onContextualKey;
  setActiveToolRef.current = setActiveTool;
  toolShortcutsRef.current = toolShortcuts;

  useEffect(() => {
    toolRef.current.onDeactivate?.();
    toolRef.current = createTool(activeToolId);
    toolRef.current.onActivate?.();
  }, [activeToolId, createTool]);

  useEffect(() => {
    const handler = createToolKeyDownHandler<TId>(() => ({
      tool: toolRef.current,
      toolShortcuts: toolShortcutsRef.current,
      onUndo: onUndoRef.current,
      onRedo: onRedoRef.current,
      onContextualKey: onContextualKeyRef.current,
      setActiveTool: setActiveToolRef.current,
    }));
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return useMemo<InteractionHandler>(
    () => ({
      onPointerDown(event) {
        toolRef.current.onPointerDown?.(event);
      },
      onPointerMove(event) {
        toolRef.current.onPointerMove?.(event);
      },
      onPointerUp(event) {
        toolRef.current.onPointerUp?.(event);
      },
      onContextMenu(event) {
        toolRef.current.onContextMenu?.(event);
      },
    }),
    [],
  );
}
