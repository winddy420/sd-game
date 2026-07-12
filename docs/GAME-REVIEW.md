# SD-GAME — Game Review: Issues & Remediation Plan

> ผลการรีวิวเกมทั้งระบบ 3 มุม: **progression/game design** · **simulation & architecture quests** · **pedagogy/difficulty curve**
> อ้างอิง source ณ commit `3e43988` — ทุก finding มี evidence เป็น `file:line`
>
> **สถานะ: ✅ ทำครบทุก milestone (M1-M5) + เคลียร์ทุก deferred item** — 26/26 issue ปิดหมด · `pnpm test` 78/78 · `pnpm typecheck` 3/3 · solvability sweep 17/17 · browser smoke test ผ่านทุก flow ไม่มี console error
>
> **Bug สำคัญที่เจอระหว่างทำ cost-cap instrumentation**: B5 มี loophole — required ENTRY-type component (cdn/lb/gateway) วางเป็น dead-end sidebranch นับเป็น "wired" โดยไม่ได้อยู่บน path จริง ทำให้ q-8-arch-multiregion (5-nines + required cdn) "ผ่าน" ได้แค่โดย exploit (cdn 0.99999 คูณเข้า path ทำ 5-nines เป็นไปไม่ได้อยู่แล้ว) — **แก้แล้ว**: ปิด loophole ใน `wiredComponentTypes` + ลด q-8-arch เป็น 4-nines (สมจริงสำหรับ CDN-fronted service)
>
> **Verdict (ณ เริ่มรีวิว)**: เนื้อหา curriculum คุณภาพดี แต่มีบั๊กเชิงระบบ 2 กลุ่มที่ทำ core promise พัง: (1) เศรษฐกิจ XP ไปไม่ถึง endgame ของตัวเอง (2) simulation ให้รางวัลพฤติกรรมที่*ตรงข้าม*กับสิ่งที่ lesson สอน — **ทั้งคู่แก้แล้วใน M2/M3**

---

## Executive Summary — ตารางรวมทุก issue

| ID | Issue | Severity | Effort | Milestone |
|---|---|---|---|---|
| A1 | XP ทั้งเกม 12,500 แต่ Staff Architect ต้อง 54,090 — endgame ไปไม่ถึง | 🔴 HIGH | M | M3 ✅ |
| A2 | Badge `phaseComplete` ×5 ปลดไม่ได้ตลอดกาล (predicate bug) | 🔴 HIGH | S | M1 ✅ |
| A3 | Streak นับจากแค่เปิดแอป ไม่ใช่จากการเรียน | 🔴 HIGH | S | M1 ✅ |
| A4 | Streak-freeze มี 1 อันตลอดชีพ ไม่มีทาง refill | 🟡 MED | S | M5 ✅ |
| A5 | เกรด S/A/B/C ไม่มีผลต่อ XP (C จ่ายเท่า S) | 🟡 MED | S | M3 ✅ |
| A6 | Review (SM-2) ไม่ให้ XP — daily loop ไม่มีรางวัล | 🟡 MED | S | M3 ✅ |
| A7 | Level ไม่ gate อะไรเลย — เป็น scoreboard เปล่า | 🟡 MED | M | M3 ✅ |
| A8 | Dead code: `DAILY_XP_CAP`, `dueCards`, `isConceptUnlocked`, `usedFreeze` | 🟢 LOW | S | M1 ✅ |
| A9 | `lowLatency` badge ignore field `maxLatency` — hardcode 100ms | 🟢 LOW | S | M1 ✅ |
| B1 | Cache ไม่ลด latency ที่รายงาน (doc ขัดกับ code) | 🔴 HIGH | M | M2 ✅ |
| B2 | Cache ต้องต่อ serial inline เท่านั้น — cache-aside จริงไม่ทำงาน | 🔴 HIGH | M | M2 ✅ |
| B3 | เพิ่ม cache ทำ availability *ลด* — ตรงข้ามโลกจริง | 🔴 HIGH | M | M2 ✅ |
| B4 | Throughput ไม่สน cache — บังคับ over-provision DB | 🔴 HIGH | S | M2 ✅ |
| B5 | Required component วางเป็น node ลอย (ไม่ต่อสาย) ก็ผ่าน | 🔴 HIGH | S | M2 ✅ |
| B6 | CDN ไม่ offload compute — app เห็น traffic 100% เสมอ | 🟡 MED | M | M2 ✅ |
| B7 | Components dominate กันเด็ดขาด — ไม่มี trade-off จริง | 🟡 MED | M | M2 ✅ |
| C1 | Phase 7 (Staff) ง่ายที่สุดในเกม — quiz recall + arch quest แค่ 1 | 🔴 HIGH | L | M4 ✅ |
| C2 | เกมสอบ estimation/cost แต่ไม่เคยสอน | 🔴 HIGH | L | M4 ✅ |
| C3 | Factual error: HPA/Cluster Autoscaler เป็น predictive (จริงๆ reactive) | 🟡 MED | S | M1 ✅ |
| C4 | RTO explanation รวม replication lag (ควรเป็น RPO) | 🟡 MED | S | M1 ✅ |
| C5 | Comic distractors ~6 ข้อ ทำ quiz ฟรีเกินไป | 🟡 MED | S | M4 ✅ |
| C6 | Incident format ซ้ำ (MCQ 4 ตัวเลือกเสมอ) — เดาได้ตั้งแต่ Phase 3 | 🟡 MED | M | M4 ✅ |
| D1 | ไม่มี XP toast — `lastXpGain` ถูก set แต่ไม่มีใครอ่าน | 🟡 MED | S | M5 ✅ |
| D2 | Badge unlock เงียบ — เห็นได้แค่ใน /profile | 🟡 MED | S | M5 ✅ |
| D3 | Hint มีแค่ command quest — lesson/incident/architecture ไม่มี | 🟢 LOW | M | M5 ✅ |
| D4 | All-or-nothing ทุก quest type — ไม่มี partial credit / first-try bonus | 🟢 LOW | M | M5 ✅ |

