# SD-GAME — Teaching Guide & Answer Key

> **สำหรับ expert review** — เอกสารนี้สรุปการสอนของเกม SD-GAME ทุกระดับ (Phase 1–8), เฉลยทุก quiz/command/incident, และเฉลยแนวคิดสำหรับ architecture quests เพื่อให้ผู้เชี่ยวชาญตรวจทานความถูกต้องทางวิชาการ (pedagogical + factual accuracy)
>
> ข้อมูลทั้งหมดสกัดจาก source จริงใน `packages/content/src/phases/` (commit `f862885`) — ไม่ invent
>
> **ภาพรวม**: 8 phases · 35 concepts · 67 quests (4 ประเภท: lesson / architecture / incident / command) · Career RPG Junior → Staff Architect · บริษัทโต 10 → 10M users

---

## วิธีอ่านเอกสารนี้

- แต่ละ **Phase** = 1 career act มี **concepts** (บทเรียน) + **quests** (ด่าน)
- **เฉลย Lesson Quiz**: ระบุคำตอบถูก ✅ + คำอธิบาย พร้อมหมายเหตุถ้ามีประเด็นควรตรวจสอบ
- **เฉลย Command Lab**: คำสั่งตัวอย่าง + patterns ที่ยอมรับ + ข้อควรพิจารณา (strictness/leniency)
- **เฉลย Incident**: root cause ที่ถูก + เหตุผล + คำตอบผิดที่เป็น "distractor" และเหตุผลที่ผิด
- **เฉลย Architecture**: โจทย์ + target + แนวคิดเฉลย (topology ที่ผ่าน) — verified โดย solver ที่ brute-force ทุก topology (เทส `solvability.sweep.test.ts`)
- **⚠️ ประเด็นของ reviewer**: จุดที่ผมอยากให้ expert ตรวจโดยเฉพาะ

---

# Phase 1 — Networking Foundations (Junior)

**บริษัท: 10 → 1K users** · Concepts 5 · Quests 9

แนวคิดหลัก: HTTP, TCP/UDP, DNS, CDN, API styles — พื้นฐานว่า internet ส่งข้อมูลกันยังไง

## Concepts
1. HTTP/HTTPS Basics — request/response, methods, status codes
2. TCP vs UDP — reliable ordered vs fire-and-forget
3. DNS — domain → IP resolution chain
4. CDN & Latency — edge caching
5. REST vs gRPC vs GraphQL — API style selection

## เฉลย Lesson Quizzes

### q-1-lesson-http (HTTP Status Codes)
1. ✅ **404 Not Found** — profile ไม่มี = client error (4xx) ไม่ใช่ server fault
2. ✅ **401 Unauthorized** — not authenticated ("who are you?"); 403 = authenticated แต่ขาดสิทธิ์
3. ✅ **POST** — ไม่ idempotent (เรียก 2 ครั้งสร้าง 2 records); GET/PUT/DELETE idempotent
4. ✅ **429 Too Many Requests** — rate-limited ให้ client back off; 503 = server ล่ม

### q-1-lesson-tcp (TCP vs UDP)
1. ✅ **SYN → SYN-ACK → ACK** — three-way handshake (1 round trip)
2. ✅ **A live video call** — UDP สำหรับ latency-sensitive, tolerate loss
3. ✅ **Reliable, ordered delivery** — TCP รับประกัน; UDP best-effort
4. ✅ **Queries are small and latency matters more than perfect delivery** — DNS over UDP หลีก HW handshake

### q-1-lesson-dns (DNS Resolution)
1. ✅ **multiple round trips up the resolver chain** — root → TLD → authoritative
2. ✅ **entire service is unreachable** — clients หา IP ไม่ได้; DNS ต้อง HA

### q-1-lesson-cdn (CDN & Latency)
1. ✅ **Lower latency everywhere + less origin load**
2. ✅ **90% served from edge; origin sees ~10%**
3. ✅ **Per-user personalized data** — ไม่ควร cache (stale wrong data)
4. ✅ **Absorbs surge at the edge**

