'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGameStore } from '@/lib/store/game-store';
import { cn } from '@/lib/utils';
import { Sparkles, Snowflake } from 'lucide-react';

type Notice = {
  kind: 'badge' | 'act' | 'freeze';
  messageKey: string;
  params: Record<string, string | number>;
};

/**
 * Surfaces reward feedback the game otherwise swallows: the XP gained on each
 * action and milestone notices (badges, career-act promotions). Keys off the
 * monotonic lastActionSeq so consecutive identical amounts (e.g. +15 XP per
 * review) still re-trigger the animation.
 */
export function Toaster() {
  const t = useTranslations();
  const lastXpGain = useGameStore((s) => s.lastXpGain);
  const lastNotice = useGameStore((s) => s.lastNotice);
  const seq = useGameStore((s) => s.lastActionSeq);

  const [xp, setXp] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (seq === 0) return;
    if (lastXpGain && lastXpGain > 0) {
      setXp(lastXpGain);
      const timer = setTimeout(() => setXp(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [seq, lastXpGain]);

  useEffect(() => {
    if (seq === 0) return;
    if (lastNotice) {
      setNotice(lastNotice);
      const timer = setTimeout(() => setNotice(null), 3800);
      return () => clearTimeout(timer);
    }
  }, [seq, lastNotice]);

  if (xp === null && notice === null) return null;

  // Resolve raw params (e.g. career act id) into localised display values.
  const noticeText = notice
    ? t(notice.messageKey, {
        ...notice.params,
        ...(typeof notice.params.act === 'string'
          ? { act: t(`acts.${notice.params.act}`) }
          : {}),
      })
    : null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {noticeText && notice && (
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
          {noticeText}
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
