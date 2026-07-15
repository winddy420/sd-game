'use client';

import { useTranslations } from 'next-intl';
import { CURRICULUM, localizedBadge } from '@sd-game/content';
import type { QuestType } from '@sd-game/content';
import { levelFromXp, hasBadge } from '@sd-game/game-engine';
import { useGameStore, useLocale, useCareerTitle } from '@/lib/store/game-store';
import { Card, Badge } from '@/components/ui/primitives';
import { LocaleSwitcher } from '@/components/game/locale-switcher';
import { QUEST_TYPE_META } from '@/lib/quest-meta';
import { formatNumber, cn } from '@/lib/utils';

const QUEST_TYPES: QuestType[] = ['lesson', 'architecture', 'incident', 'command'];

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tRoot = useTranslations();
  const locale = useLocale();
  const player = useGameStore((s) => s.player);
  const { level } = levelFromXp(player.totalXp);
  const title = useCareerTitle();

  const progress = {
    completedQuestIds: player.completedQuestIds,
    learnedConceptIds: player.learnedConceptIds,
  };

  const byType = CURRICULUM.quests.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] ?? 0) + 1;
    return acc;
  }, {});
  const doneByType = CURRICULUM.quests.reduce<Record<string, number>>((acc, q) => {
    if (player.completedQuestIds.includes(q.id)) acc[q.type] = (acc[q.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-gray-400">{t('career')}</p>
      </div>

      {/* Career card */}
      <Card className="bg-gradient-to-br from-accent/20 to-bg-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-2xl">
            🧑‍💻
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-accent-soft">
              {t('level', { level })}
            </div>
            <div className="text-xl font-bold">{title}</div>
            <div className="text-sm text-gray-400">
              {t('xpStreak', {
                xp: formatNumber(player.totalXp),
                current: player.streak.current,
                longest: player.streak.longest,
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Quest breakdown */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          {t('questProgress')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUEST_TYPES.map((qt) => {
            const meta = QUEST_TYPE_META[qt];
            return (
              <Card key={qt} className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span>{meta.icon}</span>
                  {tRoot(`questType.${qt}.label` as 'lesson')}
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {doneByType[qt] ?? 0}
                  <span className="text-sm text-gray-400">/{byType[qt] ?? 0}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          {t('badges', { earned: player.badgeIds.length, total: CURRICULUM.badges.length })}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CURRICULUM.badges.map((raw) => {
            const b = localizedBadge(raw, locale);
            const earned = hasBadge(raw, {
              progress,
              streakDays: player.streak.current,
              architecturesDesigned: player.architecturesDesigned,
              architectureLatencies: player.architectureLatencies,
              phases: CURRICULUM.phases,
            });
            return (
              <div
                key={b.id}
                className={cn(
                  'rounded-2xl border p-4 transition-opacity',
                  earned
                    ? 'border-accent/30 bg-accent/5'
                    : 'border-white/5 bg-white/[0.01] opacity-50 grayscale',
                )}
              >
                <div className="text-3xl">{b.icon}</div>
                <div className="mt-1 font-semibold">{b.name}</div>
                <div className="text-xs text-gray-400">{b.description}</div>
                {earned && (
                  <Badge className="mt-2 bg-emerald-500/15 text-emerald-400">{t('earned')}</Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{t('languageSection')}</div>
            <div className="text-xs text-gray-400">
              {locale === 'th' ? t('langTh') : t('langEn')}
            </div>
          </div>
          <LocaleSwitcher />
        </div>
      </Card>

      {/* Reset */}
      <ResetProgress />
    </div>
  );
}

function ResetProgress() {
  const t = useTranslations('profile');
  const reset = async () => {
    if (!confirm(t('resetConfirm'))) return;
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase('sd-game');
    }
    location.reload();
  };

  return (
    <div className="pt-4 text-center">
      <button onClick={reset} className="text-xs text-gray-600 underline hover:text-red-400">
        {t('reset')}
      </button>
    </div>
  );
}
