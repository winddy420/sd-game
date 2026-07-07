import type { Concept, Quest } from '../types';

export const PHASE_3_CONCEPTS: Concept[] = [
  {
    id: 'c-3-sql-acid',
    title: 'SQL, ACID & Indexing',
    summary:
      'Relational databases, the ACID guarantees that keep data correct, and how B-tree indexes turn O(n) scans into O(log n) lookups.',
    phaseId: 'phase-3',
    body: `# SQL, ACID & Indexing

A **relational database** (Postgres, MySQL) stores data in **tables** of rows and columns, with a rigid **schema**. Relationships are expressed via **foreign keys** and queried with SQL.

## ACID — the four guarantees that make transactions safe

A **transaction** is a group of operations that must succeed or fail as a unit.

| Letter | Property | Meaning |
|---|---|---|
| **A** | Atomicity | All operations commit, or none do. No half-written state. |
| **C** | Consistency | The DB moves from one valid state to another (constraints enforced). |
| **I** | Isolation | Concurrent transactions behave **as if** they ran one-at-a-time. |
| **D** | Durability | Once committed, the data survives crashes (written to disk / WAL). |

> ⚠️ **Isolation levels** trade correctness for performance. \`READ COMMITTED\` (Postgres default) is fast but allows **non-repeatable reads**. \`SERIALIZABLE\` is safest but slowest. Pick based on how much contention you have.

\`\`\`sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;   -- both updates persist together, or neither does
\`\`\`

## Indexing — why your queries are slow

Without an index, the DB does a **sequential scan**: read every row, check the predicate. That's \`O(n)\` — fine for 1,000 rows, fatal at 100M.

A **B-tree index** is a balanced tree kept sorted on a column. Looking up a row is \`O(log n)\` — roughly **25 comparisons** for a billion rows.

\`\`\`sql
CREATE INDEX idx_users_email ON users(email);

-- Now this is a fast lookup, not a full scan:
SELECT id, name FROM users WHERE email = 'ada@scaleup.dev';
\`\`\`

## When indexes help vs hurt

| Situation | Index helps? |
|---|---|
| \`WHERE email = ?\` (equality on indexed col) | ✅ Huge speedup |
| \`WHERE created_at > NOW() - 1\` (range on indexed col) | ✅ Range scan |
| \`ORDER BY indexed_col LIMIT 10\` | ✅ Avoids sorting |
| \`LIKE '%term'\` (leading wildcard) | ❌ Index unusable |
| Small table (<1k rows) | 🟡 Scan is faster than index lookup |
| Heavy writes (INSERT/UPDATE) | ❌ Every write must update indexes too |

> 💡 **Rule of thumb**: index columns used in \`WHERE\`, \`JOIN\`, and \`ORDER BY\` clauses that have **high selectivity** (many distinct values). Don't index columns you rarely query, and don't over-index a write-heavy table — each index slows inserts.

## EXPLAIN — see what the planner chose

\`\`\`sql
EXPLAIN SELECT * FROM orders WHERE user_id = 42;
\`\`\`
- \`Seq Scan\` → bad, full table scan
- \`Index Scan\` / \`Index Only Scan\` → good, index is being used
- \`Bitmap Heap Scan\` → partial, used when matching many rows

Always \`EXPLAIN\` a slow query **before** guessing at the fix.
`,
  },
  {
    id: 'c-3-nosql',
    title: 'NoSQL Trade-offs',
    summary:
      'When the relational model is the wrong fit: document stores (MongoDB), wide-column stores (Cassandra), and how to choose.',
    phaseId: 'phase-3',
    prerequisites: ['c-3-sql-acid'],
    body: `# NoSQL Trade-offs

"NoSQL" is a broad label for databases that **drop one or more** of the relational/ACID assumptions to gain **scale, flexibility, or throughput** that SQL struggles with.

## The four families

| Family | Example | Shape | Best for |
|---|---|---|---|
| Document | MongoDB | JSON-like docs | Flexible, evolving schemas; nested data |
| Wide-column | Cassandra | Rows partitioned by key, columns vary | Massive write throughput, multi-region |
| Key-value | Redis | \`key → value\` | Caching, sessions, leaderboards |
| Graph | Neo4j | Nodes + edges | Social networks, recommendations |

## Document store (MongoDB) — nested data without JOINs

A document is a self-contained JSON-like object. Related data lives **together** in one document instead of being split across tables.

\`\`\`js
// One user document in MongoDB — no JOIN needed to fetch their addresses
{
  _id: ObjectId("..."),
  name: "Ada Lovelace",
  email: "ada@scaleup.dev",
  addresses: [
    { city: "London", zip: "W1" },
    { city: "San Francisco", zip: "94105" }
  ]
}
\`\`\`

**Pros**: schema can evolve (add a field anytime), reads of a single entity are one disk seek, maps well to objects in code.
**Cons**: no real JOINs (denormalize or do app-side joins), transactions historically weaker (now exist but limited), data duplication if entities are shared.

## Wide-column (Cassandra) — write-heavy at planetary scale

Data is partitioned by a **partition key** and sorted within the partition by **clustering keys**. Designed for **multi-datacenter replication** and **linear write scalability**.

\`\`\`sql
-- Cassandra CQL — looks like SQL, behaves very differently
CREATE TABLE events (
  sensor_id   uuid,
  occurred_at timestamp,
  reading     double,
  PRIMARY KEY ((sensor_id), occurred_at)
);
-- All events for a sensor live in one partition, sorted by time.
\`\`\`

**Pros**: tens of thousands of writes/sec per node, no single primary, survives a datacenter going dark.
**Cons**: **no ad-hoc joins or GROUP BY**, queries must be designed **around** the partition key, last-write-wins means conflict resolution is loose.

## How to pick

| You need... | Pick |
|---|---|
| ACID transactions, complex joins, financial data | **SQL** (Postgres) |
| Flexible schema, mostly reads of one entity, nested data | **Document** (Mongo) |
| Massive write volume, multi-region, simple access patterns | **Wide-column** (Cassandra) |
| Microsecond reads, caching, ephemeral data | **Key-value** (Redis) |

> 🧠 **Heuristic**: start with Postgres. Only move to NoSQL when you can articulate a specific scaling or modeling problem SQL can't solve.
`,
  },
  {
    id: 'c-3-replication-cap',
    title: 'Replication & the CAP Theorem',
    summary:
      'Copying data for durability and read scale, and the fundamental trade-off — consistency, availability, or partition tolerance — you must make when the network fails.',
    phaseId: 'phase-3',
    prerequisites: ['c-3-sql-acid'],
    body: `# Replication & the CAP Theorem

**Replication** means keeping **copies** of your data on multiple nodes. Two reasons:

1. **Durability / availability** — if one node dies, another has the data.
2. **Read scale** — spread reads across replicas to raise throughput.

## Primary/replica (single-leader) replication

- **One primary** accepts **all writes**.
- **N replicas** copy the write-ahead log from the primary (async or sync).
- **Reads** can go to replicas — but they may lag behind.

\`\`\`
client ──write──▶ [ Primary ]
                      │  stream WAL
                      ▼
                 [ Replica 1 ] ◀── read
                 [ Replica 2 ] ◀── read
\`\`\`

**Replica lag** = how far behind the replica is. Async replication can lag by milliseconds to seconds under load. If you read-your-own-write right after a write, you may see **stale** data on a replica.

> ⚠️ **Fix**: route read-after-write to the **primary**, or use **synchronous** replication (at a latency cost).

## The CAP theorem

In a distributed system, when the network **partitions** (a link between nodes fails), you must choose between:

| Property | Meaning |
|---|---|
| **C — Consistency** | Every read returns the latest write (or an error). |
| **A — Availability** | Every request gets a non-error response (may be stale). |
| **P — Partition tolerance** | The system keeps working despite dropped/delayed messages between nodes. |

**You can have at most two of the three.** Since partitions **will** happen on real networks, the real choice is:

- **CP** — refuse requests during a partition, to stay consistent. (e.g. HBase, etcd)
- **AP** — keep answering, accept some staleness. (e.g. Cassandra, DynamoDB)

\`\`\`
        Partition happens — primary can't reach replica
        ┌─────────────────────────────────┐
        │  CP: reject writes (stay C)     │
        │  AP: accept both (stay A)       │
        └─────────────────────────────────┘
\`\`\`

## PACELC — what about when there's no partition?

CAP only covers the failure case. **PACELC** adds the normal case:

> **If Partitioned: A or C. Else (no partition): L or C.**

- Cassandra: **PA/EL** — available under partition, low latency normally, accepting staleness both times.
- Spanner: **PC/EC** — chooses consistency both times, paying higher latency.

## Consistency models (a spectrum)

| Model | Guarantees |
|---|---|
| Strong / linearizable | Reads see latest write, as if a single copy. |
| Eventual | Given no new writes, replicas **eventually** converge. |
| Read-your-writes | A client always sees their own writes. |
| Causal | Preserves causal ordering, but not full linearizability. |

Pick the **weakest model your app can tolerate** — it buys you latency and availability.
`,
  },
  {
    id: 'c-3-sharding',
    title: 'Sharding & Partitioning',
    summary:
      'Splitting a huge dataset across many machines so you can scale horizontally — and the hot-partition trap that breaks naive schemes.',
    phaseId: 'phase-3',
    prerequisites: ['c-3-replication-cap'],
    body: `# Sharding & Partitioning

When a single database can no longer hold (or serve) all your data, you **shard** — split the data into **partitions** spread across multiple nodes. Each node owns a subset.

\`\`\`
            ┌─ Shard 0 (users 0–999)      [ node A ]
all_users ──┤─ Shard 1 (users 1000–1999)  [ node B ]
            └─ Shard 2 (users 2000–2999)  [ node C ]
\`\`\`

**Replication** = copies of the **same** data.
**Sharding** = different data on different nodes.
You often combine them: each shard is itself replicated.

## Partitioning strategies

| Strategy | How it works | Watch out |
|---|---|---|
| **Range** | By a sorted key (date, id range) | Hot spots if keys are skewed (recent data) |
| **Hash** | \`hash(key) mod N\` | Spreads load, but adding a node reshuffles everything |
| **Consistent hashing** | Hash keys & nodes onto a ring | Adding/removing a node only moves a few keys |
| **Directory** | A lookup service maps key → shard | The directory itself is a bottleneck / SPOF |

\`\`\`js
// Hash partitioning — uniform but rigid
shard = hash(userId) % NUM_SHARDS;
\`\`\`

## The hot-partition problem

Bad key choice can funnel most traffic to **one** shard, defeating the point:

| Workload | Bad key | Why |
|---|---|---|
| Twitter-like feed | \`shard = celebrityId % N\` | A celebrity's posts hit one shard; everyone else's idle |
| Logs by day | \`shard = date\` | Today's shard absorbs 100% of writes |
| Counters | \`shard = counterId\` | A single counter (likes, views) can't be updated in parallel |

**Symptoms**: one node at 100% CPU / disk, others idle; latency spikes on hot keys; throughput far below \`nodes × per_node_rps\`.

## Fixes for hot partitions

- **Compound key** — partition by \`(userId, postId)\` not just \`postId\`, so a single celebrity's posts spread out.
- **Pre-splitting / salting** — append a random suffix (\`postId-03\`) to spread writes, then aggregate on read.
- **Time-bucketing** — partition by hour, not by day, so no single shard takes a full day of writes.
- **Counter shards** — for a hot counter, keep N sub-counters (\`likes_0\`, \`likes_1\`, ...) on different shards and sum on read.

## When to shard

Sharding is **expensive** — cross-shard queries, distributed transactions, rebalancing pain. Before sharding:

1. Add a **cache** (Redis) for hot reads.
2. Add **read replicas** to scale reads.
3. Optimize queries and indexes.
4. Archive cold data.

Only shard when **all of the above are exhausted** and a single primary still can't keep up with writes.
`,
  },
];