Effort: S = < ครึ่งวัน · M = 1-2 วัน · L = 3+ วัน (รวม content ใหม่)

---

# กลุ่ม A — Progression & Economy

## A1 — XP ceiling: เก็บ 100% ได้แค่ Level 21 "Mid Engineer" 🔴

**อาการ**: หน้าแรกสัญญา "climb from Junior to Staff Architect" ([apps/web/app/(game)/page.tsx:41-45](../apps/web/app/(game)/page.tsx)) แต่เป็นไปไม่ได้ทางคณิตศาสตร์

**Evidence** (ตัวเลข verify แล้วกับ source):
- XP รวมทั้งเกม (67 quests, first-completion เท่านั้น) = **12,500** (`grep xpReward` ทุก phase)
- `xpForLevel(22) = 13,290` — ผู้เล่น 100% จบที่ **Lv 21**
- Senior (Lv 26) ต้อง 19,340 · Staff (Lv 41) ต้อง 54,090 · Lv 50 ต้อง 85,590 (~7× ของ XP ที่มีจริง)
- Curve: `packages/game-engine/src/progression/xp.ts:23-27` (`levelCost`) · XP บันทึกครั้งแรกเท่านั้น: `apps/web/lib/store/game-store.ts:86-89,130-133`

**วิธีแก้** (เลือกทางใดทางหนึ่ง หรือผสม):
1. **Rescale curve** — ปรับ `levelCost` ให้ `xpForLevel(50) ≈ 12,000` เช่น `if (l<10) return 60+(l-1)*15; if (l<30) return 200+(l-10)*20; return 500+(l-30)*25` (ต้อง tune ให้ Lv 26 (Senior) ≈ จบ Phase 5-6 และ Lv 41 (Staff) ≈ จบ Phase 7-8 ตาม career act ของ phase)
2. **เพิ่ม repeatable XP** — ให้ XP ตอน review (ดู A6), first-try bonus (ดู D4), grade bonus (ดู A5) แล้วคง curve เดิมเป็น long-tail grind

**แนะนำ**: ทำข้อ 1 เป็นหลัก (career title ต้อง sync กับ phase ที่เล่นอยู่จริง) + ข้อ 2 เป็นตัวเสริม

**Verify**: เพิ่ม unit test ใน game-engine:
```ts
const totalXp = CURRICULUM.quests.reduce((s, q) => s + q.xpReward, 0);
expect(totalXp).toBeGreaterThanOrEqual(xpForLevel(41)); // Staff reachable
```

## A2 — Badge `phaseComplete` ×5 ปลดไม่ได้ตลอดกาล 🔴

**อาการ**: badge `b-phase-1/2/4/7/8` (รวม "Hero — become a Staff Architect") locked ถาวรแม้เล่น 100%

**Root cause**: [packages/game-engine/src/badges.ts:28](../packages/game-engine/src/badges.ts) เช็ค `completedQuestIds.some(id => id.includes(predicate.phaseId))` — `phaseId` คือ `phase-1` แต่ quest id คือ `q-1-capstone` → `'q-1-capstone'.includes('phase-1')` = **false เสมอ**

**วิธีแก้**: เช็คจาก capstone ของ phase แทน — เพิ่ม curriculum/phase map เข้า `BadgeProgress` context แล้ว:
```ts
case 'phaseComplete': {
  const phase = ctx.phases.find(p => p.id === predicate.phaseId);
  return phase ? ctx.progress.completedQuestIds.includes(phase.capstoneQuestId) : false;
}
```
(callsite `awardBadges` ใน `game-store.ts:167-185` ส่ง phases เพิ่ม)

**Verify**: unit test — complete `q-1-capstone` → `hasBadge(b-phase-1)` = true; และ integrity test ว่า badge phaseId ทุกตัวมี phase จริง

## A3 — Streak ได้จากแค่เปิดแอป 🔴

**Evidence**: `hydrate` เรียก `registerActivity` ทุกครั้งที่โหลดแอปถ้าเป็นวันใหม่ ([game-store.ts:71-78](../apps/web/lib/store/game-store.ts)) — badge `b-streak-7/30` จึงวัด "เปิดแอป" ไม่ใช่ "เรียน"

**วิธีแก้**: ย้าย `registerActivity` ออกจาก `hydrate` ไปเรียกใน `completeQuest` และ `recordReview` (การกระทำที่มีความหมาย ≥1 ครั้ง/วัน)

