import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BunPlugin } from "bun";

function peerEntry(specifier: string, require: ReturnType<typeof createRequire>): string {
  const bare = !specifier.startsWith("@") ? !specifier.includes("/") : specifier.split("/").length === 2;
  if (bare) {
    for (const search of require.resolve.paths(specifier) ?? []) {
      const directory = join(search, specifier);
      try {
        const data = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as { name: string; module?: string; main?: string };
        if (data.name === specifier && (data.module || data.main)) return join(directory, data.module ?? data.main!);
      } catch {}
    }
  }
  return require.resolve(specifier);
}

/** Resolve the real implementation, with one peer graph for source/artifact comparison. */
export function depthBuildPlugin(implementation: string, peerManifest: string): BunPlugin {
  const require = createRequire(peerManifest);
  return {
    name: "depth-fixture-real-package",
    setup(builder) {
      builder.onResolve({ filter: /^eda-canvas-under-test$/ }, () => ({ path: implementation }));
      builder.onResolve({ filter: /^(react(?:\/|$)|react-dom(?:\/|$)|three(?:\/|$)|@react-three\/(?:fiber|drei)(?:\/|$)|troika-three-text$|@openpcb\/rendering-core$)/ },
        ({ path }) => ({ path: peerEntry(path, require) }));
    },
  };
}
