# Workout Tracker 2 - Project Context

This document provides essential context and instructions for working on the Workout Tracker 2 project with Gemini CLI.

## Project Overview

Workout Tracker 2 is a modern, offline-first web and mobile application designed for serious lifters. It focuses on detailed session tracking, volume analysis, progress monitoring, and seamless data management.

## Detailed Feature Set

### 1. Training & Active Session Logging
- **Real-time Logging**: Intuitive interface for tracking sets, reps, load, and RPE during a workout.
- **Smart Load Suggestions**: Dynamic load recommendations based on historical performance and calculated intensity.
- **Warmup Calculator**: Automatic generation of warmup sets tailored to your target working weight.
- **Rest Timer**: Integrated, configurable timers for managing recovery periods between sets.
- **Exercise Substitution**: Seamlessly replace exercises during an active session while maintaining progress.
- **Performance & Compliance Feedback**: Real-time badges indicating how your current performance compares to your plan and past sessions.
- **Cluster Set Support**: Specialized tracking for cluster sets and rest-pause training.
- **In-Session History**: Quick-access view of your past performance for the specific exercise you're performing.
- **Fatigue Monitoring**: Real-time indicators showing potential fatigue accumulation during a session.

### 2. Workout Planning & Template Management
- **Template Creator**: Build and organize reusable workout routines (templates) to streamline your training.
- **Volume Analysis**: Deep-dive analysis of planned session volume, categorized by muscle group and movement pattern.
- **Muscle Overlap Matrix**: Visualize how exercises in a session interact and overlap in terms of muscle activation.
- **Warmup Strategy Configuration**: Define custom warmup progressions for different exercises or muscle groups.
- **LexoRank Sorting**: Drag-and-drop reordering of exercises and sets using efficient LexoRank logic.

### 3. Advanced Analytics & Progress Tracking
- **Volume & Load Visualization**: Track total volume, average load, and tonnage over time with interactive charts.
- **Performance Trend Indicators**: Sophisticated indicators showing if you are progressing, plateauing, or overreaching.
- **Intensity & RPE Analysis**: Breakdown of training intensity distribution and perceived exertion trends.
- **Theoretical Performance Matrix**: Project your estimated 1RM across different repetition ranges based on your current data.
- **Strength-to-Weight Correlation**: Analyze your strength progress relative to your body weight trends.
- **Compliance Tracking**: Statistical analysis of how closely you adhere to your planned volume and intensity targets.

### 4. Exercise Library & Management
- **Extensive Exercise Database**: A comprehensive, searchable library of exercises with detailed metadata (muscles, movement patterns).
- **Historical Versioning (SCD Type 2)**: Maintains accuracy of past workout history by versioning exercises; if you rename or update an exercise, old records stay intact.
- **Custom Exercises**: Full support for adding and managing user-defined exercises.

### 5. Core Platform Features
- **Offline-First (IndexedDB)**: Built with Dexie.js for full functionality without internet, ensuring your data is always accessible.
- **Dashboard & Calendar**: A centralized training calendar and dashboard for an overview of your training consistency.
- **Backup & Portability**: Secure file-based export/import for data backup and cross-device migration.
- **Multi-User Profiles**: Support for multiple local user profiles with independent training data and profile management.
- **Internationalization (i18n)**: Fully localized in English, Italian, French, Spanish, and Chinese.
- **Cross-Platform Support**: Responsive web app, PWA, and native Android/iOS builds via Capacitor.

### Core Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Shadcn UI (Radix UI primitives), Lucide Icons
- **State Management**: Zustand (transient UI & active session state), Tanstack Query (server/async state)
- **Database**: Dexie.js (IndexedDB wrapper) for persistent offline storage
- **Mobile Integration**: Capacitor (Android support)
- **Forms & Validation**: React Hook Form, Zod
- **Testing**: Vitest (Unit/Integration), Playwright (E2E/Visual)
- **i18n**: i18next (React-i18next)

