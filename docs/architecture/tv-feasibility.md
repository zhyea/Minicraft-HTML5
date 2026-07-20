# Minicraft-HTML5 电视端（小米电视）迁移可行性分析报告

> 作者：技术可行性研究（tv-feasibility）
> 日期：2026-07-20
> 范围：研究 + 写作，未修改任何源码
> 前置任务依赖：本文档建立在当前并行进行的「汉化」与「大屏自适应」两项任务之上

---

## 1. 总体结论

**结论：条件可行（Conditional / 可行）。**

| 维度 | 评估 |
|------|------|
| 运行环境 | ✅ 可行。小米电视 PatchWall 基于 Android TV 深度定制（Android 9/11/12），其内置浏览器与系统 WebView 均为 Chromium 内核，HTML5 Canvas 2D 完全支持。 |
| 显示适配 | ✅ 可行。`160×120`（4:3）内容以整数倍（9 倍 → `1440×1080`）缩放居中 letterbox，`image-rendering: pixelated` 保清晰，可复用已知的大屏自适应任务逻辑。 |
| 输入适配 | ⚠️ 条件可行。遥控器键位可通过 keyCode 映射到游戏动作，但**焦点管理**与**返回键/主页键拦截**是关键难点，需对 `InputHandler` 与壳层（APK 方案）做针对性改造。 |
| 分发 | ✅ 可行。推荐「Android TV APK + WebView 加载本地 HTML」方案，体验与控制力最佳。 |

**置信度：高（运行环境/显示）/ 中（输入细节，需真机验证）。**

**前提条件：**
1. 真机测试（至少 1–2 款主流小米电视型号）验证 keyCode 与焦点行为，不可仅依赖文档。
2. 当前「汉化」（中文点阵字体）任务完成——否则遥控器进入中文菜单后为乱码/空白。
3. 当前「大屏自适应」任务完成——显示缩放逻辑作为本报告第 3 节的基础。

---

## 2. 运行环境可行性：小米电视 WebView / 浏览器运行 HTML5 Canvas

**2.1 系统层面**

小米电视的 PatchWall 系统是在 **Android TV 之上深度定制的 UI 皮肤**（资料来源 [3][5]）。主流机型分别对应 Android TV 9.0 / 11 / 12。Android TV 11+ 对 WebGL 2.0、现代 JS（含 ES2015+、WASM）有完整支持（资料来源 [4]）。

**2.2 浏览器 / WebView 内核**

- 小米电视**内置浏览器为 Chromium 内核**（基于 Google Chrome 内核开发），支持 HTML / CSS / JavaScript / Canvas（资料来源 [2][5]）。第三方「小米 TV 版 Chrome」标注内核 Chromium 120+，分辨率支持 720p/1080p/4K（资料来源 [1]，注意该来源为第三方描述，版本号仅作参考）。
- 在「打包 APK 用 WebView 加载本地 HTML」方案中，运行的是 **Android System WebView**（同样是 Chromium 内核）。因此无论走「浏览器直访」还是「APK 壳」，游戏都跑在 Chromium 上，Canvas 2D 兼容性有保障。

**2.3 性能**

Minicraft-HTML5 内部分辨率仅 `160×120`、纯 2D Canvas、逻辑 Tick 固定 60Hz（`Game.java:222` `msPerTick = 1000.0/60`），渲染负载极低。同类 1080p 页游在四核 A53/A55 + Mali GPU 上实测可达 55–60fps（资料来源 [4]）。本游戏负载远低于此，**性能不是瓶颈**。

**结论：运行环境可行，无根本性技术障碍。**

---

## 3. 显示适配：1080p 整数缩放居中方案（复用大屏自适应任务）

**3.1 现状（`Game.java`）**

- 内部渲染分辨率固定 `WIDTH=160, HEIGHT=120`（`Game.java:33-34`），`SCALE=3`（桌面）/ 移动端 `SCALE*=2`（`Game.java:35,86`）。
- Canvas 通过 GWT 设置 CSS 尺寸 `WIDTH*SCALE`（`Game.java:101-104`）。
- CSS 已配置 `image-rendering` 系列（`war/Minicraft.css:13-20`）但**缺少 `pixelated` 标准值**，且为 `optimizeSpeed` 等旧写法，TV Chromium 下应补 `pixelated`。

