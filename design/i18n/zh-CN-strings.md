# Minicraft-HTML5 中文本地化字符串映射文档（zh-CN）

> 本文档由设计/文案专家（design-strategist）产出，供 engineering-lead 做代码级字符串替换与字体管线改造使用。
> 所有「建议中文」均为**显示用文案**，**未改动任何源码**；具体替换动作与字体管线由 engineering-lead 执行。
> 源文件已于 2025 年 7 月 20 日逐行核对（见各条「位置」列）。

---

## 1. 翻译原则与风格

1. **简洁优先**：像素屏内分辨率 160px 宽 = 约 20 个 8px 字符；中文点阵每字约占 8px，故**单行中文建议 ≤ 18 字**，避免溢出。所有菜单/物品名均按此约束设计。
2. **口语、贴合像素调性**：用短词、短句、感叹号营造 8-bit 游戏的直白感（如「你死了！呜！」「你赢了！耶！」）。
3. **品牌/专有名词保留 ASCII**：游戏名 `Minicraft`、赛事 `Ludum Dare`、技术栈 `HTML5/GWT`、移植者 `Chi Hoang` 等保留原文，避免音译失真（仅作者 `Markus Persson` 给出音译备选）。
4. **资源/物品名尽量短（≤4 汉字）**：受 `Resource` 构造函数 `name.length() <= 6` 硬限制约束（见 §3、§5），全部短名均 ≤4 汉字，安全通过。
5. **保留 ASCII 不翻译**：伤害数字（`TextParticle`）、分数、计时（`3m 12s` 类，见 §2 备注）、`>` `<` 光标符号（见 §2）。
6. **标点用全角**：游戏内中文文案使用全角标点（，。：！（）·），但需确保点阵字库包含这些字形（见 §5 注意点 1）。

---

## 2. 界面 / 菜单文本表

> 列：位置（文件:行 / 方法）｜原文｜建议中文｜备注（行宽 / 保留 ASCII）

### 2.1 标题菜单 — `screen/TitleMenu.java`
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `TitleMenu.java:11` `options[0]` | `Start game` | `开始游戏` | 4 字；居中用 `msg.length()*8`，中文 8px/字对齐 |
| `TitleMenu.java:11` `options[1]` | `How to play` | `玩法说明` | 4 字 |
| `TitleMenu.java:11` `options[2]` | `About` | `关于` | 2 字 |
| `TitleMenu.java:53` 选中包裹符 `"> " + msg + " <"` | `> ` / ` <` | **保留 ASCII** `>` `<` | 光标符号；不翻译（约束 5）。仅作说明：选中项渲染为 `> 开始游戏 <` |
| `TitleMenu.java:59` 底部提示 | `(Arrow keys,X and C)` | `（方向键 X C）` | 9 字形，占 9×8=72px ≪ 160px；保留 ASCII 的 `X` `C`。详细操作见「玩法说明」屏。备选更完整版：`（方向键移动 X背包 C攻击）`（14 字，仍安全） |

### 2.2 玩法说明 — `screen/InstructionsMenu.java`（每行固定 y 行，中文无宽度问题）
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `InstructionsMenu.java:23` | `HOW TO PLAY` | `玩法说明` | 标题；4 字 |
| `InstructionsMenu.java:24` | `Move your character` | `移动你的角色` | 6 字 |
| `InstructionsMenu.java:25` | `with the arrow keys` | `使用方向键` | 5 字 |
| `InstructionsMenu.java:26` | `press C to attack` | `按 C 攻击` | `C` 保留 ASCII；4 字+ASCII |
| `InstructionsMenu.java:27` | `and X to open the` | `按 X 打开` | `X` 保留 ASCII |
| `InstructionsMenu.java:28` | `inventory and to` | `背包并用来` | 5 字 |
| `InstructionsMenu.java:29` | `use items.` | `使用物品` | 4 字 |
| `InstructionsMenu.java:30` | `Select an item in` | `选择背包中的` | 6 字 |
| `InstructionsMenu.java:31` | `the inventory to` | `物品以` | 3 字 |
| `InstructionsMenu.java:32` | `equip it.` | `装备它` | 3 字 |
| `InstructionsMenu.java:33` | `Kill the air wizard` | `击败空气巫师` | 6 字（`AirWizard` 实体名本地化为「空气巫师」） |
| `InstructionsMenu.java:34` | `to win the game!` | `即可获胜！` | 5 字；`！` 全角 |

