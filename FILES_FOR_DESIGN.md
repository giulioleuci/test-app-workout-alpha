# Files for Design and Aesthetics

This document lists all the files necessary to understand and modify the design system, overall aesthetic, and individual UI elements of the Delta Workout application.

## 1. Global Configuration & Styles
- `tailwind.config.ts`: Main Tailwind CSS configuration, including theme extensions, colors, spacing, and animations.
- `postcss.config.js`: PostCSS configuration.
- `components.json`: Shadcn UI configuration.
- `src/index.css`: Global CSS, Tailwind layers, and CSS variable definitions (Dark theme only).
- `src/App.css`: App-specific global styles.
- `src/lib/utils.ts`: Contains the `cn` utility for conditional Tailwind class merging.

## 2. Design System Tokens (`src/design-system/tokens/`)
These files define the core design tokens used throughout the app.
- `src/design-system/tokens/index.ts`: Central export for all tokens.
- `src/design-system/tokens/colors.ts`: Color palette and semantic color mappings.
- `src/design-system/tokens/spacing.ts`: Spacing scale and semantic spacing.
- `src/design-system/tokens/typography.ts`: Font families, sizes, weights, and line heights.
- `src/design-system/tokens/borders.ts`: Border radius and widths.
- `src/design-system/tokens/shadows.ts`: Box shadow definitions.
- `src/design-system/tokens/transitions.ts`: Animation durations and easing functions.
- `src/design-system/tokens/breakpoints.ts`: Responsive breakpoints.
- `src/design-system/tokens/z-index.ts`: Z-index scale.
- `src/design-system/tokens/TYPOGRAPHY.md`: Documentation for the typography system.

## 3. Design System CSS (`src/design-system/css/`)
- `src/design-system/css/tokens.css`: CSS variables for tokens.
- `src/design-system/css/utilities.css`: Custom utility classes.

## 4. Design System Utils & Hooks
- `src/design-system/utils/colors.ts`: Color manipulation utilities.
- `src/design-system/utils/spacing.ts`: Spacing utilities.
- `src/design-system/hooks/useResponsive.ts`: Hook for responsive design logic.
- `src/design-system/hooks/useTheme.ts`: Hook for accessing static design system tokens.

## 5. UI Components (Shadcn & Custom) (`src/components/ui/`)
These are the building blocks of the UI.
- `src/components/ui/*.tsx`: Individual UI components (Button, Card, Dialog, etc.).
- `src/components/ui/page-skeleton.tsx`: Standardized skeletons for page loading states.
- `src/components/ui/sonner.tsx`: Toast notifications.
- `src/components/ui/toaster.tsx`: Toast notifications.

## 6. Layout Components (`src/components/layout/`)
Define the overall structure and navigation.
- `src/components/layout/AppLayout.tsx`: Main application layout, including page transitions.
- `src/components/layout/AppHeader.tsx`: Top header component.
- `src/components/layout/DesktopSidebar.tsx`: Navigation for larger screens.
- `src/components/layout/MobileBottomNav.tsx`: Navigation for mobile devices.

## 7. Backgrounds (`src/components/backgrounds/`)
- `src/components/backgrounds/PageBackground.tsx`: Global page background component.

## 8. App Entry & Core
- `src/App.tsx`: Main entry point, router configuration, and global providers.
- `src/main.tsx`: React DOM rendering and global imports.
- `index.html`: Root HTML file with font imports and metadata.

## 9. Public Assets
- `public/manifest.webmanifest`: PWA manifest (theme colors, icons).
- `public/favicon.ico`: App favicon.
- `public/icon.png`: Main app icon.
- `public/pwa-192x192.png`: PWA icon.
- `public/pwa-512x512.png`: PWA icon.
- `public/placeholder.svg`: Placeholder image for exercises.
