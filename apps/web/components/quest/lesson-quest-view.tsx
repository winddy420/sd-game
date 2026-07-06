'use client';

import { useState } from 'react';
import type { LessonQuest } from '@sd-game/content';
import { CURRICULUM } from '@sd-game/content';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, Button } from '@/components/ui/primitives';
import { useGameStore } from '@/lib/store/game-store';
import { cn } from '@/lib/utils';
import { Check, X, Sparkles } from 'lucide-react';

export function LessonQuestView({
  quest,
  onDone,
}: {
  quest: LessonQuest;
  onDone: () => void;
}) {
  const concept = CURRICULUM.concepts.find((c) => c.id === quest.conceptId);
  const [stage, setStage] = useState<'read' | 'quiz' | 'result'>('read');
  const [answers, setAnswers] = useState<number[]>(() => quest.questions.map(() => -1));
  const [submitted, setSubmitted] = useState(false);

  const completeQuest = useGameStore((s) => s.completeQuest);
  const learnConcept = useGameStore((s) => s.learnConcept);

  const correct = answers.filter((a, i) => a === quest.questions[i]!.correctIndex).length;
  const allCorrect = correct === quest.questions.length;

  async function handleSubmit() {
    setSubmitted(true);
    setStage('result');
    if (allCorrect) {
      await learnConcept(quest.conceptId);
      await completeQuest(quest);
    }
  }

  return (
    <div className="space-y-4">
      {stage !== 'quiz' && concept && (
        <Card>
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-accent-soft">
            <Sparkles className="h-3.5 w-3.5" /> Concept
          </div>
          <h2 className="mb-3 text-xl font-bold">{concept.title}</h2>
          <p className="mb-4 text-gray-400">{concept.summary}</p>
          <div className="prose-game max-w-none text-sm text-gray-200">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{concept.body}</ReactMarkdown>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setStage('quiz')}>Continue to quiz →</Button>
          </div>
        </Card>
      )}

      {stage === 'quiz' && (
        <Card>
          <h2 className="mb-1 text-lg font-bold">Quick check</h2>
          <p className="mb-4 text-sm text-gray-400">
            Answer all {quest.questions.length} to earn {quest.xpReward} XP.
          </p>
          <div className="space-y-5">
            {quest.questions.map((q, qi) => (
              <div key={q.id}>
                <p className="mb-2 font-medium">
                  {qi + 1}. {q.prompt}
                </p>
                <div className="grid gap-2">
                  {q.options.map((opt, oi) => {
                    const selected = answers[qi] === oi;
                    const isCorrect = oi === q.correctIndex;
                    return (
                      <button
                        key={oi}
                        disabled={submitted}
                        onClick={() =>
                          setAnswers((prev) => {
                            const next = [...prev];
                            next[qi] = oi;
                            return next;
                          })
                        }
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors',
                          selected
                            ? 'border-accent bg-accent/10'
                            : 'border-white/5 bg-white/[0.02] hover:border-white/10',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs',
                            selected ? 'border-accent' : 'border-white/20',
                          )}
                        >
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStage('read')}>
              ← Re-read
            </Button>
            <Button disabled={answers.some((a) => a < 0)} onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </Card>
      )}

      {stage === 'result' && (
        <Card className={allCorrect ? 'border-emerald-500/40' : 'border-red-500/40'}>
          <div className="text-center">
            {allCorrect ? (
              <>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                  <Check className="h-7 w-7 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold">Perfect! +{quest.xpReward} XP</h2>
                <p className="mt-1 text-sm text-gray-400">Concept mastered.</p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
                  <X className="h-7 w-7 text-red-400" />
                </div>
                <h2 className="text-xl font-bold">
                  {correct}/{quest.questions.length} correct
                </h2>
                <p className="mt-1 text-sm text-gray-400">Re-read and try again to bank the XP.</p>
              </>
            )}
          </div>

          {/* Explanations */}
          <div className="mt-5 space-y-3">
            {quest.questions.map((q, qi) => {
              const right = answers[qi] === q.correctIndex;
              return (
                <div
                  key={q.id}
                  className={cn(
                    'rounded-xl border p-3 text-sm',
                    right ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5',
                  )}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {right ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                    {q.prompt}
                  </div>
                  <p className="mt-1 text-gray-400">
                    Answer: <span className="text-gray-200">{q.options[q.correctIndex]}</span>.{' '}
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            {!allCorrect && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSubmitted(false);
                  setStage('quiz');
                  setAnswers(quest.questions.map(() => -1));
                }}
              >
                Retry
              </Button>
            )}
            <Button onClick={onDone}>{allCorrect ? 'Continue' : 'Back to map'}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
