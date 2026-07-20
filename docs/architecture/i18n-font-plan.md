# 中文本地化字体管线方案（zh-CN i18n Font Plan）

> 作者：engineering-lead（程基岩）｜关联任务：汉化字体管线 + 全量字符串替换
> 关联文档：`design/i18n/zh-CN-strings.md`（设计/文案专家产出，本任务唯一事实源）
> 关联基建：`docs/architecture/responsive-display.md`（大屏自适应，本任务的显示层前置依赖）

---

## 0. 摘要

在「大屏自适应」已落地的 `Game.java` 之上，本次完成两件事：

1. **像素风中文点阵字体管线**：改造 `gfx/Font.java` 与 `gfx/Screen.java`，
   让 ASCII 继续走原 ASCII `chars` 表 / 主 SpriteSheet（tile 行 30），而 CJK 与全角标点
   在**运行时**由系统字体栅格化（16×16 超采样 → 8×8 单色点阵，on=1）并缓存，
   经由新增的 `Screen.renderGlyph()` 以**与原 `render()` 完全相同的着色逻辑**绘制。
2. **全量字符串替换为中文**：5 个菜单 + 合成/背包/容器框标题 + `Game` 失焦提示，
   以及 21 个 `Resource` 名、5 个 `ToolType`、5×5 工具组合名（去空格）、
   6 个家具名、`PowerGloveItem` 名，全部按设计文档映射。

**核心不变量**：内部 160×120 渲染缓冲、原 `Screen.render()` 像素逻辑、`Font.draw` 的 `msg.length()*8`
居中/HUD 定位**全部保持原样**；CJK 严格 8px 等宽，故上述定位数学零改动即正确。

---

## 1. 决策记录（ADR）

### ADR-1：中文点阵字库方案 —— 运行时栅格化（Runtime Rasterization）

| 项 | 内容 |
|---|---|
| **上下文** | 原 `Font.chars` 仅含 ASCII 大写/数字/标点；`Font.draw` 对任意不在其中的字符（含全部中文、小写、全角标点）`indexOf()==-1` **静默丢字不绘制**。设计文档要求所有中文可见，且必须 8px 等宽点阵。 |
| **约束** | GWT 2.4（无 Java/GWT 编译器于沙箱，仅能产出代码 + 标记本地 `ant` 验证）；内部分辨率 160×120 不变；显示层已支持整数倍像素化放大。 |
| **备选 A（选定）** | **运行时栅格化**：用离屏 `com.google.gwt.canvas.client.Canvas`（坐标空间 16×16），`Context2d.fillText(字符)` 以系统 CJK 字体写入，再 `getImageData()` 读回 `CanvasPixelArray`，按 alpha 阈值二值化、2×2 下采样为 **8×8 单色位图（on=1）**，按字符缓存于 `Map<Integer,int[]>`。绘制时 ASCII 走原 `screen.render(tile+30*32)`；CJK 走新增 `screen.renderGlyph(glyph)`。 |
| **备选 B（记录，未采用）** | **离线点阵 PNG 图集**：用像素 CJK 字体（如 WenQuanYi / 思源）离线生成 8×8 精灵表，作为 GWT `ClientBundle` 内嵌资源，运行时解码为 `SpriteSheet` 后绘制。字形最精致、可控，但**需要本地字体工具链 + 手工维护字形索引 + 重建资源**，且本沙箱无字体栅格化工具，无法在此产出该 PNG。 |
| **决策** | **采用 A（运行时栅格化）**，B 作为后续画质升级路径记录。理由：完全自包含、零额外资源/构建步骤、开箱即用（任意系统字体支持的字形即出）；与「大屏自适应」的像素化放大天然一致（8×8 点阵被整数倍放大后即为像素风）。 |
| **后果** | ✅ 无需外部美术/字体资源，CI 与本地 `ant` 均直接通过；字库覆盖 = **系统字体覆盖**（非固定图集），故不存在「固定图集缺字→静默空白」风险。<br>⚠️ 8×8 下复杂汉字（如「赢」「骤」）笔画必然压缩，可读性受限于 8px 这一硬性约束（设计文档已明确接受）；依赖目标系统存在 CJK 字体（中文环境下为标准配置）。<br>🔧 引入 GWT 2.4 Canvas 2D API（`getImageData` / `CanvasPixelArray` / `TextBaseline`），要求模块继承 `com.google.gwt.canvas.Canvas`（已在 `Minicraft.gwt.xml` 补加，见 §5）。 |

