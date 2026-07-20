# Minicraft-HTML5 游戏存档（持久化）系统方案

> 文档状态：设计/方案（v1）
> 作者：engineering-lead（技术方向）
> 适用范围：GWT 2.4.0 编译目标（`build.properties` → `gwt.home=../gwt-2.4.0`），运行时为浏览器
> 约束：本方案仅交付设计 + 关键代码骨架，**不要求全量改代码**；沙箱无 Java/GWT 编译器，所有 `// 示意` 标记处需本地 `ant clean && ant build` + GWT 2.4 SDK 编译验证。

---

## 0. 代码现状与需求确认（已 Read 源码校正）

对任务背景假设做了逐条核对，以下为**与原始假设不符、影响方案设计**的点，请优先关注：

| 假设 | 实际代码 | 对方案的影响 |
|---|---|---|
| `Level.tiles` 为 `short[]`/`int[]`（2 字节/格） | `Level.java` 实际为 `public byte[] tiles;` + **`public byte[] data;`**（两个 `byte[]`） | 体积估算需按 **2×1 字节/格** 重算（见 §4）。序列化要分别写 `tiles` 与 `data` 两个数组。 |
| 存在 `Mode` 枚举（Title/Game/Death/Won） | 无枚举。游戏“状态机”由 `Game.menu`（`Menu` 引用，null 表示游戏中）+ 具体菜单类体现 | “继续游戏”挂在 `TitleMenu`；death/win 触发点是 `Game.tick()` 中 `setMenu(new DeadMenu()/WonMenu())`。 |
| 实体含 Cow/Pig/Sheep、ArrowProjectile、FoodItem | 本移植**已删除**：Mob 仅 `Zombie`/`Slime`/`AirWizard`；无箭矢，远程仅有 `AirWizard` 的 `Spark`；食物是 `FoodResource`（继承 `Resource`）经 `ResourceItem` 携带，**无 `FoodItem` 类** | 实体多态表只需覆盖现存的类；`Spark` 作为瞬态弹幕**不持久化**；`ResourceItem` 用 `resource.name` 即可唯一标识（含食物）。 |
| `com.google.gwt.storage.Storage` 可能已继承 | `Minicraft.gwt.xml` 仅 inherits `User`/`Canvas`/`gwt-voices`，**未继承 Storage** | ADR-1 决策落地必须**新增一行 inherits**（见 §2 与 §6）。GWT 2.4 自带 Storage 模块（2.3 起），无需第三方库。 |
| 已有 save/load 相关调用 | `grep` 全仓无 `save/load/persist/localStorage/DataOutputStream` | 从零新增，无冲突。 |

**读档流程的核心难点已确认**：`Level(int w,int h,int level,Level parent)` 构造体内固有无条件调用 `LevelGen.*` 生成 + 父层楼梯开挖 + `level==1` 时 `add(new AirWizard())`。读档必须**绕开该构造体**（否则会覆盖已存 tiles 并重复生成），需新增“纯灌入”构造路径（见 §6 Level 改动）。

**与既有任务兼容性**：`Game.java` 已有 `scale`/`computeScale()`/`applyDisplaySize()` 与 `Window.addResizeHandler`（大屏自适应）、`Font` 汉化文本。本方案只在 `Game` 新增 `saveGame()`/`loadGame()`/`hasSave()` 与（可选）关闭/定时自动存档，并复用 `Game.menu` 状态机，**不触碰** `Screen`/`Font`/render/resize 逻辑；新增的 `Window.addWindowClosingHandler` 与既有 `addResizeHandler` 互不干扰。

---

## 1. 总体方案概述（一句话）

**何时存**：游戏进行中定时自动存（建议每 30s `gameTime`）+ 页面关闭时（`Window.addWindowClosingHandler`）+ 可选 death/win 触发；**存在哪**：浏览器 `localStorage`（键 `minicraft.save`，经 GWT `Storage` API，单档字符串）；**何时读**：标题菜单出现“继续游戏”时，由玩家主动触发 `loadGame()`，跳过 `LevelGen` 直接灌入 tiles/entities。

---

## 2. ADR-1：存储载体

### 决策
**采用 `localStorage`，经 GWT 2.4 原生 `com.google.gwt.storage.client.Storage`（同步 API）。** 不采用 IndexedDB，不采用文件导出/导入作为主存档（文件导入/导出仅作为“备份/分享”的可选附加能力，见 §9）。

### 备选方案与理由

