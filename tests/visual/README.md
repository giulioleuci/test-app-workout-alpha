# Playwright Test Suite 🎭

This directory contains the visual and functional smoke test suite for the Workout Tracker application.

## Structure

```
tests/visual/
├── playwright.config.ts    # Main configuration
├── fixtures/               # Reusable test setup and state (e.g., onboarding, auth)
├── utils/                  # Shared utilities (navigation, assertions, interactions)
└── smoke/                  # Critical smoke tests (run on every change)
    ├── app-loads.spec.ts   # Verify app starts
    ├── onboarding.spec.ts  # Verify user onboarding flow
    └── navigation.spec.ts  # Verify main navigation
```

## Running Tests

To run the entire suite:

```bash
npx playwright test -c tests/visual/playwright.config.ts
```

To run a specific test file:

```bash
npx playwright test tests/visual/smoke/app-loads.spec.ts -c tests/visual/playwright.config.ts
```

To run in UI mode (interactive debugging):

```bash
npx playwright test --ui -c tests/visual/playwright.config.ts
```

## Adding New Tests

1.  **Identify the Scenario**: Is it a smoke test (critical path) or a specific feature test?
2.  **Create File**: Add a new `.spec.ts` file in the appropriate folder (e.g., `smoke/`).
3.  **Use Fixtures**: Use `test` from `fixtures/onboarding.fixture.ts` if you need a pre-onboarded state.
4.  **Use Utilities**: Import helpers from `utils/` instead of using raw `page` methods where possible.
