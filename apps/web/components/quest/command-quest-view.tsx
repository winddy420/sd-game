'use client';

import { useState, useRef, useEffect } from 'react';
import type { CommandQuest } from '@sd-game/content';
import { Card, Button } from '@/components/ui/primitives';
import { useGameStore } from '@/lib/store/game-store';
import { Check, X, Terminal, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Line {
  kind: 'input' | 'output' | 'success' | 'error' | 'hint';
  text: string;
}

export function CommandQuestView({
  quest,
  onDone,
}: {
  quest: CommandQuest;
  onDone: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { kind: 'output', text: quest.intro },
    { kind: 'output', text: '' },
  ]);
  const [solved, setSolved] = useState<boolean[]>(quest.steps.map(() => false));
  const [allDone, setAllDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const completeQuest = useGameStore((s) => s.completeQuest);

  useEffect(() => {
    inputRef.current?.focus();
  }, [stepIdx]);

  const step = quest.steps[stepIdx]!;

  function submit() {
    const cmd = typed.trim();
    if (!cmd) return;
    const newLines: Line[] = [{ kind: 'input', text: `$ ${cmd}` }];

    const isCorrect = step.acceptedPatterns.some((p) => new RegExp(p, 'i').test(cmd));
    if (isCorrect) {
      newLines.push({ kind: 'success', text: '✓ Accepted' });
      const nextSolved = [...solved];
      nextSolved[stepIdx] = true;
      setSolved(nextSolved);
      setLines((prev) => [...prev, ...newLines]);
      setTyped('');

      if (stepIdx < quest.steps.length - 1) {
        setTimeout(() => setStepIdx((i) => i + 1), 500);
      } else {
        setAllDone(true);
        void completeQuest(quest);
      }
    } else {
      newLines.push({
        kind: 'error',
        text: `command not recognized — try again, or use the hint.`,
      });
      setLines((prev) => [...prev, ...newLines]);
      setTyped('');
    }
  }

  function showHint() {
    setLines((prev) => [
      ...prev,
      { kind: 'hint', text: `💡 ${step.hint}` },
    ]);
  }

  return (
    <div className="space-y-4">
      {/* Progress chips */}
      <div className="flex flex-wrap gap-2">
        {quest.steps.map((s, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
              solved[i]
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : i === stepIdx
                  ? 'border-accent/40 bg-accent/10 text-accent-soft'
                  : 'border-white/5 text-gray-400',
            )}
          >
            {solved[i] ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
          </div>
        ))}
      </div>

      {/* Terminal */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-white/5 bg-black/30 px-4 py-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
          </div>
          <span className="ml-2 flex items-center gap-1.5 text-xs text-gray-400">
            <Terminal className="h-3.5 w-3.5" /> oncall@scaleup:~
          </span>
        </div>

        <div className="h-[280px] overflow-y-auto p-4 font-mono text-sm">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                'whitespace-pre-wrap break-words',
                line.kind === 'input' && 'text-gray-100',
                line.kind === 'output' && 'text-gray-400',
                line.kind === 'success' && 'text-emerald-400',
                line.kind === 'error' && 'text-red-400',
                line.kind === 'hint' && 'text-amber-400',
              )}
            >
              {line.text}
            </div>
          ))}

          {/* Current task */}
          {!allDone && (
            <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs not-italic">
              <span className="font-semibold text-accent-soft">Task {stepIdx + 1}: </span>
              <span className="text-gray-300">{step.prompt}</span>
            </div>
          )}

          {/* Input line */}
          {!allDone && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-emerald-400">$</span>
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                className="flex-1 bg-transparent font-mono text-sm text-gray-100 outline-none placeholder:text-gray-600"
                placeholder="type a command…"
              />
            </div>
          )}
        </div>

        {!allDone && (
          <div className="flex justify-end gap-2 border-t border-white/5 px-4 py-2">
            <Button variant="ghost" size="sm" onClick={showHint}>
              <Lightbulb className="h-3.5 w-3.5" /> Hint
            </Button>
          </div>
        )}
      </Card>

      {allDone && (
        <Card className="border-emerald-500/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="h-8 w-8 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold">All commands executed! +{quest.xpReward} XP</h2>
                <p className="text-sm text-gray-400">
                  Sample answers:{' '}
                  {quest.steps.map((s) => s.sampleAnswer).join(' · ')}
                </p>
              </div>
            </div>
            <Button onClick={onDone}>Continue</Button>
          </div>
        </Card>
      )}

      {!allDone && solved.some((s) => !s) && (
        <p className="text-center text-xs text-gray-400">
          Tip: commands are matched flexibly — press Enter to run.
        </p>
      )}
    </div>
  );
}
