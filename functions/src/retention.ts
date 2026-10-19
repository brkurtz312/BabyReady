/**
 * How long BabyReady keeps an account nobody opens. An account counts as
 * active whenever the app signs in or refreshes its session, which happens
 * each time the learner opens the app.
 *
 * This file has no imports so plain Node can run it in tests.
 */

export const INACTIVE_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

export type AccountTimes = {
  creationTime?: string | null;
  lastSignInTime?: string | null;
  lastRefreshTime?: string | null;
};

/** The latest time the account was used, in milliseconds, or null if none is readable. */
export function lastActiveAt(times: AccountTimes): number | null {
  const stamps = [times.creationTime, times.lastSignInTime, times.lastRefreshTime]
    .map((t) => (t ? Date.parse(t) : Number.NaN))
    .filter((t) => Number.isFinite(t));
  return stamps.length ? Math.max(...stamps) : null;
}

/** True when the account hasn't been used for INACTIVE_DAYS. Unreadable times never count as inactive. */
export function isInactive(times: AccountTimes, now: number): boolean {
  const last = lastActiveAt(times);
  return last !== null && now - last >= INACTIVE_DAYS * DAY_MS;
}