**Verify**: test — hydrate อย่างเดียวไม่เพิ่ม streak; complete quest แล้ว streak เพิ่ม

## A4 — Streak-freeze economy ทางเดียว 🟡

**Evidence**: `newStreak` ให้ `freezes: 1` (`streak.ts:23`), mutation เดียวคือ `freezes - 1` (`streak.ts:76`) — ไม่มี code path refill, ไม่มี UI แสดง, `usedFreeze` outcome ถูกคำนวณแล้วทิ้ง

**วิธีแก้**: refill +1 ทุก streak milestone 7 วัน (cap 2-3) ใน `registerActivity`; แสดงจำนวน freeze ใน top-bar/profile; toast เมื่อ `usedFreeze === true`

## A5 — เกรด architecture ไม่มีผลต่อรางวัล 🟡

**Evidence**: `gradeArchitecture` คำนวณ S-F ([quest/engine.ts:162-176](../packages/game-engine/src/quest/engine.ts)) และ UI แสดง แต่ `submitArchitecture` จ่าย `quest.xpReward` flat ไม่อ่าน `result.grade` (`game-store.ts:126-135`)

**วิธีแก้**: scale XP ตามเกรด — C=1.0× / B=1.15× / A=1.3× / S=1.5× และ/หรือ repeatable bonus "beat your best grade" (จ่ายส่วนต่างเมื่อทำเกรดดีขึ้น)

## A6 — Review ไม่ให้ XP 🟡

**Evidence**: SM-2 wired ครบ (enqueue: `game-store.ts:94-106`, `/review` page, home CTA) — ระบบดี **แต่** `recordReview` (`game-store.ts:154-163`) อัปเดตแค่ card ไม่แตะ `totalXp`

**วิธีแก้**: +10-15 XP ต่อ review ที่ตอบถูก, capped ด้วย `DAILY_XP_CAP` (ทำให้ A8 มีที่ใช้) — นี่คือ repeatable XP source หลักของ A1 ทางเลือก 2

## A7 — Level ไม่ gate อะไร 🟡

**Evidence**: gating ทั้งหมดเป็น quest-prerequisite (`skill-tree.ts:33-59`); `careerTitle`/`actForLevel` ใช้แค่ display

**วิธีแก้** (เบาสุดที่ได้ผล): ผูก 1 รางวัลจริงต่อ career act boundary — เช่น elective quest, cosmetic theme, freeze refill ที่ Lv 11/26/41 — ให้เลขมีน้ำหนัก

## A8 — Dead code inventory 🟢

| Item | ที่อยู่ | สถานะ | ทำอะไร |
|---|---|---|---|
| `DAILY_XP_CAP` | `xp.ts:66` | export แล้วไม่มีใคร import | enforce ใน store (พร้อม A6) หรือลบ |
| `dueCards` | `sm2.ts:74-78` | UI เขียน filter เองซ้ำ 2 ที่ | ให้ `review/page.tsx` + `page.tsx` ใช้ helper |
| `isConceptUnlocked` | `skill-tree.ts:42` | ไม่มี caller | ใช้จริงหรือลบ |
| `StreakOutcome.usedFreeze` | `streak.ts:27,78` | คำนวณแล้วทิ้ง | plumb เข้า toast (A4) |
| `lastXpGain`, `lastArchResult` | `game-store.ts:38-41,111,136` | set แล้วไม่มี component อ่าน | ใช้กับ D1 |

## A9 — `lowLatency` badge hardcode 100ms 🟢

**Evidence**: predicate มี field `maxLatency` (`content/src/types.ts:237`, badges ตั้ง 100) แต่ `hasBadge` เทียบแค่ count (`badges.ts:29-30`) และ counter hardcode `< 100` ใน `game-store.ts:129`

**วิธีแก้**: เก็บ per-solve latency (array/histogram) ใน player state แล้ว evaluate `maxLatency` ตอนเช็ค badge

---

# กลุ่ม B — Simulation Fidelity

> ⚠️ กลุ่มนี้ร้ายแรงที่สุดเชิง pedagogy: lesson สอนถูก แต่ simulator ให้รางวัลตรงข้าม ผู้เล่นที่ทำตามบทเรียนจะแพ้ ผู้เล่นที่ทำผิดหลักการจะชนะ
> ทุกข้อในกลุ่มนี้แก้ที่ [packages/game-engine/src/simulation/engine.ts](../packages/game-engine/src/simulation/engine.ts) + [quest/engine.ts](../packages/game-engine/src/quest/engine.ts) แล้วต้องรัน `solvability.sweep.test.ts` ใหม่ทั้งชุด (target บาง quest จะ solvable ง่ายขึ้น/ยากขึ้น — ดู M2)

## B1 — Cache ไม่ลด latency ที่รายงาน 🔴

**Evidence**: docstring `engine.ts:19-20` บอก cache "lowers average latency" แต่ `latencyP95` (engine.ts:196-204) บวก `baseLatency` ของ**ทุก node บน path รวม DB เต็มๆ** — hitRatio มีผลแค่ queuing penalty ผ่าน `rpsToTerminal` ที่ hit ratio 97% ผู้เล่นแทบไม่เห็น latency ลด → ขัดกับบทเรียน Phase 4 ทั้ง phase

