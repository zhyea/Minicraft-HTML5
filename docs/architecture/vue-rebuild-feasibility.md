# Minicraft-HTML5 用 TypeScript + Canvas + Vue 重建：可行性 / 架构研究报告

> 作者：engineering-lead（程基岩）｜范围：研究 + 写作，**未修改任何源码**
> 日期：2026-07-20｜关联：`docs/architecture/{responsive-display,i18n-font-plan,save-system-plan,tv-feasibility}.md`、`design/i18n/zh-CN-strings.md`
> 前置动作：已逐文件 Read `src/` 全部 83 个 `.java` + `FakeServer.java`，并用 `grep` 精确锁定 GWT 耦合面。

---

## 0. 关键澄清（务必先读）

本任务有两个极易被误读的前提，先钉死：

1. **GWT 本身已是 Java→JS 编译器，当前产物已经是 JS。**
   `ant build` / `gradle build` 的输出 `build/gwt-js-war/`（含混淆压缩的 JS）跑在浏览器里，确实"已经是 JS"了。问题**不在"能不能转成 JS"**——它已经是。**真正的问题是可维护性**：产物耦合整个 GWT 2.4 运行时（Canvas/Storage/JSON/voices 模块 + 编译期桩），无源码级可读性、无类型、无模块化、无法用现代工具链（Vite/TS/Vue）调试或扩展。所以"转成 JS"成立，本报告的命题是**如何把它改写成可维护的形态**。

2. **"用 Vue 重建" = 全量重写，且 Vue 只管菜单。**
   - 游戏逻辑（实体、物品、关卡、生成、合成、存档序列化）**手动 port 成 TypeScript**，算法逐行等价。
   - 渲染层 = 浏览器原生 **Canvas 2D**（不是 Vue）。Vue **绝不负责游戏世界渲染**。
   - 菜单层（标题 / 背包 / 合成 / 死亡 / 胜利 / 说明 / 关于 / 容器）原画在 Canvas 上的 `Screen` 像素缓冲里，重建时**改用 Vue 组件做 DOM 叠加（overlay）**，盖在游戏 Canvas 之上。
   - GWT 启动壳（`GwtMinicraft`/`GwtMinicraftEntryPoint`）与 GWT 专属 API（`Screen` 渲染、`Font` 文本、`InputHandler` 键盘、`save/*` 的 Storage/JSON 封装）需要重写或抽换。

> 一句话定位：**把"不可维护的 GWT 编译产物"改写成"TS 游戏逻辑 + Canvas 像素渲染 + Vue 菜单 DOM 叠加"的可维护代码库**。可行性高，风险集中在像素渲染等价性与字体点阵保真，而非架构可行性本身。

---

## 1. 总体结论

**结论：条件可行（Conditional / 可行）。** 建议推进。

| 维度 | 评估 |
|---|---|
| 语言 port（Java→TS） | ✅ 可行。全仓**无任何 `java.io` / `java.awt` 运行时依赖**（仅 `java.util`、`Math`、`java.lang` 语义，且 SpriteSheet 里被注释掉的 `BufferedImage` 代码不在运行路径）。机械性逐行 port，无语言级硬障碍。 |
| 渲染层（Canvas 2D 替代 GWT Canvas） | ✅ 可行。当前 `Game.render()` 本质是**软件像素缓冲**（`screen.pixels` 调色板索引 → 经 `colors[256]` 展开 → `putImageData`）。该算法与 Canvas 2D 的 `ImageData`/`Uint8ClampedArray` **1:1 同构**，等价性可保证（见 §7 风险 1）。 |
| 菜单层（Vue DOM overlay） | ✅ 可行。菜单当前以"绘制到 160×120 缓冲"实现；改 Vue 后，菜单**状态机/输入逻辑**（原 `Menu.tick()`）留在 TS 游戏逻辑层，仅**视图**迁到 Vue 模板。Canvas 背景层继续渲染世界（或暂停背景），Vue 覆盖其上。 |
| GWT 专属 API 抽换 | ✅ 可行，但这是**唯一需要"新写"而非"直译"的部分**（见 §4）。涉及 10 个文件（见 §2）。 |
| 构建 / 工具链 | ✅ 可行。GWT 2.4 + Ant/Gradle 构建 → Vite + TypeScript + Vue 3 构建。彻底脱离 GWT 运行时。 |

**置信度：高（语言 port / 渲染同构 / 菜单拆分）；中（像素逐字节等价需回归测试验证，见 §7）。**

**前提条件（必须满足，否则不建议开工）：**
1. 接受"全量重写"而非"渐进迁移"——因 GWT 产物不可维护，没有半吊子增量路径。
2. 目标浏览器为现代 Chromium 内核（已覆盖桌面、移动、Android TV WebView；IE9 兼容需求**已不存在**，故原 `save-system-plan.md` 里"为 ie9 写纯 Java Base64"的顾虑可丢弃，直接用现代 API）。
3. 保留现有存档**格式兼容性**作为设计约束（新 TS 存档应能与现有 GWT 存档 JSON 形状互通，降低用户迁移成本）——见 §5.3。

---

## 2. 现状资产盘点与可移植性分类

### 2.1 精确分类方法

对 `src/` 全仓做 `grep 'import com.google.gwt'` + 第三方 GWT 库扫描，得到**精确**的 GWT 耦合清单（注意：比任务背景里"约 5 个文件"更多——背景把 `Sound.java` 的第三方 `gwt-voices` 与 `save/*` 四个文件低估了）：

**GWT 耦合文件（必须重写/抽换，共 10 个）：**