### q-1-lesson-api-styles (REST vs gRPC vs GraphQL)
1. ✅ **REST** — browser-native, resource-oriented
2. ✅ **gRPC** — internal, low-latency, streaming
3. ✅ **Client queries exactly the fields it needs** — solves over/under-fetch
4. ✅ **Protocol Buffers** — binary over HTTP/2

## เฉลย Command Lab: q-1-command-tools (Networking CLI)
1. `dig api.example.com` (หรือ `nslookup`) — DNS lookup
2. `curl -I https://api.example.com` (`-I` = HEAD, headers only)
3. `traceroute api.example.com` (หรือ `mtr`)

⚠️ **reviewer note**: patterns ค่อนข้างเข้มงวด (ต้องตรง `api.example.com`); ยอมรับหลาย tool (`dig`/`nslookup`, `traceroute`/`tracert`/`mtr`)

## เฉลย Incident: q-1-incident-dns (Site Unreachable)
**อาการ**: 100% requests fail *ก่อน* ถึง app · app/DB idle · ทุก region พร้อมกัน
**Root cause ที่ถูก ✅**: **DNS failing to resolve** — requests ตายก่อนถึงระบบ (classic DNS outage)
**ทำไมตัวเลือกอื่นผิด**: app crashed/DB down = จะเห็น errors ที่ app layer (ไม่ใช่ pre-app); bad deploy = errors ที่ app

## เฉลย Architecture (verified solvable)
| Quest | Target | แนวคิดเฉลย |
|---|---|---|
| q-1-arch-shortener | 1k rps, ≤120ms, 99.9%, ≤$2k | CDN → LB → app (×2) → cache → DB; LB+app+DB required |
| q-1-capstone | 5k rps, ≤80ms, 99.95%, ≤$3k | เหมือน + cache **required** (read-heavy 95%), replica ที่ data layer เพื่อ availability |

---

# Phase 2 — Backend Engineering (Junior)

**1K → 10K users** · Concepts 4 · Quests 8

## Concepts
1. REST API Design — idempotency, versioning, status codes
2. Authentication — JWT vs sessions vs OAuth
3. Rate Limiting — token vs leaky bucket
4. Web Security — OWASP, CORS, CSP

## เฉลย Lesson Quizzes

### q-2-lesson-api (REST API Design)
1. ✅ **Idempotency-Key header** — dedupe retries บน POST (non-idempotent)
2. ✅ **PATCH /orders/42** — resource + method; verb ใน path (`/updateOrderStatus`) = anti-pattern
3. ✅ **422 Unprocessable Entity** — well-formed แต่ผิด business rule (negative qty)
4. ✅ **Query params break cache keys** — path versioning ดีกว่า

### q-2-lesson-auth (Auth)
1. ✅ **JWTs stateless — no server record to delete** — revoke ยาก (ต้อง blocklist)
2. ✅ **Token never passes through browser** — code+secret exchange ป้องกัน XSS theft
3. ✅ **XSS can read localStorage** — ใช้ HttpOnly cookies
4. ✅ **Server-side sessions** — delete row = instant revoke

### q-2-lesson-rate-limiting
1. ✅ **Token bucket** — tolerate bursts up to capacity, bounded average
2. ✅ **Leaky bucket** — strict outflow เข้ากับ DB capacity (smooth bursts)
3. ✅ **429 + Retry-After** — RFC 6585; บอก client ว่าเมื่อไหร่ retry
4. ✅ **At the edge (API gateway)** — reject ก่อนถึง app/DB

### q-2-lesson-web-security
1. ✅ **Parameterized queries** — input bound เป็น value, ไม่ใช่ SQL; char-stripping = brittle blocklist
2. ✅ **CORS is browser-enforced; non-browser clients ignore it** — ไม่ใช่ server-side auth
3. ✅ **CSP with `script-src 'self'`** — block injected script ที่ execution time
4. ✅ **Wildcard + credentials rejected** by Fetch spec — ต้อง echo specific origin

⚠️ **reviewer note Q2 (CORS)**: คำอธิบาย "bound to client_secret" พูดถึง authorization code ไม่ใช่ตัว code เอง — ถูก conceptually แต่อาจสับสนเล็กน้อย

