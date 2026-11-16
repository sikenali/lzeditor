# DESIGN-1.md 严格合规：毛玻璃背景 + 窗口 1280×900 —— 设计文档（短版）

> 日期：2026-11-16
> 规范来源：`/home/jingle/opc/DESIGN-1.md`（bid-platform 统一设计规范 v2 · 科技紧凑版）
> 目标：`lzeditor`（React + Vite + Electron）
> 方案：用户选定 **A（窗口观感 + 内容限宽，安全）**；窗口尺寸 `1280×900`，Electron 与 Web 都要。

## 意图

用户要求「严格按照 DESIGN-1.md 优化，例如背景以及窗口大小」。已核对 DESIGN-1.md：
- **背景**：基础色 `#FAF7F2`/`#17171A`（§1）与弹窗背景/尺寸（§5.1）已达标。唯一真实差距是
  **顶栏/页脚毛玻璃**（§2.1），当前为纯白实色。
- **窗口大小**：DESIGN-1.md 没有定义应用窗口尺寸（只有弹窗尺寸）。用户明确要
  **整个应用窗口 = 1280×900**（Electron 桌面窗口 + Web/LPK 观感）。

## 目标

1. Electron `BrowserWindow` 窗口 → `1280×900`（`electron/main.ts`：width 1440→1280，height 900 不变）。
2. Web 版内容区限制为**居中 `max-width:1280px`**（横向窗口观感），高度仍铺满视口（100vh 不变）。
3. 顶栏/页脚改**毛玻璃**背景，严格按 §2.1。

## 非目标（反目标/失败标准）

- **不**把 Web 版改成真·居中 1280×900 固定窗口（方案 B）——需 `position:fixed→absolute`、
  `100vh→窗口高`，涉及 floating/panels/ui/layout/read-mode 多文件，破坏弹窗/面板/tooltip 风险高。
- **不**动弹窗/面板的定位与尺寸（`position:fixed`、`calc(100vh-…)`、92vw/92vh/1280 全部保留）。
- 失败标准：任何弹窗/面板/tooltip 错位；Electron 标题栏拖动区失效；浅色下出现「深空窗口」割裂感。

## 约束

- 毛玻璃需要 `--bg-rgb`（RGB 三元组）：light `250, 247, 242`（=#FAF7F2）/ dark `23, 23, 26`（=#17171A）。
  新增进 `tokens.css :root`（浅色）与 `themes.ts` 两个主题对象（深色），与现有 token 机制一致。
- 顶栏是 Electron 无边框窗口的拖动区（`-webkit-app-region: drag`），毛玻璃不得去掉该属性。
- `.toolbar` 是 `position: sticky; top:0`，毛玻璃用 `backdrop-filter: blur(16px)` 让下方内容透出模糊。

## 具体改动（how）

| 位置 | 现在 | 改为（DESIGN-1.md §2.1 / 用户指定） |
|------|------|------|
| `electron/main.ts` | `width:1440, height:900` | `width:1280, height:900`（min 不变） |
| `src/styles/app.css` `.app` | `width:100vw; height:100vh` | `max-width:1280px; width:100%; margin:0 auto; height:100vh` |
| `src/styles/layout.css` `.toolbar` | `background: var(--color-bg-white)` | 毛玻璃：`background: rgba(var(--bg-rgb), 0.82); backdrop-filter: blur(16px)` + 底部 `0.7px` 微光分割线 |
| `src/styles/layout.css` `.app-footer` | 实色背景 | 毛玻璃：`background: rgba(var(--bg-rgb), 0.75)` + 顶部 `0.7px` 微光分割线 |
| `tokens.css` + `themes.ts` | 无 `--bg-rgb` | 新增 `--bg-rgb`：light `250,247,242` / dark `23,23,26` |

- 微光分割线：`linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 25%, transparent) 50%, transparent)`（§2.1）。
- `body` 已是 `background: var(--bg-primary)`，作为居中内容两侧的背板，无需另改。

## 交给实现者

- 顶栏/页脚毛玻璃只在浅/深两主题下用 token 驱动，禁止 `[data-theme]` 覆写块。
- 若某子元素（按钮/图标）在毛玻璃上对比度不足，微调该元素背景，不改毛玻璃整体。
- Electron 窗口改动只动 `width`，不动 `minWidth/minHeight`（1024×640 保留）。
- 不做回归测试之外的多余美化（克制原则）。
