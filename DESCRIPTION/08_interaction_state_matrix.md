# Workout Tracker — Interaction and State Matrix

This document maps every significant user interaction to its resulting system behavior, state transitions, and UI feedback. It is organized by page/component.

---

## Dashboard

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| NextSessionSuggestionCard | Tap "Start Session" | Run Phase 1 session activation (check substitution history) | Launching = true, spinner on button | Button shows loading state |
| NextSessionSuggestionCard | Phase 1 finds substitutions | Show SubstitutionConfirmDialog | Dialog open | Modal appears |
| SubstitutionConfirmDialog | Confirm choices | Run Phase 2 activation with choices | Session created in DB, navigate to /session/active | Navigate |
| SubstitutionConfirmDialog | Cancel | Abort activation | Launching = false | Modal closes |
| PendingSessionDialog | Tap "Resume" | Navigate to /session/active | — | Navigate |
| PendingSessionDialog | Tap "Discard and Start New" | Discard old session, run Phase 2 activation | Old session deleted | Navigate to new session |
| PendingSessionDialog | Tap "Cancel" | Close dialog | Launching = false | Modal closes |
| TrainingCalendar | Tap day with sessions | Show tooltip with session names | Tooltip visible | Tooltip appears |
| TrainingCalendar | Tap navigation arrow | Advance or retreat month | Month changes | Calendar re-renders |
| LastWorkoutSummaryCard | (no actions, read-only) | — | — | — |
| MuscleFreshnessList | (no actions, read-only) | — | — | — |
| ConsistencyHeatmap | Tap cell | Show tooltip with date and session count | Tooltip visible | Tooltip appears |

---

## Exercise List Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| Search Input | Type text | Filter exercise list | `search` state updated | List updates live |
| Sort Select | Change sort | Re-sort list | `sortKey` state updated | List re-renders |
| Filter Toggle | Tap | Show/hide filter panel | `showFilters` toggled | Panel expands/collapses |
| Equipment / Muscle / Movement checkboxes | Toggle | Filter list | Filter states updated | List updates live |
| ExerciseCsvToolbar | Tap "Export CSV" | Export all exercises to CSV file | — | File download triggered |
| ExerciseCsvToolbar | Tap "Import CSV" → select file | Parse CSV, detect name conflicts | `conflicts` state set | CsvConflictDialog if conflicts |
| CsvConflictDialog | Select strategy and confirm | Import with chosen strategy | Exercises inserted/updated | Toast with counts, list refresh |
| ExerciseCard | Tap "Edit" | Open ExerciseForm in edit mode | `editingExercise` state set, dialog open | Dialog appears with pre-filled values |
| ExerciseCard | Tap "Archive" | Set `isArchived = true` | Exercise removed from active list | List updates |
| ExerciseForm | Submit (create) | Create new Exercise record | Exercise added to DB | Dialog closes, list refreshes |
| ExerciseForm | Submit (edit) | Update Exercise, create ExerciseVersion snapshot | Exercise updated in DB | Dialog closes, list refreshes |
| ExerciseForm | Close / Cancel | Discard form changes | `editingExercise` cleared, dialog closed | Dialog closes |
| FAB | Tap | Open ExerciseForm in create mode | `dialogOpen = true` | Dialog opens empty |
| ListPagination | Tap page | Load next/prev page | `page` state updated | List shows new page |

---

## Workout List Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| WorkoutCard | Tap card | Navigate to /workouts/:id | — | Navigate |
| WorkoutCard | Tap "Activate" | Set workout status to `active`, set others to `inactive` | DB updated | Status badge changes |
| WorkoutCard | Tap "Archive" | Set workout status to `archived` | DB updated | Workout disappears from active list |
| WorkoutCsvToolbar | Export | Export workout structure as CSV | — | File download |
| WorkoutCsvToolbar | Import | Parse CSV, create workout hierarchy | DB updated | Toast, list refresh |
| FAB | Tap | Navigate to /workouts/new | — | Navigate |

---

## Workout Create Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| Form | Enter name (empty) → Submit | Validation blocks submission | — | Error message shown |
| Form | Submit with valid data | Create PlannedWorkout | DB updated | Navigate to /workouts/:id |

