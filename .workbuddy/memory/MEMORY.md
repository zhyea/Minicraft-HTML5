# Minicraft-HTML5 项目笔记

- 身份：Minicraft（Notch 2011 Ludum Dare 作品）的 HTML5 移植版，作者 Chi Hoang，用 GWT 2.4 把 Java 转译成 JS 跑浏览器 Canvas。
- 状态：功能完整、可玩的成品，处于"已发布/可维护"阶段（非从零开发，不需走完整七阶段 SOP）。
- 技术栈：Java 游戏逻辑 + GWT 2.4；内部分辨率 160x120，SCALE=3 软件渲染写入 ImageData 再 putImageData；60 tick/s 固定步长主循环（Game.Looper）。
- 构建：Ant(build.xml，兜底保留) **或** 等价 Gradle(build.gradle + settings.gradle，JavaExec 调 com.google.gwt.dev.Compiler，1:1 复刻 Ant 两步 javac+Compiler；默认 ../gwt-2.4.0 SDK，gwt-voices 经 lib/；须 JDK 8、Gradle 8.x)。
- 世界：5 个 Level 维度堆叠 —— Sky(L4, depth+1, 含 AirWizard BOSS) / Surface(L3, depth0, 出生点) / Underground1(L2, -1) / Underground2(L1, -2) / Underground3(L0, -3)；stairsUp 去天空，stairsDown 逐层下矿；currentLevel 初始 3。
- 胜负：击败 AirWizard(2000 HP) → WonMenu；玩家生命(10 格)归零 → DeadMenu。玩家还有 stamina(10 格) 驱动攻击/游泳。
- 关键目录：src/com/mojang/ld22/{Game, entity, level, crafting, item, screen, gfx, gwt}。
- 合成台：Workbench / Anvil / Furnace / Oven；工具 5 级 木→石→铁→金→gem（crafting/Crafting.java）。

## 已完成的改造（2026-07-19~20，均未在沙箱编译，需本地 ant + GWT 2.4 验证）
- 中文本地化：design/i18n/zh-CN-strings.md（文案映射）；Font.java 加 CJK 运行时栅格化 8×8 点阵管线，Screen.java 加 renderGlyph，Minicraft.gwt.xml 已 inherits Canvas。
- 大屏自适应：Game.java 改动态整数倍 scale + image-rendering:pixelated + resize 监听 + 居中 letterbox（内部 160×120 不变）。文档 docs/architecture/responsive-display.md。
- 存档功能（GWT/Java 侧已实现，MVP 阶段1闭环，但未在沙箱编译）：设计文档 docs/architecture/save-system-plan.md；代码 src/com/mojang/ld22/save/{SaveStore,SaveManager,EntityIO,ItemIO}.java + Game/Level/Player/TitleMenu/Resource/ToolType/Furniture/Mob/ItemEntity 等改动。localStorage 键 `minicraft.save`，每 30s 自动存 + 关闭存 + 标题「继续游戏」。Base64 用纯 Java 手写（非 JSNI，兼容 ie9）。
- **ts-port（TS/Vue 移植）侧存档（已实现并主理人独立复核绿，2026-07-20）**：MVP 闭环——新增 ts-port/src/game/save/{SaveStore,SaveManager,EntityIO,ItemIO}.ts + __tests__/save.test.ts（8测试）；Level.fromSave 静态工厂 + skipGen 形参（读档绕开 LevelGen 与 AirWizard 自动 spawn）；Game.saveGame/loadGame/hasSave + 每1800 tick(30s)/beforeunload 自动存（死亡/通关不存，player.removed||health<=0 守卫规避读档即死）；TitleMenu 动态「继续游戏」+ App.vue 接线。localStorage 键 `minicraft.save`，Uint8Array 经 btoa/atob 做 Base64，不可用时回退内存 Map。门控：tsc=0 / vitest 72测试(12文件) / vite build 109 modules，全绿。注意：ts-port 未 port ItemEntity，故跳过其持久化；Furniture.createByName 用子类自注册表规避 class-extends-value 循环依赖。

## 存档/序列化设计关键事实（精确，供后续任务）
- src/com/mojang/Minicraft.gwt.xml 现已 inherits User/Canvas/gwt-voices/**Storage**（存档已实现，已加 Storage 继承）。
- Level 实际字段：`public byte[] tiles` + `public byte[] data`（两 byte[]，非 short[]）。读档须绕开 `Level(int,int,int,Level)` 构造体（其固调 LevelGen + 楼梯开挖 + level==1 时 add AirWizard），新增 `Level.fromSave` 工厂纯灌入。
- 本移植 Mob 仅 Zombie/Slime/AirWizard；无 Cow/Pig/Sheep、无 ArrowProjectile、无 FoodItem（食物=FoodResource via ResourceItem）；游戏无 Mode 枚举，状态由 Game.menu 体现。
- 存档已实现：localStorage + JSON 容器 + tiles/data 用纯 Java Base64（约 213KB/档），整体 <0.6MB；死亡/通关不自动存（saveGame 守卫 player.removed）；Level.fromSave 绕开 LevelGen 构造体。

## 重建方向探索（Vue/TS）
- 用户考虑脱离 GWT，用 TypeScript + Canvas(渲染) + Vue(菜单) 重建。可行性研究 docs/architecture/vue-rebuild-feasibility.md 结论：条件可行，全量重写约 60 人日量级；10 个 GWT 耦合文件需重写、73 个纯逻辑可 port；建议阶段0 垂直切片验证端到端。
- **ts-port 阶段0 垂直切片（已完成并验证，2026-07-19~20）**：Vite+Vue3+TS 项目，port 核心循环（Screen/SpriteSheet/Color/Renderer/InputHandler/Rand + Game/state + Level/LevelGen + 全 Tile 族 + Entity/Mob/Zombie/Player）+ 一个 Vue 标题菜单 overlay + 键盘输入。独立复核三道验证链全绿：`tsc --noEmit` 退出码0、`vitest` 4文件11测试全绿、`vite build` 生成 dist/index-*.js+css。GWT 版（含汉化/大屏/存档改造）仍保留并可并行。
- **TV 可行性研究（已完成）**：docs/architecture/tv-feasibility.md。结论条件可行——小米电视 PatchWall(Android TV) Chromium WebView 跑 Canvas 2D 无障碍；显示复用大屏自适应(1080p 整数9倍居中+pixelated)；输入难点在焦点管理+返回键(阶段清单见报告第7节)；推荐方案②Android TV APK(WebView 加载本地HTML)。前置依赖：汉化+大屏完成。

## 待本地编译验证（沙箱无法跑 GWT 2.4）
- 所有 GWT 侧改造（汉化 Font.java/Screen.java/Minicraft.gwt.xml、大屏 Game.java、存档 save/*+各实体改动、Gradle build.gradle）尚未在沙箱编译，须本地 JDK 8 + GWT 2.4 SDK 跑 `ant clean && ant build` 或 `gradle build` 验证；另注意 Sound.java 引 .mp3 但 res/ 是 .wav 的资产错位风险。
