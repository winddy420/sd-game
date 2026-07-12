import { describe, it, expect } from 'vitest';
import { CURRICULUM, type Badge } from '@sd-game/content';
import { hasBadge, newlyEarned, type BadgeProgress } from './badges';

function ctx(over: Partial<BadgeProgress> = {}): BadgeProgress {
  return {
    progress: { completedQuestIds: [], learnedConceptIds: [] },
    streakDays: 0,
    architecturesDesigned: 0,
    architectureLatencies: [],
    phases: CURRICULUM.phases,
    ...over,
  };
}

describe('phaseComplete badge (regression: A2)', () => {
  // The predicate must resolve via the phase's capstone, NOT a substring match
  // on quest ids — quest ids are `q-N-...`, so `'q-1-x'.includes('phase-1')`
  // was always false and 5 badges (incl. "Hero") could never be earned.
  it('is earned when the phase capstone is completed', () => {
    const phase1 = CURRICULUM.phases.find((p) => p.id === 'phase-1')!;
    const badge = CURRICULUM.badges.find((b) => b.id === 'b-phase-1')!;
    expect(
      hasBadge(
        badge,
        ctx({ progress: { completedQuestIds: [phase1.capstoneQuestId], learnedConceptIds: [] } }),
      ),
    ).toBe(true);
  });

  it('is NOT earned by completing a non-capstone quest in the phase', () => {
    const badge = CURRICULUM.badges.find((b) => b.id === 'b-phase-1')!;
    const someLesson = CURRICULUM.quests.find(
      (q) => q.type === 'lesson' && q.phaseId === 'phase-1',
    )!;
    expect(
      hasBadge(badge, ctx({ progress: { completedQuestIds: [someLesson.id], learnedConceptIds: [] } })),
    ).toBe(false);
  });

  it('every phaseComplete badge references a real phase with a capstone', () => {
    for (const b of CURRICULUM.badges) {
      if (b.predicate.kind !== 'phaseComplete') continue;
      const { phaseId } = b.predicate;
      const phase = CURRICULUM.phases.find((p) => p.id === phaseId);
      expect(phase, `${b.id} references missing phase ${phaseId}`).toBeTruthy();
      expect(phase!.capstoneQuestId, `${b.id} phase has no capstone`).toBeTruthy();
    }
  });
});

describe('lowLatency badge (regression: A9)', () => {
  // predicate.maxLatency must drive the bar, not a hardcoded 100ms counter.
  const badge = (maxLatency: number, count = 1): Badge => ({
    id: 't',
    name: 't',
    icon: 'x',
    description: '',
    predicate: { kind: 'lowLatency', count, maxLatency },
  });

  it('counts only solves at or under maxLatency', () => {
    expect(hasBadge(badge(50, 2), ctx({ architectureLatencies: [40, 60, 45] }))).toBe(true); // 40, 45
    expect(hasBadge(badge(50, 2), ctx({ architectureLatencies: [60, 70, 80] }))).toBe(false);
  });

  it('does not pass a 95ms solve under a 30ms bar (old 100ms hardcode would have)', () => {
    expect(hasBadge(badge(30), ctx({ architectureLatencies: [95] }))).toBe(false);
    expect(hasBadge(badge(30), ctx({ architectureLatencies: [25] }))).toBe(true);
  });
});

describe('newlyEarned', () => {
  it('yields predicates that newly hold, excluding already-earned', () => {
    const phase1 = CURRICULUM.phases.find((p) => p.id === 'phase-1')!;
    const progress = {
      completedQuestIds: [phase1.capstoneQuestId],
      learnedConceptIds: [],
    };
    const earned = newlyEarned(CURRICULUM.badges, ctx({ progress }), []);
    expect(earned.map((b) => b.id)).toContain('b-phase-1');

    const bPhase1 = CURRICULUM.badges.find((b) => b.id === 'b-phase-1')!;
    expect(newlyEarned([bPhase1], ctx({ progress }), ['b-phase-1'])).toHaveLength(0);
  });
});
