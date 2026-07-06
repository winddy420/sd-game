import { describe, it, expect } from 'vitest';
import { CURRICULUM } from '@sd-game/content';
import type { Topology } from '@sd-game/content';
import {
  gradeLesson,
  gradeIncident,
  gradeCommand,
  gradeArchitecture,
} from './engine';

const lesson = CURRICULUM.quests.find((q) => q.id === 'q-1-lesson-http')!;
const incident = CURRICULUM.quests.find((q) => q.id === 'q-1-incident-dns')!;
const command = CURRICULUM.quests.find((q) => q.id === 'q-1-command-tools')!;
const arch = CURRICULUM.quests.find((q) => q.id === 'q-1-arch-shortener')!;

describe('gradeLesson', () => {
  it('passes when every answer is correct', () => {
    if (lesson.type !== 'lesson') throw new Error('expected lesson');
    const correct = lesson.questions.map((q) => q.correctIndex);
    const r = gradeLesson(lesson, correct);
    expect(r.correct).toBe(r.total);
    expect(r.passed).toBe(true);
  });

  it('fails and reports how many were wrong', () => {
    if (lesson.type !== 'lesson') throw new Error('expected lesson');
    const wrong = lesson.questions.map((_, i) => (i === 0 ? 99 : 0));
    const r = gradeLesson(lesson, wrong);
    expect(r.passed).toBe(false);
    expect(r.correct).toBeLessThan(r.total);
  });
});

describe('gradeIncident', () => {
  it('passes only when the correct diagnosis is chosen', () => {
    if (incident.type !== 'incident') throw new Error('expected incident');
    const step = incident.steps[0]!;
    const correctId = step.find((c) => c.isCorrect)!.id;
    expect(gradeIncident(incident, [correctId]).passed).toBe(true);
    const wrongId = step.find((c) => !c.isCorrect)!.id;
    expect(gradeIncident(incident, [wrongId]).passed).toBe(false);
  });
});

describe('gradeCommand', () => {
  it('matches accepted command patterns case-insensitively', () => {
    if (command.type !== 'command') throw new Error('expected command');
    const answers = command.steps.map((s) => s.sampleAnswer);
    const r = gradeCommand(command, answers);
    expect(r.passed).toBe(true);
  });

  it('rejects nonsense commands', () => {
    if (command.type !== 'command') throw new Error('expected command');
    const r = gradeCommand(command, ['blah', 'xyz', 'nope']);
    expect(r.passed).toBe(false);
  });
});

describe('gradeArchitecture', () => {
  const goodTopology: Topology = {
    nodes: [
      { id: 'cdn', componentId: 'cdn-cloudflare', replicas: 1 },
      { id: 'lb', componentId: 'lb-l7-nginx', replicas: 1 },
      { id: 'app', componentId: 'app-node', replicas: 2 },
      { id: 'cache', componentId: 'redis', replicas: 2 },
      { id: 'db', componentId: 'db-postgres', replicas: 2 },
    ],
    edges: [
      { id: 'e1', source: 'cdn', target: 'lb' },
      { id: 'e2', source: 'lb', target: 'app' },
      { id: 'e3', source: 'app', target: 'cache' },
      { id: 'e4', source: 'cache', target: 'db' },
    ],
  };

  it('grades a well-formed design as passing', () => {
    if (arch.type !== 'architecture') throw new Error('expected architecture');
    const r = gradeArchitecture(arch, goodTopology);
    expect(r.metrics.connected).toBe(true);
    expect(r.hasRequiredComponents).toBe(true);
    expect(r.grade).toBe('S');
    expect(r.passed).toBe(true);
  });

  it('fails when a required component type is missing', () => {
    if (arch.type !== 'architecture') throw new Error('expected architecture');
    const missingLb: Topology = {
      nodes: [
        { id: 'app', componentId: 'app-node', replicas: 1 },
        { id: 'db', componentId: 'db-postgres', replicas: 1 },
      ],
      edges: [{ id: 'e1', source: 'app', target: 'db' }],
    };
    const r = gradeArchitecture(arch, missingLb);
    expect(r.hasRequiredComponents).toBe(false);
    expect(r.missingTypes).toContain('loadBalancer');
    expect(r.passed).toBe(false);
  });

  it('fails when the topology is disconnected', () => {
    if (arch.type !== 'architecture') throw new Error('expected architecture');
    const disconnected: Topology = {
      nodes: [
        { id: 'lb', componentId: 'lb-l7-nginx', replicas: 1 },
        { id: 'app', componentId: 'app-node', replicas: 1 },
        { id: 'db', componentId: 'db-postgres', replicas: 1 },
      ],
      edges: [
        { id: 'e1', source: 'lb', target: 'app' },
        // app never connects to db
      ],
    };
    const r = gradeArchitecture(arch, disconnected);
    expect(r.metrics.connected).toBe(false);
    expect(r.passed).toBe(false);
  });
});