---

## Workout Detail Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| WorkoutHeader | Tap "Edit" | Open EditWorkoutDialog | Dialog open | Modal appears |
| EditWorkoutDialog | Submit changes | Update PlannedWorkout fields | DB updated | Dialog closes, toast "Saved" |
| WorkoutActions | Tap "Import Template" | Open ImportTemplateDialog | Dialog open | Modal with template list |
| ImportTemplateDialog | Select template → Tap "Import" | Create new session from template | DB updated, sessions reload | Dialog closes, toast "Imported" |
| SessionCard | Tap card body | Navigate to /workouts/:id/sessions/:sessionId | — | Navigate |
| SessionCard | Tap "Start" | Initiate two-phase session activation | Launching state | Navigate to /session/active |
| SessionCard | Tap Up/Down arrow | Swap session orderIndex with neighbor | In-memory sessions reordered | UnsavedChangesBar appears, list re-renders |
| SessionCard context menu | "Edit Properties" | Open EditSessionPropertiesDialog | `editingSession` state set | Modal appears |
| EditSessionPropertiesDialog | Submit | Update session name and notes in-memory | In-memory sessions updated | Dialog closes |
| SessionCard context menu | "Duplicate" | Clone session (DB operation, bypasses unsaved state) | Session added to DB, list reloads | Toast "Duplicated" |
| SessionCard context menu | "Save as Template" | Open SaveAsTemplateDialog | `savingSessionId` set, dialog open | Modal appears |
| SaveAsTemplateDialog | Enter name → Confirm | Serialize session to template, save | Template created in DB | Dialog closes, toast "Saved as template" |
| SessionCard context menu | "View Volume" | Open SessionVolumeDialog | `volumeSession` set, dialog open | Volume dialog appears |
| SessionCard context menu | "Delete" | Remove session from in-memory list | `sessions` state updated | UnsavedChangesBar appears |
| UnsavedChangesBar | Tap "Save" | Persist all in-memory session changes | DB updated, `isDirty = false` | Toast "Saved", bar disappears |
| UnsavedChangesBar | Tap "Discard" | Revert to last persisted sessions | In-memory reset | Toast "Discarded", bar disappears |
| UnsavedChangesBar | Nav blocked → Tap "Save and Leave" | Save then navigate | DB updated, navigate | — |
| UnsavedChangesBar | Nav blocked → Tap "Leave Without Saving" | Discard then navigate | In-memory reset, navigate | — |
| UnsavedChangesBar | Nav blocked → Tap "Cancel" | Stay on page | — | Dialog closes |
| FAB | Tap | Add new empty session to in-memory list | `sessions` state updated | New session card appears, UnsavedChangesBar appears |

---

## Session Detail Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| SessionDetailHeader | Tap "Edit Properties" | Open SessionDetailPropertiesDialog | Dialog open | Modal appears |
| SessionDetailPropertiesDialog | Submit | Update session name/notes | In-memory update | Dialog closes |
| SessionDetailHeader | Tap "Volume" | Open SessionVolumeDialog | Dialog open | Volume dialog appears |
| ExerciseGroupCard | Tap "Delete Group" | Remove group and all its items from in-memory state | State updated | Group disappears, UnsavedChangesBar |
| ExerciseGroupCard | Tap "Reorder" (up/down) | Swap group orderIndex | State updated | Group moves |
| ExerciseGroupCard | Tap "Add Exercise" | Open ExercisePicker | Picker open | Picker sheet/modal |
| ExercisePicker | Select exercise | Add exercise item to group | Item added to state | Picker closes, item appears |
| PlannedExerciseItem | Tap "Delete Item" | Remove item from group | State updated | Item disappears |
| PlannedExerciseItem | Tap "Reorder" | Swap item orderIndex | State updated | Item moves |
| PlannedExerciseItem | Tap "Swap Exercise" | Open ExercisePicker for replacement | Picker open | Picker appears |
| PlannedExerciseItem | Tap "Warmup Config" | Open WarmupConfigDialog | Dialog open | Modal appears |
| WarmupConfigDialog | Add / Edit / Delete warmup sets | Update warmupSets on item | State updated | Warmup list updates |
| PlannedSetCard | Edit any field inline | Update PlannedSet parameters | State updated | UnsavedChangesBar |
| PlannedSetCard | Tap "Delete" | Remove set block | State updated | Set block disappears |
| PlannedSetCard | Tap "Add Set" | Duplicate the set block with default values | New set block added | New card appears |
| ItemSettingsDialog | Submit | Update counterType and modifiers on item | State updated | Dialog closes |
| FAB | Tap | Open group type picker; on selection, add new empty group | State updated | New group card appears |
| UnsavedChangesBar | (same as Workout Detail pattern) | | | |

