# Java ↔ TS 移植差距复查（2026-07-21）

> 对照对象：`src/com/mojang/ld22`（改造版 GWT 源码，已含 CJK / 大屏 / 存档）
> 移植目标：`ts-port/src/game` + `ts-port/src/engine` + `ts-port/src/ui`
> 注意：`ts-port/AUDIT-TS-VS-JAVA.md`（2026-07-20）**已严重过时**，其核心论断
> （Player.attack 是 stub、tiles 是 stub、不刷怪、gold/gem 未注册、ItemEntity 不进档）
> 在现行代码中**全部不成立**。本报告基于实读两边源码。

## 结论概览
绝大多数系统已忠实移植（玩家、怪 AI、方块、物品、菜单、地下光照、ItemEntity 存档、
gold/gem 矿注册、刷怪均已到位）。剩余缺口集中在**演出层**与**反馈层**，无 P0（无功能中断）。

## 差距清单

### P1 — 可见行为偏差（玩家会注意到，建议修）
1. **胜利/死亡演出延时缺失**
   - Java：`won()` 设 `wonTimer=60*3`(3s) 倒数后才弹 `WonMenu`；`playerDeadTime>60` 后才弹 `DeadMenu`（`Game.java:400-415`）。
   - TS：`Game.tick()` 在 `hasWon` 或 `health<=0` 时**立即** `openWon()/openDead()`（`Game.ts:266-270`）；`won()` 虽设 `wonTimer=180` 但从不倒数（`Game.ts:129-132`）。
   - 影响：胜利/死亡画面瞬间跳出，缺约 3s/1s 的演出与尸体停留，打击感弱。

2. **HUD 缺体力条与手持物图标**
   - Java：`renderGui()` 除 10 颗红心外，还画**10 格体力条**（含 `staminaRechargeDelay` 闪烁）与**手持物图标**（`activeItem.renderInventory`）（`Game.java:510-541`）。
   - TS：`renderGui()` 只画红心背景 + 红心（`Game.ts:311-325`），无体力条、无手持物图标。
   - 影响：玩家在画布上看不到体力，也看不到当前手持的是什么，战斗/采集节奏判断困难。

### P2 — 打磨 / 拟真（非阻断）
3. **音频系统完全缺失**
   - Java：`Sound.initAllSounds()` + `monsterHurt/playerHurt/playerDeath/bossdeath` 等多处播放（`Game.java:307`）。
   - TS：无 `sound` 模块；`Mob.doHurt/Player.die/AirWizard.die` 均省略声音（如 `Mob.ts`、`AirWizard.ts:163` 注释 "audio dropped"）。
   - 影响：全程无声。工作量中等（需 WebAudio + 资源 + 接播放点）。

4. **位图字体文本未实现（画布内文字=色块）**
   - Java：`gfx/Font.java` + `Screen` 文本绘制，`TextParticle` 用 `Font.draw(msg,…)` 显示真实伤害数字（`TextParticle.java:47-51`）。
   - TS：`Screen` 无 `Font.draw`；`TextParticle.render` 只画**单个彩色方块**，构造函数 `_msg` 字符串被忽略（`TextParticle.ts:57-61`）。
   - 影响：所有画布内飘字（伤害/弹出）显示为色块而非数字。菜单文字由 Vue DOM 渲染，不受影响。

5. **维度切换过场菜单缺失**
   - Java：经 `pendingLevelChange` 延迟弹 `LevelTransitionMenu`（"进入洞穴/天空"）（`Game.java:406-408`）。
   - TS：`Game.changeLevel()` 被 `Player.tick` 直接调用、**瞬时换层**（`Game.ts:141-160`，注释自承无过场）。
   - 影响：上下楼无过渡画面，仅视觉缺失，不影响可玩性。

6. **玩家渲染缺攻击挥动动画与手持家具绘制**（P2 装饰）
   - Java `Player.render` 有挥动帧与手持家具（`Player.java:279-329`）；TS 仅画身体（`Player.ts`），无挥动/手持家具精灵。

7. **失焦提示（"点击聚焦！"）缺失**（P2 装饰）
   - Java `renderFocusNagger()` 在画布失焦时提示（`Game.java:543-568`）。TS 用 Vue/Canvas focus 模型，未移植；影响极小。

