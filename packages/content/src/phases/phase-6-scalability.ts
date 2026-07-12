import type { Concept, Quest } from '../types';

export const PHASE_6_CONCEPTS: Concept[] = [
  /* ---- 1. Horizontal vs Vertical Scaling ---- */
  {
    id: 'c-6-scaling-direction',
    title: 'Horizontal vs Vertical Scaling',
    summary: 'Scale out (add machines) vs scale up (bigger machine) — when each wins, and the ceiling that forces horizontal.',
    phaseId: 'phase-6',
    body: `# Horizontal vs Vertical Scaling

When load grows you have two directions to grow in.

## Vertical scaling — "scale up"
Buy a **bigger machine**: more CPU, more RAM, faster disks.
- ✅ Simple — no code changes, no distributed-systems headaches
- ✅ Keeps single-node state (great for relational DB primaries)
- ❌ **Hard ceiling** — every machine has a max size
- ❌ Requires **downtime** to resize (reboot onto bigger box)
- ❌ Single point of failure — one machine dies, the whole service dies
- ❌ Cost grows **super-linearly** at the top end (big boxes are expensive)

## Horizontal scaling — "scale out"
Add **more machines** behind a load balancer.
- ✅ No hard upper limit — keep adding nodes
- ✅ Rolling upgrades — no downtime, swap nodes one at a time
- ✅ Failure isolation — losing one of N nodes barely hurts
- ✅ Commodity hardware — cheaper per unit of capacity
- ❌ Requires **stateless** app tier (sessions, cache must be externalized)
- ❌ More moving parts — LB, service discovery, consistency

## When to pick which
| Workload | Pick | Why |
|---|---|---|
| Stateless web/API tier | Horizontal | Trivially parallel; the default |
| Relational DB primary | Vertical | Strong single-writer consistency |
| Cache, search, object storage | Horizontal | Designed to shard/partition |
| Batch / analytics jobs | Horizontal | Split work across workers |

> 💡 **Rule of thumb**: stateless services scale **out**; stateful stores often scale **up** until you are forced to shard. The most common mistake is baking state into the app tier and then being unable to scale horizontally when traffic spikes.

## The hybrid reality
Most production systems do **both**: scale the app tier horizontally to absorb traffic, and vertically scale each database node as the working set grows — until sharding/read-replicas take over.
`,
  },

  /* ---- 2. Auto-scaling ---- */
  {
    id: 'c-6-autoscaling',
    title: 'Auto-Scaling',
    summary: 'Metrics-driven, cooldown-bounded, and predictive scaling — how fleets grow and shrink without a human.',
    phaseId: 'phase-6',
    prerequisites: ['c-6-scaling-direction'],
    body: `# Auto-Scaling

**Auto-scaling** automatically adds or removes instances in response to load, so you meet demand at minimal cost.

## The control loop
1. **Metric** — what signal triggers scaling? (CPU%, memory, RPS, queue depth, p95 latency)
2. **Policy** — what to do when the metric crosses a threshold
3. **Cooldown** — how long to wait before the next action
4. **Bounds** — min and max instance count (a safety net)

## Scaling policies
- **Target tracking** — "keep CPU at 60%". Simplest and most common. The scaler does the math.
- **Step scaling** — "add 2 if CPU > 70%, add 4 if CPU > 90%". More aggressive for spiky loads.
- **Scheduled scaling** — "add 10 nodes at 08:00 Monday". Known traffic patterns (e.g. shopping peak).

## Why cooldowns matter
Without a cooldown, a metric blip causes a scale-out, then the new capacity drives the metric down, then you scale back in immediately — **thrashing**. A typical cooldown is **3–5 minutes** for scale-out and **10–15 minutes** for scale-in (scale-in is slower because new instances take time to warm up and serve).

## Predictive scaling
Uses **historical traffic patterns** to provision capacity *before* the spike arrives. **AWS Predictive Scaling** forecasts from traffic history and pre-warms capacity. **Kubernetes HPA** (even with custom metrics) and the **Cluster Autoscaler** are *reactive* — they only scale *after* a metric has already moved. For predictive behaviour on Kubernetes, reach for **KEDA** with cron or forecast-based triggers.
- Train on weeks of traffic data
- Forecast the next hour
- Pre-warm capacity so the scale-out is done before users arrive

> ⚠️ **Gotcha**: a freshly added instance isn't useful until it has **warmed up** (JIT-compiled, caches populated, health checks passing). Auto-scaling that ignores warm-up will under-provision during real spikes.

## Scale-in safety
Terminating instances must **drain** — stop sending new requests, let in-flight ones finish, then exit. Otherwise you drop user requests mid-flight.
`,
  },

  /* ---- 3. Resilience patterns ---- */
  {
    id: 'c-6-resilience',
    title: 'Circuit Breaker, Bulkhead, Backpressure',
    summary: 'Three patterns that stop one slow dependency from taking down your whole system.',
    phaseId: 'phase-6',
    prerequisites: ['c-6-scaling-direction'],
    body: `# Resilience Patterns

When a dependency slows down or fails, naive systems make things *worse*: they queue up work, exhaust threads, and die. These three patterns prevent that.

## Circuit Breaker
Wrap every call to a risky dependency. Three states:

- **Closed** — normal operation, requests flow through.
- **Open** — after N consecutive failures, **stop calling** the dependency. Fail fast (or return a fallback). Give it time to recover.
- **Half-open** — let a single probe request through. If it succeeds, close the circuit; if it fails, re-open.

\`\`\`
        failure threshold
   Closed ─────────────────► Open
     ▲                         │
     │ probe succeeds          │ after timeout
     │                         ▼
   ◄── Half-open ◄─────────────
\`\`\`

> Why? Calling a sick service wastes resources and **makes it sicker** (more load during a partial outage). Failing fast protects both you and it.

## Bulkhead
Partition your resources so **one failing dependency can't consume everything**. The name comes from ship compartments — a hole below the waterline floods one bulkhead, not the whole ship.

- Dedicated **thread pools** per downstream service
- Dedicated **connection pools** per dependency
- A slow service A exhausts only A's pool; service B keeps working

Without bulkheads, a single slow dependency eats every available thread and your whole process is dead.

## Backpressure
When a **producer** is faster than its **consumer**, you must signal upstream to slow down. Three strategies:

| Strategy | What happens |
|---|---|
| **Drop** | Reject or discard the overflow (fail fast, lose events) |
| **Buffer** | Queue messages (bounded — unbounded queues are OOM bombs) |
| **Signal** | Tell the producer to slow down (reactive streams, TCP flow control) |

> 💡 **Unbounded queues are the silent killer.** Memory grows until the process is OOM-killed. Always bound your buffers and decide what happens when full.

## Together
Circuit breaker fails fast, bulkhead isolates the damage, backpressure protects the consumer. Combined, a downstream outage degrades your service instead of destroying it.
`,
  },

  /* ---- 4. Chaos Engineering & Cascading Failures ---- */
  {
    id: 'c-6-chaos-cascade',
    title: 'Chaos Engineering & Cascading Failures',
    summary: 'How one failing component topples the rest — and how chaos engineering finds the cracks before users do.',
    phaseId: 'phase-6',
    prerequisites: ['c-6-resilience'],
    body: `# Chaos Engineering & Cascading Failures

A **cascading failure** is when the failure of one component triggers the failure of others, until the whole system is down. The root cause is often small; the *amplification* is what's catastrophic.

## Anatomy of a cascade
Classic example: a database slows down slightly.

1. DB queries take 10× longer.
2. App servers hold connections 10× longer → **connection pool exhausted**.
3. New requests block waiting for a connection → threads pile up → **thread pool exhausted**.
4. Health checks start failing → load balancer drains the app servers.
5. Now **zero** capacity, even though the original DB is only *slow*, not down.

The blast radius grew because nothing failed fast and nothing isolated the damage.

## Common amplifiers
- **Retry storms** — clients retry on timeout, multiplying load on an already-sick service ("thundering herd").
- **Connection/thread pool exhaustion** — no bulkheads, one dependency eats everything.
- **Cache stampede** — cache expires and 10k requests hit the DB at once.
- **Cross-service dependencies** — service A depends on B depends on C; C fails, A and B fall like dominoes.
- **No backpressure** — queues grow unbounded until OOM.

## Defense in depth
| Pattern | Defends against |
|---|---|
| Circuit breaker | Calling a sick service |
| Bulkhead | One dependency eating all threads |
| Timeout | Waiting forever for a slow call |
| Rate limiting / load shedding | Overload during spikes |
| Graceful degradation | Returning a partial answer instead of failing |
| Bulk fail-fasts | Stopping the cascade early |

## Chaos engineering
**Chaos engineering** is the *deliberate* injection of failures into production to validate that those defenses actually work. Popularized by Netflix's **Chaos Monkey**.

The method:
1. Define a **steady-state hypothesis** — "p95 latency < 100ms, error rate < 0.1%".
2. **Inject a failure** — kill a node, add latency, drop network between services, expire a certificate.
3. **Observe** — did the system keep meeting the hypothesis, or did it cascade?
4. **Learn & fix** — patch the gap, then run the experiment again.

> ⚠️ **Game-days beat hope.** A resilience pattern you've never tested in production is a hypothesis, not a guarantee. Most "highly available" systems fail their first chaos game-day — and that's the point. You want to find the cracks on a Tuesday morning, not during Black Friday.

## Anti-fragility
The end goal isn't just surviving failure — it's **improving** under it. Each chaos experiment you survive makes the system stronger, because you fixed a real crack instead of a hypothetical one.
`,
  },
];

