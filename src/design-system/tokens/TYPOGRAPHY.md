# Typography Design Tokens

The typography system for the Workout Tracker app is centralized in `src/design-system/tokens/typography.ts`. It provides a consistent scale for font sizes, families, and semantic text styles.

## Font Families

- **Sans-Serif**: `Inter`, system-ui, sans-serif (Primary for all UI elements).
- **Monospace**: `JetBrains Mono`, monospace (Used for numbers and code-like elements).

## Font Size Scale

| Token | Size (px) | Usage |
|-------|-----------|-------|
| `2xs` | 10px      | Captions, very small labels |
| `xs`  | 12px      | Secondary labels, small text |
| `sm`  | 14px      | Component body text |
| `base`| 16px      | Default body text |
| `lg`  | 18px      | Large body, small headers |
| `xl`  | 20px      | H4 headings |
| `2xl` | 24px      | H3 headings |
| `3xl` | 30px      | H2 headings (mobile: 24px) |
| `4xl` | 36px      | H1 headings (mobile: 30px) |

## Semantic Utility Classes

The following classes should be used instead of hardcoded `text-*` classes to ensure consistency and responsiveness:

- `.text-h1`: Primary page headings.
- `.text-h2`: Section headings.
- `.text-h3`: Card titles and sub-sections.
- `.text-h4`: Small component headings.
- `.text-body`: Standard body text (16px).
- `.text-body-sm`: Smaller body text (14px).
- `.text-caption`: Caption and metadata text (10px).

## Implementation Details

- **Responsive**: `text-h1` and `text-h2` automatically adjust their size on mobile screens via media queries in `index.css`.
- **Tailwind**: The scale is mapped to Tailwind's configuration in `tailwind.config.ts`.
