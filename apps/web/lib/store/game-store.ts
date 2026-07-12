'use client';

import { create } from 'zustand';
import {
  CURRICULUM,
  type Quest,
  type Topology,
} from '@sd-game/content';
import {
  gradeArchitecture,
  levelFromXp,
  careerTitle,
  actForLevel,
  registerActivity,
  dayIndex,
  newlyEarned,
  newCard,
  review as reviewCard,
  DAILY_XP_CAP,
  type Progress,
  type ArchitectureResult,
  type ReviewCard,
  type RecallRating,
} from '@sd-game/game-engine';
import {
  DEFAULT_PLAYER,
  loadPlayer,
  savePlayer,
  saveReviewCard,
  loadReviewCards,
  saveTopology,
  type PlayerState,
} from '../db';

interface GameState {
  hydrated: boolean;
  player: PlayerState;
  reviewCards: Awaited<ReturnType<typeof loadReviewCards>>;
  /** Last architecture grade, surfaced to the canvas UI. */
  lastArchResult: ArchitectureResult | null;
  /** XP gained on the most recent action (for the toast animation). */
  lastXpGain: number | null;
  /** A non-XP event (badge/act promotion/freeze) to surface as a toast. */
  lastNotice: { kind: 'badge' | 'act' | 'freeze'; text: string } | null;
  /** Monotonic counter bumped on every XP/action — lets the toaster retrigger
   *  even when the XP amount is identical across consecutive actions. */
  lastActionSeq: number;

  hydrate: () => Promise<void>;

  /** Complete a non-architecture quest and bank XP. */
  completeQuest: (quest: Quest) => Promise<number>;
  /** Grade an architecture topology; on pass, bank XP + stats. */
  submitArchitecture: (quest: Quest, topology: Topology) => Promise<ArchitectureResult>;
  /** Save/restore an in-progress canvas. */
  saveTopology: (questId: string, topology: Topology) => Promise<void>;

  /** Mark a concept learned (after reading + passing its lesson). */
  learnConcept: (conceptId: string) => Promise<void>;
  /** Record a spaced-repetition review for a concept. */
  recordReview: (conceptId: string, rating: RecallRating) => Promise<void>;
}

const DAY = 24 * 60 * 60 * 1000;

export const useGameStore = create<GameState>((set, get) => ({
  hydrated: false,
  player: DEFAULT_PLAYER,
  reviewCards: [],
  lastArchResult: null,
  lastXpGain: null,
  lastNotice: null,
  lastActionSeq: 0,

  async hydrate() {
    if (get().hydrated) return;
    const [player, reviewCards] = await Promise.all([loadPlayer(), loadReviewCards()]);

    set({ player, reviewCards, hydrated: true, lastXpGain: null });
  },

  async completeQuest(quest) {
    const player = { ...get().player };
    if (player.completedQuestIds.includes(quest.id)) {
      set({ lastXpGain: 0 });
      return 0;
    }
    player.completedQuestIds = [...player.completedQuestIds, quest.id];

    // Learning a concept enqueues it for spaced repetition — otherwise the
    // review queue is always empty and the SR loop never starts.
    if (quest.type === 'lesson') {
      if (!player.learnedConceptIds.includes(quest.conceptId)) {
        player.learnedConceptIds = [...player.learnedConceptIds, quest.conceptId];
      }
      const now = Date.now();
      const hasCard = get().reviewCards.some((c) => c.conceptId === quest.conceptId);
      if (!hasCard) {
        const card = newCard(quest.conceptId, now);
        const cards = [...get().reviewCards, card];
        set({ reviewCards: cards });
        void saveReviewCard(card);
      }
    }

    const { gained, promotedTo } = applyXp(player, quest.xpReward);

    touchStreak(player);
    const earned = awardBadges(player, get);
    set({
      player,
      lastXpGain: gained,
      lastNotice: noticeFor(earned, promotedTo),
      lastActionSeq: get().lastActionSeq + 1,
    });
    void savePlayer(player);
    return gained;
  },

  async submitArchitecture(quest, topology) {
    if (quest.type !== 'architecture') {
      throw new Error('submitArchitecture called on non-architecture quest');
    }
    const result = gradeArchitecture(quest, topology);
    const player = { ...get().player };

    // Always bank the topology so the player can resume.
    void saveTopology(quest.id, topology);

    if (result.passed) {
      const alreadyDone = player.completedQuestIds.includes(quest.id);
      player.architecturesDesigned += 1;
      player.architectureLatencies = [...player.architectureLatencies, result.metrics.latencyP95];
      let gained = 0;
      let promotedTo: string | null = null;
      if (!alreadyDone) {
        player.completedQuestIds = [...player.completedQuestIds, quest.id];
        // Higher grades pay more — rewards optimizing past the pass bar (A5).
        const r = applyXp(player, Math.round(quest.xpReward * GRADE_XP[result.grade]));
        gained = r.gained;
        promotedTo = r.promotedTo;
      }
      const earned = awardBadges(player, get);
      set({
        player,
        lastArchResult: result,
        lastXpGain: gained,
        lastNotice: noticeFor(earned, promotedTo),
        lastActionSeq: get().lastActionSeq + 1,
      });
    } else {
      set({ player, lastArchResult: result, lastXpGain: 0, lastNotice: null });
    }
    void savePlayer(player);
    return result;
  },

  async saveTopology(questId, topology) {
    void saveTopology(questId, topology);
  },

  async learnConcept(conceptId) {
    const player = { ...get().player };
    if (!player.learnedConceptIds.includes(conceptId)) {
      player.learnedConceptIds = [...player.learnedConceptIds, conceptId];
      set({ player });
      void savePlayer(player);
    }
  },

  async recordReview(conceptId, rating) {
    const now = Date.now();
    const player = { ...get().player };
    const existing = get().reviewCards.find((c) => c.conceptId === conceptId);
    const card: ReviewCard = existing
      ? reviewCard(existing, rating, now)
      : reviewCard(newCard(conceptId, now), rating, now);
    const cards = [...get().reviewCards.filter((c) => c.conceptId !== conceptId), card];
    // A review is a meaningful learning action — it counts toward the streak and
    // pays a little repeatable XP (capped per day) so the daily loop has teeth.
    touchStreak(player);
    const { gained, promotedTo } = applyXp(player, REVIEW_XP, { repeatable: true });
    const earned = awardBadges(player, get);
    set({
      player,
      reviewCards: cards,
      lastXpGain: gained,
      lastNotice: noticeFor(earned, promotedTo),
      lastActionSeq: get().lastActionSeq + 1,
    });
    void savePlayer(player);
    void saveReviewCard(card);
  },
}));