**3.2 1080p 适配方案**

电视主流分辨率为 1920×1080。将 `160×120`（4:3）按**整数倍**放大：

- `160×120 × 9 = 1440×1080`（9 倍），水平居中留 240px 黑边（左右各 120px）。
- 比 8 倍（`1280×960`）更充分利用垂直空间，比 10 倍（`1600×1200`）超出 1080 高度，故 **9 倍为 1080p 下最大整数倍**。

```
目标：scale = floor(min(1920/160, 1080/120)) = floor(min(12, 9)) = 9
显示尺寸：1440 × 1080，居中 letterbox
```

**要点：**
- 内部 Canvas 分辨率保持 `160×120`（游戏逻辑零改动）。
- 仅通过 **CSS 尺寸 + `image-rendering: pixelated`** 放大，避免模糊（最近邻插值）。
- 同时设置 `ctx.imageSmoothingEnabled = false` 以防缩放伪影（资料来源 [4][5]）。
- body 背景设为黑色，letterbox 黑边自然融入。

**3.3 与大屏自适应任务的复用关系**

本方案与团队正在进行的「大屏自适应」任务**共用同一套逻辑**：自适应任务已规划按视口动态计算 `SCALE` 并居中。电视端只需在其基础上：
- 约束为整数倍（而非任意小数倍），确保像素清晰；
- 将目标视口视为固定 `1920×1080`（电视无响应式窗口缩放，可简化为常量）；
- 补充 `image-rendering: pixelated`（若自适应任务尚未覆盖）。

> 显示层无需为大屏另起炉灶，直接复用并「整数倍化」即可。

---

## 4. 输入适配（重点）

**4.1 现状（`InputHandler.java`）**

当前键盘映射（节选，`InputHandler.java:78-103`）：
- 方向：`'8'/'2'/'4'/'6'`（小键盘）、`W/S/A/D`、`KEY_UP/DOWN/LEFT/RIGHT` → `up/down/left/right`
- 攻击 `attack`：`' '`(空格)、`CTRL`、`'0'`、`45`、`'C'`
- 菜单 `menu`：`TAB`、`ALT`、`'X'`、`KEY_ENTER`(13)

GWT 事件已调用 `event.preventDefault()`（`InputHandler.java:69,75`）——这是 TV 上**阻止页面滚动/返回**的良好基础，需保留并扩展。

**4.2 遥控器键位 → 游戏动作映射表**

经小米官方开发者文档与 Android KeyEvent 标准核对（资料来源 [2][3][4]），推荐映射如下：

| 遥控器按键 | Android keyCode | `event.keyCode`（WebView/JS） | 映射到游戏动作 | 说明 |
|-----------|----------------|-------------------------------|----------------|------|
| 上 / Down | `KEYCODE_DPAD_UP` (19) | `19` / `ArrowUp` | `up` | 移动 / 菜单上移 |
| 下 / Down | `KEYCODE_DPAD_DOWN` (20) | `20` / `ArrowDown` | `down` | 移动 / 菜单下移 |
| 左 | `KEYCODE_DPAD_LEFT` (21) | `21` / `ArrowLeft` | `left` | 移动 / 菜单左移 |
| 右 | `KEYCODE_DPAD_RIGHT` (22) | `22` / `ArrowRight` | `right` | 移动 / 菜单右移 |
| 确认 OK | `KEYCODE_DPAD_CENTER` (23) 或 `KEYCODE_ENTER` (66) | `23` / `66` / `Enter` | `attack`(C) **且** 菜单确认 | 主操作键 |
| 返回 Back | `KEYCODE_BACK` (4) | `4` / `Backspace`/`Escape`* | `menu`(X) | 暂停/打开菜单；标题页提示退出 |
| 菜单 Menu | `KEYCODE_MENU` (82) | `82` | `menu`(X) | 备用菜单键 |
| 主页 Home | `KEYCODE_HOME` (3) | `3` | **不可拦截** | 系统级，直接回桌面 |

