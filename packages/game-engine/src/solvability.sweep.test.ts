import { describe, it, expect } from 'vitest';
import { CURRICULUM, type ArchitectureQuest, type Topology, type ComponentDef, type ComponentType } from '@sd-game/content';
import { gradeArchitecture } from './quest/engine';

/**
 * Thorough solver: for each architecture quest, search for ANY topology that
 * passes all targets. Required component types are guaranteed present; the
 * connected path runs edge → app → cache? → db. Replica ranges are wide enough
 * for the high-RPS late phases.
 */
describe('architecture quest solvability', () => {
  const archQuests = CURRICULUM.quests.filter(
    (q): q is ArchitectureQuest => q.type === 'architecture',
  );

  for (const quest of archQuests) {
    it(`"${quest.title}" (${quest.id}) is solvable`, () => {
      const allowed = quest.allowedComponents
        .map((id) => CURRICULUM.components.find((c) => c.id === id))
        .filter((c): c is ComponentDef => Boolean(c));
      const pick = (t: ComponentType) => allowed.find((c) => c.type === t);

      const cdns = allowed.filter((c) => c.type === 'cdn');
      const lbs = allowed.filter((c) => c.type === 'loadBalancer');
      const gws = allowed.filter((c) => c.type === 'gateway');
      const apps = allowed.filter((c) => c.type === 'appServer');
      const caches = allowed.filter((c) => c.type === 'cache');
      const dbs = [...allowed.filter((c) => c.type === 'dbSQL'), ...allowed.filter((c) => c.type === 'dbNoSQL')];
      const queues = allowed.filter((c) => c.type === 'queue');

      const required = quest.requiredComponentTypes ?? [];

      const edgeOptions = [null, ...cdns, ...lbs, ...gws];
      const cacheOptions = [null, ...caches];

      let solved = false;
      let best: ReturnType<typeof gradeArchitecture> | null = null;

      for (const edge of edgeOptions) {
        for (const app of apps) {
          for (const cache of cacheOptions) {
            for (const db of dbs) {
              for (let ar = 1; ar <= 12 && !solved; ar++) {
                for (let cr = 1; cr <= 6 && !solved; cr++) {
                  for (let dr = 1; dr <= 8 && !solved; dr++) {
                    const nodes: Topology['nodes'] = [];
                    const edges: Topology['edges'] = [];
                    let prev: string | null = null;
                    const push = (id: string, def: ComponentDef, replicas: number, connect = true) => {
                      nodes.push({ id, componentId: def.id, replicas });
                      if (connect && prev) edges.push({ id: `e${nodes.length}`, source: prev, target: id });
                      if (connect) prev = id;
                    };
                    if (edge) push('edge', edge, 1);
                    push('app', app, ar);
                    if (cache) push('cache', cache, cr);
                    push('db', db, dr);

                    // Ensure every required type is present (place standalone if absent).
                    const present = new Set(nodes.map((n) => COMPONENT_TYPE(n.componentId)));
                    for (const t of required) {
                      if (!present.has(t)) {
                        const def = pick(t);
                        if (def) push(`req-${t}`, def, 1, false);
                      }
                    }
                    // Queues aren't on the read path; add one if a queue exists & isn't present.
                    if (queues.length && !present.has('queue')) {
                      push('q', queues[0]!, 1, false);
                    }

                    const res = gradeArchitecture(quest, { nodes, edges });
                    if (!best || res.grade > best.grade || (res.grade === best.grade && countTrue(res) > countTrue(best))) {
                      best = res;
                    }
                    if (res.passed) solved = true;
                  }
                }
              }
            }
          }
        }
      }

      if (!solved && best) {
        const m = best.metrics;
        console.error(
          `UNSOLVABLE ${quest.id}: grade=${best.grade} lat=${m.latencyP95}(≤${quest.target.maxLatencyP95}) ` +
            `cost=${m.costPerMonth}(≤${quest.target.maxCostPerMonth}) avail=${m.availability.toFixed(5)}(≥${quest.target.minAvailability}) ` +
            `thru=${m.maxThroughput}(≥${quest.target.minRps}) checks=${JSON.stringify(best.targetChecks)} ` +
            `missing=[${best.missingTypes.join(',')}] traffic=${quest.traffic.rps}rps readRatio=${quest.traffic.readRatio}`,
        );
      }
      expect(solved, `quest ${quest.id} has no passing topology`).toBe(true);
    });
  }
});

function COMPONENT_TYPE(id: string): ComponentType {
  return CURRICULUM.components.find((c) => c.id === id)!.type;
}
function countTrue(res: ReturnType<typeof gradeArchitecture>): number {
  return Object.values(res.targetChecks).filter(Boolean).length;
}
