/**
 * Z-Index Design Tokens
 *
 * PURPOSE: Z-index scale extracted from Workout Tracker app.
 * Ensures proper layering of UI elements.
 */

export const zIndex = {
  base:     0,
  docked:   10,      // Sticky table headers/cells
  focus:    20,      // Interactive elements focus states
  fab:      30,      // Floating Action Buttons
  overlay:  40,      // Fixed navigation, bottom bars
  modal:    50,      // Modals, popovers, sticky top header, dropdowns
  max:      999,
} as const;

export type ZIndexToken = typeof zIndex;
