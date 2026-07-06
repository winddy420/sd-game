'use client';

import { useEffect, type ReactNode } from 'react';
import { useGameStore } from '@/lib/store/game-store';

/** Loads the player's saved progress from IndexedDB on first mount. */
export function HydrateProvider({ children }: { children: ReactNode }) {
  const hydrate = useGameStore((s) => s.hydrate);
  const hydrated = useGameStore((s) => s.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-gray-400">Loading your progress…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
