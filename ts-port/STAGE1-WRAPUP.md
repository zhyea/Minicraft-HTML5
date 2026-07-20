# 阶段1 · 全逻辑 port 收官报告

> 工程：Minicraft-HTML5 的 TS/Vue 重建（Java 逻辑 → TypeScript + Canvas 渲染 + Vue 菜单 overlay）
> 目录：`ts-port/`
> 收官时间：2026-07-20 · 主理人独立复核通过

## 一、六冲刺总览（每冲刺均经主理人独立三道门控复核）

| Sprint | 内容 | tsc | vitest | vite build | 关键产物 |
|--------|------|-----|--------|-----------|----------|
| S1 | 物品 / 背包 / 资源注册表 | ✅0 | 28 | ✅0 | `item/*`, `item/resource/*`, `entity/Inventory.ts` |
| S2 | 合成系统（35 配方逐字保真） | ✅0 | 37 | ✅0 | `crafting/*`, `crafting.test.ts` |
| S3 | 家具（5 类 + 基类） | ✅0 | 43 | ✅0 | `entity/Furniture.ts` + 6 子类 |
| S4 | mob + AirWizard + 胜利连线 | ✅0 | 47 | ✅0 | `entity/{Slime,AirWizard,Spark}.ts`，`Game.won()` |
| S5 | Vue 完整菜单树 | ✅0 | 54 | ✅0 (98 modules) | `src/ui/*.vue` + `state.ts` + `menus.test.ts` |
| **S6** | 粒子 + 缺失 Tile + Sky 修复 | ✅0 | **64** | ✅0 (104 modules) | `entity/particle/*`, `tile/{Sapling,Hole,Farm,Wheat}.ts` |

**累计：tsc 全程 exit 0 · vitest 64 测试 / 11 文件零回归 · vite build 104 modules exit 0**

## 二、S6 关键修正：Sky 层终于端到端可达

- **修复点**：`Game.startNewGame()` 原先只建 surface/underground，从不建 Sky 层（及 levels[1/0]）。现照 Java `resetGame` 建全 5 层栈：`levels[4]=Sky(深度+1,level===1)`、`[3]=surface(0)`、`[2..0]=underground(-1..-3)`，带 parent 链。
- **AirWizard 召唤**：`Level.ts:76-81` 在 `level===1` 于 `(w*8, h*8)` 召唤 AirWizard —— 与 Java 保真。胜利链路：击杀 AirWizard → `Player.gameWon()`(invuln=60*5) → `Game.won()`(wonTimer=180) → `WonMenu`。**端到端打通**。
- **诚实偏差（重要）**：原 brief 诊断"createSkyMap 因 infiniteFall 致 ~47s 卡死"不准确。实测当前 TS `createSkyMap` 300 样本 cloud∈[4360,6213] 永久 ≥2000，`createAndValidateSkyMap` 第 1 次 attempt ~1ms 返回，不挂。真因是 `startNewGame` 未建 Sky 层，LevelGen 算法零改动。D1 测试（建 5 层 + 断言 Sky 层恰好 1 个 AirWizard + <5s，重复 5 次）已通过佐证。

## 三、S6 其余落地

- **缺失 Tile 占位全清**：`treeSapling(9)/hole(8)/cactusSapling(10)/farmland(11)/wheat(12)` 均为真实 Tile；registry 中 `NULL_TILE` 占位全部替换（acorn→treeSapling、dirt 源含 hole+water+lava、cactusFlower→cactusSapling、seeds→wheat on farmland）。**无 null tile 残留**。
- **粒子系统**：`Particle` 基类 + `SmashParticle`(破坏方块) + `TextParticle`(伤害数字)；`Mob.doHurt`/`Player.doHurt`/`CactusTile.hurt` 接入；`engine/Rand.nextGaussian()` 保真抖动。

## 四、已知偏差（均属切片范围外 / 与既有策略一致，非缺陷）

1. `WheatTile.harvest` / `CactusTile.hurt` 掉落物 stub —— 未 port `ItemEntity`（与既有掉落 stub 策略一致）。
2. `TextParticle.render` 画彩色标记，非 `Font.draw` 文字 —— 当前无 Font 模块。
3. `SmashParticle` 省 `Sound.monsterHurt` —— 当前无音频。
4. `StoneTile` 故意跳过 —— Java 全源未引用，死代码。

## 五、遗留 TODO（非阻塞，超出阶段1 六冲刺定义范围）

- **vite.config 清理**：存在 `vite.config.mjs` + `vite.config.ts` 双配置及若干 `vite.config.*.timestamp-*.mjs` 临时文件（沙箱禁删被拒）。Vite 取 `.mjs`，构建不受影响，待本地/放开删权后清理。
- **port `ItemEntity`**：打通 Wheat/Cactus 掉落物。
- **port `goldOre`/`gemOre`**：让深层渲染矿脉而非回退 rock。
- **`sky-scratch.test.ts`** 已成 noop 占位，可删。
- **独立支线**（任务 #4，pending）：本地 `ant clean && ant build` + GWT 2.4 SDK 验证 GWT 侧汉化/大屏/存档改造（沙箱无 Java 编译器，未真编）。

## 六、下一步可选方向（待用户拍板）

1. 视需求补 ItemEntity / goldOre / gemOre / 粒子文字与音效，逼近 100% 行为保真。
2. 本地跑 GWT 构建验证原 Java 侧改造；并清理 vite.config 冗余。
3. 进入"阶段2 打磨/可玩性"或"发布/部署"——如需我可调度对应成员做垂直切片试玩或 Live Ops 准备。
