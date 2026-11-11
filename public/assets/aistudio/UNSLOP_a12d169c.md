# UNSLOP: Craft-Driven UI Transformation

> Source: [github.com/heydamir/unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (@heydamir)  
> License: CC BY 4.0

Turns vibecoded, AI-looking UI into a designed interface with its own character. Finds a direction from the product itself, then fixes spacing, color, icons, copy, type, layout, details, visuals, and motion in that order.

---

## Core Philosophy

Vibecoded UI fails in predictable ways: every surface glows, every label has an emoji, spacing is whatever the model typed that day, and the copy shouts.

Unslopping fixes the craft and keeps the product:
1. **Preserve the product:** The features, content, and section order stay.
2. **Deliberate craft:** Every size, color, word, and image becomes intentional.
3. **Product-specific character:** A clean screen that could belong to any product is just another generic template. Every run ends with a screen that only this specific product could have.
4. **Richness in content, quiet in chrome:** Slop spreads color and effects over backgrounds, buttons, and borders. Craft keeps the chrome quiet and puts the richness into one or two focal moments (a rendered object, a domain chart, or a world visual).

---

## What Good Looks Like

Every finished screen shares three foundational rules:
1. **One bright element per screen:** A single moment of color or rendered product view that anchors the viewer's eye.
2. **Quiet chrome around it:** Neutral borders, matte surfaces, deliberate shades of grey or ink rather than high-contrast pure black or glowing neon.
3. **A visual made of the product's own material:** An invoice built from numbers and currency, an incident monitor drawn as an engraving, a database shown as a real query diff. No floating abstract cubes, glossy purple orbs, or glowing brain meshes.

---

## The 5-Step Process

### Step 1: Audit
Scan the code or screen for telltale signs of AI generation:
* **Color & gradients:** Purple-to-indigo gradients, glowing borders, gradient text, ambient neon backdrops, random accent colors on every card.
* **Surface & shape:** Glossy blobs, floating orbs, glassmorphism on every surface, heavy drop shadows, rounded pills where sharp rectangles or fine lines belong.
* **Typography & text:** Uppercase tracked labels, bold first words in every sentence, shouting copy (`"Supercharge your workflow today!"`), generic feature lists.
* **Decorations:** Emoji labels (`⚡️ Fast`, `🚀 Ship`), badge pills (`"New ✨"`), pulsing dots, unnecessary icons next to every list item.
* **Layout & spacing:** Random spacing (`p-3`, `p-5`, `gap-3`), cards that all look identical, centered text blocks that should be left-aligned.

### Step 2: Direction (Pause for Approval)
Propose a single design direction derived from the product itself:
* **Character:** The mood (e.g., *calm utility, precise accounting, ink-on-paper, stark technical*).
* **World:** The physical or conceptual space the product lives in.
* **Richness:** The one or two moments where color and detail will live.
* **Palette:** 3–4 specific colors (background, surface, muted text, single accent).

> **Pause:** Present your audit findings and proposed direction to the user before editing files.

### Step 3: Nine Redline Passes

#### 1. Spacing
* **4px Grid:** Everything sits on a 4px scale (`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`).
* **Grouping:** Space inside a group is smaller than space between groups.
* **Consistency:** All rows in a list share one height (`32`–`36px`) and one gap (`2`–`4px`); sibling cards share one padding (`20`–`24px`).
* **Alignment:** Icons sit in one column, labels on one line, tabular numbers right-aligned.

#### 2. Color
* **Neutral Ramps:** Build from one neutral ramp (Graphite for dashboards, Warm for paper/craft, Ink for technical/night).
* **Surfaces:** Surfaces stay neutral and must not read as standalone chromatic colors.
* **Three Text Roles:** Primary, Secondary, Muted.
* **Restrained Accent:** Use one accent color rarely in chrome (primary CTA or active selection).

#### 3. Icons
* **Line Icons:** Replace all emojis with uniform line icons from a single set (default to Lucide).
* **Metrics:** 16px or 18px size, 1.5 stroke width.
* **Color:** Icons inherit the color of their text role (secondary or muted).
* **Pruning:** Remove redundant decorative icons that add zero functional information.

#### 4. Copy
* **Headings:** Replace greeting headlines (`Welcome back, Dave!`) with the page or period title (`Overview`, `November 2026`).
* **Tone:** Remove exclamation marks, hype words (`supercharge`, `seamless`, `unlock`), and trailing periods on labels.
* **Context:** Provide references for numbers (`+12% vs last month` instead of `+12%!!`).
* **Data:** Replace fake placeholder data (`$123,456`) with realistic domain figures.

#### 5. Type
* **Scale:** Headings at weights `400`–`500` (rely on size and contrast, never `800`–`900`).
* **Casing:** Eliminate uppercase tracked labels unless used deliberately for section eyebrows.
* **Leading:** Tight line height on large headers (`1.02`–`1.08`), relaxed on body text.
* **Tabular Numbers:** Always use tabular figures for statistics, tables, and currency (`font-variant-numeric: tabular-nums`).

#### 6. Layout
* **Composition:** Break repetitive centered stacking. Use intentional asymmetric splits or text positioned above an expansive product view.
* **Breathing Room:** Give primary workflows breathing room; stack secondary items logically.
* **Rhythm:** Align visual flow with natural scanning patterns.

#### 7. Details
* **Nested Radius:** `Inner Radius = Outer Radius - Padding` (minimum 4px). Controls: `8–10px`, Cards: `12–16px`, Panels: `14–20px`.
* **Badges:** Remove glowing pills for counts and status; use quiet mono text or subtle keycaps.
* **Charts:** Muted grids with mono labels, showing 1–2 series with no rainbow bars.
* **Hairlines:** Hairline borders at 6%–10% opacity; subtle top highlights on dark cards (`inset 0 1px 0 rgba(255,255,255,0.08)`).

#### 8. Visuals
* **Anti-Tropes:** Eliminate glossy abstract blobs, floating cubes, and purple nebulas.
* **Concrete Metaphor:** If an image is needed, write the scene as one concrete sentence grounded in the product's world (e.g. *a small lighthouse on a dark rocky coast with its beam reaching into fog*).
* **Code Previews:** On app screens or when no image tool exists, build a preview in code of what the page already promises (a real diff, a scheduled slot, an invoice line).

#### 9. Motion
* **No Loops:** Strip out infinite pulsing (`animate-pulse`), breathing glows, and bouncy spring overshoots.
* **Micro-Interactions:** Functional feedback only: short hover surface transitions (`120–150ms`), micro scale-down on press, subtle entry fades.
* **Property Safety:** Animate only `transform` and `opacity` (or colors); never animate layout properties (`width`, `height`, `top`, `left`, `margin`).

### Step 4: Verify
* Core features and user workflows preserved.
* All AI clichés, purple gradients, and glowing borders eliminated.
* The screen feels custom-crafted by a human designer for this specific product.

### Step 5: Story Walkthrough (Optional)
Summarize or demonstrate the step-by-step transformation demonstrating how each pass improved the craft.

---

## Reference Palette & Token Quick-Card

### Dark Mode Neutral Ramps:
| Role | Graphite | Warm | Ink |
| :--- | :--- | :--- | :--- |
| **Deepest surface (Sidebar/Header)** | `#0f0f10` | `#12110f` | `#07080d` |
| **Page background** | `#141415` | `#161513` | `#0b0d14` |
| **Card / Surface** | `#19191b` | `#1c1a18` | `#11141c` |
| **Raised (Hover / Input / Active)** | `#232325` | `#262421` | `#1a1e28` |
| **Hairline / Border** | Primary text @ 8% | Primary text @ 8% | Primary text @ 8% |
