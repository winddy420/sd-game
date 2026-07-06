/**
 * Simulation Engine
 *
 * A deliberately simplified model that turns a player's drag-and-drop topology
 * into meaningful metrics: latency (p95), monthly cost, availability, max
 * throughput, and bottleneck nodes. It does NOT run real infrastructure — it
 * computes outcomes from component properties (see design doc §5).
 *
 * Model summary:
 *  - A request flows from an ENTRY node (cdn / loadBalancer / gateway) toward a
 *    TERMINAL data node (db / objectStorage). The CRITICAL PATH is the longest
 *    such path; its summed latency + queuing delay = p95 latency.
 *  - COST = Σ (component.costPerMonth × replicas) over all placed nodes.
 *  - AVAILABILITY = product of per-node effective availability along the
 *    critical path. Replicas add redundancy: a node's effective availability
 *    is 1 − (1 − a)^replicas (parallel failover).
 *  - THROUGHPUT = min over the critical path of (capacity × replicas); the
 *    node achieving the minimum is the BOTTLENECK.
 *  - CACHE short-circuits reads: a hit stops at the cache; only misses reach
 *    the DB. This lowers DB load and average latency.
 *  - QUEUING: when utilization (traffic / capacity) exceeds ~70%, latency
 *    climbs; over 100% the system is saturated and latency explodes.
 */

import type {
  ComponentDef,
  SimMetrics,
  Topology,
  TopologyNode,
  TrafficProfile,
} from '@sd-game/content';
import { COMPONENT_BY_ID } from '@sd-game/content';

const ENTRY_TYPES = new Set(['cdn', 'loadBalancer', 'gateway', 'appServer']);
/** True data stores — a request path must reach one of these to be "connected".
 *  Caches and CDNs are pass-through hops, NOT terminals. */
const TERMINAL_TYPES = new Set(['dbSQL', 'dbNoSQL', 'objectStorage', 'search']);
const CACHE_TYPES = new Set(['cache', 'cdn']);

/** Effective availability of a node given its replica count (parallel redundancy). */
export function effectiveAvailability(node: TopologyNode, def: ComponentDef): number {
  const a = def.availability;
  const n = Math.max(1, node.replicas);
  return 1 - Math.pow(1 - a, n);
}

/** Effective capacity (rps) of a node given replicas. */
export function effectiveCapacity(node: TopologyNode, def: ComponentDef): number {
  return def.capacity * Math.max(1, node.replicas);
}

/** Per-node latency including a queuing penalty when utilization is high. */
export function nodeLatency(
  node: TopologyNode,
  def: ComponentDef,
  rpsThroughNode: number,
): number {
  const cap = effectiveCapacity(node, def);
  const util = cap > 0 ? rpsThroughNode / cap : 1;
  if (util <= 0.7) return def.baseLatency;
  if (util >= 1) return def.baseLatency * 12; // saturated — latency explodes
  // 0.7 < util < 1: smooth penalty, doubles near the edge
  const penalty = 1 + ((util - 0.7) / 0.3) * 1.0;
  return def.baseLatency * penalty;
}

interface ResolvedNode {
  node: TopologyNode;
  def: ComponentDef;
}

function resolve(topology: Topology): { nodes: Map<string, ResolvedNode>; ok: boolean } {
  const map = new Map<string, ResolvedNode>();
  let ok = true;
  for (const node of topology.nodes) {
    const def = COMPONENT_BY_ID[node.componentId];
    if (!def) {
      ok = false;
      continue;
    }
    map.set(node.id, { node, def });
  }
  return { nodes: map, ok };
}

/** Adjacency list built from edges (only between valid, resolved nodes). */
function buildAdjacency(
  nodes: Map<string, ResolvedNode>,
  topology: Topology,
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const id of nodes.keys()) adj.set(id, []);
  for (const edge of topology.edges) {
    if (nodes.has(edge.source) && nodes.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
    }
  }
  return adj;
}

/** All simple paths from entries to terminals (DFS, bounded depth). */
function findCriticalPaths(
  nodes: Map<string, ResolvedNode>,
  adj: Map<string, string[]>,
): string[][] {
  const entries = [...nodes.values()].filter((r) => ENTRY_TYPES.has(r.def.type));
  const paths: string[][] = [];

  const dfs = (nodeId: string, path: string[], visited: Set<string>) => {
    const resolved = nodes.get(nodeId)!;
    if (TERMINAL_TYPES.has(resolved.def.type)) {
      paths.push([...path]);
      return;
    }
    const neighbors = adj.get(nodeId) ?? [];
    // If a compute/edge node has no outgoing edge but isn't terminal, still
    // record it as a partial path so the player gets feedback ("disconnected").
    if (neighbors.length === 0) {
      paths.push([...path]);
      return;
    }
    for (const next of neighbors) {
      if (visited.has(next)) continue;
      dfs(next, [...path, next], new Set(visited).add(next));
    }
  };

  for (const entry of entries.length ? entries : [...nodes.values()]) {
    dfs(entry.node.id, [entry.node.id], new Set([entry.node.id]));
  }
  return paths;
}

/**
 * Pick the critical path = the path the slowest request takes.
 * We approximate by choosing the path with the highest summed base latency.
 */