/** XP per spaced-repetition review (repeatable, daily-capped). */
const REVIEW_XP = 15;
/** Architecture grade → XP multiplier on first completion (A5). */
const GRADE_XP: Record<ArchitectureResult['grade'], number> = {
  S: 1.5,
  A: 1.3,
  B: 1.15,
  C: 1.0,
  F: 0,
};

/** Add XP to the player, enforcing the daily cap on repeatable sources and
 *  refilling a streak freeze at each career-act promotion (A4 + A7). Returns
 *  the amount granted and the act promoted to (if any) this call. */
function applyXp(
  player: PlayerState,
  amount: number,
  opts: { repeatable?: boolean } = {},
): { gained: number; promotedTo: string | null } {
  let grant = Math.max(0, amount);
  if (opts.repeatable) {
    const today = dayIndex(Date.now());
    if (player.dailyXp.day !== today) player.dailyXp = { day: today, gained: 0 };
    const remaining = Math.max(0, DAILY_XP_CAP - player.dailyXp.gained);
    grant = Math.min(grant, remaining);
    player.dailyXp = { ...player.dailyXp, gained: player.dailyXp.gained + grant };
  }
  if (grant <= 0) return { gained: 0, promotedTo: null };

  const prevAct = actForLevel(levelFromXp(player.totalXp).level);
  player.totalXp += grant;
  const nextAct = actForLevel(levelFromXp(player.totalXp).level);
  let promotedTo: string | null = null;
  if (nextAct !== prevAct && nextAct !== 'Junior' && !player.actsRewarded.includes(nextAct)) {
    player.actsRewarded = [...player.actsRewarded, nextAct];
    player.streak = { ...player.streak, freezes: Math.min(3, player.streak.freezes + 1) };
    promotedTo = nextAct;
  }
  return { gained: grant, promotedTo };
}

/** Count a meaningful action (quest/review) toward the daily streak. Idempotent
 *  within a day. Mutates the passed player state. */
function touchStreak(player: PlayerState) {
  const now = Date.now();
  const { state: streak } = registerActivity(player.streak, now);
  player.streak = streak;
  player.lastPlayedAt = now;
}

/** Award any newly-earned badges to the player. Mutates state; returns the
 *  newly-earned badges so the caller can surface a toast. */
function awardBadges(player: PlayerState, get: () => GameState) {
  const progress: Progress = {
    completedQuestIds: player.completedQuestIds,
    learnedConceptIds: player.learnedConceptIds,
  };
  const earned = newlyEarned(
    CURRICULUM.badges,
    {
      progress,
      streakDays: player.streak.current,
      architecturesDesigned: player.architecturesDesigned,
      architectureLatencies: player.architectureLatencies,
      phases: CURRICULUM.phases,
    },
    player.badgeIds,
  );
  if (earned.length) {
    player.badgeIds = [...player.badgeIds, ...earned.map((b) => b.id)];
  }
  return earned;
}

/** Build a toast notice: a newly-earned badge wins, else an act promotion that
 *  granted a freeze. Returns null when there is nothing worth surfacing. */
function noticeFor(
  earned: ReturnType<typeof awardBadges>,
  promotedTo: string | null,
): { kind: 'badge' | 'freeze'; text: string } | null {
  if (earned.length) {
    const b = earned[0]!;
    return { kind: 'badge', text: `${b.icon} Badge unlocked: ${b.name}` };
  }
  if (promotedTo) {
    const title = promotedTo === 'Staff' ? 'Staff Architect' : `${promotedTo} Engineer`;
    return { kind: 'freeze', text: `Promoted to ${title}! +1 streak freeze 🧊` };
  }
  return null;
}

/** Selector helpers re-exported for convenience.
 *  These select a primitive (stable value) and derive the object in render,
 *  so they never return a new reference that would trigger an infinite loop. */
export function useLevel() {
  const totalXp = useGameStore((s) => s.player.totalXp);
  return levelFromXp(totalXp);
}

export function useCareerTitle() {
  const totalXp = useGameStore((s) => s.player.totalXp);
  return careerTitle(levelFromXp(totalXp).level);
}

export function useAct() {
  const totalXp = useGameStore((s) => s.player.totalXp);
  return actForLevel(levelFromXp(totalXp).level);
}

export { DAY };
