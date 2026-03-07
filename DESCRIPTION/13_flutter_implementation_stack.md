# Workout Tracker — Flutter Implementation Stack

This document specifies the Flutter/Dart package stack for the reimplementation, explaining the role of each package, how it maps to the application architecture, and concrete usage patterns for every major feature area.

---

## Package Inventory

| Package | Role |
|---|---|
| `hooks_riverpod` | State management + dependency injection |
| `flutter_hooks` | Local component state and lifecycle effects |
| `flutter_localizations` | Internationalization and localized text |
| `fpdart` | Functional error handling (Either, Option, TaskEither) |
| `fl_chart` | All charts and graphs in the Analytics page |
| `shimmer` | Skeleton loading screens |
| `infinite_scroll_pagination` | Paginated lists (Exercise List, History, 1RM) |
| `flutter_local_notifications` | Rest timer completion alert and vibration |
| `json_annotation` | JSON serialization for backup import/export |
| `nanoid` | Cryptographically random entity ID generation |
| `frozen` + `frozen_annotation` | Immutable data classes (copyWith, equality, pattern matching) |
| `patrol` | Integration and end-to-end testing |

---

## 1. `hooks_riverpod` — State Management and Dependency Injection

### Role
Riverpod is the single source of truth for all application state. It replaces:
- TanStack Query (data fetching, caching, invalidation)
- Zustand (global active session store)

### Provider Types Used

#### `FutureProvider` / `AsyncNotifierProvider`
Used for all data-fetching operations that map to repository/service calls. Returns `AsyncValue<T>` which has three states: loading, data, error.

```
Examples:
- exerciseListProvider → AsyncValue<List<Exercise>>
- dashboardStatsProvider → AsyncValue<DashboardStats>
- workoutDetailProvider(workoutId) → AsyncValue<WorkoutDetail>
- analyticsDataProvider(filters) → AsyncValue<AnalyticsData>
- oneRepMaxDataProvider → AsyncValue<OneRepMaxPageData>
- historyListProvider → AsyncValue<List<WorkoutSession>>
```

#### `StreamProvider`
Used for the active session state, which must update reactively as sets are completed, rest timer ticks, etc.

```
Examples:
- activeSessionProvider → AsyncValue<LoadedSessionState?>
```

#### `NotifierProvider` / `AsyncNotifierProvider`
Used for stateful services that expose both state and actions:

```
Examples:
- activeSessionNotifierProvider — exposes session state + completeSet, skipSet, uncompleteSet, addSet, swapExercise, endSession, discardSession, etc.
- restTimerNotifierProvider — exposes timer state + start, skip, extend
- userRegulationProvider — exposes preferences + update methods
```

#### `Provider`
Used for stateless services and repositories:

```
Examples:
- exerciseRepositoryProvider
- sessionRepositoryProvider
- workoutPlanRepositoryProvider
- oneRepMaxRepositoryProvider
- backupServiceProvider
- loadSuggestionEngineProvider
- warmupCalculatorProvider
```

#### `StateProvider`
Used for simple local filter/sort state that is shared across widget rebuilds but does not need complex logic:

```
Examples:
- exerciseSearchProvider → String
- exerciseSortKeyProvider → SortKey
- analyticsDateRangeProvider → DateRangePreset
- analyticsFiltersProvider → AnalyticsFilters
```

### Widget Integration

All pages and significant components extend `HookConsumerWidget` (combining Riverpod consumer + Flutter Hooks). This gives access to both `ref.watch()` and `use*()` hooks in a single `build` method.

Simpler components that only need Riverpod (no local state) extend `ConsumerWidget`.

### Cache Invalidation

Riverpod cache invalidation replaces TanStack Query's `queryClient.invalidateQueries()`:

```
ref.invalidate(exerciseListProvider)
ref.invalidate(dashboardStatsProvider)
ref.invalidate(activeSessionProvider)
```

Invalidation is triggered from within `AsyncNotifier.build()` side effects or from mutation notifiers after successful DB writes.

### Scoping

The `ProviderScope` widget wraps the entire application at the root. User-scoped providers (all per-user data) are refreshed or overridden using `ProviderScope.overrides` when the active user changes. This effectively replaces the per-user database context switch.

When a user switch occurs:
1. Close the current user's database connection.
2. Dispose all user-scoped providers via `ref.invalidateSelf()` or a dedicated `userScopeProvider` change.
3. Open the new user's database.
4. All user-scoped providers rebuild automatically on next access.