export const PHASE_3_QUESTS: Quest[] = [
  /* ---- 1. Lesson: SQL & ACID & indexing ---- */
  {
    id: 'q-3-lesson-sql',
    type: 'lesson',
    title: 'SQL, ACID & Indexes',
    phaseId: 'phase-3',
    order: 1,
    xpReward: 100,
    conceptId: 'c-3-sql-acid',
    questions: [
      {
        id: 'q1',
        prompt:
          'A transaction transfers money between two accounts. Mid-transfer the server crashes AFTER the first UPDATE but BEFORE the second. What does ACID guarantee?',
        options: [
          'Both updates are applied anyway — Consistency',
          'Neither update persists — the first is rolled back on recovery (Atomicity)',
          'Only the first update persists (Durability)',
          'The DB keeps the half-applied state and waits for a retry',
        ],
        correctIndex: 1,
        explanation:
          'Atomicity: a transaction is all-or-nothing. On crash recovery the DB rolls back any uncommitted changes, so the first UPDATE is undone.',
      },
      {
        id: 'q2',
        prompt:
          'You have a 50M-row `users` table and this query is slow:\n`SELECT * FROM users WHERE email = ?`\nWhat is the single most effective fix?',
        options: [
          'Add more CPU to the DB server',
          'Shard the table across 10 nodes',
          'Create a B-tree index on the email column',
          'Switch to a NoSQL database',
        ],
        correctIndex: 2,
        explanation:
          'Without an index the DB does a sequential scan O(n). A B-tree index turns it into O(log n) — ~25 comparisons for 1B rows. Cheaper than sharding and usually solves it.',
      },
      {
        id: 'q3',
        prompt:
          'You run `EXPLAIN` on a query and see `Seq Scan`. What does this tell you?',
        options: [
          'The query is using an index, which is good',
          'The query planner could not use any index and is reading every row',
          'The query is running in serializable isolation',
          'The query is blocked by a lock',
        ],
        correctIndex: 1,
        explanation:
          '`Seq Scan` (sequential scan) means every row is being read. On a large table this is almost always the cause of slow queries — add an index on the filtered column.',
      },
      {
        id: 'q4',
        prompt:
          'Which scenario makes an index HURT more than it helps?',
        options: [
          'A `WHERE email = ?` lookup on a 10M-row table',
          'An `ORDER BY created_at` on the main feed',
          'A small lookup table (<500 rows) that is written to on every request',
          'A foreign key column used in JOINs',
        ],
        correctIndex: 2,
        explanation:
          'Indexes add write overhead (every INSERT/UPDATE must update the index). On a tiny, write-heavy table the index cost exceeds the scan cost — indexes are pointless there.',
      },
    ],
  },

  /* ---- 2. Lesson: CAP & replication ---- */
  {
    id: 'q-3-lesson-cap',
    type: 'lesson',
    title: 'CAP & Replication Trade-offs',
    phaseId: 'phase-3',
    order: 2,
    xpReward: 100,
    conceptId: 'c-3-replication-cap',
    prerequisites: ['q-3-lesson-sql'],
    questions: [
      {
        id: 'q1',
        prompt:
          'A primary/replica Postgres setup uses asynchronous replication. A client writes, then immediately reads the same row from a replica — and sees the old value. What is this called?',
        options: [
          'A CAP violation',
          'Replica lag — the replica has not yet caught up',
          'A split-brain',
          'A serializable isolation violation',
        ],
        correctIndex: 1,
        explanation:
          'Async replicas can lag milliseconds to seconds behind the primary. Fix by routing read-after-write to the primary, or using synchronous replication (slower).',
      },
      {
        id: 'q2',
        prompt:
          'During a network partition between two DB nodes, your system keeps accepting writes on both sides and reconciles later. Which CAP choice is it making?',
        options: [
          'CP — consistency',
          'CA — consistency + availability',
          'AP — availability over consistency',
          'PC/EC — always consistent',
        ],
        correctIndex: 2,
        explanation:
          'Answering every request (possibly with stale/divergent data) is choosing Availability. Cassandra and DynamoDB are AP systems. Last-write-wins reconciliation happens after the partition heals.',
      },
      {
        id: 'q3',
        prompt:
          'Why is "pick two of C, A, P" a misleading way to state CAP?',
        options: [
          'You can actually have all three if you try hard enough',
          'Partition tolerance is not optional on a real network — partitions WILL happen, so the real choice is C vs A during a partition',
          'CAP only applies to NoSQL databases',
          'CAP is about consistency levels, not availability',
        ],
        correctIndex: 1,
        explanation:
          'Real networks partition. P is forced. So the practical decision is: when a partition occurs, do we refuse requests (CP) or serve possibly-stale data (AP)?',
      },
      {
        id: 'q4',
        prompt:
          'You need a leaderboard cache that must be ultra-fast but is OK being a few seconds stale. Which consistency model fits?',
        options: [
          'Strong / linearizable',
          'Serializable transactions',
          'Eventual consistency',
          'Strict serializable',
        ],
        correctIndex: 2,
        explanation:
          'Leaderboards tolerate staleness in exchange for low latency and high throughput — the textbook case for eventual consistency. Pick the weakest model your app can tolerate.',
      },
    ],
  },

  /* ---- 3. Command Lab: SQL CLI ---- */
  {
    id: 'q-3-command-sql',
    type: 'command',
    title: 'SQL Terminal Lab',
    phaseId: 'phase-3',
    order: 3,
    xpReward: 150,
    intro:
      'You are debugging a slow orders service. Diagnose the query with the psql terminal.',
    prerequisites: ['q-3-lesson-cap'],
    steps: [
      {
        prompt:
          'Connect to the `orders` database using the Postgres CLI (host is already set).',
        acceptedPatterns: [
          '^\\s*\\\\c\\s+orders\\s*$',
          '^\\s*\\\\connect\\s+orders\\s*$',
          '^\\s*psql\\s+(-d\\s+orders|--dbname\\s+orders)(\\s|$).*',
        ],
        sampleAnswer: '\\c orders',
        hint: 'Inside psql, switch databases with `\\c <dbname>` (backslash-c).',
      },
      {
        prompt:
          'Query the 10 most recent orders for user 42 from the `orders` table (columns: id, user_id, created_at).',
        acceptedPatterns: [
          '^\\s*SELECT\\s+.*FROM\\s+orders\\s+WHERE\\s+user_id\\s*=\\s*42\\b.*ORDER\\s+BY\\s+created_at\\b.*DESC\\b.*LIMIT\\s+10',
          '^\\s*SELECT\\s+.*FROM\\s+orders\\s+WHERE\\s+user_id\\s*=\\s*42\\b.*LIMIT\\s+10',
        ],
        sampleAnswer:
          'SELECT id, user_id, created_at FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 10;',
        hint: '`WHERE user_id = 42`, then `ORDER BY created_at DESC LIMIT 10`.',
      },
      {
        prompt:
          'Inspect the query plan — run EXPLAIN on the same query to check whether an index is being used.',
        acceptedPatterns: [
          '^\\s*EXPLAIN(\\s+ANALYZE)?\\s+SELECT\\s+.*FROM\\s+orders\\s+WHERE\\s+user_id\\s*=\\s*42\\b',
          '^\\s*EXPLAIN(\\s+ANALYZE)?\\s+SELECT\\s+.*FROM\\s+orders\\b',
        ],
        sampleAnswer:
          'EXPLAIN SELECT id, user_id, created_at FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 10;',
        hint: 'Prefix the SELECT with `EXPLAIN` (or `EXPLAIN ANALYZE`) to see the plan.',
      },
    ],
  },

  /* ---- 4. Architecture: read-heavy service ---- */
  {
    id: 'q-3-arch-sharding',
    type: 'architecture',
    title: 'Design a Read-Heavy Service',
    phaseId: 'phase-3',
    order: 4,
    xpReward: 250,
    brief:
      'ScaleUp\'s analytics dashboard is read-heavy: 90% reads at 3,000 rps. The team already runs Postgres as the source of truth. Build a path that absorbs read load without overloading the primary — add a read replica and a Redis cache in front. Stay under $3,000/month, p95 latency ≤ 120 ms, 99.9% availability. Hint: route writes to the primary, reads to the replica, and hot reads to the cache.',
    allowedComponents: [
      'lb-l7-nginx',
      'app-node',
      'db-postgres',
      'db-postgres-replica',
      'redis',
    ],
    requiredComponentTypes: ['appServer', 'dbSQL'],
    target: {
      minRps: 3_000,
      maxLatencyP95: 120,
      maxCostPerMonth: 3_000,
      minAvailability: 0.999,
    },
    traffic: { rps: 3_000, readRatio: 0.9 },
    prerequisites: ['q-3-command-sql'],
  },

  /* ---- 5. Incident: hot partition / replica lag ---- */
  {
    id: 'q-3-incident-hotpartition',
    type: 'incident',
    title: 'Incident: Feed Latency Spike',
    phaseId: 'phase-3',
    order: 5,
    xpReward: 200,
    failureDescription:
      'At 09:17, p95 latency on the social feed jumps from 40 ms to 2,400 ms. Users complain that the feed is "stuck on yesterday\'s posts". One database replica is pinned at 100% CPU; the other two replicas are nearly idle. The primary is healthy.',
    symptoms: [
      'Feed p95 latency spiked from 40 ms → 2,400 ms',
      'Users report seeing stale posts ("yesterday\'s news")',
      'Replica #2 is at 100% CPU; replicas #1 and #3 are nearly idle',
      'Replica #2 replication lag is growing: 45 s and climbing',
      'Write traffic to the primary is normal',
    ],
    prerequisites: ['q-3-arch-sharding'],
    steps: [
      [
        {
          id: 'a',
          label:
            'The primary is overloaded — fail it over to a fresh node',
          isCorrect: false,
          feedback:
            'Wrong. The primary is healthy with normal write load, and failing over would not fix the read path. The bottleneck is on the read replicas, not the primary.',
        },
        {
          id: 'b',
          label:
            'The read router/load-balancer is sending most read traffic to replica #2 (skewed distribution), pinning it. Fix the router to spread reads evenly (round-robin / least-connections) and drain traffic off replica #2.',
          isCorrect: true,
          feedback:
            'Correct! Replicas hold identical data, so one pinned at 100% while its siblings idle is a read-routing skew, not a data-distribution problem. Fixing the router to distribute reads (round-robin or least-connections) removes the hot spot. The growing replication lag is a symptom of the overload, not the root cause.',
        },
        {
          id: 'c',
          label:
            'Replica lag is the root cause — switch to synchronous replication',
          isCorrect: false,
          feedback:
            'Wrong direction. Synchronous replication would make latency WORSE (every write waits for all replicas) and does nothing about the load skew. Lag is a symptom of replica #2 being hammered, not the cause.',
        },
        {
          id: 'd',
          label:
            'Add a Redis cache in front of the feed to absorb reads',
          isCorrect: false,
          feedback:
            'Tempting and useful long-term, but it does not address the immediate incident. The hot partition will still pin replica #2 for cache misses, and stale cache would actually worsen the "yesterday\'s posts" complaint. Fix the routing skew first; add caching as prevention, not as the cure.',
        },
      ],
    ],
  },

  /* ---- 6. Capstone: Social Feed ---- */
  {
    id: 'q-3-capstone',
    type: 'architecture',
    title: 'Capstone: Design a Social Feed',
    phaseId: 'phase-3',
    order: 6,
    xpReward: 500,
    brief:
      'You are the tech lead for "Chirp", a Twitter-like social network. Design the data layer for the home timeline. Workload: 8,000 rps, 95% reads (people scroll feeds, rarely post). p95 latency must stay under 100 ms — feeds must feel instant — with 99.9% availability and under $4,000/month.\n\nConstraints & hints:\n- Posts are append-only; timelines are read constantly. Cache aggressively.\n- A single SQL primary will not survive the read load — pre-compute timelines or use a document store for the feed.\n- Celebrities break naive fan-out: their posts hit millions of feeds. Consider a hybrid (fan-out-on-write for normal users, fan-out-on-read for celebrities).\n- Required: at least one app server, one cache, and one NoSQL store.',
    allowedComponents: [
      'cdn-cloudflare',
      'lb-l7-nginx',
      'gateway-api',
      'app-node',
      'app-python',
      'db-postgres',
      'db-postgres-replica',
      'db-mongo',
      'db-cassandra',
      'redis',
      's3',
      'kafka',
    ],
    requiredComponentTypes: ['appServer', 'cache', 'dbNoSQL'],
    target: {
      minRps: 8_000,
      maxLatencyP95: 100,
      maxCostPerMonth: 4_000,
      minAvailability: 0.999,
    },
    traffic: { rps: 8_000, readRatio: 0.95 },
    prerequisites: ['q-3-incident-hotpartition'],
  },
];