## เฉลย Command Lab: q-2-command-docker-build (Build & Run with Docker)
1. `docker build -t sdgame/api:v1 .`
2. `docker run -d --name api -p 8080:3000 sdgame/api:v1`
3. `curl -I http://localhost:8080/health`

⚠️ **reviewer note**: step 3 prompt เคยบอก "HTTP GET" แต่คำตอบคือ HEAD (`-I`) — **แก้แล้ว** เป็น "HTTP HEAD request"

## เฉลย Incident: q-2-incident-security (Token Leak Abuse)
**อาการ**: password-reset email spike 50x · valid service token · thousands of IPs · DB 90%+ · email quota จะหมด
**Root cause ✅**: **Revoke token + per-token AND global rate limit at gateway + backoff/CAPTCHA**
**เหตุผล**: per-IP limit ไม่พอ (thousands of IPs); root cause = missing rate limit; trigger = leaked token

## เฉลย Architecture
| Quest | Target | แนวคิด |
|---|---|---|
| q-2-arch-ratelimit | 2k rps, ≤150ms, 99.9%, ≤$2.5k | gateway (auth+ratelimit) + app + DB; cache reads |
| q-2-capstone (Auth Service) | 3k rps, ≤120ms, 99.95%, ≤$3.5k | gateway + app + **cache (token lookup)** + SQL; validation ห้าม hit DB hot path |

---

# Phase 3 — Data Layer (Mid)

**10K → 100K users** · Concepts 4 · Quests 8

## Concepts
1. SQL, ACID & Indexing — B-tree, EXPLAIN
2. NoSQL Trade-offs — document/wide-column/key-value/graph
3. Replication & CAP — primary/replica, CAP/PACELC
4. Sharding & Partitioning — hot partitions, consistent hashing

## เฉลย Lesson Quizzes

### q-3-lesson-sql (SQL/ACID/Indexes)
1. ✅ **Neither persists — rolled back (Atomicity)** — all-or-nothing
2. ✅ **B-tree index on email** — O(n) scan → O(log n); ก่อน shard
3. ✅ **Seq Scan = reads every row** — add index
4. ✅ **Small write-heavy table** — index เพิ่ม write overhead เกินประโยชน์

### q-3-lesson-nosql (NoSQL Trade-offs)
1. ✅ **Document (Mongo)** — nested profile, schema evolves, no JOIN
2. ✅ **Cassandra = massive writes + multi-region, queries follow partition key, no JOINs**
3. ✅ **Key-value (Redis)** — microsecond reads, sessions/leaderboards
4. ✅ **Start with Postgres; NoSQL only when you can name the problem**

### q-3-lesson-cap (CAP & Replication)
1. ✅ **Replica lag** — async replica ยังไม่ catch up
2. ✅ **AP** — accept writes ทั้งสองฝั่ง partition, reconcile later (Cassandra/Dynamo)
3. ✅ **P is forced on real networks** — เลือก C vs A *ระหว่าง* partition
4. ✅ **Eventual consistency** — leaderboard tolerate staleness

### q-3-lesson-sharding (Sharding)
1. ✅ **Replication = same data copies; sharding = different data splits**
2. ✅ **hash(key) mod N → nearly every key remaps เมื่อ N เปลี่ยน** — นี่คือเหตุที่ต้อง consistent hashing
3. ✅ **Hot partition (celebrity key) → compound key/salt**
4. ✅ **Cache → read replicas → tune → archive BEFORE sharding**

## เฉลย Command Lab: q-3-command-sql (SQL Terminal)
1. `\c orders` (psql switch db)
2. `SELECT id, user_id, created_at FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 10;`
3. `EXPLAIN SELECT ... WHERE user_id = 42;`

⚠️ **reviewer note**: patterns case-insensitive (engine ใส่ `i` flag) — รับ `select`/`SELECT`. Pattern 3 ของ step 1 (`psql -d orders ... \b.*orders`) เคยบั๊ก (requires "orders" สองครั้ง) แต่ patterns 1-2 ครอบคลุมแล้ว

