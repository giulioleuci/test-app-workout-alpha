# Workout Tracker — Design System and Visual Conventions

This document describes the visual design principles, layout patterns, component conventions, and interaction feedback standards used throughout the application.

> **Flutter implementation note**: Analytics charts (volume bar charts, load/RPE line charts, compliance pie chart, frequency bar chart) are implemented using **`fl_chart`**. Loading skeleton screens on all list and detail pages use **`shimmer`** animated placeholder widgets. Paginated lists (Exercise Library, Session History, 1RM page) use **`infinite_scroll_pagination`** with a page size of 20 items and a `PagingController` integrated with Riverpod providers. See `13_flutter_implementation_stack.md` for chart configurations, skeleton widget patterns, and pagination integration details.

---

## Layout Principles

### Responsive Adaptation
The application is designed for two primary form factors:
- **Mobile (small screens)**: Single-column vertical layout, bottom navigation bar, full-screen modals.
- **Tablet/Desktop (large screens)**: Two-column layouts in some pages, left sidebar navigation, centered dialogs.

Breakpoints:
- `sm` → 640px
- `md` → 768px
- `lg` → 1024px

### Safe Area Awareness
On mobile native platforms, the layout respects system safe areas (notch, home indicator). Bottom navigation and FABs are offset by `env(safe-area-inset-bottom)`.

### Spacing System
Spacing follows a consistent scale (multiples of 4px base unit):
| Token | Size |
|---|---|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 48px |
| `3xl` | 64px |

### Page Content Width
Content is contained with a maximum width on large screens. Padding is applied horizontally on all screen sizes.

---

## Color System

### Themes
The application supports Light, Dark, and System (follows device preference) themes.

Colors are defined as CSS custom properties (design tokens) so that dark/light switching is achieved by swapping a root set of variables.

### Semantic Color Roles
| Role | Usage |
|---|---|
| `background` | Page background |
| `foreground` | Primary text |
| `card` | Card backgrounds |
| `card-foreground` | Card text |
| `primary` | Primary action color (buttons, highlights) |
| `primary-foreground` | Text on primary-colored backgrounds |
| `secondary` | Secondary actions |
| `muted` | Inactive states, placeholder text |
| `muted-foreground` | Secondary/hint text |
| `accent` | Highlighted elements |
| `destructive` | Danger zone actions, error states |
| `destructive-foreground` | Text on destructive backgrounds |
| `border` | Borders and dividers |
| `input` | Input field backgrounds |
| `ring` | Focus ring color |

### Color Palettes
The user can choose from multiple predefined color palettes that affect the `primary` and `accent` colors. Each palette is a set of CSS variables for all roles in both light and dark modes.

### Status Colors
Specific semantic colors for training-related status:
| Status | Color Meaning |
|---|---|
| Compliance: Fully Compliant | Green |
| Compliance: Within Range | Amber/Yellow |
| Compliance: Below Minimum | Red |
| Compliance: Above Maximum | Orange |
| Compliance: Incomplete | Gray |
| RPE: 6.0–7.0 | Green (easy effort) |
| RPE: 7.5–8.5 | Amber (moderate effort) |
| RPE: 9.0–10.0 | Red (maximal effort) |
| Performance: Improving | Green with up arrow |
| Performance: Stable | Blue with right arrow |
| Performance: Stagnant | Orange with flat arrow |
| Performance: Deteriorating | Red with down arrow |
| Set Count Advice: Do Another | Blue/neutral |
| Set Count Advice: Optional | Amber |
| Set Count Advice: Stop | Red |

---

## Typography

### Scale
| Style | Usage |
|---|---|
| `h1` | Page titles |
| `h2` | Section headings |
| `h3` | Card titles |
| `h4` | Subsection titles |
| `body` | Default body text |
| `body-sm` | Secondary text |
| `caption` | Labels, metadata |

### Principles
- Primary language: Italian. All user-facing strings are localized.
- Numbers use locale-appropriate formatting (thousands separators, decimal points).
- Dates use locale-aware formatting (day/month/year for Italian).
- Duration formatting: "X min Y s" or "X–Y min" for ranges.

---

## Component Conventions

### Cards
Cards are the primary container for content groups. They have a white/dark background, subtle border, rounded corners (typically 8–12px), and padding.

Card variants:
- **Default**: Standard content card.
- **Interactive**: Hover/tap state (cursor pointer, subtle shadow lift).
- **Destructive**: Red border or background for danger zone actions.

### Buttons
Button hierarchy:
- **Primary**: Filled, primary color. Used for the main action on a page/dialog.
- **Secondary**: Filled, secondary/muted color. Used for complementary actions.
- **Outline**: Border only. Used for secondary or cancel actions.
- **Ghost**: Invisible background, visible only on hover. Used for icon buttons and menu items.
- **Destructive**: Red fill. Used for dangerous actions (delete, reset).
- **Link**: Appears as text with underline. Used for navigation-style actions.

Button sizes:
- **Default** (h=40px)
- **Small** (h=36px)
- **Large** (h=44px)
- **Icon** (square, no text)

