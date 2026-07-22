# ts-port 遗漏逻辑补全 — Task #23 / #24 收官

依据 `ts-port/AUDIT-TS-VS-JAVA.md`，将阶段0 切片中缺失/被 stub 的生存→制造→战斗闭环逻辑全部补全。本回合完成 **Task #23（刷怪 + 掉落 + ItemEntity 入档）** 与 **Task #24（家具/合成菜单 + 起始物品 + select 键收官）**；#21/#22 已在先前完成。四任务全部落地，三道门控独立复核全绿：

- `tsc --noEmit` → exit 0
- `vitest run` → **77 测试 / 12 文件全过**（无回归）
- `vite build` → 111 modules，exit 0

## 关键改动

### Task #23 — 刷怪 / 掉落 / 存档
- **`Level.ts`**：忠实 port `trySpawn(count)`（depth<0→maxLevel=(-depth)+1 / min=1；depth>0→min=max=4；随机 Slime/Zombie；`findStartPos` 成功才 `add`）；`tick()` 首行调用 `trySpawn(1)`（与原版一致）。
- **`Game.startNewGame()`**：照 Java 改为 5 层各 `trySpawn(5000)` 填满密度（原切片只放 1 Zombie）。密度自限，存档仍在 <0.6MB 预算内。
- **`EntityIO.ts`**：新增 `t:12` 持久化 `ItemEntity`（x/y/lifeTime/time/hurtTime + item=ResourceItem），修复"掉落物不进档"缺口。
- **`Slime.ts` / `Zombie.ts`**：`die()` 忠实补 1–2 个 slime / cloth `ItemEntity` 掉落（原注释"无 ItemEntity"已作废——`ItemEntity` 实际早已 port 并被所有 Tile 掉落使用）。
- **`save.test.ts`**：新增 G 块 ItemEntity 往返测试。

### Task #24 — 家具/合成菜单 / 起始物品 / select 键
- 经核查：起始物品（Player 构造播种 Workbench+PowerGlove，默认 `seedStartingItems=true`）与 select 键（KeyZ → `cycleActiveItem`）已在 #21 完成；UI 层 `App.vue` 的 `furnitureUseHandler`（furniture→CraftingMenu/ContainerMenu 映射）也已存在。
- **真正缺口 = 游戏核心从不调用**：`Furniture.use()` 只触发未接线的 `onUse` hook；`Game.tick()` 的 X 键仅 `openInventory`，永不 `player.use()`。
- 修复：① `Furniture.use()` 在 `onUse` 缺失时回退 `player.game.furnitureUseHandler`；② `Game.tick()` 的 `menu.clicked` 先 `player.use()`（用相邻家具→handler 开对应菜单），返回 false 才 `openInventory`（忠实 Java 双击键复用逻辑）。
- `furniture.test.ts` 一度被 `Write` 误覆盖（丢 6 个原始测试），已用 `git HEAD` 还原 6 原始测试 + 补 2 个 handler 路由测试（共 8）。

## 闭环可达性
开局带 Workbench（FurnitureItem）+ PowerGlove → select 键选中 → 攻击键（C）放置工作台 → 走到旁边按 X 键 → 经 `player.use()`→`furnitureUseHandler`→`openCrafting('workbench')` 开合成菜单 → 采矿/造工具/战斗。生存→制造→战斗全链路现已端到端可达。

## 待本地验证（沙箱无法跑 GWT 2.4）
GWT/Java 侧的汉化/大屏/存档改造仍未在 `ant clean && ant build`（JDK 8 + GWT 2.4 SDK）编译验证，需本地执行。
