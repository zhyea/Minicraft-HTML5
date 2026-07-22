# Minicraft-HTML5（ts-port）游戏细节清单

> 整理时间：2026-07-21
> 范围：TS/Vue 垂直切片 `ts-port/src/game`（基于 Java 原版 `src/com/mojang/ld22` 移植）
> 数据来源：直接核对磁盘真实源码（tile/registry、resource/registry、Crafting、InputHandler、Mob/Player/Zombie/Slime/AirWizard、Furniture、Game、EntityIO）。三道门控现状：`tsc=0` / `vitest 77 测试` / `vite build 111 modules`，全绿。

---

## 1. 操作控制（InputHandler）

| 动作 | 按键（code / keyCode 双映射） | 绑定名 | 说明 |
|------|------------------------------|--------|------|
| 上 | `ArrowUp` / `KeyW` (38/87) | up | 移动 |
| 下 | `ArrowDown` / `KeyS` (40/83) | down | 移动 |
| 左 | `ArrowLeft` / `KeyA` (37/65) | left | 移动 |
| 右 | `ArrowRight` / `KeyD` (39/68) | right | 移动 |
| 攻击 / 使用物品 | `KeyC` (67) | attack | 四段式交互：物品用在方块/实体 → 方块交互 → 物品用在实体 → 打方块/打怪 |
| 菜单 / 使用家具 | `KeyX` / `Enter` (88/13) | menu | 先 `player.use()`（用相邻家具→开对应菜单），无家具则开背包 |
| 切换手持物 | `KeyZ` (90) | select | `cycleActiveItem`：物品0→1→…→null→物品0（切片便利键，原版靠菜单切物） |
| 玩法说明 | `KeyH` (72) | help | 游戏中按 H 随时打开「玩法说明」面板；也可在**背包菜单**点「玩法说明」按钮进入。X/Enter/Esc 返回（回游戏 / 背包 / 标题，视打开位置而定） |

- 楼梯无独立键：走到 stairs 方块上由 `Player.tick()` 自动 `changeLevel(dir)`。
- 菜单返回逻辑（`state.ts`）：用「菜单栈」`gameState.menuStack` 记录层级，`closeMenu()` 弹栈回到**精确上一层**——标题→说明→标题（可点「开始游戏」）；游戏→说明→游戏；**背包→说明→背包**（点按钮进说明也不会丢背包上下文）。修复了原先关闭说明后落到空白 `none` 死胡同、以及子菜单里再开子菜单会串味的导航缺口。
- 内部分辨率固定 `160×120`（`Game.WIDTH/HEIGHT`），渲染放大 + `image-rendering: pixelated`。

---

## 2. 世界与层级（5 维堆叠）

| 数组下标 | 维度 | depth | 中文 | 入口方块 | 特殊 |
|---------|------|-------|------|---------|------|
| levels[4] | Sky | +1 (level===1) | 天空 | stairsUp 顶 | **AirWizard BOSS**（2000 HP）生成处 |
| levels[3] | Surface | 0 | 地表 | — | 出生点；`currentLevel` 初始 3 |
| levels[2] | Underground 1 | -1 | 地下1层 | stairsDown/Up | monsterDensity=4 |
| levels[1] | Underground 2 | -2 | 地下2层 | 同上 | monsterDensity=4 |
| levels[0] | Underground 3 | -3 | 地下3层 | 同上 | monsterDensity=4（最深层） |

- 上层 `stairsDown` 处，下层对应位置自动挖出 `stairsUp`。
- 胜负：击败 AirWizard → `WonMenu`；玩家生命归零 → `DeadMenu`。

---

## 3. 玩家状态（Player）

| 属性 | 值 | 说明 |
|------|----|------|
| 生命 maxHealth | 10 格 | 归零 → 死亡 |
| 体力 maxStamina | 10 格 | 攻击/游泳消耗；停止动作后每 tick 缓慢回复（`stamina++` 至上限） |
| 分数 score | 0 起 | 击杀/捡物累加 |
| 攻击伤害 | `random(3)+1` + 武器加成 | 由 `getAttackDamage(e)` 计算 |
| 起始物品 | Workbench（家具）+ PowerGlove（手套） | `Player` 构造 `seedStartingItems=true` 时播种；`Game.startNewGame` 默认走该路径 |

---

## 4. 方块清单（Tile，id 0–22，已注册）

