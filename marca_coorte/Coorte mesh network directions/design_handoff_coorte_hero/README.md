# Handoff: Coorte — Hero "ligação de registros" mesh

## Overview
The Coorte marketing site (pt-BR, single-page + `sobre.html`) has a full-bleed dark hero. This handoff covers the hero's generative background graphic, which was replaced: the previous version was ~25 KB of hard-coded SVG `<line>` coordinates forming a jittered lattice; the new version is a seeded, code-generated **record-linkage** graphic — five vertical rails (the five SUS databases), tick marks (individual records), curves joining records belonging to the same person, and three highlighted chains that traverse all five rails.

Everything else on the page is unchanged and is included here only as context.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. The task is to **recreate these designs in the target codebase's existing environment** (React/Next, Astro, Vue, etc.) using its established patterns, component conventions and build pipeline. If no environment exists yet, pick the most appropriate framework for a marketing site and implement there. The generator function below is genuinely reusable logic — port it as-is; the surrounding markup should be rebuilt idiomatically.

## Fidelity
**High-fidelity.** Final colors, typography, spacing and motion. Recreate pixel-accurately, using the values in Design Tokens below.

## Screens / Views

### 1. Home (`index.html`)
Sections in order: fixed header → hero → numbers strip → Método → Casos (two dashboard mockups) → Serviços → Contato → footer. Page max width `--maxw: 1180px`, gutters 36px.

**The hero (the subject of this handoff)**

- Container `.hero`: `background:#08192A`, `color:#fff`, `padding:190px 0 84px`, `position:relative`, `overflow:hidden`. Mobile (≤900px): `padding:140px 0 60px`.
- Four stacked layers, back to front:
  1. `.hero-art` — the generated SVG. `position:absolute; top:8%; right:-3vw; width:min(760px,56vw); height:88%; z-index:1; pointer-events:none`. Animated by `coorte-drift` (below). Hidden ≤900px.
  2. `.hero-veil` — `position:absolute; inset:0; z-index:1`, `linear-gradient(90deg,#08192A 4%, rgba(8,25,42,.88) 32%, rgba(8,25,42,0) 62%)`. Keeps the headline legible; the art is only meant to read in the right third. Hidden ≤900px.
  3. `.hero::after` glows — `radial-gradient(1100px 620px at 78% 12%, rgba(42,111,176,.34), transparent 62%)` plus `radial-gradient(760px 520px at 8% 96%, rgba(176,83,58,.20), transparent 66%)`; `pointer-events:none`.
  4. Content `.wrap` at `z-index:2`.
- Content, in order:
  - Eyebrow "Ciência de dados em saúde" — IBM Plex Mono 11.5px, letter-spacing .16em, uppercase, `#7C99B2`.
  - H1 — Spectral 500, `clamp(52px,9.4vw,124px)`, line-height .94, letter-spacing -.035em, `#fff`, margin `26px 0 0`. Copy: "Do dado bruto" / "à decisão" / "em saúde." on three lines; the middle line is `<span>` in italic `#8FBBE4`.
  - Sub — Inter 20px (18px ≤900px), `#B7C7D5`, `max-width:47ch`, line-height 1.5, `margin-top:34px`.
  - Actions — flex, `gap:14px`, `margin-top:40px`, wrap. Primary `.btn.btn-light` (white bg, `#08192A` text) "Falar com a gente"; secondary `.btn.btn-outline` (transparent, 1px `rgba(255,255,255,.45)`) "Ver os casos". Both: 12px/24px padding, 14.5px/500, radius 2px.
  - Institution bar `.instbar` — `margin-top:96px`, `padding-top:26px`, `border-top:1px solid rgba(255,255,255,.15)`, flex `gap:40px` wrap; items 13.5px `#7F94A6`.

### 2. Sobre (`sobre.html`)
Included for context; not modified in this handoff.

## Interactions & Behavior

**Hero drift**
```css
.hero-art{animation:coorte-drift 30s ease-in-out infinite; will-change:transform}
@keyframes coorte-drift{
  0%{transform:translate3d(0,0,0)}
  50%{transform:translate3d(0,-16px,0)}
  100%{transform:translate3d(0,0,0)}
}
@media (prefers-reduced-motion: reduce){ .hero-art{animation:none} }
```
Vertical only — an earlier version also rotated -1deg, which made the whole plane read as a tilting sheet. Do not reintroduce rotation.

**Hero mesh generation.** Runs once on load; deterministic (fixed seed 9) so the graphic is identical for every visitor and across SSR/CSR. The SVG is `viewBox="0 0 700 700"`, `preserveAspectRatio="xMidYMid slice"`, `aria-hidden="true"`. Algorithm:

1. Five rails at x = `[110, 255, 400, 545, 668]`. Each rail: a vertical line `x1=x,y1=10,x2=x,y2=700`, stroke `#7FA9CF`, width 1, opacity .13.
2. Each rail holds 32 records at `y = 26 + i*21.5 + (rand()-0.5)*9`. Each record is a 14px horizontal tick (`x-7 → x+7`), stroke `#A9C8E4`, width 1.6, opacity **.5 if the record is used by a chain, else .2**.
3. 46 chain attempts. Each attempt includes each rail with p = 0.55; attempts touching fewer than 2 rails are discarded. For each included rail, pick an unused record at random and mark it used.
4. Consecutive picks in a chain are joined by a cubic Bézier with control points at the horizontal midpoint: `M ax ay C mx ay mx by bx by`, `mx = (ax+bx)/2`. Base link: stroke `#7FA9CF`, width .9, opacity .15.
5. The **first three chains that hit all five rails** are highlighted: stroke `#C9765C`, width 1.3, opacity .6, plus a `#E08A6C` circle r=2.6 opacity .95 at each of their five nodes. Cap at 3 — more and the graphic stops having a focal point.
6. Draw order: curves first, then rails and ticks on top.

Seeded PRNG (mulberry32) — must be used, not `Math.random()`, or the composition changes on every load:
```js
function rng(seed){var a=seed>>>0;return function(){
  a=(a+0x6D2B79F5)>>>0;var t=Math.imul(a^(a>>>15),1|a);
  t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
```
The full working implementation is the inline `<script>` at the bottom of `index.html` (search for `getElementById('mesh')`). Port it to a component that renders the SVG children; because it is deterministic it can safely be pre-rendered at build time and shipped as static markup.

**Header** `#hd` gets class `solid` when `window.scrollY > 60`: background `rgba(251,250,247,.94)`, `backdrop-filter:blur(10px)`, bottom rule; logo, nav links and wordmark flip from white to `#123A5C`/`#4E5C68`. Listener is passive; state applied once on load too.

**Contact form** is a demo — `preventDefault` and reveal the `.ok` message. Wire to a real endpoint/CRM.

**Responsive.** `.navlinks` hidden ≤900px (no mobile menu exists yet — needs designing). Hero art and veil hidden ≤900px. Dashboard mockups collapse sidebar and go single-column ≤920px.

## State Management
Minimal. Header `solid` boolean from scroll position; contact-form submitted boolean. The mesh has no runtime state — generate once, never regenerate on resize (the `slice` fit handles viewport changes).

## Design Tokens
```
--navy:#123A5C   --navy-deep:#08192A   --ink:#0E1F2E
--text:#16232E   --text-2:#4E5C68      --text-3:#7C8892
--paper:#FBFAF7  --surface:#FFFFFF     --sand:#EEE9DE   --rule:#DCD6C9
--clay:#B0533A
series: --s1:#2A6FB0  --s2:#D2694A  --s3:#2FA38C  --s4:#C79A16
--grid:#E9E5DB   --maxw:1180px
hero mesh only: rail/link #7FA9CF · record tick #A9C8E4 · chain #C9765C · chain node #E08A6C
hero text only: eyebrow #7C99B2 · sub #B7C7D5 · italic accent #8FBBE4 · instbar #7F94A6
```
Type: **Spectral** 400/500/600 + italic 500 (headings), **Inter** 400/500/600/700 (body, base 17px/1.6), **IBM Plex Mono** 400/500 (eyebrows, labels, numerals). Loaded from Google Fonts with `preconnect`. Border radius: 2px on buttons/inputs, 4px on chart bars, otherwise 0 — the design is deliberately square. Shadow (dashboard cards only): `0 1px 0 var(--rule), 0 24px 48px -30px rgba(14,31,46,.35)`.

## Assets
No raster images. The logo is a 26×26 inline SVG of four rects (frame + three bars, the middle one clay); it recolors on header scroll via CSS. All charts and dashboard mockups are hand-written inline SVG/HTML with **fictional data** — the page states this explicitly and that disclaimer must survive any port.

## Files
- `index.html` — the full home page, including the hero and the mesh generator script.
- `sobre.html` — the about page, for context and shared header/footer patterns.
- `Hero Mesh Explorations.dc.html` — the exploration board: the chosen direction (1B, record linkage) side by side with two rejected ones (1A cohort graph, 1C refined lattice) and notes on why. Reference only — do not ship.
