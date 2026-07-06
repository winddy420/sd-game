export * from './types';
export { COMPONENTS, COMPONENT_BY_ID } from './components';
export { BADGES } from './badges';
export { ALL_CONCEPTS, ALL_QUESTS, PHASES } from './phases';

import { COMPONENTS } from './components';
import { ALL_CONCEPTS, ALL_QUESTS, PHASES } from './phases';
import { BADGES } from './badges';
import type { Curriculum } from './types';

/** The complete, validated curriculum registry. */
export const CURRICULUM: Curriculum = {
  components: COMPONENTS,
  concepts: ALL_CONCEPTS,
  quests: ALL_QUESTS,
  phases: PHASES,
  badges: BADGES,
};
