# 🎮 SD-GAME: System Design 0→Hero — Design Document

> **ชื่อโปรเจกต์**: `sd-game` (ชื่อรหัส: System Design Joyful)
> **ประเภท**: Design Document (code-ready, ยังไม่ implement)
> **วันที่**: 2026-07-06
> **สถานะ**: Approved — พร้อม implement ในอนาคต

---

## 1. Context (ที่มาและเป้าหมาย)

### ปัญหา
นักพัฒนาซอฟต์แวร์จำนวนมากเขียนโค้ดเป็น แต่ขาดความเข้าใจใน "ภาพใหญ่" — ระบบขนาดใหญ่ทำงานอย่างไร, ทำไมต้องมี load balancer, cache, message queue, ทำไมระบบล่มตอน Black Friday เนื้อหา System Design + Networking + DevOps + Infra กระจัดกระจาย และเรียนแบบ passive (อ่าน/ดูวิดีโอ) ทำให้จำไม่ได้

### เป้าหมาย
สร้าง **เกมเรียนรู้แบบ interactive simulation** ที่ให้ผู้เล่น "ลงมือทำ" System Design ตั้งแต่ 0 → hero ผ่าน:
- **Career RPG**: ผู้เล่นเป็น SRE/Architect ของ startup ที่โตจาก 10 → 10M users
- **Quest-based**: แต่ละด่าน = โจทย์จริง (design URL shortener, แก้ outage, ตั้ง CI/CD)
- **Gamification**: XP, level, streak, badge, skill tree, league
- **ครอบคลุม**: Networking → Backend → Data → Caching → SD Patterns → Scalability → DevOps/Infra → Advanced

### ผลลัพธ์ที่ต้องการจากงานชิ้นนี้
**Design Document ฉบับสมบูรณ์ที่ code-ready** — มีรายละเอียดเพียงพอที่ในอนาคตเขียนโค้ดตามได้ทันที (architecture, curriculum, game mechanics, simulation engine, tech stack, file structure)

### ผู้เล่นเป้าหมาย
- **Junior/Student**: ยังไม่รู้ HTTP/DNS/LB — มี track เริ่มต้น
- **Mid-level dev**: อยากเข้าใจ scale, infra เพื่อ advance
- **Interview prep**: เตรียม FAANG system design interview
- **Staff Architect**: track ลึก multi-region, consensus

---

## 2. Core Game Concept

### Elevator Pitch
> *"Duolingo × LeetCode × SimCity สำหรับ Software Engineer — เริ่มจาก junior แก้บั๊ก monolith แล้วโตไปเป็น staff architect ที่ออกแบบระบบ multi-region รองรับ 10M users ผ่านการลาก architecture จริง แล้วเห็นผล latency/cost/availability ทันที"*

### Career Story (RPG Spine)
ผู้เล่นเข้าทำงานที่ **"ScaleUp Inc."** startup สมมติ และไต่ระดับตำแหน่ง:

| Level | ตำแหน่ง | Scale ของบริษัท | Phase ที่เกี่ยวข้อง |
|---|---|---|---|
| 1-10 | Junior Engineer | 10-1K users, monolith | Phase 1-2 |
| 11-25 | Mid Engineer | 1K-100K users | Phase 3-4 |
| 26-40 | Senior Engineer | 100K-1M users, microservices | Phase 5-6 |
| 41-50 | Staff Architect | 1M-10M users, multi-region | Phase 7-8 |

### Core Gameplay Loop
```
อ่าน concept (lesson) → ทำ quiz (spaced repetition) → รับโจทย์ (quest)
   → ลาก architecture (canvas) → รัน simulation → ได้คะแนน (XP/grade)
   → manager ให้ feedback → ปลดล็อก concept/quest ถัดไป → เลื่อนตำแหน่ง
```