## เฉลย Incident: q-3-incident-hotpartition (Feed Latency Spike)
**อาการ**: 1 replica CPU 100%, 2 ตัว idle, replica lag โต · primary healthy
**Root cause ✅**: **Read router/load-balancer skew** — route reads ไม่สม่ำเสมอ; fix router (round-robin/least-connections)
⚠️ **reviewer note (สำคัญ)**: โจทย์เดิมเคยเรียก "hot partition/shard key" แต่ replicas ถือข้อมูลเหมือนกัน (ไม่มี shard key) → ปรับเป็น "read-routing skew" แล้ว. Expert ควรยืนยันว่า framing ถูก

## เฉลย Architecture
| Quest | Target | แนวคิด |
|---|---|---|
| q-3-arch-sharding | 3k rps, ≤120ms, 99.9%, ≤$3k | read replica + Redis cache หน้า Postgres (90% reads) |
| q-3-capstone (Social Feed "Chirp") | 8k rps, ≤100ms, 99.9%, ≤$4k | app + cache + NoSQL (95% reads); fan-out-on-write |

---

# Phase 4 — Caching & Performance (Mid)

**100K → 500K users** · Concepts 4 · Quests 8

## Concepts
1. Cache Strategies — cache-aside/read-through/write-through/write-back
2. Cache Invalidation & Eviction — TTL, LRU/LFU
3. Distributed Caching — Redis cluster, stampede
4. CDN Caching & Hit-Ratio Economics

## เฉลย Lesson Quizzes

### q-4-lesson-strategies (Cache Strategies)
1. ✅ **cache-aside + TTL** — default สำหรับ read-heavy
2. ✅ **write-back** — fastest writes, tolerate loss (logs/events)
3. ✅ **Higher write latency, but always consistent** (write-through)
4. ✅ **Delete the key** (ไม่ update) — หลีก race condition

### q-4-lesson-invalidation (Invalidation & Eviction)
1. ✅ **Cache invalidation + naming things** (Karlton quote)
2. ✅ **LRU = key accessed longest ago**
3. ✅ **TTL** — self-cleaning
4. ✅ **Update risks race → stale indefinitely; delete instead**

### q-4-lesson-distributed (Distributed Caching)
1. ✅ **16,384 hash slots** — Redis Cluster, CRC16
2. ✅ **Cache stampede (thundering herd)**
3. ✅ **Single-flight/mutex** — one request refills
4. ✅ **Replication async → replica lag → stale read**

### q-4-lesson-cdn (CDN Hit-Ratio)
1. ✅ **10%** (miss = 1 − hit ratio)
2. ✅ **Edge latency + origin load + egress cost** — 3 อย่างพร้อมกัน
3. ✅ **`public, max-age=31536000, immutable`** — hashed assets
4. ✅ **`Vary: Cookie` fragments cache key** — per-user cookie ทำ miss เกือบทั้งหมด

⚠️ **reviewer note**: concept c-4-invalidation เคยเขียนว่า "Redis default allkeys-lru" ผิด (จริงๆ default = `noeviction`) — **แก้แล้ว**

## เฉลย Command Lab: q-4-command-redis (Redis CLI)
1. `SET user:42 '{"id":42,"name":"ada"}' EX 300`
2. `GET user:42`
3. `INFO stats` (keyspace_hits/misses)

⚠️ **reviewer note**: pattern step 3 เคยมี `^INFO\s+server\b` ผิด (`INFO server` ไม่มี keyspace_hits; มีใน `INFO stats`/`INFO all`) — **แก้แล้ว** เป็น stats/all/bare

## เฉลย Incident: q-4-incident-stampede (Cache Stampede)
**อาการ**: hot key expire → DB CPU 100% · hit ratio 95%→30% · app blocked on DB
**Root cause ✅**: **Cache stampede — single-flight/mutex + stale-while-revalidate**
**เหตุผล**: TTL expire → 200 requests miss พร้อมกัน → pile onto DB; coalesce refill + serve stale

## เฉลย Architecture
| Quest | Target | แนวคิด |
|---|---|---|
| q-4-arch-addcache | 5k rps, ≤60ms, 99.9%, ≤$2.5k | app + **cache** + DB (95% reads) |
| q-4-capstone (Optimize Slow API) | 10k rps, ≤80ms, 99.95%, ≤$3k | CDN + app + cache + DB (97% reads) |

