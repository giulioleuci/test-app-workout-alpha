# Workout Tracker — Pages and Component Catalog

This document catalogs every page and its significant sub-components. For each page, it describes: purpose, data displayed, user actions, component hierarchy, and conditional visibility rules.

---

## Application Shell

### AppLayout

The persistent outer frame that wraps all main pages.

**Components**:
- `AppHeader`: Top bar on mobile; displays the current page title and optional back navigation.
- `DesktopSidebar`: Left-side navigation visible on larger screens. Shows all main navigation links with icons.
- `MobileBottomNav`: Fixed bottom navigation bar on mobile. Shows icons for Dashboard, Workouts, Active Session, Analytics, and More.
- `UserGate`: Guards access to the app. Before a user is selected, renders the `UserSelectionPage`. After a user is active, renders the main application.

**Navigation links**: Dashboard, Workouts, Exercise Library, History, Analytics, 1RM, Profile, Backup, Settings.

---

## Onboarding Page

**Route**: Shown before any main page if no user profile exists.

**Purpose**: First-time setup to create the user's profile and optionally seed sample data.

**Steps**:

### Step 1 — Personal Info
Fields:
- Name (required, text, max 100 chars)
- Gender (required, select: male / female / undisclosed)
- Weight in kg (optional, numeric, range 20–300, step 0.1)

Validation: Name must be non-empty, gender must be selected. Proceed button is disabled until both are filled.

### Step 2 — Starter Content
Checkboxes:
- "Seed exercise library" (enabled by default; disabling it also disables all plan options)
- "Full Body plan" (disabled if exercises not seeded)
- "Push Pull Legs plan" (disabled if exercises not seeded)
- "Upper/Lower plan" (disabled if exercises not seeded)

**Behavior**: On completion, creates the user profile, creates a body weight record if weight was entered, optionally seeds the exercise library and selected workout plans, then transitions to the main app.

**Visual**: Single centered card with a 2-step progress indicator.

---

## User Selection Page

**Route**: Shown when no user is active (first launch or after logout).

**Purpose**: Let the user choose which profile to log in as, or create a new one.

**Components**:
- `UserSwitcher`: Displays a list of existing users (avatar color, name). Tapping a user with a PIN opens `PinEntryDialog`. Tapping a user without a PIN immediately activates them.
- `CreateUserDialog`: Modal form for creating a new user (name, optional PIN, avatar color selected from palette).
- `PinEntryDialog`: A 4–6 digit PIN entry screen (OTP-style input). On correct entry, activates the user. On failure, shows error.

**Data displayed**: List of all GlobalUsers with avatars.

---

## Dashboard

**Route**: `/` (root)

**Purpose**: Home screen providing a training snapshot and quick actions.

**Component hierarchy**:

### DashboardGreeting
Personalized greeting with the user's name and time since last workout (e.g., "Last trained 3 days ago" or "Train today!").

### NextSessionSuggestionCard
Displayed only if an active workout plan exists.
- Shows: planned session name, workout name, session index in rotation (e.g., "2/3"), estimated duration, focus muscle groups, equipment required, set count range, and volume analysis badges.
- Action: "Start Session" button. On tap, enters the two-phase session activation flow.

### LastWorkoutSummaryCard
Displayed only if at least one completed session exists.
- Shows: session name, workout name, date, duration, total volume, average RPE (hidden in simple mode), exercise list with set counts and best loads.
- Primary muscles displayed as chips.

### TrainingCalendar
A monthly calendar view marking days with completed sessions. Navigation arrows to move between months.
- Each marked day shows a dot. Tapping shows a tooltip with session names.

### MuscleFreshnessList
A scrollable list of all muscles with their freshness status.
- Each entry: muscle name, last trained timestamp (e.g., "2 days ago") or "Never trained".
- Color-coded by recency: recent = green/warm, stale = gray/cool.
- Sorted by most recently trained first.

### ConsistencyHeatmap
A GitHub-style heatmap of the past 365 days. Each cell represents a day; color intensity represents the number of sessions completed that day (0 = neutral, 1 = light, 2+ = dark).

### QuickStatsGrid
A small grid of summary counts: total exercises in library, number of workout plans, presence of a next session suggestion, presence of a last workout.

**Dialogs**:
- `PendingSessionDialog`: If an in-progress session exists, prompts user to resume or discard it before starting a new one.
- `SubstitutionConfirmDialog`: If the session has substitution history, asks whether to repeat the previous substitutions.

---

## Exercise List Page

**Route**: `/exercises`

**Purpose**: Browse, search, filter, create, and edit exercises in the library.