| 方案 | 兼容 GWT 2.4？ | 同步/异步 | 容量 | 复杂度 | 结论 |
|---|---|---|---|---|---|
| **localStorage（GWT `Storage`）** | ✅ 需新增 `<inherits name="com.google.gwt.storage.Storage"/>`（本仓当前未加） | 同步 | ~5MB/源（按源/子域，足以容纳） | 低，API 极简 `getItem/setItem/removeItem` | **推荐** |
| IndexedDB | ❌ 核心无模块，需第三方库（如 gwt-indexeddb 0.x，且对 GWT 2.4 兼容性不稳定） | 异步（回调/Promise） | 数百 MB | 高（事务/游标/异步重构整个存档调用链） | 否决（过度工程） |
| 导出/导入存档文件 | ✅（借助 `<input type=file>` + `Blob`/`download`） | 同步（用户触发） | 无上限（落本地磁盘） | 中（需额外 UI 与解析） | 仅作可选备份，不替代主存档 |

**理由**：单档预估 < 0.6MB（见 §4），远低于 5MB；存档是“整档覆盖写”，无需事务/大对象/随机读写；同步 API 与现有 `Game.tick()` 主循环、关闭钩子天然契合（IndexedDB 异步会让“页面关闭时存盘”变得脆弱）。多档/大世界才需要 IndexedDB，当前 5 层固定世界不需要。

**落地必做（1 行）**：`src/com/mojang/Minicraft.gwt.xml` 在 `<inherits name='com.google.gwt.canvas.Canvas'/>` 后追加：
```xml
<inherits name="com.google.gwt.storage.Storage"/>
```

---

## 3. ADR-2：序列化格式

### 决策
**JSON 作为容器格式（GWT 核心 `com.google.gwt.json.client.*`，无需额外 inherits），其中 5 层 × 2 个 `byte[]`（tiles/data）以 Base64 字符串整体存放**；其余结构化数据（玩家、实体、物品、库存）用 JSON 树直写，便于调试与版本迁移。

### 备选与理由

| 方案 | 说明 | 结论 |
|---|---|---|
| 自定义二进制（DataOutputStream 式） | GWT 2.4 **不仿真** `java.io.DataOutputStream`/`ByteArrayOutputStream`；需自写 `ByteWriter`/`ByteReader` + Base64，工作量大，且调试难 | 否决（除非未来要压到极限体积） |
| **JSON + Base64 混合（推荐）** | 结构化部分可读、易迁移；tiles/data 用 Base64 压成单字符串，避免“16384 个数字的 JSON 数组”的冗余 | **推荐** |
| 纯 JSON（tiles 也用数字数组） | 最简单、零 JSNI；但 tiles+data 约占 ~0.5MB 且肉眼不可读 | 备选（见下） |

**JSON 数字的 Base64 备选**：若 `btoa/atob` 的 JSNI 在你目标浏览器（含 `ie9`）出现兼容性顾虑，可改将 `tiles[]`/`data[]` 直接写成 `JSONArray` 数字（每格 1 个 0–255 的 `JSONNumber`）。体积约 0.5MB（仍远小于 5MB），且**完全消除 JSNI/Base64 风险**。建议作为“保底方案”，二选一即可，二者对上层结构无影响。

### 字段映射表（类 → 需序列化的字段）

> 约定：`level`/`removed`/`random` 等为运行期引用或派生值，**不序列化**；瞬态字段标注“不存”。

**Game（存档根）**
- `schemaVersion:int`（固定写 1）
- `gameTime:int`、`currentLevel:int`
- `player: Player`
- `levels: Level[5]`（每层独立对象）

**Level**
- `depth:int`、`w:int`、`h:int`
- `tiles:byte[w*h]`（Base64）、`data:byte[w*h]`（Base64）
- `entities: Entity[]`（仅存活实体；`Spark` 除外）
- `grassColor/dirtColor/sandColor/monsterDensity`：**不存**，按 `depth` 在构造时确定性重算（与现有构造逻辑一致）

**Entity（基类）**
- `typeId:int`（多态分发 id，见 §6 注册表）、`x:int`、`y:int`、`xr:int`、`yr:int`

**Mob（abstract，继承 Entity）**
- `walkDist:int`、`dir:int`、`hurtTime:int`、`xKnockback:int`、`yKnockback:int`、`maxHealth:int`、`health:int`、`swimTimer:int`、`tickTime:int`

**Player（继承 Mob）**
- `inventory: Inventory`、`attackItem: Item|null`、`activeItem: Item|null`
- `stamina:int`、`staminaRecharge:int`、`staminaRechargeDelay:int`、`score:int`、`maxStamina:int`、`invulnerableTime:int`
- 不存：`input`、`game`、`attackTime`、`attackDir`、`onStairDelay`（运行期）

**Zombie / Slime（继承 Mob）**：+ `lvl:int`
**AirWizard（继承 Mob）**：仅 Mob 字段；`attackDelay/attackTime/attackType/xa/ya/randomWalkTime` 不存（重载时归零）