**วิธีแก้** — blend ตาม hit ratio:
```
latencyToCache  = Σ nodeLatency(node) for nodes up to & including cache
latencyFullPath = Σ nodeLatency(node) for all nodes on path
readP95  = hitRatio × latencyToCache + (1 − hitRatio) × latencyFullPath
writeP95 = latencyFullPath
p95      = readRatio × readP95 + (1 − readRatio) × writeP95
```

**Verify**: unit test — topology `app→cache(0.9)→db` ต้องมี p95 ต่ำกว่า `app→db` อย่างมีนัย; sweep ทุก quest ยัง solvable

## B2 — Cache-aside (side branch) ไม่ทำงาน 🔴

**Evidence**: `hitRatio` scan เฉพาะ node บน critical path เดียว (engine.ts:184-190) และ critical path = path ที่ base latency **สูงสุด** (`pickCriticalPath`, engine.ts:138-153) → ต่อแบบถูกหลักการ (`app→cache` กับ `app→db` เป็น sibling) จะได้ hitRatio=0, cache กลายเป็น cost เปล่า เกมจึงสอนให้วาด diagram ผิด (ต้องต่อ `app→cache→db` inline เท่านั้น)

**วิธีแก้**: detect side-branch cache — ถ้า node บน critical path มี edge ไปหา cache node (แม้ cache ไม่อยู่บน path) ให้นับ hitRatio ของ cache นั้นด้วย:
```ts
for (const id of critical)
  for (const nb of adj.get(id) ?? [])
    if (CACHE_TYPES.has(nodes.get(nb)!.def.type))
      hitRatio = Math.max(hitRatio, ...);
```

**Verify**: test — `app→{cache, db}` (siblings) ได้ metrics เทียบเท่า `app→cache→db`

## B3 — เพิ่ม cache ทำ availability ลด 🔴

**Evidence**: availability = serial product ตลอด path (engine.ts:207-212) — cache inline คูณ 0.999 เข้าไป ยืนยันบน P8 capstone: `cdn(.99999)×lb(.9999)×app×cache(.999)×cassandra(.9995) = 0.99839 < 0.9999` → ผู้เล่นต้องเพิ่ม cache replica 2-3 ตัว**เพื่อแก้ปัญหาที่ cache สร้างเอง** โลกจริง cache-aside ตายแล้ว fallback ไป DB ได้ (availability ไม่ลด)

**วิธีแก้**: treat cache เป็น **non-critical dependency** — ไม่คูณ availability ของ cache เข้า path (cache down = hitRatio→0, latency แย่ลง, แต่ระบบไม่ล่ม) หรือคูณแบบ parallel: `1 − (1−availCache)×(1−availDbPath)` เฉพาะ read fraction

**Verify**: test — เพิ่ม cache แล้ว availability ต้อง**ไม่ลด**; P8 capstone solvable โดยไม่ต้อง stack cache replicas

## B4 — Throughput ไม่ใช้ rpsToTerminal 🔴

**Evidence**: `maxThroughput` = min ของ raw `effectiveCapacity` ทุก node บน path (engine.ts:214-227) ไม่เคยใช้ `rpsToTerminal` — P4 capstone (10k rps, 97% reads): load จริงถึง DB ≈ 600 rps แต่ sim บังคับ DB raw capacity ≥ 10,000 → รางวัลให้ over-provisioning ซึ่งเป็น anti-pattern ที่ Phase 4 เตือนเอง

**วิธีแก้**: เทียบ capacity ของ terminal node กับ `rpsToTerminal` ไม่ใช่ `traffic.rps`:
```ts
const demand = TERMINAL_TYPES.has(def.type) ? rpsToTerminal : traffic.rps;
const headroom = cap / demand;   // bottleneck = node ที่ headroom ต่ำสุด
maxThroughput = min(headroom) × traffic.rps;
```

**Verify**: test — `app(5k)→cache(0.97)→db(1k)` รับ 10k rps ได้ (DB เห็นแค่ ~600)

## B5 — Orphan node ผ่าน required-component check 🔴

**Evidence**: `gradeArchitecture` สร้าง `presentTypes` จาก **ทุก** `topology.nodes` ไม่สน edges ([quest/engine.ts:116-120](../packages/game-engine/src/quest/engine.ts)) — solver เองก็ exploit ข้อนี้ (`solvability.sweep.test.ts:59-70` push node แบบ `connected=false`) → queue ที่เป็นหัวใจของ Phase 5/7 วางลอยๆ บน canvas ไม่ต่อสายก็ผ่าน = box-ticking ล้วน

**วิธีแก้**: นับเฉพาะ node ที่ reachable จาก entry (BFS จาก adjacency ที่ simulate สร้างอยู่แล้ว) — expose connected-set จาก `simulate` หรือคำนวณใน `gradeArchitecture`; แก้ solver ให้ wire required nodes จริง

**Verify**: test — queue ลอยไม่ผ่าน `hasRequiredComponents`; sweep ยัง 15/15 solvable (solver ต่อสายแล้ว)

## B6 — CDN ไม่ offload compute 🟡

**Evidence**: node ที่ไม่ใช่ terminal เห็น `traffic.rps` เต็มเสมอ (engine.ts:202) — CDN hit ควร bypass origin แต่ app เห็น 100% ตลอด → CDN ที่ required ใน P4/P6/P8 ให้แค่ +5ms +cost +หนึ่งตัวคูณ availability ไม่ได้สอน "CDN economics" (`c-4-cdn`) เลย