### Floating Action Button (FAB)
Circular button fixed at the bottom-right (mobile) or bottom-right offset from content (desktop). Used for the primary creation action on each page. Size: 56px diameter on mobile, 48px or auto-width pill on desktop.

Positioning: `bottom: calc(4rem + env(safe-area-inset-bottom) + 0.75rem); right: 1rem` on mobile (above bottom navigation bar).

### Badges
Small inline chips for status and category labels. Color-coded by semantic meaning.

### Dialogs / Modals
Centered overlay with backdrop. Keyboard dismissible (Escape key). Focus trapped within dialog.

### Bottom Sheets
Slide-up panel from the bottom edge of the screen. Used on mobile for pickers and quick actions. Includes a drag handle.

### Accordions
Expandable sections with a toggle header. Used for Upcoming/Completed exercises, history rows, and analytics details.

### Tabs
Horizontal tab bar for switching between content sections. Used in Analytics page and Settings page.

### Input Fields
All text inputs have a visible border, focus ring, and placeholder text. Numeric inputs include step controls (tap-and-hold to increment, or type directly).

### Select Menus
Custom dropdown/combobox components replacing native selects. Support search filtering for long lists.

### Checkboxes and Toggles
Checkboxes for multi-select (filter panels, backup categories, seed options). Toggles/switches for binary preferences (auto-rest timer, simple mode).

### RPE Selector
A horizontal scrollable chip row showing all RPE values from 6.0 to 10.0 in 0.5 increments. Tapping a chip selects it. Color shifts from green to red as value increases. On desktop, may render as a slider.

---

## Navigation Components

### AppHeader (Mobile)
Persistent top bar showing:
- Back button (on detail pages)
- Current page title
- Optional actions (e.g., save, edit)

Height: 56px. Elevated above content with shadow.

### MobileBottomNav
Fixed bottom bar with 5 destination icons.
Height: 52px + safe area inset.
Active tab highlighted with primary color.

### DesktopSidebar
Left sidebar, 240px wide, fixed. Shows all navigation destinations as labeled rows with icons.

---

## Loading and Empty States

### Skeleton Screens
While data loads, page skeletons are shown:
- `ListPageSkeleton`: Multiple card-shaped gray placeholders, animated shimmer.
- `DetailPageSkeleton`: Header placeholder + content placeholders.

### Empty States
When lists have no items, a centered illustration (icon) with a descriptive message is shown. Often accompanied by a primary action button ("Create your first workout").

### Error States
Toast notifications appear at the bottom of the screen for both success and error feedback. Destructive toasts use the `destructive` color. Toasts auto-dismiss after 5 seconds.

---

## Animation Conventions

- **Page transitions**: Fade or slide depending on navigation direction.
- **Modal entry**: Scale up + fade in (200ms).
- **Accordion expand/collapse**: Smooth height animation (150ms).
- **Rest timer countdown**: Circular progress ring decrements smoothly.
- **Badge state changes**: Brief color transition on compliance status update.
- **Loading states**: Pulsing/shimmer on skeleton placeholders.
- **FAB**: Appears with a scale animation on pages that have it.

---

## Iconography

Icons use the Lucide icon library (consistent stroke-based style). All icons are 20×20px (standard) or 16×16px (small inline use).

Key icon-to-action mappings:
| Icon | Action / Meaning |
|---|---|
| Plus (+) | Add / Create |
| Pencil | Edit |
| Trash | Delete |
| Archive | Archive |
| ArrowUp / ArrowDown | Reorder |
| ChevronRight | Navigate to detail |
| Bars / Menu | Open menu |
| Search (magnifier) | Search |
| Filter | Filter |
| Download | Export / Download |
| Upload | Import |
| Check | Complete / Confirm |
| X | Close / Dismiss / Cancel |
| RefreshCW | Overwrite / Reset |
| SkipForward | Skip |
| Copy | Duplicate / Copy strategy |
| Play | Start session |
| Timer | Rest timer |
| Dumbbell | Exercise / Workout |
| BarChart3 | Analytics |
| History/Clock | History / Past sessions |
| Settings gear | Settings |
| User | Profile |
| Shield | Backup / Security |
| AlertTriangle | Warning |
| TrendingUp / TrendingDown | Performance improving / declining |

---

## Feedback Patterns

### Immediate Feedback
- Input fields respond to changes immediately (no delay).
- Toggle switches change state instantly and persist.
- Compliance badges update immediately after a set is completed.

### Deferred Feedback
- Analytics load after a brief data-fetch delay (skeleton shown in the interim).
- Load suggestions may have a short computation delay (displayed with a loading indicator on the badge).

### Confirmation Dialogs
Destructive or irreversible actions always require a confirmation dialog (`AlertDialog`) with:
- A title (what is about to happen).
- A description (consequences, e.g., "This will permanently delete all your training data.").
- A "Cancel" button (dismisses without action).
- A "Confirm" button styled in destructive color.

### Toast Notifications
Used for non-blocking success and error feedback. Appear from bottom. Content: title (required) + description (optional).

### Form Validation Feedback
- Inline error text below invalid fields.
- Submit button disabled while required fields are invalid.
- On submission failure, error is displayed near the relevant field or as a toast.
