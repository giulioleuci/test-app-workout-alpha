# Technical Specification: Single-Page Profile & Athlete Creation Refactor

## 1. Context & Objective
The current profile creation flow (located in `CreateUserDialog.tsx`) uses a multi-step wizard that creates friction. It separates "Global Profile" info from "Athlete" info and "Database Seeding" options into two distinct steps.

The objective is to refactor this into a **single-page, visually rich configuration experience** (Proposal 1+2: Smart Defaults + Profile Card). We want to transform a "form to fill" into a "profile to configure."

## 2. Key UI/UX Requirements

### A. Dynamic Profile Card Preview
- At the top of the container, implement a **Profile Card** that updates in real-time.
- It should feature a large colored Avatar (circle) with the athlete's initials.
- The background color must react instantly to the color selection tokens.

### B. Smart Name Sync with "Pencil" Override
- **Default Behavior:** Only one "Athlete Name" input is visible. As the user types, the "Profile Name" (internal app identifier) automatically syncs with the same value.
- **The Pencil Mechanism:** Add a Lucide `Pencil` icon next to the name. Clicking it decouples the names and reveals a secondary "Profile Name" field (e.g., for users who want a "Home Workout" profile named differently from the "Giulio" athlete).
- **Validation:** Both fields must remain synchronized unless the user explicitly "breaks" the link via the pencil icon.

### C. Visual Interaction Components
- **Gender Selection:** Replace the `Select` dropdown with a `ToggleGroup` (Shadcn UI) or a row of large `Button` components (Male, Female, Undisclosed) with icons. One-tap selection.
- **Color Selection:** Ensure the color tokens (from `AVATAR_COLORS`) are large, touch-friendly circles with a "selected" indicator (e.g., a checkmark or ring).
- **Weight Input:** Compact numeric input with clear "kg" suffix.

### D. Integrated Seeding (Training Library)
- Eliminate Step 2. Place "Workout Library" options in the same flow.
- Use a clean **Grid (2x2 or 2x3)** for the workout plans (Full Body, PPL, etc.).
- Each plan should be represented as a selectable "Card" or "Chip" with an icon and label, rather than just a small checkbox.

## 3. Technical Implementation Details

### Files to Modify
1.  `src/components/auth/CreateUserDialog.tsx`: The primary logic and layout container.
2.  `src/i18n/locales/en/translation.json` (and all other languages): Update/add keys for:
    - Tooltips for the pencil icon (e.g., "Customize profile name").
    - Better labels for the integrated library section.
    - Improved call-to-action (e.g., "Create Profile & Start").
3.  `src/domain/schemas.ts`: (If applicable) Update the Zod schema to handle the optional decoupling of names.

### Logic Requirements (React Hook Form + Zustand)
- Use `form.watch('athleteName')` to drive the `profileName` value in a `useEffect` if the "isSynced" state is true.
- Manage a local `isNameSynced` boolean state to control the visibility of the secondary field and the sync logic.
- Ensure the `onSubmit` logic correctly handles the decoupled names to `userService.createUser`.

## 4. Design Rationale
- **Reduced Friction:** No "Next/Back" buttons. Users see the full scope of requirements immediately.
- **Mobile First:** One-tap toggles and large targets are superior to selects and tiny checkboxes on touch screens.
- **Identity Building:** The real-time avatar preview creates a sense of ownership over the new profile.
