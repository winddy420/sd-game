import type { Concept, Phase, Quest } from '../types';

import { PHASE_1_CONCEPTS, PHASE_1_QUESTS } from './phase-1-networking';
import { PHASE_2_CONCEPTS, PHASE_2_QUESTS } from './phase-2-backend';
import { PHASE_3_CONCEPTS, PHASE_3_QUESTS } from './phase-3-data';
import { PHASE_4_CONCEPTS, PHASE_4_QUESTS } from './phase-4-caching';
import { PHASE_5_CONCEPTS, PHASE_5_QUESTS } from './phase-5-patterns';
import { PHASE_6_CONCEPTS, PHASE_6_QUESTS } from './phase-6-scalability';
import { PHASE_7_CONCEPTS, PHASE_7_QUESTS } from './phase-7-devops';
import { PHASE_8_CONCEPTS, PHASE_8_QUESTS } from './phase-8-advanced';

export const ALL_CONCEPTS: Concept[] = [
  ...PHASE_1_CONCEPTS,
  ...PHASE_2_CONCEPTS,
  ...PHASE_3_CONCEPTS,
  ...PHASE_4_CONCEPTS,
  ...PHASE_5_CONCEPTS,
  ...PHASE_6_CONCEPTS,
  ...PHASE_7_CONCEPTS,
  ...PHASE_8_CONCEPTS,
];

export const ALL_QUESTS: Quest[] = [
  ...PHASE_1_QUESTS,
  ...PHASE_2_QUESTS,
  ...PHASE_3_QUESTS,
  ...PHASE_4_QUESTS,
  ...PHASE_5_QUESTS,
  ...PHASE_6_QUESTS,
  ...PHASE_7_QUESTS,
  ...PHASE_8_QUESTS,
];

/** Phase metadata (the career map). */
export const PHASES: Phase[] = [
  {
    id: 'phase-1',
    number: 1,
    title: 'Networking Foundations',
    act: 'Junior',
    color: 'emerald',
    tagline: 'How the internet actually moves bytes',
    description:
      'Start at the very beginning: HTTP, DNS, TCP/UDP, TLS, and CDNs. Build and break your first systems.',
    scale: '10 → 1K users',
    conceptIds: PHASE_1_CONCEPTS.map((c) => c.id),
    questIds: PHASE_1_QUESTS.map((q) => q.id),
    capstoneQuestId: 'q-1-capstone',
    prerequisites: [],
  },
  {
    id: 'phase-2',
    number: 2,
    title: 'Backend Engineering',
    act: 'Junior',
    color: 'emerald',
    tagline: 'APIs, auth, and not getting hacked',
    description:
      'Design real APIs: REST, idempotency, authentication, rate limiting, and the security basics every backend dev needs.',
    scale: '1K → 10K users',
    conceptIds: PHASE_2_CONCEPTS.map((c) => c.id),
    questIds: PHASE_2_QUESTS.map((q) => q.id),
    capstoneQuestId: 'q-2-capstone',
    prerequisites: ['phase-1'],
  },
  {
    id: 'phase-3',
    number: 3,
    title: 'Data Layer',
    act: 'Mid',
    color: 'amber',
    tagline: 'Where the data lives',
    description:
      'SQL vs NoSQL, ACID, replication, the CAP theorem, and sharding. Choose the right store and survive its trade-offs.',
    scale: '10K → 100K users',
    conceptIds: PHASE_3_CONCEPTS.map((c) => c.id),
    questIds: PHASE_3_QUESTS.map((q) => q.id),
    capstoneQuestId: 'q-3-capstone',
    prerequisites: ['phase-2'],
  },
  {
    id: 'phase-4',
    number: 4,
    title: 'Caching & Performance',
    act: 'Mid',
    color: 'amber',
    tagline: 'Make it fast, cheaply',
    description:
      'Cache strategies, invalidation, Redis, and CDN economics. Turn an 800ms API into a 50ms one.',
    scale: '100K → 500K users',
    conceptIds: PHASE_4_CONCEPTS.map((c) => c.id),
    questIds: PHASE_4_QUESTS.map((q) => q.id),
    capstoneQuestId: 'q-4-capstone',
    prerequisites: ['phase-3'],
  },
  {
    id: 'phase-5',
    number: 5,
    title: 'System Design Patterns',
    act: 'Senior',
    color: 'orange',
    tagline: 'Load balancers, queues, microservices',
    description:
      'The patterns that hold big systems together: load balancing, message queues, and when to split the monolith.',
    scale: '500K → 1M users',
    conceptIds: PHASE_5_CONCEPTS.map((c) => c.id),
    questIds: PHASE_5_QUESTS.map((q) => q.id),
    capstoneQuestId: 'q-5-capstone',
    prerequisites: ['phase-4'],
  },
  {
    id: 'phase-6',
    number: 6,
    title: 'Scalability & Reliability',
    act: 'Senior',
    color: 'orange',
    tagline: 'Survive the spike',
    description:
      'Scale horizontally, add circuit breakers, and practice chaos engineering so Black Friday doesn\'t take you down.',
    scale: '1M → 5M users',
    conceptIds: PHASE_6_CONCEPTS.map((c) => c.id),
    questIds: PHASE_6_QUESTS.map((q) => q.id),
    capstoneQuestId: 'q-6-capstone',
    prerequisites: ['phase-5'],
  },
  {
    id: 'phase-7',
    number: 7,
    title: 'DevOps & Infrastructure',
    act: 'Staff',
    color: 'blue',
    tagline: 'Ship safely, observe everything',
    description:
      'Docker, Kubernetes, CI/CD, Terraform, and observability. The tooling that turns code into a running, debuggable system.',
    scale: '5M → 8M users',
    conceptIds: PHASE_7_CONCEPTS.map((c) => c.id),
    questIds: PHASE_7_QUESTS.map((q) => q.id),
    capstoneQuestId: 'q-7-capstone',
    prerequisites: ['phase-6'],
  },
  {
    id: 'phase-8',
    number: 8,
    title: 'Advanced',
    act: 'Staff',
    color: 'red',
    tagline: 'Think globally',
    description:
      'Multi-region, consensus, distributed transactions, and database internals. The frontier of scale.',
    scale: '8M → 10M users',
    conceptIds: PHASE_8_CONCEPTS.map((c) => c.id),
    questIds: PHASE_8_QUESTS.map((q) => q.id),
    capstoneQuestId: 'q-8-capstone',
    prerequisites: ['phase-7'],
  },
];