## 已忠实移植（无需再修，避免重复劳动）
- 地下光照：`Game.ts:299-303` 对 `currentLevel<3` 执行 `lightScreen.clear→renderLight→overlay`，`Level.renderLight`/`Screen.overlay` 均存在；`Lava.getLightRadius=6`。
- 玩家：`swim` 扣体力/溺水、`payStamina` 模型、`attack()` 四段管线、无敌帧 `invulnerableTime=30`、食物回血。
- 怪 AI：Zombie/Slime/AirWizard/Spark 追踪/游走/攻击/掉落、`Mob.tick` 熔岩伤害/击退/游泳，1:1。
- 方块：Lava/Water/InfiniteFall/Cloud/Stairs/Farm/Sand/Cactus/Rock/HardRock/Ore/Flower 行为均到位；gold/gem 矿已注册。
- 物品：ToolItem(无耐久，与 Java 一致)/FurnitureItem/PowerGloveItem/FoodResource/PlantableResource/Resource/ResourceItem。
- 菜单：TitleMenu「继续游戏」、ContainerMenu(箱/炉/砧)、CraftingMenu、InventoryMenu、Won/Dead(~600ms 输入延迟)、About/Help；家具使用经 `App.vue` 的 `furnitureUseHandler` 接线。
- ItemEntity 存档持久化：`EntityIO` `t:12` + `SaveManager` 重载 `lvl.add(e)` 已在。

## 建议优先修复顺序
1. P1 #1 胜利/死亡延时（加 `wonTimer` 倒数与 `playerDeadTime>60` 门控）
2. P1 #2 HUD 体力条 + 手持物图标
3. P2 #4 位图字体文本（让伤害数字可见）
4. P2 #3 音频系统
5. P2 #5 维度切换过场

---

## 修复结果（2026-07-21，主理人编排 + 三路工程师并行）

全部 7 项差距已修复；最终合并门控 **tsc=0 / 89 测试（14 文件）/ vite 116 modules 全绿**，未 git commit。

| 差距 | 负责 | 修复要点 |
|------|------|----------|
| P1#1 胜利/死亡演出延时 | eng-flow | `Game.tick()` 加 `deadTime` 倒数（>60 才 `openDead()`）与 `wonTimer` 倒数（≤0 才 `openWon()`），对齐 Java 演出延迟 |
| P1#2 HUD 体力条+手持物 | eng-flow | `renderGui()` 增 10 格体力条（含 `staminaRechargeDelay` 闪烁）+ `activeItem.renderInventory` 图标 |
| P2#4 位图字体文本 | eng-render | 新 `engine/Font.ts`（核实 SpriteSheet 字形坐标 + 内置 5×7 兜底）；`Screen.draw/renderGlyph`；`TextParticle` 改调 `Font.draw` 显真实数字 |
| P2#5 维度切换过场 | eng-flow | `changeLevel` 改延迟（`pendingLevelChange`）；新 `TransitionMenu.vue` 过场（~1s）后 `completeLevelChange()` 真正换层 |
| P2#6 玩家挥动+手持家具 | eng-render | `Player.render` 增四向攻击挥动手势 + 手持家具/物品精灵（沿用既有 `attackTime/attackDir/attackItem`） |
| P2#7 失焦提示 | eng-flow | `App.vue` 失焦且游戏中时显示居中「点击聚焦！」 |
| P2#3 音频系统 | audio-lead | 新 `game/audio/Sound.ts`（Web Audio 实时合成，零二进制资源）；接 `monsterHurt/playerHurt/playerDeath/bossdeath`；`pickup/craft` 已定义未自动接线（可选增强） |

### 已知小偏离（功能等价，非阻断）
- **P1#2 体力闪烁读取**：`player.staminaRechargeDelay` 在 `Player.ts` 为 private，eng-flow 用结构性 cast 读取，功能对齐 Java。待收净：可让 Player 暴露公共 getter 后替换该 cast。
- **P2#3 可选音效**：`pickup`/`craft` 已合成定义但未在 UI 调用点自动接线，保持改动最小；后续要接只需在对应点加 `Sound.play('craft')`。

---

## 二次复核（2026-07-21 修复后）

