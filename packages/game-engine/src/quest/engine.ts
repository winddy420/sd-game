/**
 * Quest Engine — grades player solutions for all four quest types.
 *
 *  - lesson     : compare selected option indices against correct ones.
 *  - incident   : each step's chosen choice must be correct.
 *  - command    : each step's typed command must match at least one pattern.
 *  - architecture: run the simulation, then check metrics vs. scenario target,
 *                  plus structural validity (required component types present).
 *
 * The result is a SLO grade A–F plus per-target pass flags, so the UI can show
 * exactly which requirement the player failed.
 */

import type {
  ArchitectureQuest,
  ComponentType,
  IncidentQuest,
  LessonQuest,
  Quest,
  ScenarioTarget,
  SimMetrics,
  Topology,
} from '@sd-game/content';
import { COMPONENT_BY_ID } from '@sd-game/content';
import { simulate, wiredComponentTypes } from '../simulation/engine';

/* ----------------------------- Lesson ----------------------------- */

export interface LessonResult {
  correct: number;
  total: number;
  /** indices the player chose, aligned to questions order. */
  answers: number[];
  passed: boolean;
}

export function gradeLesson(
  quest: LessonQuest,
  answers: number[],
): LessonResult {
  const total = quest.questions.length;
  let correct = 0;
  for (let i = 0; i < total; i++) {
    if (answers[i] === quest.questions[i]!.correctIndex) correct++;
  }
  const passed = correct === total;
  return { correct, total, answers, passed };
}

/* ----------------------------- Incident ----------------------------- */

export interface IncidentResult {
  stepResults: boolean[];
  passed: boolean;
}

export function gradeIncident(
  quest: IncidentQuest,
  /** For each step, the chosen choice id. */
  chosenIds: string[],
): IncidentResult {
  const stepResults = quest.steps.map((choices, i) => {
    const chosenId = chosenIds[i];
    const choice = choices.find((c) => c.id === chosenId);
    return choice?.isCorrect ?? false;
  });
  return { stepResults, passed: stepResults.every(Boolean) };
}

/* ----------------------------- Command ----------------------------- */

export interface CommandResult {
  stepResults: boolean[];
  passed: boolean;
}

export function gradeCommand(
  quest: import('@sd-game/content').CommandQuest,
  /** For each step, the command the player typed. */
  typed: string[],
): CommandResult {
  const stepResults = quest.steps.map((step, i) => {
    const cmd = typed[i] ?? '';
    return step.acceptedPatterns.some((p) => new RegExp(p, 'i').test(cmd));
  });
  return { stepResults, passed: stepResults.every(Boolean) };
}

/* ----------------------------- Architecture ----------------------------- */

export interface ArchitectureResult {
  metrics: SimMetrics;
  targetChecks: {
    latency: boolean;
    cost: boolean;
    availability: boolean;
    throughput: boolean;
  };
  /** All required component types are present in the topology. */
  hasRequiredComponents: boolean;
  /** Missing required component types, for UI feedback. */
  missingTypes: ComponentType[];
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  passed: boolean;
  feedback: FeedbackItem[];
}

/**
 * A localised feedback line. The engine emits a stable `key` + raw params; the
 * UI (translation boundary) renders it via its message catalog. Keeping the
 * engine free of display strings lets quest grading stay locale-independent.
 */
export interface FeedbackItem {
  key:
    | 'disconnected'
    | 'missingType'
    | 'throughput'
    | 'bottleneck'
    | 'latency'
    | 'availability'
    | 'cost'
    | 'allMet';
  params: Record<string, string | number>;
}

