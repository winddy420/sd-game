import type { Concept, Quest } from '../types';

export const PHASE_2_CONCEPTS: Concept[] = [
  {
    id: 'c-2-rest-api',
    title: 'REST API Design',
    summary: 'Designing resource-oriented APIs: idempotency, versioning, and the status codes that make retries safe.',
    phaseId: 'phase-2',
    body: `# REST API Design

A well-designed REST API is **resource-oriented**, **stateless**, and **predictable**. Clients should be able to guess the next call without reading your source.

## Resource-oriented URLs

Treat every noun as a resource. Use plural nouns for collections.

\`\`\`
GET    /orders             # list
POST   /orders             # create
GET    /orders/42          # read one
PUT    /orders/42          # replace (whole)
PATCH  /orders/42          # partial update
DELETE /orders/42          # remove
GET    /orders/42/items    # sub-collection
\`\`\`

Verbs (\`/createOrder\`, \`/getUser\`) are a code smell — the HTTP method is already the verb.

## Idempotency — the key to safe retries

**Idempotent** = calling N times has the same effect as calling once. Networks fail; clients retry; without idempotency a double-click becomes two charges.

| Method | Idempotent? | Safe to retry? |
|---|---|---|
| GET | ✅ | ✅ |
| PUT | ✅ | ✅ |
| DELETE | ✅ | ✅ |
| POST | ❌ | ❌ (creates duplicates) |
| PATCH | ❌ usually | ⚠️ depends |

For non-idempotent operations (POST), pass an **idempotency key**:

\`\`\`http
POST /payments
Idempotency-Key: 7f3a-9b21-...client-generated-uuid...
\`\`\`

The server stores the key → response for 24h. A retry with the same key returns the original response instead of creating a second charge.

## Versioning

APIs change. Version from day one so you can ship breaking changes without burning old clients.

| Strategy | Example | Pros / Cons |
|---|---|---|
| URI path | \`/v1/orders\` | Most common, easy to route, visible |
| Header | \`Accept: application/vnd.acme.v1+json\` | Clean URLs, harder to test |
| Query | \`/orders?version=1\` | Simple, pollutes cache keys |

> **Rule of thumb**: use **URI path versioning** (\`/v1/\`). It is cache-friendly, debuggable in a browser, and what most public APIs (GitHub, Stripe) do.

## Status codes that matter

| Code | Meaning | When |
|---|---|---|
| 200 OK | Success | GET, PATCH success |
| 201 Created | New resource | POST success |
| 204 No Content | Success, empty body | DELETE success |
| 400 Bad Request | Malformed payload | Validation failed |
| 401 Unauthorized | Not authenticated | Missing/expired token |
| 403 Forbidden | Authenticated, lacks permission | Role check failed |
| 404 Not Found | Resource missing | Wrong id |
| 409 Conflict | State clash | Duplicate / stale version |
| 422 Unprocessable Entity | Semantic failure | Well-formed but invalid |
| 429 Too Many Requests | Rate limited | Quota exceeded |
| 500 Internal Server Error | Bug | Unhandled exception |
| 503 Service Unavailable | Down / maintenance | Deliberate shutdown |

> ⚠️ **401 vs 403** (people mix this up constantly): \`401\` = "I don't know who you are" (no/invalid credentials). \`403\` = "I know who you are, and you may not."

## Practical checklist

- ✅ Plural resource nouns, methods as verbs
- ✅ Every mutating POST accepts an idempotency key
- ✅ Versioned from launch (\`/v1/\`)
- ✅ Correct status codes — never \`200\` with an error body
- ✅ Pagination on every list endpoint (\`?limit=&cursor=\`)
`,
  },
  {
    id: 'c-2-auth',
    title: 'Authentication: JWT vs Sessions vs OAuth',
    summary: 'Three ways to prove who a user is — and the trade-offs that decide which to pick.',
    phaseId: 'phase-2',
    prerequisites: ['c-2-rest-api'],
    body: `# Authentication: JWT vs Sessions vs OAuth

**Authentication (AuthN)** = proving *who* you are. **Authorization (AuthZ)** = what you're *allowed* to do. This lesson is about AuthN.

## 1. Server-side sessions (the classic)

1. User logs in with username + password.
2. Server creates a **session** in its DB/cache, returns a **session id** in a cookie.
3. On each request, the browser sends the cookie; server looks up the session.

\`\`\`
Set-Cookie: sid=abc123; HttpOnly; Secure; SameSite=Lax
\`\`\`

| Pros | Cons |
|---|---|
| Easy to revoke (delete server-side row) | Server must store & look up every session |
| Cookies are sent automatically | Cookie-based CSRF risk → mitigate with SameSite |
| Small client footprint | Sticky sessions or shared session store needed for HA |

**Use when**: you control both client and server (classic web app), and revocation matters.

## 2. JWT (JSON Web Tokens)

A JWT is a **signed, self-contained token** the server issues and later verifies without storing it.

\`\`\`
header.payload.signature
eyJhbGciOi... . eyJzdWIiOiI0MiIsImV4cCI6... . SflKxw...
\`\`\`

- \`header\` — algorithm (HS256, RS256)
- \`payload\` — claims (\`sub\`, \`exp\`, \`role\`, …)
- \`signature\` — HMAC or RSA signature over the other two parts

| Pros | Cons |
|---|---|
| Stateless — no server-side lookup | **Cannot be revoked** before \`exp\` without a blocklist |
| Great for service-to-service auth | Big payload if you stuff it |
| Scales horizontally | If signing key leaks, attacker can mint any identity |

> ⚠️ **JWT pitfalls**: keep \`exp\` short (5–15 min), use refresh tokens for long sessions, and **never store long-lived JWTs in localStorage** — use HttpOnly cookies. Unsigned (\`alg: none\`) tokens are an infamous vulnerability; always verify the signature.

**Use when**: distributed microservices, stateless APIs, short-lived access tokens.

## 3. OAuth 2.0 / OIDC (delegated auth)

"Let this third-party act on my behalf **without giving it my password**." This is what powers "Log in with Google / GitHub".

### Roles
- **Resource Owner** — the user
- **Client** — the app wanting access
- **Authorization Server** — issues tokens (Google, Auth0)
- **Resource Server** — your API

### Authorization Code flow (the one you'll use)

\`\`\`
1. Client → Browser → Authorization Server   (redirect, "Log in with Google")
2. User consents
3. Authorization Server → Browser → Client    (authorization code, ?code=...)
4. Client → Authorization Server              (code + client_secret)
5. Authorization Server → Client              (access_token + refresh_token)
6. Client → Resource Server                   (Authorization: Bearer <token>)
\`\`\`

The **authorization code + secret exchange** (steps 4–5) exists so the token never passes through the browser — protecting it from malicious scripts.

**Use when**: you accept "Sign in with X", or you're building a platform where third-party apps need scoped access to user data.

## Quick comparison

| Need | Pick |
|---|---|
| Classic server-rendered web app | Sessions |
| Stateless API / microservices | JWT (short-lived) |
| "Sign in with Google" / 3rd-party | OAuth 2.0 / OIDC |
| Need instant revocation | Sessions (or JWT + blocklist) |

> **Rule of thumb**: don't roll your own auth. Use a battle-tested library or identity provider (Auth0, Cognito, Keycloak). Crypto is easy to get subtly wrong.
`,
  },
  {
    id: 'c-2-rate-limiting',
    title: 'Rate Limiting: Token Bucket vs Leaky Bucket',
    summary: 'Two classic algorithms for throttling traffic — and how they shape what users feel.',
    phaseId: 'phase-2',
    prerequisites: ['c-2-rest-api'],
    body: `# Rate Limiting

A **rate limiter** caps how many requests a client can send in a window. It protects services from abuse, misbehaving clients, and accidental DDoS from your own bugs.

## Why rate limit?

- 🛡️ **Protect the service** — one noisy client can't starve others
- 💰 **Control cost** — paid APIs bill per call
- 🚦 **Fairness** — different tiers (free / pro) get different limits
- 🐛 **Self-protection** — a client bug causing a retry storm shouldn't take you down

Where to put it: at the **edge** (API gateway, reverse proxy) so abusive traffic never reaches your app servers.

## Algorithm 1 — Token bucket

Imagine a bucket that holds up to **N tokens**. Tokens are added at a steady **rate R** (tokens/sec). Each request consumes 1 token.

- Bucket is full? Add tokens overflow and are lost.
- Bucket is empty? Request is rejected (\`429\`).

\`\`\`
capacity = 10 tokens
rate     = 2 tokens/sec

t=0.0s  bucket=[10]          (full)
t=0.5s  burst of 8 requests  bucket=[2]   ← allowed (bursty)
t=0.6s  request              bucket=[1]   ← allowed
t=0.6s  request              bucket=[0]
t=0.6s  request              bucket=[0]   ← REJECTED 429
\`\`\`

**Trait**: allows **short bursts** up to bucket capacity, while holding the long-run average at \`rate\`. Great for human-driven APIs where users click in bursts.

## Algorithm 2 — Leaky bucket

Imagine a bucket with a small **hole**. Requests (water) flow in; the bucket **drains at a fixed rate**. If it overflows, requests are rejected (or queued).

- Smooths traffic into a **strict, steady outflow**.
- No bursts allowed — even a brief spike gets throttled.

\`\`\`
outflow rate = 2 req/sec

burst of 10 requests → queued and released at 2/sec → 5 seconds to drain
\`\`\`

**Trait**: enforces a **flat rate**. Great for protecting downstream systems that choke on bursts (e.g. a legacy DB).

## Comparison

| | Token bucket | Leaky bucket |
|---|---|---|
| Allows bursts? | ✅ (up to capacity) | ❌ (smooths) |
| Shapes traffic? | No | Yes |
| Implementation | Counters + timestamp | Queue + timer |
| Best for | Public APIs, user-facing | Protecting strict downstreams |

## Other common algorithms

- **Fixed window** — count requests per clock window (12:00–12:01). Simple but bursty at edges.
- **Sliding window** — weighted moving average over the last N seconds. Smoother than fixed window.

## A typical config

\`\`\`
limit: 1000 req / minute per user
strategy: token bucket, capacity=50, rate=16.6/s
on-exceed: 429 Too Many Requests + Retry-After: 4
\`\`\`

Return headers so well-behaved clients back off:

\`\`\`http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 942
X-RateLimit-Reset: 1719900000
\`\`\`

> ⚠️ **Don't forget \`Retry-After\`** on \`429\`s. Without it, clients guess — usually by hammering harder, which makes the problem worse.
`,
  },
  {
    id: 'c-2-web-security',
    title: 'Web Security Basics',
    summary: 'OWASP Top 10 highlights, CORS, and CSP — the minimum every backend engineer must know.',
    phaseId: 'phase-2',
    prerequisites: ['c-2-auth'],
    body: `# Web Security Basics

Most breaches aren't novel crypto breaks — they're the same recurring mistakes. The **OWASP Top 10** is the industry's running list of the most common.

## OWASP Top 10 — highlights

| # | Risk | One-line defense |
|---|---|---|
| A01 | **Broken Access Control** | Authorize on every request; never trust client-side hiding |
| A02 | **Cryptographic Failures** | TLS in transit; encrypt at rest; no homebrew crypto |
| A03 | **Injection** (SQLi, command) | Parameterized queries / prepared statements |
| A04 | **Insecure Design** | Threat-model before coding; least privilege |
| A05 | **Security Misconfiguration** | Disable defaults, lock down admin endpoints |
| A07 | **Auth Failures** | Strong passwords, MFA, rotate keys |
| A09 | **Logging & Monitoring** | You can't respond to breaches you can't see |
| A10 | **SSRF** | Validate/allowlist outbound URLs the server fetches |

### SQL injection — the textbook example

\`\`\`
// ❌ Vulnerable: string concatenation
SELECT * FROM users WHERE name = '" + input + "'

input = admin' OR '1'='1
→ SELECT * FROM users WHERE name = 'admin' OR '1'='1   // returns every user
\`\`\`

\`\`\`
// ✅ Parameterized — the library escapes safely
SELECT * FROM users WHERE name = ?   -- bind input as a value
\`\`\`

**Rule**: never put user input in a query string. Use parameterized queries / an ORM. Always.

### XSS (Cross-Site Scripting) — related to A03

Attacker injects \`<script>\` into your page that runs in another user's browser. Defenses:

- **Escape output** by default in your templating engine
- Treat user-supplied HTML as untrusted (sanitize)
- Set a **Content-Security-Policy** header (below)

## CORS — Cross-Origin Resource Sharing

The browser's **same-origin policy** blocks \`https://app.com\` from reading responses of \`https://api.com\` by default. **CORS** is the opt-in mechanism that lets the server say "okay, I'll talk to that origin."

### Preflight flow

For "non-simple" requests (custom headers, non-GET/POST/HEAD methods, non-simple content types), the browser sends a preflight:

\`\`\`http
OPTIONS /orders HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Authorization
\`\`\`

Server responds with what it allows:

\`\`\`http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 600
\`\`\`

> ⚠️ **CORS is not security.** It's a *browser* mechanism to protect *users*, not your server. Any non-browser (curl, Postman, an attacker's server) ignores CORS entirely. **You still need AuthN/AuthZ on the server.**

> ⚠️ Never reflect \`Access-Control-Allow-Origin: *\` together with \`Allow-Credentials: true\` — browsers reject it. For credentialed requests, echo the specific origin and validate it against an allowlist.

## CSP — Content-Security-Policy

A response header that tells the browser which sources it's allowed to load scripts/styles/images from. It is the single strongest XSS mitigation.

\`\`\`http
Content-Security-Policy: default-src 'self';
  script-src 'self' https://cdn.example.com;
  object-src 'none';
  base-uri 'self';
\`\`\`

With \`object-src 'none'\` and \`script-src 'self'\`, an injected \`<script src="https://evil.com/x.js">\` is **blocked by the browser** — even if your templating bug let it into the HTML.

## Security headers — minimum bar

| Header | Why |
|---|---|
| \`Strict-Transport-Security\` | Force HTTPS, reject plaintext |
| \`Content-Security-Policy\` | Stop XSS / data exfil |
| \`X-Content-Type-Options: nosniff\` | Stop MIME sniffing |
| \`X-Frame-Options: DENY\` | Stop clickjacking |
| \`Referrer-Policy\` | Limit referrer leakage |

## The mindset

- **Never trust input** — validate type, length, format on the server.
- **Least privilege** — services & users get the minimum access needed.
- **Defense in depth** — multiple layers, so one miss doesn't sink you.
- **Assume breach** — log, alert, and have an incident plan.
`,
  },
  {
    id: 'c-2-docker-basics',
    title: 'Docker & Service Containers',
    summary: 'Build and run containers with the Docker CLI: build, run, port mapping, logs.',
    phaseId: 'phase-2',
    prerequisites: ['c-2-rest-api'],
    body: `# Docker & Service Containers

A **container** is a runnable package: your app code plus its runtime, libraries, and config, all isolated from the host. The same image runs identically on your laptop and in production, which is why Docker is the standard way to package a backend service.

## docker build — "make an image"
\`\`\`bash
docker build -t sdgame/api:v1 .
\`\`\`
Reads the \`Dockerfile\` in the build context and produces a named **image**. \`-t <tag>\` labels it (here \`sdgame/api:v1\`); the trailing \`.\` means "use the current directory as the build context, including its Dockerfile."

## docker run — "start a container"
\`\`\`bash
docker run -d --name api -p 8080:3000 sdgame/api:v1
\`\`\`
Creates and starts a container from the image. The flags:
- \`-d\` — **detached**: run in the background and return your shell prompt.
- \`--name api\` — give the container a friendly name you can reuse in other commands.
- \`-p 8080:3000\` — **port mapping** in \`host:container\` order: traffic on host port 8080 forwards into container port 3000.

## docker ps — "what is running?"
\`\`\`bash
docker ps          # running containers only
docker ps -a       # include stopped ones too
\`\`\`
Lists containers with their ID, image, status, and mapped ports. The quickest way to confirm a container is up.

## docker logs — "what is it printing?"
\`\`\`bash
docker logs -f api
\`\`\`
Prints the container stdout/stderr. \`-f\` **follows** (streams) new output live, like \`tail -f\` — essential when a container fails to start.

## curl -I — "does it answer?"
\`\`\`bash
curl -I http://localhost:8080/health
\`\`\`
\`-I\` (capital i) sends a **HEAD** request and prints only the status line + headers — the fastest health check once you have mapped a host port to the container.

> 💡 **Inner loop**: \`docker build\` → \`docker run -d -p\` → \`docker ps\` to confirm it started → \`curl -I\` to verify it answers → \`docker logs -f\` to debug if it does not.

| Goal | Command |
|---|---|
| Build an image | \`docker build -t <tag> .\` |
| Run detached with ports | \`docker run -d -p <host>:<container> <image>\` |
| List running containers | \`docker ps\` |
| Tail container output | \`docker logs -f <name>\` |
| Quick HTTP health check | \`curl -I http://localhost:<port>\` |
`,
  },
];

