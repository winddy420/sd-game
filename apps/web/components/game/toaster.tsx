'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store/game-store';
import { cn } from '@/lib/utils';
import { Sparkles, Snowflake } from 'lucide-react';

/**
 * Surfaces reward feedback the game otherwise swallows: the XP gained on each
 * action and milestone notices (badges, career-act promotions). Keys off the
 * monotonic lastActionSeq so consecutive identical amounts (e.g. +15 XP per
 * review) still re-trigger the animation.
 */
export function Toaster() {
  const lastXpGain = useGameStore((s) => s.lastXpGain);
  const lastNotice = useGameStore((s) => s.lastNotice);
  const seq = useGameStore((s) => s.lastActionSeq);

  const [xp, setXp] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: 'badge' | 'act' | 'freeze'; text: string } | null>(null);

  useEffect(() => {
    if (seq === 0) return;
    if (lastXpGain && lastXpGain > 0) {
      setXp(lastXpGain);
      const t = setTimeout(() => setXp(null), 2500);
      return () => clearTimeout(t);
    }
  }, [seq, lastXpGain]);

  useEffect(() => {
    if (seq === 0) return;
    if (lastNotice) {
      setNotice(lastNotice);
      const t = setTimeout(() => setNotice(null), 3800);
      return () => clearTimeout(t);
    }
  }, [seq, lastNotice]);

  if (xp === null && notice === null) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {notice && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-xl',
            notice.kind === 'badge'
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
              : 'border-sky-500/40 bg-sky-500/15 text-sky-200',
          )}
        >
          {notice.kind === 'badge' ? (
            <Sparkles className="h-4 w-4 shrink-0" />
          ) : (
            <Snowflake className="h-4 w-4 shrink-0" />
          )}
          {notice.text}
        </div>
      )}
      {xp !== null && (
        <div className="rounded-xl border border-accent/40 bg-accent/20 px-4 py-2 text-sm font-bold text-accent-soft shadow-lg backdrop-blur-xl">
          +{xp} XP
        </div>
      )}
    </div>
  );
}