**Furniture（继承 Entity）**：`name:string`、`col:int`、`sprite:int`、`pushTime:int`、`pushDir:int`；不存 `shouldTake`（Player 引用）
**Chest（继承 Furniture）**：+ `inventory: Inventory`
**Workbench/Anvil/Furnace/Oven/Lantern**：同 Furniture（由 `name` 重建即可，无需额外字段）

**ItemEntity（继承 Entity）**：`item: Item`（经 ItemIO）、`lifeTime:int`、`time:int`（其余物理量 `xx/yy/zz/xa/ya/za` 重载时由 `lifeTime/time` 重算，可不存，简化）
**Spark**：**不持久化**（瞬态弹幕）

**Inventory**：`items: Item[]`（顺序敏感）

**Item 多态（ItemIO 分发 `kind`）**
- `ResourceItem`：`kind="resource"`、`resourceName:string`（唯一，如 `"木"/"石"/"苹果"`）、`count:int`
- `ToolItem`：`kind="tool"`、`toolName:string`（唯一，`"铲"/"锄"/"剑"/"镐"/"斧"`）、`level:int`
- `FurnitureItem`：`kind="furniture"`、`furnitureName:string`（唯一，`"箱子"/"工作台"/...`）、`placed:bool`
- `PowerGloveItem`：`kind="powerglove"`（无字段）

> 唯一性保证：`Resource.name`、`ToolType.name`、`Furniture.name` 在当前代码中均唯一（已核对 `Resource.java` 27 个常量、`ToolType.java` 5 个、`Furniture` 各子类构造传名），可用 `name` 作反查键。需补 3 个静态反查：`Resource.getByName`、`ToolType.getByName`、`Furniture.createByName`（见 §6）。

---

## 4. ADR-3：序列化粒度

### 决策
**全量快照（整档覆盖写）**。

### 理由
- 世界固定 5 层、尺寸固定 128×128；单档体积极小（见下），全量写代价可忽略。
- 增量/差量需要维护“基准档 + 操作日志/脏标记”，复杂度与 bug 面显著上升，且沙箱无法编译验证，风险高。
- 全量覆盖写天然规避“脏增量导致存档损坏”。

### 单次存档预估体积
- 原始 tiles/data：5 层 × 128×128 格 × 2 数组 × 1 字节 = **163,840 字节 ≈ 160KB**（原始）。
- **Base64 编码后**：⌈163840/3⌉×4 = 218,456 字节 ≈ **213KB**（ASCII）。
- 实体：仅存存活实体（≤ `Level.entities` 列表）。早期约数十~数百/层；即便按 5 层 × 200 实体 × ~200B（JSON）≈ 200KB 的极端估计，亦可控。
- 玩家/物品/结构：< 2KB。
- **合计典型 < 0.5MB，极端 < 0.7MB**，**远小于 localStorage ~5MB 上限**。✅ 容量充足，无需分档或压缩。
- 纯 JSON 数字数组备选路径体积约 ~0.5–0.6MB，同样安全。

---

## 5. ADR-4：版本兼容与迁移

### 决策
- 存档根写入 `schemaVersion:int`（当前 `1`）。
- **前向兼容**：反序列化时忽略未知字段（JSON 天然支持）。
- **版本不匹配策略**：
  - 同主版本（仅补丁）：执行注册表中的 `Migration`（`Map<Integer, Migration>`，键=“从版本 N 升到 N+1”）。MVP 仅 v1，表为空。
  - 跨主版本/无法迁移：视为**损坏/不兼容**，丢弃并提示“存档版本不兼容，已重新开始”，走新游戏流程（不崩溃）。
- **结构完整性**：（可选）在根写 `checksum:string`（如 `tiles` 的简易哈希）。读档校验失败 → 丢弃。一般**不需要加密/防篡改**（单机浏览器游戏，价值低；若上线联机再议）。

### 兼容性策略小结
> 每次新增字段 → 只加不改；读取端缺字段用默认值；`schemaVersion` 仅在大改结构时 +1 并登记 migration。

---

## 6. 改动文件清单（精确到文件与方法）

### 6.1 新增基础设施
- **`src/com/mojang/ld22/gwt/Minicraft.gwt.xml`**（改）
  - 新增 `<inherits name="com.google.gwt.storage.Storage"/>`。
- **`src/com/mojang/ld22/save/SaveStore.java`**（新）
  - 封装 `Storage`：`hasSave() / load()→String / save(String) / clear()`。
  - 常量键名 `"minicraft.save"`。
  - 内含 **`Base64`** 工具（`encode(byte[])→String` / `decode(String)→byte[]`，JSNI 用 `btoa/atob`；若弃用则整体改为 JSON 数字数组，见 §3）。
