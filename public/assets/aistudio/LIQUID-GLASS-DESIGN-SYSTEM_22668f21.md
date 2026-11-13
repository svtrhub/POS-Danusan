---
name: liquid-glass-design-system
description: Apple Liquid Glass design system (WWDC 2025 inspired) featuring a 5-layer optical stack (blur, saturation boost, specular highlights, dual-tone refraction borders, noise texture, and mandatory legibility scrims) and liquid-glass-js WebGL reference integration. Includes 3 calibrated variants (Light Frost, Dark Obsidian, Midnight Navy) for web UI engineering and graphic design.
---

# Liquid Glass Design Skill

## 1. Skill Metadata & Agent Context

```yaml
skill_name: liquid-glass-design-system
version: 1.1.0
target_domain: [Web UI Engineering, Graphic & Vector Design, WebGL / JS Glass Shaders, Design Token Generation]
research_basis:
  - Apple Liquid Glass (WWDC 2025) — cross-platform material spanning iOS 26, iPadOS 26,
    macOS Tahoe 26, watchOS 26, tvOS 26, and visionOS spatial computing
  - visionOS spatial glass materials (depth-responsive, eye/gaze-reactive specular behavior)
  - Post-2021 web glassmorphism (backdrop-filter era) synthesized with Apple's realtime
    refraction/specular model
  - dashersw/liquid-glass-js (https://github.com/dashersw/liquid-glass-js) — WebGL-powered real-time glass refraction JS library
author_role: Senior Design Systems Architect & Material Physics Specialist
last_verified: 2026-09
```

### 1.1 Operational Rules for AI Agents

An agent applying this skill MUST follow this decision order on every task:

1. **Classify the surface.** Determine if the deliverable is a *web artifact* (HTML/CSS/Tailwind/React), a *static graphic asset* (Figma/vector/canvas/raster export), or *both*. Route to Section 4 (Web) and/or Section 5 (Graphic).
2. **Select a variant.** Never invent a fourth palette. Choose exactly one of Variant A (Light), Variant B (Dark), or Variant C (Navy) from Section 3, or explicitly compose a themed hybrid using only the token formulas in §2 (never eyeball hex values).
3. **Never skip the scrim step.** Every glass surface that will host text or icons MUST receive a scrim layer (§2.6) before typography is placed. An agent that outputs glass CSS/layers without a scrim has produced a defective artifact — treat this as a hard build failure, not a style nit.
4. **Always run the contrast check** in §2.7 against the *worst-case* sampled background region, not the average. If the check fails, the agent must escalate opacity/scrim strength per the remediation ladder in §2.7 before delivering the artifact — never ship and hope.
5. **Always emit a fallback.** Every CSS deliverable must include the `@supports` fallback block from §4.4. Every graphic asset must document its flattened (non-blurred) export equivalent.
6. **Respect motion and transparency preferences.** Any interactive deliverable must include `prefers-reduced-motion` and `prefers-reduced-transparency` handling (§4.4).
7. **Do not reproduce Apple's actual UI chrome, iconography, wordmarks, or app layouts.** This skill encodes the *material system* (physics, tokens, math) as a generalizable design language for original interfaces — not a clone of Apple's shipped screens.
8. **Report, don't guess, when uncertain.** If a request's target platform contrast requirement is unstated, default to WCAG AA (4.5:1 body text, 3:1 large text/UI components) and state that assumption in the deliverable's handoff notes.
9. **Select WebGL JS vs Pure CSS based on interactivity & physics.** Use the Section 4 CSS 5-layer optical stack for high-performance DOM UI, cards, docks, and responsive layouts. Reference Section 7 `liquid-glass-js` (`https://github.com/dashersw/liquid-glass-js`) when building dynamic JS/WebGL canvas components requiring live DOM refraction sampling, real-time center warping, or nested WebGL glass container optics.

---

## 2. Core Material Physics & Visual Mechanics