**วิธีแก้**: ให้ CDN ทำงานเหมือน cache ชั้นแรก — traffic หลัง CDN = `rps × (1 − cdnHitRatio × readRatio)` แล้วส่ง rps ที่ลดแล้วไหลลง downstream (ทำพร้อม B1/B4 เป็น "per-node effective rps" ตัวเดียวกัน)

**Verify**: test — เพิ่ม CDN แล้วจำนวน app replica ที่ต้องใช้ลดลง

## B7 — Dominated components 🟡

**Evidence** ([content/src/components.ts](../packages/content/src/components.ts)):
| แพ้ | ชนะ | เพราะ |
|---|---|---|
| `db-postgres` ($500, 10k) | `db-postgres-replica` ($400, 15k, avail เท่ากัน) | ใช้ "replica" เดี่ยวๆ โดยไม่มี primary ได้ — nonsense |
| `app-python` ($140, 4k, 60ms) | `app-node` ($150, 5k, 50ms) | python ไม่มีเหตุผลให้เลือกเลย |
| `lb-l7-nginx` ($100, 50k, 2ms) | `lb-l4` ($80, 100k, 1ms) | value ของ L7 ไม่ถูก model |

**วิธีแก้**:
1. `db-postgres-replica` — เพิ่ม validation/grading rule: replica ต้องมี `db-postgres` อยู่ใน topology (ไม่งั้น invalid) และปรับราคาให้ไม่ dominate
2. `app-python` — ให้มิติที่ต่าง (เช่น capacity สูงกว่าใน write-heavy) หรือตัดออกจาก palette
3. `lb-l7` — model ความสามารถ (เช่น L7 จำเป็นเมื่อมี multi-path routing / จำเป็นกับ gateway-less design) หรือปรับตัวเลขให้มี trade-off จริง

**Verify**: หลังแก้ ทุกคู่ต้องมี scenario ที่แต่ละตัว "ชนะ" อย่างน้อย 1 quest (เช็คด้วย sweep)

### B-extra — Feedback strings ขัดกับ model
`buildFeedback` แนะ "Add caching or move data closer" ตอน latency fail (quest/engine.ts:200-203) ซึ่งเป็น no-op จนกว่า B1 จะแก้ และไม่บอกชื่อ bottleneck node ทั้งที่ `metrics.bottlenecks` มีอยู่แล้ว → **แก้พร้อม M2**: surface ชื่อ node ใน message + คำแนะนำต้องสอดคล้อง model ใหม่

---

# กลุ่ม C — Pedagogy & Content

## C1 — Phase 7 (Staff) เป็น phase ที่ง่ายที่สุดในเกม 🔴

**Evidence**:
- Phase เดียวที่มี architecture quest แค่ **1** (capstone, [phase-7-devops.ts:732](../packages/content/src/phases/phase-7-devops.ts)) — phase อื่นมี 2; แลกกับ command lab 3 ตัว → tier Staff ได้ออกแบบระบบ*น้อยกว่า* Junior
- Quiz recall ล้วน: "Docker image contain อะไร" (phase-7:271), "smallest deployable unit" (phase-7:369), "COPY ทำอะไร" (phase-7:295), "terraform plan ทำอะไร" (phase-7:489)
- Curve จริง: P6 (วินิจฉัย cascading failure) → **P7 (ท่องศัพท์)** → P8 (quorum math) — dip ชัดเจน

**วิธีแก้**:
1. แปลง lesson 1 ช่องเป็น arch quest ที่ 2 — เช่น "ออกแบบ topology รองรับ blue-green/canary" หรือ "วาง health-check + observability ให้ผ่าน SLO"
2. เขียน quiz Docker/k8s/Terraform ใหม่เป็น scenario judgment เช่น: *"image 1.2GB, rebuild 60s ทุกครั้งที่แก้โค้ด — Dockerfile ผิดตรงไหน"* (fact อยู่ใน concept body ได้, quiz ต้องทดสอบการตัดสินใจ)

**Verify**: recall:application ratio ของ P7 จาก 13:7 → ≤ 7:13 (เทียบมาตรฐาน P2-P6)

## C2 — เกมสอบสิ่งที่ไม่เคยสอน: estimation & cost modeling 🔴

**Evidence**: arch quest ทุกอันบังคับ target (rps, p95, availability, $) ที่คำนวณให้เสร็จ — ไม่มี concept ไหนสอน back-of-envelope (QPS จาก DAU, storage จาก write-rate×retention, "5k rps/app ต้องกี่ replica") หรือว่าอะไร drive cost — ทั้งที่เป็น*ทักษะแกน*ของ staff interview และของตัว quest เอง

**วิธีแก้**: เพิ่ม 2 concepts + 1 lesson quest ใน Phase 3 หรือ 4 (จุดที่ปลดล็อกทุก capstone ถัดไป):
- `c-N-estimation` — back-of-envelope: DAU→QPS, peak factor, storage math, replica arithmetic
- `c-N-cost` — instance-hours, egress, storage tiers, managed premium; โยงกับ `costPerMonth` ใน component catalog ตรงๆ
- quiz เป็นโจทย์คำนวณ (แนว RPO/RTO ที่ phase-8:280 ทำได้ดีอยู่แล้ว)

