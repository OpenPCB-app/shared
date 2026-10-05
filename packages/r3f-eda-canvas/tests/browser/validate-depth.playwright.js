async (page) => {
  const browser = page.context().browser();
  const variants = page.url().endsWith("#artifact") ? ["source", "artifact"] : ["source"];
  const results = [];
  for (const variant of variants) {
    for (const mode of ["default", "overlay", "occluded"]) {
      const context = await browser.newContext({ viewport: { width: 1000, height: 850 }, serviceWorkers: "block" });
      const requests = [], external = [];
      context.on("request", (request) => { requests.push(request.url()); });
      await context.route("**/*", async (route) => {
        const url = route.request().url();
        if (url.startsWith("http://127.0.0.1:1438/") || url.startsWith("blob:http://127.0.0.1:1438/")) await route.continue();
        else { external.push(url); await route.abort("blockedbyclient"); }
      });
      const fixture = await context.newPage();
      await fixture.goto(`http://127.0.0.1:1438/depth?mode=${mode}&variant=${variant}`);
      await fixture.waitForFunction(() => window.footprintDepth?.complete === true, undefined, { timeout: 10000 });
      const state = await fixture.evaluate(() => window.footprintDepth);
      if (!state.readiness.synced || state.readiness.pendingMarkers !== 0 || state.readiness.stableFrames < 3) throw new Error("Captured before stable onSync commit and demand-render frames");
      if (external.length) throw new Error(`External request: ${JSON.stringify(external)}`);
      if (state.model.kind !== "footprint" || state.model.units !== "mm" || state.model.pads !== 2) throw new Error("Wrong footprint fixture");
      if (state.labels.length !== 2 || state.labels.some((label) => label.depthTest !== (mode === "occluded") || label.depthWrite !== false)) throw new Error(`Incorrect silk material flags: ${JSON.stringify(state.labels)}`);
      if (state.labels.some((label) => !label.font.startsWith("blob:") || label.glyphCount < 1 || label.blockBounds.length !== 4 || label.blockBounds.some((number) => !Number.isFinite(number)))) throw new Error("No valid real Troika glyph geometry");
      const covered = state.labels.find((label) => label.text === "R1 Ω µ μ");
      if (!covered || covered.position.some((coordinate) => coordinate !== 0) || covered.blockBounds[0] < -3 || covered.blockBounds[2] > 3 || covered.blockBounds[1] < -0.75 || covered.blockBounds[3] > 0.75) throw new Error(`Label not contained behind occluder: ${JSON.stringify(covered)}`);
      if (mode === "occluded" ? state.pixels.coveredLabel !== 0 : state.pixels.coveredLabel < 100) throw new Error(`Wrong visible/occluded glyph pixels: ${JSON.stringify(state.pixels)}`);
      if (state.pixels.uncoveredGreek < 100) throw new Error("Greek label outside occluder vanished");
      await fixture.screenshot({ path: `eda-depth-${variant}-${mode}.png` });
      results.push({ ...state, requests, external });
      await context.close();
    }
  }
  if (variants.length === 2) {
    for (const mode of ["default", "overlay", "occluded"]) {
      const source = results.find((result) => result.variant === "source" && result.mode === mode);
      const artifact = results.find((result) => result.variant === "artifact" && result.mode === mode);
      const canonical = (state) => ({ model: state.model, pixels: state.pixels, labels: state.labels.map(({ font, ...label }) => label) });
      if (JSON.stringify(canonical(source)) !== JSON.stringify(canonical(artifact))) throw new Error(`Source/artifact rendering differs in ${mode}: ${JSON.stringify({ source: canonical(source), artifact: canonical(artifact) })}`);
    }
  }
  return { variants, results };
}
