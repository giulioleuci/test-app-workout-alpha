/**
 * Transition Design Tokens
 *
 * PURPOSE: Animation durations and easing functions from Workout Tracker app.
 */

export const transitions = {
  duration: {
    instant: '50ms',
    fast:    '150ms',
    normal:  '200ms',   // accordion-down/up: 0.2s
    slow:    '300ms',   // fade-in: 0.3s
    slower:  '350ms',   // slide-up: 0.35s
  },

  easing: {
    linear:    'linear',
    easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
    easeOut:   'ease-out', // Used in all app animations
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Preset combinations from Tailwind config
  animations: {
    accordionDown: 'accordion-down 0.2s ease-out',
    accordionUp:   'accordion-up 0.2s ease-out',
    fadeIn:        'fade-in 0.3s ease-out both',
    fadeInScale:   'fade-in-scale 0.25s ease-out both',
    slideUp:       'slide-up 0.35s ease-out both',
  }
} as const;

export type TransitionToken = typeof transitions;