| 文件 | 耦合点 | 难度 | 重写策略 |
|---|---|---|---|
| `Game.java` | `extends Composite`（GWT 控件）；`Canvas/Context2d/ImageData/CanvasPixelArray`；`Duration`；`Window`；`Timer`；`Label`；`GamePadButton`(touch) ；`Storage` 经 `save/*` | **L** | 拆为 TS 引擎核心（主循环 `tick/render`、调色板展开 blit、整数缩放、存档/读档钩子、菜单路由）+ 启动 `main.ts`。渲染逻辑直译，GWT 控件/事件 → DOM/Canvas。 |
| `InputHandler.java` | `KeyDownHandler/KeyUpHandler`；`KeyCodes`；绑到 `game.canvas` | **M** | 改为监听 `window` 的 `KeyboardEvent`，`Key` 状态机（presses/absorbs/down/clicked）逻辑直译；键码 → 动作映射表**可配置**（同时覆盖方向键 + 小键盘 + TV 遥控器码，呼应 `tv-feasibility.md` §4.5）。 |
| `gfx/Font.java` | `Canvas/Context2d/ImageData/CanvasPixelArray/TextBaseline`（CJK 运行时栅格化）；`HashMap` | **M** | ASCII `chars` 表 + `renderFrame` + `msg.toUpperCase()` 直译；CJK 运行时栅格化改原生离屏 Canvas（`getImageData` + alpha 阈值 → `Uint8Array(64)`），算法 1:1（见 §4.2）。 |
| `gwt/GwtMinicraft.java` | `RootPanel/FlowPanel/HorizontalPanel/Label/CheckBox/HTML`；`TouchStart/End`；`GamePadButton` | **L（但大部分被 Vue 壳取代）** | "壳"整体由 Vue `App` 根组件 + CSS 替代；移动端虚拟手柄 → Vue 触控组件，派发与 `InputHandler` 相同的动作。核心仅是容器居中 + 缩放同步。 |
| `gwt/GwtMinicraftEntryPoint.java` | `implements EntryPoint`；`Scheduler`；`GWT.setUncaughtExceptionHandler` | **S** | → `src/main.ts` 直接 `new Game().run()`；异常处理器改 `window.onerror`。 |
| `save/SaveStore.java` | `com.google.gwt.storage.client.Storage` | **S/M** | 删 GWT `Storage` 封装 → 原生 `localStorage`；`Base64` 编解码是**纯 Java 逻辑**，直译为 TS（零行为变化，见 §4.4）。 |
| `save/SaveManager.java` | `com.google.gwt.json.client.*` | **M** | 删 GWT JSON 封装 → 原生 `JSON` 对象构造/解析；**字段映射表、typeId 分发、跳过 `Spark`/`Player` 的编排逻辑全部保留直译**（见 §4.4）。 |
| `save/EntityIO.java` | `com.google.gwt.json.client.*` | **M** | 同上；`write/read` 的 typeId 表（1=Player…12=ItemEntity）+ 各类字段映射直译。 |
| `save/ItemIO.java` | `com.google.gwt.json.client.*` | **S/M** | `kind` 分发（resource/tool/furniture/powerglove）直译。 |
| `sound/Sound.java` | `com.allen_sauer.gwt.voices.client.SoundController`（**第三方 GWT 库，非 `com.google.gwt`**） | **S** | → 原生 `new Audio('sound/xxx.mp3').play()` 或 Web Audio。⚠️ 资产错位：`res/` 下是 `.wav`，代码引用 `.mp3`，新构建须统一扩展名（见 §7 风险 6）。 |

**过时开发工具（不 port，直接废弃）：**
- `FakeServer.java`：依赖 `org.mortbay.jetty`（独立 Java 服务，用于本地起 GWT war）。重建后由 Vite dev server / 静态服务取代，**不迁移**。

### 2.2 纯游戏逻辑文件（约 73 个，可直接 port，无 GWT 依赖）

按包分类（每个文件当前均**无** `com.google.gwt` 导入；其渲染方法 `render(Screen)` 仅调用内部 `Screen`/`Font`，随 `Screen` 一起迁移）：

