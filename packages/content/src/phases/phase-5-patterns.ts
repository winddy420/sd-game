import type { Concept, Quest } from '../types';

/**
 * Phase 5 — System Design Patterns
 *
 * Concepts: load balancing, message queues, microservices vs monolith,
 * event-driven architecture. Quests progress from lessons → CLI lab →
 * architecture challenges → incident → capstone.
 */

export const PHASE_5_CONCEPTS: Concept[] = [
  {
    id: 'c-5-load-balancing',
    title: 'Load Balancing',
    summary:
      'Distributing traffic across servers: L4 vs L7, and the algorithms (round-robin, least-connections, IP-hash) that decide who handles each request.',
    phaseId: 'phase-5',
    body: `# Load Balancing

A **load balancer (LB)** sits in front of your servers and spreads incoming requests across them, so no single server becomes a bottleneck.

## Why you need one
- **Availability**: if a server dies, traffic flows to the survivors — users never notice.
- **Scale**: add more servers behind the LB to handle more load (horizontal scaling).
- **Health checking**: the LB continuously probes backends and removes sick ones from rotation.

## Layer 4 vs Layer 7
| | L4 | L7 |
|---|---|---|
| Operates on | TCP/UDP connections | HTTP/HTTPS requests |
| Sees | IPs, ports | Path, headers, cookies, host |
| Overhead | Very low | Slightly higher (parses request) |
| Smart routing | ❌ | ✅ (route by URL, host, header) |
| Examples | AWS NLB, HAProxy (TCP) | Nginx, AWS ALB, Envoy, HAProxy (HTTP) |

L7 can do **path-based routing**: \`/api/*\` → app servers, \`/images/*\` → CDN origin, \`/ws/*\` → websocket service.
L4 just balances bytes — it can't see inside the protocol.

## Common algorithms
- **Round-robin**: each server takes a turn in order. Simple and fair *when all servers are equally powerful*.
- **Least-connections**: send to the server with the fewest active requests. Wins when request cost varies (some are slow).
- **IP-hash**: hash the client IP → the same client always lands on the same server. Enables **sticky sessions** without cookies.
- **Random**: pick a backend at random. Cheap, occasionally uneven.
- **Weighted round-robin**: round-robin with manual weights — send more traffic to bigger servers.

> ⚠️ Round-robin assumes identical servers. If \`app-1\` is a 4-core box and \`app-2\` is a 16-core box, round-robin will overload \`app-1\`. Use weighted or least-connections instead.

## Health checks
The LB pings each backend on an interval (e.g. \`GET /health\` every 5s). A server that fails N checks in a row is **drained** (removed from rotation). If it recovers and passes again, it's added back — automatically.

## Typical topology
\`\`\`
              ┌─ app-1
clients ─→ [LB] ─┼─ app-2
              └─ app-3
\`\`\`

## Rule of thumb
Put an L7 LB in front of stateless app servers whenever you have more than one instance. It's the cheapest availability & scale win in system design.
`,
  },
  {
    id: 'c-5-message-queues',
    title: 'Message Queues & Async Decoupling',
    summary:
      'Kafka vs RabbitMQ, at-least-once delivery, dead-letter queues, and when async decoupling turns a slow flow into a fast one.',
    phaseId: 'phase-5',
    prerequisites: ['c-5-load-balancing'],
    body: `# Message Queues

A **message queue** decouples the *producer* of work from the *consumer* of work. Producers push messages onto a queue; workers pull them off and process at their own pace.

## Why queues (async decoupling)
- **Absorb spikes**: 100k sign-ups in a minute? Queue them; workers process steadily behind.
- **Decouple services**: the producer doesn't care if the consumer is slow, scaling, or briefly down.
- **Reliability**: messages persist on the broker — if a consumer crashes mid-task, the message is redelivered.
- **Scale independently**: add more workers to drain the queue faster.

**Without a queue**: a slow downstream (sending email, generating a PDF, calling a flaky API) blocks the user's HTTP request — they stare at a spinner.
**With a queue**: the API publishes \`OrderPlaced\` and immediately returns \`202 Accepted\`. The user is done; the work happens later.

## Kafka vs RabbitMQ
| | Kafka | RabbitMQ |
|---|---|---|
| Model | Distributed **append-only log** (topics, partitions) | Traditional **broker** (queues, exchanges, bindings) |
| Retention | Days/weeks — messages stay, you can **replay** | Deleted once acknowledged |
| Throughput | Massive (100k+ msgs/sec per partition) | Moderate (10k–50k/sec) |
| Ordering | Per-partition | Per-queue |
| Routing | Topic + partition key | Rich (direct, fanout, topic, headers) |
| Best for | Event streaming, analytics, CDC, audit log | Task queues, RPC, work dispatch, fanout |
| Message size | Small, many | Flexible (larger OK) |

> Rule of thumb: **RabbitMQ** for "do this task now" work queues. **Kafka** for "stream of events" pipelines you may want to replay from the beginning.

## Common patterns
- **Work queue**: one producer, many workers share a single queue (each message handled once).
- **Pub/sub**: one message → many independent subscribers (Kafka consumer groups, RabbitMQ fanout).
- **Dead-letter queue (DLQ)**: messages that fail N times are routed here for inspection — keeps the main queue healthy.

## Delivery semantics
- **At-most-once**: may drop, never duplicates. (Fire-and-forget.)
- **At-least-once**: never drop, may deliver duplicates. → Consumers **must be idempotent**.
- **Exactly-once**: hard; needs transactions across producer+broker+consumer. Kafka supports it within its own topics.

> ⚠️ Most production systems run **at-least-once** and design consumers to safely handle duplicates (e.g. dedupe on an idempotency key like \`order_id\`).
`,
  },
  {
    id: 'c-5-microservices',
    title: 'Microservices vs Monolith',
    summary:
      'Trade-offs of splitting an app into independently deployable services, and the signals that tell you when to split.',
    phaseId: 'phase-5',
    prerequisites: ['c-5-message-queues'],
    body: `# Microservices vs Monolith

## Monolith
One codebase, one deployable. All features (auth, billing, UI, search) live in the same process.

**Pros**
- Simple to build, deploy, test, and run locally.
- Cross-feature refactors are a single PR — function calls, not network hops.
- One CI/CD pipeline, one thing to monitor.

**Cons** (at scale)
- Deploys couple: a one-line change to billing redeploys everything.
- The codebase rots as hundreds of engineers edit it.
- One bug (memory leak, OOM) can take the *whole* system down.
- You can't scale just the hot part — you scale the whole monolith.

## Microservices
Features are split into independently deployable services, **each owning its own data**.

**Pros**
- Independent deploys & release cadence.
- Scale the parts that need it (the search service can have 50 pods; billing 2).
- Clear ownership boundaries (team X owns service Y).
- Failure is isolated — a bug in \`ratings\` doesn't take down \`checkout\`.
- Polyglot: each service picks the right tool for its job.

**Cons**
- Network calls replace function calls → latency, retries, timeouts, partial failures.
- Distributed transactions are **hard** → use sagas, outbox pattern, eventual consistency.
- Operational overhead: more services to monitor, deploy, trace, version.
- Data duplication: services copy data they need from each other.

## When to split
| Signal | Action |
|---|---|
| Small team, MVP, unclear product boundary | **Stay monolith** |
| Deploy collisions between teams | Split along team boundaries |
| One part needs 10× the scale of the rest | Extract just that service |
| Different release cadence / polyglot need | Extract that service |

> ⚠️ **Conway's Law**: your architecture mirrors your org chart. Split services where teams split — not where the code "feels" separable.

## Service-to-service communication
- **Sync** (REST / gRPC): simple, request/response. Couples latency & availability — if \`inventory\` is down, \`checkout\` fails.
- **Async** (queue / events): decoupled, eventual consistency. \`checkout\` publishes \`OrderPlaced\` and moves on; \`inventory\` reacts when it can.

## Common pitfalls
- **Distributed monolith**: services that must deploy together, or that call each other synchronously on every request. You pay both costs and get neither benefit.
- **Shared database**: if five services read/write the same Postgres schema, they are not independent — schema changes break them all. Each service should own its data.
`,
  },
  {
    id: 'c-5-event-driven',
    title: 'Event-Driven Architecture',
    summary:
      'Pub/sub, the event-as-fact mindset, eventual consistency, and why idempotent consumers are mandatory.',
    phaseId: 'phase-5',
    prerequisites: ['c-5-microservices'],
    body: `# Event-Driven Architecture

In **event-driven architecture (EDA)**, services communicate by emitting and reacting to **events** — immutable facts about things that happened: \`OrderPlaced\`, \`PaymentCaptured\`, \`UserSignedUp\`.

## Pub/Sub
- A **producer** publishes an event to a topic on a broker (Kafka, RabbitMQ, SNS, EventBridge).
- **Subscribers** (consumers) react independently.
- The producer does **not** know — or care — who consumes.

\`\`\`
                ┌─► EmailService      (send confirmation)
OrderService ───┼─► InventoryService  (reserve stock)
                └─► AnalyticsService  (update dashboard)
\`\`\`

Adding a new reaction = subscribe a new consumer. **Zero changes to the producer.** This is EDA's superpower.

## Events vs commands
- **Event** (fact, past tense): \`OrderPlaced\` — "this happened." Anyone may subscribe.
- **Command** (imperative): \`SendInvoice\` — "please do this." Usually one target.

Mixing them up creates tight coupling. Default to events.

## Eventual consistency
Events flow asynchronously, so state propagates with a delay — milliseconds to seconds. Two services may briefly disagree about the state of the world.

| Need | Pick |
|---|---|
| "Is this payment approved right now?" | Sync call (need the answer to proceed) |
| "When an order is placed, update 5 downstream systems" | Async event (decouple, scale, tolerate lag) |

For multi-step workflows that need some consistency, use a **saga** — a sequence of events with compensating actions on failure (e.g. \`OrderPlaced\` → \`PaymentCaptured\` → \`StockReserved\`; if payment fails, emit \`OrderCancelled\`).

## Key building blocks
- **Event**: immutable record (\`{ type, orderId, total, occurredAt }\`).
- **Broker**: Kafka, RabbitMQ, SNS/SQS, EventBridge, Pulsar.
- **Consumer group**: scales consumption — Kafka assigns each partition to exactly one worker in the group.
- **DLQ**: events that fail N times land here for human inspection.

## When EDA wins
- Many independent reactions to the same event (fan-out).
- Bursty traffic — the broker absorbs spikes producers can't slow down for.
- Loose coupling & independent team velocity.

## When to avoid
- You need a synchronous answer (e.g. a payment authorization) — use a sync call instead, then emit an event for downstream.
- Strict, real-time consistency across services.

> Idempotent consumers are **mandatory**. Brokers deliver at-least-once, so the same event *will* arrive twice at some point. Dedupe on the event id or natural key.
`,
  },
];