---

## Active Session Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| SessionHeader | Tap "Discard" | Confirmation dialog appears | — | Dialog shown |
| SessionHeader Discard Dialog | Confirm | Session Discard Service runs | Session deleted from DB | Navigate to Dashboard |
| SessionHeader Discard Dialog | Cancel | Dialog closes | — | Return to session |
| LoadSuggestionBadge | Tap | Open LoadSuggestionDialog | Dialog open | Modal with all suggestions |
| LoadSuggestionDialog | Tap a suggestion | Pre-fill load field with that value | `actualLoad` field updated | Dialog closes, field shows value |
| SetInputValues — Load field | Edit value | Update displayed load | Local input state | Field updates |
| SetInputValues — Count field | Edit value | Update displayed count | Local input state | Field updates |
| RPESelector | Tap a value | Update RPE selection | Local input state | Selected value highlighted |
| SetInputExtras — Failure indicator | Select value | Update failure selection | Local input state | Selected option highlighted |
| SetInputExtras — Partials toggle | Toggle | Toggle partials flag | Local input state | Toggle visual changes |
| SetInputExtras — Forced reps | Increment/decrement | Update forced reps count | Local input state | Counter updates |
| SetInputActions — "Complete Set" | Tap | Write set to DB, compute compliance, update fatigue, advance navigator, start rest timer (if auto) | `current` advances, set marked complete, badges update | Compliance badge appears, timer starts |
| SetInputActions — "Skip Set" | Tap | Mark set as skipped, advance navigator | `current` advances | Set shows skipped state |
| SetInputActions — "Uncomplete" | Tap | Mark last completed set as incomplete | Set reverts, `current` returns | Set re-opens for input |
| RestTimer | Runs to 0 | Trigger notification/vibration | Timer expired | Audible/haptic alert |
| RestTimer — "+30s" / "+1min" | Tap | Add time to current countdown | Timer extended | Timer updates |
| RestTimer — "Skip" | Tap | Dismiss timer immediately | Timer cleared | Timer disappears |
| RestTimerStartControl | Tap | Start manual rest timer | Timer started | Timer appears |
| ExerciseHistoryButton | Tap | Open ExerciseInfoModal with history data | Modal open | Historical sets displayed |
| ExerciseInfoModal | Close | — | Modal closed | Modal disappears |
| WarmupCalculator | Tap trigger | Open warmup sheet with calculated scheme | Sheet open | Warmup weights displayed |
| SessionItemHeader — "Swap" | Tap | Open SwapExerciseSheet | Sheet open | Exercise picker appears |
| SwapExerciseSheet | Select exercise | Replace exercise on item, record substitution, may show SubstitutionConfirmDialog | Item updated in DB | Sheet closes, exercise name updates |
| SubstitutionConfirmDialog | Confirm "Save for future" | ExerciseSubstitution record saved | Substitution persisted | Dialog closes |
| SubstitutionConfirmDialog | Decline | No substitution record saved | — | Dialog closes |
| SessionItemHeader — "Remove" | Tap | Remove exercise item (and all its sets) from session | Item deleted from DB | Item disappears from UI |
| SetCountAdvisorCard | (read-only) | — | — | — |
| InterleavedGroupRenderer — "Complete Round" | Tap | Skip remaining sets in round, advance to next round | Sets marked skipped, round counter increments | Next round begins |
| InterleavedGroupRenderer — "Skip Round" | Tap | Mark all sets in current round as skipped | Sets skipped, round counter increments | Round advances |
| InterleavedGroupRenderer — "Skip Remaining Rounds" | Tap | Mark all remaining rounds as skipped | All remaining sets skipped | Group marked complete |
| SequentialGroupRenderer — "Add Set" | Tap | Append new set to exercise item | New SessionSet created in DB | New set input appears |
| SequentialGroupRenderer — "Skip Remaining Sets" | Tap | Skip all incomplete sets for this item | Sets marked skipped | Item moves to completed |
| InterleavedGroupRenderer — "Add Round" | Tap | Append one more round (one new set per item) | New SessionSets created in DB | Round count increments |
| UpcomingExercisesAccordion — Tap unit | Activate unit | Re-order display to bring selected unit forward | `activeUnits` reordered | Selected unit becomes Current Unit |
| CompletedExercisesAccordion — "Activate" | Tap | Bring completed unit back to current position | Unit moves from completed to active | Unit re-renders in Current Unit area |
| CompletedExercisesAccordion — "Undo Last Set" | Tap | Uncomplete the most recent set in that unit | Set reverted to incomplete | Unit moves back to active |
| SessionCompletionCard — "End Session" | Tap | If unresolved sets: show UnresolvedSetsDialog; else: run finisher | Dialog or finisher triggered | Progress indicator |
| UnresolvedSetsDialog — "Skip all and finish" | Tap | Mark all incomplete sets as skipped; run finisher | Session completed in DB | Navigate to Dashboard |
| UnresolvedSetsDialog — "Cancel" | Tap | Return to session | Dialog closed | Session remains active |
| Quick Add FAB | Tap | Open QuickAddSheet | Sheet open | Sheet appears |
| QuickAddSheet — "Add Exercise" | Select exercise | Add new Standard group + item + default sets to session | DB updated | New exercise appears in upcoming |
| QuickAddSheet — "Add Superset" | Select exercises | Add new Superset group + items to session | DB updated | New superset appears in upcoming |
| Save FAB | Tap | Same as SessionCompletionCard "End Session" | — | — |