### 4 Quest Types (ประเภทด่าน)
1. **Lesson Quiz** — เรียน concept + ตอบคำถาม (SM-2 spaced repetition)
2. **Architecture Challenge** — ลาก components บน React Flow canvas เพื่อ design ระบบตามโจทย์ → simulation engine ให้คะแนน latency/cost/availability
3. **Incident Challenge** — ระบบล่ม (chaos) → ผู้เล่นหาสาเหตุ + แก้ (เหมือน SRE on-call)
4. **Command Lab** — พิมพ์ command จริงใน simulated terminal (docker, kubectl) ที่ตรวจ input ด้วย pattern matching

---

## 3. Curriculum Map (8 Phases × Career Acts)

แต่ละ phase = 1 career act มี: **concepts** (บทเรียน), **quests** (ด่าน), **capstone** (โจทย์ใหญ่ประจำ phase)

### Phase 1 — Networking Foundations (Act: Junior) 🟢
- **Concepts**: HTTP/HTTPS, TCP/UDP, DNS, TLS handshake, CDN, latency/RPS พื้นฐาน, REST vs gRPC vs GraphQL
- **Quests**:
  - Lesson Quiz: "HTTP status code ตัวไหนใช้ตอนไหน"
  - Architecture: "Design URL Shortener" (ลาก LB + app server + DB)
  - Command Lab: `curl`, `dig`, `traceroute` simulated
- **Capstone**: URL Shortener (100 RPS, 99.9% uptime)
- **Simulation focus**: เห็น effect ของ CDN, ผลกระทบ latency ของ TLS, DNS resolution

### Phase 2 — Backend Engineering (Act: Junior→Mid) 🟢
- **Concepts**: API design (REST, idempotency, versioning), Auth (JWT, OAuth, session), Rate limiting (token/leaky bucket), OWASP top 10, CORS/CSP
- **Quests**: Auth service design, rate-limiter tuning quiz, security incident
- **Capstone**: Authentication Service
- **Simulation focus**: ผลของ rate limiting ตอน traffic spike, security misconfig outcome

### Phase 3 — Data Layer (Act: Mid) 🟡
- **Concepts**: SQL/ACID/indexing, NoSQL (Mongo, Cassandra, Redis), data modeling, replication, CAP theorem, sharding/partitioning
- **Quests**: เลือก DB ที่เหมาะกับ use case, sharding strategy, consistency trade-off
- **Capstone**: Social Feed (Twitter clone)
- **Simulation focus**: ผลของ hot partition, read replica vs primary trade-off

### Phase 4 — Caching & Performance (Act: Mid) 🟡
- **Concepts**: cache strategies (write-through/back/aside), invalidation (TTL, LRU/LFU), Redis cluster, CDN caching
- **Quests**: optimize slow API, cache invalidation incident (stale data)
- **Capstone**: ลด latency API จาก 800ms → <100ms
- **Simulation focus**: cache hit ratio vs cost, thundering herd

### Phase 5 — System Design Patterns (Act: Senior) 🟠
- **Concepts**: Load balancing (L4/L7, algorithms), message queues (Kafka, RabbitMQ), microservices vs monolith, event-driven
- **Quests**: e-commerce checkout, decouple service ด้วย queue
- **Capstone**: E-commerce Checkout
- **Simulation focus**: queue backlog, LB algorithm effect ตอน uneven load

### Phase 6 — Scalability & Reliability (Act: Senior) 🟠
- **Concepts**: horizontal/vertical scaling, auto-scaling, circuit breaker, bulkhead, backpressure, chaos engineering
- **Quests**: survive Black Friday spike, หา cascading failure root cause
- **Capstone**: Streaming Service (Netflix clone)
- **Simulation focus**: chaos injection (DB crash, network partition) + cascade visualization

### Phase 7 — DevOps & Infrastructure (Act: Senior→Staff) 🔵
- **Concepts**: Linux/OS, Docker, Kubernetes (pod/service/deploy), CI/CD (GitHub Actions, ArgoCD), IaC (Terraform), observability (Prometheus, Grafana, OpenTelemetry, tracing)
- **Quests**: เขียน Dockerfile ถูก, แก้ k8s manifest ผิด, debug จาก Grafana dashboard
- **Capstone**: Build deploy pipeline (commit → CI → CD → prod)
- **Command Lab**: `docker build/run`, `kubectl get/describe/rollout`, `terraform plan`
- **Simulation focus**: deploy แล้ว downtime? rollback, canary vs blue-green

