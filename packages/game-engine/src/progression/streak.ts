/**
 * Streak tracking — Duolingo-style daily play streak (design doc §4.2).
 *
 * The player keeps their streak by completing any activity on consecutive
 * days. A streak freeze absorbs one missed day.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day index for a timestamp (UTC-midnight buckets). */
export function dayIndex(ts: number): number {
  return Math.floor(ts / DAY_MS);
}

export interface StreakState {
  current: number;
  longest: number;
  lastActiveDay: number | null; // dayIndex
  freezes: number; // available streak-freeze power-ups
}

export function newStreak(): StreakState {
  return { current: 0, longest: 0, lastActiveDay: null, freezes: 1 };
}

export type StreakOutcome =
  | { kind: 'incremented'; current: number; usedFreeze: boolean }
  | { kind: 'maintained'; current: number; usedFreeze: boolean }
  | { kind: 'reset'; current: number }
  | { kind: 'first'; current: number };

/** Record activity at `now`. Returns the new state and what happened. */
export function registerActivity(
  state: StreakState,
  now: number,
): { state: StreakState; outcome: StreakOutcome } {
  const today = dayIndex(now);

  if (state.lastActiveDay === null) {
    const next: StreakState = {
      ...state,
      current: 1,
      longest: Math.max(state.longest, 1),
      lastActiveDay: today,
    };
    return { state: next, outcome: { kind: 'first', current: 1 } };
  }

  const delta = today - state.lastActiveDay;

  if (delta === 0) {
    // Already active today — no change.
    return { state, outcome: { kind: 'maintained', current: state.current, usedFreeze: false } };
  }

  if (delta === 1) {
    // Consecutive day — streak grows.
    const current = state.current + 1;
    const next: StreakState = {
      ...state,
      current,
      longest: Math.max(state.longest, current),
      lastActiveDay: today,
    };
    return { state: next, outcome: { kind: 'incremented', current, usedFreeze: false } };
  }

  if (delta === 2 && state.freezes > 0) {
    // Missed exactly one day — burn a freeze and continue the streak.
    const current = state.current + 1;
    const next: StreakState = {
      ...state,
      current,
      longest: Math.max(state.longest, current),
      lastActiveDay: today,
      freezes: state.freezes - 1,
    };
    return { state: next, outcome: { kind: 'incremented', current, usedFreeze: true } };
  }

  // Gap too big (or no freeze) — reset.
  const next: StreakState = { ...state, current: 1, lastActiveDay: today };
  return { state: next, outcome: { kind: 'reset', current: 1 } };
}