> 注：在 WebView 中，返回键常表现为 `keyCode 4`；部分浏览器历史回退会触发 `Backspace(8)` 或 `Escape(27)`。建议在 `toggle()` 中同时覆盖 `4` 与 `8`/`27` 以增强鲁棒性（见 4.5）。

**关于 OK 键的双语义设计：** 原游戏 `Enter→menu`、`C→attack`。为让遥控器「OK」在游戏内是攻击、在菜单内是确认，推荐在 `toggle()` 中将 OK（23/66）**同时**触发 `attack` 与 `menu` 两个 Key（两次 `toggle` 调用）。游戏内 `menu==null` 时菜单点击被忽略、只生效攻击；菜单内攻击键通常被菜单用于「选择」，二者语义一致。这是最小化改动的务实方案，具体取舍交由 engineering-lead 在联调时定。

**4.3 焦点管理要点（最关键）**

TV 是非触摸设备，**WebView 默认可能未获焦，JS 的 `keydown` 永远不会触发**（资料来源 [3][4]）。本项目虽已挂 `FocusHandler`（`Game.java:113-125`），但其依赖「点击 canvas」获焦——电视无鼠标，必须改造：

1. **页面加载即自动聚焦 canvas**：去掉桌面端的 `renderFocusNagger()`（"Click to focus!"，`Game.java:424-449`）在 TV 上的展示，改为启动后 `hasFocus = true`（仿 `isMobileBrowser` 分支，`Game.java:461` 直接返回 `true`）。
2. **APK 壳层**必须显式 `webView.setFocusable(true)` + `webView.requestFocus()`（资料来源 [3]），否则 Activity 根视图吞掉按键。
3. `InputHandler` 监听挂在 `game.canvas`（`InputHandler.java:62-63`）。在 TV 上确保该 canvas 元素 `tabindex` 可聚焦，或在 `window`/`document` 上监听 keydown（更稳），而非仅绑定到 canvas。

**4.4 `preventDefault` 与返回键处理**

- 保留并强化 `preventDefault()`，防止方向键导致页面滚动、OK 触发默认点击、Back 触发浏览器/WebView 历史回退（资料来源 [3]）。
- **返回键策略**（遵循小米开发者规范 [2]）：APP 内按 Back → 打开/暂停菜单（映射 `menu`）；当已处于标题页时，再提示「确认退出」而非直接退出。**不要**让 Back 直接关闭应用。
- 若走 APK 方案，原生层用**白名单**放行 `DPAD_*` / `ENTER` / `BACK` 给 WebView，其余（音量、电源、主页、数字键）交系统（资料来源 [4]），避免「漏一个键就是一个坑」。

**4.5 对 `InputHandler` 的改造要点（伪代码，未实际改动）**

```java
// InputHandler.toggle() 中新增/调整：
// 1) 遥控器方向键（多数 WebView 直接给标准 Arrow keyCode）
if (nativeKeyCode == 19) up.toggle(pressed);     // DPAD_UP
if (nativeKeyCode == 20) down.toggle(pressed);    // DPAD_DOWN
if (nativeKeyCode == 21) left.toggle(pressed);    // DPAD_LEFT
if (nativeKeyCode == 22) right.toggle(pressed);   // DPAD_RIGHT

// 2) OK / 确认：同时触发 attack 与 menu 语义
if (nativeKeyCode == 23 || nativeKeyCode == 66) { // DPAD_CENTER / ENTER
    attack.toggle(pressed);
    menu.toggle(pressed);
}

// 3) 返回键：映射为 menu；兼容多形态
if (nativeKeyCode == 4 || nativeKeyCode == 8 || nativeKeyCode == 27) {
    menu.toggle(pressed); // 由游戏逻辑决定是否暂停/退出
}

// 4) 菜单键备用
if (nativeKeyCode == 82) menu.toggle(pressed); // KEYCODE_MENU
```

> 注意：`event.preventDefault()` 必须保留并覆盖上述所有键，防止页面默认行为。

**4.6 主页键不可拦截的应对**