---

## History Detail Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| All sections | (read-only) | — | — | — |

---

## Analytics Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| Date range preset | Select | Compute from/to dates, reload analytics | Date state updated, query re-fires | Loading skeleton → data |
| Custom date pickers | Select date | Update from/to dates, reload analytics | Date state updated | — |
| Workout filter | Select workout | Reload analytics for that workout | `workoutId` state updated | Data filtered |
| Session filter | Select session | Reload analytics for that session | `sessionId` state updated | Data filtered |
| Tab bar | Switch tab | Show relevant section | Active tab changes | Section fades in |
| LoadSection exercise selector | Select exercise | Show load progression for that exercise | `selectedExercise` updated | Chart updates |
| IntensityCalculator | Input load, reps, RPE → Compute | Calculate e1RM using all formulas | — | Formula results displayed |
| TheoreticalPerformanceMatrix | Input 1RM | Display matrix of loads × reps × RPE | — | Matrix renders |

---

## 1RM Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| Search | Type | Filter exercise list | `search` updated | List filters |
| Sort select | Change | Re-sort list | `sortKey` updated | List re-sorts |
| Filter method | Select | Filter by direct / indirect / estimated | `filterMethod` updated | List filters |
| Toggle estimates | Tap | Run history estimator for all exercises; show/hide estimate cards | `showEstimates` toggled | Loading → estimates appear or hidden |
| OneRepMaxCard | Tap to expand | Show full record history | Card expanded | History rows visible |
| OneRepMaxCard — "Add Record" | Tap | Open OneRepMaxRecordDialog for this exercise | Dialog open with exerciseId pre-selected | Modal appears |
| OneRepMaxCard — Edit record | Tap edit icon | Open OneRepMaxRecordDialog in edit mode | `editingRecord` set | Modal with pre-filled values |
| OneRepMaxCard — Delete record | Tap delete icon | Delete the 1RM record | Record deleted from DB | Row disappears |
| OneRepMaxRecordDialog — Method "Direct" | Select | Show value field only | Form shows direct fields | — |
| OneRepMaxRecordDialog — Method "Indirect" | Select | Show tested load + reps fields; compute formula estimates | Formula estimates computed | Comparison table appears |
| OneRepMaxRecordDialog | Submit | Save or update 1RM record | DB updated | Dialog closes, card updates |
| FAB | Tap | Open OneRepMaxRecordDialog with no pre-selected exercise | Dialog open | Modal appears |