---

# Phase 5 — System Design Patterns (Senior)

**500K → 1M users** · Concepts 4 · Quests 8

## Concepts
1. Load Balancing — L4/L7, algorithms
2. Message Queues — Kafka vs RabbitMQ
3. Microservices vs Monolith
4. Event-Driven Architecture

## เฉลย Lesson Quizzes

### q-5-lesson-lb (Load Balancing)
1. ✅ **Least-connections** — หลีก servers ที่ติด slow work
2. ✅ **L7 routes by URL/host; L4 balances TCP only**
3. ✅ **IP-hash** — sticky sessions ไม่ต้อง cookie
4. ✅ **Removes failing server from rotation** (health checks)

### q-5-lesson-queue (Queues)
1. ✅ **API returns 202 immediately** — decouple
2. ✅ **Kafka** — retains messages, replay offset (RabbitMQ deletes on ack)
3. ✅ **Idempotent** — at-least-once = duplicates ต้อง handle
4. ✅ **Dead-letter queue (DLQ)** — poison messages

### q-5-lesson-microservices
1. ✅ **No — stay monolith** (small team, unclear boundaries)
2. ✅ **Distributed monolith** (shared DB + coupled deploys = จ่ายทั้งสอง cost)
3. ✅ **Conway's Law** — architecture mirrors org structure
4. ✅ **Decouples — inventory down ยัง publish ได้** (eventual consistency)

### q-5-lesson-event-driven
1. ✅ **"OrderPlaced" = event (fact); "SendInvoice" = command (imperative)**
2. ✅ **Idempotent** — duplicates จะเกิด
3. ✅ **Nothing in producer — just subscribe** (superpower ของ event-driven)
4. ✅ **Synchronous call for immediate answer** — events สำหรับ downstream reactions

## เฉลย Command Lab: q-5-command-kafka (Kafka CLI)
1. `kafka-topics --bootstrap-server localhost:9092 --create --topic orders --partitions 3 --replication-factor 1`
2. `echo '{"order_id":42}' | kafka-console-producer --bootstrap-server localhost:9092 --topic orders`
3. `kafka-console-consumer --bootstrap-server localhost:9092 --topic orders --from-beginning`

⚠️ **reviewer note**: step 1 patterns ตรวจ `--partitions 3` และ `--replication-factor 1` แต่อาจ strict เรื่อง flag ordering — sample answer ผ่านแน่นอน

## เฉลย Incident: q-5-incident-backlog (Order Confirmations Delayed)
**อาการ**: API latency ปกติ · consumer lag 50k+ climbing · email-worker CPU 100%
**Root cause ✅**: **Scale out email workers** (consumer lag = producers > consumers)
**เหตุผล**: broker healthy; replication factor ไม่ช่วย throughput; restart broker เสี่ยง lose messages

## เฉลย Architecture
| Quest | Target | แนวคิด |
|---|---|---|
| q-5-arch-queue | 6k rps, ≤100ms, 99.9%, ≤$3.5k | app → **Kafka** → worker → DB (decouple writes) |
| q-5-capstone (Checkout) | 8k rps, ≤120ms, 99.95%, ≤$4.5k | gateway + app + queue + DB + cache (no SPOF) |

---

# Phase 6 — Scalability & Reliability (Senior)

**1M → 5M users** · Concepts 4 · Quests 8

## Concepts
1. Horizontal vs Vertical Scaling
2. Auto-Scaling — policies, cooldown, predictive
3. Resilience — circuit breaker, bulkhead, backpressure
4. Chaos Engineering & Cascading Failures

## เฉลย Lesson Quizzes

### q-6-lesson-scaling
1. ✅ **Add instances behind LB** (stateless = scale out)
2. ✅ **Hard ceiling + downtime** (vertical)
3. ✅ **Any request → any node; state must be externalized**
4. ✅ **Scale up vertically** (SQL primary, writes ไม่ไป replica)

### q-6-lesson-autoscaling
1. ✅ **Cooldown prevents thrashing**
2. ✅ **Target tracking** ("keep CPU at 60%")
3. ✅ **Predictive pre-warms before spike**
4. ✅ **Min/max bounds** — cap fleet size

