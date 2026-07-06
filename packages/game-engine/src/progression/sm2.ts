/**
 * SM-2 Spaced Repetition
 *
 * A faithful but compact implementation of SuperMemo-2 (design doc §4.6). Each
 * concept the player learns is tracked by a review card with an ease factor,
 * interval, and due date. After answering (Again / Hard / Good / Easy) the
 * scheduler updates the interval.
 *
 * Quality mapping: Again=0, Hard=3, Good=4, Easy=5.
 */

export type RecallRating = 'again' | 'hard' | 'good' | 'easy';

const QUALITY: Record<RecallRating, number> = { again: 0, hard: 3, good: 4, easy: 5 };

export interface ReviewCard {
  conceptId: string;
  /** Ease factor (≥1.3). Higher = reviews spaced further apart. */
  ease: number;
  /** Current interval in days. */
  interval: number;
  /** Times reviewed. */
  reps: number;
  /** Epoch ms timestamp the card is next due. */
  due: number;
  /** Epoch ms of last review. */
  lastReviewed: number | null;
}

export function newCard(conceptId: string, now: number): ReviewCard {
  return {
    conceptId,
    ease: 2.5,
    interval: 0,
    reps: 0,
    due: now,
    lastReviewed: null,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Core SM-2 update step. Pure function — easy to unit test. */
export function review(card: ReviewCard, rating: RecallRating, now: number): ReviewCard {
  const q = QUALITY[rating];
  let { ease, interval, reps } = card;

  if (q < 3) {
    // Lapse — start over, but keep a slightly lowered ease.
    reps = 0;
    interval = 1; // see it again tomorrow
    ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ease);

    // Adjust ease per SM-2 formula.
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }

  return {
    ...card,
    ease,
    interval,
    reps,
    lastReviewed: now,
    due: now + interval * DAY_MS,
  };
}

/** Sort cards into a today's-review queue (those due on or before `now`). */
export function dueCards(cards: ReviewCard[], now: number): ReviewCard[] {
  return cards
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due);
}