**Verify**: `coverage.audit.test.ts` ผ่าน (concept ใหม่มี lesson); playtest ว่า capstone รู้สึก "derive ได้" ไม่ใช่ "ตัวเลขจากฟ้า"

## C3 — Factual error: predictive scaling 🟡

**Evidence**: [phase-6-scalability.ts](../packages/content/src/phases/phase-6-scalability.ts) (concept `c-6-autoscaling`, ~line 73): *"AWS Auto Scaling, Kubernetes HPA with custom metrics, and Cluster Autoscaler all support this [predictive scaling]"* — **ผิด**: HPA และ Cluster Autoscaler เป็น reactive (ตอบสนอง metric ที่เกิดแล้ว) ไม่ forecast

**วิธีแก้**: แก้ประโยคเป็น *"AWS Predictive Scaling forecasts from history; Kubernetes HPA and Cluster Autoscaler are reactive — they respond after the metric moves (KEDA cron/forecast add-ons are the k8s route to predictive)."*

## C4 — RTO explanation รวม replication lag 🟡

**Evidence**: [phase-8-advanced.ts:289](../packages/content/src/phases/phase-8-advanced.ts): *"RTO = time to restore = DNS failover (4 min) + replication lag drift, conservatively ≈ 4m30s"* — strict definition: RTO = เวลากู้ service = 4 นาที; 30s lag คือ RPO ไม่ควรบวกเข้า RTO (คำตอบข้อนี้ยังถูก แต่ explanation blur เส้นแบ่งที่ข้อสอบตั้งใจสอน)

**วิธีแก้**: เปลี่ยน option ถูกเป็น "RPO = 30s, RTO ≈ 4 min" และแก้ explanation: lag = ข้อมูลหาย (RPO), DNS failover = เวลากู้ (RTO) — สองแกนแยกกัน

## C5 — Comic distractors ~6 ข้อ 🟡

**Evidence** (ตัวเลือกที่ตัดทิ้งได้โดยไม่ต้องรู้เนื้อหา):
| ที่ | ตัวเลือก |
|---|---|
| [phase-5-patterns.ts:335](../packages/content/src/phases/phase-5-patterns.ts) | "Emailed to every user" (DLQ) |
| phase-2-backend.ts:760 | "Take the whole API offline until Monday" |
| phase-6-scalability.ts:251 | "Restart it under load" |
| phase-6-scalability.ts:422 | "Randomly deleting code in production" |
| phase-6-scalability.ts:447 | "Take the entire system offline first" |
| phase-7-devops.ts:606 | "Disable monitoring so the alerts stop firing" |

**วิธีแก้**: เปลี่ยนเป็น plausible-but-wrong engineering choice ตามมาตรฐานที่ดีอยู่แล้วของเกมเอง (เช่น rate-limiting Q1, phase-2:512-517 — ทุก distractor เป็น algorithm จริงที่มี property จริงแต่ผิดโจทย์) เช่น DLQ ข้อนี้ distractor ควรเป็น "retry with exponential backoff forever" (ฟังดูถูกแต่ผิดเพราะ poison message ไม่มีวันสำเร็จ)

## C6 — Incident format ซ้ำจนเดาได้ 🟡

**Evidence**: incident ทั้ง 8 ตัวเป็น single MCQ 4 ตัวเลือกโครงสร้างเดียวกันหมด (phase-1:487 → phase-8:629) — ผู้เล่นรู้ pattern ตั้งแต่ Phase 3: ตัดตัวตลก + ตัด overreaction เหลือ 2

**วิธีแก้**: Phase 6-8 ยกเป็น **multi-step incident** — 2-3 การตัดสินใจต่อเนื่อง: (1) immediate mitigation (2) root-cause fix (3) prevention โดยผลของ step แรก feed เข้า step ถัดไป — ต้องขยาย `IncidentQuest` type ใน `content/src/types.ts` + `gradeIncident` + `incident-quest-view.tsx` (backward-compatible: single-step ยังใช้ได้กับ P1-P5)

---

# กลุ่ม D — Reward Loop UX ("juice")

## D1 — ไม่มี XP toast 🟡
`lastXpGain` ถูก set ทุก action (`game-store.ts:41,111,136`) แต่ไม่มี component ไหน consume → เพิ่ม toast component ใน `(game)/layout.tsx` subscribe `lastXpGain` (+animation "+100 XP")

## D2 — Badge unlock เงียบ 🟡
`awardBadges` ได้ list `newlyEarned` แล้วทิ้ง (`game-store.ts:167-185`) → เก็บเข้า state `lastBadgesEarned` แล้วแสดง celebration toast/modal (ใช้ร่วมกับ D1)

## D3 — Hint asymmetry 🟢
Command quest มี hints + เฉลย (`command-quest-view.tsx:70-75,159-176`) แต่ lesson/incident/architecture ไม่มี → เพิ่ม optional hint ต่อ question/step ใน content schema (ใช้ hint = ลด XP ส่วนนั้น เช่น −25%)