### q-6-lesson-resilience
1. ✅ **Open = fail fast, don't call downstream**
2. ✅ **Thread/connection pool exhausted** (without bulkhead)
3. ✅ **Bound queue + backpressure**
4. ✅ **Half-open = single probe to test recovery**

### q-6-lesson-chaos
1. ✅ **Connection/thread pool exhausted → health checks fail → LB drains**
2. ✅ **Chaos engineering = deliberate failure injection**
3. ✅ **Retry storms** (thundering herd amplifier)
4. ✅ **Define steady-state hypothesis first**

## เฉลย Command Lab: q-6-command-autoscale (kubectl autoscale)
1. `kubectl get deployment api`
2. `kubectl scale deployment api --replicas=6`
3. `kubectl autoscale deployment api --cpu-percent=70 --min=3 --max=10`

⚠️ **reviewer note**: patterns ยอมรับ `deployment api` และ `deployment/api` ทั้งสองรูปแบบ; step 1 pattern 2 อาจรับชื่อ deployment อื่น (loose) แต่ pattern 1 เข้มกว่า

## เฉลย Incident: q-6-incident-cascade (The Slow Death)
**อาการ**: error 0.1%→38% · DB latency 10→90ms (~9×) · app memory 95% · connection pool maxed · DB ไม่ down
**Root cause ✅**: **Query-plan regression → slow DB → unbounded shared connection pool exhausted → thread pile-up → OOM**
**Mitigate**: load-shed + bound pools + timeout/bulkhead; fix query plan; circuit breaker บน DB path
⚠️ **reviewer note**: เคยเขียน "tripled" แต่ 10→90ms = 9× → **แก้แล้ว** เป็น "~9×"

## เฉลย Architecture
| Quest | Target | แนวคิด |
|---|---|---|
| q-6-arch-replicas | 15k rps, ≤90ms, 99.99%, ≤$4k | LB + many app replicas + read replica + cache (90% reads) |
| q-6-capstone (Streaming "Streamly") | 25k rps, ≤70ms, 99.99%, ≤$5k | **CDN edge** (98% reads) + LB + app + cache + NoSQL |

---

# Phase 7 — DevOps & Infrastructure (Staff)

**5M → 8M users** · Concepts 5 · Quests 10

## Concepts
1. Docker & Containerization
2. Kubernetes — pods/deployments/services
3. CI/CD & Deployment Strategies
4. Infrastructure as Code (Terraform)
5. Observability — metrics/logs/traces

## เฉลย Lesson Quizzes

### q-7-lesson-docker
1. ✅ **App + deps + userland — everything but the kernel**
2. ✅ **Speeds up rebuilds by reusing unchanged layers**
3. ✅ **`COPY`** directive
4. ✅ **`COPY package*.json` before `COPY . .`** — deps cached, code edits rebuild cheap layers

⚠️ **reviewer note (สำคัญ)**: Q2 explanation เคยเขียนกลับด้าน ("layers above rebuilt, below reused") — **แก้แล้ว** เป็น "layers above reused (cached); changed line + below rebuilt". Expert ควรยืนยัน

### q-7-lesson-kubernetes
1. ✅ **Pod** (smallest deployable unit)
2. ✅ **Service = stable IP/DNS สำหรับ ephemeral pods**
3. ✅ **Reconciliation loop reschedules** (self-healing)
4. ✅ **Deployment** (wraps ReplicaSet, rolling updates)

### q-7-lesson-cicd
1. ✅ **Build → Test → Deploy**
2. ✅ **Canary** (small % → ramp)
3. ✅ **Blue-green = zero downtime + instant rollback** (2× capacity)
4. ✅ **Roll back first, debug later**

### q-7-lesson-terraform
1. ✅ **Declarative = desired state; Terraform computes diff**
2. ✅ **`plan` = preview diff, no changes**
3. ✅ **Remote state = locking + secrets out of git**
4. ✅ **Idempotent — second run finds nothing to change**

### q-7-lesson-observability
1. ✅ **Traces** (where 800ms went, across services)
2. ✅ **RED = Rate, Errors, Duration**
3. ✅ **Prometheus scrapes `/metrics`**
4. ✅ **Alert on SLO burn rate** (user-visible harm, actionable)