### 2.3 关于 — `screen/AboutMenu.java`
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `AboutMenu.java:23` | `About Minicraft` | `关于 Minicraft` | 品牌 `Minicraft` 保留 ASCII |
| `AboutMenu.java:24` | `Minicraft was made` | `Minicraft 由` | 品牌保留 |
| `AboutMenu.java:25` | `by Markus Persson` | `马库斯·佩尔松` | 作者名音译备选；`·` 全角。亦可保留 ASCII `Markus Persson` |
| `AboutMenu.java:26` | `For the 22'nd ludum` | `为第 22 届 Ludum` | 赛事 `Ludum` 保留；数字 ASCII |
| `AboutMenu.java:27` | `dare competition in` | `Dare 大赛，于` | `Dare` 保留；`，` 全角 |
| `AboutMenu.java:28` | `december 2011.` | `2011 年 12 月` | 数字 ASCII；`年` `月` 中文化 |
| `AboutMenu.java:29` | `it is dedicated to` | `谨以此游戏献给` | 7 字 |
| `AboutMenu.java:30` | `my father. <3` | `我的父亲。<3` | `<3` 保留 ASCII 爱心符号；`。` 全角 |
| `AboutMenu.java:32` | `HTML5/GWT Port by` | `HTML5/GWT 移植：由` | 技术栈保留 ASCII；`：` 全角 |
| `AboutMenu.java:33` | `Chi Hoang` | `Chi Hoang` | 移植者名保留 ASCII（避免错译） |

### 2.4 死亡菜单 — `screen/DeadMenu.java`
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `DeadMenu.java:23` | `You died! Aww!` | `你死了！呜！` | 6 字形；`！` 全角 |
| `DeadMenu.java:37` 标签 | `Time:` | `时间：` | `：` 全角；其后 `timeString` 计时**保留 ASCII**（见下方备注） |
| `DeadMenu.java:39` 标签 | `Score:` | `分数：` | `：` 全角；其后分数数字**保留 ASCII** |
| `DeadMenu.java:41` | `Press C to lose` | `按 C 重来` | `C` 保留 ASCII；原味「lose」功能为返回标题，故译「重来」。备选：`按 C 认输` |
| `DeadMenu.java:33-36` 计时串 `timeString` | `3m 12s` / `1h 03m` | **保留 ASCII** | 由 `game.gameTime` 计算，格式代码在 DeadMenu/WonMenu；建议 v1 保留。中文备选：将 `m/s/h` 替换为 `分/秒/时` → `3分12秒`（需改 2 处格式代码，见 §5 注意点 4） |

### 2.5 胜利菜单 — `screen/WonMenu.java`
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `WonMenu.java:23` | `You won! Yay!` | `你赢了！耶！` | 6 字形；`！` 全角 |
| `WonMenu.java:37` 标签 | `Time:` | `时间：` | 同 2.4；计时串保留 ASCII |
| `WonMenu.java:39` 标签 | `Score:` | `分数：` | 同 2.4；分数保留 ASCII |
| `WonMenu.java:41` | `Press C to win` | `按 C 再玩` | `C` 保留 ASCII；功能为返回标题再开一局。备选：`按 C 庆祝` |
| `WonMenu.java:33-36` 计时串 | `3m 12s` / `1h 03m` | **保留 ASCII** | 同 2.4 备注 |

### 2.6 合成菜单 — `screen/CraftingMenu.java`（`renderFrame` 标题）
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `CraftingMenu.java:66` `renderFrame(...,"Have",...)` | `Have` | `持有` | 2 字；框宽 8 字，安全 |
| `CraftingMenu.java:67` `renderFrame(...,"Cost",...)` | `Cost` | `消耗` | 2 字 |
| `CraftingMenu.java:68` `renderFrame(...,"Crafting",...)` | `Crafting` | `合成` | 2 字；框宽 11 字，安全 |
| `CraftingMenu.java:76,93` 数量 `1/99`、`hasResultItems` | `"+has` 等数字 | **保留 ASCII** | 数量/比例数字不翻译 |

### 2.7 背包菜单 — `screen/InventoryMenu.java`
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `InventoryMenu.java:40` `renderFrame(...,"inventory",...)` | `inventory` | `背包` | 2 字；框宽 12 字，安全 |