Liquid glass is not "blur + transparency." It is a **five-layer optical stack** rendered in a fixed order. Every glass surface an agent produces must contain all five layers, even when some are subtle:

```
Layer 5: Noise / Grain           (breaks banding, adds material tooth)
Layer 4: Specular Highlight      (simulated light source hitting the surface)
Layer 3: Border / Refraction Rim (the "edge" that sells the glass-ness)
Layer 2: Backdrop Blur + Saturation (the optical distortion of what's behind)
Layer 1: Base Tint Fill + Scrim  (the tinted, legibility-guaranteeing base)
```

### 2.1 Backdrop Blur (`backdrop-filter`)

Blur radius is the single strongest determinant of "cheap vs. premium" glass. Use these bands:

| Surface size / role | Blur radius | Saturation boost |
|---|---|---|
| Small chip / badge / pill button | 12–16px | `saturate(140%)` |
| Standard card / panel | 20–28px | `saturate(160%)` |
| Modal / sheet / large overlay | 32–40px | `saturate(180%)` |
| Floating navbar / dock (heaviest occlusion) | 40–60px | `saturate(200%)` |

Formula:
```css
backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat)) brightness(var(--glass-bright));
-webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat)) brightness(var(--glass-bright));
```
- `--glass-bright`: `1.05`–`1.1` for light variants (lifts washed-out blur toward "frost"), `0.9`–`0.95` for dark variants (keeps blur from blowing out into gray fog).
- **Never** ship `blur()` alone without `saturate()`. Unsaturated blur is the #1 cause of the "muddy gray" anti-pattern (§6).

### 2.2 Specular Highlights

Specular highlight = a simulated directional light catching the curved "surface" of the glass. Model it as a **135°–150° linear or radial gradient** clipped to the top-left to top edge of the shape, never centered, never full-surface.

```css
/* Specular sweep — apply as a pseudo-element (::before), blend-mode screen */
background: linear-gradient(
  135deg,
  rgba(255,255,255,0.55) 0%,
  rgba(255,255,255,0.18) 18%,
  rgba(255,255,255,0.0) 42%
);
mix-blend-mode: screen;
opacity: 0.6; /* light variant */
opacity: 0.35; /* dark/navy variant — specular must be dimmer on dark glass */
```

Rules:
- Highlight must occupy **no more than the top 35% of the element's height**. A highlight that runs the full surface reads as a flat gradient overlay, not glass.
- On interactive elements (buttons), the highlight **shifts 8–12px toward the cursor/press point on `:active`** to simulate liquid response — this is the signature visionOS/iOS 26 "liquid" behavior, distinct from static 2021-era glassmorphism.
- Corner radius and highlight curvature must match: highlight gradient angle rotates with the shape's dominant corner (e.g., a pill button uses a radial highlight, not linear).

### 2.3 Inner Shadows / Refraction Borders

The border is what separates real glass from "translucent rectangle." Never use a single flat 1px border. Use a **dual-tone gradient border** (bright top-left → dim bottom-right) simulating refracted light bending through an edge:

```css
border: 1px solid transparent;
background-clip: padding-box;
position: relative;
&::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    160deg,
    rgba(255,255,255,0.85) 0%,
    rgba(255,255,255,0.25) 35%,
    rgba(255,255,255,0.05) 60%,
    rgba(255,255,255,0.35) 100%
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```
Additionally apply a **1–2px inset shadow** on the inner bottom edge (`inset 0 -1px 1px rgba(0,0,0,0.15)` on light variants; `inset 0 -1px 1px rgba(0,0,0,0.4)` on dark) to simulate the glass's own thickness catching a shadow at its base.

### 2.4 Chromatic Fringing

Real optical glass splits light slightly at edges. Simulate with a **1px RGB channel offset** on the border only (never on body text — this is a material effect, not a text effect):

