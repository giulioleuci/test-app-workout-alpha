# CLAUDE.md

## Commands

```bash
npm run dev          # Dev server on http://localhost:8080
npm run build        # Production build (output: dist/)
npm run build:dev    # Development-mode build
npm run lint         # ESLint check
npm test             # Run Vitest once
npm run test:watch   # Run Vitest in watch mode
npm run preview      # Preview production build locally
```

Mobile (Capacitor):
```bash
npm run build && npx cap sync   # Sync web assets to native
npx cap open android            # Open in Android Studio
npx cap open ios                # Open in Xcode
```

## Architecture

This is a **frontend-only, offline-first PWA** — no backend server. All data lives in **IndexedDB** (via Dexie.js). Capacitor bridges to native mobile APIs for file system, sharing, and status bar.

### Layer Structure

```
domain/           # Entities, enums, value objects — pure data models, no side effects
db/               # Dexie schema (database.ts) + repositories/ (domain-specific DB access)
services/         # Business logic: analytics, session lifecycle, load suggestions, CSV, backup
stores/           # Zustand (activeSessionStore.ts — the only global state)
pages/            # Route-level components, lazy-loaded via React.lazy()
components/       # UI components grouped by feature (analytics/, session/, planning/, etc.)
components/ui/    # Shadcn/Radix primitives — do not modify unless adding new primitives
design-system/    # Design tokens, color palettes, CSS variables
i18n/             # i18next config + locales/ (Italian is primary language)
```

### Key Architectural Decisions

- **Repository pattern**: All IndexedDB reads/writes go through `db/repositories/` (e.g. SessionRepository, WorkoutPlanRepository). Services call repositories; components call services via TanStack Query hooks. Direct DB access is restricted to Repositories and specific system services (Backup, Maintenance).
- **TanStack Query**: Used for all data fetching/caching. Queries wrap repository calls; mutations invalidate relevant query keys.
- **Zustand only for active session**: The only global Zustand store is `activeSessionStore.ts` — tracks the in-progress workout session state.
- **Domain entities are immutable value objects**: `domain/entities.ts` defines the data shapes. Business logic lives in `services/`, not in components.
- **Path alias**: `@/*` maps to `src/*` (configured in vite.config.ts and tsconfig.json).

### Database Schema (Dexie tables)

Core planning: `exercises`, `plannedWorkouts`, `plannedSessions`, `plannedExerciseGroups`, `plannedExerciseItems`, `plannedSets`

Execution records: `workoutSessions`, `sessionExerciseGroups`, `sessionExerciseItems`, `sessionSets`

Other: `oneRepMaxRecords`, `sessionTemplates`, `userProfile`, `userRegulationProfile`, `bodyWeightRecords`

### Routing

React Router v6 with lazy-loaded pages. Route definitions are in `App.tsx`. Active session has its own page group under `pages/ActiveSession/`.

### Styling

Tailwind CSS with custom design tokens (CSS variables). Shadcn/UI components consume Radix UI primitives. Framer Motion handles animations. Theme toggling via `next-themes`.

### i18n

Italian is the primary/default language. Translation keys live in `i18n/locales/`. Use `i18n/t.ts` utilities for translations in non-component contexts.

## Testing

- **Framework**: Vitest with jsdom environment
- **Test files**: co-located with source or in `src/test/`
- **DOM mocking**: `fake-indexeddb` mocks IndexedDB for unit tests; `src/test/setup.ts` configures the environment
- **E2E**: Playwright (separate config)

To run a single test file:
```bash
npx vitest run src/test/someFile.test.ts
```
