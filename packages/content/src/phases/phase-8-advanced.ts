import type { Concept, Quest } from '../types';

/**
 * Phase 8 — Advanced (Staff Architect)
 *
 * Topics: multi-region resilience, database internals, consensus, distributed
 * transactions, and the serverless/edge frontier. Targets staff-level thinking:
 * reason about RTO/RPO, write amplification, quorum correctness, and split-brain.
 */

export const PHASE_8_CONCEPTS: Concept[] = [
  /* ---- 1. Multi-region architectures ---- */
  {
    id: 'c-8-multiregion',
    title: 'Multi-Region Architectures',
    summary:
      'Active-active vs active-passive, RTO/RPO targets, and the data-residency constraints that shape global systems.',
    phaseId: 'phase-8',
    body: `# Multi-Region Architectures

When a single region cannot meet your availability SLO (region outages happen — AWS us-east-1 has failed multiple times), you go **multi-region**. Going multi-region is the single most expensive jump in system design; do it only when justified.

## Two operating models

### Active-Passive (Failover)
- One region serves live traffic; the other is **warm standby**.
- Replication is typically **async one-way** (primary → standby).
- On failure: promote the standby + flip DNS (Route 53, Cloudflare).
- **Simpler**, cheaper, fewer consistency surprises.
- Downside: the standby sits idle; failover takes minutes (RTO > 0).

### Active-Active
- Multiple regions serve live traffic concurrently.
- Each region has its own app + DB; replication is **multi-master** or runs through a conflict resolver (Cassandra LWW, CRDTs, last-writer-wins, or app-level merge).
- Zero idle capacity, lower user latency everywhere.
- Downside: **conflict resolution is hard** and you must reason about **CAP/consistency per query**, not per system.

| | Active-Passive | Active-Active |
|---|---|---|
| Cost | 1× live + warm | N× live |
| Latency | Best for nearby region only | Low for all users |
| Failover RTO | Minutes | ~Zero (already serving) |
| Complexity | Moderate | High (conflicts, ordering) |

## RTO and RPO — the two numbers that define your DR plan
- **RTO** (Recovery Time Objective): how long until service is *restored* after a disaster.
- **RPO** (Recovery Point Objective): how much *data loss* is acceptable, measured in time.

> Async replication every 60s ⇒ RPO ≈ 60s. A 5-minute DNS failover adds to RTO. A strongly-consistent cross-region write has RPO = 0 but adds 80–200 ms of latency per write.

Pick the targets first, then choose the architecture that meets them.

## Data residency
Regulations constrain *where* data may live:
- **GDPR** (EU): personal data of EU residents must be processed/stored in (or transferable to) approved regions.
- **CCPA/CPRA** (California), **PIPL** (China), **PDPA** (Singapore).
- Some sectors (healthcare HIPAA, banking) require in-country storage.

**Pattern**: pin user data to a home region via a routing layer (Route 53 latency records + a lookup service), and keep a global index mapping \`userId → region\`. Reads/writes for that user always go to their home region.

## Replication topologies at a glance
- **Single-leader** (Postgres streaming, Aurora Global): one writer; reads everywhere. Easiest to reason about.
- **Multi-leader** (CockroachDB, Spanner, Cassandra): writes in every region; consensus (Raft/Paxos) serializes them.
- **Shard-by-region** (user_id hashed to a region): no cross-region writes for the hot path; best for scale + locality.
`,
  },

  /* ---- 2. Database internals ---- */
  {
    id: 'c-8-database-internals',
    title: 'Database Internals: B-Trees vs LSM-Trees',
    summary:
      'The two storage-engine families that power nearly every database — why B-trees win reads and LSMs win writes, and what write amplification costs you.',
    phaseId: 'phase-8',
    prerequisites: ['c-8-multiregion'],
    body: `# Database Internals: B-Trees vs LSM-Trees

Almost every database storage engine is one of two things: a **B-tree** (Postgres, MySQL InnoDB, SQLite) or an **LSM-tree** (Cassandra, RocksDB, LevelDB, HBase, ScyllaDB). The choice dictates read vs write performance.

## B-Tree — the read-optimized classic
A balanced tree of fixed-size **pages** (typically 4–16 KB). Each leaf holds sorted keys + values; inner nodes route searches.

- **Reads**: O(log N), usually 3–4 page reads for terabyte-scale data. Inner pages are almost always cached, so leaf lookup is ~1 disk seek.
- **Writes**: must read the page, modify it in place, fsync. If a write splits a page, the tree rebalances.
- **Strength**: predictable, fast point reads and range scans; transactional durability via WAL + page redo.

> Trade-off: every update rewrites a whole page ⇒ **write amplification** (one logical row update can cost one full page write).

## LSM-Tree — the write-optimized challenger
Writes go to an in-memory **MemTable** + an append-only **WAL**. When the MemTable fills, it's flushed to disk as an immutable **SSTable** (Sorted String Table). Background **compaction** merges SSTables and removes tombstones.

- **Writes**: pure append + memory write ⇒ extremely fast (Cassandra does 100k+ writes/sec per node).
- **Reads**: must check MemTable + multiple SSTables. Mitigated by **Bloom filters** (skip SSTables that definitely don't have the key) and block caches.
- **Compaction** is the cost of admission: it burns CPU + IO in the background and can cause **read amplification** + p99 latency spikes if it falls behind.

| Criterion | B-Tree | LSM-Tree |
|---|---|---|
| Point read (cached) | Very fast | Fast (Bloom helps) |
| Range scan | Excellent | Decent (multi-level) |
| Write throughput | Moderate | Very high |
| Write amplification | High (page rewrite) | Lower (append), but compaction adds it back |
| Read amplification | Low (1–2 seeks) | Higher (multiple SSTables) |
| Space amp | Low (in place) | Higher (stale copies until compaction) |
| Best fit | OLTP, transactions | Write-heavy, time-series, wide-column |

## Write amplification (WAF)
The ratio of physical bytes written per logical byte the user wrote. Lower is better — it's NAND flash endurance, IO bandwidth, and power.

- B-tree WAF: ~2–4 (page rewrite + WAL + redo).
- LevelDB/RocksDB level-style compaction: ~10–30.
- Cassandra size-tiered: lower WAF, but more read amp + tombstones.

> **Staff-level insight**: pick LSM when your workload is write-heavy and you can tolerate p99 spikes during compaction (or use tiered compaction + I/O throttling). Pick B-tree when reads dominate and you need transactional guarantees.

## Beyond trees: newer storage
- **Bw-Tree** (Azure Cosmos DB, SQL Server Hekaton): latch-free, log-structured B-tree.
- **LSM + B-tree hybrids** (WiredTiger in MongoDB): each document is in a B-tree, but storage is log-structured underneath.
`,
  },

  /* ---- 3. Consensus algorithms ---- */
  {
    id: 'c-8-consensus',
    title: 'Consensus: Raft, Paxos, Quorum, Split-Brain',
    summary:
      'How a cluster of machines agrees on one truth — leader election, majority quorum, and why split-brain is the failure you must never allow.',
    phaseId: 'phase-8',
    prerequisites: ['c-8-database-internals'],
    body: `# Consensus: Raft, Paxos, Quorum, Split-Brain

**Consensus** = a group of N nodes agreeing on a single value (or a log of values) despite crashes, slow networks, or reordering. It is the foundation of every strongly-consistent distributed system: etcd, ZooKeeper, Consul, Spanner, CockroachDB, TiKV, Kafka's KRaft.

## The core theorem: FLP & the quorum trick
The **FLP impossibility result** says consensus among deterministic nodes is impossible in async networks if even one node can fail. The practical escape hatch: **assume timing is mostly OK** (synchronous-enough) and use a **majority quorum**.

For a cluster of N nodes tolerating F failures:
\`
Quorum = ⌈(N + 1) / 2⌉ = F + 1     (need N = 2F + 1 nodes)
\`
- 3 nodes tolerate 1 failure (quorum = 2)
- 5 nodes tolerate 2 failures (quorum = 3)
- 7 nodes tolerate 3 failures (quorum = 4)

A decision is **committed** once a majority has acked it. Any two majorities overlap in at least one node, so no two conflicting decisions can both be committed. This is the whole reason odd cluster sizes are the norm.

## Raft (the understandable one)
Raft splits consensus into three pieces:

### 1. Leader election
- Nodes start as **followers**. If they hear nothing within a randomized **election timeout** (150–300 ms), they become **candidates**, increment \`term\`, and request votes.
- A candidate wins if it gets a **majority** of votes for that term. Only one leader per term.
- The leader sends **heartbeats** to suppress new elections.

> Randomized timeouts break ties without complex coordination — elegant Raft design.

### 2. Log replication
- Client writes go to the **leader**.
- Leader appends to its log, sends \`AppendEntries\` RPCs to followers, and **commits** the entry once the majority has replicated it.
- The leader then notifies followers of the new commit index.

### 3. Safety
- If a leader sees a higher term in any RPC, it steps down.
- The **commit rule** guarantees: once an entry is committed, it's never lost and all future leaders contain it.

## Paxos (the original, harder one)
Classic Paxos agrees on a single value via **Prepare/Promise/Accept/Ack**. Multi-Paxos adds a stable leader for a log. Raft is essentially "Multi-Paxos redesigned for clarity." Spanner, Chubby, and Cassandra's Lightweight Transactions (PAXOS) use Paxos-family protocols.

## Split-brain — the failure mode consensus exists to prevent
**Split-brain**: a network partition divides the cluster into two subgroups, each believing the other is dead, and each electing its own leader. Two concurrent writers = corrupted data.

How consensus defends against it:
- Any quorum must be a **majority of the full cluster**, so a partitioned minority (1 or 2 of 5) **cannot reach quorum** and **stops accepting writes**.
- The larger side that does hold a majority proceeds.
- Worst case (even split, e.g. 2/2 of 4): **both sides stall** rather than risk divergence. Better unavailable than inconsistent.

> **Staff rule**: never run an even-numbered consensus cluster. With N=4 you tolerate the same failures as N=3 but pay more. Always 3, 5, or 7.

## Quorum in databases (a different but related use)
Dynamo-style systems (Cassandra, Riak, DynamoDB) let you tune per-query:
\`
R = read replicas to contact   W = write replicas to ack
R + W > N  ⇒  strong consistency for that key
\`
- \`R=1, W=1\` (N=3): fast, eventually consistent.
- \`QUORUM\` reads + writes (\`R=2, W=2\`): linearizable-ish.
- This is **not** full Raft — there's no single leader or log, but the same majority-overlap math applies.
`,
  },

  /* ---- 4. Distributed transactions + serverless/edge ---- */
  {
    id: 'c-8-distributed-tx',
    title: 'Distributed Transactions, Outbox & Edge',
    summary:
      '2PC, SAGA, and the transactional outbox pattern — plus where serverless and edge compute change the topology of a global system.',
    phaseId: 'phase-8',
    prerequisites: ['c-8-consensus'],
    body: `# Distributed Transactions, Outbox & Edge

A transaction that spans multiple services or databases breaks the cozy "ACID in one DB" model. Three mature answers exist, each with a different trade-off.

## Two-Phase Commit (2PC)
A coordinator drives a transaction across all participants:
1. **Prepare** — every participant locks the row and promises it can commit.
2. **Commit/Abort** — if all said YES, coordinator sends COMMIT; otherwise ABORT.

- **Guarantee**: atomic across N resources (all-or-nothing).
- **Cost**: blocking. If the coordinator dies after Prepare, participants **hold locks forever** waiting for the verdict. Throughput tanks; p99 explodes.
- **Use it**: when you genuinely need cross-shard ACID and can tolerate the latency (e.g. financial settlement, Spanner-style systems).

> Most teams avoid raw 2PC. It's correct but slow and fragile.

## SAGA — the eventual-consistency alternative
Break the distributed transaction into a sequence of **local transactions**, each on one service. If a later step fails, run **compensating transactions** to undo earlier ones.

Two flavors:
- **Choreography**: each service emits an event; the next listens. Decentralized, but the flow is hard to follow at scale.
- **Orchestration**: a central orchestrator (Temporal, AWS Step Functions, Camunda) calls each service and runs compensations explicitly. Easier to debug; adds a component to operate.

\`\`\`
BookTrip:
  1. reserveFlight  →  comp: cancelFlight
  2. reserveHotel   →  comp: cancelHotel
  3. chargeCard     →  comp: refundCard
\`\`\`
If step 3 fails: orchestrator runs \`refundCard\`? (skipped), \`cancelHotel\`, \`cancelFlight\`.

> Sagas give up isolation (mid-states are visible) for availability. Design each step **idempotent** so retries don't double-charge.

## The Transactional Outbox pattern
The classic bug: "update DB + publish event to Kafka" — the publish can fail after the commit, or the commit can fail after the publish. You get phantom events.

**Outbox** fixes this: write the domain change and the outbox row **in the same DB transaction** (atomic, local). A separate process (**CDC** — Debezium reading the WAL, or a poller) reads the outbox and publishes to Kafka. Exactly-once-ish, at-least-once with dedup.

\`\`\`
BEGIN;
  UPDATE orders SET status='paid' WHERE id=42;
  INSERT INTO outbox(event_type, payload) VALUES ('OrderPaid', {...});
COMMIT;
-- Debezium tails the outbox → Kafka
\`\`\`
This is *the* standard pattern for reliably publishing domain events. Almost every event-driven microservice architecture uses it.

## Serverless & Edge — where the topology moves
**Serverless** (Lambda, Cloud Run, Cloudflare Workers) shifts capacity planning to the platform:
- Scale-to-zero; pay per request.
- Cold starts matter (50 ms – 1 s) — keep functions warm or use provisioned concurrency.
- Stateless by default; session/data lives in DB or Redis.

**Edge compute** (Cloudflare Workers, Vercel Edge, Deno Deploy, Fastly Compute) runs your code in 300+ POPs:
- Requests terminate ~5–20 ms from the user.
- Read-heavy, geographically diverse workloads (auth, A/B testing, personalization, A/B configs) collapse to a few ms.
- State still lives in regional/sticky stores; the edge caches aggressively.

### Where it all comes together
A modern global system often looks like:
- **Edge**: Workers run auth + reads from KV (Durable Objects, Workers KV, Upstash).
- **Regional**: app clusters in 3 regions, each owning a primary DB shard for nearby users.
- **Core**: SAGA + outbox for cross-region writes; consensus (Raft) per shard; multi-region async replication for DR.

You trade per-query simplicity for global latency, availability, and scale.
`,
  },
];

