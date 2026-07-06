# SD-GAME — Repo Guide

System Design learning game (interactive simulation + Career RPG + gamification).

## Commands

```bash
pnpm install          # install all workspace deps
pnpm dev              # dev server → http://localhost:3000
pnpm build            # production build (all packages via turbo)
pnpm test             # vitest (game-engine, 35 tests)
pnpm typecheck        # tsc --noEmit (all packages)
```

Per-package: `pnpm --filter @sd-game/game-engine test`, `pnpm --filter @sd-game/web typecheck`, etc.

## Architecture (read this first)

Monorepo (pnpm workspaces + Turborepo). Three packages:

- **`packages/content`** — the source of truth. Domain `types.ts`, the component `components.ts` catalog (latency/capacity/cost/availability numbers that power the simulation), and `phases/phase-N-*.ts` curriculum files. **`@sd-game/content`** exports `CURRICULUM`.
- **`packages/game-engine`** — pure, framework-agnostic logic. `simulation/engine.ts` (topology → metrics), `quest/engine.ts` (grading all 4 quest types), `progression/` (XP curve, SM-2 spaced repetition, streak, skill-tree gating), `badges.ts`, `validation.ts` (Zod). Importable in any JS runtime.
- **`apps/web`** — Next.js 15 PWA. `lib/store/game-store.ts` is the Zustand store (persists to Dexie/IndexedDB via `lib/db.ts`). `components/canvas/` is the React Flow editor. `components/quest/*-quest-view.tsx` are the 4 quest renderers.

**Data flow:** user action → Zustand store → Dexie (IndexedDB). Simulation is a pure function `(topology, traffic) → metrics`, graded by `gradeArchitecture`.

## Authoring content

Add/edit quests in `packages/content/src/phases/phase-N-*.ts`. Each quest is a discriminated union (`type: 'lesson' | 'architecture' | 'incident' | 'command'`). Rules:
- ids: concepts `c-N-...`, quests `q-N-...`, phaseId `phase-N`.
- Use **only** component ids from `packages/content/src/components.ts` in architecture quests' `allowedComponents`.
- Template-literal concept bodies must escape `${` as `\${` (e.g. GitHub Actions `${{ }}`).
- Single-quoted strings must escape or avoid apostrophes.
- Content is validated by Zod (`curriculumSchema`); run `pnpm typecheck`.

## Testing

- `pnpm test` — game-engine unit tests (simulation math, XP/SM-2/streak, quest grading).
- Playtest manually: `pnpm dev`, open browser, play a lesson → architecture quest. Progress persists in IndexedDB (`sd-game` db); reset from `/profile`.
