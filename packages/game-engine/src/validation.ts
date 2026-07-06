/**
 * Zod schemas — validate curriculum content at load / author time.
 * Catches malformed content data early with precise errors.
 */

import { z } from 'zod';

export const componentTypeSchema = z.enum([
  'cdn',
  'loadBalancer',
  'gateway',
  'appServer',
  'dbSQL',
  'dbNoSQL',
  'cache',
  'queue',
  'search',
  'objectStorage',
]);

export const componentSchema = z.object({
  id: z.string(),
  type: componentTypeSchema,
  name: z.string(),
  icon: z.string(),
  category: z.enum(['edge', 'routing', 'compute', 'data', 'messaging']),
  baseLatency: z.number().nonnegative(),
  capacity: z.number().positive(),
  costPerMonth: z.number().nonnegative(),
  availability: z.number().min(0).max(1),
  failureRate: z.number().min(0).max(1),
  description: z.string(),
  props: z.record(z.string(), z.number()).optional(),
});

export const scenarioTargetSchema = z.object({
  minRps: z.number().positive().optional(),
  maxLatencyP95: z.number().positive().optional(),
  maxCostPerMonth: z.number().positive().optional(),
  minAvailability: z.number().min(0).max(1).optional(),
});

export const trafficSchema = z.object({
  rps: z.number().positive(),
  readRatio: z.number().min(0).max(1),
});

const questBase = {
  id: z.string(),
  title: z.string(),
  phaseId: z.string(),
  order: z.number().int(),
  xpReward: z.number().nonnegative(),
  prerequisites: z.array(z.string()).optional(),
};

export const quizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().nonnegative(),
  explanation: z.string(),
});

export const lessonQuestSchema = z.object({
  ...questBase,
  type: z.literal('lesson'),
  conceptId: z.string(),
  questions: z.array(quizQuestionSchema).min(1),
});

export const architectureQuestSchema = z.object({
  ...questBase,
  type: z.literal('architecture'),
  brief: z.string(),
  allowedComponents: z.array(z.string()),
  requiredComponentTypes: z.array(componentTypeSchema).optional(),
  target: scenarioTargetSchema,
  traffic: trafficSchema,
});

export const incidentQuestSchema = z.object({
  ...questBase,
  type: z.literal('incident'),
  failureDescription: z.string(),
  symptoms: z.array(z.string()),
  steps: z.array(z.array(z.object({
    id: z.string(),
    label: z.string(),
    isCorrect: z.boolean(),
    feedback: z.string(),
  }))).min(1),
});

export const commandStepSchema = z.object({
  prompt: z.string(),
  acceptedPatterns: z.array(z.string()).min(1),
  sampleAnswer: z.string(),
  hint: z.string(),
});

export const commandQuestSchema = z.object({
  ...questBase,
  type: z.literal('command'),
  intro: z.string(),
  steps: z.array(commandStepSchema).min(1),
});

export const questSchema = z.discriminatedUnion('type', [
  lessonQuestSchema,
  architectureQuestSchema,
  incidentQuestSchema,
  commandQuestSchema,
]);

export const conceptSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  phaseId: z.string(),
  prerequisites: z.array(z.string()).optional(),
});

export const phaseSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  act: z.enum(['Junior', 'Mid', 'Senior', 'Staff']),
  color: z.string(),
  tagline: z.string(),
  description: z.string(),
  scale: z.string(),
  conceptIds: z.array(z.string()),
  questIds: z.array(z.string()),
  capstoneQuestId: z.string(),
  prerequisites: z.array(z.string()),
});

export const curriculumSchema = z.object({
  components: z.array(componentSchema),
  concepts: z.array(conceptSchema),
  quests: z.array(questSchema),
  phases: z.array(phaseSchema),
  badges: z.array(z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    description: z.string(),
    predicate: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('streak'), days: z.number().int().positive() }),
      z.object({ kind: z.literal('questsCompleted'), count: z.number().int().positive() }),
      z.object({ kind: z.literal('architecturesDesigned'), count: z.number().int().positive() }),
      z.object({ kind: z.literal('phaseComplete'), phaseId: z.string() }),
      z.object({ kind: z.literal('lowLatency'), count: z.number().int().positive(), maxLatency: z.number().positive() }),
    ]),
  })),
});
