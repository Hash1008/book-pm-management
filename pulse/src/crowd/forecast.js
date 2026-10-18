/**
 * Pure, deterministic forecast logic for the Tait McKenzie Crowd Forecast.
 *
 * No randomness, no Date.now(), no localStorage — everything is a pure
 * function of the inputs it receives. The same demo date/time and control
 * values always produce the same forecast.
 *
 * The UI layer (components/CrowdForecast.jsx) owns state and renders the
 * results of these functions.
 */

import {
  OPERATING_HOURS,
  WEEKDAY_CURVE,
  WEEKEND_CURVE,
  DEFAULT_CLOSURE_DATES,
  classifyLevel,
} from './config';

// Monday=1 .. Friday=5 are weekdays; Saturday=6 / Sunday=0 are weekend.
function isWeekendDay(dow) {
  return dow === 0 || dow === 6;
}

function curveFor(dow) {
  return isWeekendDay(dow) ? WEEKEND_CURVE : WEEKDAY_CURVE;
}

/**
 * Parse a "YYYY-MM-DD" + "HH:MM" pair into a real Date in local time.
 * Returns null if either input is invalid.
 */
export function parseDemoDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if (!y || !m || !d || hh === undefined || mm === undefined) return null;
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Day-of-week for a demo date (0=Sun..6=Sat). */
export function dayOfWeek(dateStr) {
  const dt = parseDemoDateTime(dateStr, '00:00');
  return dt ? dt.getDay() : null;
}

/** Is the given date in the closure list? */
export function isClosureDate(dateStr, closureDates = DEFAULT_CLOSURE_DATES) {
  return closureDates.includes(dateStr);
}

/**
 * Operating status for a given demo date + time.
 * Returns one of:
 *   { status: 'closed', reason: 'closure' }      — exceptional closure date
 *   { status: 'closed', reason: 'outside_hours' } — outside operating hours
 *   { status: 'open', hours: {open, close} }      — currently open
 */
export function operatingStatus(dateStr, timeStr, closureDates = DEFAULT_CLOSURE_DATES) {
  if (isClosureDate(dateStr, closureDates)) {
    return { status: 'closed', reason: 'closure' };
  }
  const dow = dayOfWeek(dateStr);
  if (dow === null) return { status: 'closed', reason: 'invalid_date' };
  const hours = OPERATING_HOURS[dow];
  if (!hours) return { status: 'closed', reason: 'outside_hours' };

  const dt = parseDemoDateTime(dateStr, timeStr);
  if (!dt) return { status: 'closed', reason: 'invalid_time' };
  const minutes = dt.getHours() * 60 + dt.getMinutes();

  const openMin = hours.open * 60;
  const closeMin = hours.close * 60 - 1; // close hour is exclusive (23:00 = last interval 22–23)

  if (minutes < openMin || minutes >= hours.close * 60) {
    return { status: 'closed', reason: 'outside_hours' };
  }
  return { status: 'open', hours };
}

/**
 * Baseline (historical) occupancy percent for a given hour-of-day and
 * day-of-week. Returns 0 for hours outside the operating curve.
 */
export function baselinePercent(dow, hour) {
  const curve = curveFor(dow);
  if (Object.prototype.hasOwnProperty.call(curve, hour)) return curve[hour];
  return 0;
}

/**
 * Simulated live occupancy for the current hour.
 *
 * Live and historical are independent sources per the spec. To keep the
 * demo deterministic we derive the live value from the baseline with a
 * small, fixed, reproducible offset driven by the date+time — never
 * Math.random().
 */
export function livePercent(dateStr, timeStr) {
  const dt = parseDemoDateTime(dateStr, timeStr);
  if (!dt) return null;
  const dow = dt.getDay();
  const hour = dt.getHours();
  const base = baselinePercent(dow, hour);
  // Deterministic skew from the minute + day-of-year so it stays stable
  // across renders but differs from the pure baseline. Kept within +/-3.
  const minute = dt.getMinutes();
  const dayOfYear = Math.floor(
    (dt - new Date(dt.getFullYear(), 0, 0)) / 86400000
  );
  const skew = ((minute + dayOfYear) % 7) - 3; // -3..+3
  const value = Math.max(0, Math.min(100, base + skew));
  return Math.round(value * 10) / 10;
}

