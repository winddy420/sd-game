/**
 * SD-GAME Domain Types
 *
 * Source-of-truth types shared across game-engine, content, and web app.
 * All curriculum content (components, concepts, quests, phases) conforms to
 * these types and is validated with Zod schemas in @sd-game/game-engine.
 */

/* ------------------------------------------------------------------ */
/* Component catalog (the building blocks players drag onto the canvas) */
/* ------------------------------------------------------------------ */

export type ComponentType =
  | 'cdn'
  | 'loadBalancer'
  | 'gateway'
  | 'appServer'
  | 'dbSQL'
  | 'dbNoSQL'
  | 'cache'
  | 'queue'
  | 'search'
  | 'objectStorage';

/** A canonical infrastructure component the player can place on the canvas. */
export interface ComponentDef {
  id: string; // e.g. 'cdn-cloudflare'
  type: ComponentType;
  name: string; // display name
  icon: string; // emoji used in palette + canvas
  category: 'edge' | 'routing' | 'compute' | 'data' | 'messaging';
  /** Median request latency added to the path, in milliseconds. */
  baseLatency: number;
  /** Max sustained throughput in requests/second (or messages/s for queues). */
  capacity: number;
  /** Monthly cost in USD for one instance. */
  costPerMonth: number;
  /** Fractional availability, e.g. 0.9999 = four 9s. */
  availability: number;
  /** Probability of failure under stress, 0..1. */
  failureRate: number;
  description: string;
  /** Tunable props surfaced in the editor, e.g. cacheHitRatio, replicaCount. */
  props?: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* Architecture topology (what the player builds)                      */
/* ------------------------------------------------------------------ */

export interface TopologyNode {
  id: string; // React Flow node id
  componentId: string; // references ComponentDef.id
  /** Instance count — scales capacity/cost linearly, improves availability. */
  replicas: number;
}

export interface TopologyEdge {
  id: string;
  source: string; // node id
  target: string; // node id
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

/* ------------------------------------------------------------------ */
/* Simulation output                                                   */
/* ------------------------------------------------------------------ */

export interface TrafficProfile {
  rps: number;
  /** 0..1, ratio of read vs write traffic. */
  readRatio: number;
}

export interface SimMetrics {
  /** End-to-end p95 latency along the critical path, in ms. */
  latencyP95: number;
  /** Aggregate monthly cost in USD. */
  costPerMonth: number;
  /** Composite availability (serial multiply, parallel improves). */
  availability: number;
  /** Max throughput before bottleneck, in rps. */
  maxThroughput: number;
  /** Node ids that are overloaded at the target traffic. */
  bottlenecks: string[];
  /** Whether the topology can even route a request end-to-end. */
  connected: boolean;
}

/* ------------------------------------------------------------------ */
/* Quest types                                                         */
/* ------------------------------------------------------------------ */

export type QuestType = 'lesson' | 'architecture' | 'incident' | 'command';

/** Shared base for every quest. */
export interface QuestBase {
  id: string;
  title: string;
  phaseId: string;
  order: number;
  xpReward: number;
  /** ids of quests that must be completed first (empty = unlocked). */
  prerequisites?: string[];
}

/* ---- 1. Lesson Quiz (concept + spaced repetition) ---- */

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonQuest extends QuestBase {
  type: 'lesson';
  conceptId: string;
  questions: QuizQuestion[];
}

/* ---- 2. Architecture Challenge ---- */

export interface ScenarioTarget {
  minRps?: number;
  maxLatencyP95?: number;
  maxCostPerMonth?: number;
  minAvailability?: number;
}

export interface ArchitectureQuest extends QuestBase {
  type: 'architecture';
  brief: string; // the design brief shown to the player
  /** Component ids available in this quest's palette. */
  allowedComponents: string[];
  /** Component types the solution must include to be valid. */
  requiredComponentTypes?: ComponentType[];
  target: ScenarioTarget;
  traffic: TrafficProfile;
}

/* ---- 3. Incident Challenge (SRE diagnosis) ---- */

export interface IncidentChoice {
  id: string;
  label: string;
  isCorrect: boolean;
  feedback: string;
}

export interface IncidentQuest extends QuestBase {
  type: 'incident';
  failureDescription: string;
  symptoms: string[];
  /** Ordered diagnosis steps — each is a multiple-choice. */
  steps: IncidentChoice[][];
}

/* ---- 4. Command Lab (simulated terminal) ---- */

export interface CommandStep {
  prompt: string; // what the player must accomplish
  /** Regex patterns; the typed command matches if ANY passes. */
  acceptedPatterns: string[];
  /** A canonical correct answer shown after solving / as a hint. */
  sampleAnswer: string;
  hint: string;
}

export interface CommandQuest extends QuestBase {
  type: 'command';
  intro: string;
  steps: CommandStep[];
}

export type Quest = LessonQuest | ArchitectureQuest | IncidentQuest | CommandQuest;

/* ------------------------------------------------------------------ */
/* Concept (teachable unit, drives spaced repetition)                  */
/* ------------------------------------------------------------------ */

export interface Concept {
  id: string;
  title: string;
  summary: string;
  /** Markdown body of the lesson. */
  body: string;
  phaseId: string;
  /** ids of concepts that should be learned first. */
  prerequisites?: string[];
}

/* ------------------------------------------------------------------ */
/* Phase (a career act)                                                */
/* ------------------------------------------------------------------ */

export type CareerAct = 'Junior' | 'Mid' | 'Senior' | 'Staff';

export interface Phase {
  id: string; // e.g. 'phase-1'
  number: number;
  title: string;
  act: CareerAct;
  /** Tailwind color token for the legend, e.g. 'emerald'. */
  color: string;
  tagline: string;
  description: string;
  /** Scale of the company at this phase, e.g. '10 → 1K users'. */
  scale: string;
  conceptIds: string[];
  questIds: string[];
  capstoneQuestId: string;
  /** Phase ids that must be complete to unlock. */
  prerequisites: string[];
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Evaluated against progress; see badge predicates in game-engine. */
  predicate:
    | { kind: 'streak'; days: number }
    | { kind: 'questsCompleted'; count: number }
    | { kind: 'architecturesDesigned'; count: number }
    | { kind: 'phaseComplete'; phaseId: string }
    | { kind: 'lowLatency'; count: number; maxLatency: number };
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export interface Curriculum {
  components: ComponentDef[];
  concepts: Concept[];
  quests: Quest[];
  phases: Phase[];
  badges: Badge[];
}