> 复核对象：同上 Java 源 + 现行 ts-port（已含「修复结果」7 项 + 收净 2 偏离）。
> 方法：Explore agent 通读两树做行为 diff，主理人独立 grep 核实 P1 关键点（已确认）。

### 已修复项复核（8 项全部确认正确 ✅）
| 项 | 复核结论 |
|----|----------|
| P1#1 胜负演出延时 | ✅ `Game.tick` 有 `deadTime`(>60 开 DeadMenu) + `wonTimer`(≤0 开 WonMenu)，DeadMenu/WonMenu 存在 |
| P1#2 HUD 体力条+手持物 | ✅ 10 格血 + 10 格体力(耗尽闪烁) + `activeItem.renderInventory` |
| P2#3 音频系统 | ✅ `Sound.ts` 存在，接 monsterHurt/playerHurt/playerDeath/bossdeath/craft/pickup |
| P2#4 位图字体 | ✅ `Font.draw` 真实绘制；TextParticle 显真实数字 |
| P2#5 维度切换过场 | ✅ `changeLevel` 延迟 + `TransitionMenu` 过场后 `completeLevelChange` |
| P2#6 玩家挥动+手持家具 | ✅ `Player.render` 四向挥动 + 手持精灵 |
| P2#7 失焦提示 | ✅ `App.vue` 失焦显「点击聚焦！」 |
| 收净 A/B | ✅ `staminaRechargeDelay` 为 public（无 cast）；`craft`/`pickup` 已接线 |

### 新发现差距（二次复核）

#### P1 — 真实玩法缺失（2 项，建议修）
1. **P1-A `Mob.hurtTile` 缺失 → 碰矿/仙人掌不掉血**
   - Java：`Mob.hurt(Tile,x,y,dmg)`→`doHurt`；`OreTile.bumpedInto`→`entity.hurt(tile,x,y,3)`、`CactusTile.bumpedInto`→`entity.hurt(tile,x,y,1)`。
   - TS：`Entity.hurtTile` 是**空实现**（`entity/Entity.ts:44`），`Mob` 未重写；`Ore.bumpedInto`(`Ore.ts:41`)/`Cactus.bumpedInto`(`Cactus.ts:33`) 调 `entity.hurtTile(...)`→空操作。
   - 行为差异：TS 中玩家/怪贴着矿石(应 3 伤)/仙人掌(应 1 伤)移动时**完全不掉血**，Java 每次尝试进入都受伤。修复：在 `Mob` 加 `hurtTile(tile,x,y,dmg){ this.doHurt(dmg, this.dir^1); }`（Player 自动继承）。

2. **P1-B `Dirt` 瓦片无 `interact()` → 无法挖洞/直接锄地**
   - Java：`DirtTile.interact` 处理铲子→挖洞掉 dirt、锄头→变耕地。
   - TS：`tile/Dirt.ts` 仅 `class DirtTile extends Tile`，**无 interact**。
   - 行为差异：TS 无法用铲子把泥土挖成洞（洞可连通水/岩浆/沙），也无法用锄头直接把泥土锄成耕地（须先锄草再耕）。修复：补 `Dirt.interact`（shovel→`Tile.hole`+掉 `Resource.dirt`；hoe→`Tile.farmland`，对齐 Java）。

#### P2 — 对齐缺口（10 项，不阻断）
- **P2-1 小麦生长速率仅 Java 40%**：`Wheat.ts:57` `Math.random()<0.8` 跳过(20% 生长) vs Java `WheatTile.java:40` `nextInt(2)==0`(50%)。⚠️ 此为**用户有意要求**（"更拟真、中段可见生长"任务），非遗漏，保留。
- **P2-2 小麦配色斜坡不同（仅视觉）**：TS `icon=min(3,floor(age/13))`+`body=50+icon*100` vs Java `age/10` 双通道。功能等价。
- **P2-3 挖/锄瓦片缺 `Sound.monsterHurt`**：Java `GrassTile`/`DirtTile` 交互成功播此音；TS `Grass.interact` 未播，Dirt 无 interact。
- **P2-4 `SmashParticle` 缺 `Sound.monsterHurt`**：Java 构造时播；TS 注释「audio omitted」。
- **P2-5 `TitleMenu` 缺 `Sound.test`**：Java 选择时播；TS 标题界面静默（`ui/` 下无 `Sound.` 调用）。
- **P2-6 失焦提示不闪烁**：Java 按 `tickCount/20` 奇偶换色；TS `.focus-nagger` 静态文字。
- **P2-7 家具存档未持久化 `pushTime`/`pushDir`**：Java `EntityIO.writeFurniture` 写；TS 家具分支只写 `x,y,col,sprite,name`。瞬态，加载默认无害。
- **P2-8 Mob/Player 存档未持久化 `xr`/`yr`**：Java 写；TS `writeMobCommon` 不含。构造固定 xr=4/yr=3，默认正确，无影响。
- **P2-9 `InputHandler` 键位少于 Java**：Java 多绑 Tab/Alt(menu)、Space/Ctrl/0/-(45)(attack)；TS 仅 KeyX/Enter(menu)、KeyC(attack)，另加 select(Z)/help(H) 便利键。
- **P2-10 `ToolItem.renderInventory` 不画物品名**：Java 调 `Font.draw(getName())`；TS 只画图标（名称由 DOM InventoryMenu 显示，功能等价）。

