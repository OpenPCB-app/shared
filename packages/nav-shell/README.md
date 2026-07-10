# @openpcb/nav-shell

The **single source of truth** for OpenPCB's unified navigation. One set of
framework-agnostic custom elements — `<opcb-nav>`, `<opcb-footer>`,
`<opcb-zoneswitch>` — rendered **identically** by both the static marketing
landing (`openpcb.app`, Websupport) and the React cloud app
(`app.openpcb.app`, Docker Swarm). Editing the header/footer means editing this
one package; there is no copied markup to keep in sync.

## Why custom elements (and Shadow DOM)

The two consumers are very different runtimes: a single inline-CSS HTML file with
no build step, and a Vite/Tailwind SPA. A custom element with Shadow DOM is the
only thing both can mount that stays visually isolated from each host's CSS. The
shell reads design tokens (`--violet`, `--bg`, …) that **inherit through the
shadow boundary** from each host's `:root`, so it's pixel-identical to whichever
site mounts it, and falls back to the canonical OpenPCB dark-theme values when
standalone.

## Build outputs

Two targets from `src/index.ts`:

| Script              | Output                                                        | Consumed by                         | Tooling     |
| ------------------- | ------------------------------------------------------------- | ----------------------------------- | ----------- |
| `npm run build`     | `dist/index.js` (ESM) + `dist/*.d.ts`                         | the cloud app (npm / Vite)          | `tsc`       |
| `npm run bundle`    | `dist/standalone/opcb-nav.js` (self-contained IIFE, minified) | the static landing (`<script src>`) | `bun build` |
| `npm run build:all` | both                                                          | —                                   | —           |

> **Bundler note.** The npm-consumed ESM build is plain `tsc` (like every other
> `@openpcb/*` package) so the cloud app installs with no bun requirement. Only
> the standalone landing bundle uses `bun build` — the monorepo's native bundler,
> so **no extra dependency / install** is needed. (Swap to `tsup`/`esbuild` later
> if preferred; only the `bundle` script changes.)

## Usage

### Cloud app (React / Vite)

```ts
import "@openpcb/nav-shell"; // registers the elements (side-effect)
import { setSessionHint, clearSessionHint } from "@openpcb/nav-shell";
```

```tsx
<opcb-nav mode="workspace" app-base="https://app.openpcb.app" marketing-base="https://openpcb.app" />
// …page content…
<opcb-zoneswitch active="workspace" app-base="https://app.openpcb.app" />
<opcb-footer app-base="https://app.openpcb.app" marketing-base="https://openpcb.app" />
```

Listen for `opcb-nav:navigate` and route client-side instead of a full reload:

```ts
el.addEventListener("opcb-nav:navigate", (e) => router.navigate(e.detail.path));
```

On login/logout, publish the cosmetic hint the marketing header reads:

```ts
setSessionHint({ name: user.name, email: user.email }); // on login
clearSessionHint(); // on logout
```

### Static landing (no build step)

```html
<script type="module" src="/opcb-nav.js"></script>
<opcb-nav mode="marketing" active="features"></opcb-nav>
<!-- …page… -->
<opcb-footer></opcb-footer>
```

The committed `web/opcb-nav.js` is the `dist/standalone/opcb-nav.js` artifact,
kept in lockstep by CI on each `nav-shell` release.

## Elements & attributes

### `<opcb-nav>`

Brand · primary links (Product · Community · Roadmap · Compare) · right cluster
(search [app only] · GitHub · theme toggle · auth-aware CTA) · responsive
hamburger. The area-switch is **not** in the bar (see `<opcb-zoneswitch>`), which
keeps the header identical on every surface.

| Attribute        | Values                                              | Notes                                             |
| ---------------- | --------------------------------------------------- | ------------------------------------------------- |
| `mode`           | `marketing` \| `community` \| `workspace`           | `marketing` hides search & never intercepts links |
| `active`         | `features` \| `community` \| `roadmap` \| `compare` | highlights current item                           |
| `marketing-base` | URL (default `https://openpcb.app`)                 | base for marketing links                          |
| `app-base`       | URL (default `https://app.openpcb.app`)             | base for Community / Sign in / Workspace          |

### `<opcb-zoneswitch>`

The Community ⇄ Workspace segmented control. Lives in the **page body** on the
app (like the prototype). Attributes: `active` (`community`\|`workspace`),
`app-base`.

### `<opcb-footer>`

Unified 5-column footer. Attributes: `marketing-base`, `app-base`.

## Events

- `opcb-nav:navigate` — `{ detail: { path } }`, cancelable, fired for same-origin
  internal links so SPA hosts route without a reload.
- `opcb-nav:theme` — `{ detail: { theme } }`, fired when the toggle flips.

## Cross-subdomain state

`localStorage` is origin-scoped, so theme & auth never cross `openpcb.app ↔
app.openpcb.app` on their own. The shell carries them in cookies scoped to
`.openpcb.app`:

- `opcb_theme` — shared dark/light choice (also mirrored to each host's legacy
  `localStorage` key).
- `opcb_session` — **cosmetic hint only** (`{name, initials}`) so the marketing
  header can show "Open workspace" + avatar. The real auth gate is the cloud app;
  a stale hint is harmless.

## Demo

`demo.html` mounts every element in both themes and exercises the auth hint.
`cd shared/packages/nav-shell && python3 -m http.server 8731`, then open
`http://localhost:8731/demo.html`.

## Release

Tag `nav-shell-vX.Y.Z` (the shared subtree-split CI pattern; see
`shared/DEVELOPING.md`). The release also runs `bundle` and syncs
`dist/standalone/opcb-nav.js` → `web/opcb-nav.js`.