`KEYCODE_HOME`(3) 为系统级，应用层**无法拦截**，按之必回桌面（资料来源 [2]）。应对策略：
- 游戏应支持**快速恢复**：APK 方案下在 `onPause/onResume` 中 `game.stop()` / 恢复，避免回到桌面再回来时状态错乱。
- 不依赖主页键做任何游戏内功能；所有游戏操作限于 D-pad / OK / Back / Menu。

---

## 5. 分发方式对比与推荐

| 方案 | 做法 | 优点 | 缺点 | 适用阶段 |
|------|------|------|------|----------|
| ① 浏览器直访 | 电视浏览器打开网页 URL | 零打包、改完即测；最快验证 | 需手动装/启浏览器；焦点/返回需网页自处理；Home 即退出；入口深、无桌面图标 | 原型验证、内部测试 |
| ② Android TV APK（WebView 加载本地 HTML） | Capacitor/Cordova 或原生 WebView Activity，资源放 `assets/` | 全控制焦点/生命周期/返回；有 TV 主屏 banner；可上架；离线运行 | 需 Android 工程与签名；适配方略多 | **推荐：正式产品形态** |
| ③ 投屏（Miracast/DLNA） | 手机/电脑镜像到电视 | 无需改游戏 | **仅镜像，遥控器无原生交互**（走的是手机端输入），不推荐 | 仅演示分享 |

**推荐：方案 ②（Android TV APK）。**
- 理由：TV 是「无触摸 + 遥控器」环境，只有 APK 壳能稳定接管焦点、拦截/路由按键、控制游戏生命周期，并提供主屏入口（Leanback banner，`320×180`）。Capacitor/Cordova 生态成熟（资料来源 [1][3]），也可直接用 Android Studio 原生 WebView Activity（资料来源 [1]）。
- 方案 ① 可作为**前期联调手段**：在电视浏览器里直接打开 dev 构建，快速验证 keyCode 与缩放，待稳定后再套 APK 壳。

**APK 关键清单（AndroidManifest）：**
- 声明 `android.hardware.touchscreen` 非必需（Leanback 要求，资料来源 [3]）。
- `CATEGORY_LEANBACK_LAUNCHER` intent + `320×180` banner。
- `android:configChanges="...|keyboard|keyboardHidden|navigation|..."` 防止插拔 USB 导致 Activity 重建白屏（资料来源 [3]）。
- WebView `settings.setJavaScriptEnabled(true)`、`mediaPlaybackRequiresUserGesture=false`（音频自动播放，资料来源 [3]）。

---

## 6. 风险与未知项

| 风险 | 等级 | 说明 / 缓解 |
|------|------|------------|
| **型号/固件差异的 keyCode** | 中 | 不同代小米电视（Android 9/11/12）与第三方遥控器 keyCode 可能偏差（如 OK 发 23 vs 66，甚至个别型号发 `13`）。**必须真机测试**，并采用「多 keyCode 映射到同一动作」的宽松策略（4.5）。 |
| **焦点未获焦导致无响应** | 高（若忽略） | TV 无点击，canvas 不会自动获焦。按 4.3 在启动即聚焦 + APK 层 `requestFocus()`。 |
| **音频自动播放限制** | 中 | Chromium 默认禁止无用户手势的带声媒体（资料来源 [3]）。APK 层关闭该限制；浏览器直访需用户首次按键后才会出声（恰好遥控器即手势）。 |
| **性能/内存** | 低 | 本游戏负载极低；但若走长期运行的看板式 APK，需注意 WebView `destroy()` 防 OOM（资料来源 [3]）。 |
| **主页键退出** | 确定 | 无法拦截，需做恢复逻辑（4.6）。 |
| **中文显示依赖汉化任务** | 高（前置） | 当前 `Font.java` 仅含 ASCII 8x8 位图（`Font.java:4-7`）。不完成汉化，TV 中文菜单乱码。 |
| **真机测试必要性** | 高 | 所有输入结论均基于文档与同类项目经验，**未做真机校验前不可定稿**。 |

---

## 7. 建议的迁移步骤清单（分阶段）