---

## 2. `flutter_hooks` — Local Component State and Lifecycle

### Role
Provides React-like hooks for managing local (per-widget) state and lifecycle effects inside `HookWidget` and `HookConsumerWidget`. Eliminates the need for `StatefulWidget` in most cases.

### Hooks Used

| Hook | Replaces | Usage |
|---|---|---|
| `useState<T>` | `setState` in StatefulWidget | Local form field state, dialog open/close flags, tab selection |
| `useEffect` | `initState` / `dispose` | Data loading on mount, subscription setup, cleanup |
| `useTextEditingController` | Manual TextEditingController lifecycle | All text input fields in forms |
| `useFocusNode` | Manual FocusNode lifecycle | Input focus management |
| `useAnimationController` | Manual AnimationController lifecycle | Rest timer ring animation |
| `useScrollController` | Manual ScrollController lifecycle | Scroll position tracking in session page |
| `useMemoized<T>` | `useMemo` | Expensive computations that depend on changing values (e.g., filtered lists) |
| `useCallback` | `useCallback` | Stable function references passed as callbacks |
| `useRef<T>` | Instance variables in StatefulWidget | Mutable references that don't trigger rebuilds (e.g., timer handle) |
| `usePrevious<T>` | Tracking previous values | Detecting when a filter changes to reset pagination |

### Patterns

**Form page with validation**:
```
final nameController = useTextEditingController(text: initialName);
final nameError = useState<String?>(null);
final isSubmitting = useState(false);
```

**Effect for loading state on filter change**:
```
useEffect(() {
  ref.invalidate(exerciseListProvider);
  return null;
}, [filterEquipment, filterMuscle, search]);
```

**Rest timer countdown**:
```
final secondsRemaining = useState(initialSeconds);
final timerRef = useRef<Timer?>(null);
useEffect(() {
  timerRef.value = Timer.periodic(Duration(seconds: 1), (_) {
    if (secondsRemaining.value <= 0) {
      timerRef.value?.cancel();
      _onTimerComplete();
    } else {
      secondsRemaining.value--;
    }
  });
  return () => timerRef.value?.cancel();
}, []);
```

---

## 3. `flutter_localizations` — Internationalization

### Role
Provides locale-aware formatting and the Flutter material/cupertino localization delegates. The primary application language is Italian (`it_IT`).

### Setup
The `MaterialApp` is configured with:
- `localizationsDelegates`: includes `GlobalMaterialLocalizations.delegate`, `GlobalWidgetsLocalizations.delegate`, `GlobalCupertinoLocalizations.delegate`, and the app's own `AppLocalizations.delegate` (generated from ARB files).
- `supportedLocales`: `[Locale('it', 'IT')]` as primary; optionally `[Locale('en')]` as fallback.

### ARB Files
All user-visible strings are defined in `lib/l10n/app_it.arb` (Italian) and optionally `app_en.arb` (English fallback). The `flutter gen-l10n` tool generates a typesafe `AppLocalizations` class.

### Usage Pattern
```
final l10n = AppLocalizations.of(context)!;
Text(l10n.exerciseNameLabel)
Text(l10n.setCountAdviceDoAnother(completed: 2, min: 3))
```

Plural-aware and parameterized strings use ARB placeholders with ICU message syntax.

### Locale-Aware Formatting
`flutter_localizations` provides locale-aware:
- Date formatting (day/month/year order for Italian).
- Number formatting (decimal commas for Italian: `1.234,5` format).
- `MaterialLocalizations` for dialog button labels, date picker text, etc.

---

## 4. `fpdart` — Functional Error Handling

### Role
Provides algebraic data types for explicit, type-safe error handling in the service layer. Eliminates unchecked exceptions from business logic functions.

### Types Used

#### `Either<Failure, T>`
Represents a computation that can either succeed (`Right<T>`) or fail with a typed error (`Left<Failure>`). Used as the return type of all service methods that can meaningfully fail.

```
Future<Either<ServiceFailure, String>> activateSession(String plannedSessionId)
Future<Either<BackupFailure, ImportResult>> importData(BackupSchema backup, ConflictStrategy strategy)
Either<ValidationFailure, Exercise> validateExercise(ExerciseForm form)
```

