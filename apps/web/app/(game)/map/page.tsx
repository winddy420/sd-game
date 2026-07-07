'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CURRICULUM } from '@sd-game/content';
import { isPhaseUnlocked, isQuestUnlocked } from '@sd-game/game-engine';
import { useGameStore } from '@/lib/store/game-store';
import { Card, Badge, Button } from '@/components/ui/primitives';
import { QUEST_TYPE_META } from '@/lib/quest-meta';
import { cn } from '@/lib/utils';
import { Check, Lock, ChevronDown, ChevronUp } from 'lucide-react';

const ACT_COLOR: Record<string, { dot: string; ring: string; text: string }> = {
  emerald: { dot: 'bg-emerald-500', ring: 'border-emerald-500/40', text: 'text-emerald-400' },
  amber: { dot: 'bg-amber-500', ring: 'border-amber-500/40', text: 'text-amber-400' },
  orange: { dot: 'bg-orange-500', ring: 'border-orange-500/40', text: 'text-orange-400' },
  blue: { dot: 'bg-blue-500', ring: 'border-blue-500/40', text: 'text-blue-400' },
  red: { dot: 'bg-red-500', ring: 'border-red-500/40', text: 'text-red-400' },
};

export default function MapPage() {
  const player = useGameStore((s) => s.player);
  const progress = {
    completedQuestIds: player.completedQuestIds,
    learnedConceptIds: player.learnedConceptIds,
  };
  const [expanded, setExpanded] = useState<string | null>('phase-1');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Career Map</h1>
        <p className="text-sm text-gray-400">
          8 phases · Junior → Staff Architect · ScaleUp grows from 10 to 10M users.
        </p>
      </div>

      <div className="relative space-y-3">
        {/* Vertical spine */}
        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-white/5" />

        {CURRICULUM.phases.map((phase) => {
          const unlocked = isPhaseUnlocked(CURRICULUM, phase.id, progress);
          const done = phase.questIds.every((id) => player.completedQuestIds.includes(id));
          const doneCount = phase.questIds.filter((id) =>
            player.completedQuestIds.includes(id),
          ).length;
          const colors =
            ACT_COLOR[phase.color] ?? {
              dot: 'bg-white/30',
              ring: 'border-white/20',
              text: 'text-gray-400',
            };
          const isExpanded = expanded === phase.id;

          return (
            <div key={phase.id} className="relative pl-12">
              {/* Node dot */}
              <div
                className={cn(
                  'absolute left-2 top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-bg-card',
                  done ? colors.ring : unlocked ? 'border-white/20' : 'border-white/5 opacity-50',
                )}
              >
                {done ? (
                  <Check className={cn('h-4 w-4', colors.text)} />
                ) : (
                  <span className="text-xs font-bold">{phase.number}</span>
                )}
              </div>

              <Card className={cn('transition-opacity', !unlocked && 'opacity-60')}>
                <button
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => setExpanded(isExpanded ? null : phase.id)}
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn('bg-white/5', colors.text)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', colors.dot)} />
                        {phase.act} · {phase.scale}
                      </Badge>
                      {!unlocked && (
                        <Badge className="bg-white/5 text-gray-400">
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      )}
                      {done && <Badge className="bg-emerald-500/15 text-emerald-400">Complete</Badge>}
                    </div>
                    <h2 className="mt-2 text-lg font-bold">{phase.title}</h2>
                    <p className="text-sm text-gray-400">{phase.tagline}</p>
                    <div className="mt-1.5 text-xs text-gray-400">
                      {doneCount}/{phase.questIds.length} quests done
                    </div>
                  </div>
                  {unlocked &&
                    (isExpanded ? (
                      <ChevronUp className="h-5 w-5 shrink-0 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
                    ))}
                </button>

                {isExpanded && unlocked && (
                  <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                    {phase.questIds.map((qid) => {
                      const q = CURRICULUM.quests.find((x) => x.id === qid)!;
                      const qUnlocked = isQuestUnlocked(CURRICULUM, q, progress);
                      const qDone = player.completedQuestIds.includes(qid);
                      const meta = QUEST_TYPE_META[q.type];
                      const isCapstone = qid === phase.capstoneQuestId;
                      return (
                        <Link
                          key={qid}
                          href={qUnlocked ? `/quest/${qid}` : '#'}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border p-2.5 text-sm transition-colors',
                            qDone
                              ? 'border-emerald-500/20 bg-emerald-500/5'
                              : qUnlocked
                                ? 'border-white/5 bg-white/[0.02] hover:border-accent/30'
                                : 'border-white/5 opacity-50',
                            isCapstone && 'border-accent/30',
                          )}
                        >
                          <span className="text-lg">{meta.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 font-medium">
                              {q.title}
                              {isCapstone && (
                                <Badge className="bg-accent/15 text-accent-soft">Capstone</Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">+{q.xpReward} XP</div>
                          </div>
                          {qDone ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : qUnlocked ? (
                            <Button size="sm" variant="secondary">
                              Play
                            </Button>
                          ) : (
                            <Lock className="h-4 w-4 text-gray-600" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