| id | 名称 | 中文 | 主要交互/行为（均已移植） |
|----|------|------|--------------------------|
| 0 | grass | 草 | 铲→耕地(farmland)；锄→耕地并可能掉种子；可种树/小麦 |
| 1 | rock | 岩石 | 镐敲→掉 1–4 石 + 0–1 煤；否则 setData |
| 2 | water | 水 | 不可走（除非会游泳）；向相邻 hole 蔓延 |
| 3 | flower | 花 | 采→掉 1–2 鲜花；铲→掉 2 鲜花并变草 |
| 4 | tree | 树 | 斧砍→掉 wood/apple/acorn（阈值 20）；手敲也可用 |
| 5 | dirt | 泥土 | 可种植（花/树苗/沙等源） |
| 6 | sand | 沙 | 可种植；蔓延 |
| 7 | cactus | 仙人掌 | 砍→掉仙人掌花；触碰受伤 |
| 8 | hole | 洞 | 坠落 |
| 9 | treeSapling | 树苗 | 长成树 |
| 10 | cactusSapling | 仙人掌苗 | 长成仙人掌 |
| 11 | farmland | 农田 | 种小麦 |
| 12 | wheat | 小麦 | 成熟收割→种子/小麦 |
| 13 | lava | 熔岩 | 伤害 + 光照(半径6) + 向相邻 hole 蔓延；`mayPass`=会游泳者 |
| 14 | stairsDown | 下楼梯 | 下行一层 |
| 15 | stairsUp | 上楼梯 | 上行一层 |
| 16 | infiniteFall | 无限坠落 | `mayPass`=仅 AirWizard |
| 17 | cloud | 云 | 铲→掉 1–2 云；蔓延 |
| 18 | hardRock | 硬岩 | 需镐 4 级；敲→掉石+煤；否则 setData |
| 19 | ironOre | 铁矿 | 镐敲→掉铁矿（Resource.ironOre） |
| 20 | goldOre | 金矿 | 镐敲→掉金矿（Resource.goldOre） |
| 21 | gemOre | 宝石矿 | 镐敲→掉宝石（Resource.gem） |
| 22 | cloudCactus | 云仙人掌 | 天空层障碍 |

> 注：ironOre/goldOre/gemOre 在 `installOreTiles()` 中于 `installResources()` 之后创建（规避 Resource 未初始化的 load-order 问题）。

---

## 5. 资源清单（Resource，24 种）

木 / 石 / 鲜花 / 橡果 / 泥土 / 沙 / 仙人掌 / 种子 / 小麦 / 面包(食,回2血,耗5体) / 苹果(食,回1血,耗5体) / 煤 / 铁矿 / 金矿 / 铁锭 / 金锭 / 黏液 / 玻璃 / 布 / 云 / 宝石

- 食物经 `FoodResource`（面包/苹果）实现，无独立 `FoodItem`（与 Java 原版一致，食物即带吃的 ResourceItem）。
- 种植类（`PlantableResource`）：鲜花/橡果/泥土/沙/仙人掌/种子/云，定义「种在哪种 Tile 上」。

---

## 6. 物品与工具

| 类别 | 说明 |
|------|------|
| ToolItem | 5 种工具类型 × 5 级：木(0)→石(1)→铁(2)→金(3)→宝石(4)。类型：铲(shovel)/锄(hoe)/剑(sword)/镐(pickaxe)/斧(axe)。`canAttack()` 剑返回 true（可战斗），其余工具用于采集。 |
| ResourceItem | 携带单个 Resource + count；掉落物/合成原料。 |
| FurnitureItem | 包裹一个 Furniture 实体；`interactOn` 放置到地面（需 `tile.mayPass`）。 |
| PowerGloveItem | 拾取/放置家具的手套（起始物品之一）。 |

---

## 7. 合成配方（Crafting，共 35 条，逐字保真 Java）

**工作台 Workbench（16 条）**
- 家具：灯笼、烤箱(石×15)、熔炉(石×20)、工作台(木×20)、箱子(木×20)、铁砧(铁锭×5)
- 工具 tier0（木×5）：剑/斧/锄/镐/铲
- 工具 tier1（木×5 + 石×5）：剑/斧/锄/镐/铲

**铁砧 Anvil（15 条）**
- 工具 tier2（木×5 + 铁锭×5）、tier3（木×5 + 金锭×5）、tier4（木×5 + 宝石×50）× 5 类型 = 15

**熔炉 Furnace（3 条）**
- 铁锭(铁矿×4 + 煤×1)、金锭(金矿×4 + 煤×1)、玻璃(沙×4 + 煤×1)

**烤箱 Oven（1 条）**
- 面包(小麦×4)

> 菜单树（Vue）：`InventoryMenu` / `CraftingMenu`（按 station 切 workbench/anvil/furnace/oven 配方）/ `ContainerMenu`（箱子）/ `DeadMenu` / `WonMenu` / `HelpMenu` / `AboutMenu`。

---

## 8. 家具（Furniture，6 种，已注册名）

| 注册名 | 类 | 用途 |
|--------|----|------|
| 工作台 | Workbench | 开 workbench 合成菜单 |
| 铁砧 | Anvil | 开 anvil 合成菜单 |
| 熔炉 | Furnace | 开 furnace 合成菜单 |
| 烤箱 | Oven | 开 oven 合成菜单 |
| 箱子 | Chest | 容器（带 Inventory，可存物） |
| 灯笼 | Lantern | 光源（lightRadius=8） |

- 使用链路：X 键 → `Player.use()` → `Furniture.use()` → `Game.furnitureUseHandler`（App.vue 安装，映射到对应 Vue 菜单）→ `openCrafting/openContainer`。

---

## 9. 怪物（Mob）

