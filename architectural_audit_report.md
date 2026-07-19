# Architectural Audit Report

**Project:** `home-giulio-Desktop-test-app-workout-alpha-main`  
**Scope:** read-only audit from the indexed `codebase-memory-mcp` graph; no application source was changed.  
**Target:** Clean Architecture Lite — Presentation -> Services/Use Cases -> Repositories/Infrastructure.

## Executive summary

The project is a substantial TypeScript offline application (496 TypeScript files indexed; 1,053 functions and 2,624 call edges). Its physical layout already suggests useful seams: `pages`/`components`, `hooks`, `services`, `db`, `domain`, and `lib`. The graph finds `services -> db` as the dominant persistence boundary (310 calls), with `hooks -> services` (124) and `components -> services` (59) also prominent.

The good news is that no direct import of `src/db`, `database`, or repository modules was found in `src/pages` or `src/components`; no Dexie method usage was found there either. Presentation is therefore not directly coupled to Dexie today.

The architecture is nevertheless not Clean Architecture Lite yet. Services import the Dexie database/core/repository implementation directly throughout the layer, so application policy is coupled to infrastructure. Browser/native file-system work is also kept in `services` (`FileReader`, DOM file input, download/native concerns), despite the target requiring file-system handling to be infrastructure-only. The codebase also contains confirmed dead-code candidates and several high-confidence duplicate UI implementations.

## Current architecture map

| Area | Observed responsibility | Assessment |
| --- | --- | --- |
| `src/pages`, `src/components` | Screens, widgets, dialogs and rendering | Presentation; calls hooks/services directly. |
| `src/hooks` | Queries, mutations, view models and UI orchestration | Presentation adapter; should depend only on use-case contracts. |
| `src/services` | Workout/session rules, analytics, CSV/backup work, lifecycle operations | Mixed use cases and infrastructure coupling. |
| `src/db` | Dexie schemas, lifecycle and concrete repositories | Correct infrastructure location, but too widely known by services. |
| `src/domain` | Entities, value objects and types | Appropriate shared domain foundation. |
| `src/lib` | Formatting, download and cross-cutting helpers | Mixed utilities; browser I/O must be moved behind infrastructure ports. |

Graph cluster analysis reinforces this: the `loadData`/active-session cluster crosses hooks, services and DB-related operations, while the `handleExport` cluster combines UI feedback, native/file handling and backup behavior.

## Architectural violations and risks

### 1. Service layer coupled to infrastructure — high

The graph reports **310 calls from `services` to `db`**. Source searches show service modules importing `database`, `core`, and repositories, including the large `backupService`, CSV services and session/workout services. This breaks the desired dependency direction: use cases should depend on repository interfaces, while Dexie implementations satisfy those interfaces.

**Required correction:** define repository ports in a dependency-neutral application/domain location, inject concrete Dexie repositories at the composition root, and remove imports of `src/db/*` from use-case modules.

### 2. File-system/browser APIs in services — high

Two concrete leaks were confirmed:

- `src/services/backupService.ts:284` — `parseBackupFile` instantiates `FileReader`, reads a `File`, parses JSON and applies backup validation.
- `src/services/nativeFileService.ts:107` — `webPickAndReadFile` creates a DOM `<input type="file">`, reads with `FileReader`, and owns picker errors/size handling.

Parsing and backup validation are valid use-case concerns, but DOM file selection, `FileReader`, download and native plugin APIs are infrastructure concerns. Keeping both together makes the services layer browser-specific and harder to test.

**Required correction:** introduce a `FileGateway`/`FileSystemPort` implemented in infrastructure. It returns raw text/bytes and writes named payloads. Keep CSV/JSON parsing and validation in use cases.

### 3. Presentation-to-Dexie check — no confirmed direct violation

Searches across `src/pages` and `src/components` found:

- no direct `src/db`/repository/database imports;
- no `Dexie` imports;
- no database table/transaction operations.

This satisfies the narrow “no DB logic in UI” rule at present. It should be protected with an import-boundary lint rule and tests because direct calls could easily reappear.

### 4. Presentation orchestrates use cases directly — medium

The graph shows 59 `components -> services` calls and 40 `components -> hooks` calls. Direct service invocation is not necessarily a Dexie violation, but it makes components coordinate async workflows, notifications and state transitions. Move those orchestration paths to page view-model hooks/use-case adapters; components should receive state and event callbacks.

## Dead code candidates

Graph in-degree analysis was run excluding the usual entry-point allowance. The query engine marks exported React functions as entry points, so strict orphan queries return no rows; the following candidates are confirmed by their individual graph in-degree and should be verified with a build/test run before deletion.