export const PHASE_5_QUESTS: Quest[] = [
  /* ---- Lesson: Load balancing ---- */
  {
    id: 'q-5-lesson-lb',
    type: 'lesson',
    title: 'Load Balancing Algorithms',
    phaseId: 'phase-5',
    order: 1,
    xpReward: 100,
    conceptId: 'c-5-load-balancing',
    questions: [
      {
        id: 'q1',
        prompt:
          'Your servers handle a mix of fast (5ms) and slow (2s) requests. Which LB algorithm avoids piling new work onto a server already busy with slow ones?',
        options: ['Round-robin', 'Least-connections', 'IP-hash', 'Random'],
        correctIndex: 1,
        explanation:
          'Least-connections sends each new request to the server with the fewest active requests, naturally avoiding servers bogged down with slow work. Round-robin ignores in-flight load.',
      },
      {
        id: 'q2',
        prompt: 'Which is a real difference between an L4 and an L7 load balancer?',
        options: [
          'L4 inspects HTTP headers; L7 only sees IPs',
          'L7 can route by URL path or host header; L4 only balances TCP connections',
          'L4 supports more algorithms than L7',
          'There is no real difference — only marketing',
        ],
        correctIndex: 1,
        explanation:
          'L7 parses the HTTP request, so it can route /api/* to one pool and /images/* to another. L4 operates on connections and can\'t see inside the protocol.',
      },
      {
        id: 'q3',
        prompt:
          'You need sticky sessions — the same user should keep hitting the same backend server. Which algorithm gives you that without cookies?',
        options: ['Round-robin', 'Least-connections', 'IP-hash', 'Random'],
        correctIndex: 2,
        explanation:
          'IP-hash maps the client IP to a fixed backend, so the same user always lands on the same server — sticky sessions with no session state stored anywhere.',
      },
      {
        id: 'q4',
        prompt:
          'A backend starts returning 500s. The load balancer has health checks configured. What happens?',
        options: [
          'It sends double traffic to the failing server to confirm',
          'It removes the server from rotation until it passes health checks again',
          'It shuts down the entire backend pool',
          'Nothing — load balancers don\'t check backend health',
        ],
        correctIndex: 1,
        explanation:
          'Health checks (e.g. GET /health every few seconds) detect failure, drain the sick server, and route traffic only to healthy ones. When it recovers, it\'s added back automatically.',
      },
    ],
  },

  /* ---- Lesson: Queues & async ---- */
  {
    id: 'q-5-lesson-queue',
    type: 'lesson',
    title: 'Queues & Async Decoupling',
    phaseId: 'phase-5',
    order: 2,
    xpReward: 100,
    conceptId: 'c-5-message-queues',
    prerequisites: ['q-5-lesson-lb'],
    questions: [
      {
        id: 'q1',
        prompt:
          'Your API calls a slow email-sending service synchronously, and users wait 3s for the response. You insert a queue between them. What is the main benefit to the user?',
        options: [
          'The API returns immediately (e.g. 202 Accepted) instead of blocking on email',
          'Emails are deleted automatically after sending',
          'The queue replaces your database',
          'Emails are sent faster per-message',
        ],
        correctIndex: 0,
        explanation:
          'Decoupling turns a synchronous wait into fire-and-forget: the API publishes an event and returns instantly. The email still takes the same time to send, but the user no longer blocks on it.',
      },
      {
        id: 'q2',
        prompt:
          'You are building an analytics pipeline that must replay the last 7 days of events if a bug is fixed. Which broker fits best?',
        options: ['RabbitMQ', 'Kafka', 'Neither — use a cron job', 'Both equally'],
        correctIndex: 1,
        explanation:
          'Kafka retains messages for days/weeks by configuration and lets consumers reset their offset to replay from any point. RabbitMQ deletes messages once acknowledged.',
      },
      {
        id: 'q3',
        prompt:
          'Your broker delivers at-least-once. The same \`OrderPlaced\` event arrives twice. What must your consumer be?',
        options: ['Stateless', 'Idempotent', 'Synchronous', 'Stateful and transactional'],
        correctIndex: 1,
        explanation:
          'At-least-once means duplicates will happen. An idempotent consumer (e.g. dedupe on order_id, or use INSERT ... ON CONFLICT DO NOTHING) safely processes the duplicate with no side effect.',
      },
      {
        id: 'q4',
        prompt: 'A message fails to process 5 times in a row (poison message). Where should it go?',
        options: [
          'Back to the head of the queue',
          'A dead-letter queue (DLQ) for inspection',
          'Discarded silently',
          'Emailed to every user',
        ],
        correctIndex: 1,
        explanation:
          'A DLQ captures messages that exceed the retry limit so they don\'t block the live queue forever. Operators inspect the DLQ to fix the root cause and replay if needed.',
      },
    ],
  },

  /* ---- Command Lab: Kafka CLI ---- */
  {
    id: 'q-5-command-kafka',
    type: 'command',
    title: 'Kafka CLI Lab',
    phaseId: 'phase-5',
    order: 3,
    xpReward: 150,
    intro:
      'You are wiring up an event-driven orders pipeline. Use the Kafka CLI tools to create a topic, publish an event, and read it back from the broker at localhost:9092.',
    prerequisites: ['q-5-lesson-queue'],
    steps: [
      {
        prompt:
          'Create a Kafka topic named `orders` with 3 partitions and replication factor 1.',
        acceptedPatterns: [
          'kafka-topics.*--bootstrap-server.*--create.*--topic\\s+orders.*--partitions\\s+3.*--replication-factor\\s+1',
          'kafka-topics.*--create.*--topic\\s+orders.*--partitions\\s+3.*--replication-factor\\s+1',
          'kafka-topics.*--create.*--topic\\s+orders.*--replication-factor\\s+1.*--partitions\\s+3',
        ],
        sampleAnswer:
          'kafka-topics --bootstrap-server localhost:9092 --create --topic orders --partitions 3 --replication-factor 1',
        hint:
          'Use `kafka-topics --create --topic orders --partitions 3 --replication-factor 1 --bootstrap-server localhost:9092`.',
      },
      {
        prompt:
          'Publish a JSON order event to the `orders` topic using the console producer.',
        acceptedPatterns: [
          'kafka-console-producer.*--bootstrap-server.*--topic\\s+orders',
          'kafka-console-producer.*--topic\\s+orders',
        ],
        sampleAnswer:
          'echo \'{"order_id": 42, "total": 99.50}\' | kafka-console-producer --bootstrap-server localhost:9092 --topic orders',
        hint:
          'Pipe JSON into `kafka-console-producer --bootstrap-server localhost:9092 --topic orders`, or run it interactively and type a message.',
      },
      {
        prompt: 'Read messages back from the `orders` topic, starting from the earliest offset.',
        acceptedPatterns: [
          'kafka-console-consumer.*--bootstrap-server.*--topic\\s+orders.*--from-beginning',
          'kafka-console-consumer.*--topic\\s+orders.*--from-beginning',
        ],
        sampleAnswer:
          'kafka-console-consumer --bootstrap-server localhost:9092 --topic orders --from-beginning',
        hint:
          '`kafka-console-consumer --bootstrap-server localhost:9092 --topic orders --from-beginning` replays every message in the topic.',
      },
    ],
  },

  /* ---- Architecture: decouple with a queue ---- */
  {
    id: 'q-5-arch-queue',
    type: 'architecture',
    title: 'Decouple a Write-Heavy Flow',
    phaseId: 'phase-5',
    order: 4,
    xpReward: 250,
    brief:
      "ScaleUp's order-placement API is buckling under flash-sale traffic. Writes (placing orders) are slow, and the user waits for them to complete. Decouple the write path: the app accepts the request, publishes an event to Kafka, and returns immediately (202 Accepted) — a worker drains the queue and persists orders to Postgres. Put Redis in front of the DB to cache the read-heavy lookups. Hit p95 ≤ 100 ms, ≥ 6,000 rps, ≥ 99.9% availability, ≤ $3,500/month.",
    allowedComponents: ['gateway-api', 'app-node', 'kafka', 'db-postgres', 'redis'],
    requiredComponentTypes: ['appServer', 'queue', 'dbSQL'],
    target: {
      minRps: 6_000,
      maxLatencyP95: 100,
      maxCostPerMonth: 3_500,
      minAvailability: 0.999,
    },
    traffic: { rps: 6_000, readRatio: 0.6 },
    prerequisites: ['q-5-command-kafka'],
  },

  /* ---- Incident: queue backlog / consumer lag ---- */
  {
    id: 'q-5-incident-backlog',
    type: 'incident',
    title: 'Incident: Order Confirmations Delayed 10+ Minutes',
    phaseId: 'phase-5',
    order: 5,
    xpReward: 250,
    failureDescription:
      "At 09:14 (flash-sale launch), order placement still works — API p95 latency is a healthy 60 ms — but customers report order-confirmation emails arriving 10–15 minutes late. The email service itself is up and responds in 30 ms when called directly.",
    symptoms: [
      'Order-placement API p95 latency is normal (~60 ms) — writes are fast',
      'Kafka consumer lag on the `orders` topic is climbing: 50k+ unprocessed messages and growing',
      'The single email-worker container is pegged at 100% CPU',
      'The downstream email service responds in ~30 ms when called directly',
    ],
    prerequisites: ['q-5-arch-queue'],
    steps: [
      [
        {
          id: 'a',
          label: 'Restart the Kafka broker',
          isCorrect: false,
          feedback:
            "Wrong — the broker is healthy; messages are flowing in fine. The lag is a consumption problem, not a production/broker problem. Restarting risks losing in-flight messages.",
        },
        {
          id: 'b',
          label: 'Scale out email workers (add consumers to the consumer group)',
          isCorrect: true,
          feedback:
            'Correct! Consumer lag = producers are outpacing consumers. Adding consumers (and matching partitions) drains the backlog. This is the textbook fix for queue lag.',
        },
        {
          id: 'c',
          label: 'Increase the Kafka replication factor',
          isCorrect: false,
          feedback:
            'Wrong — replication improves durability, not throughput. It would not reduce consumer lag; if anything it adds broker overhead.',
        },
        {
          id: 'd',
          label: 'Disable confirmation emails to clear the backlog',
          isCorrect: false,
          feedback:
            "Wrong — that hides the symptom and breaks a user-facing feature. Fix the bottleneck (consumer throughput) instead of deleting the work.",
        },
      ],
    ],
  },

  /* ---- Capstone: E-commerce Checkout ---- */
  {
    id: 'q-5-capstone',
    type: 'architecture',
    title: 'Capstone: E-commerce Checkout',
    phaseId: 'phase-5',
    order: 6,
    xpReward: 500,
    brief:
      "You are now the lead architect. Design ScaleUp's checkout system for a flash-sale launch: 8,000 rps with 70% reads (cart/price/product lookups), p95 ≤ 120 ms, ≥ 99.95% availability, ≤ $4,500/month. The checkout flow must (1) place orders as writes without losing them if a downstream is slow — decouple writes with a queue, (2) serve cart & product reads from a cache, and (3) persist the source of truth in Postgres. Use a CDN at the edge and a load balancer in front of the app tier for availability. Plan for redundancy — 99.95% means no single point of failure.",
    allowedComponents: [
      'cdn-cloudflare',
      'lb-l7-nginx',
      'gateway-api',
      'app-node',
      'kafka',
      'db-postgres',
      'db-postgres-replica',
      'redis',
    ],
    requiredComponentTypes: ['gateway', 'appServer', 'queue', 'dbSQL', 'cache'],
    target: {
      minRps: 8_000,
      maxLatencyP95: 120,
      maxCostPerMonth: 4_500,
      minAvailability: 0.9995,
    },
    traffic: { rps: 8_000, readRatio: 0.7 },
    prerequisites: ['q-5-incident-backlog'],
  },
];
