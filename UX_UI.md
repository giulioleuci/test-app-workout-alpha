# UX/UI Improvement Report — Workout Tracker 2

**Prepared for:** Single-user Android deployment via Capacitor  
**Device:** 6-inch screen, 2400 × 1080 px physical resolution, ~440 ppi  
**CSS viewport:** ~360 × 800 px (3× device pixel ratio) — all measurements below are in CSS px  
**Usable content area:** ~360 × 616 px after subtracting status bar (24 px), system nav bar (48 px), app header (56 px), and bottom nav (56 px)  
**Input context:** No hover, one-handed grip, portrait-only, soft keyboard eats ~40 % of viewport height when open, gesture navigation bar overlaps bottom ~48 px  
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

**Problem:** Many interactive elements (icon-only buttons in cards, inline edit pencils, pagination arrows, tab labels) are rendered at 16–24 px. Android Material guidelines require a minimum 48 × 48 dp tap area. At 440 ppi with a 3× ratio the physical size of a 24 px target is only ~1.6 mm — far too small for sweaty or fatigued hands during a workout.

**Fix:** Add a global utility class `touch-target` → `min-w-[48px] min-h-[48px] flex items-center justify-center` and apply it to every icon-button. For text buttons narrower than 48 px tall, add `py-3` as a minimum. Audit every `<Button size="icon">` and `<Button size="sm">` instance.

**Code scope:** ~40–60 component files; mechanical find-and-replace plus a Playwright visual test.

---

### 1.2 Safe-Area Inset Consistency — HIGH impact / LOW complexity / layout

**Problem:** `safe-area-bottom` and `safe-area-top` are applied in `AppHeader` and `MobileBottomNav` but not in every floating element (FABs, RestTimer, bottom sheets). On this device with gesture navigation the system bar overlaps ~48 px at the bottom. During an active session the FABs sit right at the bottom edge and are partially obscured.

