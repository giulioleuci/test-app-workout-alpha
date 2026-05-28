# UX/UI Improvement Report — Workout Tracker 2

**Prepared for:** Android-first deployment via Capacitor  
**Device context:** Small vertical touchscreen (~360–412 px wide), no hover, physical back gesture, system nav bar at bottom, safe-area insets top and bottom  
**Design baseline:** React 18 + Tailwind CSS + Shadcn UI (Radix primitives) + Lucide icons

---

## 0. Methodology & Scoring

Each finding is tagged with:

- **Impact** — `LOW` / `MEDIUM` / `HIGH` — user-visible benefit
- **Complexity** — `LOW` / `MEDIUM` / `HIGH` — engineering effort
- **Type** — `layout` / `interaction` / `navigation` / `visual` / `new-feature` / `restructure`

---

## 1. Global / Cross-Cutting Concerns

### 1.1 Touch Target Size — HIGH impact / LOW complexity / layout

**Problem:** Many interactive elements (icon-only buttons in cards, inline edit pencils, pagination arrows, tab labels) are rendered at 16–24 px. Android HIG requires a minimum 48 × 48 dp tap area. On a phone held one-handed, undersized targets produce mis-taps at a high rate during workouts (sweaty hands, fatigue, focus on the bar).

**Fix:** Add a global utility class `touch-target` → `min-w-[48px] min-h-[48px] flex items-center justify-center` and apply it to every icon-button. For text buttons that are narrower than 48 px tall, add `py-3` as a minimum. Audit every `<Button size="icon">` and `<Button size="sm">` instance.

**Code scope:** ~40–60 component files; mechanical find-and-replace plus a Playwright visual test.

---

### 1.2 Safe-Area Inset Consistency — HIGH impact / LOW complexity / layout

**Problem:** `safe-area-bottom` and `safe-area-top` are applied in `AppHeader` and `MobileBottomNav` but not in every floating element (FABs, RestTimer, bottom sheets). On Android devices with gesture navigation the system nav bar overlaps ~48 px of content. During an active session the FABs sit right at the bottom and are partially obscured.

