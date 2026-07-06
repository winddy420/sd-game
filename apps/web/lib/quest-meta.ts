import type { QuestType } from '@sd-game/content';

export const QUEST_TYPE_META: Record<
  QuestType,
  { icon: string; label: string; color: string; blurb: string }
> = {
  lesson: {
    icon: '📚',
    label: 'Lesson',
    color: 'emerald',
    blurb: 'Learn a concept, then prove it with a quiz.',
  },
  architecture: {
    icon: '🏗️',
    label: 'Architecture',
    color: 'violet',
    blurb: 'Drag components onto the canvas and hit your targets.',
  },
  incident: {
    icon: '🚨',
    label: 'Incident',
    color: 'red',
    blurb: "The system's down. Diagnose it like an SRE.",
  },
  command: {
    icon: '⌨️',
    label: 'Command Lab',
    color: 'sky',
    blurb: 'Run real-looking commands in a simulated terminal.',
  },
};
