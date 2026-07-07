'use client';

import Link from 'next/link';
import { CURRICULUM } from '@sd-game/content';
import {
  availableQuests,
  isQuestUnlocked,
  levelFromXp,
  careerTitle,
} from '@sd-game/game-engine';
import { useGameStore } from '@/lib/store/game-store';
import { Card, Button, Badge } from '@/components/ui/primitives';
import { formatNumber } from '@/lib/utils';
import { ArrowRight, Brain, Zap, BookOpen } from 'lucide-react';
import { QUEST_TYPE_META } from '@/lib/quest-meta';

export default function HomePage() {
  const player = useGameStore((s) => s.player);
  const cards = useGameStore((s) => s.reviewCards);
  const progress = {
    completedQuestIds: player.completedQuestIds,
    learnedConceptIds: player.learnedConceptIds,
  };

  const { level } = levelFromXp(player.totalXp);
  const title = careerTitle(level);
  const available = availableQuests(CURRICULUM, progress).sort((a, b) => a.order - b.order);
  const next = available[0];
  const dueNow = cards.filter((c) => c.due <= Date.now());

  const completedCount = player.completedQuestIds.length;
  const totalCount = CURRICULUM.quests.length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="bg-gradient-to-br from-accent/20 via-bg-card to-bg-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="mb-2 bg-accent/20 text-accent-soft">Lv {level} · {title}</Badge>
            <h1 className="text-2xl font-bold sm:text-3xl">Welcome to ScaleUp Inc.</h1>
            <p className="mt-1 max-w-md text-sm text-gray-400">
              You're the new engineer. Design systems, survive incidents, and climb from Junior to
              Staff Architect as the company grows from 10 to 10M users.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-center">
            <div className="text-3xl font-bold text-accent-soft">{formatNumber(player.totalXp)}</div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Total XP</div>
          </div>
        </div>
      </Card>

      {/* Continue */}
      {next && (
        <Card className="border-accent/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{QUEST_TYPE_META[next.type].icon}</div>
              <div>
                <div className="text-xs uppercase tracking-wide text-accent-soft">Continue</div>
                <div className="text-lg font-semibold">{next.title}</div>
                <div className="text-xs text-gray-400">
                  +{next.xpReward} XP · {CURRICULUM.phases.find((p) => p.id === next.phaseId)?.title}
                </div>
              </div>
            </div>
            <Link href={`/quest/${next.id}`}>
              <Button size="lg">
                Start <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Zap className="h-4 w-4" />} label="Quests done" value={`${completedCount}/${totalCount}`} />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Concepts" value={`${player.learnedConceptIds.length}`} />
        <StatCard icon={<Brain className="h-4 w-4" />} label="Due reviews" value={`${dueNow.length}`} highlight={dueNow.length > 0} />
        <StatCard icon="🏆" label="Badges" value={`${player.badgeIds.length}`} />
      </div>

      {/* Review CTA */}
      {dueNow.length > 0 && (
        <Link href="/review">
          <Card className="flex items-center justify-between border-amber-500/30 bg-amber-500/5 transition-transform hover:scale-[1.01]">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-amber-400" />
              <div>
                <div className="font-semibold">{dueNow.length} concept{dueNow.length > 1 ? 's' : ''} due for review</div>
                <div className="text-xs text-gray-400">Spaced repetition keeps knowledge sticky. ~5 min.</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-amber-400" />
          </Card>
        </Link>
      )}

      {/* Available quests */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Available quests
        </h2>
        {available.length === 0 ? (
          <Card className="text-center text-gray-400">
            {completedCount === totalCount
              ? '🎉 You completed every quest. Legendary!'
              : 'Complete the current quest to unlock more, or check the career map.'}
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {available.slice(0, 6).map((q) => {
              const phase = CURRICULUM.phases.find((p) => p.id === q.phaseId)!;
              return (
                <Link key={q.id} href={`/quest/${q.id}`}>
                  <Card className="h-full transition-transform hover:scale-[1.01] hover:border-accent/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{QUEST_TYPE_META[q.type].icon}</span>
                        <div>
                          <div className="font-medium">{q.title}</div>
                          <div className="text-xs text-gray-400">{phase.title}</div>
                        </div>
                      </div>
                      <Badge>+{q.xpReward}</Badge>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-amber-500/40 bg-amber-500/5 p-4' : 'p-4'}>
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </Card>
  );
}