**Fix:** Create CSS custom properties `--safe-top` and `--safe-bottom` (populated via Capacitor's `SafeArea` plugin or `env(safe-area-inset-*)`) and enforce them in `AppLayout` via `padding-top: var(--safe-top)` and `padding-bottom: var(--safe-bottom)`. Remove per-component inset hacks. Apply `bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px)` to all FABs.

**Code scope:** `AppLayout.tsx`, `MobileBottomNav.tsx`, `ActiveSession.tsx` (FABs), `RestTimer` component — 5–8 files.

---

### 1.3 Bottom Navigation — Increase Primary Actions — HIGH impact / MEDIUM complexity / navigation

**Problem:** The bottom nav has only 3 pinned items (Dashboard, Workouts, History). During a workout the most critical destination — the **Active Session** — is accessible only via a header badge, which is outside the thumb zone at the top of a 800 px tall screen. Analytics and 1RM, frequently used between sessions, are buried under "More".

**Fix:** Redesign to 4 fixed items + "More":
1. **Today** (home icon)
2. **Train** (dumbbell → resolves to Active Session if one is in progress, otherwise Workout List)
3. **History**
4. **Analytics**
5. **More** (1RM, Exercises, Settings/Backup)

When a session is active, item 2 pulses with an accent dot and always deep-links to `/session/active`. Remove the header badge — the nav item replaces it.

**Code scope:** `MobileBottomNav.tsx`, `AppHeader.tsx` (remove badge), `AppLayout.tsx` navItems config — 3 files, ~80 lines.

---

### 1.4 Header Height & Wasted Vertical Space — HIGH impact / LOW complexity / layout

**Problem:** `AppHeader` is `h-14` (56 px) and shows only a page label plus a user-switcher icon. On this device's 616 px usable content area, 56 px is ~9 % of visible space. With a single user profile, the user-switcher icon is permanently useless yet occupies the header.

**Fix:** Reduce header to `h-10` (40 px) on pages with no header actions. Remove the user-switcher icon entirely — profile/settings are accessible from the "More" sheet. Replace the static label with contextual content: on WorkoutDetail show the workout name + `⋮` overflow menu; on ActiveSession show the session name + elapsed timer. On Dashboard, remove the header entirely and move any utility icons into the page content.

**Code scope:** `AppHeader.tsx`, per-page header slot logic, remove user-switcher references — medium-effort API design, low rendering effort.

---

### 1.5 Page Scroll Padding — MEDIUM impact / LOW complexity / layout

**Problem:** The main content container uses `pb-20` (80 px) to clear the bottom nav. On this device with a 48 px gesture nav bar, `pb-20` is insufficient and the last card is obscured. On large-text accessibility settings the clipping is worse.

**Fix:** Replace static `pb-20` with `pb-[calc(var(--bottom-nav-height,80px)+var(--safe-bottom,0px)+16px)]` everywhere it appears. Centralise as a Tailwind arbitrary value or a `scroll-pad-bottom` utility class.

**Code scope:** ~12 page files that independently set `pb-20` or `pb-32`.

---

### 1.6 Typography Scale for a High-DPI Screen — MEDIUM impact / LOW complexity / visual

**Problem:** Although 440 ppi renders text sharply, text remains physically small. Many card headers use `text-sm` (14 px) or `text-xs` (12 px) — at arm's length in a gym with ambient light this is too small. The high resolution does not compensate for absolute CSS pixel size.

**Fix:** Establish a minimum body text size of `text-sm` (14 px) and a minimum label size of `text-xs` (12 px). Raise card metric displays (`QuickStatsGrid`, `LoadSection`, `RPESection` values) to `text-base` (16 px) minimum with `font-semibold`. Review every component with `text-xs` and justify or upgrade it.

**Code scope:** ~25 component files. No logic changes, only class adjustments.

---

### 1.7 Loading State Granularity — MEDIUM impact / MEDIUM complexity / interaction

**Problem:** `DetailPageSkeleton` and `ListPageSkeleton` are full-page loaders. On Dexie/IndexedDB reads (typically < 50 ms on this device's storage) the skeleton flash causes visual noise. On slow analytics aggregations the skeleton doesn't communicate what is loading.

**Fix:** Implement **progressive disclosure loading**:
- For list pages: show stale cached data immediately (Tanstack Query `staleTime`) and display a subtle top-of-page progress bar only when a background refresh is happening.
- For heavy analytics: show individual section skeletons so the first available chart renders while others load.
- For near-instant operations (< 100 ms): skip skeletons entirely with a `useMinLoadTime(100)` guard.

**Code scope:** Shared `useQueryWithMinTime` hook (new), modifications to `AnalyticsPage.tsx` and `Dashboard.tsx`.

---

### 1.8 Empty States — MEDIUM impact / LOW complexity / visual

**Problem:** Several pages (WorkoutList tabs, HistoryList, ExerciseList) render plain text empty messages. On first launch these are the first thing a new user sees and give no guidance on what to do next.

**Fix:** Replace text-only empty states with **action-oriented empty states**: a centered SVG illustration, a headline, a one-line explanation, and a CTA button that opens the creation flow. Examples:
- WorkoutList empty: "No workouts yet → Create your first plan"
- HistoryList empty: "No sessions logged → Start a workout"
- ExerciseList filtered empty: "No exercises match → Clear filters"

**Code scope:** Shared `<EmptyState icon headline description action />` component (~30 lines), replace 6–8 text-only empties.

---

### 1.9 Haptic Feedback — HIGH impact / LOW complexity / interaction

**Problem:** No haptic feedback is used anywhere. On this Capacitor/Android app, haptics are available via `@capacitor/haptics`. Without them, set-completion confirmations, long-press selections, and destructive-action confirmations feel unresponsive.

**Fix:** Add haptic feedback at four trigger points:
1. Completing a set → `ImpactStyle.Light`
2. Finishing the last set of an exercise → `ImpactStyle.Medium`
3. Completing the session → `NotificationType.Success`
4. Destructive confirm (delete, discard session) → `NotificationType.Warning`

Create a `useHaptics()` hook wrapping `@capacitor/haptics`. Inject it into `SetInputActions`, `SessionCompletionCard`, and confirmation dialogs.

**Code scope:** 1 new hook file, 4–6 call sites.

---

### 1.10 Keyboard / Input Avoidance — HIGH impact / MEDIUM complexity / interaction

**Problem:** When the software keyboard opens during set logging, it occupies ~320 px of the 800 px viewport, leaving only ~480 px visible. The active input is not reliably scrolled into view on Android WebView, so it can sit behind the keyboard.

**Fix:**
- Add `<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">` to `index.html` to enable the modern keyboard resize behaviour.
- Wrap `SetInputWidget` in a `useEffect` that calls `inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })` on focus.
- Set `inputMode="decimal"` on weight inputs and `inputMode="numeric"` on rep inputs to trigger the correct Android numeric keyboard.

**Code scope:** `index.html`, `SetInputWidget.tsx`, `SetInputValues.tsx` — 3 files.

---

## 2. AppLayout & Navigation

### 2.1 "More" Sheet Navigation UX — MEDIUM impact / LOW complexity / navigation

**Problem:** The "More" sheet uses a 3-column icon grid. On the 360 px viewport each cell is 120 px wide — reasonable, but the sheet opens with no animation cue and the backdrop doesn't visually communicate "this is above the nav".

**Fix:**
- Add a visible drag handle at the top of the sheet.
- Increase row height to 72 px (icon 28 px + label 14 px + 15 px padding each side).
- Use `side="bottom"` with `snapPoints={[0.4]}` so the sheet feels anchored.
- Add section grouping: "Training" (Analytics, 1RM, Exercises) vs "App" (Settings, Backup).

**Code scope:** `MobileBottomNav.tsx` — self-contained, ~20 lines change.

---

### 2.2 Back Navigation — MEDIUM impact / MEDIUM complexity / navigation

**Problem:** React Router's hash routing does not integrate with Android's gesture back button via Capacitor. Users pressing back may exit the app unexpectedly from Dashboard, or silently navigate away from an active session without a discard confirmation.

**Fix:**
- Use Capacitor's `App.addListener('backButton', handler)` to intercept the hardware back.
- Per-route handlers:
  - Any modal/sheet open → close it.
  - ActiveSession page → show `DiscardSessionDialog` confirmation.
  - All other pages → `window.history.back()` with a double-tap-to-exit guard on Dashboard.
- Create a `useAndroidBackButton(handler)` hook and register it in layout.

**Code scope:** 1 new hook, `AppLayout.tsx`, `ActiveSession.tsx` — ~60 lines total.

---

### 2.3 Remove Desktop Sidebar — LOW impact / LOW complexity / layout

**Problem:** `DesktopSidebar` is rendered in the DOM on mobile (hidden via CSS `md:hidden`). It adds mount overhead and its `role="navigation"` creates a duplicate accessibility landmark.

**Fix:** Conditionally render it only above the `md` breakpoint:
```tsx
const { isDesktop } = useResponsive();
return isDesktop ? <DesktopSidebar ... /> : null;
```

**Code scope:** `AppLayout.tsx` — 3 lines.

---

## 3. Dashboard Page

### 3.1 Card Density & Above-the-Fold Content — HIGH impact / MEDIUM complexity / layout

**Problem:** With the 616 px usable content area, only approximately 1.5 cards are visible on first render. `DashboardGreeting` occupies the full width but has very low information density. The user's primary action — starting today's planned session — is on the second card (`NextSessionSuggestionCard`), which is reliably off-screen.

**Fix:**
- Merge `DashboardGreeting` and `NextSessionSuggestionCard` into a single **Hero card** at the top: user name (small, secondary), workout name (large, primary), day/date, and a full-width "Start Session" CTA button in the accent color. If no session is planned, show a motivational note + "Browse Workouts" CTA.
- Move `QuickStatsGrid` below the hero — reference data, not primary action.
- Keep `LastWorkoutSummaryCard`, `TrainingCalendar`, `MuscleFreshnessList`, and `ConsistencyHeatmap` in current order.
- Collapse `ConsistencyHeatmap` behind an "Expand" toggle by default — it requires horizontal scroll on a 360 px viewport.

**Code scope:** New `DashboardHeroCard.tsx` (~60 lines), `Dashboard.tsx` restructure — MEDIUM complexity.

---

### 3.2 Training Calendar — Week Strip — MEDIUM impact / LOW complexity / layout

**Problem:** The full month calendar grid renders each day cell at ~46 px on a 360 px screen — dense and hard to tap. At 440 ppi the cells appear crisp but are physically tiny.

**Fix:** Switch to a **horizontal week strip**: 7 day pills scrollable in a row, each 48 × 60 px showing day abbreviation, date number, and a colored dot if a session was logged. Tapping a day reveals a session chip below the strip. Keep a "Full Calendar" button that opens the monthly view as a bottom sheet.

**Code scope:** `TrainingCalendar.tsx` — full visual rewrite, data hooks unchanged. MEDIUM complexity.

---

### 3.3 Muscle Freshness — Horizontal Chip Row — MEDIUM impact / LOW complexity / layout

**Problem:** `MuscleFreshnessList` is positioned at the bottom on mobile, making it easy to miss. For a single serious lifter this is critical session-planning data.

**Fix:** Place it directly below the Hero card as a horizontally scrolling row of muscle chips (muscle name + recovery color: green/yellow/red). Single compact row, no vertical space cost.

**Code scope:** `MuscleFreshnessList.tsx` — layout change only, data logic unchanged.

---

### 3.4 PendingSessionDialog — Convert to Bottom Sheet — MEDIUM impact / LOW complexity / restructure

**Problem:** `PendingSessionDialog` is a centered modal. On an 800 px tall device, centered dialogs require the user to tap the middle of the screen — outside the thumb zone. The dialog also triggers on page load which feels jarring.

**Fix:** Convert to a `SheetContent side="bottom"` that slides up from the bottom nav. Add a 300 ms mount delay. Use full-width "Resume" and "Discard" buttons inside the sheet.

**Code scope:** `PendingSessionDialog.tsx` — replace Dialog with Sheet wrapper, ~20 lines.

---

## 4. Workout List Page

### 4.1 Tab Bar Usability — MEDIUM impact / LOW complexity / interaction

**Problem:** The 3-tab bar (Workouts, Archived, Templates) uses `grid-cols-3` giving each tab ~120 px on the 360 px viewport. The thin underline indicator is difficult to perceive in high-ambient-light gym environments.

**Fix:**
- Rename tabs to be verb-oriented: **"Plans"**, **"Templates"**, **"Archive"**.
- Use a pill/capsule tab indicator (filled background on active tab) — far more legible in bright light.
- Add badge counts: "Plans (3)", "Templates (7)".

**Code scope:** `WorkoutList.tsx` — 10–15 lines, purely visual.

---

### 4.2 Sort and Filter Controls — MEDIUM impact / LOW complexity / interaction

**Problem:** The sort dropdown is a `<Select>` at the top of the page. On Android WebView, Radix Select can trigger a native picker that looks inconsistent. Filters (muscle group, equipment) are not accessible from this page at all.

**Fix:** Replace the sort select with a horizontally scrolling row of filter chips below the tab bar: "A-Z", "Recent", "Updated", "+ Equipment", "+ Muscle". Chips toggle sort/filter state — always-visible, no dropdown overhead.

**Code scope:** `WorkoutList.tsx`, new `SortFilterChips.tsx` component — MEDIUM complexity.

---

### 4.3 WorkoutCard Actions — HIGH impact / MEDIUM complexity / interaction

**Problem:** `WorkoutCard` supports 7+ actions in an overflow `⋮` menu. On mobile, overflow menus require two taps and produce small targets — a significant issue during a gym session.

**Fix:**
- Move the **primary action** (Start Session / Continue) to a full-width button at the card bottom — always visible, large tap target.
- Move **secondary actions** (Volume Analysis) to a secondary outline button alongside the primary.
- Move **management actions** (archive, delete) to a **long-press context menu** (300 ms `onLongPress` opens a bottom sheet) — matches the Android native pattern.

**Code scope:** `WorkoutCard.tsx`, shared `useLongPress.ts` hook — MEDIUM complexity.

---

### 4.4 FAB Positioning Conflict with Bottom Nav — HIGH impact / LOW complexity / layout

**Problem:** The "Create Workout" FAB is `fixed bottom-6 right-6`. With a 56 px bottom nav + 48 px system gesture bar, the FAB overlaps the nav on this device.

**Fix:** Position all FABs at `bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px)` consistently.

**Code scope:** `WorkoutList.tsx` + every other page with a FAB — 5–6 files, trivial change.

---

## 5. Workout Create Page

### 5.1 Convert from Page to Bottom Sheet — HIGH impact / MEDIUM complexity / restructure

**Problem:** `WorkoutCreate.tsx` is a full routed page for a 4-field form. A full page transition for a simple creation form is visual overhead; the back button is needed to cancel, which on Android gesture nav is a swipe-left that can feel ambiguous.

**Fix:** Convert `WorkoutCreate` from a routed page to a **bottom sheet** launched from the FAB in `WorkoutList`. On submit, close the sheet and navigate to the new `WorkoutDetail` page. Remove the `/workouts/new` route.

**Code scope:** Extract form to `CreateWorkoutSheet.tsx`, modify `WorkoutList.tsx`, update router — MEDIUM complexity.

---

### 5.2 Notes Field — Collapsible — LOW impact / LOW complexity / layout

**Problem:** The Notes field is the last field in the form. When focused, the 320 px keyboard leaves only ~480 px visible on this device, and the input may sit behind the keyboard without triggering `scrollIntoView`.

**Fix:** Move Notes behind an "Add notes (optional)" collapsible toggle using Shadcn `Collapsible`. Expands below the toggle when tapped, keeping the default form height minimal.

**Code scope:** `WorkoutCreate.tsx` (or its sheet replacement) — ~10 lines.

---

## 6. Workout Detail Page

### 6.1 Session Reordering UX — HIGH impact / HIGH complexity / interaction

**Problem:** LexoRank drag-and-drop on a scrolling WebView container on Android is unreliable — the browser intercepts vertical scroll gestures before the drag activator fires.

**Fix:** Add an explicit **reorder mode** toggle (a "Reorder" button in the header `⋮` menu). When active:
- Cards show a `GripVertical` drag handle (48 px tall) on the left.
- Normal card tap actions are disabled.
- A "Done" button confirms the reorder.
- Implement with `@dnd-kit/sortable` using `DragHandle` activator to avoid the scroll conflict.

**Code scope:** `WorkoutDetail.tsx` and session card components — HIGH complexity.

---

### 6.2 Unsaved Changes Bar — MEDIUM impact / LOW complexity / interaction

**Problem:** `UnsavedChangesBar` appears at the top of the page. On this 800 px tall device, top banners are out of the thumb zone and easily missed while the user is looking at the content they are editing.

**Fix:** Move the unsaved-changes indicator to a **sticky bottom bar** above the bottom nav. Collapses to a thin accent line at rest; expands to a full action bar with "Save" and "Discard" buttons when the user pauses scrolling. Thumb-zone accessible.

**Code scope:** `UnsavedChangesBar.tsx` + its usage in `WorkoutDetail.tsx` — MEDIUM complexity.

---

### 6.3 Volume Analysis Dialog — Convert to Dedicated Tab — MEDIUM impact / MEDIUM complexity / restructure

**Problem:** `VolumeAnalysisDialog` is a modal overlay containing substantial analytics content. On a 360 × 616 px content area, a modal dialog is too constrained for scrollable charts and breakdowns.

**Fix:** Add a **"Volume" tab** to `WorkoutDetail` (alongside the sessions list) that shows volume analysis inline. Remove the dialog. The `SessionVolumeDialog` (smaller) can remain as a bottom sheet.

**Code scope:** `WorkoutDetail.tsx`, `SessionVolumeAnalysis.tsx`, routing — MEDIUM complexity.

---

### 6.4 Merge EditWorkoutDialog and EditSessionPropertiesDialog — LOW impact / LOW complexity / restructure

**Problem:** Workout metadata and session metadata are edited in separate dialogs launched from different `⋮` menus. The patterns are identical and the duplication creates inconsistency.

**Fix:** Create a single `EditPropertiesSheet.tsx` accepting a `schema` prop (array of field definitions) that renders a generic form. Both edit flows use the same component.

**Code scope:** New shared component, replaces 2 dialog files — LOW-MEDIUM complexity refactor.

---

## 7. Session Detail Page (Planned Session)

### 7.1 Exercise Group Card Density — MEDIUM impact / LOW complexity / layout

**Problem:** `ExerciseGroupCard` in planned sessions shows a lot of data per card. On the 360 px viewport with a 10-exercise session, the user scrolls through a very long list.

**Fix:**
- **Collapsed default view**: Show only the exercise name, set summary (e.g., "4 × 6–8 @ 7–8 RPE"), and a right-chevron icon. Tap to expand full detail.
- Use Shadcn `Collapsible` — editing actions appear only in the expanded state.

**Code scope:** `ExerciseGroupCard.tsx` and `SessionDetail.tsx` — MEDIUM complexity.

---

### 7.2 Muscle Overlap Matrix — Convert to Sheet — MEDIUM impact / LOW complexity / restructure

**Problem:** `MuscleOverlapMatrix` is an inline section on `SessionDetail`. It is a complex data visualization rarely consulted while editing; it pushes the exercise list far down on the 616 px content area.

**Fix:** Move it behind a "Muscle Overlap" chip in the session header that opens a **bottom sheet**. The matrix renders at full 360 px width in the sheet.

**Code scope:** `SessionDetail.tsx`, `MuscleOverlapMatrix.tsx` wrapper — LOW complexity.

---

## 8. Active Session Page

### 8.1 SetInputWidget — Core Interaction Quality — HIGH impact / HIGH complexity / interaction

**Problem:** `SetInputWidget` is the most-used UI element in the entire app. Current issues during a set:
1. Standard HTML text fields trigger the full keyboard, collapsing the visible area to ~480 px.
2. Increment/decrement arrows are small icon buttons (< 48 px).
3. No swipe-to-complete gesture.
4. Completing a set requires multiple taps.

**Fix:**
- Replace keyboard-based weight input with a **number wheel / drum roller** for increments, with a direct-edit mode triggered by tapping the number. Avoids keyboard for the common "+2.5 kg" case.
- Add **+5 / -5 / +2.5 / -2.5 increment buttons** as a 2-row pad below the weight display. User-configurable.
- Add **swipe-right-to-complete** gesture on the set row using `react-swipeable` or a custom `useDrag`.
- Mark complete with a single large checkmark button, minimum 56 × 56 px.

**Code scope:** `SetInputWidget.tsx`, `SetInputValues.tsx`, `SetInputActions.tsx`, new `WeightDrumRoller.tsx` — HIGH complexity.

---

### 8.2 Rest Timer Visibility — HIGH impact / LOW complexity / interaction

**Problem:** `RestTimer` is a floating component that conflicts with FABs in z-index and position. When the user scrolls, the timer can be occluded. On this 800 px tall device, a floating element in the corner is easy to miss mid-set.

**Fix:**
- When a rest timer is active, display a **persistent banner** directly below `AppHeader` (not floating): exercise name, countdown in large text, a stop button, and a thin progress bar. Height: 52 px.
- Always visible regardless of scroll position, no z-index conflict.

**Code scope:** `RestTimer.tsx` + layout integration in `AppLayout.tsx` / `ActiveSession.tsx` — MEDIUM complexity.

---

### 8.3 Exercise Group Accordion — Improve Visual Hierarchy — MEDIUM impact / MEDIUM complexity / layout

**Problem:** `UpcomingExercisesAccordion` and `CompletedExercisesAccordion` create a two-tier structure. The currently active exercise group — the most important thing on screen — does not have a clear primary visual position within the 616 px content area.

**Fix:**
- Remove the accordion wrapper for the **currently active group** — always visible at the top, full-width, with an accent-colored left border.
- Completed exercises collapse to a single "N exercises completed ✓" summary line (tappable to expand).
- Upcoming exercises remain in a collapsible section below.

**Code scope:** `ActiveSession.tsx`, `ExerciseGroupRenderer.tsx` — MEDIUM complexity.

---

### 8.4 FABs During Active Session — HIGH impact / LOW complexity / layout

**Problem:** Two FABs in the same corner compete visually, and the lower one is occluded by the 48 px gesture nav bar (see §1.2). "Save/Finish" is critical but not visually differentiated.

**Fix:** Replace dual FABs with a **persistent bottom action bar** above the bottom nav:
- Left: "Quick Add" icon button (compact, secondary style)
- Center: Exercise name chip (tappable to show set history)
- Right: Large "Log Set" / "Finish" button (primary, full accent, 48 px tall)

**Code scope:** `ActiveSession.tsx`, remove FABs, add `SessionActionBar.tsx` — MEDIUM complexity.

---

### 8.5 Load Suggestion Dialog — Convert to Inline Card — MEDIUM impact / MEDIUM complexity / restructure

**Problem:** `LoadSuggestionDialog` interrupts the session flow with a modal. The user is mid-workout and must dismiss a dialog to continue.

**Fix:** Convert to an **inline suggestion card** above `SetInputWidget` for the first set of an exercise: suggested weight, basis (e.g., "Based on last session: 80 kg × 5 @ RPE 7"), and two actions: "Use this" (fills the input) and "Dismiss". The card slides in from the top and auto-dismisses when the user starts editing the input.

**Code scope:** `LoadSuggestionDialog.tsx` → `LoadSuggestionCard.tsx`, usage in session group components — MEDIUM complexity.

---

### 8.6 Warmup Calculator — Bottom Sheet — LOW impact / LOW complexity / layout

**Problem:** `WarmupCalculator` opens as a centered dialog on mobile. On a 360 px viewport it fills most of the screen but still feels cramped for a list of 4–6 warmup rows.

**Fix:** Convert to `side="bottom"` sheet with `snapPoints` at 50 % and 90 %. At 50 % the user sees the warmup list; dragging up reveals configuration options.

**Code scope:** `WarmupCalculator.tsx` — swap Dialog for Sheet, ~15 lines.

---

### 8.7 SwapExerciseSheet — Exercise Picker — MEDIUM impact / LOW complexity / interaction

**Problem:** `SwapExerciseSheet` uses `height: '85vh'` which on an 800 px viewport (minus insets ≈ 728 px) is ~619 px — barely enough. The current exercise context is not surfaced visually.

**Fix:**
- Use `height: '92vh'` with a drag handle.
- Add a header chip showing the current exercise name with a "→ Replace" label.
- Add a **recently used** row at the top of the picker (above search) for one-tap substitution.

**Code scope:** `SwapExerciseSheet.tsx`, `ExercisePicker.tsx` — LOW-MEDIUM complexity.

---

### 8.8 UnresolvedSetsDialog — Improve Decision UX — MEDIUM impact / LOW complexity / interaction

**Problem:** `UnresolvedSetsDialog` is a blocking modal at session end. Users eager to finish may dismiss it without understanding which sets are incomplete.

**Fix:**
- Show a **summary list** of unresolved sets (exercise name, set number, expected values).
- Three clear actions: "Complete all as failed", "Keep and skip", "Go back to log".
- Use a bottom sheet so the user can see the session content behind it for reference.

**Code scope:** `UnresolvedSetsDialog.tsx` — UI enhancement, logic unchanged — LOW complexity.

---

### 8.9 QuickAddSheet — Step Indicator — LOW impact / LOW complexity / interaction

**Problem:** The 3-step wizard in `QuickAddSheet` has no visual step indicator. Users do not know how many steps remain.

**Fix:** Add a step dot indicator (3 dots, active one filled) in the sheet header. Steps: "Type → Exercise → Confirm".

**Code scope:** `QuickAddSheet.tsx` — ~10 lines, purely additive.

---

### 8.10 In-Session Exercise History (ExerciseInfoModal) — MEDIUM impact / LOW complexity / restructure

**Problem:** `ExerciseInfoModal` opens as a centered modal, which on this tall device means the user loses visual context of their position in the session.

**Fix:** Convert to `side="bottom"` sheet with a compact initial snap height (~45 %). The user can pull up for more history. The drag handle makes it feel like a "peek" rather than a blocking overlay.

**Code scope:** `ExerciseInfoModal.tsx` — swap Dialog for Sheet — LOW complexity.

---

## 9. Exercise List Page

### 9.1 Filter Controls — HIGH impact / MEDIUM complexity / interaction

**Problem:** Filters (equipment, muscle, movement pattern) are likely in a filter dialog that navigates away from results. Multi-filter state is hard to communicate on a 360 px screen.

**Fix:**
- Show active filters as dismissible chips below the search bar.
- "Filter" button opens a **bottom sheet** with checkboxes grouped by category, plus a "Show X results" button at the bottom.
- The search bar must be **sticky** — critical for a library of 100+ exercises where the bar scrolls off the 616 px content area quickly.

**Code scope:** `ExerciseList.tsx`, `ExerciseForm.tsx` filter logic, new `FilterSheet.tsx` — MEDIUM complexity.

---

### 9.2 Alphabet Jump List — MEDIUM impact / MEDIUM complexity / new-feature

**Problem:** On a large exercise library (50+ exercises), pagination requires tapping through multiple pages. On a 360 px wide screen a right-edge scrubber is a minimal-footprint standard Android pattern.

**Fix:** Add a right-edge alphabet scrubber: 16 px wide vertical strip of letter labels A–Z. Touch-drag scrolls the list to that letter group. Exercises grouped by first letter with a sticky section header.

**Code scope:** `ExerciseList.tsx`, new `AlphabetJumpList.tsx` — MEDIUM complexity, requires virtualised list if large.

---

### 9.3 ExerciseForm — Full-Screen Bottom Sheet — MEDIUM impact / LOW complexity / restructure

**Problem:** Creating/editing an exercise opens `ExerciseForm` in a modal. The form has many fields; a standard dialog at 360 px is too narrow and requires heavy scrolling in a cramped container.

**Fix:** Use a full-screen bottom sheet (100 % height, `side="bottom"`, no backdrop close) for `ExerciseForm`. Full viewport height, focused task feel, sticky "Save" button at the bottom.

**Code scope:** `ExerciseList.tsx` (trigger), `ExerciseForm.tsx` (wrapper change) — LOW complexity.

---

## 10. History List Page

### 10.1 Date Grouping — MEDIUM impact / LOW complexity / visual

**Problem:** `HistoryList` is a flat paginated list of `HistorySessionCard` items. No date grouping forces the user to read timestamps on each card to find a specific session.

**Fix:** Group sessions by sticky date heading: "Today", "Yesterday", "May 26", etc. Pagination loads more date groups at the bottom.

**Code scope:** `HistoryList.tsx` — date grouping logic + section header component — LOW complexity.

---

### 10.2 Swipe-to-Delete — MEDIUM impact / MEDIUM complexity / interaction

**Problem:** Deleting a session requires tapping into a card, finding a delete option, and confirming. Android users expect swipe-left to reveal a delete action.

**Fix:** Add swipe-left on `HistorySessionCard` to reveal a red "Delete" action via `react-swipeable` (60 px threshold). Confirm with a bottom sheet to prevent accidental deletion.

**Code scope:** `HistorySessionCard.tsx`, new `SwipeableCard.tsx` wrapper — MEDIUM complexity.

---

### 10.3 CSV Export — Move to Overflow Menu — LOW impact / LOW complexity / interaction

**Problem:** `HistoryCsvToolbar` occupies space in the main toolbar. Export is a rare action that clutters the toolbar.

**Fix:** Move all CSV export/import actions to the header's `⋮` overflow menu. Free the toolbar space for search/filter controls.

**Code scope:** `HistoryList.tsx`, `HistoryCsvToolbar.tsx` — LOW complexity.

---

## 11. History Detail Page

### 11.1 Metric Cards Layout — MEDIUM impact / LOW complexity / layout

**Problem:** On a 360 px viewport the top metrics (total volume, duration, tonnage) are small cards that get visually lost in a long scroll of set-by-set data.

**Fix:**
- Feature the top 3 metrics (total volume, duration, average RPE) as a **hero stat strip** at the top — 3 columns, large numbers, secondary labels below each.
- Move the set-by-set breakdown into a collapsible `Accordion` per exercise, defaulting to collapsed.
- Add a sticky "Share" / "Export" button in the header right slot.

**Code scope:** `HistoryDetail.tsx` — restructure layout — MEDIUM complexity.

---

### 11.2 PerformanceTrendIndicator Placement — LOW impact / LOW complexity / layout

**Problem:** `PerformanceTrendIndicator` (progression/plateau/overreaching) is poorly placed inline without context explaining what it refers to.

**Fix:** Place it immediately below the hero stat strip with a brief contextual label: "Compared to your last 4 sessions of [exercise/workout name]". Add a `(?)` info icon opening a tooltip sheet explaining the metric.

**Code scope:** `HistoryDetail.tsx` — layout and tooltip — LOW complexity.

---

## 12. Analytics Page

### 12.1 Tab Navigation for Analytics — MEDIUM impact / LOW complexity / navigation

**Problem:** Four tabs in a `grid-cols-4` layout give each tab ~85 px on the 360 px screen — labels are truncated. Switching tabs triggers full section remounts.

**Fix:**
- Use a **horizontally scrollable tab list** (`flex overflow-x-auto`) so each tab has natural width. Add a right-shadow fade to hint at scrollability.
- Persist tab scroll position so returning to a tab does not reset the user's scroll.

**Code scope:** `AnalyticsPage.tsx` — tab wrapper styling — LOW complexity.

---

### 12.2 Filter Controls — Sticky Filter Summary — MEDIUM impact / LOW complexity / interaction

**Problem:** `AnalyticsFilters` at the top of the page disappears when scrolling down into charts. The user loses context of which date range and exercise they are viewing.

**Fix:**
- Make the filter summary **sticky** below the tab bar: a chip row showing active filters ("Last 90 days · Squat"). Tapping a chip opens the filter sheet.
- The full `AnalyticsFilters` control opens as a bottom sheet from a "Filter" icon in the header.

**Code scope:** `AnalyticsPage.tsx`, `AnalyticsFilters.tsx` — MEDIUM complexity.

---

### 12.3 Charts on Mobile — Horizontal Scroll / Zoom — HIGH impact / MEDIUM complexity / interaction

**Problem:** Time-series charts have a fixed width constrained to the 360 px container. With 90 days of data, individual data points are ~4 px apart — unreadable and un-tappable at 440 ppi.

**Fix:**
- Render charts with a **minimum width of 600 px** inside an `overflow-x-auto` scroll container. ~2 months of data visible at once; user scrolls to explore history.
- Add pinch-to-zoom (Recharts `<Brush />` or `chartjs-plugin-zoom`).
- Show exact value in a **tooltip snapping to the nearest day** on touch — use `activeDot` with large radius.

**Code scope:** `VolumeSection.tsx`, `LoadSection.tsx`, `RPESection.tsx` — MEDIUM complexity.

---

### 12.4 TheoreticalPerformanceMatrix — Simplify for Mobile — MEDIUM impact / LOW complexity / layout

**Problem:** `TheoreticalPerformanceMatrix` is likely a wide table. On 360 px it requires horizontal scroll with no affordance and column headers disappear when scrolled.

**Fix:** Replace the table with a **stacked card list**: one card per rep range (1RM, 3RM, 5RM, 8RM, 10RM) showing the exercise name and estimated weight prominently. Or keep the table but freeze the first column with `sticky left-0`.

**Code scope:** `TheoreticalPerformanceMatrix.tsx` — layout-only change — LOW complexity.

---

### 12.5 IntensityCalculator — Improve Inputs — LOW impact / LOW complexity / interaction

**Problem:** Numeric inputs for load/percentage have the same keyboard issues as `SetInputWidget` — the keyboard collapses the visible area significantly.

**Fix:** Use `inputMode="decimal"` on all numeric inputs and add quick-select percentage chips (50 %, 60 %, 70 %, 80 %, 85 %, 90 %, 95 %) that populate the field without triggering the keyboard.

**Code scope:** `IntensityCalculator.tsx` — LOW complexity, additive.

---

## 13. One Rep Max Page

### 13.1 Page Density — MEDIUM impact / LOW complexity / layout

**Problem:** `OneRepMaxPage` shows exercises with 1RM estimates and charts. On the 616 px content area the user must scroll through a long list before reaching the chart for a specific exercise.

**Fix:**
- Add an **exercise search/filter bar** at the top (same pattern as ExerciseList).
- Show exercises in a compact single-row list (name + current 1RM). Tapping opens an expanded detail view (bottom sheet or push navigation) with the trend chart and historical records.
- Feature the user's **top 5 lifts** as a card strip at the top.

**Code scope:** `OneRepMaxPage.tsx`, `OneRepMaxRecordDialog.tsx` — MEDIUM complexity.

---

### 13.2 Merge 1RM into Analytics Page — MEDIUM impact / MEDIUM complexity / restructure

**Problem:** Having both `AnalyticsPage` and `OneRepMaxPage` splits the mental model of "how am I progressing?" across two separate nav items.

**Fix:** Move `OneRepMaxPage` content into a 5th tab ("Strength") within `AnalyticsPage`. The tab shows the 1RM tracker, strength-to-weight correlation, and the theoretical performance matrix. Remove the `/1rm` route and the 1RM nav item.

**Code scope:** `AnalyticsPage.tsx` (add tab), `OneRepMaxPage.tsx` (convert to section component), router changes, nav config — MEDIUM complexity.

---

## 14. Profile Page

### 14.1 Body Weight Tracking — Reduce Friction — MEDIUM impact / LOW complexity / interaction

**Problem:** `WeightEditDialog` is a dialog accessible only from the profile page. Users who weigh themselves daily must navigate away from their current context to log weight.

**Fix:**
- Add a **"Log weight today"** chip on the Dashboard if no weight has been logged today. One tap opens a bottom sheet with a large number display and +/- increment buttons (0.1 kg steps). Two taps total (open + confirm).
- On the Profile page, show the body weight chart as the primary visual.

**Code scope:** `Dashboard.tsx` (weight chip), `WeightEditDialog.tsx` (convert to bottom sheet), `ProfilePage.tsx` — LOW-MEDIUM complexity.

---

### 14.2 Profile Page Structure — LOW impact / LOW complexity / layout

**Problem:** `ProfilePage` mixes personal data (weight history, name) with settings-like content (units, preferences), creating an unclear mental model.

**Fix:** Split into two clearly labeled sections:
- **"Me"**: Name, weight tracking, body stats.
- **"Preferences"**: Units, default settings, intensity preferences.

Both on the same page, visually distinguished with section headers.

**Code scope:** `ProfilePage.tsx` — structural reorganization, LOW complexity.

---

## 15. Settings Page

### 15.1 Danger Zone Placement — HIGH impact / LOW complexity / interaction

**Problem:** "Danger Zone" (delete account, wipe data) is in the Settings page at the bottom of a long scroll. On a 616 px content area a fast flick gesture can land an accidental tap on a destructive action.

**Fix:**
- Move Danger Zone to a **separate sub-page**: Settings → Advanced → Danger Zone. One extra navigation step is intentional friction.
- Each destructive action requires typing a confirmation phrase before the confirm button activates.

**Code scope:** `SettingsPage.tsx`, new `DangerZonePage.tsx` sub-route — LOW complexity.

---

### 15.2 Settings Groups — MEDIUM impact / LOW complexity / visual

**Problem:** A long settings scroll with many small items is tedious on a 360 px screen. Users cannot find settings quickly without reading every item.

**Fix:**
- Add a **search bar** at the top of Settings that filters items live.
- Use **grouped list cells** in the Android native style: items in a rounded card group with dividers, section titles as small caps above each group.
- Tapping a group (e.g., "Appearance") navigates to a dedicated sub-page.

**Code scope:** `SettingsPage.tsx` — MEDIUM complexity for search, LOW for visual grouping.

---

## 16. Backup Page

### 16.1 Merge Backup into Settings — MEDIUM impact / LOW complexity / restructure

**Problem:** `BackupPage` is a top-level nav item. Backup is a rare utility action that wastes "More" sheet real estate.

**Fix:** Move Backup into a **"Data & Backup"** section within Settings. Remove the `/backup` top-level route and the Backup nav item.

**Code scope:** `SettingsPage.tsx`, `BackupPage.tsx` (convert to section component), router, nav config — LOW-MEDIUM complexity.

---

## 17. Onboarding Page

### 17.1 Onboarding Flow — Full-Screen, Step-Progress — MEDIUM impact / LOW complexity / visual

**Problem:** `OnboardingPage` is rendered as a standard app page with header and bottom nav. For a first-launch experience this is distracting — the user sees navigation to areas they cannot use yet.

**Fix:**
- Render Onboarding **without** `AppLayout` — a standalone full-screen view that uses the full 800 px height.
- Add a step progress bar at the top (e.g., "Step 2 of 4").
- Each step fills the screen with a single large illustration + heading + 1–2 inputs.
- Use swipe-right gesture to go back between steps.
- After the last step, animate transition to Dashboard with a brief "Welcome" splash.

**Code scope:** Router config (exclude onboarding from `AppLayout`), `OnboardingPage.tsx`, `OnboardingFlow.tsx` — MEDIUM complexity.

---

### 17.2 CreateUserDialog — Single-Screen for Onboarding — LOW impact / LOW complexity / restructure

**Problem:** `CreateUserDialog` is a multi-step wizard. When called during Onboarding the steps feel redundant with onboarding steps already on screen.

**Fix:** When called from Onboarding, use an inline form within the onboarding step rather than a dialog-over-dialog pattern. When called from Settings, keep the existing dialog/wizard.

**Code scope:** `CreateUserDialog.tsx` — add `context: 'onboarding' | 'settings'` prop — LOW complexity.

---

## 18. Suggested New Pages/Features

### 18.1 Rename Dashboard to "Today" — HIGH impact / LOW complexity / new-feature

**Problem:** "Dashboard" is an abstract word. A single user thinks in terms of "what am I doing today?". Rename to **"Today"** and focus the page purely on today's context: today's planned session, yesterday's session as quick reference, and today's body metrics. Move the multi-month calendar to an "Activity" sub-page or tab.

---

### 18.2 Session Pre-Briefing Screen — MEDIUM impact / MEDIUM complexity / new-feature

**Problem:** Starting a session jumps directly into active logging with no orientation moment. The user has no view of what exercises are planned and what was the last performance on each before the timer starts.

**Fix:** Add a **"Ready to Train"** screen (between "Start Session" and the active session): a card per planned exercise showing the exercise name, last session's key set (e.g., "Last time: 80 kg × 5 @ RPE 7"), and today's suggested target. A single large "Begin" button starts the timer. Auto-advances after 10 seconds if untouched.

**Code scope:** New `SessionBriefingPage.tsx` or bottom sheet, route between WorkoutDetail/Dashboard and ActiveSession — MEDIUM complexity.

---

### 18.3 Quick Log — Minimum-Friction Session — HIGH impact / HIGH complexity / new-feature

**Problem:** Users training without a fixed plan (free sessions, accessory work) face 3+ steps to log anything: `WorkoutCreate` → `SessionDetail` → plan exercises → `ActiveSession`. Many spontaneous logs never happen because of this friction.

**Fix:** Add a **"Quick Log"** FAB on the Dashboard (or from the bottom nav "Train" button when no session is active): opens a streamlined view where the user picks exercises one by one and logs sets immediately, with no pre-planning. Saved as a "freestyle" history entry. No template required.

**Code scope:** New `QuickLogSheet.tsx`, integration with existing session infrastructure — HIGH complexity.

---

### 18.4 Merged "Progress" Tab in Workout Detail — MEDIUM impact / MEDIUM complexity / new-feature

**Problem:** From a workout's detail page the user cannot see how they have progressed on this specific plan over time. This analysis exists in Analytics but is not contextualised to a single workout plan.

**Fix:** Add a "Progress" tab in `WorkoutDetail` showing: last 8 sessions on this workout, volume trend chart, key exercise 1RM trends, and compliance percentage. Data scoped to this workout only.

**Code scope:** New analytics hooks scoped to workout ID, `WorkoutDetail.tsx` tab — HIGH complexity (data layer).

---

## 19. Summary Priority Matrix

| ID | Change | Impact | Complexity | Type |
|----|--------|--------|------------|------|
| 1.9 | Haptic feedback on set completion | HIGH | LOW | interaction |
| 1.1 | Touch target minimum 48 px | HIGH | LOW | layout |
| 1.2 | Safe-area insets consistency | HIGH | LOW | layout |
| 1.4 | Remove header / reduce to 40 px | HIGH | LOW | layout |
| 1.3 | Bottom nav: 4 items + active session | HIGH | MEDIUM | navigation |
| 1.10 | Keyboard avoidance / inputMode | HIGH | MEDIUM | interaction |
| 8.1 | SetInputWidget: drum roller + swipe-complete | HIGH | HIGH | interaction |
| 8.4 | Replace dual FABs with session action bar | HIGH | MEDIUM | layout |
| 8.2 | Rest timer as sticky header banner | HIGH | LOW | interaction |
| 3.1 | Dashboard hero card (merge greeting + CTA) | HIGH | MEDIUM | layout |
| 2.2 | Android back button (Capacitor) | HIGH | MEDIUM | navigation |
| 4.3 | WorkoutCard long-press for mgmt actions | HIGH | MEDIUM | interaction |
| 5.1 | WorkoutCreate → bottom sheet | HIGH | MEDIUM | restructure |
| 12.3 | Charts: horizontal scroll + pinch zoom | HIGH | MEDIUM | interaction |
| 15.1 | Danger zone → separate sub-page | HIGH | LOW | interaction |
| 9.1 | Exercise filters as bottom sheet | HIGH | MEDIUM | interaction |
| 18.3 | Quick Log (freestyle session) | HIGH | HIGH | new-feature |
| 8.3 | Active group always visible (no accordion) | MEDIUM | MEDIUM | layout |
| 8.5 | Load suggestion → inline card | MEDIUM | MEDIUM | restructure |
| 13.2 | Merge 1RM into Analytics "Strength" tab | MEDIUM | MEDIUM | restructure |
| 16.1 | Backup → Settings sub-section | MEDIUM | LOW | restructure |
| 18.2 | Session pre-briefing screen | MEDIUM | MEDIUM | new-feature |
| 1.6 | Typography min sizes | MEDIUM | LOW | visual |
| 1.8 | Action-oriented empty states | MEDIUM | LOW | visual |
| 3.2 | Calendar → week strip | MEDIUM | MEDIUM | layout |
| 6.3 | Volume analysis → inline tab | MEDIUM | MEDIUM | restructure |
| 17.1 | Onboarding standalone (no layout) | MEDIUM | MEDIUM | visual |

---

## 20. Phased Implementation Recommendation

### Phase 1 — Quick Wins (1–3 days each, no architecture changes)
1.1, 1.2, 1.4, 1.6, 1.8, 1.9, 2.3, 3.4, 4.4, 6.4, 8.6, 8.7, 8.9, 8.10, 10.3, 12.1, 12.4, 15.1, 16.1

### Phase 2 — Core Mobile UX (1–2 weeks each, moderate complexity)
1.3, 1.10, 2.2, 3.1, 3.2, 3.3, 4.3, 5.1, 7.1, 7.2, 8.2, 8.3, 8.4, 8.5, 8.8, 9.1, 9.3, 12.2, 12.3, 13.1, 13.2, 17.1

### Phase 3 — High-Value New Features (2–4 weeks each, significant scope)
8.1, 18.1, 18.2, 18.3, 18.4, 9.2, 6.1

---

*All measurements are in CSS pixels at the 3× device pixel ratio of a 2400 × 1080, 6-inch Android screen (~360 × 800 px CSS viewport). Usable content area after system chrome is approximately 360 × 616 px.*