**Components**:

### Toolbar Area
- Search input (text filter by exercise name).
- Sort select: A–Z, Z–A, type (compound first / isolation first).
- Filter toggle button showing/hiding a filter panel.

### Filter Panel (collapsible)
- Equipment multi-select checkboxes (all Equipment enum values).
- Muscle multi-select checkboxes (all Muscle enum values).
- Movement pattern multi-select checkboxes (all MovementPattern enum values).

### ExerciseCsvToolbar
Buttons for: export exercises as CSV, import exercises from CSV file.
On import, opens `CsvConflictDialog` if name conflicts are detected.

### ExerciseCard (per exercise)
Displays: name, type badge, primary muscles list, equipment list, counter type.
Actions: Edit button (opens ExerciseForm dialog), Archive toggle.

### ExerciseForm (dialog)
Form for creating or editing an exercise. Fields:
- Name (required)
- Type (compound / isolation)
- Primary muscles (multi-select from Muscle enum)
- Secondary muscles (multi-select from Muscle enum)
- Equipment (multi-select from Equipment enum, via `EquipmentSelector` component)
- Movement pattern (select)
- Counter type (select)
- Default load unit (kg / lbs)
- Notes (textarea)
- Description (textarea)
- Key points (textarea)
- Variants (multi-select from existing exercises, via `ExercisePicker`)

### ExercisePicker (sub-component of ExerciseForm)
A searchable list for picking exercises. Includes `ExercisePickerSearch` and `ExercisePickerResults`.

### Pagination
`ListPagination` at bottom (20 items per page).

### FAB
Floating action button to create a new exercise.

---

## Workout List Page

**Route**: `/workouts`

**Purpose**: List all workout plans; navigate to create or view a workout.

**Component**: `WorkoutCard` per workout.
- Shows: name, description, status badge (active/inactive/archived), objective type, work type, session count.
- Actions: Navigate to detail, activate/deactivate, archive.

### WorkoutCsvToolbar
Export and import workout plans as CSV.

### FAB
Floating action button to create a new workout (routes to Workout Create page).

---

## Workout Create Page

**Route**: `/workouts/new`

**Purpose**: Create a new workout plan.

**Form fields**:
- Name (required)
- Description (optional)
- Objective type (select, all ObjectiveType values)
- Work type (select, all WorkType values)

On save: creates the workout and navigates to its detail page.

---

## Workout Detail Page

**Route**: `/workouts/:id`

**Purpose**: View and manage the sessions within a workout plan. The primary workout planning interface.

**Component hierarchy**:

### WorkoutHeader
Shows: workout name, description, status, objective type, work type, aggregate duration estimate.
Action: Edit button (opens `EditWorkoutDialog`).

### EditWorkoutDialog
Modal form to edit workout name, description, objective type, and work type.

### WorkoutActions
A button bar with secondary actions:
- Import Template (opens ImportTemplateDialog)

### SessionList
A reorderable list of `PlannedSession` cards.

Each session card shows:
- Session name, day number, focus muscle groups.
- Estimated duration.
- Up/Down reorder buttons.
- Context menu with: Edit properties, Duplicate, Save as Template, View Volume, Delete.
- "Start" button → triggers two-phase session activation.

### EditSessionPropertiesDialog
Modal to edit session name and notes.

### ImportTemplateDialog
Shows a list of saved `SessionTemplate` records. User selects one to import into this workout.

### SaveAsTemplateDialog
Text input for the template name. On confirm, serializes the session and creates a template.

### SessionVolumeDialog
Shows the volume analysis for a single session: by muscle, muscle group, movement pattern, and objective. Each with a bar visualization of the set-count range.

### UnsavedChangesBar
A persistent bottom bar that appears when session ordering has been modified but not saved. Shows "Save" and "Discard" buttons. If the user attempts to navigate away with unsaved changes, shows a navigation-blocking confirmation dialog with three options: Save and leave, Leave without saving, Cancel.

### FAB
Floating action button to add a new session.

**State notes**: Session reordering is done in-memory. Changes are only persisted on explicit "Save" action.

---

## Session Detail Page

**Route**: `/workouts/:id/sessions/:sessionId`

**Purpose**: View and configure the exercises, groups, and sets within a single planned session. This is the primary session planning interface.

**Component hierarchy**:

### SessionDetailHeader
Shows: session name, focus muscle groups, notes.
Actions: Edit session properties, view volume analysis.

### ExerciseGroupCard (per group)
Displays and manages one exercise group.
- Shows: group type badge, optional notes.
- Contains a list of exercise items.
- Actions: Add exercise item, delete group, reorder group.

