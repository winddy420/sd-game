import { describe, it, expect } from 'vitest';
import type { Topology } from '@sd-game/content';
import { simulate, effectiveAvailability, describeAvailability } from './engine';

const n = (id: string, componentId: string, replicas = 1) => ({ id, componentId, replicas });
const e = (id: string, source: string, target: string) => ({ id, source, target });

describe('simulate', () => {
  it('returns empty/disconnected metrics for an empty topology', () => {
    const m = simulate({ nodes: [], edges: [] }, { rps: 100, readRatio: 0.9 });
    expect(m.connected).toBe(false);
    expect(m.costPerMonth).toBe(0);
  });

  it('reports disconnected when there is no path to a data store', () => {
    const topology: Topology = {
      nodes: [
        n('lb', 'lb-l7-nginx'),
        n('app', 'app-node'),
        // no DB, no edge from app to anything
      ],
      edges: [e('e1', 'lb', 'app')],
    };
    const m = simulate(topology, { rps: 100, readRatio: 0.9 });
    expect(m.connected).toBe(false);
    expect(m.costPerMonth).toBeGreaterThan(0); // still pays for placed nodes
  });

  it('connects a simple CDN -> LB -> app -> DB path', () => {
    const topology: Topology = {
      nodes: [
        n('cdn', 'cdn-cloudflare'),
        n('lb', 'lb-l7-nginx'),
        n('app', 'app-node'),
        n('db', 'db-postgres'),
      ],
      edges: [
        e('e1', 'cdn', 'lb'),
        e('e2', 'lb', 'app'),
        e('e3', 'app', 'db'),
      ],
    };
    const m = simulate(topology, { rps: 500, readRatio: 0.9 });
    expect(m.connected).toBe(true);
    // The CDN serves ~81% of reads at the edge, so p95 sits well under the raw
    // 67ms sum of base latencies (B1: a working cache/CDN lowers latency).
    expect(m.latencyP95).toBeGreaterThan(0);
    expect(m.latencyP95).toBeLessThan(50);
    // cost = 200 + 100 + 150 + 500 = 950
    expect(m.costPerMonth).toBe(950);
    // availability multiplies along the path (CDN is kept; cache type excluded):
    // 0.99999*0.9999*0.999*0.999 ≈ 0.99789
    expect(m.availability).toBeGreaterThan(0.997);
    expect(m.availability).toBeLessThan(0.999);
  });

  it('detects a bottleneck when traffic exceeds a node capacity', () => {
    const topology: Topology = {
      nodes: [
        n('lb', 'lb-l7-nginx'),
        n('app', 'app-node'), // capacity 5_000
        n('db', 'db-postgres'),
      ],
      edges: [e('e1', 'lb', 'app'), e('e2', 'app', 'db')],
    };
    const m = simulate(topology, { rps: 6_000, readRatio: 0.9 });
    // app at 6k > 5k capacity → bottleneck + latency explodes
    expect(m.bottlenecks).toContain('app');
    expect(m.latencyP95).toBeGreaterThan(500);
  });

  it('adding replicas raises throughput and lowers bottleneck risk', () => {
    const single: Topology = {
      nodes: [n('lb', 'lb-l7-nginx'), n('app', 'app-node', 1), n('db', 'db-postgres')],
      edges: [e('e1', 'lb', 'app'), e('e2', 'app', 'db')],
    };
    const scaled: Topology = {
      nodes: [n('lb', 'lb-l7-nginx'), n('app', 'app-node', 4), n('db', 'db-postgres')],
      edges: [e('e1', 'lb', 'app'), e('e2', 'app', 'db')],
    };
    const m1 = simulate(single, { rps: 10_000, readRatio: 0.9 });
    const m4 = simulate(scaled, { rps: 10_000, readRatio: 0.9 });
    expect(m4.maxThroughput).toBeGreaterThan(m1.maxThroughput);
    expect(m4.bottlenecks.length).toBeLessThanOrEqual(m1.bottlenecks.length);
    // more replicas cost more
    expect(m4.costPerMonth).toBeGreaterThan(m1.costPerMonth);
  });

  it('cache short-circuits reads so DB sees far less traffic', () => {
    const noCache: Topology = {
      nodes: [n('lb', 'lb-l7-nginx'), n('app', 'app-node'), n('db', 'db-postgres')],
      edges: [e('e1', 'lb', 'app'), e('e2', 'app', 'db')],
    };
    const withCache: Topology = {
      nodes: [
        n('lb', 'lb-l7-nginx'),
        n('app', 'app-node'),
        n('cache', 'redis'),
        n('db', 'db-postgres'),
      ],
      edges: [e('e1', 'lb', 'app'), e('e2', 'app', 'cache'), e('e3', 'cache', 'db')],
    };
    const target = { rps: 8_000, readRatio: 0.95 };
    const a = simulate(noCache, target);
    const b = simulate(withCache, target);
    // With cache hit ratio 0.85, DB load drops; latency should be lower (B1).
    expect(b.latencyP95).toBeLessThanOrEqual(a.latencyP95);
  });
});

