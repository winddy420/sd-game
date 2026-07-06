'use client';

import { useState } from 'react';
import type { IncidentQuest } from '@sd-game/content';
import { Card, Button } from '@/components/ui/primitives';
import { useGameStore } from '@/lib/store/game-store';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, X } from 'lucide-react';

export function IncidentQuestView({
  quest,
  onDone,
}: {
  quest: IncidentQuest;
  onDone: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [choices, setChoices] = useState<(string | null)[]>(
    quest.steps.map(() => null),
  );
  const [submitted, setSubmitted] = useState(false);

  const completeQuest = useGameStore((s) => s.completeQuest);

  const step = quest.steps[stepIdx]!;
  const chosen = choices[stepIdx];
  const allCorrect = quest.steps.every((stepChoices, i) => {
    const id = choices[i];
    return stepChoices.find((c) => c.id === id)?.isCorrect ?? false;
  });

  function pick(id: string) {
    if (submitted) return;
    setChoices((prev) => {
      const next = [...prev];
      next[stepIdx] = id;
      return next;
    });
  }

  async function finish() {
    setSubmitted(true);
    const correct = quest.steps.every((stepChoices, i) => {
      const id = choices[i];
      return stepChoices.find((c) => c.id === id)?.isCorrect ?? false;
    });
    if (correct) await completeQuest(quest);
  }

  return (
    <div className="space-y-4">
      {/* Incident brief */}
      <Card className="border-red-500/30 bg-red-500/[0.03]">
        <div className="mb-2 flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">PagerDuty: P1 Incident</span>
        </div>
        <p className="font-medium">{quest.failureDescription}</p>
        <div className="mt-3 space-y-1.5">
          {quest.symptoms.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-400">
              <span className="mt-0.5 text-red-400/60">▸</span>
              {s}
            </div>
          ))}
        </div>
      </Card>

      {/* Diagnosis step */}
      <Card>
        <div className="mb-1 text-xs uppercase tracking-wide text-gray-400">
          Diagnosis · Step {stepIdx + 1} of {quest.steps.length}
        </div>
        <h2 className="mb-3 text-lg font-bold">What is the root cause?</h2>
        <div className="grid gap-2">
          {step.map((choice) => {
            const isChosen = chosen === choice.id;
            const showResult = submitted && isChosen;
            return (
              <button
                key={choice.id}
                disabled={submitted}
                onClick={() => pick(choice.id)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors',
                  isChosen
                    ? 'border-accent bg-accent/10'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10',
                  showResult && (choice.isCorrect ? 'border-emerald-500/50' : 'border-red-500/50'),
                )}
              >
                <span className="mt-0.5 text-gray-500">○</span>
                <div>
                  <div className="font-medium">{choice.label}</div>
                  {showResult && (
                    <div
                      className={cn(
                        'mt-1 flex items-start gap-1.5 text-xs',
                        choice.isCorrect ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      {choice.isCorrect ? (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {choice.feedback}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          disabled={stepIdx === 0}
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
        >
          ← Back
        </Button>
        {stepIdx < quest.steps.length - 1 ? (
          <Button disabled={!chosen} onClick={() => setStepIdx((i) => i + 1)}>
            Next →
          </Button>
        ) : (
          <Button disabled={!chosen || submitted} onClick={finish}>
            Submit diagnosis
          </Button>
        )}
      </div>

      {submitted && (
        <Card className={allCorrect ? 'border-emerald-500/40' : 'border-red-500/40'}>
          <div className="text-center">
            {allCorrect ? (
              <>
                <Check className="mx-auto h-8 w-8 text-emerald-400" />
                <h2 className="mt-2 text-lg font-bold">Resolved! +{quest.xpReward} XP</h2>
                <p className="text-sm text-gray-400">Root cause confirmed. Postmortem filed.</p>
              </>
            ) : (
              <>
                <X className="mx-auto h-8 w-8 text-red-400" />
                <h2 className="mt-2 text-lg font-bold">Not quite</h2>
                <p className="text-sm text-gray-400">Review the feedback and try again.</p>
              </>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            {allCorrect ? (
              <Button onClick={onDone}>Continue</Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => {
                  setSubmitted(false);
                  setStepIdx(0);
                  setChoices(quest.steps.map(() => null));
                }}
              >
                Retry
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