## D4 — All-or-nothing ไม่มี first-try bonus 🟢
Lesson ต้อง `correct === total` ([quest/engine.ts:46](../packages/game-engine/src/quest/engine.ts)), retry ฟรีไม่จำกัดและเห็นเฉลยก่อน retry ([lesson-quest-view.tsx:144-184](../apps/web/components/quest/lesson-quest-view.tsx)) → รอบสองคือการจำตัวอักษร
**วิธีแก้ที่แนะนำ** (คง retry ฟรีไว้ — เหมาะกับ learning game): เพิ่ม **first-try bonus +25%** เมื่อผ่านโดยไม่เคย submit ผิด และตอน retry ให้ **สลับลำดับ options** เพื่อกันจำตำแหน่ง

---

# Remediation Roadmap

ลำดับตาม dependency: **M1 → M2 → M3** ต้องเรียงกัน (M3 rebalance ต้องรอ simulation ใหม่) · M4/M5 ขนานกับ M3 ได้

## M1 — Quick-win bug & fact fixes (effort ~1 วัน) ✅ DONE
อิสระต่อกันทุกข้อ ไม่กระทบ balance:
- [x] A2 badge predicate → resolve phaseComplete via `phase.capstoneQuestId` (ไม่ใช่ substring) — `badges.ts`, `game-store.ts`, `profile/page.tsx`
- [x] A3 streak-on-hydrate → ย้าย `registerActivity` ออกจาก `hydrate` ไป `completeQuest` + `recordReview` (`touchStreak`) — `game-store.ts`
- [x] A8 dead code → ใช้ `dueCards` ใน `review/page.tsx` + `page.tsx`; ลบ `DAILY_XP_CAP` (re-add พร้อม enforce ใน M3); เก็บ `isConceptUnlocked` (utility ที่ถูกต้อง/symmetric ของ skill-tree API — ไม่ใช่ harmful dead code)
- [x] A9 lowLatency badge → track `architectureLatencies: number[]` + evaluate `predicate.maxLatency` ตอนเช็ค — `badges.ts`, `db.ts` (+ shallow-merge migration), `game-store.ts`
- [x] C3 predictive scaling text → แก้ HPA/Cluster Autoscaler เป็น reactive — `phase-6-scalability.ts`
- [x] C4 RTO/RPO explanation → แยกสองแกน ไม่บวก lag เข้า RTO — `phase-8-advanced.ts`

**Verified**: `pnpm typecheck` (3/3 packages) · `pnpm test` 70/70 (เพิ่ม 6 จาก `badges.test.ts` ใหม่ — regression สำหรับ A2 + A9) · solvability sweep ยัง 15/15

## M2 — Simulation overhaul (effort ~3-4 วัน) ✅ DONE
แก้ B1-B7 + feedback strings ใน `simulation/engine.ts`, `quest/engine.ts`, `components.ts`:
1. ✅ Per-node effective demand (B1+B4+B6 รวมกลไกเดียว): CDN ดูดซับ read ก่อถึง app (appRps), cache+CDN ดูดซับ read ก่อถึง DB (dbRps) → latency blend `p95 = missFraction×latencyFull + hitFraction×serveLatency` + throughput = `min(cap/coeff)` รวม per-tier demand
2. ✅ Cache side-branch (B2): นับ cache-like node ที่ **reachable จาก entry** (inline หรือ sibling) — cache-aside `app→{cache,db}` ทำงานเท่า inline; cache เป็น non-critical → **ไม่คูณ availability** (B3)
3. ✅ Connected-only required check (B5): `wiredComponentTypes` นับเฉพาะ node ที่ reachable — orphan queue/cache ไม่ผ่าน; solver ใน `solvability.sweep.test.ts` แก้ให้ wire `app→req-*`
4. ✅ De-dominate (B7): `lb-l4` (cap 40k, avail 0.9997 — ถูกกว่า/เร็วกว่าแต่ต่ำกว่า HA), `app-python` (cap 3.5k/65ms/$100 — budget choice), `db-postgres-replica` (avail **0.997** — solo ไม่ผ่าน HA target ต้องจับคู่ primary)
5. ✅ Feedback: ระบุชื่อ bottleneck node (`bottleneckNames`); คำแนะนำ "Add caching" ตอนนี้ valid เพราะ cache ลด latency จริง

**Verified**: `pnpm test` 75/75 (engine.test.ts +5 property tests สำหรับ B1-B6) · `pnpm typecheck` 3/3 · **solvability sweep ยัง 15/15 — ไม่ต้อง retune target ตัวไหน** · browser smoke test (q-1-arch-shortener: CDN+LB+app×2+db×2 → S grade, p95 **17ms**, avail **99.989%**, $1,600 — ตรงกับ hand-calc)

> หมายเหตุ: B7 ใช้การปรับตัวเลข (replica availability 0.997 บังคับใช้คู่ primary บน HA target) แทน validation rule "replica ต้องมี primary" — เรียบร้อยกว่าและให้ trade-off จริงโดยไม่ต้องเพิ่ม grading logic

