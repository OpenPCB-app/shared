/**
 * Shell CSS, ported verbatim from the unified-site prototype + the canonical
 * landing tokens. Every color/space references an internal `--_x` custom
 * property that resolves to the HOST page's `--x` token when present (so the
 * shell is pixel-identical to whichever site mounts it) and falls back to the
 * canonical OpenPCB dark-theme value when standalone. The host flips light/dark
 * by redefining `--x` on `:root`; the shell inherits it through the shadow
 * boundary automatically.
 */
const TOKENS = /* css */ `
:host{
  --_violet: var(--violet, #7c3aed);
  --_violet-bright: var(--violet-bright, #8b5cf6);
  --_violet-text: var(--violet-text, #c4b5fd);
  --_copper: var(--copper, #e0573a);
  --_bg: var(--bg, #0a0e16);
  --_bg-elev: var(--bg-elev, #0f1520);
  --_surface: var(--surface, #151e30);
  --_surface-2: var(--surface-2, #1a2438);
  --_input: var(--input, #10141b);
  --_border: var(--border, #243049);
  --_border-soft: var(--border-soft, #1a2436);
  --_hairline: var(--hairline, rgba(255,255,255,.06));
  --_text: var(--text, #f3f4f6);
  --_text-2: var(--text-2, #9ca3af);
  --_text-3: var(--text-3, #6b7280);
  --_accent-text: var(--accent-text, #c4b5fd);
  --_glow: var(--glow, rgba(124,58,237,.45));
  --_warning: var(--warning, #fbbf24);
  --_font-sans: var(--font-sans, "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  --_font-mono: var(--font-mono, "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  --_radius-control: var(--radius-control, 8px);
  --_radius-pill: var(--radius-pill, 999px);
  --_maxw: var(--maxw, 1200px);
  --_ease: var(--ease, cubic-bezier(.22,.61,.36,1));
  display: block;
}
*{ box-sizing: border-box; }
a{ color: inherit; text-decoration: none; cursor: pointer; }
.wrap{ max-width: var(--_maxw); margin: 0 auto; padding: 0 28px; }
`;
export const NAV_CSS = /* css */ `
${TOKENS}
/* The HOST is the sticky element (a sticky .nav inside the shadow would only
   stick within the short host box). The host stays in the page/flex flow. */
:host{ position: sticky; top: 0; z-index: 60; }
.nav{ position: relative; background: color-mix(in srgb, var(--_bg) 82%, transparent); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); border-bottom: 1px solid var(--_hairline); font-family: var(--_font-sans); }
.nav-row{ display: flex; align-items: center; gap: 20px; height: 64px; }
.brand{ display: flex; align-items: center; gap: 11px; font-weight: 800; font-size: 18px; letter-spacing: -.02em; color: var(--_text); flex: none; }
.brand .logo{ width: 30px; height: 30px; color: var(--_violet); flex: none; filter: drop-shadow(0 0 10px var(--_glow)); }
.brand b{ font-weight: 800; }
.nav-links{ display: flex; align-items: center; gap: 3px; margin-left: 6px; }
.nav-links a{ font-size: 14.5px; font-weight: 500; color: var(--_text-2); padding: 8px 12px; border-radius: 8px; transition: .15s; white-space: nowrap; }
.nav-links a:hover{ color: var(--_text); background: var(--_surface); }
.nav-links a.active{ color: var(--_text); background: var(--_surface); }
.nav-right{ margin-left: auto; display: flex; align-items: center; gap: 10px; }
.header-search{ display: flex; align-items: center; gap: 8px; background: var(--_input); border: 1px solid var(--_border); border-radius: var(--_radius-control); padding: 8px 12px; width: 220px; color: var(--_text-3); font-size: 13.5px; }
.header-search svg{ width: 15px; height: 15px; flex: none; }
.header-search input{ background: none; border: 0; outline: 0; color: var(--_text); font-family: var(--_font-sans); font-size: 13.5px; width: 100%; }
.icon-btn{ display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px; background: var(--_surface); border: 1px solid var(--_border); color: var(--_text-2); cursor: pointer; transition: .15s; flex: none; }
.icon-btn:hover{ color: var(--_text); border-color: var(--_violet); }
.icon-btn svg{ width: 18px; height: 18px; }
.gh-pill{ display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: var(--_surface); border: 1px solid var(--_border); font-size: 13.5px; font-weight: 600; color: var(--_text); transition: .15s; white-space: nowrap; }
.gh-pill:hover{ border-color: var(--_violet); }
.gh-pill svg{ width: 16px; height: 16px; }
.btn{ display: inline-flex; align-items: center; gap: 9px; font-family: var(--_font-sans); font-weight: 600; font-size: 15px; padding: 12px 19px; border-radius: var(--_radius-control); border: 1px solid transparent; cursor: pointer; transition: .2s var(--_ease); white-space: nowrap; }
.btn-sm{ padding: 9px 14px; font-size: 13.5px; }
.btn-primary{ background: linear-gradient(180deg, var(--_violet-bright), var(--_violet)); color: #fff; box-shadow: 0 0 0 1px rgba(124,58,237,.4), 0 10px 30px -10px var(--_glow); }
.btn-primary:hover{ transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(139,92,246,.6), 0 18px 40px -12px var(--_glow); }
.btn-ghost{ background: var(--_surface); color: var(--_text); border-color: var(--_border); }
.btn-ghost:hover{ border-color: var(--_violet); background: var(--_surface-2); }
.cta{ display: inline-flex; gap: 10px; align-items: center; }
.avatar{ width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--_violet), var(--_copper)); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; font-family: var(--_font-mono); border: 1px solid var(--_border); flex: none; }
.icon-btn.hamburger{ display: none; }
.menu{ display: none; }
@media (max-width: 920px){
  .nav-links, .header-search{ display: none; }
  .icon-btn.hamburger{ display: inline-flex; }
  .menu.open{ display: block; position: absolute; left: 0; right: 0; top: 64px; background: var(--_bg-elev); border-bottom: 1px solid var(--_border); padding: 10px 0; box-shadow: 0 18px 40px -24px rgba(0,0,0,.8); }
  .menu.open .wrap{ display: flex; flex-direction: column; gap: 2px; }
  .menu.open a{ padding: 11px 12px; border-radius: 8px; color: var(--_text-2); font-weight: 500; font-size: 15px; }
  .menu.open a:hover{ background: var(--_surface); color: var(--_text); }
  /* Whatever the row drops below is still reachable here. */
  .menu.open .menu-cta{ display: flex; gap: 10px; margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--_hairline); }
  .menu.open .menu-cta a{ flex: 1; justify-content: center; padding: 11px 14px; }
  /* .menu.open a above sets a link colour; re-assert the button colours or the
     primary CTA renders dark-on-violet (unreadable in the light theme). */
  .menu.open .menu-cta a.btn-primary{ color: #fff; }
  .menu.open .menu-cta a.btn-ghost{ color: var(--_text); }
  .menu.open .menu-cta a:hover{ background: initial; }
  .menu.open .menu-cta a.btn-primary:hover{ transform: none; }
  .menu.open .menu-cta a.btn-ghost:hover{ background: var(--_surface-2); }
}
.menu-cta{ display: none; }

/* Below ~560px the row runs out of width. Shed the optional items in priority
   order — GitHub pill, then Sign in, then Download — so brand + theme + burger
   always fit. Everything shed stays available in the hamburger menu. */
@media (max-width: 560px){
  .nav-row{ gap: 12px; height: 58px; }
  .gh-pill{ display: none; }
  .cta{ gap: 8px; }
}
@media (max-width: 430px){ .cta .btn-ghost{ display: none; } }
@media (max-width: 360px){ .cta .btn-primary{ display: none; } }
`;
export const FOOTER_CSS = /* css */ `
${TOKENS}
.footer{ border-top: 1px solid var(--_border); background: var(--_bg-elev); padding: 56px 0 32px; font-family: var(--_font-sans); }
.foot-grid{ display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr; gap: 30px; }
.brand{ display: inline-flex; align-items: center; gap: 11px; font-weight: 800; font-size: 18px; letter-spacing: -.02em; color: var(--_text); }
.brand .logo{ width: 30px; height: 30px; color: var(--_violet); flex: none; filter: drop-shadow(0 0 10px var(--_glow)); }
.brand b{ font-weight: 800; }
.foot-brand p{ color: var(--_text-3); font-size: 14px; max-width: 280px; margin: 12px 0 0; line-height: 1.55; }
.foot-col h5{ font-family: var(--_font-mono); font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: var(--_text-3); margin: 0 0 13px; }
.foot-col a{ display: block; color: var(--_text-2); font-size: 14px; padding: 5px 0; }
.foot-col a:hover{ color: var(--_accent-text); }
.foot-bottom{ display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between; margin-top: 42px; padding-top: 22px; border-top: 1px solid var(--_border-soft); font-size: 13px; color: var(--_text-3); }
.mono{ font-family: var(--_font-mono); }
@media (max-width: 880px){ .foot-grid{ grid-template-columns: 1fr 1fr; gap: 26px; } }
@media (max-width: 520px){ .foot-grid{ grid-template-columns: 1fr; } }
`;
export const ZONE_CSS = /* css */ `
${TOKENS}
:host{ display: inline-flex; }
.area-seg{ display: inline-flex; background: var(--_surface); border: 1px solid var(--_border); border-radius: var(--_radius-pill); padding: 4px; gap: 4px; font-family: var(--_font-sans); }
.area-seg a{ font-size: 13.5px; font-weight: 600; color: var(--_text-2); padding: 7px 16px; border-radius: var(--_radius-pill); display: inline-flex; align-items: center; gap: 7px; transition: .15s; white-space: nowrap; }
.area-seg a:hover{ color: var(--_text); }
.area-seg a.on{ background: var(--_violet); color: #fff; }
.area-seg a.on:hover{ color: #fff; }
.area-seg svg{ width: 14px; height: 14px; }
`;
//# sourceMappingURL=styles.js.map