# Workout Tracker 2 Design System

Centralized design tokens extracted from the application codebase.

## Quick Start

```typescript
import { colors, spacing, typography } from '@/design-system';

// Use in styled components or inline styles (if needed)
const style = {
  backgroundColor: colors.action.primary,
  padding: spacing[4],
  fontFamily: typography.fontFamily.sans,
};
```

## Token Categories

- **Colors**: `colors.action.primary`, `colors.status.success`, `colors.trend.improving`, etc.
- **Spacing**: `spacing[1]` (4px) to `spacing[24]` (96px).
- **Typography**: `typography.fontSize.base`, `typography.fontWeight.semibold`, etc.
- **Shadows**: `shadows.sm`, `shadows.md`, etc.
- **Borders**: `borders.radius.lg`, `borders.width.thin`.
- **Transitions**: `transitions.animations.fadeIn`, `transitions.duration.normal`.
- **Breakpoints**: `breakpoints.md`, `breakpoints.lg`.
- **Z-Index**: `zIndex.modal`, `zIndex.fab`, `zIndex.docked`.

## Philosophy

This design system was created by **extracting existing patterns**. It describes what IS currently in the app, providing a centralized foundation for future consistency without changing the current visual appearance.

## Migration Strategy

1. **Extraction** (Current) — Create the token files.
2. **Mapping** — Identify where tokens should be applied.
3. **Application** — Replace hardcoded values/classes with token references.

## TypeScript Support

All tokens are fully typed. IDEs will autocomplete token names and ensure type safety.

```typescript
import { colors } from '@/design-system';

// ✅ Autocomplete will show primary, secondary, status, trend, etc.
const color = colors.semantic.action.primary;
```
