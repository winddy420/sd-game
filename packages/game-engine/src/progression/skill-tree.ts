/**
 * Skill Tree — controls what is unlocked based on progress.
 *
 * A quest is unlocked when:
 *  - all its prerequisite quests are completed, AND
 *  - its phase is unlocked (phase prerequisites complete).
 * A concept is unlocked when its prerequisite concepts are learned.
 */

import type { Curriculum, Quest } from '@sd-game/content';

export interface Progress {
  completedQuestIds: string[];
  learnedConceptIds: string[];
}

export function isPhaseUnlocked(
  curriculum: Curriculum,
  phaseId: string,
  progress: Progress,
): boolean {
  const phase = curriculum.phases.find((p) => p.id === phaseId);
  if (!phase) return false;
  if (phase.prerequisites.length === 0) return true;
  // Phase is unlocked when the capstone of every prerequisite phase is done.
  return phase.prerequisites.every((prePhaseId) => {
    const pre = curriculum.phases.find((p) => p.id === prePhaseId);
    if (!pre) return true;
    return progress.completedQuestIds.includes(pre.capstoneQuestId);
  });
}

export function isQuestUnlocked(
  curriculum: Curriculum,
  quest: Quest,
  progress: Progress,
): boolean {
  if (!isPhaseUnlocked(curriculum, quest.phaseId, progress)) return false;
  return (quest.prerequisites ?? []).every((id) => progress.completedQuestIds.includes(id));
}

export function isConceptUnlocked(
  curriculum: Curriculum,
  conceptId: string,
  progress: Progress,
): boolean {
  const concept = curriculum.concepts.find((c) => c.id === conceptId);
  if (!concept) return false;
  return (concept.prerequisites ?? []).every((id) => progress.learnedConceptIds.includes(id));
}

/** All quests currently available to play (unlocked, not yet done). */
export function availableQuests(curriculum: Curriculum, progress: Progress): Quest[] {
  return curriculum.quests.filter(
    (q) =>
      !progress.completedQuestIds.includes(q.id) &&
      isQuestUnlocked(curriculum, q, progress),
  );
}

/** Quests that block a given quest (its direct prerequisites). */
export function blockersFor(
  curriculum: Curriculum,
  quest: Quest,
  progress: Progress,
): Quest[] {
  return (quest.prerequisites ?? [])
    .filter((id) => !progress.completedQuestIds.includes(id))
    .map((id) => curriculum.quests.find((q) => q.id === id))
    .filter((q): q is Quest => Boolean(q));
}
