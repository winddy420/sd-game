import { describe, it, expect } from 'vitest';
import { CURRICULUM } from '@sd-game/content';

/** Sanity checks on authored content: every quiz has exactly one correct
 *  answer in range, every incident step has exactly one correct choice, every
 *  command step has a valid regex, prerequisites resolve, ids are unique, etc. */
describe('content integrity', () => {
  it('all concept ids are unique', () => {
    const ids = CURRICULUM.concepts.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all quest ids are unique', () => {
    const ids = CURRICULUM.quests.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every lesson question has exactly one correct option in range', () => {
    for (const q of CURRICULUM.quests) {
      if (q.type !== 'lesson') continue;
      for (const qu of q.questions) {
        expect(qu.options.length, `${qu.id} options`).toBeGreaterThanOrEqual(2);
        expect(qu.correctIndex, `${qu.id} correctIndex`).toBeGreaterThanOrEqual(0);
        expect(qu.correctIndex, `${qu.id} correctIndex in range`).toBeLessThan(qu.options.length);
        const correctCount = qu.options.length; // correctIndex is the single answer by construction
        expect(correctCount).toBeGreaterThan(0);
      }
      // referenced concept exists
      expect(CURRICULUM.concepts.some((c) => c.id === q.conceptId), `${q.id} concept`).toBe(true);
    }
  });

  it('every incident step has exactly one correct choice', () => {
    for (const q of CURRICULUM.quests) {
      if (q.type !== 'incident') continue;
      for (const step of q.steps) {
        const correct = step.filter((c) => c.isCorrect);
        expect(correct.length, `${q.id} step must have exactly one correct`).toBe(1);
      }
    }
  });

  it('every command step has a compilable regex + sample answer that matches', () => {
    for (const q of CURRICULUM.quests) {
      if (q.type !== 'command') continue;
      for (const step of q.steps) {
        for (const p of step.acceptedPatterns) {
          expect(() => new RegExp(p, 'i'), `${q.id} bad pattern ${p}`).not.toThrow();
        }
        // The sample answer should be accepted by at least one pattern.
        const matches = step.acceptedPatterns.some((p) => new RegExp(p, 'i').test(step.sampleAnswer));
        expect(matches, `${q.id} sample "${step.sampleAnswer}" not accepted`).toBe(true);
      }
    }
  });

  it('every architecture quest references only real component ids', () => {
    const valid = new Set(CURRICULUM.components.map((c) => c.id));
    for (const q of CURRICULUM.quests) {
      if (q.type !== 'architecture') continue;
      for (const id of q.allowedComponents) {
        expect(valid.has(id), `${q.id} unknown component ${id}`).toBe(true);
      }
    }
  });

  it('quest prerequisites resolve to existing quests', () => {
    const ids = new Set(CURRICULUM.quests.map((q) => q.id));
    for (const q of CURRICULUM.quests) {
      for (const pre of q.prerequisites ?? []) {
        expect(ids.has(pre), `${q.id} prereq ${pre} missing`).toBe(true);
      }
    }
  });

  it('every phase capstone exists and belongs to that phase', () => {
    for (const phase of CURRICULUM.phases) {
      const cap = CURRICULUM.quests.find((q) => q.id === phase.capstoneQuestId);
      expect(cap, `${phase.id} capstone missing`).toBeTruthy();
      expect(cap!.phaseId).toBe(phase.id);
    }
  });
});