| 包 / 文件 | 类别 | 难度 | 说明 |
|---|---|---|---|
| **gfx/** `Screen.java` | 纯逻辑（核心渲染器） | **L** | 软件像素缓冲：`pixels:int[]`、`render()`、`renderGlyph()`、`overlay()`、`renderLight()`、`clear()`/`setOffset()`。**零 GWT 导入**。port 为 `Uint8ClampedArray` + `ImageData` 同构实现（见 §4.1）。 |
| gfx/ `Color.java`、`Sprite.java` | 纯逻辑（数据/工具） | **S** | `Color.get(a,b,c,d)` 调色板计算、`Sprite` 数据类。直译。 |
| gfx/ `SpriteSheet.java` | 纯逻辑（资源数据） | **S** | `compressedPixels` 大数组（256×256 压缩调色板索引）+ 解压到 `pixels`。直译为 TS `const` + 解压函数；`width/height=256`。 |
| **entity/** `Player.java` | 纯逻辑 | **L** | 最大实体：`tick()`（输入→移动/攻击/使用）、`die()`、`touchItem()`、`changeLevel()` 直译；`render(Screen)` 的精灵绘制 → Canvas2D 绘制。依赖 `Sound`（已迁）。 |
| entity/ `Mob.java`、`Entity.java`、`Inventory.java` | 纯逻辑 | **M** | 基类与共用逻辑（碰撞、击退、拾取、库存增删）。直译。 |
| entity/ `Zombie.java`、`Slime.java`、`AirWizard.java` | 纯逻辑 | **M** | AI `tick()` 直译；`render()` → Canvas2D。 |
| entity/ `Furniture.java` + `Workbench/Anvil/Furnace/Oven/Chest/Lantern.java` | 纯逻辑 | **S/M** | 家具实体 + `createByName` 工厂。直译。 |
| entity/ `ItemEntity.java`、`Spark.java` | 纯逻辑 | **S** | 掉落物 / 瞬态弹幕（`Spark` 不持久化，原逻辑保留）。 |
| entity/particle/ `Particle.java`、`SmashParticle.java`、`TextParticle.java` | 纯逻辑 | **S** | 粒子；`TextParticle` 伤害数字走 ASCII（保留）。 |
| **item/** `Item.java`、`ResourceItem/ToolItem/FurnitureItem/PowerGloveItem.java`、`ToolType.java` | 纯逻辑 | **S/M** | 物品多态 + `getName()` + `renderInventory()` + `interact/actOn`。直译。 |
| item/resource/ `Resource.java`、`FoodResource.java`、`PlantableResource.java` | 纯逻辑 | **S** | 27 个资源常量（中文 `name`）+ `getByName` 工厂。直译；`name` 仅用于显示，零逻辑耦合（已确认）。 |
| **level/** `Level.java` | 纯逻辑 | **L** | 瓦片/数据数组、实体空间哈希、`tick()`、`renderBackground/Sprites/Light`、`fromSave()`（读档绕过生成，已存在）、`add/remove`。直译（`render*` → Canvas2D 同构）。 |
| level/ `LevelGen.java` | 纯逻辑 | **L** | 世界生成（噪声插值 + 校验重试）。用 `Math.random()`（JS 直接等价）。`Tile.*.id` 引用直译。机械但体量大。 |
| level/ `Dimension.java` | 纯逻辑 | **S** | 维度枚举/常量。直译。 |
| level/tile/ `Tile.java` + 18 个子类（`GrassTile`/`RockTile`/`WaterTile`/`TreeTile`/`StairsTile`/`OreTile`/`LavaTile`/`FlowerTile`/`SandTile`/`DirtTile`/`CactusTile`/`FarmTile`/`WheatTile`/`SaplingTile`/`StoneTile`/`HardRockTile`/`HoleTile`/`CloudTile`/`CloudCactusTile`/`InfiniteFallTile`） | 纯逻辑 | **S**（个别 M） | `render()`/`tick()`/`interact/use/hurt`。直译到 Canvas2D 绘制。 |
| **crafting/** `Crafting.java`、`Recipe.java`、`FurnitureRecipe/ResourceRecipe/ToolRecipe.java` | 纯逻辑 | **M** | 合成配方 + `checkCanCraft/deductCost/craft`。直译。 |
| **screen/** `Menu.java`（基类）、`TitleMenu/InstructionsMenu/AboutMenu/DeadMenu/WonMenu/CraftingMenu/InventoryMenu/ContainerMenu/LevelTransitionMenu/ListItem.java` | 纯逻辑（**Vue 候选**） | **M**（逻辑）/ **L**（视图） | **逻辑层**：`tick()` 输入/状态机、`renderItemList` 等直译为 TS。**视图层**：`render(Screen)`（绘制到缓冲）→ 改为 Vue 组件 DOM。见 §3、§4.3。 |
| **root** `Dimension.java`（已计）、`Game.java`/`InputHandler.java`（已计 GWT） | — | — | — |

**数量核对**：83 个 `.java` − 10 个 GWT 耦合 = **73 个纯逻辑文件**（与任务背景"约 70"吻合；背景"约 5 个 GWT"偏低，实为 10）。`FakeServer.java` 单独废弃。

---

## 3. 目标架构

### 3.1 TS + Vite + Vue 项目结构

```
minicraft-html5/                # 新仓库根（替代 GWT 工程）
├─ index.html                 # 仅含 <div id="app"> + <canvas id="game">
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
├─ src/
│  ├─ main.ts               # 启动（替代 GwtMinicraftEntryPoint）：建 Game、挂 Vue App
│  ├─ engine/              # 渲染 + 输入 + 存储（替代 gfx/ + InputHandler + save/）
│  │  ├─ Screen.ts         # 软件像素缓冲（替代 gfx/Screen.java，零 GWT）
│  │  ├─ SpriteSheet.ts    # compressedPixels 常量 + 解压（替代 gfx/SpriteSheet.java）
│  │  ├─ Color.ts / Sprite.ts
│  │  ├─ Font.ts          # ASCII 表 + CJK 离屏栅格化（替代 gfx/Font.java）
│  │  ├─ Renderer.ts      # 持有 <canvas>，每帧把 Screen 缓冲 blit 到 ImageData
│  │  ├─ InputHandler.ts  # KeyboardEvent → 动作（替代 InputHandler.java，可配置键码）
│  │  ├─ Storage.ts       # localStorage 封装 + 纯 Base64 编解码
│  │  └─ SaveManager.ts / EntityIO.ts / ItemIO.ts  # 序列化（直译 save/ 逻辑）
│  ├─ game/               # 游戏逻辑 port（替代 entity/ item/ level/ crafting/ + Game 核心）
│  │  ├─ Game.ts          # 主循环 tick/render、调色板、缩放、菜单路由、存档钩子
│  │  ├─ entity/ item/ level/ crafting/   # 逐文件 port（含 Dimension/Particle）
│  │  └─ state.ts        # 暴露给 Vue 的响应式游戏状态（当前菜单、选中项、HUD 值）
│  ├─ ui/                 # Vue 3 菜单层（DOM overlay，替代 screen/ 的视图）
│  │  ├─ App.vue          # 根：定位 <canvas> + 叠加菜单层 + 居中/ letterbox 容器
│  │  ├─ menus/ TitleMenu.vue / InventoryMenu.vue / CraftingMenu.vue
│  │  │        / DeadMenu.vue / WonMenu.vue / InstructionsMenu.vue / AboutMenu.vue / ContainerMenu.vue
│  │  ├─ Hud.vue         # 血量/体力条（原 renderGui 画在缓冲，可保留在 canvas 或迁 Vue）
│  │  └─ TouchPad.vue    # 移动端虚拟手柄（替代 GwtMinicraft.GamePadButton）
│  └─ i18n/               # 文案资源（替代原硬编码中文串，见 §5.1）
│     ├─ zh-CN.ts          # 菜单/物品/资源中文串（源自 design/i18n/zh-CN-strings.md）
│     └─ index.ts          # t(key) 函数
└─ public/
   ├─ icons.png / sprites...（若改资源管线；当前 SpriteSheet 内嵌数据，可不依赖 PNG）
   └─ sound/ *.mp3（统一扩展名，见 §7 风险 6）
```

### 3.2 模块边界

- **`engine/`**：不依赖 Vue，不依赖游戏逻辑的具体类型（仅 `Screen` 缓冲契约）。可被独立单测（headless canvas / 像素哈希）。
- **`game/`**：纯 TS 逻辑，port 自 Java。依赖 `engine/Screen` 绘制契约 + `engine/InputHandler` 动作，不 import Vue。每个 `tick()` 是确定性纯逻辑（除 `Math.random` 世界生成外）。
- **`ui/`**：Vue 组件。通过 `game/state.ts` 的响应式对象**只读**游戏状态、`emit` 用户意图回调（如"开始游戏""选择配方"）给 `game/`。Vue **不持有游戏状态**，只渲染 + 派发动作（遵循"ui 不持有游戏状态"边界）。
- **`main.ts`**：组装 `Renderer`（绑 canvas）+ `Game`（逻辑）+ `Vue App`（overlay）。

### 3.3 Canvas 背景层 与 Vue 菜单 overlay 共存 & 事件路由

```
┌─────────────────────────────────────────────┐
│  #app (position:relative, flex 居中, 黑底)   │
│  ┌───────────────────────────────────┐    │
│  │ <canvas id="game">              │    │  ← engine/Renderer 绘制
│  │  160×120 绘制缓冲              │    │    世界 + HUD（始终渲染）
│  │  CSS: width=160*scale px       │    │    image-rendering:pixelated
│  │       height=120*scale px      │    │
│  └───────────────────────────────────┘    │
│  ┌───────────────────────────────────┐    │
│  │ <div class="menu-overlay">    │    │  ← Vue 菜单层（绝对定位覆盖）
│  │   <TitleMenu v-if="menu==='title'">   │  │    事件由 Vue 组件内 @click/@keydown
│  │   ...                            │    │    处理，再 emit 给 game
│  └───────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**事件路由规则：**
1. **键盘**：`InputHandler` 在 `window` 上监听 `keydown/keyup`（不绑 canvas，呼应 `tv-feasibility.md` §4.3 焦点要求）。游戏进行中（无菜单）→ 直接驱动 `Game.tick()` 的移动/攻击。有菜单时 → 同一 `InputHandler` 仍捕获按键，但 `Game` 把按键转交当前菜单的 `tick()`（原 `Game.tick()` 已有 `if(menu!=null) menu.tick()` 结构，直译）。**菜单 UI 也可用鼠标点击**（Vue 按钮），点击 → `emit('select', idx)` / `emit('confirm')` → 调 `game` 对应方法。
2. **鼠标**：仅 Vue 菜单层消费（按钮、列表点击）；游戏世界是键盘/触控驱动，canvas 不拦鼠标（除非需点击聚焦，见 §4.3）。
3. **触控**：`TouchPad.vue` 按钮 `touchstart/touchend` → 派发与键盘相同的 `InputHandler` 动作（`up/down/left/right/attack/menu`）。等价于原 `GamePadButton` 调 `game.input.toggle(code, pressed)`。
4. **缩放/居中**：`Renderer` 持有 canvas，CSS 尺寸由 `computeScale()`（视口整数倍）驱动；容器居中由 `#app` 的 flex + `margin:auto` 承担（替代 `GwtMinicraft._gameHolder`）。

---

## 4. 移植策略详解

### 4.1 Java → TS：类型 / 集合映射

| Java | TypeScript | 注 |
|---|---|---|
| `int`/`byte`/`short` | `number`（必要时 `| 0` 或 Uint8Array） | 像素/瓦片索引用 `number` 即可；`byte[] tiles/data` 建议 `Uint8Array`（与 `ImageData.data` 同构，省拷贝）。 |
| `int[] pixels` | `Uint8ClampedArray` / `Int32Array` | `Screen.pixels` 调色板索引用 `Uint8ClampedArray`（0..255 自动钳制，等价于 GWT `CanvasPixelArray.set` 的钳制语义，见 §7 风险 1）。 |
| `ArrayList<T>` / `List<T>` | `T[]` / `Array` | `add/get/remove/size` → 原生数组 + `.push/.length/.splice`；热路径（实体列表遍历）优先数组避免分配。 |
| `HashMap<K,V>` / `Map` | `Map<K,V>` 或对象字面量 | `Font` 的 `cjkCache: Map<Integer,int[]>` → `Map<number, Uint8Array>`；`Resource.getByName` 工厂表 → `Map<string, Resource>` 或静态记录。 |
| `Comparator` / `Collections.sort` | `Array.sort((a,b)=>...)` | `Level.sortAndRender`、`CraftingMenu` 配方排序直译。 |
| `Random` / `Math.random()` | `Math.random()`（JS 原生等价） | `LevelGen` 用 `Math.random`，**直译即行为等价**（非逐字节确定，但统计分布一致，可接受；若要可复现世界，可引入 seedable PRNG 替代，列为可选增强）。 |
| `String` / `char` | `string` / `string`（JS  UTF-16 代码单元） | `msg.toUpperCase()`、`chars.indexOf(c)`、`msg.length()`（BMP 字符 `length()==字形数`）全部直译，中文 8px 等宽数学不变（见 §5.1）。 |
| `instanceof` | `instanceof` | 实体/物品多态分发（`EntityIO`/`ItemIO`/`Player.use`）直译。 |
| `enum`（无，原仓无 Mode 枚举） | — | 游戏状态由 `Game.menu` 引用 + `state.ts` 的 `currentMenu` 字符串表达。 |

**可测试性提升**：Java 无接口约束处，TS 用 `interface`（如 `IRenderable { render(s:Screen): void }`、`IEntity`）强化契约；`game/` 逻辑层不依赖 DOM，可在 Node 下单测（见 §7 回归）。

### 4.2 `Screen` / `Font` 的 Canvas 2D 重写（含 CJK 点阵保真）

**Screen（软件像素渲染，等价性核心）：**
- 现状 `Game.render()`（已读 `Game.java:432-507`）：
  1. 世界/实体/光照画进 `screen.pixels`（调色板**索引** 0..255）；
  2. 双层循环 `for y/for x`：若 `cc < 255`，查 `colors[cc]`（256 色调色板，由 `init()` 的 6×6×6 立方插值生成）→ 拆 R/G/B → 写入 `pixelArray`（GWT `CanvasPixelArray`，4 字节/像素）→ `context.putImageData(imageData,0,0)`。
- **TS 同构实现**：`Screen.pixels: Uint8ClampedArray` 存索引；`Renderer.blit()` 做完全相同的展开——`Uint8ClampedArray` 的自动钳制（>255→255, <0→0）精确等价于 GWT 对越界写入的钳制。最终 `ctx.putImageData(imageData, 0, 0)` 到 **160×120** 的 canvas 上下文。
- **结论**：这套"索引缓冲 + 调色板展开 + putImageData"是纯算法，**与 GWT 运行时无关**，Canvas 2D 提供位级一致的 `ImageData`。等价性可按 §7 风险 1 做像素哈希回归。

**Font（ASCII + CJK 运行时栅格化）：**
- **ASCII 部分（直译，零风险）**：`chars` 字符串、`draw(msg)` 的 `msg.toUpperCase()` + `chars.indexOf(c)` + `screen.render(tile+30*32)`、`renderFrame()` 边框绘制，全部逐行直译。`Font.draw` 仍按 `msg.length()*8` 定位，中文 8px 等宽约束不变（见 §5.1）。
- **CJK 部分（1:1 算法 port）**：现状用 GWT 离屏 `Canvas` + `getImageData` + alpha 阈值 → 8×8 单色位图（`on=1`）缓存于 `Map<Integer,int[]>`。TS 原生等价：
  ```ts
  const raster = document.createElement('canvas');   // 或 OffscreenCanvas
  raster.width = raster.height = 16;                 // SRC=16 超采样
  const rctx = raster.getContext('2d')!;
  function rasterize(ch: string): Uint8Array {          // 返回 64 长 8×8 位图
    rctx.clearRect(0,0,16,16);
    rctx.fillStyle = '#fff';
    rctx.font = '16px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC","WenQuanYi Micro Hei",sans-serif';
    rctx.textBaseline = 'top';
    rctx.fillText(ch, 0, 0);
    const img = rctx.getImageData(0,0,16,16).data;
    const glyph = new Uint8Array(64);
    for (let y=0;y<8;y++) for (let x=0;x<8;x++) {
      let sum=0,cnt=0;
      for (let sy=0;sy<2;sy++) for (let sx=0;sx<2;sx++) {
        const a = img[((y*2+sy)*16 + (x*2+sx))*4 + 3];   // alpha 通道
        sum += a; cnt++;
      }
      glyph[x+y*8] = (sum/cnt > 96) ? 1 : 0;          // 阈值二值化
    }
    return glyph;
  }
  ```
  `draw()` 对 `chars.indexOf(c) >= 0` 走 ASCII 路径，否则 `getCJK(c)`（带 `Map<number,Uint8Array>` 缓存）→ `screen.renderGlyph(glyph, col)`（与 `Screen.render` 相同着色公式）。**算法与现 GWT 版本逐行对应**，保真度一致（8px 复杂汉字笔画压缩属设计已接受的硬约束，见 `i18n-font-plan.md` §4 风险 1）。

### 4.3 InputHandler → KeyboardEvent

- `Key` 类（`presses/absorbs/down/clicked` + `toggle()/tick()`）逻辑**直译**为 TS（状态机完全保留，这是确定性输入语义的核心）。
- 事件绑定：GWT `KeyDownHandler/KeyUpHandler` 绑 `game.canvas` → TS 改 `window.addEventListener('keydown'/'keyup', ...)`（`preventDefault()` 保留，阻断页面滚动/返回，呼应 `tv-feasibility.md` §4.4）。
- **键码 → 动作映射表抽成可配置数据**（替代硬编码 `toggle()` 的 if 链）：
  ```ts
  const KEYMAP: Record<string, keyof InputState> = {
    'ArrowUp':'up','KeyW':'up','Numpad8':'up', '8':'up',
    'ArrowDown':'down','KeyS':'down','Numpad2':'down','2':'down',
    'ArrowLeft':'left','KeyA':'left','Numpad4':'left','4':'left',
    'ArrowRight':'right','KeyD':'right','Numpad6':'right','6':'right',
    'Space':'attack','ControlLeft':'attack','KeyC':'attack','0':'attack','45':'attack',
    'Tab':'menu','AltLeft':'menu','KeyX':'menu','Enter':'menu',
    // TV 遥控器（tv-feasibility §4.5）：同一动作多键码覆盖
    '19':'up','20':'down','21':'left','22':'right',     // DPAD
    '23':'attack','66':'attack',                        // DPAD_ENTER/ENTER → 同时 attack+menu
    '4':'menu','8':'menu','27':'menu',                    // BACK, 兼容多形态
    '82':'menu',                                    // MENU
  };
  ```
- **TV 预留**：`toggle()` 中对 OK（23/66）同时 `attack.toggle + menu.toggle` 的双语义、Back→menu 路由，已在 `tv-feasibility.md` §4.5 给出伪码，直译即可；焦点管理在 `App.vue`/`main.ts` 启动即聚焦（替代 `renderFocusNagger` 的"点击聚焦"提示，TV 无鼠标，见 `tv-feasibility.md` §4.3）。

### 4.4 save/* → 原生 localStorage + JSON

- **`SaveStore`**（GWT `Storage` → 原生）：
  - `hasSave()/save(str)/load()/clear()` 直译为 `localStorage.getItem/setItem/removeItem` + `try/catch`（隐私模式/配额满静默失败，保留原 `saveGame()` 的健壮语义）。
  - **`base64Encode/base64Decode` 是纯 Java 逻辑，零 GWT 依赖**——直接逐行直译为 TS（行为 100% 一致）。因目标为现代浏览器，`atob/btoa` 也可用，但保留原纯 codec **零风险、最稳**（且与原 GWT 存档字节级兼容）。
- **`SaveManager` / `EntityIO` / `ItemIO`**（GWT `JSON*` → 原生 `JSON`）：
  - **编排逻辑、字段映射表、typeId 分发、跳过 `Spark`、重建时 `Player` 不重塞初始物品（`seedStartingItems=false`）、`Level.fromSave` 绕过生成**——全部直译（这些已是纯逻辑，见 `save-system-plan.md` §3/§6）。
  - 仅把 `new JSONObject().put(...)` → 字面量对象 `{schemaVersion:1, gameTime, ...}`；`JSONParser.parseStrict(json).get("x").isNumber().doubleValue()` → `JSON.parse(json).x as number`。
  - **存档互通性**：保持相同 JSON 形状（键名、Base64 瓦片、`typeId` 表）→ 现有 GWT 存档可被 TS 版读取，反之亦然（schemaVersion=1 不变）。这是强迁移卖点（见 §5.3）。

---

## 5. 现有三项改造如何迁移到新架构

### 5.1 汉化（i18n-font-plan + zh-CN-strings）：→ Vue 文案 + i18n 资源

- **菜单/物品中文串**：当前硬编码为 `screen/*`、`item/*`、`entity/*` 里的 `name` 字面量（已读 `TitleMenu.java:17/71`、`CraftingMenu.java:66-68`、`Resource.java` 21 个中文名等）。新架构：
  - 游戏逻辑层保留**内部标识**（如 `Resource` 可用英文 `id` 或保留 `name` 作 key），显示名抽到 `src/i18n/zh-CN.ts`（`t('menu.title.start')` 等），复用 `design/i18n/zh-CN-strings.md` 的全量映射表。
  - **渲染从 Canvas 文本改为 Vue DOM 文本**：菜单中文不再依赖 `Font` 点阵——Vue 用浏览器原生字体渲染中文（清晰、可选字号），`Font` 的 CJK 栅格化仅保留给**仍画在 canvas 上的零星文本**（如 `renderFocusNagger` 的"点击聚焦！"；若也迁 Vue 则可整体删掉 CJK 栅格化，进一步简化——列为可选优化）。
- **`msg.length()*8` 定位数学保持有效**：Vue 用 flex/绝对定位布局，不再依赖 8px 等宽像素数学；但**若保留 canvas 文本**（HUD/聚焦提示），`Font` 的 8px 等宽约束仍成立（已核实 `Resource.name ≤4` 汉字、`ToolItem` 拼接去空格，见 `i18n-font-plan.md` §3.3）——保真度无回归。
- **ASCII 保留项**（伤害数字 `TextParticle`、`3m 12s` 计时串、`>` `<` 光标、`Minicraft` 等专名）：DOM 中本就是文本，零处理；若仍在 canvas 上则由 `Font.chars` ASCII 路径覆盖。

### 5.2 大屏自适应（responsive-display）：→ 容器/CSS 整数缩放 + image-rendering:pixelated

- 现状已落地的 `Game.computeScale()` / `applyDisplaySize()` / `getDisplayWidth/Height()` + `Window` resize 监听 + `image-rendering:pixelated`——**算法完全可移植**：
  - `computeScale()`：视口整数倍 `scale = max(1, floor(min(vw/160, vh/120)))`（移动端保底 2 倍），直译。
  - 渲染缓冲固定 **160×120**（`<canvas width=160 height=120>` 属性），仅改 **CSS 尺寸** `width:160*scale px; height:120*scale px` + `image-rendering:pixelated`（保留 `-moz-`/`-webkit-`/`ms-` 回退，见 `responsive-display.md` §3.5）。
  - `resize` 监听 → `ResizeObserver` 或 `window.resize` → 重算 `scale` → 更新 CSS（不重分配缓冲，无卡顿）。
  - 居中/letterbox：`#app { display:flex; background:#000 }` + `.menu-host { margin:auto }`（替代 `GwtMinicraft._gameHolder` 的 30px 居中 + `appRoot` 类）。
- **与现有 GWT 实现零语义差异**，仅语言/API 替换；TV 的"固定 9 倍 1080p"是 `computeScale` 在固定视口下的特例（见 `tv-feasibility.md` §3.2），无需另起炉灶。

### 5.3 存档（save-system-plan）：→ 原生 localStorage，序列化逻辑直接搬

- **逻辑直接搬**（见 §4.4）：`schemaVersion`、`gameTime`、`currentLevel`、5 层 ×（`tiles`/`data` Base64 + `entities[]`）、`player` + `inventory` + `attackItem/activeItem`、各实体 `typeId`、各物品 `kind`——字段映射表原样保留。
- **GWT API 抽换**：`Storage`→`localStorage`，`com.google.gwt.json.client.*`→原生 `JSON`，`Base64` 纯 codec 直译。
- **互通红利**：JSON 形状不变 → **旧 GWT 存档文件可无缝载入新 TS 版**（反之亦然），用户零数据损失。这是相对"简单重写"的显著优势，建议在 ADR 中记为决策收益。
- **保留的健壮性**：`Spark` 不持久化、`Player` 读档不重塞初始物品、`Level.fromSave` 绕过 `LevelGen`、隐私模式/配额 `try/catch`、定时自动存（每 1800 tick≈30s，`menu==null` 时）、关闭页 `beforeunload` 存盘——全部直译。

---

## 6. 文件级工作量估算

> ⚠️ **以下为粗略量级（order-of-magnitude），非交付承诺**。基于"机械 port + 必要重写"的乐观估计；未含联调/真机/文档。S≈0.5 人日，M≈1–2 人日，L≈3–5 人日。

| 包 / 组 | 文件数 | 难度分布 | 估人日 |
|---|---|---|---|
| **GWT 耦合重写** | 10 | Game(L) / GwtMinicraft(L→多为 Vue 壳) / Font(M) / InputHandler(M) / SaveManager(M) / EntityIO(M) / SaveStore(S-M) / ItemIO(S-M) / Sound(S) / EntryPoint(S) | **≈ 21** |
| **gfx 纯逻辑** | 5 | Screen(L) / SpriteSheet(S) / Color(S) / Sprite(S) / （Font 已计） | **≈ 3** |
| **entity 纯逻辑** | ~17 | Player(L) / Mob+Entity+Inventory(M) / Zombie+Slime+AirWizard(M) / Furniture 系(S-M) / ItemEntity+Spark(S) / particle×3(S) | **≈ 10** |
| **item 纯逻辑** | ~10 | Item+ResourceItem+ToolItem+FurnitureItem+PowerGlove(M) / ToolType(S) / resource×3(S) | **≈ 3** |
| **level 纯逻辑** | ~22 | Level(L) / LevelGen(L) / Dimension(S) / Tile+18 子类(S，个别 M) | **≈ 8** |
| **crafting 纯逻辑** | 5 | Crafting+Recipe+Furniture/Resource/ToolRecipe(M/S) | **≈ 2** |
| **screen 逻辑 port** | 11 | 各 `tick()` 直译（M，视图另计） | **≈ 3** |
| **Vue 菜单视图层**（screen 的 `render` 改写） | 11 | Title/Inventory/Crafting/Dead/Won/Instructions/About/Container + HUD + TouchPad + App 根 | **≈ 8** |
| **i18n 资源抽取 + 大屏 CSS + TV 输入预留 + Vite/TS 工程脚手架 + CI/测试骨架** | — | 跨切面 | **≈ 12** |
| **合计（粗略量级）** | | | **≈ 60 人日** |

**折算**：
- 单人全职：≈ **12 周（3 个月）**（含联调 buffer）。
- 2 人小队（1 逻辑 port + 1 渲染/Vue）：≈ **6–7 周**。
- 此为**量级非承诺**；阶段 0 垂直切片跑通后，可用实测速率重估阶段 1–4。

---

## 7. 风险与未知项

| # | 风险 / 未知项 | 等级 | 说明 / 缓解 |
|---|---|---|---|
| 1 | **Canvas 2D 与现有 ImageData 软件渲染的等价性** | 中（可控） | 现状是 GWT `CanvasPixelArray` 逐字节写 `ImageData`；TS 用 `Uint8ClampedArray` + `putImageData`。**算法同构**，但需验证：`Uint8ClampedArray` 对负/越界写入的钳制是否逐字节等价于 GWT 行为；`colors[256]` 调色板生成（`Game.init()` 的 6×6×6 立方插值）是否逐值一致。**缓解**：像素哈希回归测试（渲染已知帧 → 比对 golden `Uint8ClampedArray` 哈希，见 §7 回归）。 |
| 2 | **字体点阵保真（CJK 8×8）** | 中 | 跨浏览器系统 CJK 字体度量差异，导致 `getImageData` alpha 阈值化后 8×8 位图与现 GWT 版**不完全逐像素一致**（尤其笔画密集汉字）。属"观感等价"非"字节等价"。**缓解**：(a) 统一字体栈（已指定 YaHei/PingFang/Noto/WenQuanYi）；(b) 若菜单全面 Vue 化，canvas CJK 文本大幅减少，风险面收窄；(c) 复杂汉字笔画压缩本就是 8px 硬约束，设计已接受。 |
| 3 | **GWT 特定 API 行为差异** | 低 | 绝大多数已规避（纯逻辑 port）。残留点：`Duration.currentTimeMillis()` → `performance.now()`/`Date.now()`（主循环计时，`Game.Looper` 用 `msPerTick=1000/60`，直译即可）；`Window.scrollTo(0,1)`（移动端藏地址栏）→ `window.scrollTo` 直译；GWT `Timer.schedule(2)`（2ms 轮询）→ `requestAnimationFrame` 或 `setTimeout(…, 2)`。无功能性差异。 |
| 4 | **TV / 遥控器输入未来适配** | 中（已研究） | `tv-feasibility.md` 已给出完整映射 + 焦点/返回键策略。本架构在 `InputHandler` 预留**可配置键码表 + 启动自动聚焦**，使 TV 适配成为"加一组键码 + APK 壳"的增量，而非重构。真机 keyCode 差异仍需真机校验（报告已强调）。 |
| 5 | **构建 / 依赖** | 低 | 脱离 GWT 2.4 + Ant/Gradle，改 Vite + TS + Vue 3 + （可选）`canvas`(node 端 headless 测试) / Playwright。依赖面大幅简化（去掉 GWT SDK、gwt-voices、Jetty）。需新建 `package.json` / `vite.config.ts` / `tsconfig.json`，并把 `res/`（音频/图标）与 `war/Minicraft.css` 的样式迁到新工程。 |
| 6 | **音频资产错位** | 低 | `Sound.java` 引用 `*.mp3`，但 `res/` 下是 `*.wav`。新构建需**统一扩展名**（提供 mp3 或改 `.wav` 引用）。同时原 `gwt-voices` 的 `MIME_TYPE_AUDIO_MPEG_MP3` 改为原生 `Audio` 即可。 |
| 7 | **世界生成非确定性** | 低 | `LevelGen` 用 `Math.random`，port 后世界不逐字节复现（统计一致）。若需"同种子同世界"（如分享存档），需引入 seedable PRNG 替代 `Math.random`——列为可选增强，不影响可行性。 |
| 8 | **回归测试策略（最关键保障）** | 中 | 见下。 faithful port 的最大风险是"看起来跑通但像素/逻辑悄悄偏离"。必须用测试守住等价性。 |

**回归测试策略：**
- **像素等价**：用 `canvas`(node-canvas) 或 Playwright 渲染固定帧（如标题菜单、某一 game tick），对 `Screen` 缓冲 / `ImageData` 做**哈希比对** golden 图（覆盖风险 1、2）。
- **存档往返**：`SaveManager.toJson` → `fromJson` 往返测试，断言实体/物品/瓦片逐字段相等；并加载一份**真实 GWT 存档样本**验证互通（风险 3 的存档侧、§5.3 红利）。
- **纯逻辑单测**：`Level.tick`、`Player.attack/use`、`Recipe.craft`、`Color.get`、`SpriteSheet` 解压等，在 Node 下无 DOM 跑（要求 `game/` 不依赖 DOM——见 §3.2 边界）。
- **输入状态机**：`InputHandler.Key` 的 `presses/absorbs/down/clicked` 时序单测（确保确定性输入语义与现版一致）。
- **CI**：GitHub Actions 跑 `tsc --noEmit` + `vitest`（单元 + 像素哈希 + 存档往返），合并门禁。

---

## 8. 分阶段计划（建议）

> 每阶段末都有可运行/可验证产出；阶段间可独立回滚。

**阶段 0 —— 垂直切片（验证端到端可行性，最高优先级）**
- [ ] 起 Vite+TS+Vue 工程脚手架（`package.json`/`vite.config.ts`/`tsconfig.json`/`index.html`）。
- [ ] `engine/`：`Screen`（同构像素缓冲）+ `SpriteSheet`（数据直译）+ `Color` + `Renderer`（canvas + `putImageData`）+ `InputHandler`（KeyboardEvent + 键码表）。
- [ ] `game/` 最小核：`Game.ts` 主循环（tick/render/调色板展开）、`Player` + `Level` + `LevelGen` + 若干 `Tile` 子类 + `Entity`/`Mob` 基础，跑通**核心循环**。
- [ ] Vue：`App.vue` 根（canvas + 居中容器）+ **1 个菜单（TitleMenu）走 Vue overlay**，验证"canvas 背景 + Vue 菜单 + 键盘/鼠标事件路由"全链路。
- [ ] **像素哈希回归**首次落地（标题帧 golden 比对）。
- ✅ 验收：浏览器打开 → 世界渲染 + 角色可移动攻击 + 标题菜单可用（Vue）。

**阶段 1 —— 全逻辑 port**
- [ ] 补齐全部 `entity/`（Zombie/Slime/AirWizard/Furniture 系/ItemEntity/Spark/particle）、`item/`（含 resource 系）、`level/tile/*` 全子类、`crafting/`、`Dimension`。
- [ ] `Screen.renderGlyph` + `Font`（ASCII + CJK 栅格化）补全，HUD（血量/体力）渲染。
- [ ] 游戏可完整游玩（生成/战斗/合成/上下楼/死亡/胜利）。
- ✅ 验收：玩法与现 GWT 版功能对等；像素哈希全场景绿。

**阶段 2 —— 菜单全 Vue 化**
- [ ] 其余 10 个菜单（Inventory/Crafting/Dead/Won/Instructions/About/Container/LevelTransition/ListItem）+ HUD + 移动端 `TouchPad.vue` 全部从 `screen/*.render(Screen)` 迁到 Vue 组件。
- [ ] `game/state.ts` 暴露响应式菜单状态/选中项，`ui/` emit 意图回调。
- [ ] （可选优化）菜单全 Vue 后，评估是否删除 canvas CJK 栅格化（仅留 ASCII 路径）。
- ✅ 验收：所有菜单为 DOM，交互（键盘+鼠标+触控）正常，游戏状态不被 Vue 持有。

**阶段 3 —— 汉化 / 大屏 / 存档迁移**
- [ ] 汉化：中文串抽到 `i18n/zh-CN.ts`（复用 `zh-CN-strings.md`），逻辑层用 `t(key)`；保留 ASCII 专名/数字。
- [ ] 大屏：`computeScale` + CSS 整数缩放 + `image-rendering:pixelated` + 居中 letterbox（直译 `responsive-display.md`）。
- [ ] 存档：`Storage`→localStorage、`save/*` JSON 逻辑直译、保留 Base64 codec；**验证旧 GWT 存档互通**。
- ✅ 验收：中文全量显示、大屏锐利居中、存档写入/读取/自动存/关闭存全通且互通。

**阶段 4 —— TV 输入预留（呼应 tv-feasibility.md）**
- [ ] `InputHandler` 键码表追加遥控器码（19–23/4/8/27/82 等，多码同动作）；启动自动聚焦；`preventDefault` 全键位覆盖；Back→menu 路由。
- [ ] （正式形态）Android TV APK 壳（WebView 加载本地构建）+ Leanback banner + `requestFocus` + `mediaPlaybackRequiresUserGesture=false` + `onPause/Resume` 恢复。
- [ ] 真机（Android 9/11/12 各一款）校验 keyCode + 焦点 + 音频 + Home 键恢复。
- ✅ 验收：电视遥控器完整可玩，中文菜单清晰，输入框获焦即响应。

---

## 9. 引用 / 依据（已读文件清单）

**源码（全部 `src/`，共 83 个 `.java` + `FakeServer.java`）：**
- 入口/循环/核心：`Game.java`、`InputHandler.java`、`Dimension.java`
- 渲染/字体（GWT 耦合核心）：`gfx/Screen.java`、`gfx/Font.java`、`gfx/SpriteSheet.java`、`gfx/Color.java`、`gfx/Sprite.java`
- 启动/模块：`gwt/GwtMinicraft.java`、`gwt/GwtMinicraftEntryPoint.java`、`com/mojang/Minicraft.gwt.xml`
- 存档：`save/SaveManager.java`、`save/SaveStore.java`、`save/EntityIO.java`、`save/ItemIO.java`
- 玩家/世界：`entity/Player.java`、`level/Level.java`、`level/levelgen/LevelGen.java`
- 菜单（Vue 候选）：`screen/Menu.java`、`screen/TitleMenu.java`、`screen/CraftingMenu.java`（其余 Instructions/About/Dead/Won/Inventory/Container/LevelTransition/ListItem 经 `grep` 确认同属纯逻辑、无 GWT 导入）
- 音频：`sound/Sound.java`（第三方 `gwt-voices` 耦合）
- 资产：`res/*.wav`、`war/Minicraft.css`（经 `responsive-display.md` 引用）
- 分类依据：`grep 'import com.google.gwt'` 精确锁定 9 文件 + 第三方 `gwt-voices` 扫描锁定 `Sound.java`，合计 10 个 GWT 耦合文件。

**现有改造文档（研究其迁移路径）：**
- `docs/architecture/save-system-plan.md`（存档：ADR-1/2/3/4、字段映射表、typeId 表、§8 风险、阶段清单）
- `docs/architecture/i18n-font-plan.md`（汉化字体管线：ADR-1/2/3 运行时栅格化、§2 字库覆盖校验、§3 改动清单）
- `docs/architecture/responsive-display.md`（大屏自适应：`computeScale`/`applyDisplaySize`、CSS letterbox、`image-rendering` 回退链）
- `docs/architecture/tv-feasibility.md`（TV 迁移：运行环境、整数缩放、遥控器键码表 §4.5、焦点管理 §4.3、APK 壳）
- `design/i18n/zh-CN-strings.md`（全量中文串映射：菜单/资源/工具/家具/专名保留 ASCII）

**结论复述（给决策者的 30 秒版）：** GWT 产物已是 JS，问题在不可维护；本报告主张全量重写——游戏逻辑 port 成 TS、渲染用原生 Canvas 2D（与现软件像素算法同构）、菜单用 Vue DOM 叠加。10 个 GWT 耦合文件需重写（主要是 `Game`/`InputHandler`/`Font`/`save/*`/`Sound` 与启动壳），其余 73 个纯逻辑文件机械 port。三项既有改造（汉化/大屏/存档）均有清晰迁移路径，且存档可与旧版互通。风险集中在像素逐字节等价（可用哈希回归守住）与 CJK 点阵观感（可收窄），**整体条件可行，建议推进**，首步为阶段 0 垂直切片。

---

*（本报告仅做研究与写作，未对 `src/` 下任何源码做出修改。）*