- **`src/com/mojang/ld22/save/SaveManager.java`**（新）
  - `public static String toJson(Game game)` / `public static void fromJson(Game game, String json)`。
  - 编排：Game → 5×Level → 每层 tiles/data(Base64) + entities（经 `EntityIO`）→ player（经 Player.write/read）+ inventory（经 `InventoryIO`）+ items（经 `ItemIO`）。
  - 调用 `SaveStore` 完成落盘/读取；处理 `schemaVersion` 与（可选）`checksum`。

### 6.2 多态分发注册表（实体/物品）
- **`src/com/mojang/ld22/save/EntityIO.java`**（新）
  - `write(Entity e, JSONObject out)`：按 `e` 运行时类型写 `typeId` 与各字段（子类 `write` 调 `super.write`）。
  - `read(JSONObject in)→Entity`：依据 `typeId` 分发构造（`new Player/...`、`new Chest/...` 等），再 `read` 填充。
  - **typeId 分配建议**：`1=Player,2=Zombie,3=Slime,4=AirWizard,6=Chest,7=Workbench,8=Anvil,9=Furnace,10=Oven,11=Lantern,12=ItemEntity`（`5/13+` 预留；`Spark` 不分配，绝不写盘）。
- **`src/com/mojang/ld22/save/ItemIO.java`**（新）
  - `write(Item, JSONObject)` / `read(JSONObject)→Item`，按 `kind` 分发（resource/tool/furniture/powerglove）。

### 6.3 各实体/物品类的 `write/read` 钩子
为最小侵入，采用**集中式 `EntityIO`/`ItemIO` + 各类型静态 `write(Entity,JSONObject)`/`read(JSONObject,Game)` 方法**模式（不强制每个类实现接口，降低对既有继承树的改动；也可改为 `Entity.writeTo(JSONObject)/readFrom(JSONObject)` 接口式，二选一）。下列为每类需提供的方法签名与字段：

- **`Entity`**：`write(Entity,o)` 写 `typeId,x,y,xr,yr`；`read` 设同字段。
- **`Mob`**：追加 `walkDist,dir,hurtTime,xKnockback,yKnockback,maxHealth,health,swimTimer,tickTime`。
- **`Player`**：追加 `inventory(InventoryIO),attackItem(ItemIO),activeItem(ItemIO),stamina,staminaRecharge,staminaRechargeDelay,score,maxStamina,invulnerableTime`。
  - ⚠️ **`Player` 构造函数需改造**：现有 `Player(Game,InputHandler)` 在构造时 `inventory.add(new Workbench())` + `add(new PowerGloveItem())`。读档若直接 `new Player(...)` 会**重复塞入初始物品**。新增 `Player(Game, InputHandler, boolean seedStartingItems)`，默认 `true` 保持现状；`loadGame()` 传 `false`，随后由 `read` 填充 `inventory`，避免重复。
- **`Zombie`/`Slime`**：追加 `lvl`。
- **`AirWizard`**：仅 Mob 字段；攻击计时器不写（重载归零）。
- **`Furniture`**：`write/read` 写 `name,col,sprite,pushTime,pushDir`（`shouldTake` 不写）。
- **`Chest`**：`write/read` 先 `super`，再写/读 `inventory`（其 `Inventory` 字段）。
- **`ItemEntity`**：写 `item(ItemIO),lifeTime,time`（`xx/yy/zz/xa/ya/za` 重载时由这两个值重算，可不写）。
- **`Inventory`**：`write(Inventory,o)` 写 `items:Item[]`；`read` 逐条 `ItemIO.read` 重建列表。
- **物品类**：`ResourceItem` 写 `kind,resourceName(Resource.name),count`；`ToolItem` 写 `kind,toolName(ToolType.name),level`；`FurnitureItem` 写 `kind,furnitureName(Furniture.name),placed`；`PowerGloveItem` 写 `kind`（无字段）。读时分别 `Resource.getByName` / `ToolType.getByName` / `Furniture.createByName` 重建。

### 6.4 反查工厂/方法（需在既有类中补）
- **`Resource.java`**：新增 `private static Map<String,Resource> BY_NAME`（类初始化时登记全部 27 个常量）+ `public static Resource getByName(String)`。
- **`ToolType.java`**：新增 `private static Map<String,ToolType> BY_NAME` + `public static ToolType getByName(String)`。
- **`Furniture.java`**：新增 `public static Furniture createByName(String name)`（`switch(name)` → `new Chest()/Workbench()/Anvil()/Furnace()/Oven()/Lantern()`；未知返回 null）。

