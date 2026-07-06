import type { Badge } from './types';

/** Milestone + skill badges (design doc §4.4). */
export const BADGES: Badge[] = [
  {
    id: 'b-first-steps',
    name: 'First Steps',
    icon: '👣',
    description: 'Complete your first quest.',
    predicate: { kind: 'questsCompleted', count: 1 },
  },
  {
    id: 'b-architect',
    name: 'Architect',
    icon: '🏗️',
    description: 'Complete your first architecture challenge.',
    predicate: { kind: 'architecturesDesigned', count: 1 },
  },
  {
    id: 'b-streak-7',
    name: 'Week Warrior',
    icon: '🔥',
    description: 'Maintain a 7-day streak.',
    predicate: { kind: 'streak', days: 7 },
  },
  {
    id: 'b-streak-30',
    name: 'Unstoppable',
    icon: '⚡',
    description: 'Maintain a 30-day streak.',
    predicate: { kind: 'streak', days: 30 },
  },
  {
    id: 'b-quests-25',
    name: 'Quarter Centurion',
    icon: '🎯',
    description: 'Complete 25 quests.',
    predicate: { kind: 'questsCompleted', count: 25 },
  },
  {
    id: 'b-low-latency',
    name: 'Need for Speed',
    icon: '🏎️',
    description: 'Design 3 architectures with p95 latency under 100 ms.',
    predicate: { kind: 'lowLatency', count: 3, maxLatency: 100 },
  },
  {
    id: 'b-phase-1',
    name: 'Network Navigator',
    icon: '🌐',
    description: 'Complete Phase 1: Networking Foundations.',
    predicate: { kind: 'phaseComplete', phaseId: 'phase-1' },
  },
  {
    id: 'b-phase-2',
    name: 'Backend Builder',
    icon: '🔐',
    description: 'Complete Phase 2: Backend Engineering.',
    predicate: { kind: 'phaseComplete', phaseId: 'phase-2' },
  },
  {
    id: 'b-phase-4',
    name: 'Cache Master',
    icon: '💾',
    description: 'Complete Phase 4: Caching & Performance.',
    predicate: { kind: 'phaseComplete', phaseId: 'phase-4' },
  },
  {
    id: 'b-phase-7',
    name: 'K8s Wizard',
    icon: '☸️',
    description: 'Complete Phase 7: DevOps & Infrastructure.',
    predicate: { kind: 'phaseComplete', phaseId: 'phase-7' },
  },
  {
    id: 'b-phase-8',
    name: 'Hero',
    icon: '🏆',
    description: 'Complete Phase 8 and become a Staff Architect.',
    predicate: { kind: 'phaseComplete', phaseId: 'phase-8' },
  },
];
