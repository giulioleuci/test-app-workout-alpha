# Presentation Orchestration Refactoring Plan

## Objective

Refactor the presentation layer so that pages and components render state and emit user intents, while view-model hooks and application use cases coordinate workflows. The target is **Clean Architecture Lite**:

```text
UI components/pages -> presentation view models -> use cases -> ports -> infrastructure
```

Presentation code must not coordinate persistence, browser/native file access, parsing, conflict resolution, or multi-step business workflows. It may own visual state such as open dialogs, input values, focus, and layout.

## Important scope note

The findings below are **examples, not an exhaustive list**. Before changing any area, navigate the `codebase-memory-mcp` graph to identify every relevant caller, callee, import, dependency path, and similar implementation.

Use the graph as the primary discovery source:

1. `search_graph` to find screens, components, hooks, handlers, mutations, and use cases by name or semantics.
2. `trace_path` to inspect inbound and outbound call paths before moving logic.
3. `query_graph` to locate presentation-to-service calls and rank files by number of calls.
4. `semantic_query` / `search_graph(semantic_query=...)` to find equivalent UI workflows and duplicated patterns.
5. `get_code_snippet` only after graph discovery identifies the exact symbol to inspect.

Do not assume that a named file is the only implementation. Dynamic imports, React composition, callbacks, and unindexed framework links must be checked with a typecheck/test/build after each migration.

## Architectural rules

### UI components and pages

Allowed responsibilities:

- Render state, loading placeholders, errors, dialogs, forms, and lists.
- Collect user input.
- Emit typed user intents via callbacks.
- Keep purely visual local state.

Disallowed responsibilities:

- Call repositories, Dexie, database lifecycle, or concrete infrastructure.
- Pick/read/write files or branch between web and native file APIs.
- Parse CSV/JSON, detect conflicts, or choose import behavior.
- Coordinate multi-step application workflows.
- Invalidate data caches as part of business-flow decisions.

### Presentation view-model hooks

Allowed responsibilities:

- Invoke use cases exposed through the application composition root.
- Maintain presentation state such as pending/error/success, selected item, dialog visibility, and transient form state.
- Translate typed use-case results and failures into UI-friendly state and notifications.
- Request query-cache refreshes after a successful command, using a defined invalidation policy.

Disallowed responsibilities:

- Import Dexie, repositories, browser DOM file APIs, Capacitor APIs, or concrete file adapters.
- Re-implement business rules, parsing, conflict detection, or persistence logic.

### Use cases

Use cases coordinate business workflows and depend only on ports/interfaces. They must not depend on React, React Query, UI toast APIs, `FileReader`, DOM input elements, or Dexie classes.

## Migration approach

Migrate one vertical slice at a time. Preserve existing user-visible behavior, route structure, translations, and error messages while moving responsibilities. Every slice must include focused tests and a full typecheck/build verification.

### Phase 0 — Establish the graph baseline

1. Run `get_architecture` for boundaries, clusters, hotspots, and entry points.
2. Use `query_graph` to enumerate `pages/components -> services` calls, grouped by caller file and symbol.
3. Use `trace_path` on each high-fan-out presentation symbol to map its workflow.
4. Use semantic search for handlers containing concepts such as `import`, `export`, `save`, `delete`, `conflict`, `toast`, `loading`, `native`, and `FileReader`.
5. Record each candidate in a migration inventory with its callers, dependencies, tests, risk, and desired target layer.

The inventory must be refreshed before each later phase; it is the mechanism for finding all correction points rather than relying only on the examples below.

### Phase 1 — CSV import/export workflows

Current examples include:

- `src/components/csv/HistoryCsvToolbar.tsx`
- `src/components/csv/WorkoutCsvToolbar.tsx`
- `src/components/csv/ExerciseCsvToolbar.tsx`

These components currently combine file picking, web/native branching, parsing, conflict detection, import strategy selection, service calls, cache invalidation, toasts, and UI state. Similarity analysis already shows near-duplicate workflows, but the graph must be searched for all other CSV entry points and callers.

Actions:

1. Keep `CsvToolbar` as a dumb display component receiving labels, disabled/loading flags, and callbacks.
2. Introduce a reusable `useCsvTransferViewModel` or feature-specific view-model hooks only where domain differences require it.
3. Move parsing, empty-file rules, conflict detection, import strategies, and result summaries to CSV use cases.
4. Move file selection, reading, saving, and native/web branching to a `FileGateway` implementation in infrastructure.
5. Let view models own only UI state: pending data, dialog visibility, loading flags, and user-facing message mapping.
6. Replace the three duplicated workflows incrementally and delete duplicate handler code only after all callers migrate.

