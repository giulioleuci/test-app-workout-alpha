# Task: Unified Profile Creation and User Onboarding Refactoring (Multi-step Form)

## Context
Currently, the application manages multi-user profiles in a two-step process:
1. **Profile Creation:** The user provides a "Profile Name".
2. **Onboarding:** Redirection to `OnboardingPage` for "User Data" (Name, Gender, Weight) and "Seed Options".

We want to merge these into a single, unified "Profile Passport" experience using a **multi-step animated form** (stepper) directly in the creation flow.

## Objective
Refactor the profile creation flow into a two-step wizard using `framer-motion` for transitions, eliminating the need for subsequent redirection to the `OnboardingPage`.

## Technical Requirements & Steps

### 1. Analysis Phase
- **UI/Pages:** Analyze `src/pages/UserSelectionPage.tsx` (the source) and `src/pages/OnboardingPage.tsx` (the data provider).
- **Animation:** Verify existing `framer-motion` usage in the project to maintain consistency in transition styles (e.g., slide or fade).
- **Hooks:** Check `src/hooks/mutations/onboardingMutations.ts` for the `onboardUser` logic.

### 2. Strategy (The Stepper)
Refactor the creation modal into a controlled multi-step component:

**Step 1: Identity & Biometrics**
- **Fields:** Profile Name (app context default: "Workout"), User Name (athlete context, default: "Athlete" in all languages), Gender (required, default: male), and Weight (optional).
- **Layout:** Use a single card but visually group Profile Name separately from Athlete details.
- **Navigation:** A "Next" button that validates current fields before proceeding.

**Step 2: Library Setup (Seed Data)**
- **Fields:** Checkboxes for Exercise Database and specific Workout Plans (Full Body, PPL, etc.).
- **Navigation:** "Back" button to return to Step 1, and "Create & Start" to finalize.

**Animation Logic:**
- Use `framer-motion` (`AnimatePresence`, `motion.div`) to handle the entry/exit animations of the two steps.
- Ensure the transition is smooth (e.g., Step 1 slides out to the left, Step 2 slides in from the right).

### 3. Implementation Details
- **Unified State:** Manage the state for both steps in a single parent component or a hook.
- **Atomic Submission:** The final "Start" button must:
    1. Create the profile in `globalMetaDb`.
    2. Initialize the DB and seed it with the selected options.
    3. Update `user_metadata` with the biometric data.
- **UserGate Update:** Ensure `UserGate.tsx` detects that the user is already "onboarded" if they used this new flow.

### 4. Verification
- Verify that the "Back" button preserves the data entered in Step 1.
- Verify the `framer-motion` transitions don't cause layout shifts or scroll issues.
- Confirm that the new profile starts directly at the Dashboard with all data correctly populated.

## Constraints
- Use Shadcn UI components for all inputs and buttons.
- Maintain i18n support for all new/moved labels. Use sentence case in Italian.
- Ensure the "Seed Exercises" logic is correctly handled (if unchecked, plans should be disabled).

Please proceed with the analysis of the mentioned files before proposing the final implementation plan.
