import { act, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { LabelBoundary } from "../../src/text/label-boundary.js";

interface Result { name: string; passed: boolean; details: string }
const results: Result[] = [];
const report = (name: string, passed: boolean, details = "") => {
  results.push({ name, passed, details });
  document.querySelector("pre")!.textContent = JSON.stringify(results, null, 2);
};
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const sleep = () => new Promise((resolve) => setTimeout(resolve, 30));
const container = document.querySelector("#root")!;
let root = createRoot(container, { onCaughtError: () => {} });
function Ready({ onSync }: { onSync: () => void }) {
  useEffect(onSync, [onSync]); return <span>healthy</span>;
}
function Suspend(): never { throw new Promise(() => {}); }
function Crash(): never { throw new Error("broken glyph"); }
async function reset(): Promise<void> {
  await act(async () => root.unmount()); root = createRoot(container, { onCaughtError: () => {} });
}
async function mount(node: ReactNode): Promise<void> { await act(async () => root.render(node)); }

async function run(): Promise<void> {
  const statuses: string[] = [];
  await mount(<><LabelBoundary timeoutMs={10} missingCodePoints={[]} fallback={<span>stalled-marker</span>}
    renderText={() => <Suspend />} onStatus={(status) => statuses.push(`${status.state}:${status.reason ?? ""}`)} />
    <LabelBoundary timeoutMs={10} missingCodePoints={[]} fallback={<span>healthy-marker</span>}
      renderText={(onSync) => <Ready onSync={onSync} />} /></>);
  await act(sleep);
  report("stalled preload contained; healthy sibling survives", container.textContent === "stalled-markerhealthy" && statuses.includes("fallback:text-timeout"), container.textContent ?? "");
  await reset(); statuses.length = 0;
  await mount(<LabelBoundary timeoutMs={10} missingCodePoints={[]} fallback={<span>sync-marker</span>}
    renderText={() => <span>unsynced</span>} onStatus={(status) => statuses.push(`${status.state}:${status.reason ?? ""}`)} />);
  await act(sleep);
  report("post-preload sync stall contained", container.textContent === "sync-marker" && statuses.includes("fallback:text-timeout"));
  await reset();
  await mount(<LabelBoundary timeoutMs={10} missingCodePoints={[]} fallback={<span>error-marker</span>} renderText={() => <Crash />} />);
  report("throwing label contained", container.textContent === "error-marker");
  await reset(); statuses.length = 0;
  await mount(<LabelBoundary timeoutMs={10} missingCodePoints={[0x20000]} fallback={<span>marker</span>}
    renderText={(onSync) => <Ready onSync={onSync} />} onStatus={(status) => statuses.push(`${status.state}:${status.reason ?? ""}`)} />);
  report("replacement still reports missing glyph", container.textContent === "healthy" && statuses.includes("fallback:missing-glyph"));
  await reset(); statuses.length = 0;
  await mount(<LabelBoundary timeoutMs={10} missingCodePoints={[]} fallback={<span>marker</span>}
    renderText={() => <Suspend />} onStatus={(status) => statuses.push(status.state)} />);
  await act(async () => root.unmount()); await act(sleep);
  report("unmount cancels deadline", JSON.stringify(statuses) === '["pending"]');
  Object.assign(window, { fixtureResults: results, fixtureComplete: true });
}
void run().catch((error: unknown) => { report("harness", false, String(error)); Object.assign(window, { fixtureComplete: true }); });