## เฉลย Command Labs (3 ตัวใน phase นี้)
**q-7-command-docker**: `docker build -t app .` → `docker run -p 8080:8080 app` → `docker ps`
**q-7-command-k8s**: `kubectl get pods` → `kubectl describe pod checkout-abc123` → `kubectl rollout status deployment/checkout`
**q-7-command-terraform**: `terraform plan` → `terraform apply`

## เฉลย Incident: q-7-incident-deploy (Bad Deploy)
**อาการ**: v2.4 deploy → error 0.1%→18% · 97% = 500 ที่ /checkout · payment-client library bump · DB/network normal
**Root cause ✅**: **Roll back to v2.3 immediately, debug offline** (`kubectl rollout undo`)
**เหตุผล**: software defect ไม่ใช่ capacity; restart = broken pods เพิ่ม; canary = future improvement ไม่ใช่ cure

## เฉลย Architecture
| Quest | Target | แนวคิด |
|---|---|---|
| q-7-capstone (Resilient Runtime) | 10k rps, ≤100ms, 99.99%, ≤$4.5k | LB + app replicas + DB + **queue** (absorb bursts); 4 required types |

---

# Phase 8 — Advanced (Staff Architect)

**8M → 10M users** · Concepts 4 · Quests 8

## Concepts
1. Multi-Region Architectures — active-active/passive, RTO/RPO
2. Database Internals — B-trees vs LSM-trees
3. Consensus — Raft/Paxos, quorum, split-brain
4. Distributed Transactions — 2PC/SAGA/outbox, serverless/edge

## เฉลย Lesson Quizzes

### q-8-lesson-multiregion
1. ✅ **RPO=30s, RTO≈4m30s** — RPO=replication lag; RTO=DNS failover+drift
2. ✅ **Region-pinned data + global routing layer** (GDPR)
3. ✅ **Zero failover แต่ conflict resolution** (active-active)
4. ✅ **Cross-region RTT 80-200ms/write** — ฆ่า latency

⚠️ **reviewer note Q1**: RTO อาจ debatable — strict definition คือ "time to restore service" = 4 min DNS failover; replication lag จัดเป็น RPO ไม่ใช่ RTO. คำตอบรวม lag เข้า RTO อาจไม่ตรง textbook 100%. Expert ควรชี้

### q-8-lesson-database-internals
1. ✅ **LSM-tree** (write-heavy, MemTable+WAL+SSTables)
2. ✅ **WAF = physical/logical bytes (lower better)**
3. ✅ **Bloom filter** (skip SSTables)
4. ✅ **Compaction falls behind → read amplification → p99 spike**

### q-8-lesson-consensus
1. ✅ **2 failures** (N=5, quorum=3, F=2)
2. ✅ **Even-N = costs more, tolerates same as N−1**
3. ✅ **Minority 2 < quorum 3 → read-only, reject writes**
4. ✅ **Randomized timeouts break ties**

### q-8-lesson-distributed-tx
1. ✅ **2PC: participants block holding locks** (coordinator crash = classic)
2. ✅ **SAGA: gives up isolation, compensating transactions**
3. ✅ **Transactional outbox + CDC** (atomic DB write + outbox row → publish)
4. ✅ **Edge ~5-20ms แต่ state authoritative ยังอยู่ regional**

## เฉลย Command Lab: q-8-command-failover (Regional Failover)
1. `kubectl drain ip-10-0-3-42.ec2.internal --ignore-daemonsets --delete-emptydir-data`
2. `aws route53 change-resource-record-sets --hosted-zone-id Z2MOCKHOSTEDZONE --change-batch file://failover-to-ap-southeast-1.json`
3. `aws route53 get-health-check-status --health-check-id abc123de-failover`

⚠️ **reviewer note**: step 3 เคยมี pattern `get-health-check --id` ผิด (flag จริง = `--health-check-id` หรือใช้ `get-health-check-status`) — **แก้แล้ว**

