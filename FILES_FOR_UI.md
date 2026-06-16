# Files for User Interface (UI)

This document maps the primary files responsible for the application's user interface, organized by feature and functional area.

## 1. Core Layout & Navigation
- `src/components/layout/AppLayout.tsx`: Main layout wrapper, manages navigation structure and page transitions.
- `src/components/layout/AppHeader.tsx`: Top navigation bar with page titles and active session status.
- `src/components/layout/MobileBottomNav.tsx`: Bottom navigation optimized for mobile devices.
- `src/components/layout/DesktopSidebar.tsx`: Sidebar navigation for larger screens.

## 2. Page Components
- `src/pages/Dashboard/`: Main entry point with session suggestions and consistency tracking.
- `src/pages/WorkoutList/`: Overview of training plans (active, inactive, archived).
- `src/pages/WorkoutDetail/`: Detailed view of a training plan, including session management.
- `src/pages/SessionDetail/`: Configuration and exercise management for a specific training session.
- `src/pages/ActiveSession/`: Real-time logging interface for active workouts.
- `src/pages/ExerciseList/`: Searchable database of exercises.
- `src/pages/AnalyticsPage/`: Visualizations for volume, compliance, and progress.
- `src/pages/HistoryList/`: Chronological list of completed workout sessions.
- `src/pages/HistoryDetail/`: Detailed summary and performance analysis of a completed session.
- `src/pages/SettingsPage/`: App configuration, user profile, and system maintenance.
- `src/pages/ProfilePage/`: User statistics, body weight tracking, and profile management.
- `src/pages/BackupPage/`: Data export/import and portability tools.
- `src/pages/OneRepMaxPage/`: Management of 1RM records and strength projections.
- `src/pages/OnboardingPage/`: Initial setup experience for new users.

## 3. Specialized UI Features
- `src/components/session/`: Components specific to workout execution (RestTimer, LoadSuggestion, WarmupCalculator).
- `src/components/planning/`: Components for workout configuration (SetConfiguration, WarmupStrategy).
- `src/components/analytics/`: Charting and data visualization components.
- `src/components/ui/`: Base component library (Buttons, Dialogs, Cards, Skeletons, etc.).
- `src/components/backgrounds/PageBackground.tsx`: Standardized app background.

## 4. Design & Aesthetics
Refer to `FILES_FOR_DESIGN.md` for detailed information on design tokens, global styles, and the design system architecture.