### 二次复核结论
**P0：0　P1：2（碰矿/仙人掌不掉血、泥土无交互）　P2：10（含 1 项用户有意偏离 P2-1）。**
最需优先修复：**P1-A**（`Mob` 补 `hurtTile`）+ **P1-B**（`Dirt` 补 `interact`），均玩家可明显感知、影响生存/挖矿的真实行为缺失；其余 P2 多为音频/视觉/存档字段轻微不对齐，不阻断流程。

### 二次复核修复结果（2026-07-21，主理人编排 + engineering-lead）
用户选择仅修 P1（P1-A + P1-B），P2 暂留。主理人独立复核三道门控确认无回归。
- **P1-A `Mob.hurtTile`**：`Mob.ts` 新增 `hurtTile(_tile,_x,_y,dmg){ this.doHurt(dmg, this.dir ^ 1); }`（Mob.ts:95-97）。`Ore.bumpedInto`/`Cactus.bumpedInto` 调 `hurtTile` 现真实掉血（矿石 3 / 仙人掌 1），对齐 Java `Mob.hurt(Tile,…)`。
- **P1-B `Dirt.interact`**：`Dirt.ts` 补 imports + `interact()`（Dirt.ts:27-45）——铲子挖洞(`Tile.hole`)+掉 `Resource.dirt` 的 `ItemEntity`，锄头锄成 `Tile.farmland`。`Sound.monsterHurt` 故意省略（与 `Grass.interact` 一致，属 P2-3 音频缺口，不在本次范围）。
- 新增测试：`entity/__tests__/mob.test.ts`(4) 验 hurtTile 掉血 + 无敌帧门控；`level/tile/__tests__/dirt.test.ts`(3) 验挖洞+掉 dirt / 锄地 / 非工具无操作。
- **合并门控全绿：tsc=0 / 96 测试(16 文件) / vite 116 modules**。未 git commit。
- 当前剩余：**P2×10**（含 P2-1 小麦减速为用户有意）。**P1 已全部清零。**

---

## 三次复核（2026-07-21，修复 P1-A/P1-B 后）

> 复核对象：同上 Java 源 + 现行 ts-port（已含 7 修复 + 2 收净 + P1-A/P1-B）。
> 方法：Explore agent 通读两树做行为 diff，主理人独立核实新发现的 Ore 配色项（读 Color.ts / Ore.ts / OreTile.java）。

### 复核结论
- **P1-A `Mob.hurtTile` / P1-B `Dirt.interact`：均验证已正确修复**（Mob.ts:95-97、Dirt.ts:27-45，经 Player.attack 调用链触发）。**P1 = 0。**
- 7 个早期修复 + 2 收净偏差：全部完好（Game 延时/HUD、Sound、Font、TransitionMenu、Player 挥动、focus nagger、staminaRechargeDelay public、craft/pickup 接线）。
- 原 P2-1~P2-10 全部仍有效（复核确认）：P2-1/2 小麦为有意选择、P2-3~5 为有意音效省略、P2-7/8 为无害存档细节、P2-6/9/10 为打磨差距。