## เฉลย Incident: q-8-incident-splitbrain (Split-Brain During Partition)
**อาการ**: 5-node etcd partitioned 2 vs 3 · majority ทำงาน · minority stall · ไม่มี node crash
**Root cause ✅**: **Route clients to 3-node majority; leave minority stalled until heal**
**เหตุผล**: เฉพาะ majority (3/5) reach quorum; minority refuse commits → rejoin + catch up via Raft log; ไม่มี divergence
⚠️ **reviewer note (สำคัญ)**: เดิมเคยเป็น Cassandra (leaderless) แต่ choice "promote a leader" ไม่ตรับกับ Cassandra → **เปลี่ยนเป็น etcd (Raft)** แล้ว ทำให้ "leader/minority/quorum" ถูกต้อง. Expert ควรยืนยัน

## เฉลย Architecture
| Quest | Target | แนวคิด |
|---|---|---|
| q-8-arch-multiregion | 40k rps, ≤80ms, **99.999% (5 nines)**, ≤$8k | CDN + LB + app + Cassandra + cache (5 nines ต้อง replica เยอะ) |
| q-8-capstone (Global System) | 50k rps, ≤120ms, 99.99%, ≤$10k | CDN + LB + app (many replicas) + Cassandra + cache; queue decouple writes |

⚠️ **reviewer note (q-8-capstone)**: target เคย 70ms + 5-nines (unsolvable — app-node 5k cap saturate ที่ 50k) → **แก้แล้ว** เป็น 120ms + 4-nines (สมจริงสำหรับ global cross-region). Expert ควรยืนยันว่า achievable & pedagogically sound

---

# ประเด็นสำหรับ Expert Review (สรุป)

ตามลำดับความสำคัญ — จุดที่ expert ควรตรวจโดยเฉพาะ:

| # | Phase | ประเด็น | สถานะปัจจุบัน |
|---|---|---|---|
| 1 | P3 | incident hotpartition framing (replicas vs shards) — read-routing skew ถูกไหม | แก้แล้ว เป็น routing skew |
| 2 | P7 | docker layer caching explanation — direction ถูกไหม | แก้แล้ว (above cached, below rebuilt) |
| 3 | P8 | Cassandra→etcd สำหรับ split-brain (leader terminology ถูกไหม) | เปลี่ยนเป็น etcd แล้ว |
| 4 | P8 | RTO รวม replication lag เข้าไป — strict definition ถูกไหม | ยังเป็นตามเดิม (อาจ debatable) |
| 5 | P8 | q-8-capstone target 120ms/4-nines — achievable & sound | แก้แล้ว จาก 70ms/5-nines |
| 6 | P4 | Redis default policy (noeviction ไม่ใช่ allkeys-lru) | แก้แล้ว |
| 7 | P2 | CORS explanation "bound to client_secret" อาจคลุมเครือ | ยังเป็นตามเดิม |
| 8 | ทั้งหมด | command lab patterns — strict/loose balance เหมาะไหม | sample ผ่านหมด; leniency พอใช้ |

นอกจากนี้ expert ควรตรวจ:
- **ความถูกต้องของ concept bodies** (markdown ในไฟล์ phase) — เอกสารนี้สรุปเฉพาะ quiz/answer, concept body เต็มอยู่ใน `packages/content/src/phases/phase-N-*.ts`
- **spiral progression**: แต่ละ phase สร้างบนก่อนหน้าไหม (P1 network → P2 backend → P3 data → ... → P8 advanced)
- **difficulty curve**: 50 quizzes + 15 architecture + 8 incidents + 12 commands = เหมาะกับ Junior→Staff ไหม

---

## Verification infrastructure (สำหรับ expert อ้างอิง)

- `packages/game-engine/src/content.integrity.test.ts` — ตรวจทุก quiz มี correctIndex ใน range, regex คอมไพล์ได้, components มีจริง
- `packages/game-engine/src/solvability.sweep.test.ts` — brute-force topology ผ่านให้ทุก architecture quest (15/15)
- `packages/game-engine/src/coverage.audit.test.ts` — ทุก concept มี lesson, ไม่มี dead-end prereq, badge reachable
- รวม **64 unit tests ผ่านทั้งหมด**

*เอกสารนี้ generate จาก source commit `f862885` · 2026-07-07*
