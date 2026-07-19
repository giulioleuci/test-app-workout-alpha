# Proposed New Tests for Workout Tracker 2

This report outlines a strategy for enhancing the test coverage of the Workout Tracker 2 application. Based on an analysis of the existing codebase and test suite, several critical areas have been identified as candidates for new tests.

## 1. Unit Tests for Core Business Logic (Services)

### Compliance Analyzer (`src/services/complianceAnalyzer.ts`)
*   **Reasoning**: This service is responsible for the "Performance & Compliance Feedback" feature. It contains pure logic that compares actual performance against planned ranges.
*   **Test Cases**:
    *   Verify `analyzeParameter` for values within, below, and above range.
    *   Test `analyzeSetCompliance` with various combinations of rep, load, and RPE compliance.
    *   Check edge cases like `null` values or open-ended ranges (no maximum).

### Analytics Calculators (`src/services/analyticsCalculators.ts`)
*   **Reasoning**: These functions handle complex calculations for volume, RPE accuracy, and progression. Small errors here could lead to misleading user data.
*   **Test Cases**:
    *   `calculateVolumeMetrics`: Ensure primary (1.0) vs. secondary (0.5) muscle weighting is correct.
    *   `calculateRPEAccuracy`: Verify deviation calculations across multiple sessions.
    *   `calculateWeeklyFrequency`: Test date boundary logic and target compliance.
    *   `calculateRPEStats`: Verify linear regression logic for trend detection.

### Muscle Deducer (`src/services/muscleDeducer.ts`)
*   **Reasoning**: Critical for the "Muscle Overlap Matrix". It maps exercises to muscle groups.
*   **Test Cases**:
    *   Verify that compound exercises correctly contribute to multiple muscle groups.
    *   Ensure custom exercises with various metadata are handled correctly.

### CSV Import/Export Services (`src/services/csv*Service.ts`)
*   **Reasoning**: Data portability is a key feature. Importing malformed or incomplete CSVs can lead to database corruption.
*   **Test Cases**:
    *   Test importing CSVs with missing columns, invalid dates, or out-of-range numeric values.
    *   Verify that exported CSVs can be successfully re-imported (round-trip integrity).

## 2. Unit Tests for Custom Hooks

### Performance Trends (`src/hooks/usePerformanceTrends.ts`)
*   **Reasoning**: This hook likely coordinates multiple service calls and transforms raw database data into a format suitable for charts (e.g., Recharts).
*   **Test Cases**:
    *   Verify data transformation logic when the user filters by exercise or timeframe.
    *   Ensure correct handling of empty states (no history for a specific exercise).

### Color Palette & Theme (`src/hooks/useColorPalette.ts`, `src/hooks/useTheme.ts`)
*   **Reasoning**: Ensures the design system's "Theme-First" principle is consistently applied.
*   **Test Cases**:
    *   Verify that the correct tokens are returned based on the active palette and mode.
    *   Test the interaction between system preferences and manual overrides.

## 3. Component & UI Testing

### Muscle Overlap Matrix (`src/components/planning/MuscleOverlapMatrix.tsx`)
*   **Reasoning**: A complex visual component that helps users balance their training volume.
*   **Test Cases**:
    *   Verify that the matrix updates correctly as exercises are added/removed from a template.
    *   Test tooltips and accessibility labels for the heat-map cells.

### Rest Timer & Sound Feedback
*   **Reasoning**: Important for in-session utility.
*   **Test Cases**:
    *   Verify timer countdown accuracy and UI updates.
    *   Test that notification sounds or vibrations are triggered at the correct intervals (using mocks for browser APIs).

## 4. Integration Tests

### Backup & Restore Flow (`src/pages/BackupPage.tsx`)
*   **Reasoning**: One of the most critical paths for user data safety.
*   **Test Cases**:
    *   Full flow: Trigger export -> Verify file structure -> Clear database -> Import file -> Verify data restoration.
    *   Validation: Attempt to import a file with an incompatible schema version.

### Multi-User Profile Management
*   **Reasoning**: Support for multiple local profiles needs robust isolation.
*   **Test Cases**:
    *   Create User A -> Add Data -> Switch to User B -> Verify User B sees no data from User A -> Switch back to User A -> Verify data is still present.
