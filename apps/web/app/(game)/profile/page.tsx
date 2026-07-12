'use client';

import { CURRICULUM } from '@sd-game/content';
import { levelFromXp, careerTitle, hasBadge } from '@sd-game/game-engine';
import { useGameStore } from '@/lib/store/game-store';
import { Card, Badge } from '@/components/ui/primitives';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const player = useGameStore((s) => s.player);
  const { level } = levelFromXp(player.totalXp);
  const title = careerTitle(level);

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
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-gray-400">Your career at ScaleUp Inc.</p>
      </div>

      {/* Career card */}
      <Card className="bg-gradient-to-br from-accent/20 to-bg-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 text-2xl">
            🧑‍💻
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-accent-soft">Level {level}</div>
            <div className="text-xl font-bold">{title}</div>
            <div className="text-sm text-gray-400">
              {formatNumber(player.totalXp)} XP · 🔥 {player.streak.current} day streak (best{' '}
              {player.streak.longest})
            </div>
          </div>
        </div>
      </Card>

      {/* Quest breakdown */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Quest progress
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['lesson', 'architecture', 'incident', 'command'] as const).map((t) => (
            <Card key={t} className="p-4">
              <div className="text-xs text-gray-400">{t}</div>
              <div className="mt-1 text-2xl font-bold">
                {doneByType[t] ?? 0}
                <span className="text-sm text-gray-400">/{byType[t] ?? 0}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Badges · {player.badgeIds.length}/{CURRICULUM.badges.length}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CURRICULUM.badges.map((b) => {
            const earned = hasBadge(b, {
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
                  <Badge className="mt-2 bg-emerald-500/15 text-emerald-400">Earned</Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      <ResetProgress />
    </div>
  );
}

function ResetProgress() {
  const reset = async () => {
    if (
      !confirm(
        'Reset ALL progress? This wipes XP, streak, badges, and saved architectures. Cannot be undone.',
      )
    )
      return;
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase('sd-game');
    }
    location.reload();
  };

  return (
    <div className="pt-4 text-center">
      <button onClick={reset} className="text-xs text-gray-600 underline hover:text-red-400">
        Reset all progress
      </button>
    </div>
  );
}
