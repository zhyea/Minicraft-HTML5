# ts-port 代码质量评估报告

> 评估对象：`ts-port/` —— Minicraft 的 TypeScript/Vue 重建（Java 逻辑 → TS + Canvas + Vue 菜单）
> 评估时间：2026-07-20
> 评估范围：源码 85 个 `.ts` 文件（5731 行，不含测试）+ 12 个测试文件（1184 行）
> 基线事实：据 `STAGE1-WRAPUP.md`，已完成 6 个 sprint，tsc 全程 exit 0、vitest 64 测试全绿、vite build 104 modules 通过。

---

## 一、量化指标（实测）

| 指标 | 数值 | 评价 |
|------|------|------|
| 源码 / 测试行数 | 5731 / 1184 | 测试占源码 ~21%（按行） |
| TypeScript `strict` | ✅ 开启 | 好 |
| `any` 总出现 | 9 处 | **极克制**（生产代码 0 处纯 `any`，含测试 1、Tile 基类等合理位置） |
| `@ts-ignore` / `@ts-nocheck` | 0 | 优秀——无绕过类型检查 |
| `as any` | 0 | 优秀 |
| `as never` | 1（`EntityIO.writeInventory` 内 `ItemIO.write(it as never)`） | 唯一类型逃逸点，封装在内部 |
| `as unknown`（反序列化边界） | 44 | 多在存读档边界，方向安全，可接受 |
| `console.*` 残留 | 8 处（Game 3 + SaveManager 5） | 调试/诊断日志未清理 |
| `TODO` / `FIXME` / `HACK` | 0 | 好 |
| 最大单文件 | LevelGen.ts 352 行 | 无巨石文件 |
| 测试结果 | 64 测试 / 12 文件，全绿 | 见第三节 |

---

## 二、架构评估（优秀）

分层清晰、依赖方向合理，是这份代码最突出的优点：

```
src/
  engine/   纯逻辑、无 DOM 依赖（Screen/SpriteSheet/Color/palette/Renderer/InputHandler）
             → 因此可在 node 环境单测，零 jsdom 依赖
  game/     TS 游戏循环 + 实体/关卡/物品/合成/存档
  ui/       Vue 菜单 overlay + reactive 桥接（state.ts）
```

- **`engine/` 与 DOM 解耦**：引擎核心（像素缓冲、调色板、精灵解压）不碰 `window`/`document`，是高质量可测设计。
- **循环依赖的处理成熟**：`registry.ts` 用 `installTiles()` 延迟注册规避了 ES module 的"Tile 静态字段构造子类"循环初始化陷阱，并用 `installed` 标志做幂等守卫（`registry.ts:31-35`）。
- **UI 与核心解耦**：`Game.furnitureUseHandler` 为 `null` 时核心完全不依赖 Vue，单元测试可独立跑（`Game.ts:57-59` 注释清楚）。
- **单一真相源**：`state.ts` 用 Vue `reactive` 的 `gameState` 管理"当前显示哪个 overlay"和菜单光标，`isMenuOpen()` 屏蔽 `title`/`none`，`closeMenu()` 还吸收了 menu-key 防止关闭后下一帧立即重开（`state.ts:147-162`）——细节到位。

---

## 三、测试质量（优秀，非凑数）

每测试文件均有多条 `expect` 断言，存档集成测试尤其专业：

| 测试文件 | it / expect | 覆盖要点 |
|----------|------------|----------|
| `save.test.ts` | 8 / 45 | **完整 round-trip**（5 层 tiles/data 字节级一致、玩家字段、背包、玩家↔关卡连线）、hasSave 状态机、Sky boss 不重复加载、损坏/错版本存档容错（3 用例）、自动存档节奏（1800 tick）、实体多样性（箱子/工作台/分层僵尸） |
| `crafting.test.ts` | 9 / 30 | 35 配方逐字保真 |
| `items.test.ts` | 17 / 34 | 物品/资源注册表 |
| `furniture.test.ts` | 6 / 21 | 5 类家具 + 基类 |
| `mob.test.ts` | 4 / 8 | Mob 行为 |
| `sprint6.test.ts` | 9 / 22 | 粒子/缺失 Tile/Sky 修复 |
| `menus.test.ts` | 7 / 22 | Vue 菜单树（jsdom） |
| `engine/*`（color/screen/spritesheet/inputhandler） | 12 / 34 | 引擎纯逻辑 |

**亮点**：`save.test.ts` 的 round-trip 用例验证"5 层字节级一致"，且专门测了"损坏 JSON / 错 schemaVersion 不抛异常、不污染 live 状态"——这是很多项目忽略的健壮性测试。

**盲区**：
- 无覆盖率工具报告。引擎核心 `LevelGen.ts`（352 行，地图生成算法）和 `Screen.ts` 的渲染数学覆盖度未知。
- 实体 AI / 碰撞行为似乎缺乏直接单测（`mob.test` 仅 4 用例偏少）。
- `sky-scratch.test.ts` 是 noop 占位（1 it / 1 expect），wrapup 已标记"可删"，应清理。

---

## 四、存档系统（本项目的质量高峰）

`save/` 三层设计是整份代码里最扎实的部分：

