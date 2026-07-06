/**
 * Progression — XP, levels, and the career ladder.
 *
 * Level curve is logarithmic (design doc §4.1): fast early wins, a steady mid
 * game, then a mastery grind. Levels map to a career act so each promotion
 * unlocks new phases.
 */

export const MAX_LEVEL = 50;

/** XP required to *reach* a given level (cumulative). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // Piecewise-logarithmic. Sum of per-level costs up to `level`.
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += levelCost(l);
  }
  return total;
}

/** XP needed to advance FROM `level` to `level + 1`. */
export function levelCost(level: number): number {
  if (level < 10) return 100 + (level - 1) * 40; // 100 → ~460
  if (level < 30) return 500 + (level - 10) * 75; // 500 → ~2000
  return 2000 + (level - 30) * 100; // 2000 → ~5000
}

/** Given total XP, return the level + progress into the next level. */
export function levelFromXp(totalXp: number): {
  level: number;
  intoLevel: number;
  nextLevelCost: number;
  levelComplete: boolean;
} {
  let level = 1;
  let remaining = totalXp;
  while (level < MAX_LEVEL) {
    const cost = levelCost(level);
    if (remaining < cost) break;
    remaining -= cost;
    level++;
  }
  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, intoLevel: 0, nextLevelCost: 0, levelComplete: true };
  }
  const nextLevelCost = levelCost(level);
  return {
    level,
    intoLevel: remaining,
    nextLevelCost,
    levelComplete: false,
  };
}

export type CareerAct = 'Junior' | 'Mid' | 'Senior' | 'Staff';

export function actForLevel(level: number): CareerAct {
  if (level <= 10) return 'Junior';
  if (level <= 25) return 'Mid';
  if (level <= 40) return 'Senior';
  return 'Staff';
}

/** Daily XP cap to prevent burnout / grinding (design doc §4.1). */
export const DAILY_XP_CAP = 1500;

/** Title shown to the player. */
export function careerTitle(level: number): string {
  const act = actForLevel(level);
  return `${act} ${act === 'Staff' ? 'Architect' : 'Engineer'}`;
}
