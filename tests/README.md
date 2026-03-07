# Testing Architecture

This directory contains the comprehensive testing suite for the Workout Tracker application. The tests are organized by type and domain to ensure maintainability and scalability.

## Directory Structure

- **`unit/`**: Isolated tests for individual functions, classes, and hooks. Mock dependencies where possible.
- **`integration/`**: Tests that verify the interaction between multiple units (e.g., Component + Service + Store). Uses `renderWithProviders`.
- **`e2e/`**: End-to-End tests using Playwright to verify critical user journeys in a real browser environment.
- **`mocks/`**: Centralized mock implementations for external dependencies (Browser APIs, Database, Network).
- **`fixtures/`**: Reusable data builders and factories to generate consistent test data.
- **`utils/`**: Helper functions and custom renderers for testing.
- **`setup/`**: Global test environment configuration (e.g., Vitest setup).

## Running Tests

- **Unit & Integration**: `npm test` (Runs Vitest)
- **E2E**: `npx playwright test` (Runs Playwright)
