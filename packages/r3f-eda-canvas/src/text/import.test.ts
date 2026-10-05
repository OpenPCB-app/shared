import { expect, test } from "bun:test";

// Run in isolation because browser mocks must not leak into boundary/runtime tests.
test("browser module import never requests Troika default/CDN fonts", async () => {
  const child = Bun.spawn([process.execPath, new URL("../../tests/eager-import.ts", import.meta.url).pathname], {
    stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  expect(stderr).toBe("");
  expect(code).toBe(0);
  expect(JSON.parse(stdout)).toEqual({ preloads: 0 });
});
