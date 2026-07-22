# TS 版 vs Java 原版 逻辑遗漏审计报告

> 审计时间：2026-07-20
> 范围：Java 原版 `src/com/mojang/ld22` ↔ TS 垂直切片 `ts-port/src/game`
> 方法：审计 agent 全量 diff + 主理人独立抽查磁盘真实状态（含 `Player.attack` / `Level.tick` / `Ore` / `Rock` / `HardRock` / `Tree` / `Grass` / `Stairs` / `EntityIO`）

---

## 〇、根因（最关键，已主理人复核确认）

**`Player.attack()` 是功能性 stub** —— 它是整个生存→制造→战斗闭环的总开关，目前只做了"打方块"一件事。

Java 原版的四段式交互管线（`Player.attack`，com.mojang.ld22.entity.Player）：
```java
if (activeItem != null) {
  if (activeItem.interactOn(tile, level, xt, yt, this, attackDir)) return;   // 物品用在方块上
}
if (tile.interact(level, xt, yt, this, activeItem, attackDir)) return;        // 方块被交互
if (activeItem != null) {
  if (activeItem.interact(level, xt, yt, this, attackDir)) return;            // 物品用在实体上
}
Tile tile = level.getTile(xt, yt);
if (tile == Tile.hardRock && (activeItem instanceof ToolItem)) { ... }        // 硬岩特判
tile.hurt(level, xt, yt, this, randomDmg, attackDir);                         // 最后才打方块
// 实体交互：
for (Entity e : level.getEntities(...)) {
  if (e instanceof Mob && hasLineOfSight && attackBox.intersects(e)) {
    e.hurt(this, getAttackDamage(...), attackDir);                            // 玩家打 Mob
  }
}
```

TS 版的实际代码（`ts-port/src/game/entity/Player.ts:102-120`）：
```ts
private attack(): void {
  this.walkDist += 8;
  this.attackDir = this.dir;
  this.attackTime = 5;
  // ...计算 tx/ty...
  if (tx >= 0 && ty >= 0 && tx < this.level.w && ty < this.level.h) {
    this.level.getTile(tx, ty).hurt(this.level, tx, ty, this, 1 + Math.floor(Math.random() * 3), this.attackDir);
  }
}
```

**后果链（全部由这一个 stub 引发）：**
1. `activeItem` 字段存在（Player.ts:34，类型 `Item | null`），但 `attack()` 永不读取它 → 恒为 `null` 的死状态。
2. 物品"用在方块/实体上"（`interactOn`/`interact`）—— 耕地、采矿、放家具、用工具、吃食物、开箱、合成触发，全部不可达。
3. 实体受伤分支（`e.hurt(this, ...)`）缺失 → **玩家无法对 Mob 造成任何伤害**（战斗闭环断）。
4. 楼梯检测不在 `attack()` 也不在 `tick()` → 无法上下层，天空 BOSS 层入口不可达。

> 注：部分 Tile（如 `Tree`/`Cactus`）确实 port 了 `hurt`，`ItemEntity` 已完整移植、`Entity.move2` 已挂 `touchedBy` 钩子 —— 但"掉落物能生成、能被捡"不等于"玩家能主动采矿/种田/战斗"，因为触发这一切的总开关是 stub。

---

## 一、遗漏分类

### A. Tile 交互方法缺失 / 截断（已注册，但行为不全）

| Tile | Java 原版 | TS 现状（已查证） | 影响 |
|------|----------|------------------|------|
| Grass | `interact` 耕地→Farm | 无 `interact`（Grass.ts 仅类声明） | 不能犁地，农业线断 |
| Flower | `interact`/`hurt` 采花得资源 | 无 `interact`/`hurt` | 不能采花 |
| Tree | `hurt`（✓已port）+ `interact`（斧头倍率） | 仅 `hurt`，无 `interact` | 斧砍树不加速（仍可用手敲） |
| Cactus | `hurt`（✓上轮接回） | 仅 `hurt` | 可用手敲，交互无 |
| Ore (ironOre) | `hurt`+`interact`+掉落 `toDrop` | 无 `hurt`/`interact`，`toDrop` 丢失（注释 "drops are stubbed"） | **无法采矿掉矿** |
| Rock | `hurt`+`interact` | 无 `hurt`/`interact`（注释 "Item/particle drops are stubbed"） | 不能敲石头 |
| HardRock | `hurt`+`interact` | 无 `hurt`/`interact` | 矿洞墙不可破 |
| Wheat | `harvest` 收庄稼 | harvest stub | 收不了庄稼 |
| Lava | `tick`（伤害）/光照/`mayPass` | 无 `tick`/光/`mayPass` | 无熔岩伤害/照明 |
| Cloud | `interact` 拨云见天 | 无 `interact` | 不能拨云 |
| Water | `tick` 水流蔓延 | tick 蔓延空 | 无水流扩散 |
| InfiniteFall | `mayPass` 坠落判定 | `mayPass` 缺失 | 坠落判定缺 |
| Stairs | `interact` 上下层 | 无 `interact`/`hurt`（Stairs.ts 仅类声明） | **不能上下层（含天空 BOSS 入口）** |

