# 1. Executive Summary

This document proposes a comprehensive, scalable, and highly performant page-level background system for Workout Tracker 2. The system aims to enhance the user experience by providing visually rich and context-aware backgrounds (animated and static) across the application, without compromising mobile performance or interfering with the existing shadcn/ui component architecture.

The core of the strategy is an **Layout-Level Background Architecture**. Backgrounds will exclusively live in a dedicated layer behind the primary content routes (`<Outlet />`). By decoupling backgrounds from UI components, we ensure maintainability, clear responsibility, and strict adherence to performance budgets. We'll leverage a combination of CSS (for static/soft gradients) and HTML5 Canvas (for complex animations like particles), carefully optimizing for low-end mobile devices running via Capacitor.

# 2. Current Architecture Analysis

Based on the analysis of `src/App.tsx` and `src/components/layout/AppLayout.tsx`, the application utilizes a structured routing system with React Router.

- **Routing Structure:**
  - Routes are defined via `createHashRouter`.
  - An application shell (`AppLayout`) wraps the main authenticated routes.
  - Separate pages exist for onboarding (`OnboardingPage`) and error states (`NotFound`).
- **Layout Strategy:**
  - `AppLayout` serves as the primary layout wrapper. It includes structural components: `AppHeader`, `DesktopSidebar`, `MobileBottomNav`, and `RestTimer`.
  - Content is rendered via the React Router `<Outlet />` inside a `<main className="flex-1 overflow-auto">` container.
- **Observations about UI Composition:**
  - UI components (shadcn/ui) are composed within the individual page components (e.g., `Dashboard`, `WorkoutList`).
  - The current background is a global color (`bg-background` class on various containers).
- **Identified Risks:**
  - **Performance:** Introducing animated backgrounds across all routes could lead to severe battery drain and frame rate drops, especially on mobile WebViews (Capacitor).
  - **Duplication:** Adding background logic to each page component individually will result in scattered, hard-to-maintain code.
  - **Z-Index Conflicts:** Placing backgrounds incorrectly might obscure content or interfere with fixed elements like the bottom navigation.

# 3. Proposed Background Architecture

## 3.1 Layout Pattern

The background system will be implemented as a dedicated layer within the application's layout wrappers. We will introduce a new `BackgroundProvider` or a dedicated background component that sits *behind* the routing `<Outlet />`.

```tsx
// Example modification of AppLayout (conceptual)
import { PageBackground } from '@/components/backgrounds/PageBackground';

export function AppLayout() {
  // ... existing logic to determine current route/page

  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden">
      {/* Background Layer: fixed, z-[-1] to sit behind all content */}
      <PageBackground currentRoute={location.pathname} />

      {/* Content Layer: z-[1] or relative positioning to sit on top */}
      <div className="relative z-10 flex flex-1 flex-col min-h-screen">
        <AppHeader />
        <div className="flex flex-1">
          <DesktopSidebar />
          <main className="flex-1 overflow-auto">
            <div className="container max-w-5xl px-4 pb-20 pt-4">
              <Suspense fallback={<ListPageSkeleton />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </div>
  );
}
```

- **Layering Strategy:** The background component will be absolutely or fixed positioned spanning `inset-0`, with a negative `z-index` (e.g., `-10`). The main application content wrappers will be positioned relatively with a higher `z-index` (e.g., `10`) to ensure content is always clickable and visible.

## 3.2 Background System Design

A dedicated module structure ensures clean separation of concerns.

```text
src/
  components/
    backgrounds/
      PageBackground.tsx       // Main orchestrator component
      variants/                // Implementations of specific backgrounds
        StaticGradient.tsx
        AuroraBackground.tsx
        CanvasParticles.tsx
        GeometricGrid.tsx
      hooks/
        usePerformanceMode.ts  // Logic for Capacitor/low-end detection
        useVisibilityPause.ts  // Logic to pause animations when hidden
      config/
        routeMap.ts            // Maps routes to background configurations
```

- **`PageBackground`:** The central controller. It reads the current route, consults the `routeMap`, handles transitions between different background types, and orchestrates performance/fallback logic.
- **`variants/`:** Reusable, isolated background visual components.
- **`hooks/`:** Reusable logic for managing the lifecycle and performance of the backgrounds.

## 3.3 Background API Design

The `PageBackground` and individual variant components will share a standardized API:

```typescript
interface BackgroundProps {
  /** The specific visual style to render. */
  variant: 'static-gradient' | 'aurora' | 'particles' | 'grid' | 'pulse';

  /** Controls the opacity/prominence of the background (e.g., 'low' = 0.2 opacity). */
  intensity: 'low' | 'medium' | 'high';

  /** Whether the background should animate. If false, it falls back to a static representation. */
  animated: boolean;

  /** Temporarily suspends animation (e.g., when the app is backgrounded or a heavy modal is open). */
  paused: boolean;

  /**
   * 'eco': Forces static fallbacks or severely reduced animation fidelity (Capacitor default).
   * 'performance': Allows animations but optimized for smooth framerates.
   * 'quality': Max visual fidelity.
   */
  performanceMode: 'eco' | 'performance' | 'quality';

  /** Optional theme colors to drive the visual output. */
  colors?: { primary: string; secondary: string };
}
```

