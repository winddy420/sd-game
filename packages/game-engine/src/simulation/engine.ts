/**
 * Simulation Engine
 *
 * A deliberately simplified model that turns a player's drag-and-drop topology
 * into meaningful metrics: latency (p95), monthly cost, availability, max
 * throughput, and bottleneck nodes. It does NOT run real infrastructure — it
 * computes outcomes from component properties (see design doc §5).
 *
 * Model summary:
 *  - A request flows from an ENTRY node (cdn / loadBalancer / gateway / appServer)
 *    toward a TERMINAL data node (db / objectStorage). The CRITICAL PATH is the
 *    longest such path; the slowest (miss) request determines p95.
 *  - COST = Σ (component.costPerMonth × replicas) over all placed nodes.
 *  - AVAILABILITY = product of per-node effective availability along the critical
 *    path, EXCLUDING caches. A cache is a non-critical dependency: when it is
 *    down, reads fall through to the DB (a miss), so it must never lower the
 *    path's availability. Replicas add redundancy: 1 − (1 − a)^replicas.
 *  - CACHE/CDN short-circuit reads. Any cache-like node REACHABLE from the entry
 *    (whether wired inline app→cache→db or as a side-branch app→{cache,db})
 *    contributes its hit ratio. A CDN also offloads the app tier; a Redis cache
 *    offloads the DB. Demand reaching each tier:
 *       app  = writes + reads × (1 − cdnHit)
 *       db   = writes + reads × (1 − aggHit)   where aggHit combines cdn + cache
 *  - THROUGHPUT = the most rps the system can sustain before any node saturates,
 *    accounting for the per-tier demand above (a cache removes the DB as the
 *    bottleneck — capacity is compared against demand, not raw rps).
 *  - LATENCY p95 blends the miss path (full) against hits served at the cache:
 *       p95 = missFraction × latencyFull + hitFraction × serveLatency
 *    so adding a working cache/CDN measurably lowers latency.
 *  - QUEUING: when utilization (demand / capacity) exceeds ~70%, latency climbs;
 *    over 100% the system is saturated and latency explodes.
 */