export const PHASE_8_QUESTS: Quest[] = [
  /* ---- 1. Lesson: multi-region ---- */
  {
    id: 'q-8-lesson-multiregion',
    type: 'lesson',
    title: 'Multi-Region & Disaster Recovery',
    phaseId: 'phase-8',
    order: 1,
    xpReward: 100,
    conceptId: 'c-8-multiregion',
    questions: [
      {
        id: 'q1',
        prompt:
          'You run a system with async DB replication every 30 seconds and a DNS failover that takes 4 minutes. What are your RPO and RTO?',
        options: [
          'RPO = 0, RTO = 4 min',
          'RPO = 30s, RTO ≈ 4 min',
          'RPO = 4 min, RTO = 30s',
          'RPO = 30s, RTO = 0',
        ],
        correctIndex: 1,
        explanation:
          'RPO = the most data you can lose = the replication lag (30s). RTO = the time to restore service = the DNS failover (~4 min). These are two separate axes: the lag is a data-loss (RPO) concern, while the failover duration is the recovery (RTO) concern — they are not added together.',
      },
      {
        id: 'q2',
        prompt:
          'A regulated EU customer demands their personal data never leave the EU. Which architecture best fits a globally-low-latency product?',
        options: [
          'Active-active multi-master with data in the cheapest region',
          'Single region in the US with a 2x CDN',
          'Region-pinned data + a global userId→region routing layer',
          'Active-passive with primary in EU and standby in US',
        ],
        correctIndex: 2,
        explanation:
          'Pin each user\'s data to a compliant home region and route via a global index. Other options either move data across borders or destroy locality.',
      },
      {
        id: 'q3',
        prompt: 'Which is the defining trade-off of going active-active multi-region?',
        options: [
          'Higher per-region idle capacity',
          'Zero failover time at the cost of conflict resolution',
          'Lower write latency in the primary region',
          'Simpler operational runbooks',
        ],
        correctIndex: 1,
        explanation:
          'Active-active serves traffic from every region with ~zero failover, but you must resolve concurrent writes (LWW, CRDTs, app-merge) and reason about consistency per query.',
      },
      {
        id: 'q4',
        prompt:
          'Why do teams usually NOT pick strongly-consistent cross-region writes for the entire workload?',
        options: [
          'Consensus cannot work across regions',
          'Each write pays a cross-region round trip (80–200 ms), killing latency',
          'It would cost less than single-region',
          'DNS does not support it',
        ],
        correctIndex: 1,
        explanation:
          'A quorum ack across regions adds an inter-region RTT per write. Use it only for the small set of writes that truly need global linearizability.',
      },
    ],
  },

  /* ---- 2. Lesson: database internals ---- */
  {
    id: 'q-8-lesson-database-internals',
    type: 'lesson',
    title: 'Database Internals: B-Trees vs LSM-Trees',
    phaseId: 'phase-8',
    order: 2,
    xpReward: 100,
    conceptId: 'c-8-database-internals',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt:
          'You are choosing a storage engine for a write-heavy time-series workload at 100k+ inserts per second, where reads are mostly recent data. Which engine family fits best and why?',
        options: [
          'B-tree, because page-cached point reads are O(log N)',
          'LSM-tree, because writes append to an in-memory MemTable plus a WAL and only flush immutable SSTables periodically',
          'B-tree, because in-place page updates avoid compaction entirely',
          'LSM-tree, because compaction eliminates write amplification',
        ],
        correctIndex: 1,
        explanation:
          'LSM-trees write to an in-memory MemTable plus an append-only WAL, then flush immutable SSTables — extremely high write throughput. B-trees rewrite a full page per update (high write amp). Compaction does not eliminate WAF; it shifts it into the background and adds read amp if it falls behind.',
      },
      {
        id: 'q2',
        prompt: 'Which definition of write amplification (WAF) is correct?',
        options: [
          'The total logical bytes the application writes per second',
          'Physical bytes written to the device per logical byte written by the host (lower is better)',
          'The number of replicas each write is propagated to',
          'The network round-trip latency a write incurs',
        ],
        correctIndex: 1,
        explanation:
          'WAF equals physical bytes written divided by logical bytes the user wrote. Lower is better — it costs NAND endurance, IO bandwidth, and power. Typical B-tree WAF is 2 to 4; level-compacted LSMs can hit 10 to 30 once compaction is counted.',
      },
      {
        id: 'q3',
        prompt:
          'On an LSM-tree, a point read may need to consult the MemTable and several SSTables. What mechanism do LSM engines use to skip SSTables that definitely do not contain the key?',
        options: [
          'A prefix trie rebuilt on each flush',
          'A hash join against the WAL',
          'A Bloom filter probed before reading the SSTable',
          'A B-tree secondary index kept in shared memory',
        ],
        correctIndex: 2,
        explanation:
          'Each SSTable ships with a Bloom filter. The lookup probes it first and skips the SSTable when the filter says the key is absent. This is what keeps LSM point reads competitive despite many immutable levels.',
      },
      {
        id: 'q4',
        prompt:
          'What is the most common cause of p99 read-latency spikes in an LSM engine under heavy write load?',
        options: [
          'Bloom filters must be rebuilt on every read',
          'Background compaction falls behind, so reads must scan many overlapping SSTables (read amplification)',
          'The MemTable fsyncs on every read',
          'Pages of the underlying B-tree fragment under load',
        ],
        correctIndex: 1,
        explanation:
          'If compaction cannot keep up with the write rate, overlapping SSTables accumulate and reads must check more of them — even with Bloom filters, p99 spikes. Tiered compaction and I/O throttling mitigate it. The other options fabricate per-read work or reference B-tree mechanics that an LSM does not use.',
      },
    ],
  },

  /* ---- 3. Lesson: consensus ---- */
  {
    id: 'q-8-lesson-consensus',
    type: 'lesson',
    title: 'Raft, Quorum & Split-Brain',
    phaseId: 'phase-8',
    order: 3,
    xpReward: 100,
    conceptId: 'c-8-consensus',
    prerequisites: ['q-8-lesson-multiregion'],
    questions: [
      {
        id: 'q1',
        prompt: 'You run a 5-node Raft cluster. How many nodes can fail while still electing a leader and committing writes?',
        options: ['1', '2', '3', '4'],
        correctIndex: 1,
        explanation:
          'N=5 ⇒ quorum = 3 ⇒ tolerate F = N − quorum = 2 failures. The remaining 3 nodes still form a majority.',
      },
      {
        id: 'q2',
        prompt: 'Why is an even-numbered consensus cluster (e.g. 4 nodes) considered an anti-pattern?',
        options: [
          'It costs more without tolerating more failures than 3 nodes',
          'It cannot elect a leader at all',
          'It tolerates 3 failures, which is too many',
          'Raft forbids it by protocol',
        ],
        correctIndex: 0,
        explanation:
          'A 4-node cluster has quorum 3 and tolerates only 1 failure — same as 3 nodes, but with one extra server to operate. Worst case (2/2 partition) both sides stall. Use 3, 5, or 7.',
      },
      {
        id: 'q3',
        prompt:
          'A network partition splits your 5-node etcd cluster 2 vs 3. The side with 2 nodes tries to elect a leader. What happens and why?',
        options: [
          'It elects a leader and serves stale data — split-brain',
          'It cannot reach a majority (needs 3), so it stays read-only and rejects writes',
          'The whole cluster shuts down permanently',
          'The 2-node side silently becomes the new primary',
        ],
        correctIndex: 1,
        explanation:
          '2 < quorum (3), so the minority side cannot commit or elect a leader with majority ack. It stalls rather than risk divergence — this is exactly how consensus prevents split-brain.',
      },
      {
        id: 'q4',
        prompt: 'In Raft, what role do randomized election timeouts (150–300 ms) play?',
        options: [
          'They encrypt leader votes',
          'They throttle writes for safety',
          'They make simultaneous candidate splits statistically unlikely, breaking ties without extra coordination',
          'They are required by the FLP theorem',
        ],
        correctIndex: 2,
        explanation:
          'Random timeouts mean nodes rarely time out at the same instant, so one usually requests votes and wins before others wake up — a simple, elegant tie-breaker.',
      },
    ],
  },

  /* ---- 4. Lesson: distributed transactions & edge ---- */
  {
    id: 'q-8-lesson-distributed-tx',
    type: 'lesson',
    title: 'Distributed Transactions, Outbox & Edge',
    phaseId: 'phase-8',
    order: 4,
    xpReward: 100,
    conceptId: 'c-8-distributed-tx',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt:
          'In Two-Phase Commit, what happens if the coordinator crashes after every participant has voted YES in Prepare but before sending COMMIT or ABORT?',
        options: [
          'Participants auto-commit on timeout to release their locks',
          'Participants auto-abort on timeout and roll back',
          'Participants hold their locks and block, waiting for the coordinator to recover',
          'Participants run a leader election and proceed independently',
        ],
        correctIndex: 2,
        explanation:
          'This is the classic blocking failure of 2PC. After Prepare, each participant has promised to commit and cannot unilaterally abort or commit. They hold their locks until the coordinator recovers — throughput collapses and p99 explodes. Most teams avoid raw 2PC for this reason.',
      },
      {
        id: 'q2',
        prompt: 'What is the defining property of a SAGA compared to Two-Phase Commit?',
        options: [
          'It provides full ACID isolation across all steps',
          'It uses a coordinator to atomically lock all participants',
          'It gives up isolation (mid-states are visible) and runs compensating transactions to undo earlier steps on failure',
          'It requires a globally synchronized clock for ordering',
        ],
        correctIndex: 2,
        explanation:
          'A SAGA breaks a distributed transaction into a sequence of local transactions; on a later-step failure it runs compensating transactions backward. Mid-states are visible (no isolation) but availability is preserved. Design each step idempotent so retries do not double-charge.',
      },
      {
        id: 'q3',
        prompt:
          'You must atomically update an orders row and publish an OrderPaid event to Kafka. Naive commit-then-publish can lose events when the publish fails after commit. Which pattern solves this?',
        options: [
          'Two-Phase Commit between Postgres and Kafka',
          'A SAGA with choreography between the order and billing services',
          'Transactional outbox: write the change and an outbox row in the same DB transaction, then a CDC process (e.g. Debezium) publishes to Kafka',
          'Set Kafka producer retries to infinite',
        ],
        correctIndex: 2,
        explanation:
          'The outbox writes the domain change and an outbox row in one local DB transaction (atomic). A separate process tails the outbox — Debezium reading the WAL, or a poller — and publishes to Kafka, giving at-least-once delivery with dedup upstream. This is the standard pattern for reliable event publishing.',
      },
      {
        id: 'q4',
        prompt:
          'Which statement about serverless and edge compute is accurate for a global, read-heavy workload?',
        options: [
          'Edge runtimes can only serve static files; dynamic logic must run in a single region',
          'Serverless functions have zero cold-start latency by design',
          'Edge runtimes place code within roughly 5 to 20 ms of the user and cache aggressively, but authoritative state still lives in regional or sticky stores',
          'Edge compute removes the need for multi-region databases',
        ],
        correctIndex: 2,
        explanation:
          'Edge runtimes (Cloudflare Workers, Vercel Edge, Deno Deploy) execute in hundreds of POPs near the user for reads, auth, and A/B decisions. But the edge does not own authoritative state — regional primaries, replication, and sticky stores are still required. Cold starts are real (50 ms to 1 s) and must be mitigated.',
      },
    ],
  },

  /* ---- 5. Command Lab: failover ---- */
  {
    id: 'q-8-command-failover',
    type: 'command',
    title: 'Command Lab: Regional Failover',
    phaseId: 'phase-8',
    order: 5,
    xpReward: 150,
    intro:
      'Region us-east-1 is degraded. You are on-call. Drain its Kubernetes nodes and flip DNS traffic to the ap-southeast-1 standby using the AWS / kubectl CLIs.',
    prerequisites: ['q-8-lesson-consensus'],
    steps: [
      {
        prompt:
          'Cordon and drain the failing-region node `ip-10-0-3-42.ec2.internal` so no new pods schedule there and existing pods evacuate. Ignore DaemonSets and delete emptydir data.',
        acceptedPatterns: [
          '^kubectl\\s+drain\\s+ip-10-0-3-42\\.ec2\\.internal\\s+.*--ignore-daemonsets.*--delete-emptydir-data.*',
          '^kubectl\\s+drain\\s+ip-10-0-3-42\\.ec2\\.internal\\s+.*--delete-emptydir-data.*--ignore-daemonsets.*',
        ],
        sampleAnswer:
          'kubectl drain ip-10-0-3-42.ec2.internal --ignore-daemonsets --delete-emptydir-data',
        hint: '`kubectl drain <node> --ignore-daemonsets --delete-emptydir-data` evacuates the node safely.',
      },
      {
        prompt:
          'Switch the Route 53 weighted/health-checked record `api.example.com` to ap-southeast-1 by submitting a change batch. Hosted zone ID is Z2MOCKHOSTEDZONE.',
        acceptedPatterns: [
          'aws\\s+route53\\s+change-resource-record-sets\\s+--hosted-zone-id\\s+Z2MOCKHOSTEDZONE.*--change-batch.*',
        ],
        sampleAnswer:
          'aws route53 change-resource-record-sets --hosted-zone-id Z2MOCKHOSTEDZONE --change-batch file://failover-to-ap-southeast-1.json',
        hint: '`aws route53 change-resource-record-sets --hosted-zone-id <id> --change-batch file://...` is the failover primitive.',
      },
      {
        prompt:
          'Verify Route 53 now reports ap-southeast-1 as the healthy endpoint for the health check with id `abc123de-failover`.',
        acceptedPatterns: [
          'aws\\s+route53\\s+get-health-check-status\\s+--health-check-id\\s+abc123de-failover',
          'aws\\s+route53\\s+get-health-check\\s+--health-check-id\\s+abc123de-failover',
        ],
        sampleAnswer:
          'aws route53 get-health-check-status --health-check-id abc123de-failover',
        hint: '`aws route53 get-health-check-status --health-check-id <id>` shows which endpoint is healthy.',
      },
    ],
  },

  /* ---- 6. Architecture: multi-region resilient design ---- */
  {
    id: 'q-8-arch-multiregion',
    type: 'architecture',
    title: 'Architecture: Multi-Region Resilient Backend',
    phaseId: 'phase-8',
    order: 6,
    xpReward: 300,
    brief:
      'Design a multi-region backend for a global notifications service: 40,000 rps at 95% reads, p95 latency under 80 ms, and 99.99% availability (four 9s — a CDN on the path caps you just under five, so design the origin path for four), within $8,000/month. Serve users from edge caches in every region; replicate writes through a queue; choose a database that scales horizontally across regions.',
    allowedComponents: [
      'cdn-cloudflare',
      'dns-route53',
      'lb-l7-nginx',
      'app-node',
      'db-cassandra',
      'redis',
      'kafka',
    ],
    requiredComponentTypes: ['cdn', 'loadBalancer', 'appServer', 'dbNoSQL'],
    target: {
      maxLatencyP95: 80,
      minRps: 40_000,
      minAvailability: 0.9999,
      maxCostPerMonth: 2_350,
    },
    traffic: { rps: 40_000, readRatio: 0.95 },
    prerequisites: ['q-8-command-failover'],
  },

  /* ---- 7. Incident: split-brain ---- */
  {
    id: 'q-8-incident-splitbrain',
    type: 'incident',
    title: 'Incident: Split-Brain During Partition',
    phaseId: 'phase-8',
    order: 7,
    xpReward: 250,
    failureDescription:
      'At 09:17 a network partition isolates two of your five etcd nodes (a Raft consensus cluster storing service config) from the other three. The 2-node minority has lost contact with the leader and cannot reach quorum; clients routed to it are timing out.',
    symptoms: [
      'The 3-node majority elected a stable leader and keeps serving reads/writes',
      'The 2-node minority stalls — its writes time out because it cannot get a Raft majority (3 of 5)',
      'No node has crashed — all five are up, just partitioned',
      'On-call is tempted to "fix" the minority so it stops timing out',
    ],
    prerequisites: ['q-8-arch-multiregion'],
    steps: [
      [
        {
          id: 'a',
          label:
            'Force the minority to accept writes on its own so clients stop timing out',
          isCorrect: false,
          feedback:
            'Wrong — a Raft minority accepting commits without quorum is exactly split-brain. You would create a divergent log that must be manually, lossily reconciled. Quorum exists to prevent this.',
        },
        {
          id: 'b',
          label:
            'Route all clients to the 3-node majority (which has quorum) and leave the minority stalled until the partition heals',
          isCorrect: true,
          feedback:
            'Correct. Only the 3-node majority can reach quorum (3 of 5), so it is the single source of truth. The minority refuses commits, then rejoins and catches up via Raft log replication once the partition heals — no divergence, no data loss.',
        },
        {
          id: 'c',
          label:
            'Force a leader election in the 2-node minority so both groups have their own leader',
          isCorrect: false,
          feedback:
            'Wrong — two concurrent leaders across a partition is the definition of split-brain. A 2-node group cannot win a Raft election (needs 3 votes), and forcing one anyway multiplies the divergence instead of containing it.',
        },
        {
          id: 'd',
          label:
            'Shrink the cluster to 2 nodes so the minority suddenly has quorum',
          isCorrect: false,
          feedback:
            'Wrong — you would be discarding the 3-node majority (and its newer committed entries), effectively choosing the losing side. Quorum is about which side CAN commit safely, not about redefining the cluster to fit the smaller side.',
        },
      ],
      [
        {
          id: 'a',
          label:
            'Run an odd cluster size, spread nodes across zones/regions, and let clients fail over to the majority so a partition never splits quorum',
          isCorrect: true,
          feedback:
            'Correct. N=5 tolerates 2 failures; an odd size wastes no quorum; spreading nodes across zones means a single-zone partition leaves a majority intact. Client routing to the healthy majority makes the failover automatic.',
        },
        {
          id: 'b',
          label:
            'Run an even number of nodes (e.g. 6) so there is more capacity to survive partitions',
          isCorrect: false,
          feedback:
            'Wrong — an even cluster tolerates the *same* number of failures as the odd size below it (6 tolerates 2, just like 5) while costing more. Odd sizes are strictly more efficient for quorum systems.',
        },
        {
          id: 'c',
          label:
            'Pin all nodes in a single zone so a partition can never divide them',
          isCorrect: false,
          feedback:
            'Wrong — co-locating all nodes turns a single-zone outage into total cluster loss. Spreading across zones/regions is what lets the majority survive a partition in the first place.',
        },
        {
          id: 'd',
          label:
            'Disable quorum checks so every node accepts writes independently',
          isCorrect: false,
          feedback:
            'Wrong — this is permanent split-brain by design. Quorum is the mechanism that keeps a distributed system consistent; disabling it guarantees divergent logs and data loss.',
        },
      ],
    ],
  },

  /* ---- 8. Capstone: global multi-region system ---- */
  {
    id: 'q-8-capstone',
    type: 'architecture',
    title: 'Capstone: Global Multi-Region System',
    phaseId: 'phase-8',
    order: 8,
    xpReward: 500,
    brief:
      'You are the staff architect. Design a global multi-region system for 10M users at four-9s (99.99%) uptime. Target: 50,000 rps (97% reads), p95 latency under 120 ms (global cross-region adds round-trip time), under $10,000/month. Use a CDN at the edge for reads, regional app clusters with many replicas, a globally-replicated NoSQL store, and a cache to absorb the read hot path. The queue decouples cross-region writes.',
    allowedComponents: [
      'cdn-cloudflare',
      'dns-route53',
      'lb-l7-nginx',
      'lb-l4',
      'gateway-api',
      'app-node',
      'app-python',
      'db-cassandra',
      'db-mongo',
      'redis',
      'kafka',
      's3',
    ],
    requiredComponentTypes: ['cdn', 'loadBalancer', 'appServer', 'dbNoSQL', 'cache'],
    target: {
      maxLatencyP95: 120,
      minRps: 50_000,
      minAvailability: 0.9999,
      maxCostPerMonth: 2_000,
    },
    traffic: { rps: 50_000, readRatio: 0.97 },
    prerequisites: ['q-8-incident-splitbrain'],
  },
];