**Fix:** Create CSS custom properties `--safe-top` and `--safe-bottom` (populated via Capacitor's `SafeArea` plugin or CSS `env(safe-area-inset-*)`) and enforce them in a single `AppLayout` root via `padding-top: var(--safe-top)` and `padding-bottom: var(--safe-bottom)`. Remove per-component inset hacks. Apply `bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px)` to all FABs.

**Code scope:** `AppLayout.tsx`, `MobileBottomNav.tsx`, `ActiveSession.tsx` (FABs), `RestTimer` component — 5–8 files.

---

### 1.3 Bottom Navigation — Increase Primary Actions — HIGH impact / MEDIUM complexity / navigation

**Problem:** The bottom nav has only 3 pinned items (Dashboard, Workouts, History). During a workout the user's most critical destination — the **Active Session** — is only accessible via a header badge, not the bottom nav. Users often miss this. Analytics and 1RM, both frequently used between sessions, are buried under "More".

**Fix:** Redesign the bottom nav to 4 fixed items + "More":
1. **Home** (Dashboard icon)
2. **Train** (dumbbell icon → resolves to Active Session if one is in progress, otherwise Workout List)
3. **History**
4. **Analytics**
5. **More** (remaining: 1RM, Profile, Exercises, Backup, Settings)

When a session is active, item 2 pulses with an accent dot and always deep-links to `/session/active`. Remove the header badge — the nav item replaces it.

**Code scope:** `MobileBottomNav.tsx`, `AppHeader.tsx` (remove badge), `AppLayout.tsx` navItems config — 3 files, ~80 lines.

---

### 1.4 Header Height & Wasted Vertical Space — MEDIUM impact / LOW complexity / layout

**Problem:** `AppHeader` is `h-14` (56 px) and shows only the page label plus a user-switcher icon. On a 740 px viewport (common Android mid-range) this is ~7.5 % of visible content space. The page label duplicates what the user already knows from the bottom nav active item.

**Fix:** Reduce header to `h-10` (40 px) on pages where no header actions exist (Dashboard, Analytics, History list). Replace the static text label with contextual content: on WorkoutDetail show the workout name + an overflow (`⋮`) menu; on ActiveSession show the session name + elapsed timer. On pages where the header is purely decorative (Dashboard), consider removing it entirely and moving the `UserSwitcher` to the top-right of the page content.

**Code scope:** `AppHeader.tsx`, per-page header slot logic — medium-effort API design, low rendering effort.

---

### 1.5 Page Scroll Padding — MEDIUM impact / LOW complexity / layout

**Problem:** The main content container uses `pb-20` to clear the bottom nav. On Android gesture-nav devices with a 48 px system bar, `pb-20` (80 px) is insufficient and content behind the nav is unscrollable. On large-text-size accessibility settings the last card is clipped.

**Fix:** Replace static `pb-20` with `pb-[calc(var(--bottom-nav-height,80px)+var(--safe-bottom,0px)+16px)]` everywhere it appears. Centralise this as a Tailwind arbitrary value or a utility class.

**Code scope:** ~12 page files that independently set `pb-20` or `pb-32`.

---

### 1.6 Typography Scale for Mobile — MEDIUM impact / LOW complexity / visual

**Problem:** The type scale tops out at `2xl` (24 px) for display text but many card headers use `text-sm` (14 px) or `text-xs` (12 px) for labels, values, and secondary data — very difficult to read at arm's length in a gym environment with suboptimal lighting.

**Fix:** Establish a minimum body text size of 14 px (`text-sm`) and a minimum label size of 12 px (`text-xs`). Raise card metric displays (`QuickStatsGrid`, `LoadSection`, `RPESection` values) to `text-base` (16 px) minimum with `font-semibold`. Review every component with `text-xs` and justify or upgrade it.

**Code scope:** ~25 component files. No logic changes, only class adjustments.

---

### 1.7 Loading State Granularity — MEDIUM impact / MEDIUM complexity / interaction

**Problem:** `DetailPageSkeleton` and `ListPageSkeleton` are full-page loaders. On Dexie/IndexedDB reads (typically <50 ms) the skeleton flash causes visual noise rather than meaningful feedback. On slower operations (analytics aggregation) the skeleton doesn't communicate what is loading.

**Fix:** Implement **progressive disclosure loading**:
- For list pages: show stale cached data immediately (Tanstack Query `staleTime`) and display a subtle top-of-page progress bar (`nprogress` style) only when a background refresh is happening.
- For heavy analytics: show individual section skeletons so the first available chart renders while others load.
- For near-instant operations (<100 ms): skip skeletons entirely with a `useMinLoadTime(100)` guard.

**Code scope:** Shared `useQueryWithMinTime` hook (new), modifications to `AnalyticsPage.tsx` and `Dashboard.tsx`.

---

### 1.8 Empty States — MEDIUM impact / LOW complexity / visual

**Problem:** Several pages (WorkoutList tabs, HistoryList, ExerciseList) render plain text empty messages. On first launch these are the first thing a new user sees and give no guidance on what to do.

**Fix:** Replace text-only empty states with **action-oriented empty states**: a centered illustration (SVG, can be simple), a headline, a one-line explanation, and a CTA button that opens the creation flow. Examples:
- WorkoutList empty: "No workouts yet → Create your first plan"
- HistoryList empty: "No sessions logged → Start a workout"
- ExerciseList filtered empty: "No exercises match → Clear filters"

**Code scope:** Create a shared `<EmptyState icon headline description action />` component (~30 lines), replace 6–8 text-only empties.

---

### 1.9 Haptic Feedback — HIGH impact / LOW complexity / interaction

**Problem:** No haptic feedback is used anywhere. On a Capacitor/Android app, haptics are available via `@capacitor/haptics`. Without them, set-completion confirmations, long-press selections, and destructive-action confirmations feel unresponsive and unsatisfying compared to native apps.

**Fix:** Add haptic feedback at four trigger points:
1. Completing a set (tick/complete action) → `ImpactStyle.Light`
2. Finishing the last set of an exercise → `ImpactStyle.Medium`
3. Completing the session → `NotificationType.Success`
4. Destructive confirm (delete, discard session) → `NotificationType.Warning`

Create a `useHaptics()` hook that wraps `@capacitor/haptics` with a web fallback (no-op). Inject it into `SetInputActions`, `SessionCompletionCard`, and confirmation dialogs.

**Code scope:** 1 new hook file, 4–6 call sites.

---

### 1.10 Keyboard / Input Avoidance — HIGH impact / MEDIUM complexity / interaction

**Problem:** When the software keyboard opens during set logging (entering reps/weight in `SetInputWidget`), it pushes the entire page up but does not scroll the active input into view. On some Android WebView versions the input sits behind the keyboard. `<ion-content>` or `ScrollView` with `keyboardShouldPersistTaps` is the native pattern; here we need the CSS equivalent.

**Fix:**
- Add `<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">` to `index.html` to enable the modern keyboard resize behaviour.
- Wrap the `SetInputWidget` in a `useEffect` that calls `inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })` on focus.
- Set `inputMode="decimal"` on weight inputs and `inputMode="numeric"` on rep inputs to trigger the right Android keyboard.

**Code scope:** `index.html`, `SetInputWidget.tsx`, `SetInputValues.tsx` — 3 files.

---

## 2. AppLayout & Navigation

### 2.1 "More" Sheet Navigation UX — MEDIUM impact / LOW complexity / navigation

**Problem:** The "More" sheet uses a 3-column icon grid. On a 360 px device each cell is 120 px wide, reasonable, but the sheet opens with no animation cue and the backdrop doesn't visually communicate "this is above the nav". Users occasionally tap through it.

**Fix:**
- Add a visible drag handle at the top of the sheet.
- Increase row height to 72 px (icon 28 px + label 14 px + 15 px padding each side).
- Use `side="bottom"` with `snapPoints={[0.4]}` (if upgraded to Vaul) so the sheet feels anchored.
- Add section grouping: "Training" (Analytics, 1RM) vs "Account" (Profile, Settings, Backup).

**Code scope:** `MobileBottomNav.tsx` — self-contained, ~20 lines change.

---

### 2.2 Back Navigation — MEDIUM impact / MEDIUM complexity / navigation

**Problem:** React Router's hash routing does not integrate with Android's physical/gesture back button via Capacitor. Users pressing back may exit the app unexpectedly (from Dashboard), skip expected intermediate stops (e.g., back from ActiveSession should confirm discard, not silently navigate away), or navigate to a blank state.

**Fix:**
- Use Capacitor's `App.addListener('backButton', handler)` to intercept the hardware back button.
- Per-route handlers:
  - Any modal/sheet open → close it.
  - ActiveSession page → show `DiscardSessionDialog` confirmation.
  - All other pages → `window.history.back()` with a double-tap to exit guard on Dashboard.
- Create a `useAndroidBackButton(handler)` hook and register it in layout.

**Code scope:** 1 new hook, `AppLayout.tsx`, `ActiveSession.tsx` — ~60 lines total.

---

### 2.3 Desktop Sidebar (hidden but loaded) — LOW impact / LOW complexity / layout

**Problem:** `DesktopSidebar` is rendered in the DOM on mobile (hidden via CSS `md:hidden`). It adds mount overhead and its accessibility elements (role="navigation") create a duplicate landmark.

**Fix:** Conditionally render it only above the `md` breakpoint using `useResponsive()`:
```tsx
const { isDesktop } = useResponsive();
return isDesktop ? <DesktopSidebar ... /> : null;
```

**Code scope:** `AppLayout.tsx` — 3 lines.

---

## 3. Dashboard Page

### 3.1 Card Density & Above-the-Fold Content — HIGH impact / MEDIUM complexity / layout

**Problem:** On a 740 px tall Android viewport (after header and bottom nav subtract ~104 px), only ~636 px of content is visible. The dashboard currently stacks 7 cards vertically. The first card visible on scroll is `DashboardGreeting`, which occupies the full width but has low information density. The user's primary action — starting today's planned session — is on the second card (`NextSessionSuggestionCard`), which is often partially off-screen.

**Fix:**
- Merge `DashboardGreeting` and `NextSessionSuggestionCard` into a single **Hero card** at the top. Format: user name (small, secondary), workout name (large, primary), day/date, and a full-width "Start Session" CTA button with the accent color. If no session is planned, show a motivational note + "Browse Workouts" CTA.
- Move `QuickStatsGrid` below the hero — these are reference data, not primary actions.
- Keep `LastWorkoutSummaryCard`, `TrainingCalendar`, `MuscleFreshnessList`, and `ConsistencyHeatmap` in their current order.
- On mobile, collapse `ConsistencyHeatmap` behind an "Expand" toggle by default (it is wide and requires horizontal scroll on 360 px screens).

**Impact:** Primary CTA is always visible above the fold.

**Code scope:** New `DashboardHeroCard.tsx` (~60 lines), `Dashboard.tsx` restructure — MEDIUM complexity.

---

### 3.2 Training Calendar Horizontal Scroll — MEDIUM impact / LOW complexity / layout

**Problem:** `TrainingCalendar` renders a full month calendar grid. On a 360 px screen each day cell is ~46 px, which is functional but the grid is very dense and the selected-day highlight is hard to distinguish.

**Fix:**
- Switch from a 7-column month grid to a **horizontal week strip**: show the current 7 days as a scrollable row of day pills (Mon–Sun), each 48 px wide × 60 px tall showing the day abbreviation, date number, and a colored dot if a session was logged. Tapping a day reveals a session chip below the strip.
- Keep a "Full Calendar" button that opens the existing monthly view as a bottom sheet for users who want historical browsing.

**Code scope:** `TrainingCalendar.tsx` — full rewrite of the visual, data hooks remain unchanged. MEDIUM complexity.

---

### 3.3 Muscle Freshness List Visibility — MEDIUM impact / LOW complexity / layout

**Problem:** `MuscleFreshnessList` is in the right column on desktop and at the bottom on mobile, making it easy to miss. For strength training users this is genuinely important session-planning data.

**Fix:** Place it directly below the Hero card as a horizontally scrolling row of muscle chips (each showing the muscle name and a recovery-level color — green/yellow/red). This is a compact, scannable format that fits naturally in a single row.

**Code scope:** `MuscleFreshnessList.tsx` — layout change only, data logic unchanged.

---

### 3.4 PendingSessionDialog — Convert to Bottom Sheet — MEDIUM impact / LOW complexity / restructure

**Problem:** `PendingSessionDialog` is a centered modal dialog. On mobile, centered dialogs require the user to tap in the middle/top of the screen which is ergonomically awkward (thumb zone is the bottom third). The dialog is also triggered on page load which can feel jarring.

**Fix:** Convert to a bottom sheet (`SheetContent side="bottom"`) that slides up from the bottom nav. Add a brief delay (300 ms after mount) so it doesn't appear mid-transition. Use large touch targets: "Resume" and "Discard" as full-width buttons inside the sheet.

**Code scope:** `PendingSessionDialog.tsx` — replace Dialog with Sheet wrapper, ~20 lines.

---

## 4. Workout List Page

### 4.1 Tab Bar Usability — MEDIUM impact / LOW complexity / interaction

**Problem:** The 3-tab bar (Workouts, Archived, Templates) uses `grid-cols-3` which makes each tab label ~120 px wide at 360 px. The labels are compact but the Shadcn tab styling uses a thin underline indicator that is difficult to perceive quickly.

**Fix:**
- Rename tabs to be verb-oriented: **"Plans"**, **"Templates"**, **"Archive"**.
- Use a pill/capsule tab indicator (filled background on active tab) instead of underline — this is far more legible in high-ambient-light gym environments.
- Add badge counts: "Plans (3)", "Templates (7)".

**Code scope:** `WorkoutList.tsx` — 10–15 lines, purely visual.

---

### 4.2 Sort and Filter Controls — MEDIUM impact / LOW complexity / interaction

**Problem:** The sort dropdown is a `<Select>` element at the top of the page. On Android, Radix Select triggers a native picker in some WebView contexts, which looks inconsistent. More critically, filters (muscle group, equipment) are not accessible from this page at all — users cannot filter their workout list.

**Fix:**
- Replace the sort select with a horizontally scrolling row of filter chips below the tab bar: "A-Z", "Recent", "Updated", "+ Equipment", "+ Muscle". Chips toggle sort/filter state.
- This removes a visual layer (dropdown) in favour of always-visible state.

**Code scope:** `WorkoutList.tsx`, new `SortFilterChips.tsx` component — MEDIUM complexity.

---

### 4.3 WorkoutCard Actions — HIGH impact / MEDIUM complexity / interaction

**Problem:** `WorkoutCard` supports 7+ actions (activate, deactivate, archive, restore, delete, start session, volume analysis). On mobile these are currently in an overflow menu (`⋮`). Overflow menus have two problems on Android: they require two taps (open menu, then tap action) and the menu items are small targets.

**Fix:**
- Move the **primary action** (Start Session / Continue) to a full-width button at the bottom of the card — always visible, large tap target.
- Move **secondary actions** (Volume Analysis) to a secondary outline button alongside the primary.
- Move **destructive/management actions** (archive, delete) to a **long-press context menu** (use Radix `ContextMenu` or a custom 300 ms `onLongPress` handler that opens a bottom sheet with those options only). This matches the Android native pattern (long-press in Files, Photos, etc.).

**Code scope:** `WorkoutCard.tsx`, shared `useLongPress.ts` hook — MEDIUM complexity.

---

### 4.4 FAB Positioning Conflict with Bottom Nav — HIGH impact / LOW complexity / layout

**Problem:** The "Create Workout" FAB is `fixed bottom-6 right-6`. With a 64 px bottom nav and possible system bar beneath it, the FAB sits at ~130 px from the physical bottom of the screen but only ~16 px above the nav visually, causing overlap on some devices.

**Fix:** Position FAB at `bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px)` consistently. As a rule, all FABs must use this formula.

**Code scope:** `WorkoutList.tsx` + every other page with a FAB — 5–6 files, trivial change.

---

## 5. Workout Create Page

### 5.1 Convert from Page to Bottom Sheet — HIGH impact / MEDIUM complexity / restructure

**Problem:** `WorkoutCreate.tsx` is a full page with a form containing 4 fields (name, objective, work type, notes). Navigating to a new route for a simple creation form means a full page transition (visual overhead) and a back-button interaction to cancel. On mobile, short forms work better as bottom sheets that lift over the list they're adding to.

**Fix:** Convert `WorkoutCreate` from a routed page to a **bottom sheet** launched from the FAB in `WorkoutList`. The sheet contains the same form fields. On submit, close the sheet, navigate to the new `WorkoutDetail` page. Remove the `/workouts/new` route.

**Code scope:** Extract form to `CreateWorkoutSheet.tsx`, modify `WorkoutList.tsx`, update router — MEDIUM complexity, some routing logic change.

---

### 5.2 Notes Field Position — LOW impact / LOW complexity / layout

**Problem:** The Notes field is full-width and the last field in the form, which means the keyboard covers it when focused on Android (keyboard pushes content up, but scrollIntoView may not fire). It is also optional metadata unlikely to be filled during workout creation.

**Fix:** Move Notes behind an "Add notes (optional)" collapsible toggle using Shadcn `Collapsible`. The field expands below the toggle when tapped. This keeps the form shorter by default.

**Code scope:** `WorkoutCreate.tsx` (or its sheet replacement) — ~10 lines.

---

## 6. Workout Detail Page

### 6.1 Session Reordering UX — HIGH impact / HIGH complexity / interaction

**Problem:** Sessions within a workout are presumably LexoRank-ordered and reorderable via drag-and-drop. On a phone, drag-and-drop with a `@dnd-kit` sortable list requires a long-press to activate drag, which conflicts with card tap actions and is generally unreliable in a scrolling container on WebView.

**Fix:** Add an explicit **reorder mode** toggle (a "Reorder" button in the header overflow menu). When active:
- Cards show a drag handle (`GripVertical` icon) on the left, 48 px tall.
- The normal card tap actions are disabled.
- A "Done" button confirms the reorder.
- Implement with `@dnd-kit/sortable` using `DragHandle` activator (which avoids the scroll-vs-drag conflict).

**Code scope:** `WorkoutDetail.tsx` and session card components — HIGH complexity, new interaction pattern.

---

### 6.2 Unsaved Changes Bar — MEDIUM impact / LOW complexity / interaction

**Problem:** `UnsavedChangesBar` appears at the top of the page when there are unsaved changes. On mobile, top banners are easy to miss (users look at the content they're editing, not the top of the page). The bar also competes with `AppHeader`.

**Fix:** Move the unsaved-changes indicator to a **sticky bottom bar** (above the bottom nav, below the content). Use the same pattern as mobile browser address bars — it collapses to a thin accent line at rest and expands to a full action bar when the user pauses scrolling. Include "Save" and "Discard" buttons at bottom-thumb-zone level.

**Code scope:** `UnsavedChangesBar.tsx` + its usage in `WorkoutDetail.tsx` — MEDIUM complexity.

---

### 6.3 Volume Analysis Dialog — Convert to Dedicated Tab — MEDIUM impact / MEDIUM complexity / restructure

**Problem:** `VolumeAnalysisDialog` and `SessionVolumeDialog` are modal overlays that contain substantial analytics content (charts, breakdowns by muscle group). Modal dialogs are a poor container for content that benefits from scrolling and referencing while the user thinks — users can't easily scroll back to the workout sessions below.

**Fix:** Add a **"Volume" tab** to `WorkoutDetail` (alongside sessions list) that shows the volume analysis inline on the page. Remove the dialog. The `SessionVolumeDialog` triggered from `SessionDetail` could remain as a sheet (it is smaller), but the workout-level analysis should be a tab.

**Code scope:** `WorkoutDetail.tsx`, `SessionVolumeAnalysis.tsx`, routing — MEDIUM complexity.

---

### 6.4 Merge EditWorkoutDialog and EditSessionPropertiesDialog — LOW impact / LOW complexity / restructure

**Problem:** Workout metadata (name, objective, notes) and session metadata (name, day, notes) are edited in separate dialogs launched from different `⋮` menus. The patterns are identical. Two separate dialog implementations means duplicate code and inconsistent UX.

**Fix:** Create a single `EditPropertiesSheet.tsx` that accepts a `schema` prop (array of field definitions) and renders a generic form. Both edit flows use the same component.

**Code scope:** New shared component, replaces 2 dialog files — LOW-MEDIUM complexity refactor.

---

## 7. Session Detail Page (Planned Session)

### 7.1 Exercise Group Card Density — MEDIUM impact / LOW complexity / layout

**Problem:** `ExerciseGroupCard` in planned sessions shows a lot of data per card (exercise name, sets, reps, load range, RPE, warmup indicator). On mobile the card becomes very tall and the user must scroll extensively through a 10-exercise session.

**Fix:**
- **Collapsed default view**: Show only the exercise name, set summary (e.g., "4 × 6–8 @ 7–8 RPE"), and a right-chevron icon. Tap to expand the full detail.
- Use Shadcn `Collapsible` so only one exercise is expanded at a time (accordion behaviour optional via `type="single"` in a parent `Accordion`).
- Editing actions (edit sets, delete exercise) appear only in the expanded state.

**Code scope:** `ExerciseGroupCard.tsx` and `SessionDetail.tsx` — MEDIUM complexity.

---

### 7.2 Muscle Overlap Matrix — Convert to Sheet — MEDIUM impact / LOW complexity / restructure

**Problem:** `MuscleOverlapMatrix` is an inline section on `SessionDetail`. It is a complex data visualization that most users rarely consult when editing a session. It takes up significant vertical space and pushes the editable exercise list down.

**Fix:** Move the Muscle Overlap Matrix behind a "Muscle Overlap" button/chip in the session header that opens a **bottom sheet**. The matrix can be rendered at full width in the sheet without spatial compromise.

**Code scope:** `SessionDetail.tsx`, `MuscleOverlapMatrix.tsx` wrapper — LOW complexity, component is already isolated.

---

## 8. Active Session Page

### 8.1 SetInputWidget — Core Interaction Quality — HIGH impact / HIGH complexity / interaction

**Problem:** The `SetInputWidget` is the most used UI element in the entire app. Current issues for a phone mid-rep:
1. Inputs are standard HTML text fields — on Android they trigger a full keyboard that covers the widget.
2. Increment/decrement arrows for weight are presumably small (icon buttons).
3. No swipe-to-complete gesture.
4. Completing a set requires tapping a button and potentially confirming — too many taps during a workout.

**Fix:**
- Replace keyboard-based weight input with a **number wheel / drum roller** (custom component or `react-mobile-picker` style) for increments, with a direct-edit mode triggered by tapping the number. This avoids keyboard for the common case (+2.5 kg increment).
- Add **+5 / -5 / +2.5 / -2.5 increment buttons** arranged as a 2-row pad directly below the weight display. Configurable per user preference.
- Add **swipe-right-to-complete** gesture on the set row: a short swipe reveals a green "Done" confirmation affordance; full swipe completes the set. Use `react-swipeable` or a custom `useDrag`.
- Mark as complete with a single large tap on a checkmark button, minimum 56 × 56 px.

**Code scope:** `SetInputWidget.tsx`, `SetInputValues.tsx`, `SetInputActions.tsx`, new `WeightDrumRoller.tsx` — HIGH complexity, core feature.

---

### 8.2 Rest Timer Visibility — HIGH impact / LOW complexity / interaction

**Problem:** `RestTimer` is a floating component but its z-index and position interact badly with FABs. When the rest timer is active and the user scrolls the session, the timer may be occluded or confusingly positioned relative to the exercise being timed.

**Fix:**
- When a rest timer is active, display a **persistent banner** directly below the `AppHeader` (not floating). The banner shows: exercise name, countdown in large text, a stop button, and a thin progress bar. Height: 52 px.
- This keeps the timer always visible regardless of scroll position and removes the z-index conflict.
- The current floating timer can remain as a fallback for desktop.

**Code scope:** `RestTimer.tsx` + layout integration in `AppLayout.tsx` / `ActiveSession.tsx` — MEDIUM complexity.

---

### 8.3 Exercise Group Accordion — Improve Visual Hierarchy — MEDIUM impact / MEDIUM complexity / layout

**Problem:** `UpcomingExercisesAccordion` and `CompletedExercisesAccordion` create a two-tier structure: sections (upcoming / completed) then exercise groups inside. When the user is mid-workout, the "current" exercise group is contextually the most important thing on screen, but it does not have a clear visual primary position.

**Fix:**
- Remove the accordion wrapper for the **currently active group** — it is always visible at the top of the content area, full-width, with an accent-colored left border or top bar indicating it is the active exercise.
- Completed exercises collapse into a single line "N exercises completed ✓" summary at the bottom (tappable to expand list for review).
- Upcoming exercises remain in a collapsible section below the active group.
- This reduces cognitive load: the user sees one thing at a time (current exercise) with context available on demand.

**Code scope:** `ActiveSession.tsx`, `ExerciseGroupRenderer.tsx` — MEDIUM complexity, structural change.

---

### 8.4 FABs During Active Session — HIGH impact / LOW complexity / layout

**Problem:** The session page has at least 2 FABs (Quick Add and Save/Finish). Two FABs in the same corner compete visually and the lower one is easily occluded by the system nav bar (see §1.2). The "Save/Finish" FAB is a critical action but is not visually differentiated from a secondary action.

**Fix:**
- Replace the dual-FAB pattern with a **persistent bottom action bar** (not a FAB):
  - Left: "Quick Add" icon button (compact, secondary style)
  - Center: Exercise name chip (tappable to show set history)
  - Right: Large "Log Set" / "Finish" button (primary, full accent, 48 px tall)
- This bar sits above the bottom nav and provides consistent access to the two most common actions.

**Code scope:** `ActiveSession.tsx`, remove FABs, add `SessionActionBar.tsx` — MEDIUM complexity.

---

### 8.5 Load Suggestion Dialog — Convert to Inline Card — MEDIUM impact / MEDIUM complexity / restructure

**Problem:** `LoadSuggestionDialog` is a dialog that interrupts the session flow. The user is mid-workout and has to dismiss a dialog to continue.

**Fix:** Convert to an **inline suggestion card** that appears above the `SetInputWidget` for the first set of an exercise. It shows: suggested weight, basis (e.g., "Based on last session: 80 kg × 5 @ RPE 7"), and two actions: "Use this" (fills the input) and "Dismiss". No dialog — the card slides in from the top and auto-dismisses when the user starts editing the input.

**Code scope:** `LoadSuggestionDialog.tsx` → `LoadSuggestionCard.tsx`, usage in session group components — MEDIUM complexity.

---

### 8.6 Warmup Calculator — Sheet Sizing — LOW impact / LOW complexity / layout

**Problem:** `WarmupCalculator` opens as a centered dialog on mobile. It contains a list of warmup sets (typically 4–6 rows). On a 360 px device the dialog can fill most of the screen but still feels cramped.

**Fix:** Convert to a `side="bottom"` sheet with `snapPoints` at 50% and 90%. At 50% the user sees the warmup list; dragging up reveals any additional configuration options.

**Code scope:** `WarmupCalculator.tsx` — swap Dialog for Sheet, ~15 lines.

---

### 8.7 SwapExerciseSheet — Exercise Picker Interaction — MEDIUM impact / LOW complexity / interaction

**Problem:** `SwapExerciseSheet` uses `height: '85vh'` which on some devices leaves only a sliver of background visible — enough to look like a full-screen view but not a modal. The "current exercise is pre-selected" context is not surfaced visually.

**Fix:**
- Use `height: '92vh'` with a drag handle.
- Add a header chip showing the current exercise name with a "→ Replace" label so the user knows the context.
- Add **recently used** exercises as a fast-access row at the top of the picker (above search) so the common case of swapping to a similar exercise is one tap.

**Code scope:** `SwapExerciseSheet.tsx`, `ExercisePicker.tsx` (add recent section) — LOW-MEDIUM complexity.

---

### 8.8 UnresolvedSetsDialog — Improve Decision UX — MEDIUM impact / LOW complexity / interaction

**Problem:** `UnresolvedSetsDialog` appears at session end for incomplete sets. It is a modal blocking completion. Users are often eager to finish and may dismiss this without understanding which sets are incomplete.

**Fix:**
- Show a **summary list** of unresolved sets (exercise name, set number, what was expected).
- Three clear actions: "Complete all as failed", "Keep and skip", "Go back to log".
- Use a bottom sheet so the user can see the session content behind it for reference.

**Code scope:** `UnresolvedSetsDialog.tsx` — UI enhancement, logic unchanged — LOW complexity.

---

### 8.9 QuickAddSheet — Step Indicator — LOW impact / LOW complexity / interaction

**Problem:** The 3-step wizard in `QuickAddSheet` has no visual step indicator. Users don't know how many steps remain.

**Fix:** Add a step dot indicator (3 dots, active one filled) in the sheet header. Steps: "Type → Exercise → Confirm".

**Code scope:** `QuickAddSheet.tsx` — ~10 lines, purely additive.

---

### 8.10 In-Session Exercise History (ExerciseInfoModal) — MEDIUM impact / LOW complexity / restructure

**Problem:** `ExerciseInfoModal` opens as a centered modal, which on mobile means the user sees history data but loses visual context of where they are in the session.

**Fix:** Convert to a `side="bottom"` sheet with a compact initial snap height (~45%). The user can pull up to see more history. The drag handle makes it feel like a "peek" into history rather than a blocking modal.

**Code scope:** `ExerciseInfoModal.tsx` — swap Dialog for Sheet — LOW complexity.

---

## 9. Exercise List Page

### 9.1 Filter Controls — HIGH impact / MEDIUM complexity / interaction

**Problem:** Filters (equipment, muscle, movement pattern) are likely in a filter dialog or a top filter row. On mobile, filter dialogs require navigating away from the results. Multi-filter states are hard to communicate.

**Fix:**
- Show active filters as dismissible chips directly below the search bar.
- "Filter" button opens a **bottom sheet** with checkboxes grouped by category (Equipment, Primary Muscle, Movement Pattern). The sheet has a "Show X results" confirmation button at the bottom.
- The search bar should be **sticky** (does not scroll away) — critical for a library of 100+ exercises.

**Code scope:** `ExerciseList.tsx`, `ExerciseForm.tsx` filter logic, new `FilterSheet.tsx` — MEDIUM complexity.

---

### 9.2 Alphabet Jump List — MEDIUM impact / MEDIUM complexity / new-feature

**Problem:** On a large exercise library (50+ exercises), pagination forces the user to page through to find an exercise alphabetically. Alphabet jump-lists are a standard Android pattern (Contacts app).

**Fix:** Add a right-edge alphabet scrubber: a vertical strip of letter labels (A–Z) 16 px wide. Touching and dragging scrolls the list to that letter group. Exercises are grouped by first letter with a sticky section header.

**Code scope:** `ExerciseList.tsx`, new `AlphabetJumpList.tsx` — MEDIUM complexity, requires virtualized list if library is large.

---

### 9.3 ExerciseForm — Move to Bottom Sheet — MEDIUM impact / LOW complexity / restructure

**Problem:** Creating/editing an exercise launches a dialog or opens `ExerciseForm` in a modal. The form has many fields (name, muscles, equipment, movement pattern, variants). A dialog is the wrong container — it is too small for this content and requires heavy scrolling.

**Fix:** Use a full-screen bottom sheet (100% height, `side="bottom"`, no backdrop close) for `ExerciseForm`. This gives the form full viewport height, makes it feel like a focused task, and allows the user to see all fields without excessive scrolling. Add a sticky "Save" button at the bottom of the sheet.

**Code scope:** `ExerciseList.tsx` (trigger), `ExerciseForm.tsx` (wrapper change) — LOW complexity.

---

## 10. History List Page

### 10.1 Date Grouping — MEDIUM impact / LOW complexity / visual

**Problem:** `HistoryList` is a flat paginated list of `HistorySessionCard` items. There is no date grouping, so users scanning for "last Tuesday's workout" must read timestamps on each card.

**Fix:** Group sessions by date heading (sticky section headers): "Today", "Yesterday", "May 26", etc. Each section header is a small secondary-text label above its group. Pagination loads more date groups at the bottom.

**Code scope:** `HistoryList.tsx` — date grouping logic + section header component — LOW complexity.

---

### 10.2 Swipe-to-Delete — MEDIUM impact / MEDIUM complexity / interaction

**Problem:** Deleting a session requires tapping into a card, finding a delete option, and confirming. This is a multi-step flow for a single action that Android users expect via swipe.

**Fix:** Add swipe-left on `HistorySessionCard` to reveal a red "Delete" action. Use `react-swipeable` with a 60 px threshold. Confirm with a bottom sheet ("Delete this session? This cannot be undone.") to prevent accidental deletion.

**Code scope:** `HistorySessionCard.tsx`, new `SwipeableCard.tsx` wrapper — MEDIUM complexity.

---

### 10.3 CSV Export — Move to Overflow Menu — LOW impact / LOW complexity / interaction

**Problem:** `HistoryCsvToolbar` occupies space in the main toolbar of the history list. Export is a rare action but it visually clutters the toolbar.

**Fix:** Move all CSV export/import actions to the header's overflow (⋮) menu. Free up the toolbar space for a search/filter control.

**Code scope:** `HistoryList.tsx`, `HistoryCsvToolbar.tsx` — LOW complexity.

---

## 11. History Detail Page

### 11.1 Metric Cards Layout — MEDIUM impact / LOW complexity / layout

**Problem:** A completed session detail page shows analytics, volume data, and set-by-set breakdowns. On mobile this is a very long scroll. The top metrics (total volume, duration, tonnage) are likely small cards that get lost.

**Fix:**
- Feature the top 3 metrics (total volume, duration, average RPE) as a **hero stat strip** at the top of the page — 3 columns, large numbers, secondary labels below each. Full width, visually prominent.
- Move the set-by-set breakdown into a collapsible `Accordion` per exercise, defaulting to collapsed.
- Add a sticky "Share" / "Export" button in the header right slot for sharing a session summary.

**Code scope:** `HistoryDetail.tsx` — restructure layout — MEDIUM complexity.

---

### 11.2 PerformanceTrendIndicator Placement — LOW impact / LOW complexity / layout

**Problem:** `PerformanceTrendIndicator` (showing progression/plateau/overreaching) is a sophisticated metric that is poorly placed if it appears inline in the session detail — users may not understand what it refers to without context.

**Fix:** Place it immediately below the hero stat strip with a brief contextual label: "Compared to your last 4 sessions of [exercise/workout name]". Add a `(?)` info icon that opens a tooltip sheet explaining the metric.

**Code scope:** `HistoryDetail.tsx` — layout and tooltip — LOW complexity.

---

## 12. Analytics Page

### 12.1 Tab Navigation for Analytics — MEDIUM impact / LOW complexity / navigation

**Problem:** The analytics page has 4 tabs (Volume, Load, RPE, Compliance). On mobile, 4 tabs in a `grid-cols-4` layout give each tab ~85 px on a 360 px screen — labels are truncated. Switching tabs triggers full section remounts.

**Fix:**
- Use a **horizontally scrollable tab list** (no grid, just `flex overflow-x-auto`) so each tab has natural width. Add a subtle right-shadow fade to hint at scrollability.
- Alternatively, use a **segmented control** (pill style) showing only 3 tabs at a time with a scrollable overflow.
- Persist tab scroll position so returning to a tab does not reset the user's scroll.

**Code scope:** `AnalyticsPage.tsx` — tab wrapper styling — LOW complexity.

---

### 12.2 Filter Controls — Persistent Filter Summary — MEDIUM impact / LOW complexity / interaction

**Problem:** `AnalyticsFilters` controls (date range, exercise selection) are placed at the top of the page. When the user scrolls down into charts, the filter controls disappear and the user loses context of what date range they're viewing.

**Fix:**
- Make the filter summary **sticky** below the tab bar: a small chip row showing active filters ("Last 90 days · Squat"). Tapping a chip opens the filter sheet to modify it.
- The full `AnalyticsFilters` control opens as a bottom sheet from a "Filter" icon in the header.

**Code scope:** `AnalyticsPage.tsx`, `AnalyticsFilters.tsx` — MEDIUM complexity.

---

### 12.3 Charts on Mobile — Horizontal Scroll / Zoom — HIGH impact / MEDIUM complexity / interaction

**Problem:** Time-series charts (Volume over time, Load over time) have a fixed width constrained to the container. On a 360 px viewport with 90 days of data, individual data points are ~4 px apart — unreadable and un-tappable. No zoom or pan is available.

**Fix:**
- Render charts with a **minimum width of 600 px** inside a `overflow-x-auto` scroll container. This naturally shows ~2 months of data at once and lets the user scroll to explore history.
- Add pinch-to-zoom using the chart library's built-in support (if using Recharts: `<Brush />` component; if using Chart.js: `chartjs-plugin-zoom`).
- Show the exact data value in a **tooltip that snaps to the nearest day** on touch — use `activeDot` with large radius on Recharts.

**Code scope:** Chart-rendering sections within `VolumeSection.tsx`, `LoadSection.tsx`, `RPESection.tsx` — MEDIUM complexity.

---

### 12.4 TheoreticalPerformanceMatrix — Simplify for Mobile — MEDIUM impact / LOW complexity / layout

**Problem:** `TheoreticalPerformanceMatrix` projects estimated 1RM across rep ranges. This is likely a table with many columns. On a 360 px screen a wide table requires horizontal scroll with no affordance, and column headers disappear when scrolled.

**Fix:**
- Replace the table with a **stacked card list**: one card per rep range (1RM, 3RM, 5RM, 8RM, 10RM), each showing the exercise name and estimated weight prominently.
- Or, keep the table but freeze the first column (exercise name) with `sticky left-0` and allow the numeric columns to scroll.

**Code scope:** `TheoreticalPerformanceMatrix.tsx` — layout-only change — LOW complexity.

---

### 12.5 IntensityCalculator — Keep as Dialog, Improve Inputs — LOW impact / LOW complexity / interaction

**Problem:** `IntensityCalculator` as a dialog is appropriate (it is a tool, not content). However, numeric inputs for load/percentage have the same keyboard issues as `SetInputWidget`.

**Fix:** Use `inputMode="decimal"` on all numeric inputs and add quick-select percentage chips (50%, 60%, 70%, 80%, 85%, 90%, 95%) that populate the field.

**Code scope:** `IntensityCalculator.tsx` — LOW complexity, additive.

---

## 13. One Rep Max Page

### 13.1 Page Density — MEDIUM impact / LOW complexity / layout

**Problem:** `OneRepMaxPage` shows exercises with 1RM estimates and charts. On mobile it likely requires heavy scrolling through a list of exercises before reaching the chart for a specific exercise.

**Fix:**
- Add an **exercise search/filter bar** at the top (same pattern as ExerciseList).
- Show exercises in a compact list with just the name and current 1RM estimate in a single row. Tapping opens an **expanded detail view** (as a push navigation or bottom sheet) showing the trend chart and historical records.
- Feature the user's **top 5 lifts** (by 1RM) as a card strip at the top without requiring scroll.

**Code scope:** `OneRepMaxPage.tsx`, `OneRepMaxRecordDialog.tsx` — MEDIUM complexity.

---

### 13.2 Merge 1RM into Analytics Page — MEDIUM impact / MEDIUM complexity / restructure

**Problem:** Having both an `AnalyticsPage` and a separate `OneRepMaxPage` splits the user's mental model of "how am I progressing?". Users navigate between two pages for the same high-level question. The bottom nav "More" menu has limited space and 1RM is sometimes hidden under `simpleMode`.

**Fix:** Move `OneRepMaxPage` content into a 5th tab ("Strength") within `AnalyticsPage`. The tab shows the 1RM tracker, strength-to-weight correlation (currently in analytics), and the theoretical performance matrix. Remove the `/1rm` route and the 1RM nav item.

**Code scope:** `AnalyticsPage.tsx` (add tab), `OneRepMaxPage.tsx` (convert to section component), router changes, nav config — MEDIUM complexity.

---

## 14. Profile Page

### 14.1 Body Weight Tracking — Improve Logging UX — MEDIUM impact / LOW complexity / interaction

**Problem:** `WeightEditDialog` is a dialog for logging body weight. It is accessible from the profile page. Users who weigh themselves daily (common for serious lifters) should be able to log weight with minimal friction.

**Fix:**
- Add a **"Log weight today"** chip/button directly on the Dashboard if no weight has been logged today. One tap opens a bottom sheet with a large number display and +/- increment buttons (0.1 kg steps). Two taps (open + confirm) to log.
- On the Profile page, show the body weight chart as the primary visual, not buried below other settings.

**Code scope:** `Dashboard.tsx` (weight chip), `WeightEditDialog.tsx` (convert to bottom sheet), `ProfilePage.tsx` — LOW-MEDIUM complexity.

---

### 14.2 Profile Page Structure — LOW impact / LOW complexity / layout

**Problem:** `ProfilePage` likely mixes personal data (weight history, user name) with settings-like content (units, preferences). This creates an unclear mental model.

**Fix:** Split into two clearly labeled sections using a 2-tab or section-header layout:
- **"Me"**: Name, avatar/initials, weight tracking, body stats.
- **"Preferences"**: Units, default settings, intensity preferences.

Keep both on the same page — just visually distinguish them with section headers.

**Code scope:** `ProfilePage.tsx` — structural reorganization, LOW complexity.

---

## 15. Settings Page

### 15.1 Danger Zone Placement — HIGH impact / LOW complexity / interaction

**Problem:** "Danger Zone" (delete account, wipe data) is in the Settings page, likely at the bottom of the scroll. On mobile, destructive actions at the bottom of a long scroll are accessible by accident (e.g., momentum scroll + mis-tap).

**Fix:**
- Move Danger Zone to a **separate sub-page**: "Settings → Advanced → Danger Zone". This adds one navigation step (intentional friction) before the user can access destructive actions.
- Each destructive action requires typing a confirmation phrase (e.g., the user's name) before the confirm button activates — standard pattern for irreversible actions.

**Code scope:** `SettingsPage.tsx`, new `DangerZonePage.tsx` sub-route — LOW complexity.

---

### 15.2 Settings Groups — MEDIUM impact / LOW complexity / visual

**Problem:** Settings items are in sections but on mobile a long settings scroll with many small items is tedious. Users can't find settings quickly.

**Fix:**
- Add a **search bar** at the top of Settings that filters settings items live (search "dark mode", "language", etc.).
- Use **grouped list cells** in the iOS/Android native style: items in a rounded card group with dividers between them, section titles as small caps above each group.
- Tap on a group (e.g., "Appearance") navigates to a sub-page dedicated to that group.

**Code scope:** `SettingsPage.tsx` — MEDIUM complexity for search, LOW for visual grouping.

---

## 16. Backup Page

### 16.1 Merge Backup into Settings — MEDIUM impact / LOW complexity / restructure

**Problem:** `BackupPage` is a top-level nav item. Backup/export is a utility action that most users perform infrequently (on demand or periodically). Having it as a permanent nav item wastes bottom-nav "More" real estate.

**Fix:** Move the Backup page content into a **"Data & Backup"** section within Settings. Remove the `/backup` top-level route and the Backup nav item. This simplifies the nav to 8 items (better for "More" sheet) and logically groups data management with settings.

**Code scope:** `SettingsPage.tsx`, `BackupPage.tsx` (convert to section component), router, nav config — LOW-MEDIUM complexity.

---

## 17. Onboarding Page

### 17.1 Onboarding Flow — Full-Screen, Step-Progress — MEDIUM impact / LOW complexity / visual

**Problem:** `OnboardingPage` is rendered as a standard app page with header and bottom nav. For a first-time-launch experience this is distracting — the user sees navigation to areas they can't use yet.

**Fix:**
- Render Onboarding **without** `AppLayout` — a standalone full-screen view.
- Add a step progress bar at the top (e.g., "Step 2 of 4").
- Each step fills the screen with a single large illustration + heading + 1–2 inputs.
- Use swipe-right gesture to go back between steps.
- After the last step, animate transition to Dashboard with a brief "Welcome" splash.

**Code scope:** Router config (exclude onboarding from `AppLayout`), `OnboardingPage.tsx`, `OnboardingFlow.tsx` — MEDIUM complexity.

---

### 17.2 CreateUserDialog — Simplify to Single Screen — LOW impact / LOW complexity / restructure

**Problem:** `CreateUserDialog` is a multi-step wizard for user creation. On a device that supports multi-user profiles, this is appropriate, but if called during Onboarding the steps feel redundant with onboarding steps.

**Fix:** When called from Onboarding, use an inline form within the onboarding step rather than a dialog-over-dialog pattern. When called from Settings (add new profile), keep the dialog/wizard.

**Code scope:** `CreateUserDialog.tsx` — add `context: 'onboarding' | 'settings'` prop, conditionally render inline or dialog — LOW complexity.

---

## 18. Suggested New Pages/Features

### 18.1 Today Page (rename Dashboard) — HIGH impact / MEDIUM complexity / new-feature

**Problem:** "Dashboard" is an abstract word. Users think in terms of "what am I doing today?". Rename to **"Today"** and focus the page purely on today's context: today's planned session, yesterday's session (quick reference), and today's body metrics. Move the multi-month calendar to an "Activity" sub-page or tab.

---

### 18.2 Session Pre-Briefing Screen — MEDIUM impact / MEDIUM complexity / new-feature

**Problem:** Currently, starting a session jumps directly into the active logging view. There is no moment to orient the user: what exercises are planned, what was the last performance on each, are there any load suggestions or progression notes.

**Fix:** Add a **"Ready to Train"** screen (appears after tapping "Start Session" but before the active session): a card for each planned exercise showing the exercise name, last session's key set (e.g., "Last time: 80 kg × 5 @ RPE 7"), and today's suggested target. A single large "Begin" button starts the timer and opens the active session. This screen auto-advances after 10 seconds if untouched.

**Code scope:** New `SessionBriefingPage.tsx` or bottom sheet, route between WorkoutDetail/Dashboard and ActiveSession — MEDIUM complexity.

---

### 18.3 Quick Log — Minimum-Friction Session — HIGH impact / HIGH complexity / new-feature

**Problem:** Users who train without a fixed plan (free sessions, cardio, accessory work) have no easy entry point. `WorkoutCreate` → `SessionDetail` → plan exercises → `ActiveSession` is 3+ steps. Many casual logs never happen because of this friction.

**Fix:** Add a **"Quick Log"** FAB on the Dashboard (or a bottom-sheet accessible from the bottom nav "Train" button when no session is active): opens a streamlined view where the user picks exercises one by one and logs sets immediately, with no pre-planning. This session is saved as a "freestyle" history entry. No template required.

**Code scope:** New `QuickLogSheet.tsx`, integration with existing session infrastructure — HIGH complexity.

---

### 18.4 Merged "Progress" Tab in Workout Detail — MEDIUM impact / MEDIUM complexity / new-feature

**Problem:** From a workout's detail page, the user cannot see how they have progressed on this specific plan over time (are they lifting more? more volume?). This analysis exists in Analytics but is not contextualised to a single workout plan.

**Fix:** Add a "Progress" tab in `WorkoutDetail` showing: last 8 sessions on this workout, volume trend chart, key exercise 1RM trends for the exercises in this plan, and compliance percentage. Data scoped to this workout only.

**Code scope:** New analytics hooks scoped to workout ID, `WorkoutDetail.tsx` tab — HIGH complexity (data layer).

---

## 19. Summary Priority Matrix

| ID | Change | Impact | Complexity | Type |
|----|--------|--------|------------|------|
| 1.9 | Haptic feedback on set completion | HIGH | LOW | interaction |
| 1.1 | Touch target minimum 48 px | HIGH | LOW | layout |
| 1.2 | Safe-area insets consistency | HIGH | LOW | layout |
| 1.3 | Bottom nav: 4 items + active session | HIGH | MEDIUM | navigation |
| 1.10 | Keyboard avoidance / inputMode | HIGH | MEDIUM | interaction |
| 8.1 | SetInputWidget: drum roller + swipe-complete | HIGH | HIGH | interaction |
| 8.4 | Replace dual FABs with session action bar | HIGH | MEDIUM | layout |
| 8.2 | Rest timer as sticky header banner | HIGH | LOW | interaction |
| 3.1 | Dashboard hero card (merge greeting + CTA) | HIGH | MEDIUM | layout |
| 2.2 | Android back button (Capacitor) | HIGH | MEDIUM | navigation |
| 4.3 | WorkoutCard long-press for mgmt actions | HIGH | MEDIUM | interaction |
| 5.1 | WorkoutCreate → bottom sheet | HIGH | MEDIUM | restructure |
| 8.3 | Active group always visible (no accordion) | MEDIUM | MEDIUM | layout |
| 8.5 | Load suggestion → inline card | MEDIUM | MEDIUM | restructure |
| 12.3 | Charts: horizontal scroll + pinch zoom | HIGH | MEDIUM | interaction |
| 13.2 | Merge 1RM into Analytics "Strength" tab | MEDIUM | MEDIUM | restructure |
| 16.1 | Backup → Settings sub-section | MEDIUM | LOW | restructure |
| 18.2 | Session pre-briefing screen | MEDIUM | MEDIUM | new-feature |
| 18.3 | Quick Log (freestyle session) | HIGH | HIGH | new-feature |
| 1.4 | Header height reduction | MEDIUM | LOW | layout |
| 1.6 | Typography min sizes | MEDIUM | LOW | visual |
| 1.8 | Action-oriented empty states | MEDIUM | LOW | visual |
| 3.2 | Calendar → week strip | MEDIUM | MEDIUM | layout |
| 7.3 | Volume analysis → inline tab | MEDIUM | MEDIUM | restructure |
| 9.1 | Exercise filters as bottom sheet | HIGH | MEDIUM | interaction |
| 15.1 | Danger zone → separate sub-page | HIGH | LOW | interaction |
| 17.1 | Onboarding standalone (no layout) | MEDIUM | MEDIUM | visual |

---

## 20. Phased Implementation Recommendation

### Phase 1 — Quick Wins (1–3 days each, no architecture changes)
1.1, 1.2, 1.4, 1.6, 1.8, 1.9, 2.3, 3.4, 4.4, 6.4, 8.6, 8.7, 8.9, 8.10, 10.3, 12.1, 12.4, 15.1, 16.1

### Phase 2 — Core Mobile UX (1–2 weeks each, moderate complexity)
1.3, 1.10, 2.2, 3.1, 3.2, 3.3, 4.3, 5.1, 7.2, 8.2, 8.3, 8.4, 8.5, 8.8, 9.1, 9.3, 12.2, 12.3, 13.1, 13.2, 17.1

### Phase 3 — High-Value New Features (2–4 weeks each, significant scope)
8.1, 18.2, 18.3, 18.4, 9.2, 6.1

---

*This report was written against the codebase state as of the session date. Component names, file paths, and prop structures are referenced from actual code exploration.*