### 2.8 容器（箱子）菜单 — `screen/ContainerMenu.java`
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `ContainerMenu.java:60` `renderFrame(screen, title, ...)` 标题 | `title`（实际来自 `Chest.java:16` 传入 `"Chest"`） | `箱子` | 2 字；当前仅 `Chest` 调用 `ContainerMenu`（见 `Chest.java:16`）。若新增容器家具，标题随家具名走（见 §4） |
| `ContainerMenu.java:63` `renderFrame(...,"inventory",...)` | `inventory` | `背包` | 2 字 |

### 2.9 通用列表光标 — `screen/Menu.java`
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `Menu.java:47` | `>` | **保留 ASCII** `>` | 光标符号不翻译（约束 5） |
| `Menu.java:48` | `<` | **保留 ASCII** `<` | 光标符号不翻译（约束 5） |

### 2.10 失焦提示 — `Game.java`
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `Game.java:425` `renderFocusNagger` | `Click to focus!` | `点击聚焦！` | 5 字；`！` 全角。居中用 `msg.length()*8`，中文 8px/字对齐 |

### 2.11 伤害飘字 — `entity/particle/TextParticle.java`
| 位置 | 原文 | 建议中文 | 备注 |
|---|---|---|---|
| `TextParticle.java:15,49-50` `msg` | 伤害数字（如 `3`、`12`） | **保留 ASCII** | 约束 5：伤害数字保持 ASCII 不翻译；且 `Font.draw(msg, ...)` 按 `msg.length()*4` 偏移定位，需 ASCII 数字 |

---

## 3. 资源 / 物品名映射表

> 说明：`Resource.name` 即显示名（`ResourceItem.getName()`、`ResourceItem.renderInventory()` 均直接取 `resource.name`，见 `ResourceItem.java:39,46`）。
> 当前 `Resource` 构造函数（`Resource.java:37-42`）强制 `name.length() <= 6`，否则抛 `RuntimeException`。
> **关键决策：本表所有建议中文均 ≤4 汉字，按 UTF-16 计 `length()` 均 ≤4 ≤6，故当前硬限制不会被触发，v1 可不改代码即可通过。**
> 仍建议在 §5 中做解耦改造（新增 `displayName` 或放宽限制）以利后续扩展。

| 类 / 字段（`Resource.java:9-31`） | 原 `name` 值 | 建议中文短名 | 备注 |
|---|---|---|---|
| `Resource.wood` | `Wood` | `木` | 1 字 |
| `Resource.stone` | `Stone` | `石` | 1 字 |
| `Resource.flower` | `Flower` | `鲜花` | 2 字（亦可 `花`，取 `鲜花` 更明确） |
| `Resource.acorn` | `Acorn` | `橡果` | 2 字 |
| `Resource.dirt` | `Dirt` | `泥土` | 2 字 |
| `Resource.sand` | `Sand` | `沙` | 1 字 |
| `Resource.cactusFlower` | `Cactus` | `仙人掌` | 3 字（注：内部字段名 `cactusFlower`，`name` 原为 `Cactus`） |
| `Resource.seeds` | `Seeds` | `种子` | 2 字 |
| `Resource.wheat` | `Wheat` | `小麦` | 2 字 |
| `Resource.bread` | `Bread` | `面包` | 2 字 |
| `Resource.apple` | `Apple` | `苹果` | 2 字 |
| `Resource.coal` | `COAL` | `煤` | 1 字 |
| `Resource.ironOre` | `I.ORE` | `铁矿` | 2 字 |
| `Resource.goldOre` | `G.ORE` | `金矿` | 2 字 |
| `Resource.ironIngot` | `IRON` | `铁锭` | 2 字 |
| `Resource.goldIngot` | `GOLD` | `金锭` | 2 字 |
| `Resource.slime` | `SLIME` | `黏液` | 2 字 |
| `Resource.glass` | `glass` | `玻璃` | 2 字 |
| `Resource.cloth` | `cloth` | `布` | 1 字 |
| `Resource.cloud` | `cloud` | `云` | 1 字 |
| `Resource.gem` | `gem` | `宝石` | 2 字 |

**安全性核查**：全 21 项 `length()` ∈ {1,2,3} ≤ 6，满足 `Resource` 硬限制；且 `name` 字段仅作显示（已全仓 grep 确认无任何 `.name.equals(...)` / `==` 字符串比较耦合，static 单例按引用比较），改为中文不影响合成/匹配逻辑。

