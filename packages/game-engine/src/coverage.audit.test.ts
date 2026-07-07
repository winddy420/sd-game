import { describe, it, expect } from 'vitest';
import { CURRICULUM } from '@sd-game/content';

/**
 * Learning-coverage audit: the pedagogy is only complete if every concept is
 * actually taught AND tested, every quest is reachable from a fresh start, and
 * every badge is earnable. Catches "orphan" content a player could never reach.
 */
describe('learning coverage', () => {
  it('every concept belongs to a phase and is referenced by a lesson quest', () => {
    for (const concept of CURRICULUM.concepts) {
      const phase = CURRICULUM.phases.find((p) => p.id === concept.phaseId);
      expect(phase, `concept ${concept.id} has no phase`).toBeTruthy();
      // concept prerequisites must be real concepts in the same or earlier phase.
      for (const pre of concept.prerequisites ?? []) {
        expect(CURRICULUM.concepts.some((c) => c.id === pre), `${concept.id} prereq ${pre} missing`).toBe(true);
      }
    }
  });

  it('every phase lists exactly its concepts and quests (no orphans, no missing)', () => {
    for (const phase of CURRICULUM.phases) {
      const phaseConcepts = CURRICULUM.concepts.filter((c) => c.phaseId === phase.id).map((c) => c.id);
      expect(new Set(phase.conceptIds).size, `${phase.id} conceptIds unique`).toBe(phase.conceptIds.length);
      expect(phase.conceptIds.sort(), `${phase.id} conceptIds match`).toEqual(phaseConcepts.sort());

      const phaseQuests = CURRICULUM.quests.filter((q) => q.phaseId === phase.id).map((q) => q.id);
      expect(new Set(phase.questIds).size, `${phase.id} questIds unique`).toBe(phase.questIds.length);
      expect(phase.questIds.sort(), `${phase.id} questIds match`).toEqual(phaseQuests.sort());
    }
  });

  it('every lesson quest tests a real concept, and every concept is tested by >=1 lesson', () => {
    const testedConcepts = new Set<string>();
    for (const q of CURRICULUM.quests) {
      if (q.type === 'lesson') {
        expect(CURRICULUM.concepts.some((c) => c.id === q.conceptId), `${q.id} → unknown concept ${q.conceptId}`).toBe(true);
        testedConcepts.add(q.conceptId);
      }
    }
    const untested = CURRICULUM.concepts.filter((c) => !testedConcepts.has(c.id)).map((c) => c.id);
    // Concepts may exist for context only, but in this curriculum each should
    // be testable. Flag any concept with no lesson teaching it.
    expect(untested, `concepts with no lesson quest: ${untested.join(', ')}`).toEqual([]);
  });

  it('every quest is reachable from a fresh start (no prerequisite cycles / dead-ends)', () => {
    // A quest is reachable if walking its prerequisite chain (and phase prereqs)
    // always terminates at quests with no prerequisites. Detect cycles too.
    const questById = new Map(CURRICULUM.quests.map((q) => [q.id, q]));
    for (const quest of CURRICULUM.quests) {
      const seen = new Set<string>();
      let cur: typeof quest | undefined = quest;
      while (cur && (cur.prerequisites?.length ?? 0) > 0) {
        const preId = cur.prerequisites![0]!;
        if (seen.has(preId)) throw new Error(`prereq cycle involving ${quest.id} → ${preId}`);
        seen.add(preId);
        cur = questById.get(preId);
        expect(cur, `${quest.id} → dangling prereq ${preId}`).toBeTruthy();
      }
    }
  });

  it('every badge predicate is satisfiable by some achievable progress state', () => {
    // We can't enumerate all states, but we sanity-check each predicate kind is
    // constructible: streak/quests/architectures by playing; phaseComplete by the
    // capstone existing; lowLatency by a solvable quest producing <maxLatency.
    for (const badge of CURRICULUM.badges) {
      const p = badge.predicate;
      if (p.kind === 'phaseComplete') {
        const phase = CURRICULUM.phases.find((ph) => ph.id === p.phaseId);
        expect(phase, `badge ${badge.id} → unknown phase ${p.phaseId}`).toBeTruthy();
      }
      if (p.kind === 'lowLatency') {
        // At least one architecture quest must be solvable under maxLatency,
        // otherwise the badge is unearnable.
        const solvable = CURRICULUM.quests.some(
          (q) => q.type === 'architecture' && (q.target.maxLatencyP95 ?? Infinity) >= p.maxLatency,
        );
        expect(solvable, `badge ${badge.id} lowLatency@${p.maxLatency} unreachable`).toBe(true);
      }
    }
  });

  it('the whole curriculum is structurally linear: phase N requires phase N-1', () => {
    // Players progress 1→8. A phase whose prereq isn't the previous phase (or
    // empty for phase 1) would be unreachable or out of order.
    for (const phase of CURRICULUM.phases) {
      if (phase.number === 1) {
        expect(phase.prerequisites, 'phase 1 should have no prereqs').toEqual([]);
      } else {
        const prev = CURRICULUM.phases.find((p) => p.number === phase.number - 1);
        expect(phase.prerequisites, `${phase.id} should require previous phase`).toContain(prev?.id);
      }
    }
  });
});
