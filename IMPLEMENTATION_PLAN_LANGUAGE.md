# Implementation Plan: Language Selection & Localized Onboarding

This implementation plan is based on the specifications in `@spec-design-language.md`.

**IMPORTANT MONITORING RULE:** Every checkbox below represents a single, atomic unit of work. You must mark each checkbox **immediately after completing that specific task**. Never wait to finish a phase or a group of tasks before updating the progress; updates must be granular, strictly sequential, and never batched.

## Phase 1: Domain & Database Foundation
- [ ] **Add language field to GlobalAppState** (`src/domain/global-entities.ts`)
    - Update the `GlobalAppState` interface to include `language: 'it' | 'en'`.
- [ ] **Initialize language in DatabaseLifecycle** (`src/db/DatabaseLifecycle.ts`)
    - Update the `initialize()` method to include `language: 'it'` in the singleton put operation for new databases.
- [ ] **Handle migration/default in DatabaseLifecycle** (`src/db/DatabaseLifecycle.ts`)
    - Modify the initialization logic to ensure existing singletons without a `language` field are updated to `'it'`.
- [ ] **Update setLastActiveUserId to preserve state** (`src/db/DatabaseLifecycle.ts`)
    - Ensure `setLastActiveUserId` (and any other state-writing methods) performs a partial update or reads the existing state first to avoid overwriting the `language` field.
- [ ] **Add language helpers to System Service** (`src/services/systemService.ts`)
    - Implement `getGlobalAppState()` and `updateGlobalAppState()` to facilitate language persistence.

## Phase 2: i18n Setup & Locale Sync
- [ ] **Add English resources to i18n config** (`src/i18n/config.ts`)
    - Import and register `translationEN` from `locales/en/translation.json`.
- [ ] **Sync i18next with GlobalMetaDB on init** (`src/i18n/config.ts`)
    - Ensure `i18next.init` uses the language retrieved from the database as its initial value.
- [ ] **Create useLanguage hook** (`src/hooks/useLanguage.ts`)
    - Implement a hook that wraps `i18next.changeLanguage`, `dayjs.locale`, and the database update logic.
- [ ] **Integrate useLanguage in UserGate** (`src/components/UserGate.tsx`)
    - Ensure the hook is called during the application boot sequence to synchronize the UI with the stored preference.

## Phase 3: Localized Seed Logic
- [ ] **Define Exercise Translation Dictionary** (`src/db/seed.ts`)
    - Create a structured object containing `name`, `description`, and `keyPoints` for all seed exercises in both 'it' and 'en'.
- [ ] **Add language parameter to seedExercises** (`src/db/seed.ts`)
    - Update the function signature and internal mapping logic to use the translation dictionary based on the provided locale.
- [ ] **Implement Title Case/Sentence Case logic** (`src/db/seed.ts`)
    - Ensure exercise names are written in Title Case for 'en' and Sentence case for 'it'.
- [ ] **Update workout template seeds (Full Body)** (`src/db/seed.ts`)
    - Modify `seedFullBody2x` to accept `language` and localize its name and session names ("Giorno A" vs "Day A").
- [ ] **Update workout template seeds (PPL)** (`src/db/seed.ts`)
    - Modify `seedPPL3x` to accept `language` and localize its name and session names ("Push" / "Pull" / "Legs").
- [ ] **Update workout template seeds (Upper/Lower)** (`src/db/seed.ts`)
    - Modify `seedUpperLower4x` to accept `language` and localize its name and session names.

## Phase 4: UI Implementation
- [ ] **Add language selector to Onboarding** (`src/pages/OnboardingPage.tsx`)
    - Implement a `ToggleGroup` or `Select` component for language selection at the start of the onboarding flow.
- [ ] **Trigger instant UI switch in Onboarding** (`src/pages/OnboardingPage.tsx`)
    - Call the language sync logic immediately upon selection so the rest of the onboarding form updates its language.
- [ ] **Pass language to onboarding mutation** (`src/hooks/mutations/onboardingMutations.ts`)
    - Ensure the selected language is passed through to the service layer for seeding.
- [ ] **Update Settings switcher** (`src/pages/Settings/components/AppearanceSettingsSection.tsx`)
    - Refactor the existing language toggle to persist changes to `GlobalAppState` via the system service.
- [ ] **Add global scope disclaimer to UI** (`src/pages/Settings/components/AppearanceSettingsSection.tsx`)
    - Add the text: *"Language applies to all profiles on this device."* (localized).

## Phase 5: Portability & Backups
- [ ] **Update CSV Export** (`src/services/csvService.ts`)
    - Include `description` and `keyPoints` in the exercise export headers and data rows.
- [ ] **Update CSV Import** (`src/services/csvService.ts`)
    - Ensure the import parser handles the new fields and provides empty string defaults for older files.
- [ ] **Update JSON Backup** (`src/services/backupService.ts`)
    - Verify that `Exercise` serialization includes the new localized fields for full backup integrity.

## Phase 6: Validation & Testing
- [ ] **Test Seed Localization (EN)** (`src/db/seed.test.ts`)
    - Assert that `seedExercises('en')` produces "Bench Press" (Title Case) and English descriptions.
- [ ] **Test Seed Localization (IT)** (`src/db/seed.test.ts`)
    - Assert that `seedExercises('it')` produces "Panca piana" (Sentence case) and Italian descriptions.
- [ ] **Test Global State Persistence** (`src/db/globalMetaDb.test.ts`)
    - Verify that setting the language persists correctly across database re-initializations.
- [ ] **Verify Backup/Restore compatibility** (`tests/integration/backup.test.ts`)
    - Ensure that an old backup (without description/keyPoints) can still be imported successfully.
