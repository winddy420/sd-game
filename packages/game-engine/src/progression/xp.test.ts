import { describe, it, expect } from 'vitest';
import {
  levelCost,
  xpForLevel,
  levelFromXp,
  actForLevel,
  careerTitle,
  MAX_LEVEL,
} from './xp';

describe('XP curve', () => {
  it('level 1 costs nothing to reach', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('xpForLevel is the cumulative sum of levelCost', () => {
    let sum = 0;
    for (let l = 1; l < 6; l++) sum += levelCost(l);
    expect(xpForLevel(6)).toBe(sum);
  });

  it('early levels are cheap, later levels are expensive (logarithmic)', () => {
    expect(levelCost(2)).toBeLessThan(levelCost(15));
    expect(levelCost(15)).toBeLessThan(levelCost(35));
  });

  it('levelFromXp round-trips: spend exactly levelCost(1) → level 2', () => {
    const cost = levelCost(1);
    const { level, intoLevel, nextLevelCost } = levelFromXp(cost);
    expect(level).toBe(2);
    expect(intoLevel).toBe(0);
    expect(nextLevelCost).toBe(levelCost(2));
  });

  it('respects the max level cap', () => {
    const huge = xpForLevel(MAX_LEVEL) + 999_999;
    expect(levelFromXp(huge).level).toBe(MAX_LEVEL);
  });

  it('career acts map to level bands', () => {
    expect(actForLevel(5)).toBe('Junior');
    expect(actForLevel(20)).toBe('Mid');
    expect(actForLevel(33)).toBe('Senior');
    expect(actForLevel(45)).toBe('Staff');
  });

  it('careerTitle produces a readable title', () => {
    expect(careerTitle(1)).toBe('Junior Engineer');
    expect(careerTitle(50)).toBe('Staff Architect');
  });
});