### Architecture
The project follows a modular and domain-centric structure:
- `src/domain/`: Core business logic, including `entities.ts`, `enums.ts`, and `value-objects.ts`.
- `src/db/`: Database schema (Dexie), migrations (currently v14), and lifecycle management.
- `src/services/`: Pure business logic and data processing (e.g., analytics, 1RM calculations).
- `src/stores/`: Zustand stores for application-wide state (e.g., `activeSessionStore.ts`).
- `src/hooks/`: Custom React hooks, divided into `queries/`, `mutations/`, and feature-specific hooks.
- `src/components/`: UI components categorized by feature (analytics, dashboard, exercises, layout, planning, session).
- `src/components/ui/`: Base UI library components (Shadcn UI).
- `src/pages/`: Page-level components and routing.
- `src/design-system/`: Centralized source of truth for design tokens (colors, spacing, typography, etc.).
- `src/lib/`: Shared utilities, formatting helpers, and core library wrappers (dayjs, lexorank).

### Architecture & Patterns
The application adheres to several key architectural patterns to ensure scalability, reliability, and offline performance:

1.  **Offline-First & Local-First Architecture**: The primary source of truth is the local IndexedDB (via Dexie.js). All data operations are performed locally first, ensuring the app remains fully functional without an internet connection.
2.  **Domain-Driven Design (DDD) Principles**:
    *   **Entities & Value Objects**: Core logic is encapsulated in domain entities and value objects (e.g., `PlannedWorkout`, `SessionSet`, `RPERange`).
    *   **Service Layer**: Business-critical calculations (analytics, volume tracking, 1RM estimation) are isolated in the `src/services` layer, making them pure, testable, and independent of UI logic.
3.  **Reactive & Flux-like State Management**:
    *   **Zustand (Global Store)**: Used for ephemeral or highly reactive UI state, such as the `activeSessionStore` which manages the real-time logging of a workout.
    *   **Tanstack Query (Server/Async State)**: Orchestrates the synchronization between the React UI and the asynchronous Dexie.js database. It handles caching, optimistic updates, and invalidation logic.
4.  **Separation of Concerns (SoC)**:
    *   **Hooks for Logic**: Complex UI-related logic and data fetching are abstracted into custom hooks, keeping components focused on rendering.
    *   **View Models**: Where necessary, hooks act as view models, transforming domain data into UI-ready formats.
5.  **Historical Tracking (SCD Type 2)**: The database maintains historical versions of exercises (`ExerciseVersion`) to ensure that past workout history remains accurate even if exercise metadata (name, muscles) changes over time.
6.  **LexoRank for Ordering**: All user-sortable lists (sessions, exercise groups, sets) use LexoRank (string-based ordering) to allow for efficient reordering without bulk updates to the database.

## Design System & UI

The project uses a centralized, token-based Design System to ensure visual consistency and themeability.

### Core Principles
- **Tokens as Truth**: All design decisions (colors, spacing, typography, etc.) are defined as tokens in `src/design-system/tokens/`.
- **Theme-First**: All components must support Light/Dark modes and the active Color Palette.
- **Semantic Classes**: Prefer semantic classes (e.g., `text-h1`, `text-body`) or utility classes over hardcoded values.

### UI Library
- **Shadcn UI**: Built on Radix UI primitives. Located in `src/components/ui/`.
- **Tailwind CSS**: Primary styling method.
- **Lucide Icons**: Standard icon set for the application.

## Building and Running

### Development
```bash
# Start the development server
npm run dev

# Run linting
npm run lint
```

### Building
```bash
# Create a production build
npm run build

# Build for development mode
npm run build:dev
```

### Testing
```bash
# Run unit and integration tests (Vitest)
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests (Playwright)
npm run test:e2e
```

### Mobile Development
```bash
# Sync web assets to native platforms
npx cap sync

# Open native projects (requires Android Studio / Xcode)
npx cap open android
npx cap open ios
```

## Development Conventions

### Data Persistence
- **Offline First**: All workout data is stored locally in IndexedDB using Dexie.js.
- **Schema Management**: Database versions and upgrades are managed in `src/db/database.ts`. Ensure new migrations are added sequentially.
- **LexoRank**: The project uses LexoRank for efficient ordering of sessions, groups, and sets.

### State Management
- Use **Zustand** for complex UI state that requires cross-component synchronization (e.g., active session logging).
- Use **Tanstack Query** for data fetching and synchronization with IndexedDB.

### Code Style
- Follow functional component patterns with React hooks.
- Strict TypeScript usage for all domain models and service logic.
- Use `dayjs` for all date manipulations.

### Testing
- Write Vitest tests for all new services and complex domain logic.
- Use `fake-indexeddb` for database-related tests.
- Visual regressions and smoke tests are handled via Playwright.
