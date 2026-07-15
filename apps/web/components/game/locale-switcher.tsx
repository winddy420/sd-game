'use client';

import { useTranslations } from 'next-intl';
import { useGameStore } from '@/lib/store/game-store';
import { LOCALES, type Locale } from '@sd-game/content';
import { cn } from '@/lib/utils';

/**
 * Segmented EN | TH language toggle. Reads/writes the persisted locale via the
 * game store, so switching is instant (no reload) and survives across sessions.
 */
export function LocaleSwitcher() {
  const t = useTranslations('nav');
  const locale = useGameStore((s) => s.player.locale);
  const setLocale = useGameStore((s) => s.setLocale);

  return (
    <div
      className="flex items-center rounded-lg border border-white/10 bg-white/[0.02] p-0.5"
      role="group"
      aria-label={t('language')}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code as Locale)}
            aria-pressed={active}
            className={cn(
              'rounded px-2 py-1 text-xs font-semibold transition-colors',
              active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200',
            )}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