| Candidate | Evidence | Recommendation |
| --- | --- | --- |
| `src/components/session/SubstitutionConfirmDialog.tsx` | Module and `SubstitutionConfirmDialog` function both have in-degree **0**. | Remove if the current substitution flow no longer renders it; otherwise wire it deliberately. |
| `src/hooks/useMobile.tsx` / `useIsMobile` | Module and function have in-degree **0**. | Delete after checking non-static/dynamic imports. |
| `src/hooks/use-mobile.tsx` / `useIsMobile` | Separate duplicate implementation has in-degree **1** (used by `src/components/ui/sidebar.tsx`). | Retain this version, or consolidate callers onto one canonical hook. |

## Duplicated code and logic leaks

The graph’s `SIMILAR_TO` relationships provide high-confidence duplication evidence.

| Duplicate / leak | Evidence | Refactoring direction |
| --- | --- | --- |
| `AppInfoModal` | `src/pages/OnboardingPage.tsx` and `src/pages/UserSelectionPage.tsx` have similarity **1.000** (identical 62-line functions). | Extract a shared presentation component. |
| Mobile hook | `useMobile.tsx` and `use-mobile.tsx` have near-identical `useIsMobile` implementations; one is unreferenced. | Keep one hook and a single import path. |
| CSV toolbar variants | `HistoryCsvToolbar` and `WorkoutCsvToolbar` have similarity **0.984**. | Configure one generic `CsvToolbar` with labels/actions and small slots. |
| Active-session accordions | `CompletedExercisesAccordion` and `UpcomingExercisesAccordion` have similarity **0.984**. | Extract a common accordion/list renderer; retain state-specific adapters. |
| File-reading duplication | `backupService.parseBackupFile` and `nativeFileService.webPickAndReadFile` each perform size checks, `FileReader` wiring, and read-error mapping. | One infrastructure reader with a typed result/error model; parsers consume text. |
| Repository operation similarity | `SessionRepository.addExercise`, `addSuperset`, and `addGroupWithItemsAndSets` show **0.953–1.000** similarity. | Extract shared transactional persistence primitives inside the repository layer. |

The graph also shows duplicated page-local archive/deactivate/remove callbacks in `WorkoutList` (similarity 1.000). Review these together when extracting a workout command use case.

## Refactoring action plan

1. **Define the boundary contracts.** Create application-facing repository ports (for workouts, sessions, exercises, profiles, backup metadata) and a `FileGateway`. Ports use domain DTOs and do not import Dexie, DOM, Capacitor or React types.
2. **Make `src/db` pure infrastructure.** Keep `WorkoutTrackerDB`, migrations, `DatabaseLifecycle`, and Dexie repositories under infrastructure. Have each repository implement a port; keep Dexie transactions and table names exclusively here.
3. **Create focused use cases.** Split broad services into command/query use cases (for example `ExportBackup`, `ParseBackup`, `ImportBackup`, `ActivateSession`, `FinishSession`). Constructors receive ports, not `databaseLifecycle`, `WorkoutTrackerDB`, or concrete repositories.
4. **Move file I/O behind the gateway.** Relocate DOM input, `FileReader`, `URL.createObjectURL`, download, and native-plugin code from services/lib into `infrastructure/files`. The use cases receive text/bytes and return payloads; adapters perform picking/saving.
5. **Introduce a composition root.** In `src/app` (or `src/infrastructure/composition`), instantiate Dexie repositories and file gateways, then construct use cases. This is the only place allowed to know both interfaces and implementations.
6. **Simplify presentation.** Page view-model hooks invoke use cases and translate results to UI state/toasts. Components become controlled rendering units with callbacks. Remove direct component-to-service calls progressively, beginning with backup/CSV and active-session flows.
7. **Remove duplication and dead code.** Consolidate `AppInfoModal`, the mobile hook, CSV toolbars, accordions, and session repository transaction helpers. Delete confirmed unused modules only after typecheck, unit tests, and a production build.
8. **Enforce the architecture.** Add import-boundary rules: `pages/components/hooks` cannot import `db`, Dexie or file-system adapters; `services/usecases` cannot import Dexie/DOM/Capacitor; only composition infrastructure imports concrete repositories. Add unit tests for use cases using in-memory ports and contract tests for Dexie repositories/file gateways.
9. **Migrate incrementally.** Start with the backup/import/export vertical slice because it contains both key violations. Next migrate CSV workflows, then session/workout operations. Keep existing public UI behavior behind adapters during each slice.

## Audit limitations

The report is graph-led. Import/call resolution can under-report dynamic imports and framework registration, and React exports are sometimes tagged as entry points. “Dead code” items are therefore candidates backed by zero in-degree, not deletion commands. Verify them with the normal typecheck/test/build pipeline before removal.