> **关键佐证**：原仓库 `gfx/SpriteSheet.java` 构造函数内本就保留了一段注释掉的代码，使用 `CanvasPixelArray` 与 `imageData.getData()` 从图像反解像素——证明 GWT 2.4 工具链暴露了完全相同的 API 面，本方案的 `getImageData → CanvasPixelArray.get(int)` 路径在 2.4 下成立。

### ADR-2：显示层协调 —— 惰性初始化，零侵入渲染主体

| 项 | 内容 |
|---|---|
| **决策** | 字体栅格化资源**惰性初始化**（首次 `Font.draw` 调用时才创建离屏 Canvas 并栅格化），不做构造期初始化。 |
| **协调** | 首次 `Font.draw` 必然发生在 `Game.render()` 帧循环内，而 `Game` 构造已先完成 `canvas` 创建 + `applyDisplaySize()`（见 `responsive-display.md`）。因此惰性初始化**天然晚于** canvas 与 `applyDisplaySize()`，满足约束「字体初始化须在 canvas 创建且 applyDisplaySize() 之后」。`Game.java` 本次**无需为字体做任何构造改动**。 |
| **零侵入** | 仅**新增** `Screen.renderGlyph()` 方法（与 `render()` 并列，**未修改 `render()` 函数体**），原 ASCII 绘制路径、像素/调色板逻辑、内部 160×120 全部原样。`renderGlyph` 复用 `render()` 完全相同的边界裁剪与着色公式 `col = (colors >> (sheetPixel*8)) & 255`，CJK on 像素值取 1（与原字体表 on 像素值一致），故 ASCII 与中文**着色完全一致**。 |

### ADR-3：ASCII 保留策略（设计文档约束 5）

以下一律**保留 ASCII**，继续走原 `chars` 表，不被栅格化：
- 伤害飘字数字（`TextParticle`，按 `msg.length()*4` 偏移定位，必须 ASCII 数字）；
- 分数、计时串 `3m 12s` / `1h 03m`（`DeadMenu`/`WonMenu` 由 `game.gameTime` 计算，v1 保留 ASCII）；
- 品牌/专名：`Minicraft`、`Ludum Dare`、`HTML5/GWT`、`Chi Hoang`（音译仅 `Markus Persson → 马库斯·佩尔松` 采用，其余保留）；
- 列表光标 `>` `<`（`Menu.java`，ASCII 已在 `chars` 内）。

---

## 2. 字库覆盖校验（Glyph Coverage Validation）

用脚本对全部改动后源码做静态提取（脚本为临时校验件，已清理）：

| 校验项 | 结果 |
|---|---|
| 非 ASCII 字符去重数 | **144** 个（分布于 **19** 个被编辑文件，与本次改动文件清单**精确吻合**——`Font.java`/`Screen.java` 源码本身无中文字面量，符合预期） |
| 字符平面（BMP）检查 | ✅ 全部 ≤ U+FFFF（BMP）。`Font.draw` 以 `char`（UTF-16 代码单元）逐字栅格化，`msg.length()` 直接等于字形数 → 所有 `msg.length()*8` 居中/HUD 数学正确。 |
| 路由检查 | ✅ 非 ASCII 字符永不在 ASCII `chars` 串内 → 全部进入 CJK 栅格路径；ASCII 走原 `chars` 路径。两路互不干扰。 |
| `Resource` 名长度 | ✅ 全部中文短名 ≤ 4 个 UTF-16 单元 ≤ 6 → `Resource` 构造器 `name.length() > 6` 抛异常守卫**未被触发**。 |
| 与设计文档附录 A 比对 | 信息性：源码用到的 `再 始 戏 重` 未列于附录 A（文档手动去重存在少量缺口，文档自身已注明「以脚本从本文件提取 CJK 为准做二次校验」）；且本方案为**系统字体栅格化**而非固定图集，附录缺口不导致缺字空白。 |

