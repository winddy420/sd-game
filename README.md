# 🎮 SD-GAME — System Design 0→Hero

> **Duolingo × LeetCode × SimCity สำหรับ Software Engineer**

เกมเรียนรู้ System Design แบบ interactive simulation — ลาก architecture จริง แล้วเห็น latency/cost/availability ทันที. เล่นไปเรียนไปจาก Junior → Staff Architect ผ่าน Career RPG + Gamification

ครอบคลุม: **Networking → Backend → Data → Caching → System Design Patterns → Scalability → DevOps/Infra → Advanced** (8 phases, 49 quests)

---

## 🚀 เริ่มเล่น

```bash
pnpm install
pnpm dev          # → http://localhost:3000
```

Build & test:
```bash
pnpm build        # production build (ทุก package)
pnpm test         # game-engine unit tests (35 tests)
pnpm typecheck    # tsc ทุก package
```

ติดตั้ง PWA: เปิดในเบราว์เซอร์ → "Install" → เล่น offline ได้, progress เก็บใน IndexedDB

## 🎮 วิธีเล่น

1. **อ่าน concept** → ทำ **quiz** (เรียนรู้ + spaced repetition)
2. **Architecture quest** → ลาก components บน canvas → กด **Run Simulation** → ได้ grade + XP
3. **Incident quest** → วินิจฉัย outage เหมือน SRE on-call
4. **Command Lab** → พิมพ์ command จริงใน terminal จำลอง (docker, kubectl, …)
5. สะสม XP → เลเวลอัป → ปลดล็อก phase ถัดไป → รับ badge

## 🏗️ สถาปัตยกรรม

Monorepo (pnpm + Turborepo):

| Package | หน้าที่ |
|---|---|
| `packages/game-engine` | Pure logic: simulation engine, quest grading, XP/SM-2/streak, skill tree, badges, Zod validation. **35 unit tests** |
| `packages/content` | Domain types + component catalog + 8-phase curriculum (concepts + quests) |
| `apps/web` | Next.js 15 PWA: React Flow canvas, Zustand stores, Dexie/IndexedDB persistence, Tailwind |

Tech: **Next.js 15 · React Flow (@xyflow/react) · Zustand · Dexie · Tailwind · Zod · Vitest**

### Simulation engine (หัวใจ)
ลาก architecture → engine คำนวณจาก logic (ไม่รันของจริง):
- **Latency** = Σ path component latency + queuing penalty เมื่อ utilization สูง
- **Cost** = Σ component cost × replicas
- **Availability** = Π path availability (replicas เพิ่ม parallel redundancy: `1-(1-a)^n`)
- **Throughput** = min capacity ตามเส้นทาง (bottleneck detection)
- **Cache** short-circuits reads (hit ratio ลด DB load)
- ให้ grade **S/A/B/C/F** + feedback ชี้เป้าว่าเกิน target ข้อไหน

## 📚 เอกสาร

- **[Design Document](docs/design/2026-07-06-sd-game-system-design-game-design.md)** — ออกแบบครบ 8 phases, game mechanics, simulation engine, tech stack

## 📁 โครงสร้าง

```
apps/web/              Next.js PWA (app/, components/, lib/)
packages/game-engine/  simulation/ · quest/ · progression/ · validation
packages/content/      types.ts · components.ts · phases/ (8) · badges.ts
docs/design/           design document
```

## 🗺️ ถัดไป

- [ ] Service worker สำหรับ offline เต็มรูปแบบ
- [ ] Chaos/incident visualization (cascade แดงบน canvas)
- [ ] Backend (Supabase) สำหรับ account sync + leaderboard
- [ ] TH/EN localization

---

*Built 2026-07-06/07 · Status: **MVP playable end-to-end, all 8 phases authored***