### Phase 8 — Advanced (Act: Staff Architect) 🔴
- **Concepts**: multi-region, DB internals (B-tree, LSM), consensus (Raft, Paxos), distributed transactions (SAGA, 2PC), serverless/edge
- **Quests**: multi-region active-active, แก้ split-brain
- **Capstone**: Global Multi-Region System (10M users, 99.99% uptime)
- **Simulation focus**: cross-region latency, failover RTO/RPO

> **Legend**: 🟢 Junior track, 🟡 Mid, 🟠 Senior, 🔵 DevOps, 🔴 Hero

---

## 4. Game Mechanics (Gamification Design)

### 4.1 XP & Leveling (Logarithmic curve)
```
Level 1-10:   100-500 XP/level     (quick wins, momentum)
Level 11-30:  500-2,000 XP/level   (steady)
Level 31-50:  2,000-5,000+ XP/level (mastery grind)
```
- **XP sources**: concept mastery 50%, architecture challenge 30%, daily streak 10%, bonus 10%
- **Daily XP cap**: ป้องกัน burnout/grind

### 4.2 Streak (Loss aversion)
- นับวันที่เล่นติดต่อกัน (Duolingo style)
- **Streak freeze** power-up (skip 1 วันได้)
- Visual fire 🔥 + countdown timer

### 4.3 League (Social/competition — ใน MVP ใช้ NPC/bot ranking)
- Bronze → Silver → Gold → Platinum → Diamond
- Promotion/relegation weekly

### 4.4 Badge & Achievement
- **Milestone**: 50-day streak, first architecture, 100 quests solved
- **Skill badge**: "Cache Master", "Scalability Expert", "K8s Wizard"
- **Hidden**: unlock ผ่าน exploration (เช่น design 10 archi ที่ latency <100ms)

### 4.5 Skill Tree (progression gate)
```
Networking → HTTP/DNS → Load Balancing ─┐
                                         ├→ System Design Patterns
Backend → API/Auth → Rate Limiting ──────┤
                                         ├→ Scalability
Data → SQL/NoSQL → Sharding ─────────────┤
                                         ├→ Multi-region (Hero)
DevOps → Docker → K8s → CI/CD ───────────┘
```
- ปลดล็อก concept ถัดไปต้อง mastery ≥80% (quiz accuracy) หรือผ่าน prerequisite quest

### 4.6 Spaced Repetition (SM-2 algorithm)
- แต่ละ concept มี ease factor ของตัวเอง
- ตอบ 4 ระดับ: Again / Hard / Good / Easy → คำนวณ interval รีวิว (1d → 6d → exponential)
- "Daily Review" mode 5 นาที

---

## 5. Simulation Engine Design (หัวใจของเกม)

