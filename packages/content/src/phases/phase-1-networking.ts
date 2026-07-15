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
  {
    id: 'c-networking-cli',
    title: 'Networking CLI Tools',
    summary: 'The terminal tools every engineer uses to debug connectivity: ping, dig, curl, traceroute.',
    phaseId: 'phase-1',
    prerequisites: ['c-dns', 'c-http-basics'],
    body: `# Networking CLI Tools

When something is wrong on the network, a handful of CLI tools tell you **where**. Each answers a different question.

## ping — "Is it reachable?"
\`\`\`bash
ping api.example.com
\`\`\`
Sends ICMP echo requests and prints the round-trip time. **No replies** = the host is down or blocking ICMP. Always start here.

## dig / nslookup — "What IP does this name resolve to?" (DNS)
\`\`\`bash
dig api.example.com        # shows the A record (domain -> IPv4)
nslookup api.example.com   # friendlier alternative
\`\`\`
Read the **ANSWER SECTION**: it lists the IP address(es) the domain resolves to. If it comes back empty, DNS resolution is failing.

## curl — "How does the server respond?" (HTTP)
\`\`\`bash
curl https://api.example.com          # GET, prints the body
curl -I https://api.example.com       # HEAD request — headers & status only
curl -sI https://api.example.com      # -s = silent (hide the progress bar)
\`\`\`
\`-I\` (capital i) / \`--head\` makes curl send a **HEAD** request and print only the status line + headers — perfect for a quick "is it up, what status?" check.

## traceroute / mtr — "Where does the path break?"
\`\`\`bash
traceroute api.example.com   # each hop (router) + per-hop latency
mtr api.example.com          # ping + traceroute combined, live
\`\`\`
Shows every router between you and the host. A hop that stops replying marks where packets die. (On Windows the tool is \`tracert\`.)

> 💡 **Diagnostic order**: \`ping\` (reachability) → \`dig\` (DNS) → \`curl\` (HTTP) → \`traceroute\` (path). Narrow the failure one layer at a time.

| Symptom | First tool |
|---|---|
| "Can't reach the host at all" | \`ping\` |
| "Works by IP but not by name" | \`dig\` / \`nslookup\` |
| "Resolves, but bad HTTP status" | \`curl -I\` |
| "Reaches some hops, then dies" | \`traceroute\` |
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

  /* ---- Lesson: TCP vs UDP ---- */
  {
    id: 'q-1-lesson-tcp',
    type: 'lesson',
    title: 'TCP vs UDP',
    phaseId: 'phase-1',
    order: 3,
    xpReward: 100,
    conceptId: 'c-tcp-udp',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt: 'What is the TCP three-way handshake?',
        options: [
          'GET → 200 OK → close',
          'SYN → SYN-ACK → ACK',
          'PING → PONG → DATA',
          'CONNECT → ACCEPT → READ',
        ],
        correctIndex: 1,
        explanation: 'TCP establishes a connection with SYN → SYN-ACK → ACK before sending data (one round trip).',
      },
      {
        id: 'q2',
        prompt: 'Which workload is the best fit for UDP?',
        options: [
          'A bank transfer',
          'A file download',
          'A live video call',
          'A database transaction',
        ],
        correctIndex: 2,
        explanation: 'Live voice/video prioritizes lowest latency over guaranteed delivery — UDP. Late packets are dropped, not re-sent.',
      },
      {
        id: 'q3',
        prompt: 'What does TCP guarantee that UDP does not?',
        options: [
          'Lower latency',
          'Reliable, ordered delivery',
          'Smaller packet size',
          'Connectionless transport',
        ],
        correctIndex: 1,
        explanation: 'TCP guarantees every byte arrives, in order, with retransmission. UDP is best-effort, unordered.',
      },
      {
        id: 'q4',
        prompt: 'Why is DNS traditionally sent over UDP?',
        options: [
          'DNS needs guaranteed delivery',
          'Queries are small and latency matters more than perfect delivery',
          'DNS servers cannot speak TCP',
          'UDP supports larger payloads than TCP',
        ],
        correctIndex: 1,
        explanation: 'DNS queries/replies are tiny; UDP avoids the handshake, keeping resolution fast. Retries are cheap.',
      },
    ],
  },

  /* ---- Lesson: CDN & Latency ---- */
  {
    id: 'q-1-lesson-cdn',
    type: 'lesson',
    title: 'CDN & Latency',
    phaseId: 'phase-1',
    order: 4,
    xpReward: 100,
    conceptId: 'c-cdn',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt: 'What is the main benefit of putting static assets behind a CDN?',
        options: [
          'It encrypts traffic',
          'Lower latency for users everywhere + less load on your origin',
          'It replaces your database',
          'It makes assets smaller',
        ],
        correctIndex: 1,
        explanation: 'Edges near users serve cached assets (~5 ms) instead of hitting your origin, cutting latency and origin load.',
      },
      {
        id: 'q2',
        prompt: 'A CDN reports a cache hit ratio of 0.9. What does that mean?',
        options: [
          '10% of requests are served; 90% fail',
          '90% of requests are served from the edge; the origin sees only ~10%',
          'The CDN costs 90% less',
          '90% of assets are invalid',
        ],
        correctIndex: 1,
        explanation: 'Hit ratio = fraction served from cache. 0.9 means the origin handles only the ~10% misses.',
      },
      {
        id: 'q3',
        prompt: 'Which should you NOT put behind a CDN cache?',
        options: [
          'Your logo and CSS',
          'JavaScript bundles',
          'Per-user, personalized account balance',
          'Product listing images',
        ],
        correctIndex: 2,
        explanation: 'CDNs cache shared/static content. Per-user dynamic data must hit your origin, or you serve stale wrong data.',
      },
      {
        id: 'q4',
        prompt: 'Why does a CDN also help during a traffic spike?',
        options: [
          'It adds more database capacity',
          'It absorbs the surge at the edge, shielding your origin',
          'It disables your servers to save cost',
          'It queues all requests in a database',
        ],
        correctIndex: 1,
        explanation: 'With a high hit ratio, most spike traffic is absorbed by edges; the origin barely feels it.',
      },
    ],
  },

  /* ---- Lesson: API styles ---- */
  {
    id: 'q-1-lesson-api-styles',
    type: 'lesson',
    title: 'REST vs gRPC vs GraphQL',
    phaseId: 'phase-1',
    order: 5,
    xpReward: 100,
    conceptId: 'c-api-styles',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt: 'Which style is the most browser-native and resource-oriented?',
        options: ['gRPC', 'GraphQL', 'REST', 'WebSocket'],
        correctIndex: 2,
        explanation: 'REST maps resources to URLs and verbs to HTTP methods — trivial to call from any HTTP client, including browsers.',
      },
      {
        id: 'q2',
        prompt: 'Which is the best fit for internal, low-latency service-to-service calls with streaming?',
        options: ['REST', 'gRPC', 'GraphQL', 'Form POST'],
        correctIndex: 1,
        explanation: 'gRPC uses binary Protocol Buffers over HTTP/2 with codegen and bidirectional streaming — ideal for internal RPC.',
      },
      {
        id: 'q3',
        prompt: 'What problem does GraphQL primarily solve?',
        options: [
          'Encrypting requests',
          'The client over-/under-fetching by querying exactly the fields it needs',
          'Replacing TCP',
          'Caching at the edge',
        ],
        correctIndex: 1,
        explanation: 'One endpoint where the client specifies the exact shape — no over- or under-fetching. Great for varied mobile clients.',
      },
      {
        id: 'q4',
        prompt: 'gRPC payloads are encoded using…',
        options: ['JSON', 'XML', 'Protocol Buffers', 'URL-encoded form data'],
        correctIndex: 2,
        explanation: 'gRPC serializes with Protocol Buffers (binary, schema-first) over HTTP/2 — compact and fast.',
      },
    ],
  },

  /* ---- Lesson: Networking CLI Tools ---- */
  {
    id: 'q-1-lesson-networking-cli',
    type: 'lesson',
    title: 'Networking CLI Tools',
    phaseId: 'phase-1',
    order: 6,
    xpReward: 100,
    conceptId: 'c-networking-cli',
    prerequisites: ['q-1-lesson-dns'],
    questions: [
      {
        id: 'q1',
        prompt: 'You need to find the IP address behind api.example.com. Which command?',
        options: ['ping api.example.com', 'dig api.example.com', 'curl api.example.com', 'traceroute api.example.com'],
        correctIndex: 1,
        explanation: '`dig` (or `nslookup`) queries DNS and returns the A record — the IP the domain resolves to.',
      },
      {
        id: 'q2',
        prompt: 'What does `curl -I https://api.example.com` do?',
        options: [
          'Downloads the response body to a file',
          'Sends a HEAD request and prints only the status line + headers',
          'Ignores TLS certificate errors',
          'Traces the network path to the server',
        ],
        correctIndex: 1,
        explanation: '`-I` (capital i) issues a HEAD request and shows headers/status only — a quick health check without the body.',
      },
      {
        id: 'q3',
        prompt: '`traceroute api.example.com` shows you…',
        options: [
          'The DNS records for the domain',
          'Every router (hop) between you and the host, with per-hop latency',
          'The HTTP response headers',
          'The server CPU usage',
        ],
        correctIndex: 1,
        explanation: 'traceroute lists each hop along the path; a hop that stops replying marks where packets are being dropped.',
      },
      {
        id: 'q4',
        prompt: 'A user reports "the site is totally unreachable". Which command do you run FIRST?',
        options: ['curl -I', 'traceroute', 'ping', 'dig'],
        correctIndex: 2,
        explanation: 'Start with `ping` to test raw reachability and latency, then narrow down: dig → curl → traceroute.',
      },
    ],
  },

  /* ---- Command Lab: networking tools ---- */
  {
    id: 'q-1-command-tools',
    type: 'command',
    title: 'Networking CLI Lab',
    phaseId: 'phase-1',
    order: 7,
    xpReward: 150,
    intro: 'You are on-call. Use the terminal to inspect the network.',
    prerequisites: ['q-1-lesson-networking-cli'],
    steps: [
      {
        prompt: 'Resolve the IP address of api.example.com using DNS lookup.',
        acceptedPatterns: ['^dig\\s+api\\.example\\.com', '^nslookup\\s+api\\.example\\.com'],
        sampleAnswer: 'dig api.example.com',
        hint: 'Use `dig` or `nslookup` followed by the domain.',
      },
      {
        prompt: 'Send an HTTP HEAD request to check if the server is up (use curl, silent, show headers only).',
        acceptedPatterns: ['curl\\s+.*-I.*api\\.example\\.com', 'curl\\s+.*--head.*api\\.example\\.com', 'curl\\s+.*-sI.*api\\.example\\.com'],
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
    order: 8,
    xpReward: 300,
    brief:
      'ScaleUp Inc. needs a URL shortener. Build a path from the client to a database that can handle 1,000 reads/sec with p95 latency under 120 ms and 99.9% availability. Add a CDN at the edge and a load balancer in front of your app servers.',
    allowedComponents: ['cdn-cloudflare', 'lb-l7-nginx', 'app-node', 'db-postgres', 'redis'],
    requiredComponentTypes: ['loadBalancer', 'appServer', 'dbSQL'],
    target: {
      minRps: 1_000,
      maxLatencyP95: 120,
      maxCostPerMonth: 1_850,
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
    order: 9,
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
    order: 10,
    xpReward: 500,
    brief:
      'You are now the lead. Design a URL shortener for ScaleUp that survives 5,000 reads/sec with p95 under 80 ms, 99.95% availability, under $3,000/month. Hint: cache reads aggressively — short URLs are read far more than they are created.',
    allowedComponents: ['cdn-cloudflare', 'lb-l7-nginx', 'app-node', 'db-postgres', 'redis'],
    requiredComponentTypes: ['loadBalancer', 'appServer', 'cache', 'dbSQL'],
    target: {
      minRps: 5_000,
      maxLatencyP95: 80,
      maxCostPerMonth: 2_000,
      minAvailability: 0.9995,
    },
    traffic: { rps: 5_000, readRatio: 0.95 },
    prerequisites: ['q-1-incident-dns'],
  },
];
