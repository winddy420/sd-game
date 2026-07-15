'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CURRICULUM, localizedPhase, localizedQuest } from '@sd-game/content';
import { isQuestUnlocked, blockersFor } from '@sd-game/game-engine';
import { useGameStore, useLocale } from '@/lib/store/game-store';
import { QUEST_TYPE_META, useQuestTypeMeta } from '@/lib/quest-meta';
import { Card, Badge } from '@/components/ui/primitives';
import { ArrowLeft, Lock } from 'lucide-react';
import { LessonQuestView } from '@/components/quest/lesson-quest-view';
import { ArchitectureQuestView } from '@/components/quest/architecture-quest-view';
import { IncidentQuestView } from '@/components/quest/incident-quest-view';
import { CommandQuestView } from '@/components/quest/command-quest-view';

export default function QuestPage() {
  const t = useTranslations('quest');
  const tRoot = useTranslations();
  const locale = useLocale();
  const questTypeMeta = useQuestTypeMeta();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawQuest = CURRICULUM.quests.find((q) => q.id === params.id);

  const player = useGameStore((s) => s.player);
  const progress = {
    completedQuestIds: player.completedQuestIds,
    learnedConceptIds: player.learnedConceptIds,
  };

  if (!rawQuest) {
    return (
      <Card>
        <p>{t('notFound')}</p>
        <Link href="/map" className="text-accent-soft underline">
          {t('backToMap')}
        </Link>
      </Card>
    );
  }

  const quest = localizedQuest(rawQuest, locale);
  const phase = localizedPhase(CURRICULUM.phases.find((p) => p.id === quest.phaseId)!, locale);
  const unlocked = isQuestUnlocked(CURRICULUM, rawQuest, progress);
  const blockers = blockersFor(CURRICULUM, rawQuest, progress).map((b) => localizedQuest(b, locale));
  const completed = player.completedQuestIds.includes(quest.id);
  const meta = QUEST_TYPE_META[quest.type];

  if (!unlocked) {
    return (
      <div className="space-y-4">
        <BackLink phaseId={quest.phaseId} label={t('backToMap')} />
        <Card className="text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-gray-400" />
          <h1 className="text-xl font-bold">{quest.title}</h1>
          <p className="mt-1 text-sm text-gray-400">{t('unlockFirst')}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {blockers.map((b) => (
              <Link key={b.id} href={`/quest/${b.id}`}>
                <Badge className="cursor-pointer bg-white/10 hover:bg-white/20">
                  {QUEST_TYPE_META[b.type].icon} {b.title}
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackLink phaseId={quest.phaseId} label={t('backToMap')} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{quest.title}</h1>
              {completed && (
                <Badge className="bg-emerald-500/15 text-emerald-400">{t('done')}</Badge>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {t('metaLine', {
                phase: phase.title,
                type: questTypeMeta(quest.type).label,
                xp: quest.xpReward,
              })}
            </p>
          </div>
        </div>
      </div>

      {quest.type === 'lesson' && (
        <LessonQuestView quest={quest} onDone={() => router.push('/map')} />
      )}
      {quest.type === 'architecture' && (
        <ArchitectureQuestView quest={quest} onDone={() => router.push('/map')} />
      )}
      {quest.type === 'incident' && (
        <IncidentQuestView quest={quest} onDone={() => router.push('/map')} />
      )}
      {quest.type === 'command' && (
        <CommandQuestView quest={quest} onDone={() => router.push('/map')} />
      )}
    </div>
  );
}

function BackLink({ phaseId, label }: { phaseId: string; label: string }) {
  return (
    <Link
      href={`/map?phase=${phaseId}`}
      className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </Link>
  );
}