export function gradeArchitecture(
  quest: ArchitectureQuest,
  topology: Topology,
): ArchitectureResult {
  const metrics = simulate(topology, quest.traffic);
  const target = quest.target;

  // Structural validity: required types must be present AND wired into the flow
  // (reachable from an entry) — a floating, unwired node doesn't count (B5).
  const presentTypes = wiredComponentTypes(topology);
  const required = quest.requiredComponentTypes ?? [];
  const missingTypes = required.filter((t) => !presentTypes.has(t));
  const hasRequiredComponents = missingTypes.length === 0;

  const targetChecks = {
    latency: target.maxLatencyP95 != null ? metrics.latencyP95 <= target.maxLatencyP95 : true,
    cost: target.maxCostPerMonth != null ? metrics.costPerMonth <= target.maxCostPerMonth : true,
    availability:
      target.minAvailability != null ? metrics.availability >= target.minAvailability : true,
    throughput:
      target.minRps != null ? metrics.maxThroughput >= target.minRps && metrics.connected : true,
  };

  const passed =
    hasRequiredComponents &&
    metrics.connected &&
    targetChecks.latency &&
    targetChecks.cost &&
    targetChecks.availability &&
    targetChecks.throughput;

  const grade = computeGrade(targetChecks, hasRequiredComponents, metrics.connected);
  const feedback = buildFeedback({
    target,
    metrics,
    targetChecks,
    missingTypes,
    connected: metrics.connected,
    bottleneckNames: bottleneckNames(topology, metrics.bottlenecks),
  });

  return {
    metrics,
    targetChecks,
    hasRequiredComponents,
    missingTypes,
    grade,
    passed,
    feedback,
  };
}

function computeGrade(
  checks: ArchitectureResult['targetChecks'],
  hasRequired: boolean,
  connected: boolean,
): ArchitectureResult['grade'] {
  if (!connected || !hasRequired) return 'F';
  const score = [checks.latency, checks.cost, checks.availability, checks.throughput].filter(
    Boolean,
  ).length;
  if (score === 4) return 'S';
  if (score === 3) return 'A';
  if (score === 2) return 'B';
  if (score === 1) return 'C';
  return 'F';
}

function buildFeedback(args: {
  target: ScenarioTarget;
  metrics: SimMetrics;
  targetChecks: ArchitectureResult['targetChecks'];
  missingTypes: ComponentType[];
  connected: boolean;
  bottleneckNames: string[];
}): FeedbackItem[] {
  const { target, metrics, targetChecks, missingTypes, connected, bottleneckNames } = args;
  const out: FeedbackItem[] = [];

  if (!connected) {
    out.push({ key: 'disconnected', params: {} });
    return out;
  }
  for (const type of missingTypes) {
    out.push({ key: 'missingType', params: { type } });
  }
  if (!targetChecks.throughput) {
    out.push({
      key: 'throughput',
      params: { actual: metrics.maxThroughput, target: target.minRps ?? 0 },
    });
    if (bottleneckNames.length) {
      out.push({ key: 'bottleneck', params: { names: bottleneckNames.join(', ') } });
    }
  }
  if (!targetChecks.latency) {
    out.push({
      key: 'latency',
      params: { actual: metrics.latencyP95, budget: target.maxLatencyP95 ?? 0 },
    });
  }
  if (!targetChecks.availability) {
    out.push({
      key: 'availability',
      params: {
        actual: round2(metrics.availability * 100),
        target: round2((target.minAvailability ?? 0) * 100),
      },
    });
  }
  if (!targetChecks.cost) {
    out.push({
      key: 'cost',
      params: { actual: metrics.costPerMonth, budget: target.maxCostPerMonth ?? 0 },
    });
  }
  if (out.length === 0) {
    out.push({ key: 'allMet', params: {} });
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Human-readable component names for the bottleneck node ids (for feedback). */
function bottleneckNames(topology: Topology, ids: string[]): string[] {
  const byId = new Map(topology.nodes.map((nd) => [nd.id, nd.componentId]));
  const names: string[] = [];
  for (const id of ids) {
    const cid = byId.get(id);
    const def = cid ? COMPONENT_BY_ID[cid] : undefined;
    if (def) names.push(def.name);
  }
  return names;
}

/* ----------------------------- Dispatcher ----------------------------- */

export type AnyQuestResult =
  | { type: 'lesson'; result: LessonResult }
  | { type: 'incident'; result: IncidentResult }
  | { type: 'command'; result: CommandResult }
  | { type: 'architecture'; result: ArchitectureResult };

/** Grade any quest given a player's submission. */
export function gradeQuest(quest: Quest, submission: unknown): AnyQuestResult | null {
  switch (quest.type) {
    case 'lesson':
      return { type: 'lesson', result: gradeLesson(quest, submission as number[]) };
    case 'incident':
      return { type: 'incident', result: gradeIncident(quest, submission as string[]) };
    case 'command':
      return { type: 'command', result: gradeCommand(quest, submission as string[]) };
    case 'architecture':
      return { type: 'architecture', result: gradeArchitecture(quest, submission as Topology) };
    default:
      return null;
  }
}
