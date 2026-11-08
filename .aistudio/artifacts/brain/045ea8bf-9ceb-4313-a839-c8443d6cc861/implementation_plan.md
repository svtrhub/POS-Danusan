# Native Numeric Keyboard Input for Menu Quantities

Comprehensive implementation plan to introduce direct keyboard numeric quantity editing across product cards and the checkout panel, featuring OS-native number pads, auto-selection on tap, and robust cart state synchronization.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed via interactive clarification:
> - **Interaction Style**: Inline editable input replacing static quantity text with automatic text selection (`e.target.select()`) on focus for immediate one-tap overwriting.
> - **Scope**: Enabled across both **Product Cards** (main catalog grid) and **Tablet Order Panel** (iPad/desktop cart sidebar).
> - **Zero & Blank Handling**: If the user clears the input or types `0`, the item quantity resets to 0 and is cleanly removed from the active cart on blur or Enter key press.
> - **Native OS Keyboard**: Triggered using HTML5 attributes `inputMode="numeric"` and `pattern="[0-9]*"` to guarantee native number pad presentation on iOS Safari and Android Chrome without alphabet keys.

---

## 1. Overview & Core Concept

- **What It Solves**: In high-volume POS situations (e.g. customer orders 10 or 20 drinks), tapping the `+` button 20 times causes fatigue, touch latency, and accidental miscounts. Direct numeric input lets cashiers type large quantities in under a second while keeping standard single-tap increments intact.
- **Target Audience**: Community and student cashiers operating fast-paced checkout queues during events and busy rush hours.
- **Key Value**: 10x faster order entry for bulk quantities, native mobile touch ergonomics, zero layout shift, and seamless transition between tapping and typing.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Card Stepper Tap vs. Direct Numeric Entry**:
   - Single tap on the card body increments quantity by 1 (existing quick-add behavior).
   - Tapping `+` or `-` buttons increments/decrements as usual.
   - Tapping directly on the **center number** opens the OS numeric keypad immediately.
   - The entire number is auto-selected so typing `8` instantly replaces `1` with `8` without needing to press backspace.
   - Pressing `Enter` or tapping outside (blur) commits the value, triggers light haptic feedback, and updates cart totals.

2. **iPad / Desktop Cart Sidebar Direct Input**:
   - In the cart list, tapping the item quantity count focuses a compact numeric input.
   - Cashiers can quickly adjust quantities for any item in the order before taking payment.

3. **Handling Deletions & Edge Cases**:
   - Deleting the input content entirely or entering `0` removes the item from the cart on blur.
   - Non-numeric characters are blocked natively and filtered via sanitization.
   - Maximum quantity safety cap (e.g., 999) prevents accidental catastrophic typing errors.

### Visual Identity & Touch Ergonomics
- **No Layout Shift**: The inline input matches the exact dimensions, font weight, and color of the existing number display (`font-bold num text-[15px] sm:text-base text-center w-10 h-8`).
- **iOS Safari Auto-Zoom Prevention**: Set input font size to at least 16px (`text-base`) on mobile touch devices to eliminate iOS Safari's default page zoom-in gesture on input focus.
- **Native Look & Feel**: Disables browser-default spinners (`appearance-none` / `-webkit-inner-spin-button: none`) and provides a subtle active blue focus ring (`focus:ring-1 focus:ring-[#007AFF] focus:bg-white rounded-lg`).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Inline Input vs. Floating Modal Keypad
- **Chosen Approach**: Direct inline input within the existing stepper slot.
- **Why**: Zero visual clutter, no disruptive modal backdrops, and takes full advantage of the operating system's native hardware/software number pad (iOS number pad, Android Gboard numeric layout).
- **Alternative Rejected**: Custom in-app popup keypad (creates unnecessary UI layers and slows down experienced users).

### Decision 2: Input Mode Specification
- **Chosen Approach**: `<input type="text" inputMode="numeric" pattern="[0-9]*" />`.
- **Why**: Standard `type="number"` exhibits inconsistent styling, unwanted scroll-wheel increment bugs, and platform quirks on mobile browsers. `type="text"` with `inputMode="numeric"` guarantees the pure 0-9 phone/pin pad across iOS Safari and Android without desktop scroll-wheel accidents.

---

## 4. Technical Architecture & Component Changes

```
┌────────────────────────────────────────────────────────┐
│               DIRECT NUMERIC INPUT ARCHITECTURE        │
└────────────────────────────────────────────────────────┘

  [ ProductCard Stepper ]         [ TabletOrderPanel Row ]
            │                               │
            ▼                               ▼
  <input inputMode="numeric" pattern="[0-9]*" autoSelect />
            │                               │
            └───────────────┬───────────────┘
                            ▼
               onQuantityChange(productId, qty)
                            │
                            ▼
            ┌───────────────────────────────┐
            │       useOrderSession         │
            │   setQuantity(id, count)      │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   IndexedDB & SessionStorage  │
            │    Instant Cart Sync Engine   │
            └───────────────────────────────┘
```

### Files to Update
1. **`src/hooks/useOrderSession.ts`**:
   - Add `setQuantity(productId: string, quantity: number)` action.
   - Automatically cleans up cart entries when quantity reaches $\le 0$.
2. **`src/components/ProductCard.tsx`**:
   - Replace static `<span>{quantity}</span>` with controlled inline numeric input.
   - Add `inputMode="numeric"`, `pattern="[0-9]*"`, auto-selection on focus, and click stopPropagation to avoid parent card toggle.
3. **`src/components/TabletOrderPanel.tsx`**:
   - Upgrade sidebar quantity span into the matching inline numeric input with `onQuantityChange`.
4. **`src/App.tsx`**:
   - Pass `orderSession.setQuantity` down to `ProductCard` and `TabletOrderPanel`.