> 本清单**建立在**当前「汉化」(#1-#3) 与「大屏自适应」(#5) 任务之上，二者为前置依赖。

**阶段 0：前置（并行进行中，不可跳过）**
- [ ] 完成中文点阵字体管线（汉化任务）→ 否则 TV 菜单乱码。
- [ ] 完成大屏自适应显示逻辑（整数倍缩放 + 居中 + `pixelated`）。

**阶段 1：浏览器直访快速验证（方案 ①）**
- [ ] 在 `index.html` / CSS 中补 `image-rendering: pixelated`；按 1080p 固定 `SCALE=9` 居中。
- [ ] 在 `InputHandler.toggle()` 增加遥控器 keyCode 映射（4.5 伪代码）。
- [ ] 去掉 TV 场景下的 `renderFocusNagger`，启动即 `hasFocus=true`。
- [ ] 用一台小米电视的内置浏览器打开 dev 构建，**记录实际 keyCode**（上/下/左/右/OK/Back）。

**阶段 2：输入打磨**
- [ ] 根据真机 keyCode 修正映射表，覆盖多 keyCode 同动作。
- [ ] `preventDefault` 全键位覆盖；Back 键路由为「菜单/暂停」，标题页提示退出。
- [ ] 焦点：canvas 设 `tabindex` 或在 `window` 上监听 keydown。

**阶段 3：APK 封装（方案 ②，推荐正式形态）**
- [ ] 用 Capacitor/Cordova 或 Android Studio 原生 WebView Activity 建壳，`assets/` 放 HTML 资源。
- [ ] Manifest 声明非触摸、Leanback launcher、banner、`configChanges`。
- [ ] 壳层白名单放行 `DPAD_*`/`ENTER`/`BACK`，其余交系统（4.4）。
- [ ] 壳层 `requestFocus()` + `mediaPlaybackRequiresUserGesture=false`；`onPause/Resume` 恢复游戏。
- [ ] 构建签名 APK，安装到电视验证。

**阶段 4：真机回归与发布**
- [ ] 多型号（Android 9/11/12 各一款）回归：输入、显示、音频、Home 键恢复。
- [ ] 性能与长时间运行（OOM）抽检。
- [ ] （可选）上架小米应用商店 / 侧载分发。

---

## 8. 引用来源

1. 小米 TV 版 Chrome 浏览器（第三方描述，含 Chromium 120+、分辨率支持）：https://www.7longwen.com/z/xiao-mi-tv-ban-chrome.html
2. **小米官方开发者文档 — TV&盒子遥控器键值定义**（DPAD/OK/BACK/HOME/MENU 等 keyCode）：https://dev.mi.com/docs/gameentry/TV&盒子游戏接入文档/TV&盒子遥控器键值定义/
3. **Android TV WebView 遥控器按键处理 / 焦点 / configChanges / 音频自动播放**（掘金实战）：https://juejin.cn/post/7654909738615406627 ；https://juejin.cn/post/7618095016359477294
4. 智能电视页游实测（Chromium 内核、Android TV 11+ WebGL、fps、输入延迟）：https://expert.179e.com/rmgl/7376.html
5. HTML5 Canvas 像素整数缩放 + `image-rendering: pixelated` 技术（MDN）：https://github.com/mdn/content/blob/main/files/en-us/games/techniques/crisp_pixel_art_look/index.md ；中文：https://mdn.org.cn/en-US/docs/Games/Techniques/Crisp_pixel_art_look
6. 小米电视系统基于 Android / PatchWall 说明：https://m.gwpp.com/news/62569.html ；https://manuals.plus/asin/B084872DQY
7. HTML5 游戏打包 Android TV APK（Cordova/Capacitor/原生 WebView，Leanback、banner、Manifest 要求）：https://emanueleferonato.com/2018/01/09/how-to-make-your-html5-game-run-as-a-native-android-tv-app-using-android-studio-and-cordova/ ；https://m.php.cn/faq/1847426.html
8. HBuilder TV APK WebView 遥控失灵根因（焦点/原生层 onKeyDown 分发）：https://ask.csdn.net/questions/8897983

---

*（本报告仅做研究与写作，未对 `src/` 下任何源码做出修改。）*
