# Workout Tracker — Navigation and Routing

This document describes the application's navigation structure, routing model, user flow controls, and multi-user switching logic.

---

## Route Map

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Home screen |
| `/exercises` | Exercise List | Browse and manage exercises |
| `/workouts` | Workout List | Browse workout plans |
| `/workouts/new` | Workout Create | Create a new workout plan |
| `/workouts/:id` | Workout Detail | Manage sessions in a plan |
| `/workouts/:id/sessions/:sessionId` | Session Detail | Edit a planned session's content |
| `/analytics` | Analytics | Performance analytics |
| `/1rm` | 1RM Records | Manage one-rep max records |
| `/history` | History List | Browse past sessions |
| `/history/:id` | History Detail | View a past session's detail |
| `/settings` | Settings | Preferences and data management |
| `/profile` | Profile | User profile and body weight |
| `/backup` | Backup | Export and import data |
| `/templates/:templateId/edit` | Template Edit | Edit a session template |
| `/session/active` | Active Session | Live workout execution |
| `*` | Not Found | 404 catch-all |

---

## Application Bootstrap Flow

```
App Launch
    ↓
Check onboarding status
    ↓
No user exists? → Show OnboardingPage (blocks main app)
    ↓
OnboardingPage completed → Invalidate onboarding status → Show main app
    ↓
UserGate checks for active user
    ↓
No active user? → Show UserSelectionPage (blocks main app)
    ↓
Active user selected → Load user database → Show main app with routing
```

---

## Persistent Navigation

The main navigation is always visible while the main app is active:

### Mobile (small screens)
A fixed bottom navigation bar with 5 primary destinations:
1. **Dashboard** (home icon)
2. **Workouts** (list/plan icon)
3. **Active Session** (play/gym icon) — always visible; navigates to `/session/active`
4. **Analytics** (chart icon)
5. **More** (ellipsis) — opens a drawer or secondary navigation with: Exercises, History, 1RM, Profile, Backup, Settings

### Desktop/Tablet (large screens)
A persistent left sidebar with all navigation items visible simultaneously, including both primary and secondary destinations.

---

## Active Session Navigation Indicator

The Active Session tab/button in the navigation shows a visual indicator (e.g., a dot or pulsing color) when a session is in progress. This makes the active session always accessible regardless of the current page.

---

## Unsaved Changes Navigation Blocking

On pages with in-memory edits (Workout Detail session reordering, Session Detail planning), navigation away is intercepted if there are unsaved changes. The user is shown a dialog with three options:
1. **Save and Leave** — persists changes, then navigates.
2. **Leave Without Saving** — discards changes, then navigates.
3. **Cancel** — stays on the current page.

This blocking applies to both back navigation and clicking any nav link.

---

## Session Activation Flow (cross-page)

Session activation can be triggered from:
- Dashboard → NextSessionSuggestionCard "Start Session" button
- Workout Detail → Session card "Start" button

The activation flow is:

```
User taps "Start Session"
    ↓
Phase 1: prepareSessionActivation(plannedSessionId)
    ↓
Any substitution history found?
    ├── Yes → Show SubstitutionConfirmDialog
    │          User confirms choices → Phase 2 with choices
    └── No  → Phase 2 immediately
    ↓
Any existing session in progress?
    ├── Yes → Show PendingSessionDialog
    │          User chooses "Resume" → navigate to /session/active
    │          User chooses "Discard" → discard old session, continue activation
    │          User cancels → abort
    └── No  → Continue
    ↓
Phase 2: activateSession(plannedSessionId, substitutionChoices)
    ↓
WorkoutSession created in database
    ↓
Navigate to /session/active
```

---

## Multi-User Model

### User Switching

Accessible from the Settings page → User Management section.

The `UserSwitcher` component lists all GlobalUsers. When the user taps a different account:
1. Current user's database is closed.
2. If the target user has a PIN, `PinEntryDialog` is shown.
3. On successful PIN entry (or if no PIN), the target user's database is opened and their data is loaded.
4. All cached query data is cleared.
5. `lastActiveUserId` in GlobalAppState is updated.
6. The app refreshes to show the new user's data.

### PIN Entry

`PinEntryDialog` shows an OTP-style input of 4–6 digits. The entered PIN is hashed and compared to the stored hash. Incorrect PIN shows an error; the dialog remains open for retry. There is no lockout after failed attempts in the current implementation.

### Creating a New User

`CreateUserDialog` fields:
- Name (required)
- PIN (optional; a 4-digit number; confirmed by entering twice)
- Avatar color (selected from 8 predefined hex colors)

On save, the GlobalUser is created and their isolated database is initialized.

### Deleting a User

`DeleteAccountSection` (within Settings → User Management) allows deleting the current user's account and all associated data. Requires a confirmation dialog. The application then shows the UserSelectionPage. The last remaining user cannot be deleted.

---

## Deep Linking Considerations

The application uses hash-based or path-based routing depending on deployment context. On native mobile platforms, the URL scheme is fixed to the local bundle. Deep links to specific sessions or workout detail pages are constructed from IDs present in the data.

---

## Back Navigation

- From any detail page (Workout Detail, Session Detail, History Detail), a back button in the AppHeader returns to the parent list page.
- From Active Session, back navigation returns to the Dashboard (the session remains in progress).
- The Onboarding and UserSelection pages have no back navigation — they are blocking gates.

---

## Loading States

All pages show a skeleton loading screen while data is being fetched:
- `ListPageSkeleton` — for list pages (multiple card placeholders).
- `DetailPageSkeleton` — for detail pages (header + content area placeholders).

These are shown immediately while the data layer resolves and replace with content on completion.

---

## Error States

- If a route references an entity that does not exist (e.g., `/workouts/unknown-id`), the page renders with a "Not found" or empty state, or redirects to the parent list.
- If the active session page is visited but no session is in progress, `ActiveSessionNoSession` is shown with a reset option and a link back to the dashboard.