# 4. Background Types and Technologies

1. **Static Gradients (CSS)**
   - **Implementation:** Standard CSS linear or radial gradients.
   - **Performance:** Extremely cheap, zero JavaScript overhead. Ideal for mobile and complex data-heavy pages.
   - **When to use:** Default fallback; pages with high cognitive load (Analytics, Settings, forms).

2. **Aurora / Soft Animated Gradients (CSS)**
   - **Implementation:** Multiple large, blurred CSS radial gradients animated via CSS `@keyframes` manipulating `transform` or `background-position`.
   - **Performance:** Good, provided it relies entirely on GPU-accelerated CSS properties (`transform: translate3d`).
   - **When to use:** "Ambient" screens, profile pages, or subtle energy states.

3. **Particles (Canvas)**
   - **Implementation:** HTML5 `<canvas>` rendering engine with a `requestAnimationFrame` loop.
   - **Performance:** Heavy. Requires constant CPU/GPU work. Must be aggressively paused when off-screen or on low-end devices.
   - **When to use:** High-energy states, active workout sessions, explicit success moments.

4. **Waves / Pulse (CSS/SVG)**
   - **Implementation:** Animating SVG paths or CSS border-radius to create pulsing effects.
   - **Performance:** Moderate. Good if kept simple, but complex SVGs can be heavy.
   - **When to use:** Emphasizing specific states like an active timer or waiting for connection.

5. **Grid / Geometric Patterns (CSS)**
   - **Implementation:** CSS `background-image` with `linear-gradient` to create repeating grids. Often static, but can slowly translate.
   - **Performance:** Very fast if static. Moderate if animated via CSS `transform`.
   - **When to use:** Technical, structured pages like Dashboards or Exercise Lists.

**Static vs. Animated Rule of Thumb:** Use animated backgrounds only when they communicate state (e.g., active workout) or evoke a desired emotional response (e.g., onboarding excitement). Default to static for informational screens.

# 5. Page-by-Page Background Specification

Below is the proposed background configuration mapping for the existing application routes.

## / (Dashboard)
- **Background:** Grid (CSS, static)
- **Behavior:** Static, geometric structure.
- **Intensity:** Low
- **Performance:** Optimal. Dashboard needs to load instantly and remain fast.
- **Rationale:** Suggests structure, data, and planning. Avoids distracting from the quick-glance metrics.

## /exercises (Exercise List)
- **Background:** Gradient (CSS, static)
- **Behavior:** Static vertical gradient.
- **Intensity:** Low
- **Performance:** Optimal. List views involve significant scrolling; backgrounds must not cause repaints.
- **Rationale:** Clean, unobstructed view for browsing a dense catalog.

## /workouts (Workout List)
- **Background:** Gradient (CSS, static)
- **Behavior:** Static vertical gradient.
- **Intensity:** Low
- **Performance:** Optimal. Similar scrolling considerations as the exercise list.
- **Rationale:** Focuses the user on selecting their next routine.

## /workouts/new & /workouts/:id (Workout Create/Detail)
- **Background:** Aurora (CSS, animated)
- **Behavior:** Very slow, subtle, continuous drifting.
- **Intensity:** Low
- **Performance:** Moderate. Use CSS transforms. Fall back to static on 'eco' mode.
- **Rationale:** A slightly elevated visual state to indicate preparation or focus before a session.

## /session/active (Active Session)
- **Background:** Particles (Canvas, animated)
- **Behavior:** Dynamic. Speed/color could optionally tie to time elapsed or rest state.
- **Intensity:** Medium/High
- **Performance:** High risk. Must throttle particle count based on device capability. Pause immediately if app is backgrounded.
- **Rationale:** Conveys energy, movement, and an "in-the-zone" feeling during the actual workout.

## /workouts/:id/sessions/:sessionId (Session Detail - Post Workout)
- **Background:** Aurora (CSS, static)
- **Behavior:** Static snapshot of an aurora gradient (a "cooled down" state).
- **Intensity:** Low
- **Performance:** Optimal.
- **Rationale:** Reflects the completion of a high-energy activity. A calm, reflective state for reviewing performance.

## /analytics (Analytics Page)
- **Background:** Gradient (CSS, static)
- **Behavior:** Static, flat design.
- **Intensity:** Very Low
- **Performance:** Optimal. Charts and graphs require significant rendering power; background must be completely passive.
- **Rationale:** Zero distraction. Data visualization requires maximum contrast and clarity.

## /1rm (One Rep Max)
- **Background:** Grid (CSS, static)
- **Behavior:** Static structural grid.
- **Intensity:** Low
- **Performance:** Optimal.
- **Rationale:** Similar to Dashboard/Analytics; structural and data-focused.