#### `Option<T>`
Represents a value that may or may not exist. Used instead of nullable types for domain values where absence has semantic meaning.

```
Option<OneRepMaxRecord> getBestRecord(String exerciseId)
Option<WorkoutSession> findActiveSession()
Option<NextSessionSuggestion> getNextSessionSuggestion()
```

#### `TaskEither<Failure, T>`
A lazy, composable `Future<Either<Failure, T>>`. Used for chaining async operations that each may fail.

```
TaskEither<ActivationFailure, String> activateSessionTask(String plannedSessionId) =>
  TaskEither.tryCatch(
    () => sessionRepository.findActiveSession(),
    (e, _) => ActivationFailure.databaseError(e.toString()),
  ).flatMap((existing) => ...);
```

### Failure Types

Define a sealed class hierarchy for failures per domain area:

```
ServiceFailure
├── DatabaseFailure       — storage read/write error
├── NotFoundFailure       — entity not found
├── ValidationFailure     — business rule violation
├── ConflictFailure       — constraint violation
└── UnknownFailure        — unexpected error

BackupFailure
├── FileTooLargeFailure
├── InvalidFormatFailure
├── ParseFailure
└── RecordValidationFailure

ActivationFailure
├── PlannedSessionNotFound
├── DatabaseFailure
└── AlreadyActiveSession   (should not occur; handled in UI)
```

### UI Layer Handling

In widgets, fold the `Either` to handle both cases:

```
data.fold(
  (failure) => ErrorWidget(failure.message),
  (result) => SuccessWidget(result),
)
```

`AsyncValue<T>` from Riverpod wraps `Either` errors in its own error state, so the standard `when(data:, loading:, error:)` pattern applies at the widget level. The `fpdart` types are primarily used within the service and repository layers.

---

## 5. `fl_chart` — Charts and Graphs

### Role
Provides all data visualizations in the Analytics page and profile weight chart.

### Chart Types Used

#### `BarChart` — Volume Analytics
Used for:
- Volume by muscle (horizontal bar chart, sorted by weighted sets descending).
- Volume by muscle group (horizontal bar chart).
- Volume by movement pattern (horizontal bar chart).
- Objective distribution (horizontal bar chart).

Configuration:
- Horizontal layout (rotated BarChart with `BarChartGroupData` per muscle).
- Bars colored by primary color; secondary muscles in a muted variant.
- Tooltips showing: label, weighted sets, volume tonnage.
- Max X value set to the highest weighted-set count + 20% headroom.
- Grid lines: vertical only, light color.

#### `LineChart` — Load Progression, RPE Accuracy, Frequency
Used for:
- Load progression per exercise (line per exercise: one for average load, one for max load).
- RPE accuracy scatter (expected RPE line vs. actual RPE dots).
- Weekly frequency bars with a target frequency horizontal reference line.
- Body weight over time (single line).

Configuration for load progression:
- X axis: date (formatted as short locale date).
- Y axis: load in kg or lbs.
- Two `LineChartBarData` series per exercise (average + max), each with distinct stroke width and color.
- Dots shown at each data point. Tapping a dot shows a tooltip with date, average load, max load.
- Smooth curves (`isCurved: true`) with tension ~0.4.

#### `PieChart` — Compliance Distribution
Used for:
- Compliance status breakdown (segments for FullyCompliant, WithinRange, BelowMinimum, AboveMaximum, Incomplete).

Configuration:
- Donut style (`centerSpaceRadius > 0`).
- Each section colored by its compliance status color.
- Touch interactivity: tapping a section highlights it and shows label + percentage.

#### `LineChart` (adapted as heatmap) — Consistency Heatmap
The consistency heatmap (GitHub contribution-style) is rendered as a custom widget (not directly `fl_chart`), using a `GridView` of colored `Container` cells. `fl_chart` is not used for this specific component.

### Shared Chart Configuration

All charts share:
- `FlBorderData(show: false)` — no outer border.
- Responsive sizing using `LayoutBuilder` to fill available width.
- Semantic color mapping matching the design system status colors.
- Dark/light theme awareness via `Theme.of(context)`.

---

## 6. `shimmer` — Skeleton Loading Screens

### Role
Provides animated shimmer effects for skeleton loading placeholders, matching the design system's loading state convention.

### Usage Pattern

Every skeleton screen widget wraps its placeholder shapes in a `Shimmer.fromColors` widget:

```
Shimmer.fromColors(
  baseColor: theme.colorScheme.surfaceVariant,
  highlightColor: theme.colorScheme.surface,
  child: Column(
    children: [
      // Placeholder card shapes
      Container(height: 80, decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: Colors.white)),
      SizedBox(height: 8),
      Container(height: 80, ...),
      ...
    ],
  ),
)
```

### Skeleton Widgets

Each major page has a corresponding skeleton widget:

| Page | Skeleton Widget |
|---|---|
| Exercise List | `ExerciseListSkeleton` — 6 card-height shimmer rows |
| Workout List | `WorkoutListSkeleton` — 4 card-height shimmer rows |
| Session Detail | `SessionDetailSkeleton` — header + 2 group skeletons each with 2 item rows |
| History List | `HistoryListSkeleton` — 5 card rows |
| History Detail | `HistoryDetailSkeleton` — meta card + 3 group skeletons |
| Analytics | `AnalyticsSkeleton` — filter bar + 3 summary cards + chart placeholder |
| Dashboard | `DashboardSkeleton` — greeting + suggestion card + last workout card + calendar |
| 1RM Page | `OneRepMaxSkeleton` — filter bar + 5 card rows |
| Active Session | `ActiveSessionSkeleton` — header + large exercise card placeholder |

The shimmer animation runs continuously while the Riverpod `AsyncValue` is in loading state. On data arrival, the skeleton is replaced with the actual content (with a brief fade-in transition).

---

## 7. `infinite_scroll_pagination` — Paginated Lists

### Role
Provides a `PagingController<PageKey, ItemType>` that manages paginated data loading and a suite of builder widgets for rendering paged lists.

### Pages Using Infinite Scroll Pagination

| Page | Items | Page Size |
|---|---|---|
| Exercise List | `Exercise` | 20 per page |
| History List | `WorkoutSession` | 20 per page |
| 1RM Page | `ExerciseWith1RM` | 20 per page |

### Integration with Riverpod

The `PagingController` is created with `useMemoized` to survive widget rebuilds:

```
final pagingController = useMemoized(
  () => PagingController<int, Exercise>(firstPageKey: 0),
);

useEffect(() {
  pagingController.addPageRequestListener((pageKey) {
    ref.read(exercisePageProvider(ExercisePageParams(
      page: pageKey,
      search: search.value,
      filters: filters.value,
    )).future).then(
      (items) {
        if (items.length < pageSize) {
          pagingController.appendLastPage(items);
        } else {
          pagingController.appendPage(items, pageKey + 1);
        }
      },
      onError: pagingController.error,
    );
  });
  return pagingController.dispose;
}, []);
```

When filters or search change, the paging controller is reset: `pagingController.refresh()`.

### Builder Widgets Used

```
PagedListView<int, Exercise>(
  pagingController: pagingController,
  builderDelegate: PagedChildBuilderDelegate<Exercise>(
    itemBuilder: (context, item, index) => ExerciseCard(exercise: item),
    firstPageProgressIndicatorBuilder: (_) => ExerciseListSkeleton(),
    newPageProgressIndicatorBuilder: (_) => PagingLoadingIndicator(),
    noItemsFoundIndicatorBuilder: (_) => EmptyExerciseList(),
    noMoreItemsIndicatorBuilder: (_) => EndOfListIndicator(),
  ),
)
```

For the Exercise List, a `PagedSliverList` inside a `CustomScrollView` allows the search/filter header to scroll with the list on mobile.

---

## 8. `flutter_local_notifications` — Rest Timer Alerts

### Role
Delivers the rest timer completion notification (sound + vibration) that fires when the countdown reaches zero. This ensures the alert works even if the app is backgrounded during the rest period.

### Initialization

The plugin is initialized once at app startup:

```
final FlutterLocalNotificationsPlugin notificationsPlugin =
    FlutterLocalNotificationsPlugin();

await notificationsPlugin.initialize(
  InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    iOS: DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: true,
    ),
  ),
  onDidReceiveNotificationResponse: _onNotificationTapped,
);
```

Permission is requested at first rest timer use (not at startup).

### Notification Channel

A dedicated notification channel for rest timer alerts:

```
AndroidNotificationChannel(
  'rest_timer',
  'Rest Timer',
  description: 'Alerts when rest period ends',
  importance: Importance.high,
  playSound: true,
  enableVibration: true,
  vibrationPattern: Int64List.fromList([0, 200, 100, 200]),
)
```

