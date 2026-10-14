/**
 * Minimal duck-typed DOM for keyboard-guard unit tests (bun has no DOM).
 * `closest` / `querySelectorAll` understand only the attribute selectors the
 * guard uses: `[a]`, `[a="v"]`, `[a]:not([a="v"])`, comma-separated.
 */
export class FakeElement {
  readonly nodeType = 1;
  readonly tagName: string;
  parentElement: FakeElement | null = null;
  private readonly attributes: Map<string, string>;

  constructor(tagName: string, attributes: Record<string, string> = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(Object.entries(attributes));
  }

  get isContentEditable(): boolean {
    for (let node: FakeElement | null = this; node; node = node.parentElement) {
      const value = node.getAttribute("contenteditable");
      if (value !== null) return value !== "false";
    }
    return false;
  }

  append(...children: FakeElement[]): this {
    for (const child of children) child.parentElement = this;
    return this;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  matches(selector: string): boolean {
    return selector.split(",").some((part) => matchesPart(this, part.trim()));
  }

  closest(selector: string): FakeElement | null {
    for (let node: FakeElement | null = this; node; node = node.parentElement) {
      if (node.matches(selector)) return node;
    }
    return null;
  }

  /** Target first, then ancestors — like `Event.composedPath()` minus document/window. */
  path(): FakeElement[] {
    const nodes: FakeElement[] = [];
    for (let node: FakeElement | null = this; node; node = node.parentElement) nodes.push(node);
    return nodes;
  }
}

const ATTRIBUTE = /\[([\w-]+)(?:="([^"]*)")?\]/g;

function matchesPart(element: FakeElement, part: string): boolean {
  const [positive, negated] = part.split(":not(");
  if (!matchesAttributes(element, positive ?? "")) return false;
  return negated === undefined || !matchesAttributes(element, negated.slice(0, -1));
}

function matchesAttributes(element: FakeElement, selector: string): boolean {
  const tests = [...selector.matchAll(ATTRIBUTE)];
  if (tests.length === 0) return false;
  return tests.every(([, name, value]) => {
    const actual = element.getAttribute(name ?? "");
    return actual !== null && (value === undefined || actual === value);
  });
}

export class FakeDocument {
  constructor(readonly elements: FakeElement[]) {}

  querySelectorAll(selector: string): FakeElement[] {
    return this.elements.filter((element) => element.matches(selector));
  }
}

export interface FakeKeyboardEvent {
  key: string;
  target: EventTarget | null;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  keyCode: number;
  defaultPrevented: boolean;
  preventDefault(): void;
  composedPath(): EventTarget[];
}

export function keyEvent(
  key: string,
  target: FakeElement | null,
  init: Partial<Omit<FakeKeyboardEvent, "preventDefault" | "composedPath" | "target">> = {},
  /** Explicit composed path, e.g. a shadow-root target retargeted to its host. */
  path?: FakeElement[],
): FakeKeyboardEvent & KeyboardEvent {
  const event: FakeKeyboardEvent = {
    key,
    target: target as unknown as EventTarget | null,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    repeat: false,
    isComposing: false,
    keyCode: 0,
    defaultPrevented: false,
    ...init,
    preventDefault() {
      event.defaultPrevented = true;
    },
    composedPath() {
      return (path ?? target?.path() ?? []) as unknown as EventTarget[];
    },
  };
  return event as FakeKeyboardEvent & KeyboardEvent;
}

/** Installs `doc` as the global `document` for the duration of `run`. */
export function withDocument<T>(doc: FakeDocument, run: () => T): T {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  try {
    return run();
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete (globalThis as { document?: unknown }).document;
  }
}
