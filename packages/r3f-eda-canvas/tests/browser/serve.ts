import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { depthBuildPlugin } from "./depth-build-plugin.js";
const output = await mkdtemp(join(tmpdir(), "eda-font-browser-"));
const fixture = new URL("../fixtures/NotoSans-Regular.ttf", import.meta.url);
const artifact = process.env.EDA_CANVAS_ARTIFACT_ROOT;
const peers = process.env.EDA_CANVAS_PEER_MANIFEST ?? new URL("../../package.json", import.meta.url).pathname;

async function build(name: string, entry: string, plugins: Parameters<typeof Bun.build>[0]["plugins"] = []): Promise<void> {
  const result = await Bun.build({ entrypoints: [entry], outdir: output, naming: `${name}.js`, target: "browser", plugins });
  if (!result.success) throw new Error(result.logs.map(String).join("\n"));
}
for (const name of ["label-boundary", "real-font"]) {
  await build(name, new URL(`${name}.fixture.tsx`, import.meta.url).pathname, name === "label-boundary" ? [{
    name: "isolated-fiber-context", setup(builder) {
      builder.onResolve({ filter: /^@react-three\/fiber$/ }, () => ({ path: "fiber-test", namespace: "fixture" }));
      builder.onLoad({ filter: /^fiber-test$/, namespace: "fixture" }, () => ({ loader: "js", contents: "export const useThree = selector => selector({invalidate:()=>{}});" }));
    },
  }] : []);
}
const depthEntry = new URL("footprint-depth.fixture.tsx", import.meta.url).pathname;
await build("footprint-depth-source", depthEntry, [depthBuildPlugin(new URL("../../src/index.ts", import.meta.url).pathname, peers)]);
if (artifact) await build("footprint-depth-artifact", depthEntry, [depthBuildPlugin(join(artifact, "dist/index.js"), peers)]);
const server = Bun.serve({ hostname: "127.0.0.1", port: Number(process.env.EDA_FONT_TEST_PORT ?? 1438), fetch(request) {
  const url = new URL(request.url);
  if (url.pathname === "/font.ttf") {
    if (url.searchParams.get("mode") === "missing") return new Response("missing", { status: 404 });
    if (url.searchParams.get("mode") === "corrupt") return new Response("corrupt");
    return new Response(Bun.file(fixture));
  }
  if (url.pathname.endsWith(".js")) return new Response(Bun.file(join(output, url.pathname.slice(1))));
  const name = url.pathname.includes("depth") ? `footprint-depth-${url.searchParams.get("variant") ?? "source"}` : url.pathname.includes("boundary") ? "label-boundary" : "real-font";
  return new Response(`<!doctype html><meta charset="utf-8"><title>EDA font fixture</title><style>#root{width:800px;height:400px}body{font-family:monospace}</style><div id="root"></div><pre></pre><script type="module" src="/${name}.js"></script>`, { headers: { "content-type": "text/html" } });
} });
console.log(`EDA browser fixtures: ${server.url} and /boundary and /depth?mode=default&variant=source`);