### 新发现
- **P2-11 `Ore` 瓦片渲染配色错误（纯视觉，非崩溃）**
  - Java `OreTile.java:29`：`color = (toDrop.color & 0xffffff00) + Color.get(level.dirtColor);` —— 用**单参** `Color.get`（仅替换低字节 dirt 调色板索引 `get1`）。
  - TS `Ore.ts:29`：`const color = this.baseColor + Color.get(level.dirtColor, level.dirtColor, level.dirtColor, level.dirtColor);` —— 误用**四参** `Color.get`，把 `get1(dirtColor)` 加到全部 4 字节，污染/溢出矿石真实配色（高字节被破坏）。
  - 修复：`this.baseColor + Color.get1(level.dirtColor)`（`Color.get1` 存在，Color.ts:18-24）。
  - 附：TS 构造器掩码 `0xffffff00`（Ore.ts:25）与 Java `0xffff00`（OreTile.java:25）不同——Java 清最低 2 字节，故完全忠实还需把掩码也改为 `0xffff00`（仅低字节留作 dirt 阴影）。纯视觉，非崩溃。

### 三次复核 verdict
**P0：0　P1：0（P1-A/P1-B 已修复且无新 P1）　P2：11**（P2-1/2 有意、P2-3~5 有意音效省略、P2-7/8 无害、P2-6/9/10 打磨、P2-11 新真实配色 bug 但纯视觉）。

---

## 四次复核（2026-07-21，修复 P2-11 + P2-3~P2-10 后）

> 方法：engineering-lead 逐项读 Java 原版做忠实最小改动；主理人独立逐文件核实关键改动 + 三道门。
> 注：engineering-lead 触 max-turns(45) 中断，但落盘改动经主理人 grep/Read 核实均完整、编译通过、测试不破。

### 已修复（9 项全部确认 ✅）
| 项 | 文件:行 | 修复要点 | Java 依据 |
|----|---------|----------|-----------|
| P2-11 Ore 配色 | Ore.ts:27,34 | 掩码 `0xffffff00`→`0xffff00`；render 四参 `Color.get`→`Color.get1(dirtColor)` | OreTile.java:25,29 |
| P2-3 瓦片音效 | Grass.ts:69,80 / Dirt.ts:35,42 | 挖/锄成功补 `Sound.play('monsterHurt')` | GrassTile/DirtTile.java:72,81,35,42 |
| P2-4 SmashParticle 音效 | SmashParticle.ts:19 | 构造补 `Sound.play('monsterHurt')` | SmashParticle.java:14 |
| P2-5 TitleMenu 音效 | TitleMenu.vue:43 | 选择补 `Sound.play('test')`（Sound.ts 新增 `test` 音） | TitleMenu.java:42 |
| P2-6 失焦闪烁 | App.vue:246-261 | `.focus-nagger` 加 `focusBlink 0.66s step-end` 动画 | Game.renderFocusNagger tickCount/20 |
| P2-7 家具存档字段 | EntityIO.ts:144-159,220-238 | 家具分支持久化 `pushTime/pushDir`，读档还原 | EntityIO.writeFurniture |
| P2-8 Mob 存档字段 | EntityIO.ts:45-46,62-63,79-80 | `writeMobCommon` 持久化 `xr/yr`，读档还原（默认 4/3） | EntityIO.writeEntityBase / Mob.save |
| P2-9 InputHandler 键位 | InputHandler.ts:83-90,109-114 | 补 Tab/Alt=menu、Space/Ctrl/0/-=attack；保留 KeyC/KeyX/Enter/Z/H | InputHandler.java |
| P2-10 ToolItem 名称 | ToolItem.ts:60 | `renderInventory` 补 `Font.draw(getName())` 画物品名 | ToolItem.java:49 |

### 四次复核 verdict
**P0：0　P1：0　P2：0（全部清零；P2-1/2 小麦为有意设计，保留不动）**。
合并门控全绿：**tsc=0 / 96 测试(16 文件) / vite build 116 modules**。未 git commit。

### 遗留提示（非代码缺陷）
- `ts-port/node_modules/` 被早期 `git add -A` 误 staged（数千文件）。**提交前**必须 `git reset ts-port/node_modules`（或补 .gitignore）移除，否则 commit 会把依赖整个带进版本库。
- P2-1（小麦速率）、P2-2（小麦配色斜坡）为用户有意选择，不在修复范围。
