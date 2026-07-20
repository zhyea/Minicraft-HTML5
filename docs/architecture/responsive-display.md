# 大屏自适应显示（Responsive Display）技术方案

- 模块：显示 / 渲染层（仅显示层，不动渲染与玩法）
- 目标引擎 / SDK：GWT 2.4 + GWT Canvas（`com.google.gwt.canvas.*`）
- 范围：让 160×120 内部渲染缓冲在大屏上按整数倍动态放大、像素锐利、居中、黑边 letterbox。

---

## 1. 目标与不变量

| 项目 | 处理 |
| --- | --- |
| 内部渲染分辨率 | **保持不变** 160×120（`canvas.setCoordinateSpaceWidth(HEIGHT)` 不动） |
| `Screen` / `Font` / 像素渲染逻辑 | **完全不动**（`Game.render()` 一字未改） |
| 玩法逻辑 | **完全不动** |
| 显示层（CSS 尺寸 / 缩放 / 居中 / 锐化） | 本次改动范围 |

核心思路：**内部 buffer 永远是 160×120，只改 canvas 的 CSS 显示尺寸与缩放方式**。浏览器把 160×120 的位图整数倍拉伸到 `WIDTH*scale × HEIGHT*scale`，配合 `image-rendering: pixelated` 保持像素锐利。

---

## 2. 改动文件清单

| 文件 | 改动 |
| --- | --- |
| `src/com/mojang/ld22/Game.java` | 移除写死的 `static int SCALE = 3`；新增实例字段 `scale`；新增 `computeScale()` / `applyDisplaySize()` / `getDisplayWidth()` / `getDisplayHeight()`；构造里用 `computeScale()` 驱动尺寸并注册 `Window` resize 监听；移除 `if (isMobileBrowser) SCALE*=2` |
| `src/com/mojang/ld22/gwt/GwtMinicraft.java` | 容器宽度改用 `game.getDisplayWidth()`；新增 `Window` resize 监听同步容器宽度；给根 `FlowPanel` 加 `appRoot` 居中样式类 |
| `war/Minicraft.css` | `body` 改为 flex 居中 + 黑底 letterbox；新增 `.appRoot { margin:auto }`；`canvas` 升级为 `image-rendering: pixelated`（保留 `-moz-crisp-edges` / `-webkit-optimize-contrast` / `-ms-interpolation-mode` 兼容回退），背景改黑 |

---

## 3. 关键实现点

### 3.1 动态整数倍缩放 `computeScale()`

```java
private int computeScale() {
    int sx = Window.getClientWidth()  / WIDTH;   // 整数除法即 floor
    int sy = Window.getClientHeight() / HEIGHT;
    int s  = Math.min(sx, sy);
    if (s < 1) s = 1;                          // 兜底，至少 1 倍
    if (isMobileBrowser && s < 2) s = 2;        // 移动端保底 2 倍（原 SCALE*=2 语义）
    return s;
}
```

- `Window.getClientWidth()/getClientHeight()` 是 GWT 2.4 对 `window.innerWidth/innerHeight` 的封装（视口尺寸，无滚动条时即 inner 尺寸）。
- 整数除法天然 floor，得到「能放进视口的最大整数倍」，`Math.min` 取宽高约束的较小值，保证横竖都不溢出。
- `scale = max(1, floor(min(vw/W, vh/H)))`，与需求公式一致。

### 3.2 把缩放写进显示层 `applyDisplaySize()`

```java
private void applyDisplaySize() {
    canvas.setWidth (WIDTH  * scale + "px");   // 仅改 CSS 显示尺寸
    canvas.setHeight(HEIGHT * scale + "px");
    canvas.getElement().getStyle().setProperty("image-rendering", "pixelated");
}
```