## /history & /history/:id (History)
- **Background:** Gradient (CSS, static)
- **Behavior:** Static.
- **Intensity:** Low
- **Performance:** Optimal.
- **Rationale:** Clean reading environment for reviewing past logs.

## /profile & /settings & /backup
- **Background:** Gradient (CSS, static)
- **Behavior:** Static, subtle brand colors.
- **Intensity:** Low
- **Performance:** Optimal.
- **Rationale:** Administrative screens; function over form.

## /templates/:templateId/edit
- **Background:** Grid (CSS, static)
- **Behavior:** Static.
- **Intensity:** Low
- **Performance:** Optimal.
- **Rationale:** Focuses on the structural task of building a workout template.

## OnboardingPage (Root level component)
- **Background:** Aurora (CSS, animated)
- **Behavior:** Moderate speed, inviting colors.
- **Intensity:** Medium
- **Performance:** Acceptable. It's the first impression, worth the rendering cost, but should degrade gracefully on low-end.
- **Rationale:** Creates excitement and a premium feel during first-time setup.

# 6. Performance Strategy (CRITICAL)

To ensure this system does not degrade the core experience, especially on Capacitor builds:

1. **Mobile Optimization & Detection:**
   - Implement a generic hook (e.g., `useDeviceCapabilities`) to sniff rough performance.
   - If `Capacitor.isNativePlatform()` is true, default to the `eco` `performanceMode`, converting all animations to static fallbacks unless explicitly overridden by user settings.

2. **Visibility-Based Pausing:**
   - Use the Page Visibility API (`document.hidden`).
   - If the tab is inactive or the WebView is backgrounded, force `paused: true` on the background API. This instantly stops `requestAnimationFrame` loops and CSS animations, saving battery.

3. **FPS Throttling (Canvas):**
   - For Canvas variants (Particles), do not blindly run at 60fps. Introduce a throttle mechanism to cap animations at 30fps or lower based on the `performanceMode`.
   - Scale the complexity (e.g., number of particles) dynamically. If `performanceMode === 'eco'`, render 0 particles (or fallback to CSS).

4. **CSS Animation Best Practices:**
   - Animate ONLY `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, or `background-position` if it can be avoided, as these trigger expensive browser repaints.
   - Apply `will-change: transform` judiciously to animated elements to hint the browser to promote them to their own composite layer.

# 7. Accessibility Considerations

- **Prefers-Reduced-Motion:** The system MUST respect the OS-level `prefers-reduced-motion` media query. If detected, the `animated` prop should immediately default to `false` for all variants globally.
- **Contrast Ratios:** All background variants must pass WCAG AA contrast requirements when overlaid with text or essential UI components. This is why `intensity` is usually kept to 'low'.
- **Cognitive Overload:** Complex patterns or fast animations can be distracting or nauseating for some users. Static fallbacks are critical not just for performance, but for accessibility.

# 8. Implementation Plan

1. **Phase 1: Foundation (Static)**
   - Create `src/components/backgrounds/` structure.
   - Implement `PageBackground` orchestrator.
   - Implement basic `StaticGradient` and `GeometricGrid` variants.
   - Wrap `<Outlet />` in `AppLayout` with `PageBackground`.

2. **Phase 2: Configuration & Routing**
   - Create the `routeMap` configuration mapping paths to variants.
   - Hook up `PageBackground` to `useLocation` to dynamically switch static backgrounds based on the current page.

3. **Phase 3: Animation (Aurora & Hooks)**
   - Implement `useVisibilityPause` hook.
   - Implement `AuroraBackground` variant with CSS animations.
   - Apply to Onboarding and Workout Detail pages.
   - Verify pausing behavior when tab is backgrounded.

4. **Phase 4: Complex Animation (Canvas)**
   - Implement `CanvasParticles` variant.
   - Apply to the Active Session page.
   - Implement FPS throttling and element count reduction.

5. **Phase 5: Performance Polish & Mobile Testing**
   - Implement `usePerformanceMode` (detect Capacitor).
   - Test on physical Android/iOS devices (via Capacitor) to monitor battery and frame drops.
   - Ensure fallbacks behave correctly.

# 9. Risks and Trade-offs

- **Battery Drain:** The biggest risk. Even optimized CSS animations consume more power than static pages. Canvas animations are very heavy. Strict pausing logic is non-negotiable.
- **Complexity:** Adding a global state machine just for backgrounds increases the overall complexity of the application layout.
- **Visual Noise:** If intensities are set too high, the backgrounds will distract from the core functionality (logging workouts). Restraint is key.

# 10. Optional Enhancements

- **State-Driven Intensity:** On the Active Session page, the particle speed or background hue could shift based on the current heart rate (if integrated) or the perceived exertion (RPE) of the current set.
- **Theme Integration:** Tying background colors seamlessly into a user-selectable theme system (e.g., matching the background hue to a chosen primary brand color).
- **User Preference Toggle:** An explicit toggle in `/settings` allowing users to disable all "Fancy Effects", overriding all automated performance detection.