### 6.5 `Level.java`（读档绕过生成的关键）
- 新增**工厂方法**（非构造体，避免触发 `LevelGen`）：
  ```java
  // 示意：绕过 LevelGen + 楼梯开挖 + AirWizard 自动添加
  public static Level fromSave(int w, int h, int depth, byte[] tiles, byte[] data) {
      Level l = new Level();        // 私有无参构造，仅建 entitiesInTiles/数组壳
      l.w = w; l.h = h; l.depth = depth;
      l.tiles = tiles; l.data = data;
      // 颜色/密度按 depth 确定性重算（与现有构造逻辑一致）
      if (depth < 0) l.dirtColor = 222;
      if (depth == 1) l.dirtColor = 444;
      if (depth < 0 || depth > 0) l.monsterDensity = 4; else l.monsterDensity = 8;
      l.entitiesInTiles = new ArrayList[w * h];
      for (int i = 0; i < w * h; i++) l.entitiesInTiles[i] = new ArrayList<Entity>();
      return l;   // 注意：不 add AirWizard；若存档含存活 AirWizard，由 entities 恢复
  }
  ```
- 序列化读取端：`SaveManager` 对每层 `fromSave(...)` 后，逐一对存档中的 `Entity` 调 `EntityIO.read` 并 `l.add(entity)`（自动设置 `entity.level`、`level.player`、空间哈希）。
- `tiles`/`data` 已是 `public`，`SaveManager` 可直接读；无需额外 accessor（如需封装可加 `getTiles()/getData()`）。

### 6.6 `Game.java`
- 新增：
  - `public boolean hasSave()` → `SaveStore.hasSave()`。
  - `public void saveGame()` → `SaveManager.toJson(this)` → `SaveStore.save(...)`。建议加 `try/catch`：localStorage 写满/隐私模式抛异常时静默失败，不影响游戏。
  - `public void loadGame()` → `String s = SaveStore.load()`；`SaveManager.fromJson(this, s)` 重建 `levels/currentLevel/level/player/gameTime`；`setMenu(null)` 进入游戏。
- **新游戏 vs 读档分支**：
  - 保留 `resetGame()` 为“新世界”生成（现有逻辑不变）。
  - 标题菜单“继续游戏”→ `loadGame()`；标题“开始游戏”→ `resetGame()` + `setMenu(null)`（现状）。
- **自动存档触发点**（在 `Game` 内）：
  - `tick()` 中：当 `menu == null` 且 `gameTime % AUTOSAVE_INTERVAL == 0`（建议 `AUTOSAVE_INTERVAL = 1800`，即 30s@60fps）调用 `saveGame()`。
  - `tick()` death 触发：`if (playerDeadTime > 60) { saveGame(); setMenu(new DeadMenu()); }` —— ⚠️见 §8 风险：死亡瞬间 `player.removed=true`，若此时存盘，读档会瞬间再触发 DeadMenu。建议**死亡不自动存**（用上面的定时+关闭存即可），或 `saveGame()` 前先不保存已死玩家（仅当 `!player.removed` 才存玩家状态）。
  - `won()` / `wonTimer` 归零触发 `WonMenu` 同理：建议不自动存（见 §8）。
  - **页面关闭**：在 `Game` 构造或 `GwtMinicraft.go()` 中加 `Window.addWindowClosingHandler(e -> saveGame())`（同步写，GWT 2.4 支持）。

### 6.7 `TitleMenu.java`（加“继续游戏”）
- 将 `options` 改为**动态**：若 `game.hasSave()` 则前插 `"继续游戏"`。
  ```java
  // 示意
  private String[] getOptions() {
      return game.hasSave()
          ? new String[]{ "继续游戏", "开始游戏", "玩法说明", "关于" }
          : new String[]{ "开始游戏", "玩法说明", "关于" };
  }
  private int continueIndex() { return game.hasSave() ? 0 : -1; }
  public void tick() {
      String[] opts = getOptions();
      if (input.up.clicked) selected--;
      if (input.down.clicked) selected++;
      selected = (selected + opts.length) % opts.length;
      if (input.attack.clicked || input.menu.clicked) {
          if (selected == continueIndex()) { game.loadGame(); return; } // 读档
          if (opts[selected].equals("开始游戏")) { Sound.test.play(); game.resetGame(); game.setMenu(null); return; }
          if (opts[selected].equals("玩法说明")) { game.setMenu(new InstructionsMenu(this)); return; }
          if (opts[selected].equals("关于")) { game.setMenu(new AboutMenu(this)); return; }
      }
  }
  public void render(Screen screen) { /* 用 getOptions() 渲染，selected 高亮；其余绘制逻辑不变 */ }
  ```
- 渲染与现状一致，仅选项数组来源改为 `getOptions()`。

