var u=`
${`
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
`}
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
`,w=`

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
`,_=`

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

:host{ display: inline-flex; }
.area-seg{ display: inline-flex; background: var(--_surface); border: 1px solid var(--_border); border-radius: var(--_radius-pill); padding: 4px; gap: 4px; font-family: var(--_font-sans); }
.area-seg a{ font-size: 13.5px; font-weight: 600; color: var(--_text-2); padding: 7px 16px; border-radius: var(--_radius-pill); display: inline-flex; align-items: center; gap: 7px; transition: .15s; white-space: nowrap; }
.area-seg a:hover{ color: var(--_text); }
.area-seg a.on{ background: var(--_violet); color: #fff; }
.area-seg a.on:hover{ color: #fff; }
.area-seg svg{ width: 14px; height: 14px; }
`;var d='<svg class="logo" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/><line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>',y='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.42.36.8 1.08.8 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z"/></svg>',p='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',g='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>',m='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',k='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>',z='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',M='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';var C=["opcb-theme","openpcb.cloud.theme"];function Q(){let r=location.hostname;return r==="openpcb.app"||r.endsWith(".openpcb.app")}function B(){let r=location.protocol==="https:"?"; Secure":"",a=Q()?"; Domain=.openpcb.app":"";return`; Path=/; SameSite=Lax${r}${a}`}function $(r){let a=r.replace(/([.$?*|{}()[\]\\/+^])/g,"\\$1"),t=document.cookie.match(new RegExp("(?:^|; )"+a+"=([^;]*)"))?.[1];return t!=null?decodeURIComponent(t):null}function H(r,a,o=365){let t=Math.round(o*86400);document.cookie=`${r}=${encodeURIComponent(a)}; Max-Age=${t}${B()}`}function W(r){document.cookie=`${r}=; Max-Age=0${B()}`}function i(){let r=$("opcb_theme");if(r==="dark"||r==="light")return r;for(let t of C)try{let e=localStorage.getItem(t);if(e==="dark"||e==="light")return e}catch{}let a=document.documentElement;if(a.classList.contains("dark"))return"dark";let o=a.getAttribute("data-theme");if(o==="dark"||o==="light")return o;return"dark"}function n(r){let a=document.documentElement;a.setAttribute("data-theme",r),a.classList.toggle("dark",r==="dark")}function h(r){H("opcb_theme",r);for(let a of C)try{localStorage.setItem(a,r)}catch{}}function c(){let r=$("opcb_session");if(!r)return null;try{let a=JSON.parse(r);if(a&&typeof a.initials==="string"&&a.initials.length>0)return{name:typeof a.name==="string"?a.name:"",initials:a.initials.slice(0,2).toUpperCase()}}catch{}return null}function X(r){let a=(r.name??"").trim(),o={name:a,initials:J(a||r.email||"")};H("opcb_session",JSON.stringify(o))}function q(){W("opcb_session")}function J(r){let a=(r||"").trim();if(!a)return"·";let t=(a.includes("@")?a.split("@")[0]??a:a).split(/[\s._-]+/).filter(Boolean);if(t.length===0)return"·";if(t.length===1)return(t[0]??"").slice(0,2).toUpperCase()||"·";let e=t[0]??"",x=t[t.length-1]??"";return((e[0]??"")+(x[0]??"")).toUpperCase()||"·"}var I="https://openpcb.app",K="https://app.openpcb.app",Z=[{key:"features",label:"Product",area:"marketing",path:"/#features"},{key:"community",label:"Community",area:"app",path:"/"},{key:"roadmap",label:"Roadmap",area:"marketing",path:"/#roadmap"},{key:"compare",label:"Compare",area:"marketing",path:"/#compare"}];class f extends HTMLElement{static get observedAttributes(){return["mode","active","marketing-base","app-base"]}root;menuOpen=!1;lastSessionKey="";onFocus=()=>this.syncDynamic();constructor(){super();this.root=this.attachShadow({mode:"open"})}connectedCallback(){n(i()),this.render(),this.root.addEventListener("click",this.handleClick),this.root.addEventListener("submit",this.handleSubmit),window.addEventListener("focus",this.onFocus),document.addEventListener("visibilitychange",this.onFocus)}disconnectedCallback(){window.removeEventListener("focus",this.onFocus),document.removeEventListener("visibilitychange",this.onFocus)}attributeChangedCallback(){if(this.isConnected)this.render()}get navMode(){let r=this.getAttribute("mode");return r==="community"||r==="workspace"?r:"marketing"}get activeKey(){return this.getAttribute("active")??""}get marketingBase(){return(this.getAttribute("marketing-base")??I).replace(/\/$/,"")}get appBase(){return(this.getAttribute("app-base")??K).replace(/\/$/,"")}url(r,a){return(r==="marketing"?this.marketingBase:this.appBase)+(a.startsWith("/")?a:"/"+a)}render(){let r=c();this.lastSessionKey=r?r.initials+"|"+r.name:"";let a=this.navMode!=="marketing";this.root.innerHTML=`<style>${u}</style>
<header class="nav">
  <div class="wrap nav-row">
    <a class="brand" href="${this.url("marketing","/")}" aria-label="OpenPCB home">${d}<span>Open<b>PCB</b></span></a>
    <nav class="nav-links" aria-label="Primary">${this.navLinksHtml()}</nav>
    <div class="nav-right">
      ${a?this.searchHtml():""}
      <a class="gh-pill" href="https://github.com/OpenPCB-app/OpenPCB" target="_blank" rel="noopener noreferrer">${y}<span>GitHub</span></a>
      <button class="icon-btn" type="button" data-theme-toggle aria-label="Toggle theme" title="Toggle theme">${i()==="light"?g:p}</button>
      ${this.ctaHtml(r)}
      <button class="icon-btn hamburger" type="button" data-hamburger aria-label="Menu" aria-expanded="${this.menuOpen}">${M}</button>
    </div>
  </div>
  <div class="menu${this.menuOpen?" open":""}">
    <div class="wrap">${this.navLinksHtml()}${this.menuCtaHtml(r)}</div>
  </div>
</header>`}navLinksHtml(){return Z.map((r)=>{let a=r.key===this.activeKey?' class="active"':"",o=r.area==="app"?" data-app":"";return`<a${a} href="${this.url(r.area,r.path)}"${o}>${r.label}</a>`}).join("")}searchHtml(){return`<form class="header-search" data-search role="search">${m}<input name="q" type="search" placeholder="Search components…" aria-label="Search components" /></form>`}ctaHtml(r){if(r)return`<span class="cta">
        <a class="btn btn-primary btn-sm" href="${this.url("app","/app")}" data-app>Open workspace</a>
        <a class="avatar" href="${this.url("app","/app/settings")}" data-app title="${V(r.name||"Account")}">${Y(r.initials)}</a>
      </span>`;return`<span class="cta">
      <a class="btn btn-primary btn-sm" href="${this.url("marketing","/#download")}">Download</a>
      <a class="btn btn-ghost btn-sm" href="${this.url("app","/sign-in")}" data-app>Sign in</a>
    </span>`}menuCtaHtml(r){if(r)return`<div class="menu-cta">
        <a class="btn btn-primary btn-sm" href="${this.url("app","/app")}" data-app>Open workspace</a>
        <a class="btn btn-ghost btn-sm" href="https://github.com/OpenPCB-app/OpenPCB" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>`;return`<div class="menu-cta">
      <a class="btn btn-primary btn-sm" href="${this.url("marketing","/#download")}">Download</a>
      <a class="btn btn-ghost btn-sm" href="${this.url("app","/sign-in")}" data-app>Sign in</a>
      <a class="btn btn-ghost btn-sm" href="https://github.com/OpenPCB-app/OpenPCB" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>`}handleClick=(r)=>{let o=r.target?.closest("a,button");if(!o)return;if(o.matches("[data-theme-toggle]")){r.preventDefault(),this.toggleTheme();return}if(o.matches("[data-hamburger]")){r.preventDefault(),this.setMenu(!this.menuOpen);return}let t=o.getAttribute("href");if(!t)return;if(o.hasAttribute("data-app")&&this.navMode!=="marketing"){let e=new URL(t,location.href);if(e.origin===location.origin)r.preventDefault(),this.setMenu(!1),this.dispatchEvent(new CustomEvent("opcb-nav:navigate",{detail:{path:e.pathname+e.search+e.hash},bubbles:!0,composed:!0}))}};handleSubmit=(r)=>{let a=r.target;if(!(a instanceof HTMLFormElement)||!a.matches("[data-search]"))return;r.preventDefault();let t=a.querySelector("input[name=q]")?.value.trim()??"",e=this.navMode==="workspace"?"/app/library":"/",x=t?`${e}?q=${encodeURIComponent(t)}`:e,b=this.url("app",x);if(this.navMode!=="marketing"&&new URL(b,location.href).origin===location.origin)this.dispatchEvent(new CustomEvent("opcb-nav:navigate",{detail:{path:x},bubbles:!0,composed:!0}));else location.href=b};toggleTheme(){let r=i()==="dark"?"light":"dark";n(r),h(r);let a=this.root.querySelector("[data-theme-toggle]");if(a)a.innerHTML=r==="light"?g:p;this.dispatchEvent(new CustomEvent("opcb-nav:theme",{detail:{theme:r},bubbles:!0,composed:!0}))}setMenu(r){if(this.menuOpen===r)return;this.menuOpen=r;let a=this.root.querySelector(".menu");if(a)a.classList.toggle("open",r);let o=this.root.querySelector("[data-hamburger]");if(o)o.setAttribute("aria-expanded",String(r))}syncDynamic(){if(!this.isConnected)return;n(i());let r=this.root.querySelector("[data-theme-toggle]");if(r)r.innerHTML=i()==="light"?g:p;let a=c();if((a?a.initials+"|"+a.name:"")!==this.lastSessionKey)this.render()}}function Y(r){return r.replace(/[&<>]/g,(a)=>a==="&"?"&amp;":a==="<"?"&lt;":"&gt;")}function V(r){return r.replace(/["&<>]/g,(a)=>a==='"'?"&quot;":a==="&"?"&amp;":a==="<"?"&lt;":"&gt;")}var F="https://openpcb.app",G="https://app.openpcb.app",l="https://github.com/OpenPCB-app/OpenPCB";class v extends HTMLElement{static get observedAttributes(){return["marketing-base","app-base"]}root;constructor(){super();this.root=this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.root.addEventListener("click",this.handleClick)}attributeChangedCallback(){if(this.isConnected)this.render()}get marketingBase(){return(this.getAttribute("marketing-base")??F).replace(/\/$/,"")}get appBase(){return(this.getAttribute("app-base")??G).replace(/\/$/,"")}mk(r){return this.marketingBase+r}app(r){return this.appBase+r}render(){this.root.innerHTML=`<style>${w}</style>
<footer class="footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="brand" href="${this.mk("/")}" aria-label="OpenPCB home">${d}<span>Open<b>PCB</b></span></a>
        <p>Open-source PCB design — on your machine, in the cloud, with AI. Local-first &amp; KiCad-compatible.</p>
      </div>
      <div class="foot-col">
        <h5>Product</h5>
        <a href="${this.mk("/#features")}">Features</a>
        <a href="${this.mk("/#download")}">Download</a>
        <a href="${this.mk("/#roadmap")}">Roadmap</a>
        <a href="${this.mk("/#compare")}">Compare</a>
        <a href="${this.mk("/#commercial")}">Commercial</a>
      </div>
      <div class="foot-col">
        <h5>Community</h5>
        <a href="${this.app("/")}" data-app>Explore</a>
        <a href="${this.app("/")}" data-app>Projects</a>
        <a href="${this.app("/")}" data-app>Components</a>
      </div>
      <div class="foot-col">
        <h5>Resources</h5>
        <a href="${l}" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="${l}/issues" target="_blank" rel="noopener noreferrer">Issues</a>
        <a href="${l}/blob/master/ROADMAP.md" target="_blank" rel="noopener noreferrer">Roadmap</a>
        <a href="${this.app("/sign-in")}" data-app>Sign in</a>
      </div>
      <div class="foot-col">
        <h5>License</h5>
        <a href="${l}/blob/master/LICENSE" target="_blank" rel="noopener noreferrer">AGPL-3.0</a>
        <a href="${this.mk("/#commercial")}">Commercial</a>
        <a href="${l}/security/policy" target="_blank" rel="noopener noreferrer">Security</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© 2026 OpenPCB · AGPL-3.0-or-later + Commercial</span>
      <span class="mono">Local-first &amp; open · desktop · cloud · community</span>
    </div>
  </div>
</footer>`}handleClick=(r)=>{let a=r.target?.closest("a");if(!a)return;let o=a.getAttribute("href");if(!o||!a.hasAttribute("data-app"))return;let t=new URL(o,location.href);if(t.origin===location.origin)r.preventDefault(),this.dispatchEvent(new CustomEvent("opcb-nav:navigate",{detail:{path:t.pathname+t.search+t.hash},bubbles:!0,composed:!0}))}}var N="https://app.openpcb.app";class s extends HTMLElement{static get observedAttributes(){return["active","app-base"]}root;constructor(){super();this.root=this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.root.addEventListener("click",this.handleClick)}attributeChangedCallback(){if(this.isConnected)this.render()}get appBase(){return(this.getAttribute("app-base")??N).replace(/\/$/,"")}render(){let r=this.getAttribute("active")!=="workspace";this.root.innerHTML=`<style>${_}</style>
<div class="area-seg" role="tablist" aria-label="Zone">
  <a class="${r?"on":""}" href="${this.appBase}/" data-app role="tab" aria-selected="${r}">${k}Community</a>
  <a class="${!r?"on":""}" href="${this.appBase}/app" data-app role="tab" aria-selected="${!r}">${z}Workspace</a>
</div>`}handleClick=(r)=>{let a=r.target?.closest("a");if(!a)return;let o=a.getAttribute("href");if(!o)return;let t=new URL(o,location.href);if(t.origin===location.origin)r.preventDefault(),this.dispatchEvent(new CustomEvent("opcb-nav:navigate",{detail:{path:t.pathname+t.search+t.hash},bubbles:!0,composed:!0}))}}function D(){if(typeof customElements>"u")return;if(!customElements.get("opcb-nav"))customElements.define("opcb-nav",f);if(!customElements.get("opcb-footer"))customElements.define("opcb-footer",v);if(!customElements.get("opcb-zoneswitch"))customElements.define("opcb-zoneswitch",s)}D();export{X as setSessionHint,h as persistTheme,J as initialsOf,i as getTheme,c as getSession,D as defineOpcbShell,q as clearSessionHint,n as applyTheme,s as OpcbZoneSwitch,f as OpcbNav,v as OpcbFooter};