> **หลักการ**: จำลอง *outcomes* (latency, cost, availability) ไม่รัน infra จริง — คำนวณจาก logic. อ้างอิง pattern จาก [SyDe](https://syde.cc/) และ [SysSimulator](https://syssimulator.com/)

### 5.1 Component Library (catalog)
แต่ละ component มี property:
```typescript
type Component = {
  id: string
  type: 'loadBalancer' | 'appServer' | 'dbSQL' | 'dbNoSQL' | 'cache' | 'queue' | 'cdn' | 'gateway'
  baseLatency: number      // ms
  throughputCapacity: number // RPS
  costPerMonth: number     // USD
  availability: number     // 0.9999 (four 9s)
  failureRate: number      // 0.001
  props: Record<string, any> // เช่น cache hit ratio, shard count
}
```

ตัวอย่าง preset:
| Component | Latency | Capacity | Cost/mo | Availability |
|---|---|---|---|---|
| CDN | 5ms | 100K RPS | $200 | 0.99999 |
| Load Balancer (L7) | 2ms | 50K RPS | $100 | 0.9999 |
| App Server | 50ms | 5K RPS | $150 | 0.999 |
| Postgres (primary) | 10ms | 10K RPS | $500 | 0.999 |
| Redis cache | 1ms | 80K RPS | $120 | 0.999 |
| Kafka queue | 5ms | 100K msg/s | $300 | 0.9999 |

### 5.2 Outcome Calculators
รับ architecture topology + traffic pattern → คำนวณ:

- **Latency** = Σ (path component latency) + queuing delay (M/M/c model)
- **Cost** = Σ (component cost × quantity × multiplier)
- **Availability** = Π (component availability) ตาม topology (series คูณ, parallel เพิ่ม)
- **SLO Grade** = A-F จาก target (latency P95, cost budget, uptime)
- **Throughput bottleneck** = min capacity ตามเส้นทาง → แสดง node แดง

### 5.3 Chaos / Incident Mode
- ฉีด failure: DB crash, cache eviction, network partition, latency spike
- แสดง **cascading failure** เป็น edge แดง, node overloaded
- ผู้เล่นต้องมี circuit breaker / replica / fallback ไหม

### 5.4 Scenario Templates (โจทย์)
```
"รับ 10,000 RPS ที่ uptime 99.9%"
"ลด latency P95 ให้ < 100ms"
"Design ใน budget $5,000/เดือน"
"เตรียมรับ Black Friday 50,000 RPS"
```

### 5.5 Manager/CTO Feedback
- Scripted/AI feedback: *"Latency ดี แต่แพงไป ลด cost 20% ได้ไหม?"*
- ผู้เล่นปรับ architecture แล้ว re-simulate

---

## 6. Architecture (Technical)

### 6.1 Tech Stack (เลือกแล้ว)
| Layer | เทคโนโลยี | เหตุผล |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | 1 codebase, PWA, server components, ecosystem |
| Styling | **Tailwind CSS + shadcn/ui** | responsive เร็ว, consistent |
| State | **Zustand** (game state) + **React Query** (future API) | เบา, ใช้งานง่าย |
| Canvas | **React Flow (xyflow)** | drag-drop architecture diagram มืออาชีพ, touch support |
| Persistence | **IndexedDB (Dexie.js)** + localStorage | offline-first, progress ไม่หาย |
| PWA | **next-pwa** | installable, offline |
| Validation | **Zod** | validate component/quest schema |
| Testing | **Vitest + Playwright** | unit + e2e |
| Animation | **Framer Motion** | feedback/reward micro-interaction |

### 6.2 Data Flow (offline-first, no backend in MVP)
```
User action → Zustand store → Dexie (IndexedDB) → persist
                    ↓
           Simulation Engine (pure function) → metrics
                    ↓
           React Flow canvas re-render
```
- ไม่มี backend ใน MVP (เก็บ progress ในเครื่อง)
- **Future**: เพิ่ม backend (account sync, leaderboard) ได้โดยไม่ rewrite

### 6.3 State Slices (Zustand stores)
- `progressStore` — level, XP, streak, completed quests
- `curriculumStore` — current phase/quest, unlock state
- `canvasStore` — architecture topology บน canvas
- `simulationStore` — metrics ล่าสุด, scenario target
- `settingsStore` — theme, language, sound

### 6.4 Key Abstractions
- **`QuestEngine`** — รับ quest config + user solution → grade
- **`SimulationEngine`** — pure function `(topology, traffic) → metrics`
- **`SpacedRepetition (SM-2)`** — review scheduler per concept
- **`ContentRegistry`** — load curriculum data (concepts, quests) เป็น JSON/TS module

---

## 7. File Structure (code-ready)

```
sd-game/
├── apps/
│   └── web/                          # Next.js PWA
│       ├── app/
│       │   ├── (game)/               # game routes
│       │   │   ├── map/              # career map (skill tree)
│       │   │   ├── quest/[id]/       # quest screen
│       │   │   ├── review/           # daily spaced repetition
│       │   │   └── profile/          # XP, badge, streak
│       │   ├── layout.tsx
│       │   └── page.tsx              # home/dashboard
│       ├── components/
│       │   ├── canvas/               # React Flow nodes, edges
│       │   ├── ui/                   # shadcn components
│       │   ├── game/                 # XP bar, streak, badge
│       │   └── quest/                # 4 quest type renderers
│       └── public/                   # PWA manifest, icons
├── packages/
│   ├── game-engine/                  # core logic (framework-agnostic)
│   │   ├── simulation/               # SimulationEngine + calculators
│   │   ├── quest/                    # QuestEngine, grading
│   │   ├── progression/              # XP curve, SM-2, skill tree
│   │   └── __tests__/
│   ├── content/                      # curriculum data (TS/JSON)
│   │   ├── phases/
│   │   │   ├── phase-1-networking.ts
│   │   │   ├── phase-2-backend.ts
│   │   │   └── ... (8 phases)
│   │   ├── components.ts             # component catalog
│   │   └── types.ts                  # shared types
│   └── ui-components/                # shared shadcn-based
├── docs/
│   ├── design/                       # this design doc
│   └── content-guide.md             # how to author new quests
└── package.json (turborepo)
```

> **หมายเหตุ**: Monorepo (Turborepo) เพื่อแยก `game-engine` (logic pure, test ง่าย) จาก `web` (UI) — ทำให้ future port ไป native หรือเพิ่ม backend ได้โดยไม่กระทบ

---

## 8. MVP Scope vs Full Scope

| Feature | MVP | Full |
|---|---|---|
| Phase 1-2 content | ✅ | — |
| Phase 3-8 content | design only | ✅ |
| Game mechanics (XP, level, streak) | ✅ | ✅ |
| Skill tree + unlock | ✅ | ✅ |
| Simulation engine (latency/cost/availability) | ✅ | ✅ + chaos |
| Spaced repetition | ✅ | ✅ |
| 4 quest types | ✅ (1-2 ตัวอย่าง/type) | ✅ ครบ |
| Offline PWA + IndexedDB | ✅ | ✅ |
| Backend (account sync, leaderboard) | ❌ | ✅ |
| League (real multiplayer) | bot/NPC | ✅ |
| Mobile native (RN) | responsive web | optional |

---

## 9. Verification (เมื่อ implement ในอนาคต)

การทดสอบว่า design "ทำงานได้จริง":
1. **`game-engine` unit tests**: SimulationEngine ใส่ topology ตัวอย่าง → ได้ metric ถูกต้อง (Vitest)
2. **Quest grading**: สร้าง quest ตัวอย่าง → grade solution ที่ถูก/ผิด → ผลถูก
3. **E2E**: เปิดใน browser + mobile viewport → ลาก component → กด Simulate → เห็น metric (Playwright)
4. **Persistence**: ปิด/เปิด browser → progress ยังอยู่ (IndexedDB)
5. **Offline**: ปิดเน็ต → เล่นได้, install เป็น PWA ได้
6. **Curriculum completeness**: ครบทั้ง 8 phases ตาม curriculum map

---

## 10. Open Decisions (อนาคต)
- **Backend**: Supabase (Postgres + Auth) เหมาะกับ sync + leaderboard ในอนาคต
- **AI feedback**: CTO manager ใช้ LLM หรือ scripted rules? — เริ่ม scripted ก่อน
- **Localization**: TH/EN — design ให้ content/i18n-ready ตั้งแต่ต้น
- **Monetization**: free core + premium advanced phases? (ธุรกิจ decision, ไม่ใช่ technical)

---

## สรุป
Design doc นี้ครอบคลุม **เกม System Design 0→hero** แบบ interactive simulation + career RPG + gamification, ครอบ 8 phases (Networking → Advanced), มี simulation engine ที่คำนวณ latency/cost/availability จาก drag-drop architecture, tech stack Next.js 15 + React Flow, แบ่ง MVP vs full scope ชัดเจน, พร้อม file structure ที่ code-ready
