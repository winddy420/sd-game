'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CURRICULUM } from '@sd-game/content';
import { isQuestUnlocked, blockersFor } from '@sd-game/game-engine';
import { useGameStore } from '@/lib/store/game-store';
import { QUEST_TYPE_META } from '@/lib/quest-meta';
import { Card, Button, Badge } from '@/components/ui/primitives';
import { ArrowLeft, Lock } from 'lucide-react';
import { LessonQuestView } from '@/components/quest/lesson-quest-view';
import { ArchitectureQuestView } from '@/components/quest/architecture-quest-view';
import { IncidentQuestView } from '@/components/quest/incident-quest-view';
import { CommandQuestView } from '@/components/quest/command-quest-view';

export default function QuestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quest = CURRICULUM.quests.find((q) => q.id === params.id);

  const player = useGameStore((s) => s.player);
  const progress = {
    completedQuestIds: player.completedQuestIds,
    learnedConceptIds: player.learnedConceptIds,
  };

  if (!quest) {
    return (
      <Card>
        <p>Quest not found.</p>
        <Link href="/map" className="text-accent-soft underline">
          Back to map
        </Link>
      </Card>
    );
  }

  const phase = CURRICULUM.phases.find((p) => p.id === quest.phaseId)!;
  const unlocked = isQuestUnlocked(CURRICULUM, quest, progress);
  const blockers = blockersFor(CURRICULUM, quest, progress);
  const completed = player.completedQuestIds.includes(quest.id);
  const meta = QUEST_TYPE_META[quest.type];

  if (!unlocked) {
    return (
      <div className="space-y-4">
        <BackLink phaseId={quest.phaseId} />
        <Card className="text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-gray-500" />
          <h1 className="text-xl font-bold">{quest.title}</h1>
          <p className="mt-1 text-sm text-gray-400">Complete these first to unlock:</p>
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
      <BackLink phaseId={quest.phaseId} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{quest.title}</h1>
              {completed && <Badge className="bg-emerald-500/15 text-emerald-400">✓ Done</Badge>}
            </div>
            <p className="text-xs text-gray-400">
              {phase.title} · {meta.label} · +{quest.xpReward} XP
            </p>
          </div>
        </div>
      </div>

      {quest.type === 'lesson' && <LessonQuestView quest={quest} onDone={() => router.push('/map')} />}
      {quest.type === 'architecture' && (
        <ArchitectureQuestView quest={quest} onDone={() => router.push('/map')} />
      )}
      {quest.type === 'incident' && <IncidentQuestView quest={quest} onDone={() => router.push('/map')} />}
      {quest.type === 'command' && <CommandQuestView quest={quest} onDone={() => router.push('/map')} />}
    </div>
  );
}

function BackLink({ phaseId }: { phaseId: string }) {
  return (
    <Link
      href={`/map?phase=${phaseId}`}
      className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
    >
      <ArrowLeft className="h-4 w-4" /> Back to map
    </Link>
  );
}
