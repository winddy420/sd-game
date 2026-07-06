# 🎮 SD-GAME — System Design 0→Hero

> **Duolingo × LeetCode × SimCity สำหรับ Software Engineer**

เกมเรียนรู้ System Design แบบ interactive simulation ที่ให้ผู้เล่น "ลงมือทำ" ตั้งแต่ 0 → hero ผ่าน Career RPG (Junior → Staff Architect) + Quest-based learning + Gamification

ครอบคลุม: **Networking → Backend → Data → Caching → System Design Patterns → Scalability → DevOps/Infra → Advanced**

---

## 📌 สถานะปัจจุบัน

> **Design phase** — Design Document ฉบับสมบูรณ์เสร็จแล้ว ยังไม่ได้เริ่ม implement

## 📚 เอกสาร

- **[Design Document](docs/design/2026-07-06-sd-game-system-design-game-design.md)** — ออกแบบครบ 8 phases, game mechanics, simulation engine, tech stack, file structure (code-ready)

## 🎯 จุดเด่นของ design

- **Career RPG spine** — ผูกตำแหน่งกับ scale ของบริษัท (10 → 10M users)
- **Simulation Engine** — จำลอง latency/cost/availability จาก drag-drop architecture (ไม่รัน infra จริง)
- **4 Quest types** — Lesson Quiz, Architecture Challenge, Incident (Chaos), Command Lab
- **Gamification** — XP, streak, badge, skill tree, SM-2 spaced repetition
- **Tech** — Next.js 15 + React Flow + Zustand + IndexedDB (offline PWA, responsive mobile + desktop)

## 🚀 ขั้นตอนถัดไป (เมื่อ implement)

1. สร้าง monorepo scaffold (`apps/web` + `packages/game-engine`) ด้วย Turborepo
2. เริ่มจาก `game-engine` (pure logic) — SimulationEngine + SM-2 + XP curve
3. สร้าง `content/phase-1-networking.ts` เป็น phase แรก
4. ทำ UI ด้วย Next.js + React Flow
5. ตรวจสอบตาม [Verification section](docs/design/2026-07-06-sd-game-system-design-game-design.md#9-verification-เมื่อ-implement-ในอนาคต)

---

*Generated 2026-07-06*