| 怪物 | 生命 | 接触伤害 | 死亡掉落 | 击杀得分 | 出现 |
|------|------|---------|---------|---------|------|
| Zombie | `lvl×lvl×10` | `lvl+1` | 1–2 布(cloth) | `50×lvl` | 各层（depth 决定 lvl：地表1 / 地下 up to (-depth)+1 / 天空4） |
| Slime | `lvl×lvl×5` | `lvl`（非 lvl+1） | 1–2 黏液(slime) | `25×lvl` | 同上 |
| AirWizard | 2000 | Spark 弹幕 | — | 1000 | 仅天空层（level===1），击杀触发胜利 |
| Player | 10 | — | — | — | 可控角色 |

- 刷怪：`Level.trySpawn(count)` 忠实移植，`tick()` 首行 `trySpawn(1)`；`startNewGame` 照 Java 5 层各 `trySpawn(5000)` 填满密度（自限，存盘 < 0.6MB）。
- AirWizard 有 3 阶段（HP<1000 / <200 切换攻击模式），死亡经 `Player.gameWon()` → `Game.won()`（invuln 60×5）触发 `WonMenu`。

---

## 10. 存档系统（Save，MVP 闭环）

### 存档说明（玩家向）

- **自动存档，无需手动操作**：游戏进行中**每约 30 秒**自动存一次（内部每 1800 tick）；此外**关闭或刷新页面时也会存一次**。没有「存档」按钮——只要游戏在跑，进度就会自动落盘。
- **怎么续玩**：标题界面在检测到已有存档时，会多出一颗 **「继续游戏」** 按钮，点它即可从上次的进度接着玩（无需从零开局）。
- **存了什么**：玩家（背包、当前手持物、血量、体力、分数、所在位置）、五个维度的**整张地图**（方块与数据）、以及场上**所有实体**（怪物、家具、箱子内容、**地面掉落物**）。读档后世界状态完整还原。
- **不会覆盖什么 / 注意**：玩家**死亡或通关的瞬间不会写入存档**（避免「读档即死 / 读档即胜」）。因此——如果你死了，重开时读回的是**死亡前最后一次自动存档**；通关后想再玩需重新开局。
- **存档在哪**：默认存在**浏览器的 localStorage**（同一浏览器、同一网址下保留）。清空浏览器缓存、换浏览器、或用无痕/隐私模式会导致丢档（禁用 localStorage 时自动退化为「仅当前会话有效」的内存存档）。
- **可靠性**：存档写入全程容错——文件损坏或版本不符（非 `schemaVersion=1`）会被静默忽略，不会污染当前进行中的游戏。

| 项 | 值 |
|----|----|
| 存储键 | `localStorage['minicraft.save']`（不可用时回退内存 Map） |
| 序列化 | tiles/data 经 Base64（Uint8Array↔btoa/atob）；实体 JSON 容器；`schemaVersion=1` |
| 自动存 | 每 1800 tick（=30s @60fps）+ `beforeunload`；仅活动游戏内 |
| 标题菜单 | 有存档时动态出现「继续游戏」 |
| 守卫 | 死亡/通关不自动存（`player.removed \|\| health<=0` 规避读档即死） |
| 实体类型(t) | 1 Player / 2 Zombie / 3 Slime / 4 AirWizard / 6 Chest / 7 Workbench / 8 Anvil / 9 Furnace / 10 Oven / 11 Lantern / **12 ItemEntity（地面掉落物，含 x/y/lifeTime/time/hurtTime/item）** |
| 读档 | `Level.fromSave` 静态工厂（绕开 LevelGen 与 AirWizard 自动 spawn）；`EntityIO`/`ItemIO` 逐实体还原 |

---

## 11. 已知偏差 / 尚未完成（诚实披露）

1. **GWT/Java 侧改造未编译验证**：汉化（CJK 运行时栅格化）、大屏自适应、GWT 侧存档均已写码但未在 `ant + GWT 2.4 + JDK 8` 跑过，需本地验证。
2. **音效缺失**：原版 `Sound.*`（拾取/受击/Boss 死等）无音频模块，相关调用位置留空或省略（SmashParticle 省 `Sound.monsterHurt`）。
3. **粒子文字**：`TextParticle` 画彩色标记而非 `Font.draw` 文字（无 Font 模块）。
4. **TextParticle/部分渲染 magic number**：属切片范围外，与既有策略一致。
5. **熔炉/烤箱熔炼为菜单驱动**：Java 原版 Furnace/Oven 本就无逐 tick 熔炼逻辑（仅 `use` 开菜单），TS 一致。
6. **未做工程化收尾**：无 ESLint/Prettier/CI；`tsconfig` 关了 `noUnusedLocals`；生产代码残留少量 `console.*`（见 CODE-QUALITY-REPORT.md）。

---

## 12. 闭环可达性（当前状态）

开局带 工作台 + 手套 → `Z` 选中工作台 → `C` 放置 → 走到旁边按 `X` → 开合成菜单 → 采矿/造工具/战斗 → 下矿至天空层击杀 AirWizard 通关。**生存→制造→战斗全链路端到端可达。**
