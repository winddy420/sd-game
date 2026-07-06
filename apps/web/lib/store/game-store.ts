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

  async hydrate() {
    if (get().hydrated) return;
    const [player, reviewCards] = await Promise.all([loadPlayer(), loadReviewCards()]);

    // Register today's activity for the streak (idempotent within a day).
    const now = Date.now();
    const today = dayIndex(now);
    if (player.streak.lastActiveDay !== today) {
      const { state: streak } = registerActivity(player.streak, now);
      player.streak = streak;
      player.lastPlayedAt = now;
    }

    set({ player, reviewCards, hydrated: true, lastXpGain: null });
    void savePlayer(player);
  },

  async completeQuest(quest) {
    const player = { ...get().player };
    if (player.completedQuestIds.includes(quest.id)) {
      set({ lastXpGain: 0 });
      return 0;
    }
    player.completedQuestIds = [...player.completedQuestIds, quest.id];
    if (quest.type === 'lesson' && !player.learnedConceptIds.includes(quest.conceptId)) {
      player.learnedConceptIds = [...player.learnedConceptIds, quest.conceptId];
    }
    player.totalXp += quest.xpReward;

    awardBadges(player, get);
    set({ player, lastXpGain: quest.xpReward });
    void savePlayer(player);
    return quest.xpReward;
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
      if (result.metrics.latencyP95 < 100) player.architecturesUnder100ms += 1;
      if (!alreadyDone) {
        player.completedQuestIds = [...player.completedQuestIds, quest.id];
        player.totalXp += quest.xpReward;
      }
      awardBadges(player, get);
    }
    set({ player, lastArchResult: result, lastXpGain: result.passed ? quest.xpReward : 0 });
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
    const existing = get().reviewCards.find((c) => c.conceptId === conceptId);
    const card: ReviewCard = existing
      ? reviewCard(existing, rating, now)
      : reviewCard(newCard(conceptId, now), rating, now);
    const cards = [...get().reviewCards.filter((c) => c.conceptId !== conceptId), card];
    set({ reviewCards: cards });
    void saveReviewCard(card);
  },
}));

/** Award any newly-earned badges to the player. Mutates the passed state. */
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
      architecturesUnderLatency: player.architecturesUnder100ms,
    },
    player.badgeIds,
  );
  if (earned.length) {
    player.badgeIds = [...player.badgeIds, ...earned.map((b) => b.id)];
  }
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
