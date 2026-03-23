# Workout Tracker 2 Project Context

This document provides essential context and instructions for working on the Workout Tracker 2 project with Gemini CLI.

## Project Overview

The Workout Tracker 2 is a modern, offline-first web and mobile application designed for serious lifters. It focuses on detailed session tracking, volume analysis, and progress monitoring.

### Core Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Shadcn UI, Radix UI primitives, Lucide icons
- **State Management**: Zustand (global state), Tanstack Query (server/async state)
- **Database**: Dexie.js (IndexedDB wrapper) for persistent offline storage
- **Mobile Integration**: Capacitor (Android/iOS support)
- **Forms & Validation**: React Hook Form, Zod
- **Testing**: Vitest (Unit/Integration), Playwright (Visual/Smoke)

### Architecture
The project follows a modular structure:
- `src/design-system/`: Centralized source of truth for design tokens (colors, spacing, typography, etc.).
- `src/components/`: UI components, categorized by feature (analytics, dashboard, exercises, layout, planning, session).
- `src/components/ui/`: Base UI library (Shadcn UI).
- `src/db/`: Database schema (Dexie), fixtures, and seeding logic.
- `src/domain/`: Domain entities, enums, and value objects (the core "business" model).
- `src/services/`: Business logic and data processing (analytics, compliance, performance, etc.).
- `src/stores/`: Zustand stores for application state (e.g., `activeSessionStore`).
- `src/pages/`: Page-level components and routing.
- `src/hooks/`: Reusable React hooks.
- `src/lib/`: Shared utilities and formatting helpers.

## Design System & UI

The project employs a centralized, token-based Design System to ensure visual consistency, accessibility, and themeability.

### Core Principles
- **Single Source of Truth**: All design decisions (colors, spacing, typography, z-index, breakpoints) are defined as tokens in `src/design-system/tokens/`.
- **Theme-First**: All components must support Light/Dark modes and the active Color Palette.
- **Semantic Mapping**: Avoid hardcoded values. Use semantic utility classes (e.g., `.text-h1`, `.text-on-primary`) or token references.

### UI Component Library
- **Shadcn UI**: Built on **Radix UI** primitives. Located in `src/components/ui/`.
- **Tailwind CSS**: Used for all layout and component styling.
- **Lucide Icons**: Standard icon set.

### Styling Conventions
- **Spacing**: Use standard Tailwind spacing or the `spacing` token object for inline styles.
- **Typography**: Use semantic classes defined in `index.css`:
  - `text-h1` to `text-h4` for headings.
  - `text-body` and `text-body-sm` for content.
  - `text-caption` for metadata (10px).
- **Colors**: Reference HSL variables (e.g., `text-primary`, `bg-card`) which are dynamically updated by the palette system.

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
# Create a production-ready build
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
```

### Mobile Development
```bash
# Sync web assets to native platforms
npx cap sync

# Open native projects
npx cap open android
npx cap open ios
```

## Development Conventions

### Data Persistence
- Use **Dexie.js** for all persistent data. Avoid `localStorage` for workout data.
- Database versions and upgrades are managed in `src/db/database.ts`.

### Styling & UI
- Use **Tailwind CSS** for layout and custom styling.
- Prefer **Shadcn UI** components located in `src/components/ui/`.
- Ensure a mobile-first, responsive design.

### State Management
- Use **Zustand** for transient UI state and the active session state.
- Use **Tanstack Query** (React Query) if interacting with external APIs or managing complex data fetching/caching logic.

### Testing
- Write Vitest tests for all new services and complex logic in `src/test/`.
- Use `fake-indexeddb` for database-related tests.
- Visual regressions and smoke tests are located in `tests/visual/` using Playwright.

### Code Style
- Follow the established ESLint and TypeScript configurations.
- Use functional components and React hooks.
- Define domain models in `src/domain/` to ensure type safety across the application.