```css
/* Apply only to decorative edge pseudo-elements, never to text or icons */
filter: drop-shadow(0.4px 0 0 rgba(255,0,80,0.25)) drop-shadow(-0.4px 0 0 rgba(0,180,255,0.25));
```
Use at **≤0.5px offset and ≤25% opacity**. This is a finishing detail applied only to hero/marketing-grade assets or large glass surfaces (≥240px); omit on small UI chrome (buttons, chips) where it reads as a rendering bug rather than an effect.

### 2.5 Noise / Grain Texture

Flat blur produces visible banding on gradients, especially in dark mode. Overlay a **fine monochrome noise texture** at low opacity:

```css
background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
background-blend-mode: overlay;
opacity: 0.035; /* light variant: 0.02–0.04 */
opacity: 0.06;  /* dark/navy variant: 0.05–0.08 (noise reads better against dark) */
```
`baseFrequency` between `0.65`–`0.9` yields fine "frosted" grain; below `0.5` starts looking like static/TV noise (avoid).

### 2.6 The Scrim (Legibility Layer) — MANDATORY

A scrim is a flat, semi-opaque solid fill placed *between* the blurred backdrop and any text/icon content. It is the single most important accessibility mechanism in this entire skill.

```css
--scrim-light: rgba(255, 255, 255, 0.42);  /* under text, on light glass */
--scrim-dark:  rgba(10, 12, 16, 0.46);     /* under text, on dark/navy glass */
```
Rule: scrim opacity is not fixed — it is **solved for**, using §2.7. Treat the values above as safe starting points, not final values.

### 2.7 WCAG Contrast Compliance Protocol

Because a glass panel's effective background is whatever content sits behind it, static contrast math is insufficient. Agents MUST follow this protocol:

1. Identify the **worst-case background region** the glass will sit over (brightest patch behind light-mode glass; brightest patch behind dark-mode glass, since bright content is the hardest case for dark glass too).
2. Compute effective rendered color: `effective = backdrop_color * (1 - scrim_alpha) + scrim_color * scrim_alpha`, then check text-color-vs-`effective` contrast ratio.
3. Compliance targets (never ship below AA; prefer AAA for body copy where feasible):
   - Body text: **≥ 4.5:1** (AA) / **≥ 7:1** (AAA target)
   - Large text (≥24px or ≥19px bold) & essential UI icons: **≥ 3:1** (AA) / **≥ 4.5:1** (AAA target)
4. **Remediation ladder** (apply in order until compliant — never skip straight to "add a solid box," which defeats the material):
   1. Increase scrim opacity in 4% increments.
   2. Increase `backdrop-filter` blur radius by one band (spreads out worst-case bright patches).
   3. Add `text-shadow` (light glass: `0 1px 2px rgba(0,0,0,0.25)`; dark glass: `0 1px 2px rgba(0,0,0,0.5)`).
   4. Darken/lighten the text token itself (not just size).
   5. Only as a last resort for critical-legibility contexts (form inputs, error states): raise scrim alpha above 0.6, which visually approaches a solid surface — flag this to the requester as a deliberate legibility override.
5. Always support `prefers-reduced-transparency`: when set, replace the glass background with a solid token from the same variant's `--glass-solid-fallback` (defined per-variant in §3) and drop blur/specular/noise entirely.

---

## 3. Design System Token Library (3 Variants)

Each variant below is a complete, drop-in CSS custom-property block plus box-shadow stack. Values are precise and ready to paste.

### 3.1 Variant A — Light Liquid Glass (frost, high-key refraction)