### 6.8 `DeadMenu.java` / `WonMenu.java`（自动存档触发点，可选）
- 现状 `tick()` 在 `inputDelay` 后 `game.setMenu(new TitleMenu())`。
- **推荐：此处不自动存**（避免死亡/通关态被持久化）。保持原样返回标题即可；存档反映的是上一次“进行中”的定时/关闭存盘。
- 若产品要求“死亡也留档”，则在 `game.setMenu(new TitleMenu())` 前插入 `game.saveGame()`，并**务必**让 `saveGame()` 在 `player.removed` 时跳过玩家状态写入（仅存世界），否则读档会立即重入 DeadMenu。

---

## 7. 关键代码骨架 / 伪代码（完整 save/load 流程，GWT 2.4 API）

> 以下为**示意骨架**，标注 `// 需本地编译验证` 处依赖 GWT 2.4 实际 API（`com.google.gwt.json.client.*`、`com.google.gwt.storage.client.Storage`、JSNI `btoa/atob`）。

### 7.1 SaveStore（落盘 + Base64）
```java
package com.mojang.ld22.save;
import com.google.gwt.storage.client.Storage;

public final class SaveStore {
    private static final String KEY = "minicraft.save";
    private static Storage storage() { return Storage.getIfSupported(); } // 需本地编译验证：GWT 2.4 返回 Storage 或 null

    public static boolean hasSave() {
        Storage s = storage();
        return s != null && s.getItem(KEY) != null;
    }
    public static void save(String json) {
        Storage s = storage();
        if (s != null) s.setItem(KEY, json); // 隐私模式/配额满会抛异常，调用方 try/catch
    }
    public static String load() {
        Storage s = storage();
        return s == null ? null : s.getItem(KEY);
    }
    public static void clear() {
        Storage s = storage();
        if (s != null) s.removeItem(KEY);
    }

    // Base64（JSNI，依赖浏览器 btoa/atob；ie9/gecko1_8/safari/opera 均支持）
    public static native String base64Encode(byte[] data) /*-{
        var s = "";
        for (var i = 0; i < data.length; i++) s += String.fromCharCode(data[i] & 0xff);
        return btoa(s);
    }-*/;
    public static native byte[] base64Decode(String s) /*-{
        var bin = atob(s);
        var a = new Array(bin.length);
        for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
        return a; // GWT 会将 JS number 数组协变为 byte[]（低 8 位）；需本地编译验证
    }-*/;
}
```

### 7.2 SaveManager（编排，节选）
```java
package com.mojang.ld22.save;
import com.google.gwt.json.client.*;

public final class SaveManager {
    public static final int SCHEMA_VERSION = 1;

    public static String toJson(Game game) {
        JSONObject root = new JSONObject();
        root.put("schemaVersion", new JSONNumber(SCHEMA_VERSION));
        root.put("gameTime", new JSONNumber(game.gameTime));
        root.put("currentLevel", new JSONNumber(game.currentLevel));

        JSONArray levels = new JSONArray();
        for (int i = 0; i < 5; i++) {
            Level lv = game.levels[i];
            JSONObject lo = new JSONObject();
            lo.put("depth", new JSONNumber(lv.depth));
            lo.put("w", new JSONNumber(lv.w));
            lo.put("h", new JSONNumber(lv.h));
            lo.put("tiles", new JSONString(SaveStore.base64Encode(lv.tiles))); // 需编译验证
            lo.put("data", new JSONString(SaveStore.base64Encode(lv.data)));
            JSONArray ents = new JSONArray();
            int idx = 0;
            for (Entity e : lv.entities) {
                if (e instanceof Spark) continue; // 瞬态不存
                ents.set(idx++, EntityIO.write(e));
            }
            lo.put("entities", ents);
            levels.set(i, lo);
        }
        root.put("levels", levels);
        root.put("player", EntityIO.write(game.player)); // Player 分支
        return root.toString();
    }

    public static void fromJson(Game game, String json) {
        JSONObject root = JSONParser.parseStrict(json).isObject(); // 需编译验证方法名
        int ver = (int) root.get("schemaVersion").isNumber().doubleValue();
        if (ver != SCHEMA_VERSION) { /* 见 ADR-4：丢弃/迁移 */ game.resetGame(); return; }

        game.gameTime = (int) root.get("gameTime").isNumber().doubleValue();
        game.currentLevel = (int) root.get("currentLevel").isNumber().doubleValue();
        JSONArray levels = root.get("levels").isArray();
        for (int i = 0; i < 5; i++) {
            JSONObject lo = levels.get(i).isObject();
            int w = (int) lo.get("w").isNumber().doubleValue();
            int h = (int) lo.get("h").isNumber().doubleValue();
            int depth = (int) lo.get("depth").isNumber().doubleValue();
            byte[] tiles = SaveStore.base64Decode(lo.get("tiles").isString().stringValue()); // 需编译验证
            byte[] data  = SaveStore.base64Decode(lo.get("data").isString().stringValue());
            Level lv = Level.fromSave(w, h, depth, tiles, data);
            JSONArray ents = lo.get("entities").isArray();
            for (int j = 0; j < ents.size(); j++) {
                Entity e = EntityIO.read(ents.get(j).isObject()); // 按 typeId 分发重建
                lv.add(e); // 设置 level/player 引用 + 空间哈希
            }
            game.levels[i] = lv;
        }
        game.player = (Player) EntityIO.read(root.get("player").isObject()); // 重建玩家(不塞初始物品)
        game.level = game.levels[game.currentLevel];
        game.level.add(game.player);
    }
}
```

