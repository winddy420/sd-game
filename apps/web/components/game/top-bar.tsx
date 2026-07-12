'use client';

import Link from 'next/link';
import { Flame, Trophy, Home, Map as MapIcon } from 'lucide-react';
import { useGameStore, useLevel, useCareerTitle } from '@/lib/store/game-store';
import { formatNumber } from '@/lib/utils';

export function TopBar() {
  const player = useGameStore((s) => s.player);
  const { level, intoLevel, nextLevelCost } = useLevel();
  const title = useCareerTitle();
  const pct = nextLevelCost > 0 ? Math.min(100, (intoLevel / nextLevelCost) * 100) : 100;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="text-lg">🎮</span>
          <span className="hidden sm:inline">SD-GAME</span>
        </Link>

        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-medium text-gray-200">
              Lv {level} · {title}
            </span>
            <span className="hidden sm:inline">
              {formatNumber(intoLevel)} / {formatNumber(nextLevelCost)} XP
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <Link
          href="/map"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5"
          title="Career map"
        >
          <MapIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Map</span>
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-300 hover:bg-white/5"
          title="Profile & badges"
        >
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Profile</span>
        </Link>

        <div
          className="flex items-center gap-1 rounded-lg bg-orange-500/10 px-2 py-1.5 text-sm font-semibold text-orange-400"
          title={`${player.streak.current}-day streak (best ${player.streak.longest}) · ${player.streak.freezes} streak freeze${player.streak.freezes === 1 ? '' : 's'} available (refill at each promotion)`}
        >
          <Flame className="h-4 w-4" />
          {player.streak.current}
          {player.streak.freezes > 0 && (
            <span className="ml-0.5 text-sky-400" title="streak freezes">
              🧊{player.streak.freezes}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