```css
:root[data-glass="light"] {
  /* Base fill */
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-bg-strong: rgba(255, 255, 255, 0.72);   /* modals / high-legibility surfaces */
  --glass-bg-subtle: rgba(255, 255, 255, 0.32);   /* large ambient panels */
  --glass-solid-fallback: #F2F3F5;                /* prefers-reduced-transparency + no-support fallback */

  /* Optical mechanics */
  --glass-blur: 24px;
  --glass-sat: 170%;
  --glass-bright: 1.08;
  --glass-noise-opacity: 0.03;

  /* Border / refraction */
  --glass-border-top: rgba(255, 255, 255, 0.9);
  --glass-border-bottom: rgba(255, 255, 255, 0.15);
  --glass-border-width: 1px;

  /* Specular */
  --glass-specular-color: rgba(255, 255, 255, 0.6);
  --glass-specular-opacity: 0.6;

  /* Scrim + text */
  --glass-scrim: rgba(255, 255, 255, 0.42);
  --glass-text-primary: #14161A;      /* ~13.2:1 vs white — AAA safe */
  --glass-text-secondary: rgba(20, 22, 26, 0.68);
  --glass-icon-fill: #1C1E22;

  /* Shadow stack (ambient + contact + inner) */
  --glass-shadow:
    0 1px 1px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(31, 38, 52, 0.10),
    0 24px 48px rgba(31, 38, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 1px rgba(0, 0, 0, 0.06);

  --glass-radius-sm: 12px;
  --glass-radius-md: 20px;
  --glass-radius-lg: 28px;
  --glass-radius-pill: 999px;
}
```

### 3.2 Variant B — Dark Liquid Glass (obsidian, subtle specular edge)

```css
:root[data-glass="dark"] {
  --glass-bg: rgba(24, 25, 28, 0.55);
  --glass-bg-strong: rgba(18, 19, 22, 0.74);
  --glass-bg-subtle: rgba(28, 29, 33, 0.34);
  --glass-solid-fallback: #0E0F11;

  --glass-blur: 26px;
  --glass-sat: 160%;
  --glass-bright: 0.92;
  --glass-noise-opacity: 0.06;

  --glass-border-top: rgba(255, 255, 255, 0.28);
  --glass-border-bottom: rgba(0, 0, 0, 0.5);
  --glass-border-width: 1px;

  --glass-specular-color: rgba(255, 255, 255, 0.35);
  --glass-specular-opacity: 0.35;

  --glass-scrim: rgba(8, 9, 11, 0.46);
  --glass-text-primary: #F5F6F7;      /* ~15.8:1 vs #18191C base — AAA safe */
  --glass-text-secondary: rgba(245, 246, 247, 0.66);
  --glass-icon-fill: #ECEDEF;

  --glass-shadow:
    0 1px 1px rgba(0, 0, 0, 0.3),
    0 8px 24px rgba(0, 0, 0, 0.45),
    0 24px 56px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 -1px 1px rgba(0, 0, 0, 0.6);

  --glass-radius-sm: 12px;
  --glass-radius-md: 20px;
  --glass-radius-lg: 28px;
  --glass-radius-pill: 999px;
}
```

### 3.3 Variant C — Navy / Deep Blue Glass (midnight undertones, cyan/ice specular)

```css
:root[data-glass="navy"] {
  --glass-bg: rgba(14, 22, 40, 0.58);
  --glass-bg-strong: rgba(10, 17, 32, 0.76);
  --glass-bg-subtle: rgba(18, 27, 48, 0.36);
  --glass-solid-fallback: #0B1220;

  --glass-blur: 28px;
  --glass-sat: 185%;                  /* higher saturation pulls out the blue undertone */
  --glass-bright: 0.95;
  --glass-noise-opacity: 0.055;

  --glass-border-top: rgba(163, 226, 255, 0.45);   /* ice-cyan rim */
  --glass-border-bottom: rgba(4, 10, 22, 0.6);
  --glass-border-width: 1px;

  --glass-specular-color: rgba(180, 232, 255, 0.5); /* cyan-white specular, not pure white */
  --glass-specular-opacity: 0.45;

  --glass-scrim: rgba(6, 12, 24, 0.48);
  --glass-text-primary: #EAF4FF;      /* ~14.6:1 vs navy base — AAA safe */
  --glass-text-secondary: rgba(234, 244, 255, 0.68);
  --glass-icon-fill: #D6ECFF;
  --glass-accent-cyan: #6FE0FF;       /* for active states, focus rings, sliders */

  --glass-shadow:
    0 1px 1px rgba(0, 0, 0, 0.35),
    0 8px 28px rgba(2, 10, 30, 0.55),
    0 28px 64px rgba(2, 8, 24, 0.55),
    inset 0 1px 0 rgba(163, 226, 255, 0.18),
    inset 0 -1px 1px rgba(0, 0, 0, 0.55);

  --glass-radius-sm: 12px;
  --glass-radius-md: 20px;
  --glass-radius-lg: 28px;
  --glass-radius-pill: 999px;
}
```