### 7.3 EntityIO（多态分发，节选）
```java
public final class EntityIO {
    // typeId: 1=Player,2=Zombie,3=Slime,4=AirWizard,6=Chest,7=Workbench,8=Anvil,9=Furnace,10=Oven,11=Lantern,12=ItemEntity
    public static JSONObject write(Entity e) {
        JSONObject o = new JSONObject();
        if (e instanceof Player)      { o.put("typeId", new JSONNumber(1));  writeMob((Mob)e, o); writePlayer((Player)e, o); }
        else if (e instanceof Zombie){ o.put("typeId", new JSONNumber(2));  writeMob((Mob)e, o); o.put("lvl", new JSONNumber(((Zombie)e).lvl)); }
        else if (e instanceof Slime) { o.put("typeId", new JSONNumber(3));  writeMob((Mob)e, o); o.put("lvl", new JSONNumber(((Slime)e).lvl)); }
        else if (e instanceof AirWizard){ o.put("typeId", new JSONNumber(4)); writeMob((Mob)e, o); }
        else if (e instanceof Chest)  { o.put("typeId", new JSONNumber(6));  writeFurniture(e, o); /* + inventory */ }
        else if (e instanceof Workbench){ o.put("typeId", new JSONNumber(7)); writeFurniture(e, o); }
        else if (e instanceof Anvil)  { o.put("typeId", new JSONNumber(8));  writeFurniture(e, o); }
        else if (e instanceof Furnace){ o.put("typeId", new JSONNumber(9));  writeFurniture(e, o); }
        else if (e instanceof Oven)   { o.put("typeId", new JSONNumber(10)); writeFurniture(e, o); }
        else if (e instanceof Lantern){ o.put("typeId", new JSONNumber(11)); writeFurniture(e, o); }
        else if (e instanceof ItemEntity){ o.put("typeId", new JSONNumber(12)); writeEntityBase(e, o); o.put("item", ItemIO.write(((ItemEntity)e).item)); o.put("lifeTime", new JSONNumber(((ItemEntity)e).lifeTime)); o.put("time", new JSONNumber(((ItemEntity)e).time)); }
        return o;
    }
    // read(): 依据 typeId new 对应类，再回填字段（Player 用 seedStartingItems=false 构造）
    // writeEntityBase/writeMob/writeFurniture/writePlayer 各自 put 对应字段（见 §3 映射表）
}
```

---

## 8. 风险与未知项

