import type { Concept, Quest } from '../types';

export const PHASE_4_CONCEPTS: Concept[] = [
  {
    id: 'c-4-strategies',
    title: 'Cache Strategies',
    summary:
      'cache-aside, read-through, write-through, write-back — four ways to keep a cache and its source of truth in step.',
    phaseId: 'phase-4',
    body: `# Cache Strategies

A **cache** is a fast, smaller store that sits in front of a slower authoritative store (usually a database). The strategy you pick defines *who reads/writes the cache* and *when* the source of truth is touched.

## cache-aside (lazy loading)
- App talks to **both** cache and DB directly.
- On read: check cache → on miss, read DB, then **write the value back** to the cache.
- On write: update the DB, then **delete** the cache key (let next read repopulate).
- **Best for**: read-heavy workloads where you want simple, explicit control. Most common choice.

## read-through
- App talks **only** to the cache; the cache library synchronously fetches from the DB on a miss.
- **Best for**: read-heavy workloads where you want a single read path and a consistent cache state.

## write-through
- Writes go to cache **and** DB together (cache provider drives it) before returning success.
- Cache is always consistent with the DB, at the cost of higher write latency.
- **Best for**: when reads must always be fresh and you can afford slower writes.

## write-back (write-behind)
- Writes go to the **cache only** and return immediately; the cache flushes to the DB **asynchronously** later.
- Very fast writes, but you accept a window where committed data lives only in memory — a crash can lose it.
- **Best for**: write-heavy workloads that tolerate eventual durability (logs, counters, telemetry).

## When to pick which
| Pattern | Read path | Write latency | Freshness | Use when |
|---|---|---|---|---|
| cache-aside | app fills | low | eventual | general purpose, hot keys |
| read-through | cache fills | low | eventual | uniform read path |
| write-through | cache fills | high | strong | must-not-be-stale reads |
| write-back | cache fills | very low | delayed | write-heavy, loss-tolerant |

> ⚠️ **Rule of thumb**: start with cache-aside + TTL. Move to read-through/write-through only when consistency justifies the latency cost. Reserve write-back for writes you can afford to lose.
`,
  },
  {
    id: 'c-4-invalidation',
    title: 'Cache Invalidation & Eviction',
    summary:
      'TTLs, LRU/LFU eviction policies, and the famous "two hard problems" of computer science.',
    phaseId: 'phase-4',
    prerequisites: ['c-4-strategies'],
    body: `# Cache Invalidation & Eviction

> *"There are only two hard things in Computer Science: cache invalidation and naming things."* — **Phil Karlton** (Netscape)

A cache is only useful while its data is **correct**. Two questions keep it honest: *when* do entries leave, and *what* leaves when space runs out?

## Invalidation — when does data leave?

- **TTL (time-to-live)**: every key gets an expiry. Simple, self-cleaning, eventually consistent. Pick a TTL that bounds staleness to what the business can tolerate.
- **Explicit invalidation**: on write, the app **deletes** the affected cache key so the next read repopulates fresh data. Tighter than TTL but requires the app to know which keys map to which writes.
- **Event-driven invalidation**: writes emit events (CDC, pub/sub) that listeners consume to evict keys. Good for multi-service caches that share data.

> ⚠️ **The trap**: if you *update* the cache instead of deleting it, a race between two writes can leave the cache holding stale data indefinitely. **Delete, don't update** — let the next read repopulate.

## Eviction — what leaves when memory is full?

When the cache hits its memory limit, something has to go. Common policies:

- **LRU (Least Recently Used)**: evict the key unused for the longest time. Good default — assumes recent keys will be reused.
- **LFU (Least Frequently Used)**: evict keys with the fewest accesses. Better for stable hot keys; bad for keys that were hot once.
- **FIFO**: evict oldest insertion regardless of access. Rarely used alone.
- **Random**: evict a random key. Surprisingly competitive under uniform access.

Redis default is **allkeys-lru**. Memcached defaults to LRU. Pick LFU only if your traffic has a clear, stable "celebrity" set.

## The two hard problems, revisited
1. **Cache invalidation** — keeping the cache consistent with the DB without missing a write.
2. **Naming things** — cache keys collide silently. Namespace them (\`user:42\`, \`product:7\`) and version them (\`user:42:v3\`) so a schema change doesn't return stale shapes.
`,
  },
  {
    id: 'c-4-distributed',
    title: 'Distributed Caching',
    summary:
      'Redis cluster, consistency trade-offs, and the cache stampede (thundering herd).',
    phaseId: 'phase-4',
    prerequisites: ['c-4-invalidation'],
    body: `# Distributed Caching

A single Redis node caps out at one machine's memory and CPU. To scale, you go **distributed**.

## Sharding — Redis Cluster
- Keys are split across **N shards** using a hash slot (Redis uses 16,384 slots).
- Each shard owns a range of slots. Add capacity by adding shards and resharding.
- Each shard has a **primary** and **replicas**; writes go to the primary, reads can fan to replicas.
- Trade-off: cross-slot operations (multi-key transactions, Lua) are restricted. Hash tags (\`{user:42}:profile\`, \`{user:42}:cart\`) force related keys onto one shard.

## Replication & failover
- Replicas give you **read scaling** and **HA**: if a primary dies, a replica is promoted.
- Replication is **asynchronous** — a replica can briefly lag behind. Don't read-your-writes from a replica for fresh data.

## The cache stampede (thundering herd)
A popular key **expires** (TTL hit) or is **evicted**. Hundreds of requests for it arrive in the same millisecond:

1. All of them miss the cache.
2. All of them hit the DB with the same query.
3. DB CPU spikes, latency spikes, the cache refills 100× — wasted work.

### Defenses
- **Mutex / single-flight**: only one request fills the key; others block on it.
- **Probabilistic early refresh (XFetch)**: randomize expiry a little so keys don't all die together.
- **Stale-while-revalidate**: serve the expired value while one writer refreshes it in the background.
- **Locking with a fallback**: if the lock can't be acquired, serve the stale value rather than hammering the DB.

## Cold start
A freshly deployed cache is **empty**. A traffic spike on a cold cache looks exactly like a stampede. Warm it deliberately (precompute hot keys, ramp traffic gradually).
`,
  },
  {
    id: 'c-4-cdn',
    title: 'CDN Caching & Hit-Ratio Economics',
    summary:
      'Why cache hit ratio is the single number that drives CDN cost, latency, and origin load.',
    phaseId: 'phase-4',
    prerequisites: ['c-4-distributed'],
    body: `# CDN Caching & Hit-Ratio Economics

A **CDN** is a cache too — just geographically distributed. Every edge location serves cached responses; misses fall through to your **origin**.

## The number that matters: cache hit ratio
\`\`\`
hit ratio = hits / (hits + misses)
\`\`\`
A CDN at **90%** hit ratio serves 9 of every 10 requests from the edge. The remaining 10% reach your origin. Crank it to **99%** and origin traffic falls by another 10×.

## Why hit ratio dominates everything
| Hit ratio | Edge latency | Origin load (vs. no CDN) | Cost shape |
|---|---|---|---|
| 0% | full round trip | 100% | CDN adds cost, no benefit |
| 90% | ~5 ms | 10% | good |
| 99% | ~5 ms | 1% | excellent |
| 99.9% | ~5 ms | 0.1% | premium |

Three things improve at once when the hit ratio climbs:
1. **Latency** drops (edge responses are ~5 ms vs. ~80 ms cross-continent).
2. **Origin load** drops, so you need fewer (cheaper) app/DB servers.
3. **Egress cost** drops — bytes served from the edge don't all traverse your origin link.

## How to drive hit ratio up
- **Long TTLs** on static assets (images, JS, CSS) — they change rarely.
- **Cache-Control** headers are the lever: \`public, max-age=31536000, immutable\` for hashed assets.
- **Cache dynamic responses** when they aren't truly per-user (e.g. a popular product page shared by thousands).
- **Purge on deploy** — when an asset changes, invalidate its key (most CDNs offer an API purge).
- **Vary carefully** — \`Vary: Accept-Encoding\` is fine; \`Vary: Cookie\` on a session cookie can fragment the cache to near-zero hits.

## Rule of thumb
**Everything cacheable should be on the CDN.** Reserve origin traffic for things that are truly dynamic or per-user. Your origin should mostly be serving **cache misses**, not all your traffic.
`,
  },
];