export const PHASE_2_QUESTS: Quest[] = [
  /* ---- Lesson: REST API design ---- */
  {
    id: 'q-2-lesson-api',
    type: 'lesson',
    title: 'REST API Design',
    phaseId: 'phase-2',
    order: 1,
    xpReward: 100,
    conceptId: 'c-2-rest-api',
    questions: [
      {
        id: 'q1',
        prompt: 'A client double-clicks "Submit Payment" and is charged twice. What was missing?',
        options: [
          'A longer status code',
          'An Idempotency-Key header on the POST',
          'A URI version prefix',
          'A PATCH instead of POST',
        ],
        correctIndex: 1,
        explanation:
          'POST is not idempotent. An Idempotency-Key lets the server dedupe retries — the second call returns the original response instead of creating a second charge.',
      },
      {
        id: 'q2',
        prompt: 'Which URL is the most RESTful for "mark order 42 as shipped"?',
        options: [
          'POST /markShipped?orderId=42',
          'GET /updateOrderStatus/42/shipped',
          'PATCH /orders/42 with body { "status": "shipped" }',
          'POST /orders/shipped?id=42',
        ],
        correctIndex: 2,
        explanation:
          'The resource is /orders/42; the method (PATCH) describes the action. Verbs in the path (/updateOrderStatus) are a REST anti-pattern.',
      },
      {
        id: 'q3',
        prompt: 'You POST a valid-looking but semantically wrong payload (e.g. negative quantity). Best status code?',
        options: ['200 OK', '400 Bad Request', '422 Unprocessable Entity', '500 Internal Server Error'],
        correctIndex: 2,
        explanation:
          'The payload is well-formed (so not 400) but violates business rules. 422 Unprocessable Entity expresses exactly that semantic failure.',
      },
      {
        id: 'q4',
        prompt: 'Why version APIs in the URI path (/v1/orders) rather than a query param (?version=1)?',
        options: [
          'Path versioning is required by HTTP',
          'Query params break cache keys and are less visible in tooling',
          'Versioning in the path is faster at runtime',
          'You can only have one query param per request',
        ],
        correctIndex: 1,
        explanation:
          'Query params pollute cache keys, get dropped in logs, and are easy to forget. Path versioning is cache-friendly, debuggable in a browser, and the industry default.',
      },
    ],
  },

  /* ---- Lesson: Authentication ---- */
  {
    id: 'q-2-lesson-auth',
    type: 'lesson',
    title: 'Authentication: JWT vs Sessions vs OAuth',
    phaseId: 'phase-2',
    order: 2,
    xpReward: 100,
    conceptId: 'c-2-auth',
    prerequisites: ['q-2-lesson-api'],
    questions: [
      {
        id: 'q1',
        prompt: 'A JWT signed with HS256 is stolen from a user\'s browser. What is the server\'s main problem revoking it?',
        options: [
          'The signature is invalid, so it can\'t be read',
          'JWTs are stateless — there is no server-side record to delete',
          'HS256 tokens are encrypted, so the attacker can\'t use them anyway',
          'You can simply change the user\'s password and the token dies',
        ],
        correctIndex: 1,
        explanation:
          'The server verifies JWTs by signature, not by lookup. Until `exp` passes, the only way to revoke is to keep a server-side blocklist — which throws away the stateless benefit.',
      },
      {
        id: 'q2',
        prompt: 'In the OAuth Authorization Code flow, why exchange a `code` for a token server-side instead of handing the token to the browser directly?',
        options: [
          'The code is shorter and saves bandwidth',
          'Tokens never pass through the browser, so malicious scripts can\'t steal them',
          'OAuth requires two HTTP requests per flow',
          'The authorization server doesn\'t support tokens directly',
        ],
        correctIndex: 1,
        explanation:
          'The `code` is bound to `client_secret`, which only the server knows. Exchanging code → token server-side keeps the token out of the browser, defeating XSS token theft.',
      },
      {
        id: 'q3',
        prompt: 'You store JWTs in localStorage. What is the primary risk?',
        options: [
          'localStorage is too small for a JWT',
          'Any XSS script can read localStorage and exfiltrate the token',
          'JWTs expire before localStorage persists them',
          'Browsers sync localStorage across devices',
        ],
        correctIndex: 1,
        explanation:
          'localStorage is readable by any JavaScript on the page — including injected XSS. Prefer HttpOnly cookies so JS can never see the token. Short `exp` limits damage if one is stolen.',
      },
      {
        id: 'q4',
        prompt: 'A user logs out. Which auth model makes revocation trivial (one server-side delete)?',
        options: ['JWT', 'Server-side sessions', 'OAuth access tokens', 'Unsigned tokens'],
        correctIndex: 1,
        explanation:
          'Sessions live in the server\'s store; deleting that row invalidates the session instantly. JWTs (and opaque OAuth tokens without introspection) can\'t be revoked without extra machinery.',
      },
    ],
  },

  /* ---- Lesson: Rate Limiting ---- */
  {
    id: 'q-2-lesson-rate-limiting',
    type: 'lesson',
    title: 'Rate Limiting: Token Bucket vs Leaky Bucket',
    phaseId: 'phase-2',
    order: 3,
    xpReward: 100,
    conceptId: 'c-2-rate-limiting',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt:
          'A public mobile API gets bursty traffic whenever users pull-to-refresh. Which algorithm lets you tolerate short bursts up to a cap while still holding a steady long-run average?',
        options: [
          'Fixed window counter — it smooths traffic per clock minute',
          'Token bucket — it allows bursts up to bucket capacity and refills at a fixed rate',
          'Leaky bucket — it processes requests strictly in arrival order',
          'Sliding window counter — it has no capacity concept',
        ],
        correctIndex: 1,
        explanation:
          'A token bucket holds up to `capacity` tokens and refills at `rate` tokens/sec. A burst can drain the bucket (allowed), but the long-run average is bounded by `rate`. Leaky bucket, by contrast, enforces a flat outflow and smooths/rejects bursts rather than admitting them.',
      },
      {
        id: 'q2',
        prompt:
          'You have a legacy database that falls over on bursty writes. Which rate-limiting strategy best protects it?',
        options: [
          'Token bucket with a very large capacity, so writes queue in the bucket',
          'Leaky bucket with a strict outflow rate matched to what the DB can sustain',
          'Fixed window counter with 1-minute windows',
          'No limiter — let clients retry with exponential backoff',
        ],
        correctIndex: 1,
        explanation:
          'Leaky bucket enforces a steady outflow regardless of arrival pattern, smoothing bursts before they reach the downstream. A large-capacity token bucket would *allow* the very bursts that kill the DB. Client-side backoff is advisory, not a guarantee.',
      },
      {
        id: 'q3',
        prompt:
          'Your limiter rejects a request. What status and header should the response carry, and why?',
        options: [
          '503 Service Unavailable and no extra header — clients will retry on their own',
          '403 Forbidden and no extra header — the client is banned',
          '429 Too Many Requests with Retry-After so well-behaved clients back off instead of hammering harder',
          '400 Bad Request with Retry-After — the request was malformed',
        ],
        correctIndex: 2,
        explanation:
          '429 Too Many Requests is the RFC 6585 status for rate limiting. `Retry-After` tells clients exactly when to retry; without it, clients guess — usually by retrying *faster*, which makes the overload worse. 503 implies the server is down, not that the client is over quota.',
      },
      {
        id: 'q4',
        prompt: 'Where in the request path should rate limiting ideally sit?',
        options: [
          'Inside the database, throttling each query as it executes',
          'In the client SDK only — the server trusts the client',
          'At the edge (API gateway / reverse proxy), so abusive traffic never reaches app servers or the DB',
          'On a single designated app-server instance',
        ],
        correctIndex: 2,
        explanation:
          'Limiting at the edge rejects abusive requests before they consume compute, memory, or database resources. Per-DB limiting is too late (the query already crossed the wire), client-only limiting assumes trust you don\'t have, and a single app instance can\'t see fleet-wide traffic.',
      },
    ],
  },

  /* ---- Lesson: Web Security ---- */
  {
    id: 'q-2-lesson-web-security',
    type: 'lesson',
    title: 'Web Security Basics',
    phaseId: 'phase-2',
    order: 4,
    xpReward: 100,
    conceptId: 'c-2-web-security',
    prerequisites: [],
    questions: [
      {
        id: 'q1',
        prompt:
          'A login query concatenates user input, so `admin\' OR \'1\'=\'1` returns every user row. What is the correct fix?',
        options: [
          'Strip the characters \' and ; from input before building the query',
          'Use parameterized queries / prepared statements so input is bound as a value, never concatenated into SQL',
          'Move the query into a stored procedure and keep concatenating inside it',
          'Add an Access-Control-Allow-Origin header to the response',
        ],
        correctIndex: 1,
        explanation:
          'With parameterized queries the SQL template and the values travel separately; the input is bound as data, so it can never be parsed as SQL. Character-stripping is brittle blocklisting that attackers bypass with encoding tricks. Stored procedures do not help if you still concatenate inside them.',
      },
      {
        id: 'q2',
        prompt:
          'A teammate says, "We added CORS, so attackers can\'t hit our API." What is wrong with this claim?',
        options: [
          'Nothing — CORS is the primary server-side authorization check',
          'CORS is enforced by browsers to protect users; non-browser clients like curl, Postman, or an attacker\'s server ignore it entirely. You still need AuthN/AuthZ on the server.',
          'CORS only works when the server runs over HTTPS',
          'CORS has to be enabled on the client, not on the server',
        ],
        correctIndex: 1,
        explanation:
          'CORS is a *browser-enforced* mechanism that prevents a rogue website from making authenticated requests to another origin *on the user\'s behalf*. Non-browser clients are not bound by it. It is a complement to server-side auth, never a replacement for it.',
      },
      {
        id: 'q3',
        prompt:
          'A templating bug lets user content inject `<script src="https://evil.com/x.js">` into your HTML. Which response header most strongly mitigates the script *executing* in victims\' browsers?',
        options: [
          'Strict-Transport-Security',
          'X-Content-Type-Options: nosniff',
          'Content-Security-Policy with `script-src \'self\'` and `object-src \'none\'`',
          'Access-Control-Allow-Origin: *',
        ],
        correctIndex: 2,
        explanation:
          'A strict CSP tells the browser to execute scripts only from allow-listed sources, so the injected `evil.com` script is blocked at execution time even though it reached the HTML. HSTS only forces HTTPS, `nosniff` addresses MIME confusion, and CORS is unrelated to script execution.',
      },
      {
        id: 'q4',
        prompt:
          'You ship `Access-Control-Allow-Origin: *` together with `Access-Control-Allow-Credentials: true`. What happens in browsers?',
        options: [
          'It works fine — any origin may now make credentialed (cookie) requests to you',
          'Browsers reject the credentialed response; for credentials you must echo a specific allow-listed origin, not the wildcard',
          'The server returns 500 on every cross-origin request',
          'CORS is silently disabled, so all cross-origin requests are blocked',
        ],
        correctIndex: 1,
        explanation:
          'The Fetch spec forbids `Access-Control-Allow-Credentials: true` together with a wildcard origin — otherwise any site could make authenticated requests on a visitor\'s behalf. For credentialed traffic you must echo the specific request Origin, validated against an allowlist.',
      },
    ],
  },

  /* ---- Lesson: Docker basics ---- */
  {
    id: 'q-2-lesson-docker-basics',
    type: 'lesson',
    title: 'Docker & Service Containers',
    phaseId: 'phase-2',
    order: 5,
    xpReward: 100,
    conceptId: 'c-2-docker-basics',
    prerequisites: ['q-2-lesson-auth'],
    questions: [
      {
        id: 'q1',
        prompt: 'In the command docker run -p 8080:8080 api, what does -p 8080:8080 do?',
        options: [
          'Maps container port 8080 onto host port 8080',
          'Maps host port 8080 onto container port 8080',
          'Limits the container to 8080 requests per second',
          'Sets the container hostname to port 8080',
        ],
        correctIndex: 1,
        explanation: 'The -p flag takes host:container. The first port is on your machine; the second is inside the container, so host 8080 forwards to container 8080.',
      },
      {
        id: 'q2',
        prompt: 'What does the -d flag do in docker run -d?',
        options: [
          'Deletes the container after it exits',
          'Runs the container in the background (detached)',
          'Disables networking for the container',
          'Builds the image before running it',
        ],
        correctIndex: 1,
        explanation: '-d means detached: the container runs in the background and your shell prompt returns immediately, instead of streaming logs to the terminal.',
      },
      {
        id: 'q3',
        prompt: 'Which command lists the containers currently running on this machine?',
        options: ['docker images', 'docker ps', 'docker run', 'docker build'],
        correctIndex: 1,
        explanation: 'docker ps prints the running containers with their ID, image, status, and mapped ports. Add -a to include stopped containers.',
      },
    ],
  },

  /* ---- Command Lab: build & run a service ---- */
  {
    id: 'q-2-command-docker-build',
    type: 'command',
    title: 'Build & Run a Service (Docker)',
    phaseId: 'phase-2',
    order: 6,
    xpReward: 150,
    intro:
      'A teammate wrote an Express API but left no run instructions. Use Docker to build the image, run it locally, and confirm it answers.',
    prerequisites: ['q-2-lesson-docker-basics'],
    steps: [
      {
        prompt: 'Build a Docker image from the Dockerfile in the current directory, tagging it sdgame/api:v1.',
        acceptedPatterns: [
          '^docker\\s+build\\s+-t\\s+sdgame/api:v1\\s+\\.',
          '^docker\\s+build\\s+.*-t\\s+sdgame/api:v1.*\\.',
          '^docker\\s+build\\s+--tag\\s+sdgame/api:v1\\s+\\.',
        ],
        sampleAnswer: 'docker build -t sdgame/api:v1 .',
        hint: '`docker build -t <tag> <context>` — the context `.` means "use the current directory, including its Dockerfile".',
      },
      {
        prompt:
          'Run the image as a detached container named `api` that maps host port 8080 to container port 3000.',
        acceptedPatterns: [
          '^docker\\s+run\\s+.*-d.*--name\\s+api\\s+.*-p\\s+8080:3000.*sdgame/api:v1',
          '^docker\\s+run\\s+.*-d.*-p\\s+8080:3000.*--name\\s+api.*sdgame/api:v1',
          '^docker\\s+run\\s+--name\\s+api\\s+-d\\s+-p\\s+8080:3000\\s+sdgame/api:v1',
          '^docker\\s+run\\s+-d\\s+--name\\s+api\\s+-p\\s+8080:3000\\s+sdgame/api:v1',
        ],
        sampleAnswer: 'docker run -d --name api -p 8080:3000 sdgame/api:v1',
        hint: '`-d` detaches, `--name api` names the container, `-p 8080:3000` maps host:container ports.',
      },
      {
        prompt: 'Confirm the service is up by making an HTTP HEAD request to the health endpoint on localhost:8080/health (show response headers only).',
        acceptedPatterns: [
          '^curl\\s+.*-I.*localhost:8080/health',
          '^curl\\s+.*--head.*localhost:8080/health',
          '^curl\\s+-sI\\s+localhost:8080/health',
          '^curl\\s+.*-I.*127\\.0\\.0\\.1:8080/health',
        ],
        sampleAnswer: 'curl -I http://localhost:8080/health',
        hint: '`curl -I` (capital i) issues a HEAD and prints only the response headers — perfect for a quick health check.',
      },
    ],
  },

  /* ---- Architecture: rate-limited API ---- */
  {
    id: 'q-2-arch-ratelimit',
    type: 'architecture',
    title: 'Design a Rate-Limited Public API',
    phaseId: 'phase-2',
    order: 7,
    xpReward: 250,
    brief:
      'ScaleUp is opening its Orders API to external clients. Design a path from the internet through an API Gateway (which handles auth + rate limiting) to your app servers and database. Target: 2,000 rps with 80% reads, p95 latency ≤ 150 ms, 99.9% availability, under $2,500/month. Hint: the gateway absorbs the rate-limiting work; cache reads to keep the DB calm.',
    allowedComponents: [
      'cdn-cloudflare',
      'lb-l7-nginx',
      'gateway-api',
      'app-node',
      'app-python',
      'db-postgres',
      'db-postgres-replica',
      'redis',
    ],
    requiredComponentTypes: ['gateway', 'appServer', 'dbSQL'],
    target: {
      minRps: 2_000,
      maxLatencyP95: 150,
      maxCostPerMonth: 1_500,
      minAvailability: 0.999,
    },
    traffic: { rps: 2_000, readRatio: 0.8 },
    prerequisites: ['q-2-command-docker-build'],
  },

  /* ---- Incident: security — leaked token + no rate limit ---- */
  {
    id: 'q-2-incident-security',
    type: 'incident',
    title: 'Incident: Token Leak Abuse',
    phaseId: 'phase-2',
    order: 8,
    xpReward: 200,
    failureDescription:
      'Friday 02:14. On-call is paged: billing reports a 50x spike in "password-reset email" sends in 10 minutes, threatening to exhaust the email provider quota and bankrupt the reset flow.',
    symptoms: [
      'Password-reset endpoint /v1/auth/reset gets ~8,000 req/s (normal: ~30/s)',
      'All requests come with a valid service token — but from thousands of different IPs',
      'DB reset table is filling with junk rows; CPU at 92%',
      'Email provider quota at 87% and climbing; will be exhausted in ~15 min',
      'No rate limit is configured on /v1/auth/reset',
    ],
    prerequisites: ['q-2-arch-ratelimit'],
    steps: [
      [
        {
          id: 'a',
          label:
            'Rotate the leaked service token immediately and push a hotfix adding a per-IP rate limit on /v1/auth/reset',
          isCorrect: false,
          feedback:
            'Partially right but misdiagnoses the threat. Requests come from thousands of IPs, so a per-IP limit barely slows the attacker, and the "valid" token suggests compromise — but the bottleneck is the endpoint being callable at scale. Keep thinking.',
        },
        {
          id: 'b',
          label: 'Block all password resets for 24 hours to save the email quota',
          isCorrect: false,
          feedback:
            'This stops the bleeding but burns legitimate users (no password resets for a day). It\'s a blunt instrument, not a diagnosis, and avoids fixing the underlying gap.',
        },
        {
          id: 'c',
          label:
            'Revoke the compromised token, then add a per-token + global rate limit on /v1/auth/reset at the gateway, with an exponential backoff and CAPTCHA after N attempts',
          isCorrect: true,
          feedback:
            'Correct. (1) Revoke the token to kill the attacker\'s access. (2) Add per-token AND global limits at the gateway so the endpoint cannot be hammered regardless of source IP. (3) Exponential backoff + CAPTCHA weeds out scripted abuse while keeping the flow usable for real users. The root cause was the missing rate limit, and the trigger was the leaked token.',
        },
        {
          id: 'd',
          label:
            'Disable password resets for everyone — including legitimate users — until the attack stops',
          isCorrect: false,
          feedback:
            'Overreaction that punishes real users. You would deny a critical flow to every customer to stop one attacker. Rate-limit the abusive pattern at the gateway instead; do not turn the feature off for everyone.',
        },
      ],
    ],
  },

  /* ---- Capstone: Design an Authentication Service ---- */
  {
    id: 'q-2-capstone',
    type: 'architecture',
    title: 'Capstone: Design an Authentication Service',
    phaseId: 'phase-2',
    order: 9,
    xpReward: 500,
    brief:
      'You are now the lead. Design ScaleUp\'s Authentication Service: it issues and validates tokens, manages sessions, and serves login/refresh/logout for the whole product. Target: 3,000 rps (90% reads — token validation dominates), p95 ≤ 120 ms, 99.95% availability, under $3,500/month. Required: an API Gateway fronting your app servers, a cache for fast token/session lookups, and a SQL DB as the system of record for credentials. Hint: validation must NEVER hit the DB on the hot path — cache aggressively and keep tokens short-lived.',
    allowedComponents: [
      'cdn-cloudflare',
      'lb-l7-nginx',
      'gateway-api',
      'app-node',
      'app-python',
      'db-postgres',
      'db-postgres-replica',
      'redis',
    ],
    requiredComponentTypes: ['gateway', 'appServer', 'cache', 'dbSQL'],
    target: {
      minRps: 3_000,
      maxLatencyP95: 120,
      maxCostPerMonth: 1_650,
      minAvailability: 0.9995,
    },
    traffic: { rps: 3_000, readRatio: 0.9 },
    prerequisites: ['q-2-incident-security'],
  },
];