import type {
  ComponentDef,
  ComponentType,
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
/** Cache-like nodes contribute a read hit ratio (CDN at the edge, Redis behind app). */
const CACHE_TYPES = new Set(['cache', 'cdn']);
/** A Redis-style cache is a non-critical dependency — excluded from availability. */
const NON_CRITICAL_TYPES = new Set(['cache']);

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

/** Node ids reachable from any entry, following directed edges. A component is
 *  only "wired in" if it is reachable — floating nodes don't count (B5). */
export function reachableFromEntries(
  nodes: Map<string, ResolvedNode>,
  adj: Map<string, string[]>,
): Set<string> {
  const entries = [...nodes.values()].filter((r) => ENTRY_TYPES.has(r.def.type));
  const starts = entries.length ? entries : [...nodes.values()];
  const seen = new Set<string>();
  const stack = starts.map((r) => r.node.id);
  for (const s of stack) seen.add(s);
  while (stack.length) {
    const id = stack.pop()!;
    for (const next of adj.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

/** Component types that are actually wired into the flow. A type counts if one
 *  of its nodes is reachable from an entry AND either has an incoming edge (e.g.
 *  a queue wired app→queue) or sits on a path that reaches a terminal (the real
 *  request flow). This closes a loophole where a required ENTRY-type component
 *  (cdn/lb/gateway) placed as a dead-end sidebranch satisfied the requirement
 *  without ever carrying traffic. */
export function wiredComponentTypes(topology: Topology): Set<ComponentType> {
  const { nodes } = resolve(topology);
  const adj = buildAdjacency(nodes, topology);
  const reachable = reachableFromEntries(nodes, adj);

  const hasIncoming = new Set<string>();
  for (const [, neighbors] of adj) for (const tgt of neighbors) hasIncoming.add(tgt);

  const paths = findCriticalPaths(nodes, adj);
  const onTerminalPath = new Set<string>();
  for (const path of paths) {
    const last = nodes.get(path[path.length - 1]!);
    if (last && TERMINAL_TYPES.has(last.def.type)) {
      for (const id of path) onTerminalPath.add(id);
    }
  }

  const types = new Set<ComponentType>();
  for (const id of reachable) {
    const r = nodes.get(id);
    if (!r) continue;
    if (hasIncoming.has(id) || onTerminalPath.has(id)) types.add(r.def.type);
  }
  return types;
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

/** Demand multiplier on a node's raw capacity, given CDN/cache offload.
 *  edge-tier nodes see all traffic; the app is offloaded by a CDN; the DB by the
 *  combined cache+CDN hit ratio. */
function demandCoeff(
  def: ComponentDef,
  readRatio: number,
  cdnHit: number,
  aggHit: number,
): number {
  if (TERMINAL_TYPES.has(def.type)) {
    return (1 - readRatio) + readRatio * (1 - aggHit);
  }
  if (def.type === 'appServer' || def.type === 'cache') {
    return (1 - readRatio) + readRatio * (1 - cdnHit);
  }
  return 1; // edge / queue / pass-through
}

/** Shortest latency from any entry to each reachable node (Bellman-Ford over
 *  tiny graphs). Used to find where a cache "serves" a hit. */
function serveDistances(
  nodes: Map<string, ResolvedNode>,
  adj: Map<string, string[]>,
  demandRps: (def: ComponentDef) => number,
): Map<string, number> {
  const dist = new Map<string, number>();
  const entries = [...nodes.values()].filter((r) => ENTRY_TYPES.has(r.def.type));
  const starts = entries.length ? entries : [...nodes.values()];
  for (const r of starts) dist.set(r.node.id, nodeLatency(r.node, r.def, demandRps(r.def)));
  // Relax up to |V| times.
  for (let i = 0; i < nodes.size; i++) {
    for (const [src, neighbors] of adj) {
      const ds = dist.get(src);
      if (ds == null) continue;
      for (const tgt of neighbors) {
        const r = nodes.get(tgt)!;
        const nd = ds + nodeLatency(r.node, r.def, demandRps(r.def));
        if (nd < (dist.get(tgt) ?? Infinity)) dist.set(tgt, nd);
      }
    }
  }
  return dist;
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
  const reachable = reachableFromEntries(nodes, adj);

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

  // ---- Active caches: cache-like nodes REACHABLE from the entry (inline or
  //      side-branch). A floating cache (no edges) contributes nothing. ----
  const readRatio = traffic.readRatio;
  let cdnHit = 0;
  let cacheHit = 0;
  for (const r of nodes.values()) {
    if (!reachable.has(r.node.id)) continue;
    if (!CACHE_TYPES.has(r.def.type)) continue;
    const h = r.def.props?.cacheHitRatio ?? 0.85;
    if (r.def.type === 'cdn') cdnHit = 1 - (1 - cdnHit) * (1 - h);
    else cacheHit = 1 - (1 - cacheHit) * (1 - h);
  }
  const aggHit = 1 - (1 - cdnHit) * (1 - cacheHit);

  const demandRps = (def: ComponentDef) =>
    traffic.rps * demandCoeff(def, readRatio, cdnHit, aggHit);

  // ---- Latency p95: blend the full (miss) path against hits served at a cache ----
  let latencyFull = 0;
  for (const id of critical) {
    const { node, def } = nodes.get(id)!;
    latencyFull += nodeLatency(node, def, demandRps(def));
  }
  // Where does a hit get served? Earliest reachable cache-like node.
  const serve = serveDistances(nodes, adj, demandRps);
  let serveLatency = latencyFull;
  for (const r of nodes.values()) {
    if (reachable.has(r.node.id) && CACHE_TYPES.has(r.def.type)) {
      const d = serve.get(r.node.id);
      if (d != null && d < serveLatency) serveLatency = d;
    }
  }
  const hitFraction = readRatio * aggHit; // fraction of all requests served short
  let latencyP95 = latencyFull * (1 - hitFraction) + serveLatency * hitFraction;
  if (!connected) latencyP95 *= 3; // disconnected = retry storms / timeouts

  // ---- Availability: product along the path, EXCLUDING non-critical caches ----
  let availability = 1;
  for (const id of critical) {
    const { node, def } = nodes.get(id)!;
    if (NON_CRITICAL_TYPES.has(def.type)) continue; // cache down → fall through
    availability *= effectiveAvailability(node, def);
  }

  // ---- Throughput: weakest link, comparing capacity against per-tier demand ----
  const bottlenecks: string[] = [];
  let maxSustainable = Infinity;
  for (const id of critical) {
    const { node, def } = nodes.get(id)!;
    const coeff = demandCoeff(def, readRatio, cdnHit, aggHit);
    const cap = effectiveCapacity(node, def);
    const sustainable = coeff > 0 ? cap / coeff : cap; // rps this node can sustain
    if (sustainable < maxSustainable) {
      maxSustainable = sustainable;
      bottlenecks.length = 0;
      bottlenecks.push(id);
    } else if (sustainable === maxSustainable) {
      bottlenecks.push(id);
    }
  }
  const maxThroughput = Number.isFinite(maxSustainable) ? maxSustainable : 0;

  // Flag nodes over 90% utilization as bottlenecks too (visual red).
  for (const id of critical) {
    const { node, def } = nodes.get(id)!;
    if (demandRps(def) / effectiveCapacity(node, def) >= 0.9 && !bottlenecks.includes(id)) {
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

/** Structured availability for localised display: { pct: "99.99", nines: 4 }. */
export interface AvailabilityParts {
  pct: string;
  nines: number;
}

/** Numeric breakdown of an availability fraction, for localised UI rendering. */
export function availabilityParts(a: number): AvailabilityParts {
  // 3 decimals avoids rounding a borderline value up across a "nine" boundary
  // (e.g. 0.999887 → "99.989% (three 9s)", not "99.99% (three 9s)").
  const pct = (a * 100).toFixed(3).replace(/\.?0+$/, '');
  return { pct, nines: countNines(a) };
}

/** Human-friendly availability string, e.g. 0.9999 → "99.99% (four 9s)". */
export function describeAvailability(a: number): string {
  const { pct, nines } = availabilityParts(a);
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