Each exercise item within the group shows:
- Exercise name, counter type, modifiers (e.g., "Cluster", "Drop Set").
- List of `PlannedSetCard` entries.
- Actions: Add set, delete item, reorder item, swap exercise.

### PlannedSetCard
Shows the parameters of one planned set block:
- **PlannedSetHeader**: set type badge, set count range (e.g., "3–5 sets").
- **PlannedSetCountsSection**: rep/duration count range.
- **PlannedSetLoadSection**: load range or % 1RM range.
- **PlannedSetRpeSection**: RPE range (hidden in simple mode).
- **PlannedSetClusterSection**: Cluster mini-set parameters (if cluster modifier active).
- All fields are inline-editable.

### WarmupConfigDialog
Accessible from an exercise item. Allows configuring a custom warmup scheme: list of warmup sets each with percentage of working weight, reps, and rest seconds.

### SessionVolumeDialog (same as above)
Volume analysis for this specific session.

### SessionVolumeAnalysis / VolumeAnalysisDialog
Expandable inline volume view or full-screen dialog showing volume by muscle, muscle group, movement pattern, and objective as bar charts.

### MuscleOverlapMatrix
Shows which muscles are shared across the sessions of the workout plan — a matrix of session names vs. muscles, showing overlap.

### ItemSettingsDialog
Settings for a specific exercise item: counter type override, modifiers configuration.

### SessionDetailPropertiesDialog
Edit session name and notes inline.

### FAB
"Add Group" button. Opens a picker for group type, then creates the group.

**Unsaved changes**: The session detail page uses the same `UnsavedChangesBar` pattern — changes are accumulated in memory and persisted on explicit save.

---

## Active Session Page

**Route**: `/session/active`

**Purpose**: Real-time workout execution interface. The central feature of the application.

For the full description of this page, see **05_active_session.md**.

---

## History List Page

**Route**: `/history`

**Purpose**: Browse all completed workout sessions in reverse chronological order.

**Components**:
- Date-grouped list of `HistorySessionCard` entries.
- Each card shows: session name, workout name, date, duration, total sets, total volume, primary muscles.
- Tapping a card navigates to History Detail.
- Filter/search by date range or workout.

---

## History Detail Page

**Route**: `/history/:id`

**Purpose**: View the full detail of a completed workout session.

**Components**:

### SessionMetaCard
Summary block: start/end time, total duration, total sets, total volume, total reps, average RPE, overall RPE, primary and secondary muscles.

### ExerciseGroupCard (read-only per group)
Shows completed group with group type badge.

### HistoryItemRow (per exercise item)
Shows exercise name, performance trend badge.
Contains list of `SetRow` entries.

### SetRow (per set)
Shows: set type, actual load, actual count, actual RPE, to-failure indicator, compliance badge (color-coded), fatigue progression badge, partials, forced reps, notes.

---

## Analytics Page

**Route**: `/analytics`

**Purpose**: Aggregated performance analytics over a configurable date range.

**Components**:

### AnalyticsFilters
- Date range preset selector: 1 week, 4 weeks, 12 weeks, 26 weeks, 52 weeks, All time, Custom.
- Custom date range pickers (from date, to date).
- Optional workout filter (select from plans).
- Optional session filter (within selected workout).
- Optional planned group filter.
- Optional planned exercise item filter.

### Summary Cards
Three quick-stat cards: total sessions, total sets, overall compliance percentage.

### AnalyticsToolsSection
Links/buttons for advanced analytical tools: Intensity Calculator, Theoretical Performance Matrix, 1RM vs Body Weight chart.

### Tab Bar (4 tabs)

#### Volume Tab — VolumeSection
- Bar chart: volume (weighted sets) by muscle.
- Bar chart: volume by muscle group.
- Bar chart: volume by movement pattern.
- Bar chart: objective distribution.
- Summary: total sets, average sets per week, most/least trained muscle.

#### Load Tab — LoadSection
- Exercise selector dropdown.
- Line chart: average and maximum load over time for the selected exercise.
- History estimate card (e1RM estimate from most recent valid set).
- 1RM records table for the exercise.
- 1RM vs Body Weight chart (`OneRMvsBodyWeightSection`).

#### Compliance Tab — ComplianceSection
- Donut/bar chart: compliance distribution (fullyCompliant, withinRange, belowMinimum, aboveMaximum, incomplete).
- Average compliance percentage with trend arrow.
- Weekly frequency chart with target line.
- Total sessions count.
- Average sessions per week.