- `canvas.setWidth/setHeight`（来自 `UIObject`）只设 **CSS 宽高**；`canvas.setCoordinateSpaceWidth/Height(WIDTH/HEIGHT)` 仍把**绘制缓冲**钉在 160×120 —— 二者分离正是「内部分辨率不变、显示自适应」的关键。
- 内联 `image-rendering: pixelated` 与 CSS 双保险：即便样式表被覆盖，canvas 仍锐利。

### 3.3 构造与 resize 监听

```java
public Game(boolean isMobileBrowser) {
    this.isMobileBrowser = isMobileBrowser;
    this.scale = computeScale();
    ...
    canvas.setStyleName("mainCanvas");
    applyDisplaySize();                          // 构造后立刻算一次尺寸
    canvas.setCoordinateSpaceWidth(WIDTH);
    canvas.setCoordinateSpaceHeight(HEIGHT);

    Window.addResizeHandler(new ResizeHandler() { // GWT 2.4: com.google.gwt.user.client.Window
        @Override public void onResize(ResizeEvent event) {
            scale = computeScale();
            applyDisplaySize();
        }
    });
    ...
}
```

- `Game` 只负责 canvas 自身尺寸；容器（holder）由 `GwtMinicraft` 用另一个 resize 监听同步，二者解耦（见 3.4）。
- resize 仅改 CSS 样式，**不重新分配 160×120 缓冲、不触发重渲染**，开销极低。

### 3.4 容器同步（GwtMinicraft）

```java
_gameHolder.setWidth(game.getDisplayWidth() + "px");   // 初值来自动态 scale
Window.addResizeHandler(new ResizeHandler() {
    @Override public void onResize(ResizeEvent event) {
        _gameHolder.setWidth(game.getDisplayWidth() + "px");
    }
});
```

- `Game` 的 resize 监听先于 `GwtMinicraft` 注册，故容器读到的是已更新的 `scale`。
- `game` 在 `go()` 内为 effectively-final 局部变量，匿名内部类可安全捕获。

### 3.5 居中 + 黑边（CSS）

```css
body { display: flex; background-color: #000; }   /* flex 居中 + 黑底 letterbox */
.appRoot { margin: auto; }                         /* 整块在视口内水平+垂直居中 */
canvas {
    background-color: #000;
    image-rendering: -moz-crisp-edges;            /* 旧引擎回退 */
    image-rendering: -webkit-optimize-contrast;
    image-rendering: pixelated;                    /* 现代标准，放最后 */
    -ms-interpolation-mode: nearest-neighbor;
}
```

- `margin: auto` 在 flex 容器内：视口够大时整体居中；内容超过视口时 auto 边距塌缩、对齐到顶部（不会上下对称裁切把顶部也切掉），比 `justify-content:center` 更安全。
- `image-rendering` 回退链：现代浏览器取最后的 `pixelated`，旧 Firefox 取 `-moz-crisp-edges`，旧 IE 取 `-ms-interpolation-mode`。

---

## 4. 为什么渲染逻辑完全不用动

`Game.render()` 仍把 160×120 写入 `imageData` 并 `context.putImageData(imageData, 0, 0)` 到 160×120 的缓冲；缩放发生在 CSS 层（160×120 → 显示尺寸），与绘制无关。`render()` 内那段被 `/* */` 注释掉的软件缩放旧代码未触动，其中残留的 `SCALE` 引用属于死注释，不影响编译与运行。

---

## 5. 移动端处理

- 原 `if (isMobileBrowser) SCALE*=2`（把 3 变成固定 6）改为 `computeScale()` 中「移动端最小 2 倍」的下限保护。真实手机视口算出的 scale 通常已是 2，因此体验等于或优于原固定 6（原来在窄屏会溢出）。
- 移动端仍走 `Window.scrollTo(0,1)` 隐藏地址栏、`isMobileBrowser` 跳过 focus/blur 监听等原逻辑，未改动。

---

## 6. 已知风险