export const PHASE_6_QUESTS: Quest[] = [
  /* ---- 1. Lesson: scaling strategies ---- */
  {
    id: 'q-6-lesson-scaling',
    type: 'lesson',
    title: 'Scaling Strategies',
    phaseId: 'phase-6',
    order: 1,
    xpReward: 100,
    conceptId: 'c-6-scaling-direction',
    questions: [
      {
        id: 'q1',
        prompt: 'Your stateless web tier is hitting capacity at peak hours. What is the cleanest fix?',
        options: [
          'Buy a single server with twice the CPU',
          'Add more app server instances behind the load balancer',
          'Shard the database immediately',
          'Move everything to one bigger region',
        ],
        correctIndex: 1,
        explanation:
          'A stateless tier is the textbook case for horizontal scaling (scale out). Adding nodes has no hard ceiling and enables rolling upgrades.',
      },
      {
        id: 'q2',
        prompt: 'What is the main downside of vertical scaling ("scale up")?',
        options: [
          'It requires rewriting the application',
          'It introduces distributed-systems complexity',
          'There is a hard ceiling on machine size and resizing needs downtime',
          'It only works for NoSQL databases',
        ],
        correctIndex: 2,
        explanation:
          'Every machine has a max size, and resizing usually means a reboot. Stateful components (like a DB primary) often scale up until they hit this wall.',
      },
      {
        id: 'q3',
        prompt: 'Why does horizontal scaling require "stateless" app servers?',
        options: [
          'Because machines cannot have local disks',
          'Because any request can land on any node, so session/cache state must be externalized',
          'Because stateful logic is always buggy',
          'Because load balancers refuse stateful traffic',
        ],
        correctIndex: 1,
        explanation:
          'A load balancer may send request N+1 to a different node than request N. Session, auth, and cache state must live in a shared store (Redis, DB) so any node can serve any request.',
      },
      {
        id: 'q4',
        prompt: 'A relational DB primary is CPU-bound and you cannot shard it yet. Best first move?',
        options: [
          'Scale it vertically (bigger instance)',
          'Add 10 read replicas and send writes to them',
          'Add an index on every column so all queries are faster',
          'Disable indexes to save CPU',
        ],
        correctIndex: 0,
        explanation:
          'Reads can be offloaded to replicas, but a single-writer SQL primary is vertically bound — scaling up is usually the right lever until sharding is justified. Writes cannot go to read replicas.',
      },
    ],
  },

  /* ---- 2. Lesson: auto-scaling ---- */
  {
    id: 'q-6-lesson-autoscaling',
    type: 'lesson',
    title: 'Auto-Scaling Policies',
    phaseId: 'phase-6',
    order: 2,
    xpReward: 100,
    conceptId: 'c-6-autoscaling',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt: 'What is the primary purpose of a cooldown period in an auto-scaling policy?',
        options: [
          'To trigger scaling actions faster when load spikes',
          'To disable health checks during the scaling window',
          'To prevent thrashing where a metric blip causes rapid scale-out then immediate scale-in cycles',
          'To increase the maximum instance count automatically',
        ],
        correctIndex: 2,
        explanation:
          'Without a cooldown, a metric blip triggers a scale-out, the new capacity drives the metric back down, and you scale right back in — thrashing. Typical cooldowns are 3–5 minutes for scale-out and 10–15 minutes for scale-in, because newly added instances need time to warm up before they serve traffic.',
      },
      {
        id: 'q2',
        prompt: 'Which scaling policy matches "keep CPU at 60%" — the scaler does the math for you?',
        options: [
          'Target tracking',
          'Step scaling',
          'Scheduled scaling',
          'Predictive scaling',
        ],
        correctIndex: 0,
        explanation:
          'Target tracking is the simplest and most common policy: you specify a desired metric value (CPU 60%, queue depth 100) and the auto-scaler computes how many instances to add or remove to hit it. Step scaling and scheduled scaling require you to define the actions yourself.',
      },
      {
        id: 'q3',
        prompt: 'Why does predictive scaling outperform pure reactive scaling for spiky, time-of-day traffic?',
        options: [
          'It removes the need to collect any metrics',
          'It is always cheaper than reactive scaling regardless of workload',
          'It permanently pins the fleet to its maximum size',
          'It uses historical traffic patterns to pre-warm capacity before the spike arrives, so instances are ready when users show up',
        ],
        correctIndex: 3,
        explanation:
          'Reactive scaling only fires after the metric crosses a threshold, and freshly added instances need warm-up time — so users feel the spike before capacity catches up. Predictive scaling trains on weeks of history, forecasts the next hour, and provisions capacity in advance.',
      },
      {
        id: 'q4',
        prompt: 'What is the critical safety net that prevents a runaway metric from provisioning thousands of instances?',
        options: [
          'Disabling all cooldowns',
          'Setting min and max instance bounds on the auto-scaling group',
          'Using a longer warm-up time',
          'Sending all traffic through a single instance',
        ],
        correctIndex: 1,
        explanation:
          'Min/max bounds cap the fleet size. The minimum preserves a warm baseline; the maximum prevents a misbehaving metric (or attack-driven load) from scaling out unbounded and blowing up your bill. Always set both.',
      },
    ],
  },

  /* ---- 3. Lesson: resilience patterns ---- */
  {
    id: 'q-6-lesson-resilience',
    type: 'lesson',
    title: 'Circuit Breaker & Bulkhead',
    phaseId: 'phase-6',
    order: 3,
    xpReward: 100,
    conceptId: 'c-6-resilience',
    prerequisites: ['q-6-lesson-scaling'],
    questions: [
      {
        id: 'q1',
        prompt: 'A circuit breaker is in the "open" state. What does it do?',
        options: [
          'Sends all requests through as normal',
          'Fails fast without calling the downstream, giving it time to recover',
          'Permanently disables the dependency',
          'Doubles the request timeout',
        ],
        correctIndex: 1,
        explanation:
          'Open = stop calling the failing dependency and return immediately (or a fallback). After a cooldown, it goes half-open and probes with one request to test recovery.',
      },
      {
        id: 'q2',
        prompt: 'Without a bulkhead, what typically kills a service when one dependency slows down?',
        options: [
          'Disk fills up with logs',
          'The load balancer drops traffic',
          'Thread/connection pools get exhausted by the slow calls, starving everything else',
          'CPU overheats and the kernel panics',
        ],
        correctIndex: 2,
        explanation:
          'Slow calls hold threads and connections longer. With a shared pool, one sick dependency consumes all of them and healthy paths also stall. Bulkheads isolate pools per dependency.',
      },
      {
        id: 'q3',
        prompt: 'Your message queue grows without bound when the consumer falls behind. Best fix?',
        options: [
          'Add more producers',
          'Make the queue unbounded — it will catch up eventually',
          'Bound the queue and apply backpressure (drop, shed load, or signal the producer to slow down)',
          'Restart the consumer every hour',
        ],
        correctIndex: 2,
        explanation:
          'Unbounded queues are OOM bombs. Bound the buffer and decide a policy for overflow — drop, shed, or signal upstream. Backpressure protects the consumer and the process memory.',
      },
      {
        id: 'q4',
        prompt: 'What is the "half-open" state of a circuit breaker for?',
        options: [
          'It is a permanent failure state',
          'It lets a single probe request through to test whether the downstream has recovered',
          'It doubles traffic to test capacity',
          'It disables all timeouts',
        ],
        correctIndex: 1,
        explanation:
          'Half-open allows one (or a few) trial requests. Success → close the circuit and resume normal traffic. Failure → reopen. This avoids hammering a still-sick dependency.',
      },
    ],
  },

  /* ---- 4. Lesson: chaos engineering & cascading failures ---- */
  {
    id: 'q-6-lesson-chaos',
    type: 'lesson',
    title: 'Chaos Engineering & Cascades',
    phaseId: 'phase-6',
    order: 4,
    xpReward: 100,
    conceptId: 'c-6-chaos-cascade',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt: 'In a classic cascading failure, what typically happens after a database slows down (but does not crash)?',
        options: [
          'The system runs faster due to load redistribution',
          'The load balancer automatically provisions more database replicas',
          'App servers hold connections longer, exhausting connection and thread pools until health checks fail and the LB drains them',
          'Nothing — a slow database cannot cause an outage unless it fully crashes',
        ],
        correctIndex: 2,
        explanation:
          'This is the textbook cascade: slow queries hold connections longer → connection pool exhausted → threads pile up waiting → thread pool exhausted → health checks fail → LB drains app servers → zero capacity. The blast radius grew because nothing failed fast or isolated the damage.',
      },
      {
        id: 'q2',
        prompt: 'What is chaos engineering?',
        options: [
          'Deliberately injecting failures (kill a node, add latency, drop network) into production-like systems to validate that resilience defenses actually work',
          'A load-testing tool that finds your peak throughput but never breaks components',
          'A testing shortcut that replaces unit tests',
          'Rotating engineers on-call to keep them alert',
        ],
        correctIndex: 0,
        explanation:
          'Chaos engineering is the disciplined injection of failures — killing nodes, adding latency, dropping traffic between services — to test whether circuit breakers, bulkheads, timeouts, and failovers actually hold. Popularized by Netflix through its Chaos Monkey tool.',
      },
      {
        id: 'q3',
        prompt: 'Which of these is the most common amplifier that turns a small failure into a system-wide cascade?',
        options: [
          'Too few dashboards',
          'Using too many availability zones',
          'Having too many circuit breakers configured',
          'Retry storms — clients time out and retry, multiplying load on an already-sick service ("thundering herd")',
        ],
        correctIndex: 3,
        explanation:
          'Retry storms are a classic amplifier: clients time out and retry, often all at once, multiplying load on an already-sick service. Other common amplifiers include unbounded connection/thread pools, cache stampedes, cross-service dependency chains, and lack of backpressure.',
      },
      {
        id: 'q4',
        prompt: 'What is the first step of a chaos experiment, before injecting any failure?',
        options: [
          'Inject the biggest possible failure first so the results are meaningful',
          'Define a measurable steady-state hypothesis — e.g., "p95 latency < 100ms, error rate < 0.1%"',
          'Disable all alerts to reduce noise during the experiment',
          'Start with the most-used service because that is where bugs hide',
        ],
        correctIndex: 1,
        explanation:
          'Before injecting failure you must define what "healthy" looks like as a measurable steady-state hypothesis. Then inject a failure, observe whether the hypothesis still holds, and learn and fix if it does not. Without a hypothesis you cannot tell a successful experiment from a failed one.',
      },
    ],
  },

  /* ---- 5. Command Lab: autoscaling CLI ---- */
  {
    id: 'q-6-command-autoscale',
    type: 'command',
    title: 'Auto-Scaling CLI Lab',
    phaseId: 'phase-6',
    order: 5,
    xpReward: 150,
    intro:
      'Traffic is climbing. Use the terminal to inspect your deployment and configure horizontal auto-scaling for the `api` service.',
    prerequisites: ['q-6-lesson-resilience'],
    steps: [
      {
        prompt: 'Inspect the current replica count and status of the `api` deployment.',
        acceptedPatterns: [
          '^kubectl\\s+get\\s+(deploy|deployment|deployments)\\s+api\\b',
          '^kubectl\\s+get\\s+(deploy|deployment)\\b',
          '^kubectl\\s+describe\\s+(deploy|deployment)\\s+api\\b',
        ],
        sampleAnswer: 'kubectl get deployment api',
        hint: '`kubectl get deployment <name>` lists replicas, ready pods, and age.',
      },
      {
        prompt: 'Scale the `api` deployment horizontally to 6 replicas (manual scale-out).',
        acceptedPatterns: [
          '^kubectl\\s+scale\\s+deployment\\s+api\\s+--replicas=6\\b',
          '^kubectl\\s+scale\\s+deploy\\s+api\\s+--replicas=6\\b',
          '^kubectl\\s+scale\\s+deployment/api\\s+--replicas=6\\b',
        ],
        sampleAnswer: 'kubectl scale deployment api --replicas=6',
        hint: '`kubectl scale deployment <name> --replicas=N` performs an immediate manual scale-out.',
      },
      {
        prompt:
          'Configure a HorizontalPodAutoscaler: keep CPU near 70%, scaling between 3 and 10 replicas of `api`.',
        acceptedPatterns: [
          '^kubectl\\s+autoscale\\s+deployment\\s+api\\s+--cpu-percent=70\\s+--min=3\\s+--max=10\\b',
          '^kubectl\\s+autoscale\\s+deploy\\s+api\\s+--cpu-percent=70\\s+--min=3\\s+--max=10\\b',
          '^kubectl\\s+autoscale\\s+deployment/api\\s+--cpu-percent=70\\s+--min=3\\s+--max=10\\b',
          '^kubectl\\s+autoscale\\s+deployment\\s+api\\s+--min=3\\s+--max=10\\s+--cpu-percent=70\\b',
        ],
        sampleAnswer: 'kubectl autoscale deployment api --cpu-percent=70 --min=3 --max=10',
        hint:
          '`kubectl autoscale deployment <name> --cpu-percent=<target> --min=<lo> --max=<hi>` creates an HPA with target-tracking on CPU.',
      },
    ],
  },

  /* ---- 6. Architecture: scale horizontally with replicas + cache + primary/replica DB ---- */
  {
    id: 'q-6-arch-replicas',
    type: 'architecture',
    title: 'Scale Out the API',
    phaseId: 'phase-6',
    order: 6,
    xpReward: 250,
    brief:
      'ScaleUp Inc. just landed a big contract — the API now needs to handle 15,000 reads/sec at p95 under 90 ms, 99.99% availability, under $4,000/month. The traffic is 90% reads, so cache aggressively and read from replicas; keep writes on the primary. Add enough app replicas behind the load balancer to clear the throughput bar.',
    allowedComponents: ['lb-l7-nginx', 'app-node', 'db-postgres', 'db-postgres-replica', 'redis'],
    requiredComponentTypes: ['loadBalancer', 'appServer', 'dbSQL'],
    target: {
      minRps: 15_000,
      maxLatencyP95: 90,
      minAvailability: 0.9999,
      maxCostPerMonth: 1_950,
    },
    traffic: { rps: 15_000, readRatio: 0.9 },
    prerequisites: ['q-6-command-autoscale'],
  },

  /* ---- 7. Incident: cascading failure ---- */
  {
    id: 'q-6-incident-cascade',
    type: 'incident',
    title: 'Incident: The Slow Death',
    phaseId: 'phase-6',
    order: 7,
    xpReward: 200,
    failureDescription:
      'At 03:11, on-call gets paged: the API error rate has climbed from 0.1% to 38% in six minutes. Latency is climbing. Users are seeing 504s. The dashboard shows DB query time jumped ~9× (10ms → 90ms), then app server memory spiked, then health checks started failing.',
    symptoms: [
      'DB primary query latency jumped from 10ms to 90ms (still "up", just slow)',
      'App server memory is at 95% and rising; pods are being OOM-killed',
      'Active DB connections pinned at the pool max (100/100)',
      'New requests block for ~30s waiting for a connection, then 504',
      'Error rate now 38% and climbing — but the database itself never went "down"',
    ],
    prerequisites: ['q-6-arch-replicas'],
    steps: [
      [
        {
          id: 'a',
          label:
            'The database is down. Page the DBA and fail over to a replica immediately.',
          isCorrect: false,
          feedback:
            'Tempting, but the DB never went down — it just got slow. A blind failover under load is risky and does not address why one slow dependency toppled the whole API. Diagnose the cascade first.',
        },
        {
          id: 'b',
          label:
            'A query-plan regression made the DB slow. There is no bulkhead around DB calls, so slow queries exhausted the connection pool, threads piled up, memory blew out, and pods got OOM-killed. Mitigate by shedding load + bounding pools, then fix the plan.',
          isCorrect: true,
          feedback:
            'Correct. This is a textbook cascading failure: a small upstream slowness (slow queries) was amplified by an unbounded, shared connection pool into a full outage. Short-term: load-shed, lower pool size, add a timeout/bulkhead. Long-term: fix the query plan and add circuit breakers on the DB path.',
        },
        {
          id: 'c',
          label:
            'A bad code deploy leaked memory. Roll back the deploy and the system will recover.',
          isCorrect: false,
          feedback:
            'The high memory is real, but it is a *symptom* of threads piling up on blocked DB calls — not the root cause. Rolling back might help, but if the slow DB queries persist, the next deploy will cascade the same way. Find the trigger.',
        },
        {
          id: 'd',
          label:
            'The load balancer is misrouting traffic. Rebalance and the errors will stop.',
          isCorrect: false,
          feedback:
            'Nothing in the symptoms points at the LB — connection pool exhaustion and OOM kills are downstream of the LB. Misdiagnosis wastes the critical first minutes of an incident.',
        },
      ],
      [
        {
          id: 'a',
          label:
            'Put a circuit breaker + bounded connection pool with timeouts on the DB path, and load-shed once utilization crosses a threshold',
          isCorrect: true,
          feedback:
            'Correct. Fail fast: a bounded pool + timeout stops one slow dependency from eating every thread; a circuit breaker trips so callers get a controlled error instead of piling up. Load-shedding keeps the healthy fraction of traffic flowing.',
        },
        {
          id: 'b',
          label:
            'Raise the connection pool to 10,000 so there is always a free connection',
          isCorrect: false,
          feedback:
            'Wrong — more connections just lets the DB accumulate more slow work and the app hold more memory, accelerating the OOM. The missing ingredient is a bound (bulkhead) and failing fast, not an unbounded buffer.',
        },
        {
          id: 'c',
          label: 'Remove all timeouts so requests never fail mid-flight',
          isCorrect: false,
          feedback:
            'Wrong. Removing timeouts is exactly how a 30s hang became a 504 cascade. Timeouts are what let a system fail fast and recover; without them, one slow dependency holds resources indefinitely.',
        },
        {
          id: 'd',
          label: 'Permanently route all traffic to a single read replica',
          isCorrect: false,
          feedback:
            'Wrong. This does nothing about the cascade mechanism (unbounded pools) and a single replica is now a new SPOF. Address the failure mode, don\'t reshuffle where it happens.',
        },
      ],
    ],
  },

  /* ---- 8. Capstone: streaming service ---- */
  {
    id: 'q-6-capstone',
    type: 'architecture',
    title: 'Capstone: Design a Streaming Service',
    phaseId: 'phase-6',
    order: 8,
    xpReward: 500,
    brief:
      'You are the lead architect for "Streamly", a Netflix-like video streaming service. Catalog browsing and video metadata are 98% reads and must feel instant worldwide — edge caching is mandatory. Design a path that survives 25,000 req/sec at p95 under 70 ms, 99.99% availability, under $5,000/month. Use a CDN at the edge, a load balancer in front of stateless app servers, a cache for hot metadata, and a NoSQL store for the catalog. Kafka is available if you want to ingest watch events asynchronously.',
    allowedComponents: [
      'cdn-cloudflare',
      'lb-l7-nginx',
      'gateway-api',
      'app-node',
      'db-mongo',
      'redis',
      's3',
      'kafka',
    ],
    requiredComponentTypes: ['cdn', 'loadBalancer', 'appServer', 'cache', 'dbNoSQL'],
    target: {
      minRps: 25_000,
      maxLatencyP95: 70,
      minAvailability: 0.9999,
      maxCostPerMonth: 2_100,
    },
    traffic: { rps: 25_000, readRatio: 0.98 },
    prerequisites: ['q-6-incident-cascade'],
  },
];
