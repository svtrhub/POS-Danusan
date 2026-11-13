# Emil Kowalski: Design Engineering & UI Polish

> Source: [skills.sh/emilkowalski/skills/emil-design-eng](https://www.skills.sh/emilkowalski/skills/emil-design-eng)  
> Repository: [github.com/emilkowalski/skills](https://github.com/emilkowalski/skills)  
> Author: Emil Kowalski  
> License: MIT

Encodes Emil Kowalski's philosophy on micro-interactions, animation craft, component design, and the subtle invisible details that make software feel responsive, snappy, and tactile.

---

## 1. When to Animate (The Decision Framework)

Before writing any animation code, answer two gateway questions in strict order:

### Gate 1: Should this animate at all? (Frequency)
* **100+ times / day** (e.g. keyboard shortcuts, command palettes, search toggles): **No animation. Ever.** Keyboard-initiated actions repeat constantly; animations make them feel sluggish and disconnected (e.g., Raycast has zero open/close animation for this reason).
* **Tens of times / day** (frequent hover states, list navigation): **Remove or drastically reduce.**
* **Occasional** (modals, drawers, toasts, dropdowns): **Standard, brisk animation.**
* **Rare / First-time** (onboarding, success celebrations, empty state reveals): **Can add delight.**

### Gate 2: What is the purpose?
Every animation must have a clear functional justification:
* **Spatial consistency:** Toasts enter and exit from the same direction.
* **State indication:** Morphing feedback button showing a status transition.
* **Feedback:** Button scaling down on press to confirm registration.
* **Preventing jarring changes:** Smooth layout transitions so elements don't abruptly pop or snap.
> *"It looks cool"* is never an acceptable justification.

---

## 2. Timing, Duration & Curves

### Duration Rule of Thumb
Keep general UI animations **under 300ms**. A brisk 180ms dropdown feels significantly snappier and more responsive than a sluggish 400ms transition.

| Element / Interaction | Recommended Duration |
| :--- | :--- |
| **Button press feedback** | `100ms` – `160ms` |
| **Tooltips & small popovers** | `125ms` – `200ms` |
| **Dropdowns & select menus** | `150ms` – `250ms` (e.g. 180ms is ideal) |
| **Modals & slide drawers** | `200ms` – `350ms` (large drawers up to `500ms`) |

### Easing & Curves
* **Never use `ease-in` for UI entrance animations:** `ease-in` starts slow, making the interface feel unresponsive right at the instant the user's eyes are focused on the element.
* **Use custom cubic-bezier curves or snappy `ease-out`:**
  ```css
  /* Example snappy ease-out curve */
  transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
  ```

---

## 3. Component Building Principles

### Buttons: Immediate Physical Feedback
Buttons and interactive elements must provide instant physical tactile response:
* Add scale feedback on `:active`:
  ```css
  .button:active {
    transform: scale(0.97); /* Range: 0.95 to 0.98 */
    transition: transform 120ms ease-out;
  }
  ```

### Never Animate From `scale(0)`
Real-world physical objects do not pop into existence from absolute zero.
* Start scale entrances from `scale(0.95)` with an opacity fade:
  ```css
  @starting-style {
    .popover {
      opacity: 0;
      transform: scale(0.95);
    }
  }
  ```

### Origin-Aware Popovers & Menus
* Popovers, dropdown menus, and tooltips must expand organically from their **trigger button**, not from a dead center:
  ```css
  transform-origin: var(--transform-origin, top left);
  ```
* **Exception:** Modals and dialogs are not anchored to a single element; they stay centered (`transform-origin: center`).

### Smart Tooltips (Instant Subsequent Hovers)
* Tooltips must have an initial delay before appearing to avoid accidental flickering during mouse movement.
* **Subsequent Hovers:** Once a tooltip is active, moving the pointer to adjacent items/tooltips opens them **instantly with 0ms delay and no animation**.

### Shadows vs. Harsh Solid Borders
* Avoid heavy solid borders (`border: 1px solid #e5e7eb`) that make cards and popovers look blocky.
* Prefer subtle semi-transparent box-shadows or a delicate hairline border at 6%–10% opacity for organic depth.

---

## 4. Advanced Motion & Architecture

### Interruptibility & Springs
* Avoid rigid `@keyframes` that restart abruptly from zero when interrupted.
* Use spring physics or CSS transitions so that if a user dismisses a toast or presses `Escape` mid-flight, the animation seamlessly inherits velocity and reverses from its current position.

### Animate Enter States with `@starting-style`
Modern CSS eliminates JavaScript mounting hacks (like `mounted` state inside `useEffect`):
```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms ease-out, transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

@starting-style {
  .toast {
    opacity: 0;
    transform: translateY(12px);
  }
}
```

### Mask Imperfect Transitions with Blur
When crossfading content or morphing sizes feels slightly awkward despite tuning easings, apply a subtle `filter: blur(2px)` during the swap. The eye perceives a continuous transition rather than two clashing frames. Keep blurs under 10px to protect GPU performance.

### GPU-Accelerated Compositing
* Animate **only** `transform` and `opacity`.
* Avoid animating layout-heavy geometry (`width`, `height`, `top`, `left`, `margin`, `padding`), which triggers continuous browser reflows and paint recalculations.

### Reduced Motion (`prefers-reduced-motion`)
* Reduced motion means **fewer and gentler animations, not zero**.
* Drop scale and translation motion, but retain subtle opacity fades for state continuity.

---

## 5. UI Code Review Standards

When auditing, reviewing, or refactoring UI components, enforce this strict comparative Markdown table:

| Before | After | Why |
| :--- | :--- | :--- |
| `transition: all 400ms ease-in` | `transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1), opacity 180ms ease-out` | Eliminates layout thrashing, replaces slow `ease-in` with responsive custom curve, cuts duration to snappy 180ms. |
| `scale(0) -> scale(1)` | `scale(0.95) -> scale(1)` with opacity fade | Prevents cartoonish popping; real objects don't appear from zero dimensions. |
| Static button click | `transform: scale(0.97)` on `:active` | Provides immediate physical tactile feedback. |
