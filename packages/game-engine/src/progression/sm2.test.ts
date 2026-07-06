import { describe, it, expect } from 'vitest';
import { newCard, review, dueCards } from './sm2';

const NOW = 1_000_000_000_000; // fixed epoch to keep tests deterministic
const DAY = 24 * 60 * 60 * 1000;

describe('SM-2', () => {
  it('first "good" review schedules 1 day out', () => {
    const card = review(newCard('c1', NOW), 'good', NOW);
    expect(card.reps).toBe(1);
    expect(card.interval).toBe(1);
    expect(card.due).toBe(NOW + 1 * DAY);
  });

  it('second "good" review schedules 6 days out', () => {
    let card = review(newCard('c1', NOW), 'good', NOW);
    card = review(card, 'good', NOW + DAY);
    expect(card.reps).toBe(2);
    expect(card.interval).toBe(6);
  });

  it('"easy" raises the ease factor and lengthens the interval', () => {
    let card = review(newCard('c1', NOW), 'good', NOW);
    const beforeEase = card.ease;
    card = review(card, 'easy', NOW + DAY);
    expect(card.ease).toBeGreaterThanOrEqual(beforeEase);
    expect(card.interval).toBe(6);
  });

  it('"again" lapses: resets interval to 1 and lowers ease', () => {
    let card = review(newCard('c1', NOW), 'good', NOW);
    card = review(card, 'good', NOW + DAY); // interval 6
    const easeBefore = card.ease;
    card = review(card, 'again', NOW + 2 * DAY);
    expect(card.interval).toBe(1);
    expect(card.reps).toBe(0);
    expect(card.ease).toBeLessThanOrEqual(easeBefore);
  });

  it('ease factor never drops below 1.3', () => {
    let card = newCard('c1', NOW);
    for (let i = 0; i < 50; i++) card = review(card, 'again', NOW + i * DAY);
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('dueCards returns only cards whose due date has passed', () => {
    const fresh = review(newCard('fresh', NOW), 'good', NOW); // due NOW+1day
    const due = review(newCard('due', NOW - 2 * DAY), 'good', NOW - 2 * DAY);
    const queue = dueCards([fresh, due], NOW);
    expect(queue.map((c) => c.conceptId)).toEqual(['due']);
  });
});