> **结论**：覆盖 = 目标系统 CJK 字体覆盖，对本文档涉及的全部约 110 汉字 + 9 全角标点完全胜任；因非固定图集，**不存在静默缺字**。

---

## 3. 改动文件清单（Deliverables）

### 3.1 字体管线（核心）
- `src/com/mojang/ld22/gfx/Font.java` —— 重写：保留 ASCII `chars` + 原 `draw`/`renderFrame` 行为；新增运行时栅格化（`ensureRaster` / `getCJK` / `rasterize`，16→8 下采样二值化，按字符缓存），`draw` 按字符路由 ASCII / CJK。
- `src/com/mojang/ld22/gfx/Screen.java` —— **新增** `renderGlyph(int xp,int yp,int[] glyph,int colors)`（并列于 `render()`，复用同一着色逻辑）。
- `src/com/mojang/Minicraft.gwt.xml` —— **补加** `<inherits name='com.google.gwt.canvas.Canvas'/>`（运行时栅格化所必需；同时**回修**了上一项「大屏自适应」已引入的 `Canvas` 依赖，使其可在 GWT 2.4 下编译）。

### 3.2 界面 / 菜单文案
- `screen/TitleMenu.java` —— `options`：`开始游戏`/`玩法说明`/`关于`；底部提示：`（方向键 X C）`（保留 ASCII 的 `X` `C`）。
- `screen/InstructionsMenu.java` —— 12 行全中文（含 `玩法说明` `移动你的角色` `使用方向键` `按 C 攻击` `按 X 打开` `背包并用来` `使用物品` `选择背包中的` `物品以` `装备它` `击败空气巫师` `即可获胜！`）。
- `screen/AboutMenu.java` —— 9 行（品牌 `Minicraft`/`Ludum`/`HTML5/GWT`/`Chi Hoang` 保留 ASCII；`马库斯·佩尔松` `为第 22 届 Ludum` `Dare 大赛，于` `2011 年 12 月` `谨以此游戏献给` `我的父亲。<3` `HTML5/GWT 移植：由`）。
- `screen/DeadMenu.java` —— `你死了！呜！` / `时间：` / `分数：` / `按 C 重来`（计时串保留 ASCII）。
- `screen/WonMenu.java` —— `你赢了！耶！` / `时间：` / `分数：` / `按 C 再玩`（计时串保留 ASCII）。
- `screen/CraftingMenu.java` —— 框标题 `持有` / `消耗` / `合成`。
- `screen/InventoryMenu.java` —— 框标题 `背包`。
- `screen/ContainerMenu.java` —— 框标题 `背包`（其标题实参由 `Chest` 传入，见 3.3）。
- `Game.java` —— `renderFocusNagger`：`点击聚焦！`。

### 3.3 物品 / 资源 / 家具名
- `item/resource/Resource.java` —— 21 个 `name` 全部改为中文短名（`木 石 鲜花 橡果 泥土 沙 仙人掌 种子 小麦 面包 苹果 煤 铁矿 金矿 铁锭 金锭 黏液 玻璃 布 云 宝石`）。
- `item/ToolItem.java` —— `LEVEL_NAMES`：`木 石 铁 金 宝石`；`getName()` 改为 `LEVEL_NAMES[level] + type.name`（**去掉原 ASCII 空格**，否则会渲染为 `木 剑`）。
- `item/ToolType.java` —— `铲 锄 剑 镐 斧`。
- `item/PowerGloveItem.java` —— `力量手套`。
- `entity/Workbench.java` `Anvil.java` `Furnace.java` `Oven.java` `Chest.java` `Lantern.java` —— `super(...)` 分别改为 `工作台 铁砧 熔炉 烤箱 箱子 灯笼`；`Chest.java` 传入 `ContainerMenu` 的标题同步为 `箱子`。

