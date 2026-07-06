import { describe, it, expect } from 'vitest';
import { newStreak, registerActivity, dayIndex } from './streak';

const DAY = 24 * 60 * 60 * 1000;

describe('streak', () => {
  it('first activity starts a streak of 1', () => {
    const { state, outcome } = registerActivity(newStreak(), 1000);
    expect(state.current).toBe(1);
    expect(outcome.kind).toBe('first');
  });

  it('consecutive day increments the streak', () => {
    const today = dayIndex(1000) * DAY;
    const { state } = registerActivity(newStreak(), today);
    const next = registerActivity(state, today + DAY).state;
    expect(next.current).toBe(2);
    expect(next.longest).toBe(2);
  });

  it('same-day activity maintains the streak without incrementing', () => {
    const today = dayIndex(1000) * DAY;
    let { state } = registerActivity(newStreak(), today);
    state = registerActivity(state, today + 1000).state; // later same day
    expect(state.current).toBe(1);
  });

  it('a single missed day is absorbed by a streak freeze', () => {
    const today = dayIndex(1000) * DAY;
    let { state } = registerActivity(newStreak(), today);
    state = registerActivity(state, today + 2 * DAY).state; // skipped one day
    expect(state.current).toBe(2);
    expect(state.freezes).toBe(0);
  });

  it('a two-day gap with no freeze resets the streak', () => {
    const today = dayIndex(1000) * DAY;
    let { state } = registerActivity(newStreak(), today);
    state.freezes = 0;
    const { outcome } = registerActivity(state, today + 3 * DAY);
    expect(outcome.kind).toBe('reset');
    expect(stateWith(state, today + 3 * DAY).current).toBe(1);
  });

  it('longest streak is remembered even after a reset', () => {
    const today = dayIndex(1000) * DAY;
    let { state } = registerActivity(newStreak(), today);
    state = registerActivity(state, today + DAY).state; // streak 2
    state.freezes = 0;
    state = registerActivity(state, today + 5 * DAY).state; // reset
    expect(state.current).toBe(1);
    expect(state.longest).toBe(2);
  });
});

function stateWith(state: ReturnType<typeof newStreak>, now: number) {
  return registerActivity(state, now).state;
}