export const PHASE_4_QUESTS: Quest[] = [
  /* ---- Lesson: cache strategies ---- */
  {
    id: 'q-4-lesson-strategies',
    type: 'lesson',
    title: 'Cache Strategies',
    phaseId: 'phase-4',
    order: 1,
    xpReward: 100,
    conceptId: 'c-4-strategies',
    questions: [
      {
        id: 'q1',
        prompt:
          'Your app reads the user profile 100x more than it writes it. Which strategy is the typical default?',
        options: ['write-back', 'cache-aside with TTL', 'write-through', 'no cache'],
        correctIndex: 1,
        explanation:
          'Cache-aside is the most common general-purpose pattern: app fills the cache on a miss and deletes the key on write. Start here.',
      },
      {
        id: 'q2',
        prompt:
          'You are logging analytics events and can tolerate losing the last few seconds on a crash. Which strategy gives the fastest writes?',
        options: ['write-through', 'read-through', 'write-back (write-behind)', 'cache-aside'],
        correctIndex: 2,
        explanation:
          'Write-back writes only to the cache and flushes to the DB asynchronously, so writes return almost instantly — at the cost of eventual durability.',
      },
      {
        id: 'q3',
        prompt:
          'With write-through caching, what is the trade-off compared to cache-aside?',
        options: [
          'Lower write latency, but reads may be stale',
          'Higher write latency, but the cache is always consistent with the DB',
          'It cannot be used with a database',
          'It removes the need for a TTL',
        ],
        correctIndex: 1,
        explanation:
          'Write-through updates both cache and DB before returning, so reads are always fresh — but writes pay the DB latency on every call.',
      },
      {
        id: 'q4',
        prompt: 'On a write, what should cache-aside typically do to the cache key?',
        options: [
          'Update it with the new value',
          'Delete it so the next read repopulates fresh data',
          'Leave it untouched forever',
          'Double its TTL',
        ],
        correctIndex: 1,
        explanation:
          'Deleting avoids the classic race where two concurrent writes leave the cache holding stale data. The next read fills it correctly.',
      },
    ],
  },

  /* ---- Lesson: invalidation + the famous quote ---- */
  {
    id: 'q-4-lesson-invalidation',
    type: 'lesson',
    title: 'Cache Invalidation & Eviction',
    phaseId: 'phase-4',
    order: 2,
    xpReward: 100,
    conceptId: 'c-4-invalidation',
    prerequisites: ['q-4-lesson-strategies'],
    questions: [
      {
        id: 'q1',
        prompt:
          'Which is the famous Phil Karlton quote about the "two hard problems" of computer science?',
        options: [
          'Cache invalidation and naming things',
          'Concurrency and garbage collection',
          'Distributed consensus and time zones',
          'Authentication and authorization',
        ],
        correctIndex: 0,
        explanation:
          '"There are only two hard things in Computer Science: cache invalidation and naming things." It circulates because it keeps being true.',
      },
      {
        id: 'q2',
        prompt:
          'A 4 GB Redis instance is full and a new key must be admitted. The policy is LRU. Which key is evicted?',
        options: [
          'The key accessed longest ago',
          'The key accessed least often overall',
          'The oldest inserted key regardless of access',
          'A random key',
        ],
        correctIndex: 0,
        explanation:
          'LRU = Least Recently Used. It evicts the key that has gone the longest without being accessed, on the assumption it is least likely to be reused.',
      },
      {
        id: 'q3',
        prompt:
          'You want a self-cleaning cache without writing invalidation logic. Which mechanism gives you that?',
        options: ['LFU eviction', 'TTL (expiry)', 'write-through', 'a larger instance'],
        correctIndex: 1,
        explanation:
          'TTL makes each key expire automatically, bounding staleness to the TTL window with no extra app code. Pair it with explicit deletes for tighter freshness.',
      },
      {
        id: 'q4',
        prompt:
          'Why is "delete on write" preferred over "update on write" when invalidating a cache key?',
        options: [
          'Deletes are faster on Redis',
          'Updating risks a race that leaves stale data in the cache indefinitely',
          'Deletes save memory by not storing the new value',
          'There is no difference; either is safe',
        ],
        correctIndex: 1,
        explanation:
          'Two concurrent writes can interleave so the cache ends up with the older value. Deleting forces the next read to repopulate from the source of truth.',
      },
    ],
  },

  /* ---- Command Lab: redis-cli basics ---- */
  {
    id: 'q-4-command-redis',
    type: 'command',
    title: 'Redis CLI Lab',
    phaseId: 'phase-4',
    order: 3,
    xpReward: 150,
    intro:
      'You have a fresh Redis. Cache a hot user profile with a TTL, read it back, and inspect hit-rate stats.',
    prerequisites: ['q-4-lesson-invalidation'],
    steps: [
      {
        prompt:
          'Cache the JSON for user 42 with a 5-minute expiry. Store it under the key "user:42".',
        acceptedPatterns: [
          '^SET\\s+user:42\\s+.+\\s+EX\\s+300\\b',
          '^SET\\s+user:42\\s+.+\\s+EX\\s+300$',
        ],
        sampleAnswer: 'SET user:42 \'{"id":42,"name":"ada"}\' EX 300',
        hint: 'Use `SET key value EX seconds` — EX 300 = 5 minutes.',
      },
      {
        prompt: 'Read the key back to confirm the cache hit.',
        acceptedPatterns: ['^GET\\s+user:42\\b'],
        sampleAnswer: 'GET user:42',
        hint: '`GET key` returns the cached value (or nil on a miss).',
      },
      {
        prompt:
          'Inspect the server stats to confirm the hit counter is climbing (use the command that returns general information, including keyspace_hits).',
        acceptedPatterns: ['^INFO\\s+stats\\b', '^INFO\\s+server\\b', '^INFO\\b'],
        sampleAnswer: 'INFO stats',
        hint:
          '`INFO [section]` returns counters. `INFO stats` includes `keyspace_hits` and `keyspace_misses` — your hit ratio.',
      },
    ],
  },

  /* ---- Architecture: add cache to a slow read path ---- */
  {
    id: 'q-4-arch-addcache',
    type: 'architecture',
    title: 'Add Cache to a Slow Read Path',
    phaseId: 'phase-4',
    order: 4,
    xpReward: 250,
    brief:
      'ScaleUp\'s product-detail page is served straight from Postgres and p95 is over 200 ms. Reads dominate the traffic (95% reads), so the cheapest, fastest fix is to put a cache in front of the DB. Add Redis to the path so hot reads stay under 60 ms p95 at 5,000 rps, 99.9% availability, under $2,500/month.',
    allowedComponents: ['cdn-cloudflare', 'lb-l7-nginx', 'app-node', 'db-postgres', 'redis'],
    requiredComponentTypes: ['appServer', 'cache', 'dbSQL'],
    target: {
      minRps: 5_000,
      maxLatencyP95: 60,
      maxCostPerMonth: 2_500,
      minAvailability: 0.999,
    },
    traffic: { rps: 5_000, readRatio: 0.95 },
    prerequisites: ['q-4-command-redis'],
  },

  /* ---- Incident: cache stampede ---- */
  {
    id: 'q-4-incident-stampede',
    type: 'incident',
    title: 'Incident: Cache Stampede',
    phaseId: 'phase-4',
    order: 5,
    xpReward: 250,
    failureDescription:
      'At 09:00, right after the homepage banner swapped, the homepage\'s "featured product" cache key expired. Database CPU jumped to 100% and p95 latency went from 40 ms to 1,800 ms. The app is up, the cache is up, the DB is up — but it is drowning.',
    symptoms: [
      'A single hot key expired seconds before the spike',
      'Database CPU is saturated by the same SELECT repeated thousands of times',
      'Cache hit ratio collapsed from 95% to ~30%',
      'App servers are mostly blocked waiting on the DB',
    ],
    prerequisites: ['q-4-arch-addcache'],
    steps: [
      [
        {
          id: 'a',
          label: 'Add more app servers to absorb the load',
          isCorrect: false,
          feedback:
            'Wrong — the bottleneck is the DB, not the app. Adding app servers just adds more clients hammering the same query.',
        },
        {
          id: 'b',
          label: 'Restart the database',
          isCorrect: false,
          feedback:
            'Wrong — the DB is healthy; it is just overloaded by identical queries. A restart loses warm caches and makes it worse.',
        },
        {
          id: 'c',
          label:
            'It is a cache stampede: add single-flight/mutex so only one request refills the hot key, and serve stale-while-revalidate',
          isCorrect: true,
          feedback:
            'Correct. When the TTL expired, every concurrent request missed at once and piled onto the DB. Coalesce the refill (only one writer) and serve a stale value while it refreshes to stop the herd.',
        },
        {
          id: 'd',
          label: 'Disable caching so all reads go direct to the DB',
          isCorrect: false,
          feedback:
            'Wrong — removing the cache would make the stampade permanent. The fix is to make the cache refill safely, not to delete it.',
        },
      ],
    ],
  },

  /* ---- Capstone: optimize an API ---- */
  {
    id: 'q-4-capstone',
    type: 'architecture',
    title: 'Capstone: Optimize a Slow API',
    phaseId: 'phase-4',
    order: 6,
    xpReward: 500,
    brief:
      'You are now the lead. The product API runs at p95 = 800 ms because every read hits the database and assets are served from the origin. Reads are 97% of traffic. Drive p95 under 80 ms at 10,000 rps, 99.95% availability, under $3,000/month. You must use an app server, a SQL database, a cache, and a CDN. Hint: serve static/cacheable responses from the CDN edge, cache hot dynamic reads in Redis, and keep the DB for writes and cold misses.',
    allowedComponents: [
      'cdn-cloudflare',
      'lb-l7-nginx',
      'app-node',
      'db-postgres',
      'redis',
    ],
    requiredComponentTypes: ['appServer', 'cache', 'dbSQL', 'cdn'],
    target: {
      minRps: 10_000,
      maxLatencyP95: 80,
      maxCostPerMonth: 3_000,
      minAvailability: 0.9995,
    },
    traffic: { rps: 10_000, readRatio: 0.97 },
    prerequisites: ['q-4-incident-stampede'],
  },
];