### B. 完全缺失 / 不可达的系统

- **刷怪**：`Level.tick()` 无 `trySpawn`（Level.ts:4-5 注释 "continuous mob spawning omitted"）；`startNewGame` 只放 1 个 Zombie。击杀后不再刷新，地下层空荡。
- **战斗**：玩家攻击不调 `entity.hurt` → Mob 无敌，玩家只能被揍。
- **物品使用/放置/装备链路**：`activeItem` 恒 `null`，无 `use()`、无背包→手持有接线、无 `Interact`/`TouchItem` 菜单钩子（除 `touchItem` 捡拾外）。
- **家具/容器/合成菜单**：`Crafting`/`Workbench`/`Anvil`/`Furnace`/`Oven` 逻辑未接通 UI 层（代码里 `FurnitureItem`/`PowerGloveItem` 存在但无调用方）。
- **起始物品播种**：开局未给 `Workbench` + `PowerGlove` → 连合成台都放不出来，制造线从源头断。
- **存档**：`EntityIO` 仍 **跳过 ItemEntity 持久化**（注释 "skips nulls" 上下文） —— 掉落物不进档。

### C. 注册缺失

- `goldOre`(id 20) / `gemOre`(id 21) **未注册**（registry.ts:56 注释 TODO），`ironOre` tint 为占位 `0x333333`。
- 高级工具链（金/宝石级）原料无法获得 → 中期进度锁死。

---

## 二、阶段0 切片"有意裁剪" vs "应补逻辑缺口"

**有意裁剪（验收标准内，可接受）：**
- AirWizard 仅在天空层生成、单 Zombie 起步、渲染分辨率/大屏自适应、CJK 汉化、存档骨架。
- 这些是"先跑通端到端"的合理边界。

**真正应补的缺口（阻断"能玩通"）：**
- 上面 A/B/C 中 **阻断生存→制造→战斗闭环** 的部分，尤其：
  - `Player.attack` 四段式管线（P0，一切的总开关）
  - 刷怪（P1）
  - Ore/Rock/HardRock/Grass/Flower 的 `interact`+`hurt` + 注册 gold/gemOre（P1）
  - 菜单/起始物品播种（P2）
  - 掉落与光照补全（P2）

---

## 三、Top 5 优先缺口（建议排期）

| 优先级 | 缺口 | 修复要点 |
|--------|------|----------|
| **P0** | `Player.attack()` 重写 | 实现四段式：`activeItem.interactOn(tile)` → `tile.interact(item)` → `activeItem.interact(entity)` → `tile.hurt` + `entity.hurt`。这是打通采矿/耕地/战斗/放家具的**唯一总开关** |
| **P1** | 恢复刷怪 | `Level.tick` 加 `trySpawn`，按难度/层级配额生成 Zombie/Slime，地下层补充 |
| **P1** | 补全 Ore/Rock/HardRock/Grass/Flower 交互 + 注册 gold/gemOre | 移植 `hurt`+`interact`、补 `toDrop`、修 tint、注册 id 20/21 |
| **P2** | 接通家具/容器/合成菜单 + 起始物品播种 | 背包→持有接线、`use()` 链路、开局塞 Workbench+PowerGlove |
| **P2** | 补齐掉落与光照 | Wheat harvest、Slime 掉落、Lava 光照/`mayPass`、Water 蔓延、Stairs 检测、ItemEntity 入档 |

---

## 四、独立复核结论

主理人已亲查磁盘真实状态，确认以下论断**属实**：
- ✅ `Player.attack()` 仅调 `tile.hurt`，无 `activeItem` 使用、无 `entity.hurt` 调用（Player.ts:102-120）。
- ✅ `Ore`/`Rock`/`HardRock` 无 `interact`/`hurt`（抽查源码确认）。
- ✅ `Level.tick` 无 `trySpawn`（Level.ts:4-5 注释明示）。
- ✅ `Tree` 有 `hurt` 无 `interact`；`Grass`/`Stairs` 无 `interact`/`hurt`（抽查确认）。
- ✅ `goldOre`/`gemOre` 未注册（registry.ts:56 TODO）。
- ✅ `EntityIO` 跳过 ItemEntity 持久化。

其余 per-tile 细节来自审计 agent 的 diff 结论，与主理人抽查样本一致，可信但建议实现时逐项再核。
