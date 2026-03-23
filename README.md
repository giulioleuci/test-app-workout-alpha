# Workout Tracker 2

A modern, offline-first workout tracking application built with React, Vite, and TypeScript. Designed for serious lifters, it offers detailed session tracking, volume analysis, progress monitoring, and seamless data backup.

> **Vibe Coding & AI-First Development**: This application was architected and implemented using an end-to-end **Vibe Coding** methodology. Initial scaffolding was performed via **Lovable**, followed by iterative refactoring for Separation of Concerns (SoC) and performance optimization. The codebase was evolved using next-generation LLMs including **Google Gemini 3**, **Claude 4.5**, and **Claude 4.6 (Sonnet/Opus)**, leveraging advanced AI agentic environments such as **Google Antigravity**, **Jules**, and **Claude Code**.

## Key Features

- **Active Session Tracking**: Log sets, reps, load, and RPE in real-time with an intuitive interface.
- **Workout Templates**: Create, edit, and manage reusable workout routines to streamline your training.
- **Comprehensive Analytics**: Visualize training volume by muscle group, movement patterns, and track progress over time.
- **Exercise Library**: detailed management of exercises, including categorization and custom entries.
- **History & Progress**: Review past workouts and analyze performance trends.
- **1RM Calculator**: Estimate and track your One Rep Max for key lifts.
- **Offline First**: Built on IndexedDB (via Dexie.js), ensuring full functionality without an internet connection.
- **Data Backup & Restore**: Securely export your data to a file and restore it whenever needed.
- **Mobile Optimized**: Fully responsive design with PWA capabilities and Capacitor support for mobile platforms.

## Tech Stack

This project leverages a modern stack to deliver a fast and reliable user experience:

- **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand), [Tanstack Query](https://tanstack.com/query/latest)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Mobile Integration**: [Capacitor](https://capacitorjs.com/)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/)

## Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (or bun/yarn/pnpm)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

### Development

To start the development server with hot reload:

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) (or the port shown in your terminal) to view the application.

### Building for Production

To create a production-ready build:

```bash
npm run build
```

The output will be in the `dist` directory.

### Testing

Run the test suite to ensure everything is working correctly:

```bash
npm test
```

To run tests in watch mode:

```bash
npm run test:watch
```

### Linting

To check for code quality issues:

```bash
npm run lint
```

## Project Structure

The source code is organized as follows:

- `src/components/`: Reusable UI components (Shadcn UI & custom).
- `src/db/`: Database schema, configuration, and seed data.
- `src/domain/`: Domain entities, value objects, and types.
- `src/hooks/`: Custom React hooks.
- `src/pages/`: Main application pages and route components.
- `src/services/`: Business logic and external service integrations.
- `src/stores/`: Global state management using Zustand.
- `src/test/`: Unit and integration tests.
- `src/lib/`: Utility functions and helpers.

## Mobile Development

This project uses Capacitor for mobile deployment.

To sync web assets to native platforms:

```bash
npx cap sync
```

To open the Android project (requires Android Studio):

```bash
npx cap open android
```


## License

[GPL-3.0](LICENSE)
