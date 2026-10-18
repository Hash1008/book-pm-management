/**
 * Central configuration for the Tait McKenzie Crowd Forecast prototype.
 *
 * All values here are DEMO ASSUMPTIONS, not verified facility information.
 * Operating hours, crowd patterns and closures are simulated for the
 * assignment prototype only.
 */

// York-inspired primary red (already the yorku brand accent).
export const YORK_RED = '#E31837';

// Demo operating hours per day-of-week. Sunday=0 .. Saturday=6.
// null open/close means closed that day.
export const OPERATING_HOURS = {
  0: { open: 8, close: 20 }, // Sunday   08:00–20:00
  1: { open: 6, close: 23 }, // Monday   06:00–23:00
  2: { open: 6, close: 23 }, // Tuesday
  3: { open: 6, close: 23 }, // Wednesday
  4: { open: 6, close: 23 }, // Thursday
  5: { open: 6, close: 23 }, // Friday
  6: { open: 8, close: 20 }, // Saturday 08:00–20:00
};

/**
 * Hourly baseline occupancy curves (0–100), keyed by hour-of-day (0–23).
 *
 * Weekday: quieter mornings, a plateau/peak around 16:00–19:00.
 * Weekend: a broader mid-day hump, lower overall.
 *
 * These are the deterministic "historical baseline" estimates. They are
 * independent of the simulated live data so either source can be switched
 * off in the Demo Controls.
 */
export const WEEKDAY_CURVE = {
  6: 8, 7: 14, 8: 22, 9: 28, 10: 32, 11: 35,
  12: 48, 13: 52, 14: 58, 15: 68, 16: 82, 17: 90,
  18: 88, 19: 72, 20: 48, 21: 28, 22: 16,
};

export const WEEKEND_CURVE = {
  8: 12, 9: 20, 10: 30, 11: 42, 12: 55, 13: 62,
  14: 66, 15: 60, 16: 48, 17: 34, 18: 22, 19: 14,
};

// Exceptional facility closure dates (YYYY-MM-DD). Editable at runtime via
// the Demo Controls "Mark selected date as closed" button.
export const DEFAULT_CLOSURE_DATES = ['2026-10-14']; // example: a weekday closure

// Default demo "now" used so the same control values reproduce the same
// forecast. Wednesday 2026-10-14 is an exceptional closure in DEFAULT_CLOSURE_DATES,
// so the default is a non-closure weekday instead.
export const DEFAULT_DEMO = {
  date: '2026-10-15', // Thursday
  time: '10:00',
  liveAvailable: true,
  baselineAvailable: true,
  closureDates: [...DEFAULT_CLOSURE_DATES],
  override: null, // null = use the model; a number = clamp-free override
};

// Crowd-level classification thresholds. EXACT categories per spec.
//   Low:    occupancy strictly below 40
//   Medium: 40 <= occupancy <= 75
//   High:   occupancy strictly greater than 75
export const LEVELS = {
  low: { label: 'Low', color: '#4ADE80', test: (p) => p < 40 },
  medium: { label: 'Medium', color: '#FBBF24', test: (p) => p >= 40 && p <= 75 },
  high: { label: 'High', color: '#FF3B54', test: (p) => p > 75 },
};

export function classifyLevel(percent) {
  if (LEVELS.low.test(percent)) return 'low';
  if (LEVELS.medium.test(percent)) return 'medium';
  return 'high';
}