---

## 4. Web Implementation Guide

### 4.1 Core Utility Class (variant-agnostic — reads active `data-glass` scope)

```css
.glass {
  position: relative;
  background: var(--glass-bg);
  border-radius: var(--glass-radius-md);
  border: var(--glass-border-width) solid var(--glass-border-top);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat)) brightness(var(--glass-bright));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat)) brightness(var(--glass-bright));
  color: var(--glass-text-primary);
  isolation: isolate; /* contains blend-mode children */
  will-change: backdrop-filter; /* only while animating — see §4.3 */
}

.glass::before { /* specular sweep */
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, var(--glass-specular-color) 0%, transparent 42%);
  opacity: var(--glass-specular-opacity);
  mix-blend-mode: screen;
  pointer-events: none;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.glass::after { /* noise grain */
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: var(--glass-noise-opacity);
  mix-blend-mode: overlay;
  pointer-events: none;
}

.glass:active::before { transform: translate(6px, 4px) scale(1.05); } /* liquid response */

.glass__scrim {
  position: absolute;
  inset: 0;
  background: var(--glass-scrim);
  border-radius: inherit;
  z-index: -1;
}

.glass__content { position: relative; z-index: 1; }
```

### 4.2 Component Recipes

```css
/* Card */
.glass-card {
  padding: 24px;
  border-radius: var(--glass-radius-lg);
}

/* Modal overlay backdrop (behind the modal itself, dims the page) */
.glass-modal-scrim {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.glass-modal {
  background: var(--glass-bg-strong);
  border-radius: var(--glass-radius-lg);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(calc(var(--glass-blur) + 8px)) saturate(var(--glass-sat));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 8px)) saturate(var(--glass-sat));
  max-width: 520px;
  padding: 32px;
}

/* Floating navbar / dock */
.glass-navbar {
  position: fixed;
  bottom: 20px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px; padding: 10px 14px;
  border-radius: var(--glass-radius-pill);
  background: var(--glass-bg-strong);
  backdrop-filter: blur(48px) saturate(200%);
  -webkit-backdrop-filter: blur(48px) saturate(200%);
  box-shadow: var(--glass-shadow);
}

/* Button */
.glass-button {
  padding: 10px 20px;
  border-radius: var(--glass-radius-pill);
  background: var(--glass-bg);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  box-shadow: var(--glass-shadow);
  font-weight: 600;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease;
}
.glass-button:hover  { transform: translateY(-1px); }
.glass-button:active { transform: translateY(0) scale(0.98); }
```

### 4.3 Performance Guardrails

- **Composite on the GPU, not the main thread.** Apply `transform: translateZ(0)` or `will-change: transform` on elements that animate position, and only add `will-change: backdrop-filter` for the duration of an active blur animation — remove it afterward (a persistent `will-change` on many elements exhausts compositor memory and causes jank on mid-tier mobile GPUs).
- **Cap concurrent blurred layers.** Limit simultaneous `backdrop-filter` surfaces on screen to a practical ceiling (roughly 4–6 on mobile, more headroom on desktop) — each is a separate compositing pass. Nest glass-on-glass sparingly; prefer one blurred layer with elevated blur radius over stacking two.
- **Avoid animating `backdrop-filter` blur radius itself** (expensive re-sample every frame); animate `opacity` or `transform` on the specular pseudo-element instead, which is cheap.
- **Use `contain: layout paint style`** on glass containers to scope repaint boundaries.
- **Static image fallback for print/export contexts:** where blur is purely decorative and won't be interacted with, consider a pre-rendered blurred background image instead of live `backdrop-filter`.

