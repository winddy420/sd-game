import type { Concept, Quest } from '../types';

export const PHASE_1_CONCEPTS: Concept[] = [
  {
    id: 'c-http-basics',
    title: 'HTTP/HTTPS Basics',
    summary: 'How clients & servers talk: requests, responses, methods, and status codes.',
    phaseId: 'phase-1',
    body: `# HTTP/HTTPS Basics

**HTTP** is the protocol of the web. A **client** (browser, app) sends a **request**; a **server** returns a **response**.

## Request anatomy
\`\`\`
GET /users/42 HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>
\`\`\`
- **Method**: what you want to do
- **Path**: which resource
- **Headers**: metadata

## Methods
| Method | Purpose | Idempotent? |
|---|---|---|
| GET | Read | ✅ |
| POST | Create | ❌ |
| PUT | Replace (whole) | ✅ |
| PATCH | Partial update | ❌ |
| DELETE | Remove | ✅ |

**Idempotent** = calling it N times has the same effect as calling once. Critical for safe retries.

## Status codes (group by first digit)
- **1xx** Informational
- **2xx** Success — \`200 OK\`, \`201 Created\`, \`204 No Content\`
- **3xx** Redirect — \`301 Moved\`, \`304 Not Modified\`
- **4xx** Client error — \`400 Bad Request\`, \`401 Unauthorized\`, \`403 Forbidden\`, \`404 Not Found\`, \`429 Too Many Requests\`
- **5xx** Server error — \`500 Internal\`, \`502 Bad Gateway\`, \`503 Unavailable\`, \`504 Gateway Timeout\`

> ⚠️ **401 vs 403**: 401 = "who are you?" (not authenticated). 403 = "I know who you are, but you can't" (not authorized).

## HTTPS
HTTP over **TLS** — encrypts traffic so intermediaries can't read or tamper with it. Always use HTTPS in production.
`,
  },
  {
    id: 'c-tcp-udp',
    title: 'TCP vs UDP',
    summary: 'Reliable ordered delivery (TCP) vs fire-and-forget speed (UDP).',
    phaseId: 'phase-1',
    prerequisites: ['c-http-basics'],
    body: `# TCP vs UDP

The transport layer moves bytes between two machines.

## TCP — reliable, ordered, connection-based
1. **Three-way handshake**: SYN → SYN-ACK → ACK (costs 1 round trip before data)
2. Guarantees delivery, order, no duplicates
3. Used by: HTTP, HTTPS, databases, SSH

Trade-off: that handshake + acknowledgements add **latency**.

## UDP — fast, best-effort, connectionless
- No handshake, no guarantee of delivery or order
- Used by: DNS, video calls, gaming, QUIC (HTTP/3)
- Cheaper latency; app must handle loss

## When to pick which
| Need | Pick |
|---|---|
| Every byte must arrive in order | TCP |
| Lowest latency, can tolerate loss | UDP |
| Live video / voice | UDP |
| File download, transactions | TCP |
`,
  },
  {
    id: 'c-dns',
    title: 'DNS — The Phonebook of the Internet',
    summary: 'How domain names become IP addresses, and why it matters for latency.',
    phaseId: 'phase-1',
    prerequisites: ['c-http-basics'],
    body: `# DNS

**DNS** translates \`api.example.com\` → \`93.184.216.34\`. Before any HTTP request can be made, the client must resolve the name.

## Resolution chain
1. Browser/OS **cache** (fastest if present)
2. **Recursive resolver** (your ISP / 8.8.8.8)
3. **Root** → **TLD** (\`.com\`) → **Authoritative** nameservers
4. Returns the IP

## Why it matters
- A cold DNS lookup can take **20–120 ms** (multiple round trips).
- Cached lookouts are ~1 ms.
- **TTL** controls how long results are cached.

## Failure mode
If DNS is down, **nothing works** — clients literally cannot find you. That's why DNS is highly available (\`0.99999\`) and why outages there are catastrophic.
`,
  },
  {
    id: 'c-cdn',
    title: 'CDN & Latency',
    summary: 'Edge caches cut latency and cost by serving content close to users.',
    phaseId: 'phase-1',
    prerequisites: ['c-dns'],
    body: `# CDN & Latency

A **CDN** (Content Delivery Network) copies your static assets (images, JS, cached HTML) to **edge locations** around the world.

## The latency problem
Speed of light + network hops mean a request to a far-away server is slow:
- Same city: ~5 ms
- Cross-continent: ~80–150 ms
- Opposite side of Earth: ~250+ ms

## How a CDN helps
1. User requests \`cdn.example.com/logo.png\`
2. CDN's **nearby edge** serves it (~5 ms) instead of your origin
3. Origin only sees **cache misses** (~10% of traffic)

## What you get
- ⚡ Lower latency for users everywhere
- 💰 Lower origin load → lower cost
- 🛡️ Absorbs traffic spikes & DDoS

## Rule of thumb
**Put static / cacheable content behind a CDN.** Dynamic, per-user data still hits your origin.
`,
  },
  {
    id: 'c-api-styles',
    title: 'REST vs gRPC vs GraphQL',
    summary: 'Three ways to design an API and when each wins.',
    phaseId: 'phase-1',
    prerequisites: ['c-http-basics'],
    body: `# REST vs gRPC vs GraphQL

## REST
- Resources as URLs (\`GET /users/42\`), HTTP methods as verbs
- Stateless, cacheable, ubiquitous
- **Best for**: public APIs, simple CRUD, browser-friendly services

## gRPC
- Binary **Protocol Buffers** over HTTP/2
- Strict schema, code generation, bidirectional streaming
- **Best for**: internal service-to-service, low latency, polyglot microservices

## GraphQL
- Single endpoint, client queries exactly the fields it needs
- Solves over/under-fetching
- **Best for**: flexible client-driven queries (mobile apps with varied needs)

| Criterion | REST | gRPC | GraphQL |
|---|---|---|---|
| Browser-native | ✅ | ❌ | ✅ |
| Schema-first | optional | ✅ | ✅ |
| Streaming | ❌ | ✅ | ⚠️ |
| Internal perf | 🟡 | ✅ | 🟡 |
`,
  },
];