### Rest Timer Implementation

The rest timer is managed by `RestTimerNotifier` (a Riverpod `Notifier`):

1. On timer start: store `endTime = now + durationSeconds`.
2. Use a `Timer.periodic(1 second)` to decrement the displayed countdown (managed via `flutter_hooks` `useRef` in the widget, or a `Timer` field in the notifier).
3. On countdown completion:
   - Cancel the periodic timer.
   - Fire a local notification with `flutter_local_notifications`.
   - Trigger haptic feedback via `HapticFeedback.mediumImpact()`.
4. Notification payload contains the session ID so that tapping the notification navigates back to the active session page.

### Notification Content

```
NotificationDetails(
  android: AndroidNotificationDetails(
    'rest_timer',
    'Rest Timer',
    channelDescription: '...',
    importance: Importance.high,
    priority: Priority.high,
    ticker: 'Rest complete',
    playSound: true,
    enableVibration: true,
  ),
  iOS: DarwinNotificationDetails(
    presentAlert: true,
    presentSound: true,
  ),
)
```

Title: "Rest Complete" (localized).
Body: Name of the next exercise/set (e.g., "Next: Bench Press — Set 2").

### Cancellation

When the user manually dismisses the timer or starts a new timer, any pending notification is cancelled:
```
await notificationsPlugin.cancel(kRestTimerNotificationId);
```

---

## 9. `json_annotation` — Backup Serialization

### Role
Provides `@JsonSerializable` code generation for converting domain entities to/from JSON. Used exclusively for the backup export/import feature.

### Pattern

Each domain entity that participates in backup has a corresponding `JsonSerializable` data transfer class (or the entity itself is annotated):

```
@JsonSerializable(explicitToJson: true)
class ExerciseDto {
  final String id;
  final String name;
  @JsonKey(toJson: _muscleListToJson, fromJson: _muscleListFromJson)
  final List<Muscle> primaryMuscles;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  ...
  factory ExerciseDto.fromJson(Map<String, dynamic> json) => _$ExerciseDtoFromJson(json);
  Map<String, dynamic> toJson() => _$ExerciseDtoToJson(this);
}
```

### Date Handling

`DateTime` fields are serialized as ISO-8601 strings. A custom converter handles this:

```
class DateTimeConverter implements JsonConverter<DateTime, String> {
  const DateTimeConverter();
  DateTime fromJson(String json) => DateTime.parse(json);
  String toJson(DateTime object) => object.toIso8601String();
}
```

### Enum Serialization

All enum values are serialized by their string name matching the domain specification. The `@JsonValue('reps')` annotation (or a custom converter) ensures the correct string representation is written.

### Backup Schema DTO

The top-level backup wrapper:

```
@JsonSerializable(explicitToJson: true)
class BackupSchema {
  final int version;
  final String exportedAt;
  final String appName;
  final Map<String, List<Map<String, dynamic>>> data;
  ...
}
```

### Code Generation

Run `dart run build_runner build --delete-conflicting-outputs` to regenerate `*.g.dart` files after any model changes.

---

## 10. `nanoid` — Entity ID Generation

### Role
Generates URL-safe, cryptographically random 21-character string IDs for all new entities. This is the direct Dart equivalent of the JavaScript `nanoid` package used in the original implementation.

### Usage

Every entity creation call generates a new ID:

```
final id = nanoid(); // e.g., "V1StGXR8_Z5jdHi6B-myT"
```

This replaces UUIDs for conciseness while maintaining collision resistance. All entity `id` fields are strings of this format.

### ID Length

The default length of 21 characters provides approximately 2¹²⁶ possible values, making collision probability negligible even for very large datasets.

### Usage Pattern in Repositories

```
Future<Exercise> createExercise(ExerciseCreateParams params) async {
  final exercise = Exercise(
    id: nanoid(),
    name: params.name,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
    ...
  );
  await _db.exercises.put(exercise.toMap());
  return exercise;
}
```

---

## 11. `frozen` + `frozen_annotation` — Immutable Domain Classes

### Role
Generates immutable value classes with `copyWith`, structural equality (`==` and `hashCode`), and pattern matching support. Applied to all domain entities and value objects.

### Pattern

Every entity and value object in `02_domain_model.md` is defined as a `@frozen` class:

```
@frozen
class Exercise with _$Exercise {
  const factory Exercise({
    required String id,
    required String name,
    required ExerciseType type,
    required List<Muscle> primaryMuscles,
    required List<Muscle> secondaryMuscles,
    required List<Equipment> equipment,
    required MovementPattern movementPattern,
    required CounterType counterType,
    required String defaultLoadUnit,
    String? notes,
    String? description,
    String? keyPoints,
    required List<String> variantIds,
    bool? isArchived,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _Exercise;
}
```

### `copyWith`

Used pervasively throughout services and session state management to produce modified copies without mutation:

```
final updatedSession = session.copyWith(
  completedAt: DateTime.now(),
  totalSets: completedSets.length,
);
```

### Union Types

`frozen` union types (sealed classes) are used for discriminated unions in the domain:

```
@frozen
class SetModifier with _$SetModifier {
  const factory SetModifier.cluster({required ClusterSetParams config}) = ClusterModifier;
  const factory SetModifier.dropSet({required DropSetConfig config}) = DropSetModifier;
  const factory SetModifier.myoRep({required MyoRepConfig config}) = MyoRepModifier;
  const factory SetModifier.topSet({required TopSetConfig config}) = TopSetModifier;
  const factory SetModifier.backOff({required BackOffConfig config}) = BackOffModifier;
}
```

Pattern matching on union types:

```
modifier.when(
  cluster: (config) => renderClusterParams(config),
  dropSet: (config) => renderDropSetParams(config),
  myoRep: (config) => renderMyoRepParams(config),
  topSet: (config) => renderTopSetParams(config),
  backOff: (config) => renderBackOffParams(config),
)
```

### Code Generation

Run `dart run build_runner build` to generate `*.g.dart` and `*.freezed.dart` (or equivalent `*.frozen.dart`) files.

### Value Objects

All value objects from `02_domain_model.md` (NumericRange, RPERange, LoadRange, CountRange, SetCountRange, FatigueProgressionProfile, ClusterSetParams, etc.) are also defined as `@frozen` classes for structural equality and safe copying.

---

## 12. `patrol` — Integration Testing

### Role
Provides a high-level integration testing framework for Flutter, enabling end-to-end tests that interact with the real app (not mocked widgets). Replaces Playwright E2E tests from the original implementation.

### Test Scope

Patrol tests cover the major user journeys defined in `07_user_journeys.md`:

| Test Suite | Journeys Covered |
|---|---|
| `onboarding_test.dart` | Journey 1 (first-time setup) |
| `exercise_management_test.dart` | Journey 2 (create exercise), CSV import/export |
| `workout_planning_test.dart` | Journey 3–4 (create workout, build plan) |
| `session_activation_test.dart` | Journey 5 (start session from dashboard) |
| `session_execution_test.dart` | Journey 6 (standard workout), Journey 7 (superset), Journey 8 (cluster) |
| `substitution_test.dart` | Journey 9 (exercise substitution) |
| `backup_test.dart` | Journey 11 (backup/restore) |
| `one_rep_max_test.dart` | Journey 12 (1RM management) |
| `analytics_test.dart` | Journey 14 (analytics navigation) |
| `user_switching_test.dart` | Journey 16 (multi-user switching) |

### Test Pattern

```
void main() {
  late PatrolTester $;

  patrolTest(
    'User can complete a standard workout session',
    ($) async {
      await $.pumpWidgetAndSettle(const App());

      // Navigate to dashboard
      await $(DashboardPage).waitUntilVisible();

      // Tap start session
      await $(NextSessionSuggestionCard).tap();
      await $(StartSessionButton).tap();

      // Complete first set
      await $(LoadField).enterText('80');
      await $(CountField).enterText('8');
      await $(RPESelector).tap();
      await $(CompleteSetButton).tap();

      // Verify compliance badge appeared
      await $(ComplianceBadge).waitUntilVisible();
    },
  );
}
```

### Native Interaction

Patrol can interact with native system UI (permission dialogs, file pickers, notification permission prompts), which is necessary for testing:
- The notification permission request on first rest timer use.
- The file picker during backup import/export (on native platforms).

---

## Architecture Layers (Flutter Mapping)