### 4.4 Fallback Strategy (mandatory on every deliverable)

```css
/* Baseline: solid, accessible surface for browsers without backdrop-filter support */
.glass {
  background: var(--glass-solid-fallback);
}

@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .glass { background: var(--glass-bg); }
}

@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: var(--glass-solid-fallback) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  .glass::before, .glass::after { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .glass::before, .glass-button { transition: none !important; }
}
```

### 4.5 Tailwind Config (v3/v4-compatible token mapping)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      backdropBlur: { 'glass-sm': '16px', 'glass-md': '24px', 'glass-lg': '32px', 'glass-xl': '48px' },
      backdropSaturate: { 'glass-140': '1.4', 'glass-160': '1.6', 'glass-180': '1.8', 'glass-200': '2.0' },
      colors: {
        glass: {
          'light-bg': 'rgba(255,255,255,0.55)',
          'light-strong': 'rgba(255,255,255,0.72)',
          'dark-bg': 'rgba(24,25,28,0.55)',
          'dark-strong': 'rgba(18,19,22,0.74)',
          'navy-bg': 'rgba(14,22,40,0.58)',
          'navy-strong': 'rgba(10,17,32,0.76)',
          'cyan-accent': '#6FE0FF',
        },
      },
      borderRadius: { 'glass-sm': '12px', 'glass-md': '20px', 'glass-lg': '28px' },
      boxShadow: {
        'glass-light': '0 1px 1px rgba(0,0,0,0.04), 0 8px 24px rgba(31,38,52,0.10), 0 24px 48px rgba(31,38,52,0.08), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 1px rgba(0,0,0,0.06)',
        'glass-dark': '0 1px 1px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.45), 0 24px 56px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 1px rgba(0,0,0,0.6)',
        'glass-navy': '0 1px 1px rgba(0,0,0,0.35), 0 8px 28px rgba(2,10,30,0.55), 0 28px 64px rgba(2,8,24,0.55), inset 0 1px 0 rgba(163,226,255,0.18), inset 0 -1px 1px rgba(0,0,0,0.55)',
      },
    },
  },
};
```

```html
<!-- Usage example: dark variant card -->
<div class="relative rounded-glass-lg bg-glass-dark-bg backdrop-blur-glass-md backdrop-saturate-glass-160 shadow-glass-dark border border-white/20 p-6 text-[#F5F6F7]">
  <div class="absolute inset-0 rounded-glass-lg bg-black/45 -z-10"></div> <!-- scrim -->
  <p class="relative z-10">Card content</p>