### Phase 2 — Backup workflow

Current example: `src/hooks/useBackup.ts`.

This hook is a useful starting point because it is already presentation-adjacent, but it currently mixes category selection, export/import orchestration, JSON parsing, native/web file behavior, conflict handling, cache invalidation, and toast formatting.

Actions:

1. Split application commands into focused use cases, for example `ExportBackup`, `ParseBackup`, `DetectBackupConflicts`, and `ImportBackup`.
2. Move all browser/native file interactions to the infrastructure `FileGateway`.
3. Keep category selection, selected-file display state, conflict-dialog state, loading states, and notification mapping in `useBackupViewModel`.
4. Make `BackupPage` a rendering component that consumes the view-model state and invokes its intent callbacks.
5. Use graph traces to find all consumers of backup helpers before changing exports.

### Phase 3 — Application bootstrap and user switching

Current example: `src/components/UserGate.tsx`.

The component currently performs application initialization, last-user lookup, user enumeration, user mount/unmount, cache reset, language synchronization, and navigation among loading/onboarding/selection/ready states.

Actions:

1. Create `useAppBootstrap` or `useUserGateViewModel`.
2. Model state explicitly with a discriminated union such as `loading`, `onboarding`, `select-user`, and `ready`.
3. Expose typed actions such as `selectUser`, `unlockUser`, `switchUser`, and `goBack`.
4. Move bootstrap and user-session workflow decisions into use cases or an application coordinator.
5. Keep `UserGate` limited to rendering the state and forwarding user intents.
6. Trace all callers and effects of `mountUser`, `unmountUser`, cache reset, and language synchronization before extracting them.

### Phase 4 — Classify remaining direct presentation dependencies

Not every direct presentation-to-service call needs a view model.

Classify every graph-discovered dependency as follows:

| Dependency type | Destination | Example action |
| --- | --- | --- |
| Pure deterministic calculation | `domain` or a clearly named pure utility | Move out of `services`; component may consume a pure function if it does not cause side effects. |
| Multi-step business workflow | Use case plus view model | Extract commands/queries with typed inputs and outputs. |
| Browser/native/device effect | Infrastructure gateway | UI emits intent; view model/use case invokes a port. |
| Query/mutation state management | Presentation view model | Keep loading/error/cache-view concerns here, without business rules. |

Known examples to classify, not predetermined solutions:

- Analytics and one-rep-max calculations called by presentation components may be pure domain calculations.
- `RestTimer` notification cancellation is a device effect and should go through a port.
- History, template, and workout detail save flows require a graph trace before deciding whether they are simple calculations or full use cases.

### Phase 5 — Active Session and other high-risk flows

The Active Session area has a dense call cluster around `loadData`, session handlers, completion, finishing, and navigation. Do not refactor it first.

Actions:

1. Use `trace_path` from active-session page, hooks, and service entry points.
2. Identify one command at a time, such as complete set, swap exercise, finish session, or discard session.
3. Extract a use case and view-model adapter without changing adjacent commands.
4. Preserve optimistic updates and query/cache behavior through explicit tests.
5. Repeat until presentation components only render state and publish intents.

## Completion criteria

The refactoring is complete only when all criteria below hold:

- Every presentation-to-service dependency has been reviewed through the graph inventory and classified.
- Components/pages contain no database, repository, file-system, native-device, parsing, conflict-resolution, or multi-step workflow logic.
- Presentation view models invoke use cases through interfaces rather than importing concrete infrastructure.
- Use cases have no React, React Query, Dexie, DOM, `FileReader`, or Capacitor dependency.
- File and device operations are available only through infrastructure adapters implementing ports.
- Duplicate CSV/backup orchestration is replaced by reusable view-model/use-case patterns where behavior is genuinely shared.
- Unit tests cover use cases with fakes; UI tests cover rendered states and emitted intents; adapter tests cover file/native behavior.
- Import-boundary lint rules prevent regressions.
- Typecheck, unit tests, integration tests, and production build pass after every vertical slice.

## Suggested guardrails

Add automated architecture checks that reject:

- imports from `src/pages`, `src/components`, or `src/hooks` into `src/db` or concrete infrastructure adapters;
- imports from use cases into Dexie, browser DOM APIs, Capacitor, React, or React Query;
- direct imports of concrete repositories outside the composition root;
- duplicated CSV/backup transfer workflows once the canonical implementation exists.
