import Dexie, { type Table } from 'dexie';
import type { ReviewCard } from '@sd-game/game-engine';
import type { Topology } from '@sd-game/content';

/** Persisted player progress — the heart of the offline-first save. */
export interface PlayerState {
  id: 'main'; // singleton row
  totalXp: number;
  completedQuestIds: string[];
  learnedConceptIds: string[];
  architecturesDesigned: number;
  architecturesUnder100ms: number;
  badgeIds: string[];
  streak: {
    current: number;
    longest: number;
    lastActiveDay: number | null;
    freezes: number;
  };
  lastPlayedAt: number | null;
  createdAt: number;
}

export const DEFAULT_PLAYER: PlayerState = {
  id: 'main',
  totalXp: 0,
  completedQuestIds: [],
  learnedConceptIds: [],
  architecturesDesigned: 0,
  architecturesUnder100ms: 0,
  badgeIds: [],
  streak: { current: 0, longest: 0, lastActiveDay: null, freezes: 1 },
  lastPlayedAt: null,
  createdAt: Date.now(),
};

class SdGameDB extends Dexie {
  progress!: Table<PlayerState, string>;
  reviewCards!: Table<ReviewCard, string>;
  topologies!: Table<{ questId: string; topology: Topology }, string>;

  constructor() {
    super('sd-game');
    this.version(1).stores({
      progress: 'id',
      reviewCards: 'conceptId, due',
      topologies: 'questId',
    });
  }
}

// Guard against SSR — Dexie touches indexedDB on construction.
export const db = typeof window !== 'undefined' ? new SdGameDB() : (null as unknown as SdGameDB);

export async function loadPlayer(): Promise<PlayerState> {
  if (!db) return DEFAULT_PLAYER;
  const existing = await db.progress.get('main');
  return existing ?? DEFAULT_PLAYER;
}

export async function savePlayer(state: PlayerState): Promise<void> {
  if (!db) return;
  await db.progress.put(state);
}

export async function loadReviewCards(): Promise<ReviewCard[]> {
  if (!db) return [];
  return db.reviewCards.toArray();
}

export async function saveReviewCard(card: ReviewCard): Promise<void> {
  if (!db) return;
  await db.reviewCards.put(card);
}

export async function loadTopology(questId: string): Promise<Topology | null> {
  if (!db) return null;
  const row = await db.topologies.get(questId);
  return row?.topology ?? null;
}

export async function saveTopology(questId: string, topology: Topology): Promise<void> {
  if (!db) return;
  await db.topologies.put({ questId, topology });
}