</div>
```

---

## 5. Graphic & UI Design Rules (Figma / Vector / Canvas Agents)

### 5.1 Mandatory Layer Composition Order (bottom → top)

1. **Base Fill** — solid rectangle/shape, fill = variant's `--glass-bg` at full node opacity, corner radius per §3 token (`glass-radius-*`).
2. **Background Blur** — apply the native "Background Blur" effect (Figma: Effects → Background Blur) at the radius from §2.1's table for the element's role; set layer blend mode to Normal.
3. **Scrim** — a duplicate of the base shape, flat fill (no blur, no gradient) at the `--glass-scrim` value, blend mode Normal, placed directly above the blur layer and below all content/text layers. This layer is **not optional** — omitting it is the #1 cause of graphic-agent output failing contrast review.
4. **Inner Strokes (Refraction Border)** — apply an inner shadow/stroke effect: top-left edge uses the bright `--glass-border-top` color at low blur (2–4px) and low spread; bottom-right edge uses `--glass-border-bottom` at similar settings. In Figma, use two stacked "Inner shadow" effects with opposite angles (top: 135°, bottom: -45°).
5. **Specular Angle Gradient** — a shape (usually an ellipse or angled rectangle) clipped to the top 30–35% of the base shape, filled with a linear gradient from `--glass-specular-color` (0% stop) to transparent (40–45% stop), blend mode **Screen**, opacity per §2.2.
6. **Noise Overlay** — apply a fine-grain noise texture (Figma: Noise effect, or an imported turbulence PNG) across the full shape, blend mode **Overlay**, opacity 0.02–0.04 (light variant) or 0.05–0.08 (dark/navy variant).
7. **Content** — text and icon layers sit on top of all of the above, using `--glass-text-primary`/`--glass-text-secondary` tokens exclusively (never pure black on light glass or pure white on dark glass at full opacity without checking §2.7).

### 5.2 Blend Mode & Opacity Reference Table

| Layer | Blend Mode | Opacity Range |
|---|---|---|
| Base Fill | Normal | 32%–76% (per variant, see §3) |
| Scrim | Normal | 32%–60% (solved via §2.7, never below 32%) |
| Specular Gradient | Screen | 35%–60% (dimmer on dark/navy) |
| Chromatic Fringe (hero assets only) | Screen / Color Dodge | 15%–25%, ≤0.5px offset |
| Noise Grain | Overlay | 2%–8% |
| Inner Shadow (top, bright) | Normal (as effect) | 15%–90% color alpha |
| Inner Shadow (bottom, dim) | Normal (as effect) | 40%–60% color alpha |

### 5.3 Export & Flattening Rules

- When exporting a static raster (PNG/JPG) for use where live blur isn't possible, flatten all 7 layers **in the order above** before export — never flatten base + content only and add blur as a filter on the whole frame (this blurs the text too).
- For multi-resolution export (@1x/@2x/@3x), regenerate the noise layer at native resolution per scale factor rather than scaling a single noise bitmap, to avoid moiré.
- Vector deliverables (SVG) should embed the specular gradient and border as native SVG `<linearGradient>`/`<filter feGaussianBlur>` nodes so the file remains editable, rather than rasterizing them into the export.

---

## 6. Anti-Patterns & Enforcement Rules

Agents must self-audit every glass deliverable against this table before returning it. Any row matched = **failed artifact**, not a stylistic choice — apply the fix and re-render.

| Anti-Pattern (Failure State) | Diagnostic Signal | Automatic Correction Rule |
|---|---|---|
| **Muddy gray backdrop** | Blur applied without `saturate()`, or saturate < 130% | Add/raise `saturate()` to the band in §2.1; verify `--glass-bright` is set (not left at default 1.0) |
| **Unreadable typography on glass** | Contrast ratio < 4.5:1 (body) or < 3:1 (large text) measured against worst-case backdrop | Apply the remediation ladder in §2.7 in order; do not ship until compliant |
| **Flat single-layer blur ("glass-in-name-only")** | Fewer than 5 layers present (missing scrim, specular, border-gradient, or noise) | Rebuild using the full stack in §2 / §5.1 — no layer is optional except chromatic fringing on small elements |
| **Missing scrim under text** | Text/icon layer sits directly on blurred base fill with no intermediate flat layer | Insert scrim layer immediately below content, opacity per §2.7 |
| **Full-surface specular ("washed out" look)** | Highlight gradient spans >40% of element height, or is centered rather than top-anchored | Constrain highlight to top 30–35%, re-angle to 135°–150° |
| **Single flat 1px border** | Border color is one flat rgba value, not a gradient | Replace with dual-tone gradient border per §2.3 |
| **Banding on gradients / large flat blur areas** | Visible stepped color bands in the blurred region, especially in dark mode | Add noise overlay per §2.5 (raise opacity toward 0.08 for dark/navy) |
| **No fallback for unsupported browsers** | CSS deliverable lacks `@supports` block or a `--glass-solid-fallback` | Add the full fallback block from §4.4 |
| **Motion-sickness risk / ignored user preferences** | No `prefers-reduced-motion` / `prefers-reduced-transparency` handling on interactive/animated glass | Add media query blocks from §4.4 |
| **Performance regression from stacked blur** | More than ~6 simultaneous `backdrop-filter` layers on one mobile viewport, or `will-change` left permanently applied | Consolidate nested glass into a single higher-radius blur layer; scope `will-change` to active animation only |
| **Chromatic fringing on body text or small icons** | RGB-offset filter applied to a `<p>`, `<span>`, icon glyph, or any element under ~240px | Remove fringing from text/icon nodes entirely; restrict to large decorative edges only |
| **Wrong specular tint on Navy variant (pure white highlight)** | Specular gradient uses `#FFFFFF` instead of the ice-cyan token | Use `--glass-specular-color` (`rgba(180,232,255,...)`), never pure white, on Variant C |
| **Inventing a fourth/off-spec palette** | Hex values don't trace back to §3 tokens | Re-derive from the nearest variant's token block; do not freehand new base colors |

