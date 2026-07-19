# Android UI Auto-Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app correctly adapt its layout to Android's status bar, navigation/gesture bar, and on-screen keyboard under edge-to-edge mode (Android 15+, SDK 35+, Capacitor 6+).

**Architecture:** Most of the infrastructure is already in place (`viewport-fit=cover`, CSS safe-area utility classes, keyboard offset tracking via `visualViewport`). The three remaining gaps are: (1) the Capacitor config is missing `edgeToEdge: true`, which is the prerequisite for CSS env vars to populate on Android; (2) the keyboard formula in `main.tsx` omits `vv.offsetTop`, which causes incorrect height on edge-to-edge displays; (3) `OnboardingPage` and the pre-router loading fallback in `App.tsx` are full-screen components that bypass `AppLayout`/`AppHeader` and therefore receive no status-bar padding.

**Tech Stack:** React 18, TypeScript, Capacitor 6, CSS environment variables (`env(safe-area-inset-*)`)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `capacitor.config.ts` | Modify | Add `android: { edgeToEdge: true }` |
| `src/main.tsx` | Modify | Fix keyboard formula: subtract `vv.offsetTop` |
| `src/pages/OnboardingPage.tsx` | Modify | Add `paddingTop: "env(safe-area-inset-top)"` to root div |
| `src/App.tsx` | Modify | Add `paddingTop: "env(safe-area-inset-top)"` to `loadingFallback` div |

---

## Task 1: Enable edge-to-edge in Capacitor config

**Files:**
- Modify: `capacitor.config.ts`

- [ ] **Step 1: Add `edgeToEdge` to the Android config block**

Replace the entire file content:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workouttracker.app',
  appName: 'Workout Tracker 2',
  webDir: 'dist',
  android: {
    edgeToEdge: true,
  },
};

export default config;
```

- [ ] **Step 2: Commit**

```bash
git add capacitor.config.ts
git commit -m "feat(android): enable edge-to-edge in Capacitor config"
```

---

## Task 2: Fix keyboard height formula in main.tsx

**Files:**
- Modify: `src/main.tsx:37-51`

The current formula `window.innerHeight - viewport.height` does not account for `vv.offsetTop` (the amount the visual viewport is scrolled within the layout viewport). On edge-to-edge Android this can be non-zero when the keyboard is open, causing the `--keyboard-offset` to be inflated. The correct formula matches the MOD spec: `window.innerHeight - vv.height - vv.offsetTop`.

- [ ] **Step 1: Update the keyboard offset calculation**

In `src/main.tsx`, replace the `updateKeyboardOffset` arrow function body:

Old:
```ts
  const updateKeyboardOffset = () => {
    const viewport = window.visualViewport!;
    const offset = window.innerHeight - viewport.height;
    document.documentElement.style.setProperty('--keyboard-offset', `${Math.max(0, offset)}px`);
    
    // Ensure the focused element is visible
    if (offset > 0 && document.activeElement instanceof HTMLElement) {
      document.activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };
```

New:
```ts
  const updateKeyboardOffset = () => {
    const vv = window.visualViewport!;
    const offset = window.innerHeight - vv.height - vv.offsetTop;
    document.documentElement.style.setProperty('--keyboard-offset', `${Math.max(0, offset)}px`);

    if (offset > 0 && document.activeElement instanceof HTMLElement) {
      document.activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };
```

- [ ] **Step 2: Commit**

```bash
git add src/main.tsx
git commit -m "fix(android): subtract vv.offsetTop from keyboard height calculation"
```

---

## Task 3: Add safe-area-top to OnboardingPage

**Files:**
- Modify: `src/pages/OnboardingPage.tsx:148`

`OnboardingPage` is rendered by `AppContent` before the router/`AppLayout` mounts, so it never gets the `AppHeader` (which carries `safe-area-top`). Its root div must own the top inset itself.

- [ ] **Step 1: Add inline paddingTop to the root div**

In `src/pages/OnboardingPage.tsx`, find the `return` statement's root div:

Old:
```tsx
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
```

New:
```tsx
    <div style={{ paddingTop: "env(safe-area-inset-top)" }} className="flex min-h-screen items-center justify-center bg-background p-4">
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/OnboardingPage.tsx
git commit -m "fix(android): add safe-area-inset-top to OnboardingPage root"
```

---

## Task 4: Add safe-area-top to the pre-router loading fallback

**Files:**
- Modify: `src/App.tsx:69-72`

The `loadingFallback` constant is shown by `AppContent` while `useOnboardingStatus` is loading — before either `OnboardingPage` or the router renders. It is a full-screen div with no surrounding header, so it must supply its own top inset.

- [ ] **Step 1: Add inline paddingTop to loadingFallback**

In `src/App.tsx`, find the `loadingFallback` constant:

Old:
```tsx
const loadingFallback = (
  <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
    <DetailPageSkeleton />
  </div>
);
```

New:
```tsx
const loadingFallback = (
  <div style={{ paddingTop: "env(safe-area-inset-top)" }} className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
    <DetailPageSkeleton />
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "fix(android): add safe-area-inset-top to pre-router loading fallback"
```

---

## Self-Review

### Spec coverage

| MOD requirement | Covered by |
|---|---|
| `viewport-fit=cover` in meta viewport | Already present in `index.html` — no action needed |
| `edgeToEdge: true` in `capacitor.config.ts` | Task 1 |
| `safe-area-inset-top` on full-screen components | Task 3 (OnboardingPage) + Task 4 (loading fallback); AppHeader already covers all AppLayout pages |
| `safe-area-inset-bottom` on fixed bottom bar | Already done: `MobileBottomNav` has `safe-area-bottom` class; FABs use `env(safe-area-inset-bottom)` in classnames; `body` CSS has bottom inset |
| Keyboard (`visualViewport` → CSS var) | Already done in `main.tsx`; Task 2 fixes the formula |

No gaps found.

### Placeholder scan

No TBDs, no "similar to task N" references, no empty steps.

### Type consistency

No new types introduced; all changes are string literals and JSX attributes.