#### RPE Tab — RPESection
- Scatter or line chart: expected vs actual RPE per set over time.
- Average RPE deviation.
- Percentage of sets within ±0.5 RPE of target.
- RPE trend indicator.

### Inline Tools (modal or separate screen)

#### IntensityCalculator
Input: load, reps, RPE. Output: e1RM estimate using all five formulas, with weighted average.

#### TheoreticalPerformanceMatrix
Input: 1RM value. Output: a matrix of loads × reps organized by RPE level.

---

## 1RM Page

**Route**: `/1rm`

**Purpose**: Manage one-rep max records for all exercises.

**Components**:

### OneRepMaxFilters
- Search by exercise name.
- Sort: A–Z, Z–A, load descending, load ascending.
- Filter by method: all, direct, indirect, estimated (from history).
- Toggle: "Show estimates from history" — triggers the history estimator to compute e1RM for all exercises.

### OneRepMaxCard (per exercise)
Expandable card showing:
- Exercise name.
- Latest 1RM value with unit, method badge, date.
- Optional: e1RM estimate from history (load, reps, RPE, date).
- Optional: relative intensity (1RM / body weight).
- History list (`OneRepMaxHistoryRow`): all records with date, value, method, edit/delete actions.
- Action: Add record button.

### OneRepMaxRecordDialog
Modal form for adding or editing a 1RM record:
- Exercise picker.
- Method: direct or indirect.
- If direct: value and unit.
- If indirect: tested load, reps, unit → computes estimates using all five formulas, shows comparison table.
- Record date.
- Notes.

### FAB
Floating action button to add a new 1RM record.

---

## Profile Page

**Route**: `/profile`

**Purpose**: Manage the user's personal profile and body weight history.

**Components**:

### ProfileInfoSection
Shows: name, gender, avatar color. Inline editing of name and gender.

### WeightTrackingSection
A chronological list of `BodyWeightRecord` entries.
Each entry: date, weight in kg, optional notes.
Actions: Edit (opens `WeightEditDialog`), delete (with confirmation).

Input area: Add new weight entry with today's date pre-filled.

### WeightEditDialog
Modal to edit an existing body weight record: weight, date, notes.

---

## Settings Page

**Route**: `/settings`

**Purpose**: Configure application behavior and manage data.

**Tab: Preferences**

### RegulationSettingsSection
- **Load suggestion method**: select (Percentage 1RM / Last Session / Planned RPE).
- **Fatigue sensitivity**: select (Low / Medium / High).
- **Auto-start rest timer**: toggle.
- **Simple mode**: toggle (hides RPE, compliance, and advanced metrics).

### Tab: Appearance

### AppearanceSettingsSection
- **Theme**: Light / Dark / System.
- **Color palette**: Select from predefined color palette options (applied to accent colors).

---

### DangerZoneSection (below tabs)
- **Reset database**: Clears all data for the current user (requires confirmation dialog).
- **Selective delete**: Checkboxes for each data category; deletes only the selected categories (requires confirmation).

### DeveloperToolsSection (below Danger Zone)
- **Load fixtures**: Re-inserts the predefined sample exercise and plan data (requires confirmation).

All destructive actions show a confirmation `AlertDialog` before executing.

---

## Backup Page

**Route**: `/backup`

**Purpose**: Export and import application data.

**Components**:

### Export Section
- Checkboxes for each export category: Exercises, Workouts, Sessions, 1RM Records, User Profile, Regulation Profile, Templates.
- "Select All" toggle.
- "Download Backup" button: exports selected categories (or all if none specifically selected) as JSON file. On native platforms, uses the native share/save sheet.

### Import Section
- File picker area (drag-and-drop style or native file picker).
- After file selection: shows filename, total record count, breakdown by table.
- If conflicts detected: shows a warning list per table with conflict counts.
- "Import" button.

### Conflict Resolution Dialog
Appears only when conflicts are detected. Three strategy options:
1. **Copy as new**: import everything, conflicting records get new IDs.
2. **Skip conflicts**: import only records without conflicts.
3. **Overwrite**: conflicting records replace existing data.

Each option has a description of its behavior.

---

## Template Edit Page

**Route**: `/templates/:templateId/edit`

**Purpose**: View and edit a saved session template.

**Components**:

### TemplateHeader
Shows template name and description. Edit button for `TemplateEditPropertiesDialog`.

### TemplateGroupCard (per group)
Shows groups and items in the template with the same structure as Session Detail.

### TemplateEditPropertiesDialog
Edit template name and description.

---

## Error / Not Found Page

**Route**: `*` (catch-all)

Displays a simple "Page not found" message with a link back to the dashboard.
