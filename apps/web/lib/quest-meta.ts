import type { QuestType } from '@sd-game/content';
import { useTranslations } from 'next-intl';

/** Locale-independent quest-type chrome (emoji + tailwind color token). */
export const QUEST_TYPE_META: Record<QuestType, { icon: string; color: string }> = {
  lesson: { icon: '📚', color: 'emerald' },
  architecture: { icon: '🏗️', color: 'violet' },
  incident: { icon: '🚨', color: 'red' },
  command: { icon: '⌨️', color: 'sky' },
};

export type QuestTypeMeta = { icon: string; color: string; label: string; blurb: string };

/** Localised quest-type meta (label + blurb from the i18n catalog). */
export function useQuestTypeMeta() {
  const t = useTranslations('questType');
  return (type: QuestType): QuestTypeMeta => ({
    ...QUEST_TYPE_META[type],
    label: t(`${type}.label` as 'lesson'),
    blurb: t(`${type}.blurb` as 'lesson'),
  });
}
