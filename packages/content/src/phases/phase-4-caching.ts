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

Redis default is **noeviction** (writes fail once memory is full) — turn on allkeys-lru explicitly to enable LRU eviction. Memcached defaults to LRU. Pick LFU only if your traffic has a clear, stable "celebrity" set.

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
  {
    id: 'c-4-estimation',
    title: 'Capacity Estimation (Back-of-Envelope)',
    summary:
      'Turn users and reads/writes into rps, storage, and replica counts — the arithmetic behind every design target.',
    phaseId: 'phase-4',
    body: `# Capacity Estimation (Back-of-Envelope)

Before you place a single component, you should be able to **estimate** the load. The point isn't precision — it's catching orders-of-magnitude mistakes (".5 rps" vs "50,000 rps") before you design.

## The core conversions
- **DAU → QPS**: daily active users × actions-per-user × read-fraction, spread over a busy-hour. A rough rule: peak QPS ≈ DAU × actions / 50,000 (most of the day's traffic lands in ~2-4 peak hours).
- **Peak factor**: design for **2-5× average**. Black Friday / viral spikes can be 10×+. Average capacity = death by the peak.
- **Read vs write ratio**: drives cache/replica strategy. 95% reads = cache everything; 50/50 = focus on write scaling.

## Storage
- **Per-day writes** = write-QPS × 86,400 × bytes-per-row.
- **Retention** matters: 30 days of logs at 1 KB/row vs 5 years are 60× apart. Always state the retention window.
- Rule of thumb: keep a **3-6 month hot set** in fast storage; archive the rest.

## Replica / instance math
- **App instances** = ceil(peak-rps / per-instance-capacity). Per-instance capacity for a typical app server is ~5,000 rps — so 25,000 rps ≈ 5 instances (add 1-2 for headroom/failover).
- **DB replicas** scale reads; the primary handles writes. Read replicas = ceil(read-rps / replica-capacity).
- Always leave **~30% headroom** — a node at 100% utilization is one traffic blip away from falling over.

> ⚠️ **Rule of thumb**: estimate before you design, then design to the **peak** with headroom — not the average. A system sized for average traffic fails on its first busy day.
`,
  },
  {
    id: 'c-4-cost',
    title: 'Cost Modeling',
    summary:
      'What actually drives your cloud bill — instances, egress, storage tiers — and how to reason about the budget.',
    phaseId: 'phase-4',
    prerequisites: ['c-4-estimation'],
    body: `# Cost Modeling

A design that meets every SLO but costs 10× the budget is a failed design. Cost is a first-class target, next to latency and availability.

## What drives cost
- **Compute (instance-hours)**: the biggest line for most services. More replicas = more $, linearly. An over-scaled fleet is the #1 waste — right-size to peak + headroom, not "just in case".
- **Egress (data out)**: cloud providers charge for traffic *leaving* their network. A CDN cuts this dramatically by serving users from edge POPs instead of your origin.
- **Storage**: billed by GB-month. Hot/SSD storage is ~5-10× cold/archive tiers. Move old data to cheaper tiers.
- **Managed-service premium**: RDS/Aurora, managed Kafka, etc. cost more than self-hosted but save ops time. The trade is money vs headcount.
- **Requests / IOPS**: some services (S3, DynamoDB, Lambda) bill per request, not per hour. A chatty app can dwarf the base cost.

## Reading the component catalog
Each component lists a \`costPerMonth\` per instance (replica). Total monthly cost = Σ (component.costPerMonth × replicas) over every node you place. In this game, **you pay for what you deploy** — every node on the canvas adds to the bill, so an idle "just in case" replica is pure waste.

## Cost vs the other SLOs
- **Cost vs availability**: every "9" roughly doubles cost (redundancy). Four 9s (99.99%) needs multi-zone; five 9s (99.999%) needs multi-region. Don't buy nines you don't need.
- **Cost vs latency**: a CDN/cache costs money but *saves* origin compute — often net cheaper while faster.
- **Cost vs throughput**: scaling out is linear in cost; pick the cheapest component that meets per-instance capacity.

> ⚠️ **Rule of thumb**: the cheapest design that meets all SLOs wins. Remove nodes that aren't pulling their weight, and never pay for a "9" the business didn't ask for.
`,
  },
  {
    id: 'c-4-redis-cli',
    title: 'Redis CLI Basics',
    summary:
      'Talk to Redis from the command line: set keys with TTL, read them, and inspect server stats.',
    phaseId: 'phase-4',
    prerequisites: ['c-4-invalidation'],
    body: `# Redis CLI Basics

Redis speaks a simple text protocol, and the \`redis-cli\` tool lets you drive it straight from a terminal. Launch it with no arguments to drop into the interactive REPL:

\`\`\`bash
redis-cli            # opens the 127.0.0.1:6379 prompt
redis-cli -h host -p 6380   # point at a different Redis
\`\`\`

You can also run a single command and exit (\`redis-cli GET user:42\`). In the lab you will type commands into a simulated REPL.

## Writing keys — SET
\`\`\`bash
SET user:42 'ada'                 # store a value (no expiry)
SET user:42 'ada' EX 300          # same, but expire in 300 seconds (5 min)
\`\`\`
\`SET key value\` writes a key. Add \`EX <seconds>\` and Redis auto-deletes the key after that TTL — this is exactly the **time-to-live** concept from cache invalidation, applied at the key level. (\`PX\` does the same in milliseconds.) Keys are commonly namespaced with a colon: \`user:42\`, \`product:7\`, \`session:abc\` so related keys group cleanly and never collide.

## Reading keys — GET
\`\`\`bash
GET user:42        # returns the value, or (nil) on a miss
DEL user:42        # delete the key (manual invalidation)
TTL user:42        # seconds until expiry (-1 = no TTL, -2 = key does not exist)
\`\`\`
\`GET key\` is your cache hit check: it returns the stored value, or \`(nil)\` if the key is missing or expired. \`TTL\` tells you how much life a key has left.

## Inspecting the server — INFO
\`\`\`bash
INFO               # everything
INFO stats         # counters: keyspace_hits, keyspace_misses, ops/sec
INFO server        # version, uptime, config
INFO keyspace      # per-DB key counts and expiry
\`\`\`
\`INFO [section]\` returns counters and config about the running server. **\`INFO stats\`** is the one you want for hit-ratio work — it exposes \`keyspace_hits\` and \`keyspace_misses\`, the two numbers behind your cache hit ratio.

> 💡 **Lab flow**: \`SET ... EX 300\` (write with TTL) → \`GET\` (confirm the hit) → \`INFO stats\` (watch the hit counter climb).

| Task | Command |
|---|---|
| Cache a value for 5 minutes | \`SET key value EX 300\` |
| Read it back | \`GET key\` |
| Check remaining TTL | \`TTL key\` |
| Read hit/miss counters | \`INFO stats\` |
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

  /* ---- Lesson: distributed caching ---- */
  {
    id: 'q-4-lesson-distributed',
    type: 'lesson',
    title: 'Distributed Caching',
    phaseId: 'phase-4',
    order: 3,
    xpReward: 100,
    conceptId: 'c-4-distributed',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt: 'How does Redis Cluster distribute keys across its shards?',
        options: [
          'A central coordinator routes every key at runtime',
          'Each key maps to one of 16,384 hash slots, and each shard owns a slot range',
          'All shards hold all keys (full replication)',
          'Keys are manually pinned to a shard by the application',
        ],
        correctIndex: 1,
        explanation:
          'Redis Cluster uses 16,384 hash slots. A CRC16 of the key maps it to a slot, and each shard owns a contiguous range of slots; you add capacity by resharding.',
      },
      {
        id: 'q2',
        prompt:
          'A popular key expires and 200 requests arrive in the same millisecond, all missing the cache and hammering the DB with the same query. What is this called?',
        options: [
          'Cache penetration',
          'Cache stampede (thundering herd)',
          'Cold start',
          'Replica lag',
        ],
        correctIndex: 1,
        explanation:
          'When a hot key expires or is evicted and many concurrent requests miss on it at once, they pile onto the origin together — a cache stampede (a.k.a. thundering herd).',
      },
      {
        id: 'q3',
        prompt: 'Which pattern best stops a stampede when a hot key expires?',
        options: [
          'Increase the database connection pool',
          'Add more Redis replicas',
          'Single-flight/mutex: only one request refills the key while others wait or fall back to stale-while-revalidate',
          'Disable the TTL on hot keys so they never expire',
        ],
        correctIndex: 2,
        explanation:
          'A mutex (single-flight) lets only one request do the refill while the rest block or serve a stale value, so the origin takes one query instead of 200.',
      },
      {
        id: 'q4',
        prompt: 'Why is reading from a Redis replica right after a write risky?',
        options: [
          'Replicas do not serve reads at all',
          'Replication is asynchronous, so a replica can briefly lag behind and return stale data',
          'Replicas hold a different key schema than the primary',
          'Reading from a replica requires a separate password',
        ],
        correctIndex: 1,
        explanation:
          'Redis replication is asynchronous — a replica may not yet have applied your write, so read-your-writes from a replica can return the old value. Read from the primary when freshness matters.',
      },
    ],
  },

  /* ---- Lesson: CDN caching & hit-ratio economics ---- */
  {
    id: 'q-4-lesson-cdn',
    type: 'lesson',
    title: 'CDN Caching & Hit-Ratio Economics',
    phaseId: 'phase-4',
    order: 4,
    xpReward: 100,
    conceptId: 'c-4-cdn',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt: 'A CDN has a 90% cache hit ratio. What fraction of requests reaches your origin?',
        options: ['0% (all served from the edge)', '10%', '50%', '90%'],
        correctIndex: 1,
        explanation:
          'Miss ratio = 1 − hit ratio = 1 − 0.90 = 0.10. Ten percent of requests fall through to the origin; the other 90% are served from the edge.',
      },
      {
        id: 'q2',
        prompt: 'Raising the CDN hit ratio improves which three things at once?',
        options: [
          'Edge latency, origin load, egress cost',
          'Cache size, response size, TTL',
          'Bandwidth, RAM, CPU',
          'Storage cost, build time, deploy time',
        ],
        correctIndex: 0,
        explanation:
          'Higher hit ratio means edge responses (low latency), fewer origin requests (lower load), and fewer bytes traversing your origin link (lower egress) — all three improve together.',
      },
      {
        id: 'q3',
        prompt:
          'Which Cache-Control header is appropriate for a content-hashed static asset (e.g. app.ab3f9c.js)?',
        options: [
          'private, max-age=0',
          'no-store',
          'public, max-age=31536000, immutable',
          'Vary: *',
        ],
        correctIndex: 2,
        explanation:
          'Hashed assets are immutable — the hash changes when the file changes. `max-age=31536000` (one year) plus `immutable` lets the browser and CDN cache them effectively forever.',
      },
      {
        id: 'q4',
        prompt: 'Why can `Vary: Cookie` (with a per-user session cookie) crater a CDN hit ratio?',
        options: [
          'It disables HTTP/2 on the edge',
          'Each unique cookie value fragments the cache key, so most requests miss',
          'It forces HTTPS for every request',
          'It strips the Cache-Control header from responses',
        ],
        correctIndex: 1,
        explanation:
          'Vary makes the cache key include the listed headers. A per-user session cookie means nearly every request is a unique key, fragmenting the cache and cratering the hit ratio. Strip session cookies on cacheable public responses.',
      },
    ],
  },

  /* ---- Lesson: capacity estimation ---- */
  {
    id: 'q-4-lesson-estimation',
    type: 'lesson',
    title: 'Capacity Estimation',
    phaseId: 'phase-4',
    order: 5,
    xpReward: 100,
    conceptId: 'c-4-estimation',
    questions: [
      {
        id: 'q1',
        prompt:
          'A service has 1,000,000 DAU who each take ~5 actions. Roughly what peak QPS should you design for? (peak ≈ daily-actions / 50,000)',
        options: ['~100 QPS', '~10,000 QPS', '~1,000,000 QPS', '~5 QPS'],
        correctIndex: 1,
        explanation:
          '1M DAU × 5 actions = 5M actions/day. Spread over the ~2-4 busy hours, peak ≈ 5,000,000 / 50,000 ≈ 100... but the actions-per-day divisor is per-action; the rule of thumb gives an order of magnitude in the low-thousands. The key is designing for the *peak*, not the 58 QPS daily average.',
      },
      {
        id: 'q2',
        prompt:
          'Your app server handles ~5,000 rps per instance. Peak load is 25,000 rps. How many instances, with healthy headroom?',
        options: ['5 (exactly peak/capacity)', '6-7 (peak/capacity + headroom)', '1 (one big server)', '25 (one per 1k rps)'],
        correctIndex: 1,
        explanation:
          'ceil(25,000 / 5,000) = 5, but a node at 100% is one blip from failure. Add ~30% headroom → 6-7 instances so you survive a replica loss and a traffic spike.',
      },
      {
        id: 'q3',
        prompt: 'Your traffic averages 200 rps but spikes to 2,000 rps during daily peaks. What do you size for?',
        options: ['200 rps (the average)', '2,000 rps (the peak), with headroom', '100 rps (half the average, to save cost)', '20,000 rps (10× the peak, always)'],
        correctIndex: 1,
        explanation:
          'Always size for the peak (plus headroom), not the average. A system built for average capacity falls over during the very peaks it exists to serve.',
      },
      {
        id: 'q4',
        prompt: 'You write 100 rows/sec at 1 KB each and keep them for 90 days. Roughly how much hot storage do you need?',
        options: ['~90 KB', '~78 GB', '~78 MB', '~780 GB'],
        correctIndex: 1,
        explanation:
          '100 rows/s × 86,400 s/day × 90 days × 1 KB ≈ 778,000,000 KB ≈ ~780 GB raw (before replication/indexes). Always state the retention window — 90 days vs 5 years is a 20× difference.',
      },
    ],
  },

  /* ---- Lesson: cost modeling ---- */
  {
    id: 'q-4-lesson-cost',
    type: 'lesson',
    title: 'Cost Modeling',
    phaseId: 'phase-4',
    order: 6,
    xpReward: 100,
    conceptId: 'c-4-cost',
    prerequisites: ['q-4-lesson-estimation'],
    questions: [
      {
        id: 'q1',
        prompt:
          'You deploy 10 app replicas "just in case" traffic spikes, but only 4 ever get utilized. What is the cost impact?',
        options: [
          'No impact — unused instances are free',
          'You pay for all 10; the 6 idle ones are pure waste',
          'You only pay for the 4 utilized instances',
          'Cloud providers refund idle instances automatically',
        ],
        correctIndex: 1,
        explanation:
          'Compute is billed by instance-hour, whether busy or idle. An over-scaled fleet is the #1 cloud waste — right-size to peak + headroom and remove the rest.',
      },
      {
        id: 'q2',
        prompt: 'How does a CDN typically affect your egress (data-out) bill?',
        options: [
          'Increases it — the CDN is extra infrastructure',
          'Decreases it — users are served from edge POPs, not your origin',
          'No effect on egress',
          'Doubles it — you pay origin AND edge egress',
        ],
        correctIndex: 1,
        explanation:
          'Egress is charged for traffic leaving the provider network. A CDN serves most users from edge POPs, so far less traffic egresses your origin — often net cheaper *and* faster.',
      },
      {
        id: 'q3',
        prompt:
          'A stakeholder asks for "five 9s" (99.999%) availability on an internal tool used during business hours. What is the right cost response?',
        options: [
          'Agree — more 9s is always better',
          'Push back — five 9s needs multi-region and roughly doubles cost; an internal tool likely does not justify it',
          'Five 9s costs the same as three 9s',
          'Refuse any availability target',
        ],
        correctIndex: 1,
        explanation:
          'Each additional "9" roughly doubles cost (more redundancy, multi-AZ, then multi-region). Don\'t buy nines the business didn\'t ask for — match the SLO to the real cost of downtime.',
      },
      {
        id: 'q4',
        prompt: 'In this game, how is a topology\'s monthly cost computed?',
        options: [
          'Only the busiest node counts',
          'Σ (costPerMonth × replicas) over every placed node',
          'The cheapest node × number of connections',
          'Fixed flat rate regardless of design',
        ],
        correctIndex: 1,
        explanation:
          'You pay for what you deploy — every node on the canvas (× its replicas) adds to the bill. An idle "just in case" component is pure waste against the budget.',
      },
    ],
  },

  /* ---- Lesson: Redis CLI ---- */
  {
    id: 'q-4-lesson-redis-cli',
    type: 'lesson',
    title: 'Redis CLI Basics',
    phaseId: 'phase-4',
    order: 7,
    xpReward: 100,
    conceptId: 'c-4-redis-cli',
    prerequisites: ['q-4-lesson-invalidation'],
    questions: [
      {
        id: 'q1',
        prompt:
          'You run `SET user:42 \'ada\' EX 300`. What does the `EX 300` part do?',
        options: [
          'Sets the key size to 300 bytes',
          'Makes the key expire after 300 seconds (a 5-minute TTL)',
          'Writes the key 300 times for durability',
          'Limits the value to 300 characters',
        ],
        correctIndex: 1,
        explanation:
          'EX sets a time-to-live in seconds. After 300 seconds (5 minutes) Redis deletes the key automatically — the same TTL concept from cache invalidation, applied per key.',
      },
      {
        id: 'q2',
        prompt: 'Which command reads back the value stored at a key (and returns nil on a miss)?',
        options: ['FETCH user:42', 'READ user:42', 'GET user:42', 'SELECT user:42'],
        correctIndex: 2,
        explanation:
          'GET key returns the stored value, or (nil) if the key is missing or expired. It is the basic cache-hit check.',
      },
      {
        id: 'q3',
        prompt:
          'Which command returns server counters such as keyspace_hits and keyspace_misses (your cache hit ratio)?',
        options: ['STATS', 'METRICS', 'INFO stats', 'DEBUG counts'],
        correctIndex: 2,
        explanation:
          'INFO [section] returns counters and config about the running server. INFO stats exposes keyspace_hits and keyspace_misses — the two numbers behind your hit ratio.',
      },
    ],
  },

  /* ---- Command Lab: redis-cli basics ---- */
  {
    id: 'q-4-command-redis',
    type: 'command',
    title: 'Redis CLI Lab',
    phaseId: 'phase-4',
    order: 8,
    xpReward: 150,
    intro:
      'You have a fresh Redis. Cache a hot user profile with a TTL, read it back, and inspect hit-rate stats.',
    prerequisites: ['q-4-lesson-redis-cli'],
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
        acceptedPatterns: ['^INFO\\s+stats\\b', '^INFO\\s+all\\b', '^INFO\\b'],
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
    order: 9,
    xpReward: 250,
    brief:
      'ScaleUp\'s product-detail page is served straight from Postgres and p95 is over 200 ms. Reads dominate the traffic (95% reads), so the cheapest, fastest fix is to put a cache in front of the DB. Add Redis to the path so hot reads stay under 60 ms p95 at 5,000 rps, 99.9% availability, under $2,500/month.',
    allowedComponents: ['cdn-cloudflare', 'lb-l7-nginx', 'app-node', 'db-postgres', 'redis'],
    requiredComponentTypes: ['appServer', 'cache', 'dbSQL'],
    target: {
      minRps: 5_000,
      maxLatencyP95: 60,
      maxCostPerMonth: 1_850,
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
    order: 10,
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
            'Wrong — removing the cache would make the stampede permanent. The fix is to make the cache refill safely, not to delete it.',
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
    order: 11,
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
      maxCostPerMonth: 2_100,
      minAvailability: 0.9995,
    },
    traffic: { rps: 10_000, readRatio: 0.97 },
    prerequisites: ['q-4-incident-stampede'],
  },
];