---

## 4. 工具 / 家具 / 食物名完整中文方案

### 4.1 工具名 — `item/ToolItem.java`（`getName() = LEVEL_NAMES[level] + " " + type.name`）
- 材质映射（`ToolItem.java:15-17` `LEVEL_NAMES`：`Wood/Rock/Iron/Gold/Gem`）：`Wood→木`、`Rock→石`、`Iron→铁`、`Gold→金`、`Gem→宝石`
  - 注：等级 1 源码为 `Rock`（非 `Stone`），对应 `石`，与资源 `stone→石` 一致。
- 类型映射（`item/ToolType.java:4-8` `name`：`Shvl/Hoe/Swrd/Pick/Axe`）：`sword→剑`、`axe→斧`、`hoe→锄`、`pickaxe→镐`、`shovel→铲`
- **拼接规则**：材质 + 类型，**去掉原 ASCII 空格**，如 `Wooden Sword → 木剑`、`Gold Pickaxe → 金镐`、`Gem Sword → 宝石剑`。
- 全 25 种组合（5 材质 × 5 类型，均 ≤3 字，背包框 12 字宽安全）：

| 类型＼材质 | 木(Wood) | 石(Rock) | 铁(Iron) | 金(Gold) | 宝石(Gem) |
|---|---|---|---|---|---|
| 剑 sword | 木剑 | 石剑 | 铁剑 | 金剑 | 宝石剑 |
| 斧 axe | 木斧 | 石斧 | 铁斧 | 金斧 | 宝石斧 |
| 锄 hoe | 木锄 | 石锄 | 铁锄 | 金锄 | 宝石锄 |
| 镐 pickaxe | 木镐 | 石镐 | 铁镐 | 金镐 | 宝石镐 |
| 铲 shovel | 木铲 | 石铲 | 铁铲 | 金铲 | 宝石铲 |

> 代码注意（建议非强制）：`ToolItem.getName()` 目前插入 `" "` 空格。中文拼接建议直接 `LEVEL_NAMES[level] + type.name`（无空格），否则会渲染为 `木 剑`。见 §5 注意点 3。

### 4.2 家具名 — `entity/*Furniture*.java`（`FurnitureItem.getName()` 取 `furniture.name`，见 `FurnitureItem.java:59-61`）
> 家具名经 `Furniture` 基类构造函数（`Furniture.java:14`）赋值，**无 6 字硬限制**，但显示于背包框（12 字宽），以下均 ≤3 字，安全。

| 类（文件:行） | 原 `name` | 建议中文 | 备注 |
|---|---|---|---|
| `Workbench.java:9` | `Workbench` | `工作台` | 3 字 |
| `Anvil.java:9` | `Anvil` | `铁砧` | 2 字 |
| `Furnace.java:9` | `Furnace` | `熔炉` | 2 字 |
| `Oven.java:9` | `Oven` | `烤箱` | 2 字 |
| `Chest.java:10,16` | `Chest` | `箱子` | 2 字；同时作为 `ContainerMenu` 标题（见 §2.8） |
| `Lantern.java:7` | `Lantern` | `灯笼` | 2 字 |

### 4.3 力量手套 — `item/PowerGloveItem.java`
| 位置 | 原 `getName()` | 建议中文 | 备注 |
|---|---|---|---|
| `PowerGloveItem.java:28-30` | `Pow glove` | `力量手套` | 4 字；非 `Resource`，无 6 字限制；背包框 12 字宽安全。备选短名：`神力手套`、`手套` |

### 4.4 食物（含于 §3 资源表）
- `bread`（面包）、`apple`（苹果）：显示名同 §3 资源映射，直接复用。

---

## 5. 需 engineering-lead 配合的改动建议清单

> 以下仅为**建议**，由 engineering-lead 评估并落地；本文档不含任何代码改动。

1. **【核心阻塞】扩展 `Font` 字形管线以支持中文（必须）。**
   - 现状：`Font.draw`（`gfx/Font.java:4-17`）内置 `chars` 字符串**仅含 ASCII 大写字母/数字/标点**；对任意不在其中的字符（含全部中文、小写字母）`chars.indexOf(...) == -1`，**直接不绘制**（静默丢字）。`renderFrame` 标题亦经 `draw` 渲染（`Font.java:43`）。
   - 后果：若不改造，本文档所有中文均不会显示，背包/合成框标题（`背包`/`合成`/`持有`/`消耗`/`箱子`）也会空白。
   - 建议：新增「像素风中文点阵」图集（每字形 8×8，单色/调色板化），并将 `Font.draw` 改为：ASCII 仍走原 `chars` 表；CJK 字符查新图集（如 `Map<Character,Integer>` 或按 Unicode 分块索引）。注意 `Font.draw` 现有 `msg.toUpperCase()`（`Font.java:10`）对中文无影响，可保留。

