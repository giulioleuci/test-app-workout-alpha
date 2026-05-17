# Android UI Auto-Adaptation in React (Capacitor)

Generic instructions for making a React + Capacitor app correctly adapt its layout to:
- the **status bar** (top)
- the **navigation / gesture bar** (bottom)
- the **on-screen keyboard**

Tested on Pixel 7A, Android 15+, Capacitor 6+, targeting SDK 35+.

---

## Why this is needed

Android 15+ enforces **edge-to-edge** by default for apps targeting SDK 35+: the WebView fills the full screen, drawing *behind* both the status bar (top) and the navigation/gesture bar (bottom). Without explicit inset handling, content is hidden under these bars.

---

## Step 1 — Viewport meta tag

In `index.html`, the `viewport` meta must include `viewport-fit=cover`. This is required for the browser to populate the `env(safe-area-inset-*)` CSS variables.

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

---

## Step 2 — Capacitor config

In `capacitor.config.ts`, enable `edgeToEdge` for Android. Without this, Capacitor may apply its own inset adjustments that conflict with the system's edge-to-edge enforcement and leave the CSS env variables at zero.

```ts
const config: CapacitorConfig = {
  // ...
  android: {
    edgeToEdge: true,
  },
};
```

After changing this file, run `npx cap sync android` (requires Node ≥ 22) and rebuild the APK.

---

## Step 3 — Safe area insets in CSS/React

The browser exposes four CSS environment variables once `viewport-fit=cover` and `edgeToEdge: true` are in place:

```
env(safe-area-inset-top)     /* height of the status bar */
env(safe-area-inset-bottom)  /* height of the gesture/nav bar */
env(safe-area-inset-left)
env(safe-area-inset-right)
```

### Root layout wrapper

Apply `safe-area-inset-top` to the outermost element of every full-screen component (including onboarding, splash, and modal screens — not just the main app shell):

```tsx
<div style={{ paddingTop: "env(safe-area-inset-top)" }}>
  {/* page content */}
</div>
```

### Fixed bottom bar / navigation

For any element pinned to the bottom (nav bar, footer, FAB row), add the inset to the bottom padding or position:

```tsx
{/* fixed bottom bar */}
<nav
  style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
  className="fixed bottom-0 inset-x-0 ..."
/>

{/* floating element with its own offset */}
<div
  style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
  className="fixed ..."
/>
```

When an element already has a Tailwind `pb-*` class that you want to preserve, replace that class with an inline `calc()`:

```tsx
{/* was: pb-10  (= 2.5rem) */}
<footer style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }} />
```

### Checklist — screens that need this treatment

Every component that renders a full-screen layout independently needs its own insets. Common places to miss:

- Onboarding flow
- Intro / splash slides
- Loading skeletons shown before data arrives
- Auth screens
- Full-screen modals or bottom sheets

---

## Step 4 — On-screen keyboard handling

When the keyboard opens, the visible viewport shrinks. On Android with edge-to-edge there is no automatic layout resize. Use the **`visualViewport` API** to measure the difference and expose it as a CSS variable.

### Hook

```ts
// src/hooks/useKeyboardHeight.ts
import { useEffect } from "react";

export function useKeyboardHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const kbHeight = window.innerHeight - vv.height - vv.offsetTop;
      document.documentElement.style.setProperty(
        "--keyboard-height",
        `${Math.max(0, kbHeight)}px`
      );
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
}
```

Mount this hook **once** at the app root (e.g. in `App.tsx`):

```tsx
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

const App = () => {
  useKeyboardHeight();
  return ( /* ... */ );
};
```

### Using the variable in CSS / Tailwind

```css
/* push a fixed bottom bar up when the keyboard is open */
.bottom-bar {
  bottom: calc(env(safe-area-inset-bottom) + var(--keyboard-height, 0px));
}
```

Or inline in React:

```tsx
<footer
  style={{
    bottom: "calc(env(safe-area-inset-bottom) + var(--keyboard-height, 0px))",
  }}
  className="fixed inset-x-0 ..."
/>
```

### Scrollable forms

For a form that should remain fully visible when the keyboard opens, constrain its height to the visible area:

```tsx
<div
  style={{
    height: "calc(100dvh - env(safe-area-inset-top) - var(--keyboard-height, 0px))",
    overflowY: "auto",
  }}
>
  {/* form fields */}
</div>
```

---

## Summary

| Concern | Solution |
|---|---|
| Status bar (top) | `paddingTop: env(safe-area-inset-top)` on the root div of each full-screen component |
| Gesture / nav bar (bottom) | `paddingBottom` or `bottom` incorporating `env(safe-area-inset-bottom)` on fixed bottom elements |
| Keyboard | `useKeyboardHeight` hook sets `--keyboard-height` CSS var via `visualViewport`; apply it wherever bottom-anchored elements need to move up |
| Prerequisite | `viewport-fit=cover` in `<meta viewport>` + `edgeToEdge: true` in `capacitor.config.ts` |
