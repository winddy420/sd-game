/**
 * Badge predicates — evaluate a Badge.predicate against player progress.
 */

import type { Badge, Phase } from '@sd-game/content';
import type { Progress } from './progression/skill-tree';

export interface BadgeProgress {
  progress: Progress;
  streakDays: number;
  architecturesDesigned: number;
  /** p95 latency (ms) of every architecture solve — evaluated per-badge. */
  architectureLatencies: number[];
  /** Curriculum phases, so phaseComplete can resolve capstones. */
  phases: Phase[];
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
    case 'phaseComplete': {
      // A phase is complete when its capstone quest is done. (Quest ids are
      // `q-N-...`, NOT `phase-N`, so a substring match on phaseId is always
      // false — resolve via the phase's capstoneQuestId instead.)
      const phase = ctx.phases.find((p) => p.id === predicate.phaseId);
      if (!phase) return false;
      return ctx.progress.completedQuestIds.includes(phase.capstoneQuestId);
    }
    case 'lowLatency':
      return (
        ctx.architectureLatencies.filter((l) => l <= predicate.maxLatency).length >=
        predicate.count
      );
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