2. **【对齐】中文点阵必须等宽 8px/字。**
   - 多处定位用 `msg.length()*8` 计算（`TitleMenu.java:56`、`Game.java:426`、`DeadMenu/WonMenu` 数量偏移、`TextParticle.java:49-50` 用 `*4`）。中文若非严格 8px 等宽，会导致居中偏移、HUD 错位。务必保证新图集每字形渲染宽度为 8px。

3. **【工具名拼接】`ToolItem.getName()` 去空格（建议）。**
   - 当前 `LEVEL_NAMES[level] + " " + type.name` 会生成 `木 剑`。建议改为直接拼接 `LEVEL_NAMES[level] + type.name` → `木剑`。属纯显示优化，不影响逻辑。

4. **【计时串本地化】DeadMenu/WonMenu 的 `timeString`（可选）。**
   - v1 建议保留 ASCII（`3m 12s` / `1h 03m`），改动最小。若要中文，将 `m/s/h` 替换为 `分/秒/时`，并确认点阵字库含 `分秒时` 三字；涉及 `DeadMenu.java:31-36` 与 `WonMenu.java:31-36` 两处格式代码。

5. **【资源名长度】解耦 `name` 显示限制（建议，非必须）。**
   - 当前 `Resource` 构造函数（`Resource.java:37-42`）`name.length() > 6` 即抛异常。本表所有中文短名 ≤4 字，**当前不会触发**，v1 可零改动通过。
   - 但为避免后续扩展受限、并区分「内部标识」与「显示名」，建议二选一：
     - (a) 放宽 `name.length()` 上限（如 ≤12）；或
     - (b) 新增独立 `displayName` 字段承载中文显示名，`name` 保留英文/作内部标识。
   - 安全性已确认：`name` 仅用于显示（无字符串比较耦合），改名零风险。

6. **【字库覆盖校验】确保点阵字库包含本文档全部字符（必须）。**
   - 缺失字形会导致该字不显示（同注意点 1 的静默丢字）。请工程以**附录 A** 字符全集为准，并建议脚本二次校验（正则提取本文档所有 CJK + 全角标点）。
   - 全角标点需纳入：`（）`，：！。`·`（共 9 个）。半角 `X C < > / + ( )` 等本就属 ASCII 表，无需额外处理。

7. **【品牌/专名保留 ASCII】** 见 §2.3：`Minicraft`、`Ludum Dare`、`HTML5/GWT`、`Chi Hoang` 保留原文；`Markus Persson` 可用音译 `马库斯·佩尔松` 或保留 ASCII。确保这些 ASCII 串在 `Font` 改造后仍走原 `chars` 表正常渲染。

---

## 附录 A：需纳入点阵字库的中文字符全集（去重，供工程校验）

**汉字（按类别，去重后约 110 个）：**
```
木石鲜花橡果泥土沙仙人掌种子小麦面包苹煤铁矿金锭黏液玻璃布云宝石
剑斧锄镐铲
工作台砧熔炉烤箱灯笼
力量手套
关游玩说法说明于移动你的角色使用方向键按攻击打开背包并来物品选择中的以装备它
击败空气巫师即可获胜时间分数放弃胜利持有消耗合成点击聚焦死了呜赢耶
我父亲谨此献给为第届大赛年月马库斯佩尔松移植由
```
（说明：以上为本文档所有「建议中文」出现的汉字并集，已去重。工程请以脚本从本文件提取 CJK 为准做二次校验。）

**全角标点（9 个，必须纳入）：**
```
（ ） ， ： ！ 。 ·
```

**保留 ASCII（不进中文字库，走原 `chars` 表）：**
```
A-Z 0-9 及 . , ! ? ' " - + = / \ % ( ) < > : ;  X C < > / + ( )
```
（注：`<3` 爱心、`X`/`C` 控制键提示、`m/s/h` 计时单位等均保留半角。）
