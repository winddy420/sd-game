/**
 * @sd-game/game-engine — framework-agnostic game logic.
 *
 * Pure functions only: simulation, quest grading, progression (XP/SM-2/streak),
 * skill-tree gating, badges, and content validation. Safe to run in any JS
 * runtime (browser, Node, worker).
 */

// Simulation
export {
  simulate,
  effectiveAvailability,
  effectiveCapacity,
  nodeLatency,
  describeAvailability,
} from './simulation/engine';

// Quest grading
export {
  gradeLesson,
  gradeIncident,
  gradeCommand,
  gradeArchitecture,
  gradeQuest,
} from './quest/engine';
export type {
  LessonResult,
  IncidentResult,
  CommandResult,
  ArchitectureResult,
  AnyQuestResult,
} from './quest/engine';

// Progression
export {
  xpForLevel,
  levelCost,
  levelFromXp,
  actForLevel,
  careerTitle,
  DAILY_XP_CAP,
  MAX_LEVEL,
} from './progression/xp';
export type { CareerAct as XPCareerAct } from './progression/xp';

export {
  newCard,
  review,
  dueCards,
} from './progression/sm2';
export type { ReviewCard, RecallRating } from './progression/sm2';

export {
  isPhaseUnlocked,
  isQuestUnlocked,
  isConceptUnlocked,
  availableQuests,
  blockersFor,
} from './progression/skill-tree';
export type { Progress } from './progression/skill-tree';

export {
  newStreak,
  registerActivity,
  dayIndex,
} from './progression/streak';
export type { StreakState, StreakOutcome } from './progression/streak';

export { hasBadge, newlyEarned } from './badges';
export type { BadgeProgress } from './badges';

// Validation
export {
  curriculumSchema,
  componentSchema,
  questSchema,
  phaseSchema,
  conceptSchema,
} from './validation';
import { curriculumSchema } from './validation';

/** Validate the supplied curriculum at runtime. Throws on malformed content. */
export function validateCurriculum(curriculum: unknown) {
  return curriculumSchema.parse(curriculum);
}
