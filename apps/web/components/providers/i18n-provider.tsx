'use client';

import { useEffect, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useGameStore } from '@/lib/store/game-store';
import { type Locale } from '@sd-game/content';
import en from '@/messages/en.json';
import th from '@/messages/th.json';

/**
 * Provides the active locale + message catalog to the whole client tree.
 *
 * Non-routing i18n: both catalogs are bundled (they're small), and the active
 * locale comes from the persisted Zustand store — so switching language is
 * instant (no reload) and survives across sessions via IndexedDB. The PWA
 * `start_url` stays locale-agnostic (no /en /th path split).
 */
const MESSAGES: Record<Locale, Record<string, unknown>> = { en, th };

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useGameStore((s) => s.player.locale);

  // Keep <html lang> in sync for accessibility / screen readers.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone="Asia/Bangkok"
      messages={MESSAGES[locale]}
    >
      {children}
    </NextIntlClientProvider>
  );
}