```
┌───────────────────────────────────────────────────────┐
│  Presentation Layer                                   │
│  HookConsumerWidget / ConsumerWidget pages            │
│  fl_chart, shimmer, infinite_scroll_pagination        │
│  flutter_localizations (l10n)                         │
├───────────────────────────────────────────────────────┤
│  State Management Layer                               │
│  hooks_riverpod Providers + Notifiers                 │
│  flutter_hooks (useState, useEffect, useMemoized)     │
│  RestTimerNotifier → flutter_local_notifications      │
├───────────────────────────────────────────────────────┤
│  Service Layer                                        │
│  Pure Dart functions + classes                        │
│  fpdart (Either, Option, TaskEither) for errors       │
├───────────────────────────────────────────────────────┤
│  Repository / Data Layer                              │
│  Database abstraction (per-user isolation)            │
│  json_annotation (backup serialization DTOs)          │
│  nanoid (ID generation)                               │
├───────────────────────────────────────────────────────┤
│  Domain Model Layer                                   │
│  frozen + frozen_annotation (immutable value classes) │
│  All enums (pure Dart)                                │
└───────────────────────────────────────────────────────┘
```

---

## File and Folder Structure (Recommended)

```
lib/
├── main.dart
├── app.dart                        # MaterialApp + ProviderScope
├── l10n/
│   ├── app_it.arb
│   └── app_en.arb
├── domain/
│   ├── enums.dart                  # All enums (pure Dart)
│   ├── entities/                   # @frozen entity classes
│   │   ├── exercise.dart
│   │   ├── exercise.g.dart
│   │   ├── exercise.frozen.dart
│   │   ├── planned_workout.dart
│   │   └── ...
│   ├── value_objects/              # @frozen value objects
│   │   ├── numeric_range.dart
│   │   ├── rpe_range.dart
│   │   └── ...
│   └── failures/                   # fpdart failure types
│       ├── service_failure.dart
│       ├── backup_failure.dart
│       └── ...
├── db/
│   ├── database.dart               # DB initialization, two-tier setup
│   ├── repositories/
│   │   ├── exercise_repository.dart
│   │   ├── session_repository.dart
│   │   ├── workout_plan_repository.dart
│   │   ├── one_rep_max_repository.dart
│   │   ├── user_profile_repository.dart
│   │   └── global_user_repository.dart
│   └── dtos/                       # @JsonSerializable DTOs for backup
│       ├── exercise_dto.dart
│       ├── exercise_dto.g.dart
│       └── ...
├── services/
│   ├── session_activation_service.dart
│   ├── session_finisher_service.dart
│   ├── compliance_analyzer.dart
│   ├── fatigue_analyzer.dart
│   ├── set_count_advisor.dart
│   ├── load_suggestion_engine.dart
│   ├── one_rep_max_estimator.dart
│   ├── warmup_calculator.dart
│   ├── rpe_percentage_table.dart
│   ├── analytics_service.dart
│   ├── dashboard_service.dart
│   ├── session_rotation_service.dart
│   ├── backup_service.dart
│   ├── csv_exercise_service.dart
│   ├── csv_workout_service.dart
│   ├── template_service.dart
│   ├── auth_service.dart
│   ├── lexorank.dart
│   └── ...
├── providers/
│   ├── exercise_providers.dart
│   ├── workout_providers.dart
│   ├── session_providers.dart
│   ├── analytics_providers.dart
│   ├── dashboard_providers.dart
│   ├── active_session_notifier.dart
│   ├── rest_timer_notifier.dart
│   ├── user_providers.dart
│   └── repository_providers.dart   # Provider<*Repository> definitions
├── pages/
│   ├── onboarding/
│   ├── dashboard/
│   ├── exercise_list/
│   ├── workout_list/
│   ├── workout_detail/
│   ├── session_detail/
│   ├── active_session/
│   ├── history/
│   ├── analytics/
│   ├── one_rep_max/
│   ├── profile/
│   ├── backup/
│   ├── settings/
│   └── template_edit/
├── components/
│   ├── session/
│   ├── planning/
│   ├── analytics/
│   ├── exercises/
│   └── shared/
└── design/
    ├── theme.dart
    ├── colors.dart
    ├── typography.dart
    └── spacing.dart
```

---

## Build Runner Commands

```bash
# Generate frozen + json_annotation code
dart run build_runner build --delete-conflicting-outputs

# Watch mode during development
dart run build_runner watch --delete-conflicting-outputs

# Run patrol integration tests
dart run patrol test --target integration_test/session_execution_test.dart

# Generate localizations
flutter gen-l10n
```
