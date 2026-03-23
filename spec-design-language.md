# Language Selection & Localized Onboarding — Design Spec

## Overview

Refactor the onboarding flow to support language selection (Italian/English), persist the preference globally in the database, propagate it across all app layers, and populate the user's exercise library with fully localized seed data (names, descriptions, key points).

## Design Decisions

- **Language is a device-level global setting** stored on `GlobalAppState` (the singleton record in `GlobalMetaDB`). Changing language affects all profiles on the device.
- **Exercise data is baked in** at seed time in the chosen language. Changing language later only switches UI strings (via the `i18next` system), not existing exercise data in the database.
- **No migration for existing users.** Pre-release users with placeholder exercise names are not migrated. Only new users get human-readable, localized names.
- **Italian uses sentence case** ("Panca piana"), **English uses title case** ("Bench Press").
- **Persistence Layer:** `systemService` (delegating to `databaseLifecycle`) handles reads/writes to the `GlobalAppState` singleton in Dexie.
- **Locale state integration:** `i18next` is used for runtime UI translation. The active language is synchronized between `GlobalAppState` and `i18next.changeLanguage()`.

---

## Section 1: Data Model Changes

### `GlobalAppState` (`src/domain/global-entities.ts`)

Add field:

```typescript
language: 'it' | 'en';
```

Default value for new records: `'it'`.

---

## Section 2: Locale Synchronization & Persistence

**New/Modified logic:** `systemService` and `useLanguage` hook.

Responsibilities:

- **Data source:** `GlobalMetaDB` via `systemService.getGlobalAppState()`.
- **Initialization:** `databaseLifecycle.initialize()` ensures the singleton exists. `UserGate` or a top-level provider ensures `i18next.changeLanguage()` is called with the stored value.
- **`setLanguage(langCode: 'it' | 'en')`:** 
  1. Updates `i18next.changeLanguage(langCode)`.
  2. Persists to `GlobalAppState.language` via `systemService.updateGlobalAppState()`.
  3. Updates `dayjs.locale(langCode)`.
- **During onboarding** (before a user is created): Language is selected and saved to `GlobalAppState` immediately.

---

## Section 3: Onboarding & Create User Dialog

### UserSelectionPage / UserCreation components

- Add a language selector (ToggleGroup or Select) at the top of the form.
- Displays flag + label: `🇮🇹 Italiano` / `🇺🇸 English`.
- Selecting a language calls the language sync logic for an instant UI switch.
- The chosen language is passed to `seedExercises` and subsequent seeding functions in `src/db/seed.ts`.

### Note on Global Scope

Both onboarding and dialog show a note:
- 🇮🇹 "La lingua si applica a tutti i profili su questo dispositivo."
- 🇺🇸 "Language applies to all profiles on this device."

---

## Section 4: Seed Logic Refactor (`src/db/seed.ts`)

- `seedExercises`, `seedFullBody2x`, `seedPPL3x`, and `seedUpperLower4x` accept a `language` parameter (`'it'` | `'en'`).
- Exercise names are written as direct translated strings based on the parameter.
- Exercise `description` and `keyPoints` are populated from a translation dictionary defined within `seed.ts`.
- Plan and session names are localized (e.g., "Corpo Libero" / "Full Body", "Giorno A" / "Day A").
- Translation dictionary: A private map/object inside the seed module, containing name, description, and keyPoints for all exercises in both languages, keyed by stable identifiers (e.g., an internal enum or constant ID).
- Italian follows sentence case; English follows title case.
- All exercise writes are performed in a single atomic transaction.

---

## Section 5: Settings Page (`src/pages/Settings/`)

- The language switcher in `AppearanceSettingsSection.tsx` must be updated to persist changes to `GlobalAppState` via `systemService`.
- Includes the note: "Language applies to all profiles on this device."
- Changing language updates the UI instantly but does **not** re-seed or update existing exercise data.
- The "load fixtures" action (if used for debugging/testing) must pass the current language from `GlobalAppState` to the seed functions.

---

## Section 6: Testing Strategy

### Update existing tests

- **`src/db/seed.test.ts` / `src/db/fixtures.test.ts`:** Run seed for both `'it'` and `'en'` and check correct strings and capitalization conventions.

### New tests

- **Seed localization test:** Seed with `'it'` → verify Italian strings (sentence case). Seed with `'en'` → verify English strings (title case).
- **Locale persistence test:** Set language on `GlobalAppState`, reload app state, verify `i18next` initializes with the correct language.

---

## Section 7: Backward Compatibility

### CSV & JSON (Backup/Restore)

- `description` and `keyPoints` are included in `Exercise` serialization.
- Importing older formats (missing these fields) defaults to `description = ""` and `keyPoints = ""`.
- `GlobalAppState` migration: `databaseLifecycle.initialize()` must provide a default `'it'` if the `language` field is missing in an existing singleton record.

---

## Files to Modify

| Module | Real Path | Change |
|---|---|---|
| `GlobalAppState` model | `src/domain/global-entities.ts` | Add `language` field |
| Database Lifecycle | `src/db/DatabaseLifecycle.ts` | Handle `language` in singleton init/update |
| System Service | `src/services/systemService.ts` | Add `getLanguage` / `setLanguage` helpers |
| i18n Config | `src/i18n/config.ts` | Ensure default matches global app state |
| User Creation | `src/pages/UserSelectionPage.tsx` | Add language selector; pass to seeding |
| Settings Page | `src/pages/Settings/components/AppearanceSettingsSection.tsx` | Sync language change with `systemService` |
| Seed Logic | `src/db/seed.ts` | Accept language parameter; use translation dictionary |
| Exercise Repo | `src/db/repositories/ExerciseRepository.ts` | Ensure all fields are handled correctly |
| CSV Service | `src/services/csvService.ts` | Include new fields in export/import |
| Backup Service | `src/services/backupService.ts` | Include new fields in JSON backup/restore |

---

## Technical Constraints

- All database writes (especially during seeding) must be atomic.
- Offline-first: No network dependencies for language switching or seeding.
- The `GlobalAppState` singleton must be safely updated to avoid data loss of other fields (like `lastActiveUserId`).
