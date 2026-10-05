async (page) => {
  const browser = page.context().browser();
  const results = [];
  for (const mode of ["healthy", "missing", "corrupt", "unconfigured"]) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 850 }, serviceWorkers: "block" });
    const requests = [], external = [];
    context.on("request", (request) => { requests.push(request.url()); });
    await context.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.startsWith("http://127.0.0.1:1438/") || url.startsWith("blob:http://127.0.0.1:1438/")) await route.continue();
      else { external.push(url); await route.abort("blockedbyclient"); }
    });
    const fixture = await context.newPage();
    await fixture.goto(`http://127.0.0.1:1438/?mode=${mode}`);
    await fixture.waitForFunction(() => window.fontFixture?.complete === true, undefined, { timeout: 10000 });
    const state = await fixture.evaluate(() => window.fontFixture);
    if (external.length) throw new Error(`External font request attempted: ${JSON.stringify(external)}`);
    if (mode === "healthy") {
      if (state.statuses[0].state !== "ready" || state.statuses[1].state !== "ready" || state.statuses[2].reason !== "missing-glyph" || state.statuses[3].reason !== "missing-glyph") throw new Error(`Unexpected Unicode status: ${JSON.stringify(state.statuses)}`);
      if (state.renderInfo.length !== 3 || state.renderInfo.some((info) => !info.font.startsWith("blob:") || info.glyphCount < 1 || info.blockBounds.some((bound) => !Number.isFinite(bound)))) throw new Error(`No real Troika glyph geometry: ${JSON.stringify(state.renderInfo)}`);
      if (state.renderInfo[2].text !== "R1 ??" || state.originals[2] !== "R1 中文") throw new Error("Display fallback mutated domain text");
    } else if (mode === "unconfigured") {
      if (Object.values(state.statuses).some((status) => status.reason !== "unconfigured") || requests.some((url) => url.includes("font.ttf")) || state.renderInfo.length) throw new Error("Unconfigured label made font request");
    } else if (Object.values(state.statuses).some((status) => status.reason !== "font-error") || state.renderInfo.length) throw new Error(`Failed font reached Troika: ${JSON.stringify(state)}`);
    await fixture.screenshot({ path: `eda-font-${mode}.png` });
    results.push({ mode, external, requests, ...state });
    await context.close();
  }
  const context = await browser.newContext();
  const fixture = await context.newPage();
  await fixture.goto("http://127.0.0.1:1438/boundary");
  await fixture.waitForFunction(() => window.fixtureComplete === true);
  const boundaries = await fixture.evaluate(() => window.fixtureResults);
  if (boundaries.length !== 5 || boundaries.some((result) => !result.passed)) throw new Error(`Label containment failed: ${JSON.stringify(boundaries)}`);
  await context.close();
  return { fontCases: results, boundaries };
}
