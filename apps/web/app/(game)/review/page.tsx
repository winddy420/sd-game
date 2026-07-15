'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CURRICULUM, localizedConcept } from '@sd-game/content';
import { dueCards, type RecallRating } from '@sd-game/game-engine';
import { useGameStore, useLocale } from '@/lib/store/game-store';
import { Card, Button } from '@/components/ui/primitives';
import { Brain, Check, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const RATINGS: { rating: RecallRating; labelKey: string; color: string }[] = [
  { rating: 'again', labelKey: 'rateAgain', color: 'bg-red-500/20 text-red-400 hover:bg-red-500/30' },
  { rating: 'hard', labelKey: 'rateHard', color: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' },
  { rating: 'good', labelKey: 'rateGood', color: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' },
  { rating: 'easy', labelKey: 'rateEasy', color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' },
];

export default function ReviewPage() {
  const t = useTranslations('review');
  const tRoot = useTranslations();
  const locale = useLocale();
  const cards = useGameStore((s) => s.reviewCards);
  const recordReview = useGameStore((s) => s.recordReview);

  const due = useMemo(() => dueCards(cards, Date.now()), [cards]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const current = due[idx];

  async function rate(r: RecallRating) {
    if (!current) return;
    await recordReview(current.conceptId, r);
    setReviewed((n) => n + 1);
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  if (due.length === 0 || !current) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-gray-400">{t('subtitle')}</p>
        </div>
        <Card className="text-center">
          {reviewed > 0 ? (
            <>
              <Check className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
              <h2 className="text-xl font-bold">{t('allCaughtUp')}</h2>
              <p className="mt-1 text-sm text-gray-400">
                {t(reviewed === 1 ? 'reviewedMsgOne' : 'reviewedMsg', { count: reviewed })}
              </p>
            </>
          ) : (
            <>
              <Brain className="mx-auto mb-3 h-10 w-10 text-gray-400" />
              <h2 className="text-xl font-bold">{t('empty')}</h2>
              <p className="mt-1 text-sm text-gray-400">{t('emptyHint')}</p>
            </>
          )}
          <Link href="/map">
            <Button className="mt-4">{tRoot('quest.backToMap')}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const concept = CURRICULUM.concepts.find((c) => c.id === current.conceptId);
  const lc = concept ? localizedConcept(concept, locale) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-gray-400">
            {t('progress', { current: idx + 1, total: due.length, reviewed })}
          </p>
        </div>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(idx / due.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <div className="text-xs uppercase tracking-wide text-accent-soft">{t('recall')}</div>
        <h2 className="mt-1 text-xl font-bold">{lc?.title ?? current.conceptId}</h2>
        <p className="mt-2 text-gray-300">{lc?.summary}</p>

        {!revealed ? (
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={() => setRevealed(true)}>
              <Eye className="h-4 w-4" /> {t('showAnswer')}
            </Button>
          </div>
        ) : (
          <>
            <div className="prose-game mt-4 max-h-60 overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-gray-300">
              {lc?.body.split('\n').slice(0, 8).join('\n')}
            </div>
            <div className="mt-4 text-center text-xs text-gray-400">{t('howWell')}</div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.rating}
                  onClick={() => rate(r.rating)}
                  className={cn(
                    'rounded-xl py-3 text-sm font-semibold transition-colors',
                    r.color,
                  )}
                >
                  {t(r.labelKey as 'rateAgain')}
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-600">
              {t('nextInterval', { n: current.reps === 0 ? '1d' : `${current.interval}d` })}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
