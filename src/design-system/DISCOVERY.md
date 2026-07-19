# Design System Discovery Report

Generated: February 19, 2026

## Purpose

This document records the design token extraction process from the Workout Tracker app.
It serves as a reference for understanding what tokens exist and why.

## Methodology

1. Ran comprehensive search commands using `find` and `grep` to scan the entire codebase.
2. Analyzed `tailwind.config.ts` and `src/index.css` for core theme definitions.
3. Frequency analysis of all design values (spacing, typography, colors).
4. Semantic categorization based on usage context (e.g., trend colors for performance).

## Token Statistics

| Token Category | Total Usages (Detected) | Key Findings |
|---------------|-------------------------|--------------|
| Colors | ~70 instances | Heavily based on Shadcn UI / HSL variables. |
| Spacing | 724 instances | Dominant use of Tailwind gap-2 (127) and gap-1 (103). |
| Typography | 410 instances | Inter font family is standard; JetBrains Mono for metrics. |
| Z-Index | ~40 instances | Standardized on 10, 30, 40, 50 layers. |

## Key Findings

### Colors
- **Primary brand color**: `hsl(var(--primary))` mapped to Blue (approx #3b82f6).
- **Metric success**: `hsl(var(--success))` mapped to Green.
- **Trend colors**: Specialized HSL variables for `improving`, `stable`, `stagnant`, `deteriorating`.
- **Neutral palette**: Balanced between backgrounds (`0 0% 98%`) and foregrounds (`220 20% 10%`).

### Spacing
- **Base unit**: 4px (0.25rem).
- **Most used value**: `gap-2` (8px) for layout, `p-3`/`p-4` (12px/16px) for cards.
- **Radius**: Centralized on `0.5rem` (8px) via `--radius`.

### Typography
- **Primary font**: Inter (400, 500, 600, 700 weights).
- **Heading hierarchy**: Semi-bold with tight tracking is the app signature.
- **Mono font**: JetBrains Mono used for technical data/metrics.

## Files Analyzed

Total files scanned: 107 (TypeScript/TSX/CSS)

## Next Steps (Phase 2)

Identify specific locations in these 107 files where hardcoded values can be replaced by these centralized tokens to ensure future maintainability.

## Preservation Note

⚠️ **CRITICAL**: This design system captures the CURRENT state.
No visual changes occurred during this extraction phase.
All token values exactly match the existing implementation.