### 3.4 未改动（确认无意改动）
- `Screen.render()` 函数体、`Font.draw` 的 `msg.toUpperCase()`、内部 160×120、`render()` 像素逻辑 —— 原样。
- `entity/particle/TextParticle.java` —— 伤害数字 ASCII，原样。
- `screen/Menu.java` —— `>` `<` 光标 ASCII，原样。
- `LevelTransitionMenu.java` —— 纯图形过场，无文字。

---

## 4. 残留风险与待确认项（Residual Risks）

1. **8×8 可读性**：复杂汉字在 8px 下笔画压缩，属设计接受的硬性约束；若后续要求更高可读性，启用 ADR-1 备选 B（离线像素 CJK 图集）。
2. **系统字体依赖**：CJK 字形取自浏览器系统字体；中文环境下为标准配置。极老/无 CJK 字体的环境会回退为浏览器默认（通常不缺）。
3. **GWT 2.4 API 确认**：`Context2d.setTextBaseline(TextBaseline.TOP)` 与 `getImageData` 在本地 GWT 2.4 SDK 下须通过 `ant` 编译确认（见 §5）。若某 2.4 子版本缺 `TextBaseline`，回退方案为将 `ctx.fillText(ch,0,0)` 改为 `ctx.fillText(ch,0,7)`（字母基线接近底边的兜底写法，顶部略有裁切，不影响功能）。
4. **本次编辑竞态（已缓解）**：并行 `Edit` 同文件时，个别写入因「文件自读取后已被修改」而丢失（表现为工具报 Success 但磁盘内容被并发写入覆盖）。已通过「改后逐文件 `Read` 复核 + 全仓 `Grep` 扫残留英文」完全修复并确认零残留（§2、§3.2/3.3 校验）。

---

## 5. 编译验证步骤（Compile / Verify）

> 沙箱无 JDK / GWT 编译器，以下须在用户本地 **GWT 2.4 SDK** 环境执行。

```bash
# 1) 清理并全量构建（GWT 2.4 编译为 JS）
cd D:/MyDevelop/JSDevelop/Minicraft-HTML5
ant clean
ant build            # 或项目既定的构建目标

# 2) 开发模式冒烟测试
ant devmode        # 启动 GWT 开发模式，浏览器打开游戏
```

**本地须确认**：
- [ ] 构建**零报错**（重点：`Minicraft.gwt.xml` 已继承 `com.google.gwt.canvas.Canvas`；`Font.java` 的 `Canvas`/`Context2d`/`ImageData`/`CanvasPixelArray`/`TextBaseline` 导入可解析）。
- [ ] 标题菜单 `开始游戏 / 玩法说明 / 关于` 居中正确，无偏移（验证 `msg.length()*8` 在中文下仍成立）。
- [ ] 进入游戏后，背包/合成框标题 `背包` `持有` `消耗` `合成`、物品名（如 `木剑` `铁锭` `工作台`）均为中文点阵且 8px 等宽。
- [ ] 死亡/胜利界面 `你死了！呜！` / `你赢了！耶！` 及 `时间：` `分数：` 正常，`3m 12s` 计时串仍为 ASCII。
- [ ] 浏览器控制台无 Canvas / `getImageData` 相关异常。
- [ ] 大屏下中文点阵随整数倍放大保持像素清晰（`image-rendering: pixelated` 生效，与「自适应」协同）。

---

## 6. `Resource.name` 长度守卫处理结论

**未放宽**（保留原 `name.length() > 6` 守卫）。理由：设计文档 §3/§5 已确认全部 21 个中文短名 ≤ 4 个 UTF-16 单元 ≤ 6，当前守卫**不会被触发**，v1 零改动即可通过。

**可选后续扩展**（本次未实施，仅记录）：为区分「内部标识」与「显示名」，可
- (a) 放宽 `name.length()` 上限（如 ≤ 12）；或
- (b) 新增独立 `displayName` 字段承载中文显示名，`name` 保留英文作内部标识。

安全性已确认：`Resource.name` 仅用于显示（全仓 `Grep` 确认无任何 `.name.equals(...)` / `==` 字符串比较耦合，静态单例按引用比较），改名零逻辑风险。