function pickCriticalPath(
  paths: string[][],
  nodes: Map<string, ResolvedNode>,
): string[] | null {
  if (paths.length === 0) return null;
  let best = paths[0]!;
  let bestLatency = -1;
  for (const path of paths) {
    const latency = path.reduce((sum, id) => sum + (nodes.get(id)?.def.baseLatency ?? 0), 0);
    if (latency > bestLatency) {
      bestLatency = latency;
      best = path;
    }
  }
  return best;
}

/** Resolve a topology against the catalog. Returns undefined if unresolvable. */
export function simulate(topology: Topology, traffic: TrafficProfile): SimMetrics {
  const { nodes, ok } = resolve(topology);
  if (!ok || nodes.size === 0) {
    return emptyMetrics();
  }

  const adj = buildAdjacency(nodes, topology);
  const paths = findCriticalPaths(nodes, adj);
  const critical = pickCriticalPath(paths, nodes);

  // ---- Connectivity: a real path exists that reaches a terminal data store ----
  const connected =
    critical !== null &&
    critical.length >= 2 &&
    critical.some((id) => TERMINAL_TYPES.has(nodes.get(id)!.def.type));

  // ---- Cost: every placed node counts (you pay for what you deploy) ----
  const costPerMonth = [...nodes.values()].reduce(
    (sum, r) => sum + r.def.costPerMonth * Math.max(1, r.node.replicas),
    0,
  );

  // If disconnected, we can still report cost but metrics are meaningless.
  if (!critical) {
    return { ...emptyMetrics(), costPerMonth, connected: false };
  }

  // ---- Cache short-circuit: what fraction of reads hit a cache on the path? ----
  let hitRatio = 0;
  for (const id of critical) {
    const def = nodes.get(id)!.def;
    if (CACHE_TYPES.has(def.type)) {
      hitRatio = Math.max(hitRatio, def.props?.cacheHitRatio ?? 0.85);
    }
  }
  const reads = traffic.rps * traffic.readRatio;
  const writes = traffic.rps * (1 - traffic.readRatio);
  // Only cache-miss reads + all writes reach the terminal data store.
  const rpsToTerminal = writes + reads * (1 - hitRatio);

  // ---- Latency p95 along the critical path ----
  let latencyP95 = 0;
  for (const id of critical) {
    const { node, def } = nodes.get(id)!;
    // Traffic reaching each node: entries see full rps; downstream nodes see
    // progressively less once a cache has absorbed reads.
    const rpsThroughNode = TERMINAL_TYPES.has(def.type) ? rpsToTerminal : traffic.rps;
    latencyP95 += nodeLatency(node, def, rpsThroughNode);
  }
  if (!connected) latencyP95 *= 3; // disconnected = retry storms / timeouts

  // ---- Availability: product of effective availability along the path ----
  let availability = 1;
  for (const id of critical) {
    const { node, def } = nodes.get(id)!;
    availability *= effectiveAvailability(node, def);
  }

  // ---- Throughput: the weakest link on the path ----
  const bottlenecks: string[] = [];
  let maxThroughput = Infinity;
  for (const id of critical) {
    const { node, def } = nodes.get(id)!;
    const cap = effectiveCapacity(node, def);
    if (cap < maxThroughput) {
      maxThroughput = cap;
      bottlenecks.length = 0;
      bottlenecks.push(id);
    } else if (cap === maxThroughput) {
      bottlenecks.push(id);
    }
  }
  if (!Number.isFinite(maxThroughput)) maxThroughput = 0;

  // Flag nodes over 90% utilization as bottlenecks too (visual red).
  for (const id of critical) {
    const { node, def } = nodes.get(id)!;
    const rpsThrough = TERMINAL_TYPES.has(def.type) ? rpsToTerminal : traffic.rps;
    if (rpsThrough / effectiveCapacity(node, def) >= 0.9 && !bottlenecks.includes(id)) {
      bottlenecks.push(id);
    }
  }

  return {
    latencyP95: Math.round(latencyP95),
    costPerMonth: Math.round(costPerMonth),
    availability,
    maxThroughput: Math.round(maxThroughput),
    bottlenecks,
    connected,
  };
}

function emptyMetrics(): SimMetrics {
  return {
    latencyP95: 0,
    costPerMonth: 0,
    availability: 0,
    maxThroughput: 0,
    bottlenecks: [],
    connected: false,
  };
}

/** Human-friendly availability string, e.g. 0.9999 → "99.99% (four 9s)". */
export function describeAvailability(a: number): string {
  // 3 decimals avoids rounding a borderline value up across a "nine" boundary
  // (e.g. 0.999887 → "99.989% (three 9s)", not "99.99% (three 9s)").
  const pct = (a * 100).toFixed(3).replace(/\.?0+$/, '');
  const nines = countNines(a);
  const word = nines >= 2 && nines < NINE_WORDS.length ? NINE_WORDS[nines] : String(nines);
  return `${pct}%${nines >= 2 ? ` (${word} 9s)` : ''}`;
}

/** Standard "number of nines" = floor(-log10(unavailability)). */
function countNines(a: number): number {
  const downtime = 1 - a;
  if (downtime <= 0) return 6; // capped display
  const n = Math.floor(-Math.log10(downtime) + 1e-9);
  return n >= 2 ? n : 0;
}

const NINE_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'] as const;