- **`SaveStore`**：抽象 `Backend` 接口 + `localStorage`/内存 `Map` 优雅降级（写探测避免 private mode 运行时抛错）；`base64` 编解码用 `chunk=0x8000` 规避 `String.fromCharCode` 参数上限（`SaveStore.ts:112-129`）。
- **`SaveManager.fromJson`**：采用"先在 locals 构建、最后原子提交到 `game`"模式（`SaveManager.ts:130-142`），保证损坏/部分 payload 永远不会让 live 游戏处于半更新状态；`currentLevel` 有边界校验 `cl >= 0 && cl <= 4 && levels[cl]`。
- **`EntityIO`**：`writeMobCommon`/`applyMobCommon` 提取 Mob 公共字段避免重复；所有反序列化字段都有 `?? 默认值` 兜底（如 `m.health = o.health ?? m.maxHealth`）。
- **防"读档即死"**：`Game.saveGame()` 守卫 `player.removed || player.health <= 0`，避免在玩家死亡瞬间存出"读档触发死亡菜单"的存档（`Game.ts:152-161` 注释清楚）。

---

## 五、性能意识（良好）

- `Renderer.blit()` 直接操作 `Uint8ClampedArray`，索引展开为 RGBA，无中间数组分配（`Renderer.ts:67-88`）。
- `Screen` 复用 `dither` 矩阵、`Level.renderSprites` 复用实例级 `rowSprites` 缓冲（每帧 `length=0` 清空）减少 GC 压力。
- 显示缩放纯 CSS 整数倍 + `image-rendering: pixelated`，backing store 恒为 160×120。
- 主循环用 `requestAnimationFrame` + 固定步长累加器，并对 `dt` 做 `>0.25s` 截断防卡顿后追帧（`Game.ts:178-190`）——正确做法。

---

## 六、风险与改进清单（按优先级）

### 🔴 P0 — 工程化配套缺失（影响长期可维护性）
1. **无 ESLint / Prettier**：`ts-port/` 下没有这两种配置文件。代码风格完全靠作者自觉，多人协作或长期演进必然漂移。
   → 建议：加 `eslint` + `@typescript-eslint` + `prettier`，配 `lint`/`format` 脚本。
2. **无 CI / 无覆盖率门槛**：仅靠人工跑 `npm run test`。建议加最小 CI（tsc --noEmit + vitest + 覆盖率阈值）。

### 🟡 P1 — 类型与代码卫生
3. **`noUnusedLocals` / `noUnusedParameters` 关闭**（`tsconfig.json:8-9`）：死代码、未用参数不会报警。
   → 建议：开启这两项（strict 已开，顺手收紧）。
4. **8 处 `console.*` 调试残留**：Game.ts:159/174（save 失败 warn）、SaveManager.ts:85/89/121/126（schema 警告）。是诊断日志，但应抽成统一 logger（带级别/前缀），避免生产噪音。
5. **反序列化无运行时 schema 校验**：全靠 `as number ?? 0` 兜底 + 注释假设结构稳定（`EntityIO.read` / `SaveManager.fromJson`）。当前可控（单一生产者 SaveManager），但若将来有多源存档/版本迁移，建议引入 `zod` 或手写 validator。属技术债，非 bug。

### 🟢 P2 — 可读性 / 占位清理
6. **Magic numbers**：`Game.renderGui()` 的 `0 + 12 * 32`、`Color.get(0, 200, 500, 533)` 等精灵索引是裸常量，可读性差 → 提取为命名常量/枚举。
7. **硬编码占位**：`registry.ts:56-63` 的 `ironOre` 颜色 `0x333333` 是硬编码 stub（goldOre/gemOre 尚未 port，wrapup TODO 已记），且**没有 TODO 标记**，易被遗忘。
8. **冗余配置**：`vite.config.mjs` + `vite.config.ts` + 若干 `vite.config.*.timestamp-*.mjs` 临时文件（沙箱禁删被审计拒）。应清理，Vite 实际取 `.mjs`。
9. **`sky-scratch.test.ts`** 为 noop 占位，删除即可。
10. **全局单例**：`gameState`（module reactive）与 `activeGame`（module 变量）是进程级单例。单游戏场景 OK，但限制了"多 Game 实例并发"和彻底测试隔离（测试已用 `beforeEach` clear 缓解）。

---

## 七、总体结论

**这是一份质量高于平均水平的移植代码**（在"从零把一整个游戏逻辑移植到 TS"的语境下属于上乘）。

- **强项**：架构分层清晰、类型纪律严格（strict + 零 `@ts-ignore`）、存档系统健壮且经专业测试、注释文档化"为什么这么设计"、主循环与渲染管线性能意识到位。
- **短板**：工程化配套缺失（无 lint/format/CI/覆盖率）、少量调试日志与硬编码占位未清理、反序列化缺乏运行时校验。

**综合评分：8.0 / 10**
- 正确性 & 健壮性：9/10（存档容错、原子提交、防读档即死）
- 可维护性：8/10（注释好，但缺 lint/CI）
- 类型安全：9/10（strict，逃逸极少）
- 测试：8/10（有质量，但覆盖率盲区、个别 noop）
- 工程化：5/10（无 ESLint/Prettier/CI，这是最大扣分项）

**最高优先级动作**：加 ESLint + Prettier + 最小 CI；开启 `noUnusedLocals`；清理 8 处 console 与 `sky-scratch.test.ts`。这四项几乎零风险，却能把"可维护分"和"工程化分"明显拉高。