---

## Profile Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| ProfileInfoSection | Edit name or gender → Save | Update UserProfile | DB updated | Toast "Profile updated" |
| WeightTrackingSection — Add weight | Enter value → Tap "Add" | Create new BodyWeightRecord | DB updated | Toast with value |
| WeightTrackingSection — Edit record | Tap edit | Open WeightEditDialog | `editingRecordId` set, dialog open | Modal appears |
| WeightEditDialog | Submit | Update BodyWeightRecord | DB updated | Dialog closes, toast "Updated" |
| WeightTrackingSection — Delete record | Tap delete | Browser confirmation → Delete record | DB updated | Toast "Deleted" |

---

## Settings Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| Load suggestion method | Change | Update UserRegulationProfile | DB updated immediately | Select value changes |
| Fatigue sensitivity | Change | Update UserRegulationProfile | DB updated | — |
| Auto-start rest timer | Toggle | Update UserRegulationProfile | DB updated | Toggle state changes |
| Simple mode | Toggle | Update UserRegulationProfile; affects all RPE/compliance display globally | DB updated | Toggle state changes; app-wide display changes |
| Theme selector | Select | Apply theme | Theme preference stored | App visual theme changes |
| Color palette | Select | Apply palette | Palette preference stored | Accent colors change |
| Reset Database | Tap | AlertDialog confirmation | — | Dialog shown |
| Reset Database — Confirm | Tap | SystemMaintenanceService.resetCurrentDatabase() | All tables cleared | App reloads |
| Selective Delete — Select categories → Delete | Tap | AlertDialog → SystemMaintenanceService.clearUserData() | Selected tables cleared | Toast, cache invalidated |
| Load Fixtures (Developer) | Tap | AlertDialog → SystemMaintenanceService.loadFixtures() | Sample data inserted | Toast, cache invalidated |
| User Management — Switch user | Tap user | (See Journey 16) | Active user changes | App reloads with new user data |
| User Management — Create user | Tap "Add User" | Open CreateUserDialog | Dialog open | Modal appears |
| CreateUserDialog | Submit | Create GlobalUser, initialize DB | GlobalUser created | Dialog closes |
| User Management — Delete current user | Tap "Delete Account" | AlertDialog → Delete GlobalUser + all data | User deleted, DB cleared | Navigate to UserSelectionPage |

---

## Backup Page

| Component | User Action | System Response | State Change | Feedback |
|---|---|---|---|---|
| Category checkboxes | Toggle | Select/deselect data categories | `selectedCategories` updated | Checkbox state changes |
| "Select All" toggle | Tap | Toggle all categories | `selectedCategories` updated | All check/uncheck |
| Download Backup | Tap | Export selected (or all) tables as JSON; download or share | `exporting = true` → false | Toast "Exported", file download |
| File picker area | Select file | Parse JSON, detect conflicts | `importedBackup` set, `conflicts` set | File info panel appears |
| File picker — invalid file | Select invalid JSON | Parse error | `importedBackup` remains null | Toast "Invalid file" |
| File picker — file too large | Select large file | Size check fails | — | Toast "File too large" |
| "Import" button | Tap | If conflicts: show ConflictResolutionDialog; else: import with 'ignore' | `conflictDialogOpen` if conflicts | Dialog or direct import |
| ConflictResolutionDialog — "Copy as new" | Tap | Import with 'copy' strategy | Conflicting records get new IDs | Dialog closes, toast with result |
| ConflictResolutionDialog — "Skip conflicts" | Tap | Import with 'ignore' strategy | Conflicts skipped | Toast with result |
| ConflictResolutionDialog — "Overwrite" | Tap | Import with 'overwrite' strategy | Existing records replaced | Toast with result |
| "×" clear button | Tap | Clear imported file from memory | `importedBackup = null` | File info panel disappears |