## M3 — Economy & target rebalance (effort ~2 วัน, หลัง M2) ✅ DONE
- [x] A1 rescale XP curve (`xp.ts`) — curve ใหม่ให้ `xpForLevel(41)=12,462 ≤ total 13,000` (Staff reachable) + regression test `xp.test.ts`
- [x] A5 grade-scaled XP — `GRADE_XP` (S=1.5×, A=1.3×, B=1.15×, C=1.0×) บน first-completion
- [x] A6 review XP — +15/review, capped ด้วย `DAILY_XP_CAP=1500` (re-added + enforced ใน `applyXp`)
- [x] A7 act-boundary reward — promotion แต่ละ act (Mid/Senior/Staff) refill +1 streak freeze (cap 3)
- [x] Tighten cost caps — instrument min-cost แต่ละ quest (temp solver) แล้วตั้ง cap = min×1.3 (16 caps ทั้งหมด, รัดกุดขึ้น ~40-80%); ระหว่างนั้นเจอ + แก้ **entry-sidebranch loophole** (B5) และลด q-8-arch เป็น 4-nines
- [x] NoSQL write-throughput quest — เพิ่ม `q-3-arch-writes` (phase-3, write-heavy 65% writes @ 20k rps; Cassandra ประหยัดกว่า SQL primary หลายตัวเพราะ tight cost cap)
- [ ] ~~P5 queue เป็นทางผ่านเดียว~~ — queue สำหรับ write-heavy: หลัง B5 queue ต้อง wire จริงแล้ว (เป็น required component ที่ผูกกับ app); การ model write-buffering semantics เต็มรูปแบบต้องการ engine work เพิ่ม — ปล่อยไว้เพราะไม่ใช่ bug

**Verified**: `xp.test.ts` regression `totalXp >= xpForLevel(41)` · sweep 17/17 (รวม `q-3-arch-writes`) · ทุก cap > min-cost (solvable by construction)

## M4 — Content additions (effort ~4-5 วัน, ขนาน M3 ได้) ✅ DONE
- [x] C1 Phase 7: arch quest ที่ 2 (`q-7-arch-rollout` — zero-downtime rollout, สอน spare capacity) + rewrite recall quizzes Docker/k8s 3 ข้อเป็น scenario → `phase-7-devops.ts`
- [x] C2 estimation + cost concepts + lessons 2 บท (`c-4-estimation`, `c-4-cost` + `q-4-lesson-estimation/cost`) → `phase-4-caching.ts`
- [x] C5 แก้ comic distractors 6 จุด → plausible-wrong (P2/P5/P6×3/P7)
- [x] C6 multi-step incident P6/P7/P8 (เพิ่ม prevention step 2) + dynamic heading ใน `incident-quest-view.tsx` (รองรับ 1/2/3-step)

**Verified**: `content.integrity.test.ts` + `coverage.audit.test.ts` ผ่าน · sweep 16/16 (q-7-arch-rollout solvable) · browser (Step 1 root cause → Step 2 prevent recurrence, dynamic headings)

## M5 — UX juice (effort ~2 วัน, ทำท้ายสุด) ✅ DONE (D3 partial)
- [x] D1 XP toast + D2 badge/promotion celebration → `components/game/toaster.tsx` + `(game)/layout.tsx`; store ส่ง `lastXpGain`/`lastNotice`/`lastActionSeq`
- [x] A4 freeze refill (ใน `applyXp`) + UI count + title ใน top-bar (🧊N)
- [x] D4 lesson: option shuffle on retry (กันจำตำแหน่ง) + first-try mastery star ⭐
- [x] D3 lesson hint — 50:50 lifeline (เอา 2 wrong option ออก, content-free ใช้ได้ทุกข้อ) ใช้แล้วเสีย first-try bonus

**Verified**: browser smoke test — XP toast + freeze UI (🧊1) + lesson shuffle ("404" ที่ B, "POST" ที่ D) + first-try star + 50:50 lifeline (Q1 เหลือ 2 ตัวเลือก) + multi-step incident; ไม่มี console error

---

# Verification Appendix — tests ที่ต้องเพิ่ม/แก้

| Milestone | Test | ตรวจอะไร |
|---|---|---|
| M1 | `badges.test.ts` (ใหม่) | complete capstone → phase badge earned; lowLatency ใช้ maxLatency จาก predicate |
| M1 | `streak.test.ts` (แก้) | hydrate ไม่เพิ่ม streak; quest/review เพิ่ม |
| M2 | `simulation.test.ts` (แก้ใหญ่) | cache ลด p95 / ไม่ลด availability; side-branch = inline; CDN ลด downstream rps; throughput ใช้ rpsToTerminal |
| M2 | `quest.engine.test.ts` (แก้) | orphan required node → fail |
| M2 | `solvability.sweep.test.ts` (แก้) | solver wire ทุก node; 15/15 solvable ด้วย model ใหม่ |
| M3 | `xp.test.ts` (แก้) | `sum(xpReward) >= xpForLevel(41)`; grade multiplier; DAILY_XP_CAP enforce |
| M4 | `content.integrity.test.ts` (มีอยู่) | quest/concept ใหม่ผ่าน Zod + correctIndex ครบ |
| M4 | `coverage.audit.test.ts` (มีอยู่) | concept ใหม่มี lesson, ไม่มี dead-end prereq |
| ทุก M | `pnpm test && pnpm typecheck` | regression ทั้ง workspace |

> เอกสารนี้สรุปจากการรีวิว 3 subagent (progression / simulation / pedagogy) — 2026-07-11 · source commit `3e43988`
