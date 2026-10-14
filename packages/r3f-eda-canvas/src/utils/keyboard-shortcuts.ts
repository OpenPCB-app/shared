import { useEffect } from "react";

export interface KeyboardShortcutEvent {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly target: EventTarget | null;
  preventDefault(): void;
}

export interface KeyboardShortcutBinding {
  readonly matches: (event: KeyboardShortcutEvent) => boolean;
  readonly run: (event: KeyboardEvent) => void;
  /** Fire on OS auto-repeat while the key is held. Default false. */
  readonly allowRepeat?: boolean;
}

export interface KeyboardShortcutOptions {
  /** Skip events from text-entry targets. Default true. */
  readonly ignoreEditableTarget?: boolean;
}

/** Event surface read by `isShortcutEventBlocked`. */
export interface ShortcutGuardEvent {
  readonly key: string;
  readonly target: EventTarget | null;
  readonly defaultPrevented?: boolean;
  readonly isComposing?: boolean;
  readonly keyCode?: number;
  readonly repeat?: boolean;
  composedPath?(): EventTarget[];
}

export interface ShortcutGuardOptions {
  /** Let the shortcut fire while a text-entry control is focused. */
  readonly allowInEditable?: boolean;
  /** Let OS auto-repeat through. Default false. */
  readonly allowRepeat?: boolean;
  /** Document probed for open modals (defaults to the global one). */
  readonly doc?: ShortcutGuardDocument | null;
}

export interface ShortcutGuardDocument {
  querySelectorAll(selector: string): ArrayLike<unknown>;
}

/** Minimal element surface the guard reads; duck-typed so it runs without a DOM. */
interface GuardElement {
  readonly tagName: string;
  readonly isContentEditable?: boolean;
  getAttribute(name: string): string | null;
  closest(selector: string): unknown;
}

const TEXT_ENTRY_SELECTOR =
  '[role="textbox"],[role="searchbox"],[role="combobox"],[role="spinbutton"],[contenteditable]:not([contenteditable="false"])';

const OVERLAY_SELECTOR =
  '[role="dialog"],[role="alertdialog"],[aria-modal="true"],[data-overlay],[role="menu"],[role="menubar"],[role="listbox"]';

const HIDDEN_SELECTOR =
  '[hidden],[inert],[aria-hidden="true"],[data-state="closed"]';

/** keyCode browsers report for keydowns that belong to an IME composition. */
const IME_PROCESS_KEY_CODE = 229;

export function matchesKey(
  event: Pick<KeyboardShortcutEvent, "key">,
  key: string,
): boolean {
  return event.key.toLowerCase() === key.toLowerCase();
}

export function isDeleteShortcut(event: Pick<KeyboardShortcutEvent, "key">): boolean {
  return matchesKey(event, "Delete") || matchesKey(event, "Backspace");
}

export function isEscapeShortcut(event: Pick<KeyboardShortcutEvent, "key">): boolean {
  return matchesKey(event, "Escape");
}

export function isUndoShortcut(
  event: Pick<KeyboardShortcutEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey">,
): boolean {
  return (event.ctrlKey || event.metaKey) && matchesKey(event, "z") && !event.shiftKey;
}

export function isRedoShortcut(
  event: Pick<KeyboardShortcutEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey">,
): boolean {
  return (event.ctrlKey || event.metaKey) && matchesKey(event, "z") && event.shiftKey;
}

export function isSelectAllShortcut(
  event: Pick<KeyboardShortcutEvent, "key" | "ctrlKey" | "metaKey">,
): boolean {
  return (event.ctrlKey || event.metaKey) && matchesKey(event, "a");
}

function asGuardElement(target: unknown): GuardElement | null {
  if (!target || typeof target !== "object") return null;
  const candidate = target as Partial<GuardElement> & { nodeType?: number };
  if (candidate.nodeType !== undefined && candidate.nodeType !== 1) return null;
  if (typeof candidate.tagName !== "string") return null;
  if (typeof candidate.getAttribute !== "function") return null;
  if (typeof candidate.closest !== "function") return null;
  return candidate as GuardElement;
}

/**
 * True when typing into `target` (or an ancestor that owns it) edits text:
 * input, textarea, select, contenteditable, or an ARIA text-entry widget.
 */
export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  const element = asGuardElement(target);
  if (!element) return false;
  const tag = element.tagName.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (element.isContentEditable) return true;
  return Boolean(element.closest(TEXT_ENTRY_SELECTOR));
}

function isHiddenOverlay(element: GuardElement): boolean {
  return Boolean(element.closest(HIDDEN_SELECTOR));
}

/** True when `target` sits inside an open dialog, modal, menu or overlay. */
export function isInsideShortcutOverlay(target: EventTarget | null): boolean {
  const overlay = asGuardElement(asGuardElement(target)?.closest(OVERLAY_SELECTOR));
  return overlay !== null && !isHiddenOverlay(overlay);
}

/** True while any visible `aria-modal` overlay is open, wherever focus is. */
export function isShortcutModalOpen(doc?: ShortcutGuardDocument | null): boolean {
  const root = doc ?? (typeof document === "undefined" ? null : document);
  if (!root) return false;
  const modals = root.querySelectorAll('[aria-modal="true"]');
  for (let index = 0; index < modals.length; index += 1) {
    const modal = asGuardElement(modals[index]);
    if (modal && !isHiddenOverlay(modal)) return true;
  }
  return false;
}

/**
 * The gate every window-level editor shortcut starts with. Blocks events an
 * inner layer already consumed (`defaultPrevented`), IME composition, OS
 * auto-repeat, keys typed into text-entry controls, and keys pressed while a
 * dialog, menu or modal owns the interaction. Checks the composed path so
 * shadow-DOM and portal targets resolve to their real origin.
 */
export function isShortcutEventBlocked(
  event: ShortcutGuardEvent,
  options: ShortcutGuardOptions = {},
): boolean {
  if (event.defaultPrevented) return true;
  if (event.isComposing || event.keyCode === IME_PROCESS_KEY_CODE) return true;
  if (event.repeat && !options.allowRepeat) return true;
  const path = event.composedPath?.() ?? [];
  const targets = path.length > 0 ? path : [event.target];
  for (const target of targets) {
    if (!asGuardElement(target)) continue;
    if (!options.allowInEditable && isEditableShortcutTarget(target)) return true;
    if (isInsideShortcutOverlay(target)) return true;
  }
  return isShortcutModalOpen(options.doc);
}

/**
 * Window keydown handler for `bindings`. The first matching binding runs and
 * consumes the key (`preventDefault`), so an outer layer sees it as handled.
 */
export function createKeyboardShortcutHandler(
  bindings: readonly KeyboardShortcutBinding[],
  options: KeyboardShortcutOptions = {},
): (event: KeyboardEvent) => void {
  const { ignoreEditableTarget = true } = options;
  return (event) => {
    if (
      isShortcutEventBlocked(event, {
        allowInEditable: !ignoreEditableTarget,
        allowRepeat: true,
      })
    ) {
      return;
    }
    for (const binding of bindings) {
      if (!binding.matches(event)) continue;
      if (event.repeat && !binding.allowRepeat) return;
      binding.run(event);
      event.preventDefault();
      return;
    }
  };
}

export function useWindowKeyboardShortcuts(
  bindings: readonly KeyboardShortcutBinding[],
  options: KeyboardShortcutOptions = {},
): void {
  const { ignoreEditableTarget = true } = options;

  useEffect(() => {
    const handleKeyDown = createKeyboardShortcutHandler(bindings, {
      ignoreEditableTarget,
    });
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bindings, ignoreEditableTarget]);
}
