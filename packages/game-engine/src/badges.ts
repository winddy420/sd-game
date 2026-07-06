/**
 * Badge predicates — evaluate a Badge.predicate against player progress.
 */

import type { Badge } from '@sd-game/content';
import type { Progress } from './progression/skill-tree';

export interface BadgeProgress {
  progress: Progress;
  streakDays: number;
  architecturesDesigned: number;
  /** Best (lowest) latency across all the player's architecture solves. */
  architecturesUnderLatency: number; // count of solves below the latency bar
}

export function hasBadge(badge: Badge, ctx: BadgeProgress): boolean {
  const predicate = badge.predicate;
  switch (predicate.kind) {
    case 'streak':
      return ctx.streakDays >= predicate.days;
    case 'questsCompleted':
      return ctx.progress.completedQuestIds.length >= predicate.count;
    case 'architecturesDesigned':
      return ctx.architecturesDesigned >= predicate.count;
    case 'phaseComplete':
      // Determined elsewhere by capstone completion; we approximate by checking
      // the capstone id is present. Full phase check lives in skill-tree.
      return ctx.progress.completedQuestIds.some((id) => id.includes(predicate.phaseId));
    case 'lowLatency':
      return ctx.architecturesUnderLatency >= predicate.count;
    default:
      return false;
  }
}

/** Compute the set of newly-earned badge ids given previous + new context. */
export function newlyEarned(
  badges: Badge[],
  ctx: BadgeProgress,
  alreadyEarned: string[],
): Badge[] {
  const earned = new Set(alreadyEarned);
  return badges.filter((b) => !earned.has(b.id) && hasBadge(b, ctx));
}