/**
 * Choose the current-occupancy source and value, given availability flags
 * and an optional override.
 *
 * Returns:
 *   { source: 'override', percent, level }
 *   { source: 'live', percent, level }
 *   { source: 'baseline', percent, level }   — live offline, baseline on
 *   { source: 'none' }                        — both offline / no data
 *
 * override must already be validated (a number in 0..100) by the caller;
 * null/undefined means "no override".
 */
export function currentOccupancy({ dateStr, timeStr, liveAvailable, baselineAvailable, override }) {
  if (override !== null && override !== undefined && !Number.isNaN(override)) {
    const p = Math.round(override * 10) / 10;
    return { source: 'override', percent: p, level: classifyLevel(p) };
  }
  if (liveAvailable) {
    const p = livePercent(dateStr, timeStr);
    if (p !== null) return { source: 'live', percent: p, level: classifyLevel(p) };
  }
  if (baselineAvailable) {
    const dt = parseDemoDateTime(dateStr, timeStr);
    if (dt) {
      const p = baselinePercent(dt.getDay(), dt.getHours());
      return { source: 'baseline', percent: p, level: classifyLevel(p) };
    }
  }
  return { source: 'none' };
}

/**
 * Build the hourly forecast for up to `maxIntervals` upcoming hours.
 *
 * Rules (from the spec):
 *   - Never forecast beyond the facility's closing hour.
 *   - At most 8 intervals.
 *   - For Friday 21:00 -> exactly two intervals (21–22, 22–23).
 *   - For a weekday at 10:00 -> eight intervals.
 *   - When closed, return [] (caller decides closed state separately).
 *
 * Each interval: { startHour, endHour, label, percent, level, source }
 */
export function hourlyForecast({
  dateStr,
  timeStr,
  closureDates,
  maxIntervals = 8,
}) {
  const status = operatingStatus(dateStr, timeStr, closureDates);
  if (status.status !== 'open') return [];

  const dt = parseDemoDateTime(dateStr, timeStr);
  if (!dt) return [];
  const dow = dt.getDay();
  const currentHour = dt.getHours();
  const closeHour = status.hours.close; // exclusive upper bound

  const intervals = [];
  let h = currentHour;
  while (intervals.length < maxIntervals && h < closeHour) {
    const percent = baselinePercent(dow, h);
    intervals.push({
      startHour: h,
      endHour: h + 1,
      label: `${formatHour(h)}–${formatHour(h + 1)}`,
      percent,
      level: classifyLevel(percent),
      source: 'baseline',
    });
    h += 1;
  }
  return intervals;
}

/** Format an hour-of-day as "06:00" / "22:00". */
export function formatHour(h) {
  const hh = String(h).padStart(2, '0');
  return `${hh}:00`;
}

/**
 * Produce the full forecast model the UI renders. Centralizes all the
 * data-availability / freshness / closed-state rules so the component stays
 * a thin view.
 */
export function buildForecast(state) {
  const { dateStr, timeStr, liveAvailable, baselineAvailable, closureDates, override } = state;

  const status = operatingStatus(dateStr, timeStr, closureDates);
  const closed = status.status !== 'open';

  // No-data state: both sources off (and not closed, and no override).
  const anyData =
    liveAvailable || baselineAvailable || (override !== null && override !== undefined);
  const noData = !closed && !anyData;

  if (closed) {
    return {
      closed: true,
      closure: status.reason === 'closure',
      noData: false,
      current: null,
      forecast: [],
      lastUpdated: null,
      banner: null,
    };
  }

  if (noData) {
    return {
      closed: false,
      noData: true,
      current: null,
      forecast: [],
      lastUpdated: null,
      banner: 'Forecast unavailable.',
    };
  }

  const current = currentOccupancy({
    dateStr,
    timeStr,
    liveAvailable,
    baselineAvailable,
    override,
  });

  const forecast = hourlyForecast({ dateStr, timeStr, closureDates });

  // Banner only when live is offline but baseline is on.
  let banner = null;
  if (!liveAvailable && baselineAvailable) {
    banner = 'Historical estimates only — live data offline.';
  }

  // Last-updated timestamp only when usable data exists. We use the demo
  // date/time itself (deterministic) rather than wall-clock time.
  const lastUpdated = parseDemoDateTime(dateStr, timeStr);

  return {
    closed: false,
    noData: false,
    current,
    forecast,
    lastUpdated,
    banner,
    // True when the displayed numbers come from the baseline rather than
    // the simulated live feed (used by the freshness note).
    historicalOnly: !liveAvailable && baselineAvailable,
  };
}