---

## 7. WebGL & JavaScript Reference Implementation (`liquid-glass-js`)

For dynamic, interactive liquid glass elements requiring live WebGL refraction, optical lens distortion, or canvas DOM background sampling, agents should reference and integrate **liquid-glass-js** (`https://github.com/dashersw/liquid-glass-js`).

### 7.1 Key Features & Architecture
- **Real-Time WebGL Refraction**: Uses WebGL 2.0 shaders for multi-layer glass physics, live optical refraction, and dynamic masking.
- **Nested Glass System**: Child elements (`Button`, sub-containers) sample and refract through their parent `Container` texture.
- **Supported Shapes**: `rounded` rectangles, `circle`, and `pill` capsule shapes.
- **Zero Heavy Dependencies**: Pure JavaScript library requiring only `html2canvas` for dynamic background DOM sampling.

### 7.2 Web Setup & Script Imports

```html
<head>
  <link rel="stylesheet" href="styles.css" />
  <link rel="stylesheet" href="glass.css" />
</head>
<body>
  <!-- Dependencies -->
  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  <script src="container.js"></script>
  <script src="button.js"></script>
</body>
```

### 7.3 API Reference & Usage Patterns

#### 7.3.1 Glass Button Component
```javascript
import { Button } from './button.js';

// Create interactive glass button with center distortion response
const button = new Button({
  text: 'Click Me!',
  size: 32,
  type: 'rounded', // Options: 'rounded' | 'circle' | 'pill'
  tintOpacity: 0.25,
  warp: true,      // Enables center distortion effect on hover/click
  onClick: (text) => console.log(`${text} activated`)
});

document.body.appendChild(button.element);
```

#### 7.3.2 Glass Container with Nested Optics
```javascript
import { Container } from './container.js';
import { Button } from './button.js';

// Parent glass container
const container = new Container({
  borderRadius: 24,
  type: 'pill',
  tintOpacity: 0.3
});

// Child glass elements (sample parent container output)
const actionBtn = new Button({ text: 'Action', size: 24, type: 'pill' });
const iconBtn = new Button({ text: '✓', size: 24, type: 'circle' });

container.addChild(actionBtn);
container.addChild(iconBtn);
document.body.appendChild(container.element);

// If DOM layout changes dynamically, trigger texture re-sampling:
container.updateSizeFromDOM();
```

### 7.4 Architectural Selection Matrix

| Use Case | Recommended Architecture | Primary Reference |
|---|---|---|
| Responsive UI layouts, web cards, floating docks, modals | **Section 4 CSS 5-Layer Stack** | Vanilla CSS / Tailwind (`backdrop-filter`) |
| Interactive WebGL lens distortion, live center warping | **Section 7 liquid-glass-js** | WebGL 2.0 / `liquid-glass-js` + `html2canvas` |
| Low GPU memory overhead & strict WCAG AAA copy | **Section 4 CSS + Scrim Layer** | CSS Tokens + WCAG Remediation (§2.7) |
| Multi-nested canvas glass controls & spatial web UI | **Section 7 liquid-glass-js** | `Container.addChild()` nested sampling |