1. **移动端垂直居中 / 溢出**：`body` 改为 flex 居中后，整块（控件 + 游戏 + 虚拟手柄）在矮屏上可能高于视口；`margin:auto` 会把它对齐到顶（非对称裁切），与原来 `overflow:hidden` 的表现类似。虚拟手柄区（700px）在极矮屏底部可能被裁。建议后续按设备单独验证，必要时对移动端改用 `overflow:auto` 或独立布局。
2. **resize 性能**：每次 resize 仅更新 CSS 样式与容器宽度，无缓冲重分配、无重渲染，开销可忽略。极端高频 resize（如拖拽窗口）下可加 debounce（例如 `Timer` 节流 100ms），当前非必需。
3. **与后续汉化字体管线的协调**：本任务与汉化任务**都改 `Game.java`**，且都集中在构造 / `render()` 周边。本任务新增了 `computeScale()`、`applyDisplaySize()`、getter 及一个 resize 匿名类，均未触碰 `render()` 主体、`Screen`/`Font`。汉化任务若需改 `render()`（如切中文字体 atlas），与本任务无冲突；但若汉化也要在构造里加初始化（如字体资源加载），注意 `scale = computeScale()` 与 canvas 创建顺序、以及 `applyDisplaySize()` 应在 canvas 非空后调用（当前已保证）。建议两任务串行提交、各自基于最新 `Game.java`，合并时用 `git` 比对构造与 `render()` 段落。
4. **超大显示器**：4K/5K 上 scale 可达 18+，canvas CSS 尺寸达 2880×2160，CSS 缩放仍 cheap，无性能问题；仅极端情况 GPU 合成开销略增，可接受。
5. **`image-rendering: pixelated` 兼容性**：非常老的浏览器（如旧版 Safari/IE）不识别 `pixelated`，已用 `-webkit-`/`-moz-`/`ms-` 回退；即便全不识别，画面仍会显示（只是可能轻微插值），不会崩。

---

## 7. 编译验证说明（重要）

- **沙箱内无 Java / GWT 编译器**，本次改动**未能在本地编译验证**，仅按 GWT 2.4 API 人工核对正确性。
- 使用的 GWT 2.4 API 及其归属：
  - `com.google.gwt.user.client.Window.getClientWidth()/getClientHeight()`
  - `com.google.gwt.user.client.Window.addResizeHandler(ResizeHandler)`
  - `com.google.gwt.event.logical.shared.ResizeHandler` / `ResizeEvent`
  - `com.google.gwt.dom.client.Style.setProperty(String, String)`（canvas 内联 `image-rendering`）
  - `com.google.gwt.canvas.client.Canvas.setWidth/setHeight`（CSS）/ `setCoordinateSpaceWidth/Height`（缓冲）
- **需用户在本地执行以下命令验证**（依赖本地 `ant` + GWT 2.4 SDK）：
  ```bash
  cd D:/MyDevelop/JSDevelop/Minicraft-HTML5
  ant clean
  ant build        # 或项目约定的 GWT compile 目标
  ```
- 验证要点：
  1. 编译通过（确认 `SCALE` 静态字段已移除、无未定义引用；注释中的 `SCALE` 残留不影响编译）。
  2. 桌面大屏：画面随窗口整数倍放大、像素锐利（无模糊）、居中、四周黑边。
  3. 缩放窗口：画面平滑重算整数倍、不变形、不模糊。
  4. 移动端（或浏览器移动模拟）：至少 2 倍、可读、无横向溢出崩坏。

---

## 8. 后续建议

- 若希望游戏严格贴合视口（含顶部控件/底部版权条），可把控件与版权高度计入 `computeScale()` 的可用高度，进一步压低 scale 留出余量；当前按「整屏」计算，控件可能在大屏上把底部版权推到视口外（被 `overflow:hidden` 裁掉），属可接受的非阻塞问题。
- 虚拟手柄（移动端）在响应式布局下如需重新定位，可随 `getDisplayWidth()` 等比调整，但超出本次范围。
