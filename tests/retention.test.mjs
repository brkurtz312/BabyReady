// Checks which accounts the monthly cleanup treats as unused for 12 months.
// Needs Node 22.18+ (runs the TypeScript file directly).
import assert from 'node:assert/strict';
import test from 'node:test';

import { INACTIVE_DAYS, isInactive, lastActiveAt } from '../functions/src/retention.ts';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-10-18T12:00:00Z');
const daysAgo = (n) => new Date(now - n * DAY).toUTCString();

test('the latest of creation, sign-in, and session refresh counts', () => {
  const times = { creationTime: daysAgo(700), lastSignInTime: daysAgo(500), lastRefreshTime: daysAgo(3) };
  assert.equal(lastActiveAt(times), Date.parse(daysAgo(3)));
  assert.equal(isInactive(times, now), false, 'opened 3 days ago');
});

test('an account unused for 12 months is inactive, one used just inside it is not', () => {
  assert.equal(INACTIVE_DAYS, 365);
  assert.equal(isInactive({ creationTime: daysAgo(400), lastRefreshTime: daysAgo(365) }, now), true);
  assert.equal(isInactive({ creationTime: daysAgo(400), lastRefreshTime: daysAgo(364) }, now), false);
  assert.equal(isInactive({ creationTime: daysAgo(366), lastSignInTime: null, lastRefreshTime: null }, now), true);
});

test('unreadable times never count as inactive', () => {
  assert.equal(lastActiveAt({}), null);
  assert.equal(isInactive({}, now), false);
  assert.equal(isInactive({ creationTime: 'not a date' }, now), false);
});
