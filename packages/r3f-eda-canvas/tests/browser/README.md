# Portable browser regressions

These fixtures use this package's declared React/R3F/Three/Troika runtime dependencies and Bun's bundler/server. They need no app checkout, app `node_modules`, or additional DOM test dependency. The licensed Noto Sans fixture and immutable manifest are under `tests/fixtures`; test assets are excluded from the published package's `files` list.

From `packages/r3f-eda-canvas`, start the isolated localhost fixture server:

```sh
npm test
npm run test:browser:serve
```

In another terminal, use the locally installed `playwright-cli` with a fresh session. Run from a temporary output directory so screenshots and session artifacts stay outside the repository. Replace `/path/to/shared` with the checkout path:

```sh
mkdir -p /tmp/eda-font-evidence
cd /tmp/eda-font-evidence
playwright-cli -s=eda-font-regression open about:blank
playwright-cli -s=eda-font-regression run-code --filename /path/to/shared/packages/r3f-eda-canvas/tests/browser/validate.playwright.js
playwright-cli -s=eda-font-regression close
```

The runner creates a new empty browser context for each case, blocks all external URLs before navigation, and fails if any external request is attempted. It verifies actual Troika `textRenderInfo` glyph geometry uses the verified resident blob URL, Greek `Ωωµμ`, Cyrillic, interior newline layout, and display-only CJK replacement. An unsupported leading control uses a whole-label marker. Missing, corrupt, and unconfigured fonts must show honest fallback status; unconfigured labels must issue no font request. Screenshots include healthy text and failed-font markers with unaffected geometry.

The separate browser boundary fixture uses React's real DOM renderer and a deliberately isolated `useThree` context stub. Its five regressions cover a permanently suspended preload, a post-preload `onSync` stall, a thrown label, missing-glyph status, and timer cleanup after unmount. The healthy sibling must remain visible.

This is package-level browser qualification. It does not establish packaged Electron, native GPU, production editor/preview coverage, or cross-platform release acceptance. The production application must still configure and consume a reviewed source-package release.