export const PHASE_1_QUESTS: Quest[] = [
  /* ---- Lesson: HTTP status codes ---- */
  {
    id: 'q-1-lesson-http',
    type: 'lesson',
    title: 'HTTP Status Codes',
    phaseId: 'phase-1',
    order: 1,
    xpReward: 100,
    conceptId: 'c-http-basics',
    questions: [
      {
        id: 'q1',
        prompt: 'A user tries to view a profile that does not exist. What status code?',
        options: ['200 OK', '404 Not Found', '500 Internal Server Error', '301 Moved'],
        correctIndex: 1,
        explanation: '404 = the resource was not found. It is a client error (4xx), not a server fault.',
      },
      {
        id: 'q2',
        prompt: 'A client sends a request with an expired auth token. What status code?',
        options: ['403 Forbidden', '200 OK', '401 Unauthorized', '429 Too Many Requests'],
        correctIndex: 2,
        explanation: '401 = not authenticated ("who are you?"). 403 would mean authenticated but lacking permission.',
      },
      {
        id: 'q3',
        prompt: 'Which method is NOT idempotent (calling twice changes the result)?',
        options: ['GET', 'DELETE', 'PUT', 'POST'],
        correctIndex: 3,
        explanation: 'POST creates a resource; calling it twice creates two. GET/PUT/DELETE are idempotent.',
      },
      {
        id: 'q4',
        prompt: 'The server is overloaded and rate-limiting you. What status code?',
        options: ['400 Bad Request', '503 Service Unavailable', '429 Too Many Requests', '502 Bad Gateway'],
        correctIndex: 2,
        explanation: '429 tells the client to back off and retry. 503 means the server itself is down.',
      },
    ],
  },

  /* ---- Lesson: DNS quiz ---- */
  {
    id: 'q-1-lesson-dns',
    type: 'lesson',
    title: 'DNS Resolution',
    phaseId: 'phase-1',
    order: 2,
    xpReward: 100,
    conceptId: 'c-dns',
    prerequisites: ['q-1-lesson-http'],
    questions: [
      {
        id: 'q1',
        prompt: 'Why does a cold DNS lookup take 20–120 ms?',
        options: [
          'DNS uses UDP which is slow',
          'It involves multiple round trips up the resolver chain',
          'Domain names are very long',
          'DNS servers are usually overloaded',
        ],
        correctIndex: 1,
        explanation: 'Resolution walks root → TLD → authoritative nameservers, each a round trip.',
      },
      {
        id: 'q2',
        prompt: 'If DNS for your domain goes down, what happens?',
        options: [
          'Only images break',
          'Responses get slower but still work',
          'Clients cannot resolve your IP, so the entire service is unreachable',
          'Nothing — browsers cache forever',
        ],
        correctIndex: 2,
        explanation: 'Without resolution, clients literally cannot find you. DNS must be highly available.',
      },
    ],
  },

  /* ---- Command Lab: networking tools ---- */
  {
    id: 'q-1-command-tools',
    type: 'command',
    title: 'Networking CLI Lab',
    phaseId: 'phase-1',
    order: 3,
    xpReward: 150,
    intro: 'You are on-call. Use the terminal to inspect the network.',
    prerequisites: ['q-1-lesson-dns'],
    steps: [
      {
        prompt: 'Resolve the IP address of api.example.com using DNS lookup.',
        acceptedPatterns: ['^dig\\s+api\\.example\\.com', '^nslookup\\s+api\\.example\\.com'],
        sampleAnswer: 'dig api.example.com',
        hint: 'Use `dig` or `nslookup` followed by the domain.',
      },
      {
        prompt: 'Send an HTTP HEAD request to check if the server is up (use curl, silent, show headers only).',
        acceptedPatterns: ['curl\\s+.*-I.*api\\.example\\.com', 'curl\\s+.*--head.*api\\.example\\.com', 'curl\\s+-sI\\s+api\\.example\\.com'],
        sampleAnswer: 'curl -I https://api.example.com',
        hint: '`-I` (capital i) fetches headers only.',
      },
      {
        prompt: 'Trace the network path to api.example.com.',
        acceptedPatterns: ['^traceroute\\s+api\\.example\\.com', '^tracert\\s+api\\.example\\.com', '^mtr\\s+api\\.example\\.com'],
        sampleAnswer: 'traceroute api.example.com',
        hint: '`traceroute` shows each hop your packets take.',
      },
    ],
  },

  /* ---- Architecture: simple URL shortener intro ---- */
  {
    id: 'q-1-arch-shortener',
    type: 'architecture',
    title: 'Design a URL Shortener',
    phaseId: 'phase-1',
    order: 4,
    xpReward: 300,
    brief:
      'ScaleUp Inc. needs a URL shortener. Build a path from the client to a database that can handle 1,000 reads/sec with p95 latency under 120 ms and 99.9% availability. Add a CDN at the edge and a load balancer in front of your app servers.',
    allowedComponents: ['cdn-cloudflare', 'lb-l7-nginx', 'app-node', 'db-postgres', 'redis'],
    requiredComponentTypes: ['loadBalancer', 'appServer', 'dbSQL'],
    target: {
      minRps: 1_000,
      maxLatencyP95: 120,
      maxCostPerMonth: 2_000,
      minAvailability: 0.999,
    },
    traffic: { rps: 1_000, readRatio: 0.9 },
    prerequisites: ['q-1-command-tools'],
  },

  /* ---- Incident: CDN/DNS outage ---- */
  {
    id: 'q-1-incident-dns',
    type: 'incident',
    title: 'Incident: Site Unreachable',
    phaseId: 'phase-1',
    order: 5,
    xpReward: 200,
    failureDescription: 'At 14:03, all users report the site "won\'t load". Error rate is 100%.',
    symptoms: [
      '100% of requests fail before reaching your app servers',
      'App server CPU/memory is completely idle',
      'Database has zero active connections',
      'Users in ALL regions affected simultaneously',
    ],
    prerequisites: ['q-1-arch-shortener'],
    steps: [
      [
        {
          id: 'a',
          label: 'The app servers crashed',
          isCorrect: false,
          feedback: 'Wrong — app server CPU is idle and DB has zero connections, so requests never reached them.',
        },
        {
          id: 'b',
          label: 'The database is down',
          isCorrect: false,
          feedback: 'Wrong — if the DB were down, requests would still reach the app and fail with 5xx there.',
        },
        {
          id: 'c',
          label: 'DNS is failing to resolve the domain',
          isCorrect: true,
          feedback: 'Correct! Requests never resolve to an IP, so they die before hitting anything. Classic DNS outage.',
        },
        {
          id: 'd',
          label: 'A bad code deploy',
          isCorrect: false,
          feedback: 'Wrong — a bad deploy would show errors at the app layer, not 100% pre-app failure.',
        },
      ],
    ],
  },

  /* ---- Capstone: production URL shortener ---- */
  {
    id: 'q-1-capstone',
    type: 'architecture',
    title: 'Capstone: Production URL Shortener',
    phaseId: 'phase-1',
    order: 6,
    xpReward: 500,
    brief:
      'You are now the lead. Design a URL shortener for ScaleUp that survives 5,000 reads/sec with p95 under 80 ms, 99.95% availability, under $3,000/month. Hint: cache reads aggressively — short URLs are read far more than they are created.',
    allowedComponents: ['cdn-cloudflare', 'lb-l7-nginx', 'app-node', 'db-postgres', 'redis'],
    requiredComponentTypes: ['loadBalancer', 'appServer', 'cache', 'dbSQL'],
    target: {
      minRps: 5_000,
      maxLatencyP95: 80,
      maxCostPerMonth: 3_000,
      minAvailability: 0.9995,
    },
    traffic: { rps: 5_000, readRatio: 0.95 },
    prerequisites: ['q-1-incident-dns'],
  },
];