1. **沙箱无法编译（最高优先级）**：本环境无 Java/GWT 编译器。所有 `// 需本地编译验证` 处（`Storage.getIfSupported()`、`JSONParser.parseStrict`、`base64Decode` 的 `byte[]` 协变、JSNI `btoa/atob` 在 `ie9` 行为）**必须**在本地 `ant clean && ant build` + GWT 2.4 SDK 验证。建议先用 GWT 自带的 `Storage` 示例确认 API 名称。
2. **实体多态反序列化复杂度**：`EntityIO.read` 需按 `typeId` 精确 new 对应类并回填；新增实体类时易漏登记 → 约定“新增可序列化实体必须同步更新 `EntityIO` + `typeId` 表 + 单元测试”。
3. **自动存档频率的性能/体积影响**：定时 30s 全量写 ~0.5MB 字符串到 localStorage，同步写可能带来 1–数帧卡顿；建议（a）仅 `menu==null` 时存、（b）首次实现可放到 `WindowClosingHandler` 为主、定时为辅助、（c）避免每帧存。若卡顿明显，可降频至 60s 或仅在关卡切换/拾取时存。
4. **死亡/通关自动存的“读档即死”陷阱**：若 death 瞬间存盘且含 `player.removed=true`，`loadGame()` 会立即重入 DeadMenu。规避：死亡/通关**不自动存**，仅用定时+关闭存（反映“进行中”状态）；如要死亡也存，必须让 `saveGame()` 在 `player.removed` 时跳过玩家块。
5. **`Player` 构造塞初始物品**：读档复用 `new Player(...)` 会重复 Workbench/PowerGlove，必须加 `seedStartingItems` 开关（见 §6.3）。
6. **`Level` 构造强耦合生成**：必须走 `fromSave` 工厂绕过 `LevelGen`/楼梯开挖/AirWizard 自动添加（见 §6.5），否则存档被覆盖。
7. **存档加密/防篡改**：一般不需（单机浏览器）。如需防手改分数，可加 `checksum` 字段做完整性校验（不防高手），不加密。
8. **与既有任务共存**：`Game` 已含 `scale`/resize（大屏自适应）、`Font` 汉化。`saveGame/loadGame/hasSave` 与 `WindowClosingHandler` 均为新增，不改动 render/resize/Font；新增关闭钩子与既有 `addResizeHandler` 独立，无冲突。
9. **`localStorage` 隐私/配额**：无痕模式或配额满时 `setItem` 抛异常，调用方需 `try/catch` 静默失败，且不因此阻塞游戏。
10. **存量差异**：本移植无 Cow/Pig/Sheep/FoodItem/ArrowProjectile，方案仅覆盖现存类；若未来加回，只需扩 `EntityIO`/`typeId` 表。

---

## 9. 建议落地步骤清单（分阶段，MVP 优先）

**阶段 0 — 前置（必需，1 行）**
- [ ] `Minicraft.gwt.xml` 加 `<inherits name="com.google.gwt.storage.Storage"/>`。

**阶段 1 — MVP：退出自动存 + 继续游戏（核心闭环）**
- [ ] 新增 `SaveStore`（含 `Base64` 或退化 JSON 数字数组二选一）。
- [ ] 新增 `SaveManager.toJson/fromJson` + `EntityIO`/`ItemIO` 基础版（Player/Zombie/Slime/AirWizard/Furniture 各子类/ItemEntity/Inventory/四类 Item）。
- [ ] `Level.fromSave` 工厂；`Resource.getByName`/`ToolType.getByName`/`Furniture.createByName`。
- [ ] `Player` 加 `seedStartingItems` 开关。
- [ ] `Game.saveGame/loadGame/hasSave`；`GwtMinicraft.go()` 加 `Window.addWindowClosingHandler → saveGame()`。
- [ ] `TitleMenu` 动态加“继续游戏”（仅 `hasSave()` 时）。
- [ ] 本地编译 + 手测：新游戏→玩一会→关闭→重开→“继续游戏”→世界/背包/血量一致。

**阶段 2 — 健壮性**
- [ ] `Game.tick()` 定时自动存（30s，`menu==null` 时）。
- [ ] `schemaVersion` + 不兼容丢弃提示 + 可选 `checksum`。
- [ ] `saveGame` 异常兜底（隐私/配额）。

**阶段 3 — 体验增强（可选）**
- [ ] death/win 自动存（注意 §8 第 4 点陷阱）或“死亡清档”。
- [ ] 多存档槽 / 存档列表菜单。
- [ ] 导出/导入存档文件（`<input type=file>` + `Blob`/`download`），作为备份分享。

---

## 附录 A：存档 JSON 结构示意（节选）
```json
{
  "schemaVersion": 1,
  "gameTime": 12345,
  "currentLevel": 3,
  "levels": [
    { "depth": -3, "w": 128, "h": 128,
      "tiles": "<base64 ~32KB>", "data": "<base64 ~32KB>",
      "entities": [
        { "typeId": 2, "x": 1234, "y": 5678, "lvl": 1, "health": 10, "maxHealth": 10, ... },
        { "typeId": 12, "x": 200, "y": 300, "item": {"kind":"resource","resourceName":"木","count":5}, "lifeTime": 600, "time": 10 },
        { "typeId": 6, "x": 400, "y": 400, "name":"箱子", "col":..., "sprite":1, "inventory": { "items": [ ... ] } }
      ]
    }
    /* ... 其余 4 层 ... */
  ],
  "player": {
    "typeId": 1, "x": 1024, "y": 1024, "health": 8, "maxHealth": 10,
    "stamina": 10, "score": 120, "maxStamina": 10, "invulnerableTime": 0,
    "inventory": { "items": [
        {"kind":"tool","toolName":"剑","level":2},
        {"kind":"resource","resourceName":"苹果","count":3},
        {"kind":"furniture","furnitureName":"箱子","placed":false}
    ]},
    "activeItem": {"kind":"tool","toolName":"斧","level":1},
    "attackItem": null
  }
}
```