// ---- B1–B6 regressions: the model must reward correct intuitions ----
describe('cache & CDN fidelity', () => {
  it('a cache (inline) measurably lowers p95 latency vs no cache', () => {
    const noCache: Topology = {
      nodes: [n('lb', 'lb-l7-nginx'), n('app', 'app-node'), n('db', 'db-postgres')],
      edges: [e('e1', 'lb', 'app'), e('e2', 'app', 'db')],
    };
    const inline: Topology = {
      nodes: [n('lb', 'lb-l7-nginx'), n('app', 'app-node'), n('cache', 'redis'), n('db', 'db-postgres')],
      edges: [e('e1', 'lb', 'app'), e('e2', 'app', 'cache'), e('e3', 'cache', 'db')],
    };
    const t = { rps: 5_000, readRatio: 0.95 };
    expect(simulate(inline, t).latencyP95).toBeLessThan(simulate(noCache, t).latencyP95);
  });

  it('a cache wired as a side-branch (cache-aside) works just as well as inline (B2)', () => {
    const inline: Topology = {
      nodes: [n('app', 'app-node'), n('cache', 'redis'), n('db', 'db-postgres')],
      edges: [e('e1', 'app', 'cache'), e('e2', 'cache', 'db')],
    };
    const aside: Topology = {
      nodes: [n('app', 'app-node'), n('cache', 'redis'), n('db', 'db-postgres')],
      edges: [e('e1', 'app', 'cache'), e('e2', 'app', 'db')],
    };
    const t = { rps: 5_000, readRatio: 0.95 };
    expect(simulate(aside, t).latencyP95).toBeCloseTo(simulate(inline, t).latencyP95, 0);
  });

  it('adding a cache does NOT lower availability (B3) — it is non-critical', () => {
    const base: Topology = {
      nodes: [n('lb', 'lb-l7-nginx'), n('app', 'app-node'), n('db', 'db-postgres')],
      edges: [e('e1', 'lb', 'app'), e('e2', 'app', 'db')],
    };
    const withCache: Topology = {
      nodes: [n('lb', 'lb-l7-nginx'), n('app', 'app-node'), n('cache', 'redis'), n('db', 'db-postgres')],
      edges: [e('e1', 'lb', 'app'), e('e2', 'app', 'cache'), e('e3', 'cache', 'db')],
    };
    const t = { rps: 1_000, readRatio: 0.9 };
    expect(simulate(withCache, t).availability).toBeGreaterThanOrEqual(simulate(base, t).availability);
  });

  it('a cache removes the DB as the throughput bottleneck (B4)', () => {
    // 10k rps, 97% reads. With 3 app replicas (15k cap) the DB is the bottleneck
    // at 10k. Adding a 0.85 cache lifts DB headroom so throughput follows the app.
    const noCache: Topology = {
      nodes: [n('app', 'app-node', 3), n('db', 'db-postgres')],
      edges: [e('e1', 'app', 'db')],
    };
    const withCache: Topology = {
      nodes: [n('app', 'app-node', 3), n('cache', 'redis'), n('db', 'db-postgres')],
      edges: [e('e1', 'app', 'cache'), e('e2', 'cache', 'db')],
    };
    const t = { rps: 10_000, readRatio: 0.97 };
    expect(simulate(noCache, t).maxThroughput).toBeLessThanOrEqual(10_000);
    expect(simulate(withCache, t).maxThroughput).toBeGreaterThan(simulate(noCache, t).maxThroughput);
  });

  it('a CDN offloads the app tier (B6) — fewer app replicas needed', () => {
    const t = { rps: 25_000, readRatio: 0.98 };
    const noCdn: Topology = {
      nodes: [n('lb', 'lb-l7-nginx'), n('app', 'app-node', 1), n('db', 'db-mongo')],
      edges: [e('e1', 'lb', 'app'), e('e2', 'app', 'db')],
    };
    const withCdn: Topology = {
      nodes: [n('cdn', 'cdn-cloudflare'), n('lb', 'lb-l7-nginx'), n('app', 'app-node', 1), n('db', 'db-mongo')],
      edges: [e('e1', 'cdn', 'lb'), e('e2', 'lb', 'app'), e('e3', 'app', 'db')],
    };
    // Without the CDN, one 5k-capacity app drowns under ~24.5k rps of reads.
    expect(simulate(noCdn, t).maxThroughput).toBeLessThan(25_000);
    // The CDN absorbs 90% of reads, so the same single app now sustains the load.
    expect(simulate(withCdn, t).maxThroughput).toBeGreaterThanOrEqual(25_000);
  });
});

describe('availability helpers', () => {
  it('replicas improve effective availability (parallel redundancy)', () => {
    const single = effectiveAvailability(
      { id: 'x', componentId: 'app-node', replicas: 1 },
      { availability: 0.9 } as never,
    );
    const triple = effectiveAvailability(
      { id: 'x', componentId: 'app-node', replicas: 3 },
      { availability: 0.9 } as never,
    );
    expect(triple).toBeGreaterThan(single);
    // 1 - (1-0.9)^3 = 1 - 0.001 = 0.999
    expect(triple).toBeCloseTo(0.999, 3);
  });

  it('describeAvailability counts the nines', () => {
    expect(describeAvailability(0.9999)).toContain('four 9s');
    expect(describeAvailability(0.99999)).toContain('five 9s');
  });
});
