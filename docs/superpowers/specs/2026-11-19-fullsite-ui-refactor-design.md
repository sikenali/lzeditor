# 全站 UI 严格重构设计 — DESIGN-1 字面值 + lzc2vsdx/Nebula 补齐

> 目标：用户要求「严格按照 `/opc/DESIGN-1.md` 以及 `lzc2vsdx` 项目重构整个 UI 界面」。
> 功能不变 · 零新增依赖 · 沿用现有 React + CSS 变量令牌体系（AGENT.md §7，无 `[data-theme]` 覆写块）。

## 1. 用户已拍板（非本设计再议）

| 裁决点 | 决定 |
|---|---|
| §5/§6 冲突 | **回退 DESIGN-1 字面值**（设置界面严格按 §5/§6） |
| 内容宽度 | **保留全屏**（编辑器工作区全屏，不 1180px 居中） |
| 强调色 | **保持青色 Nebula**（§7 朱红是家族默认，青色为可切换强调色，非硬冲突） |
| 五色图标（G12） | **跳过**（~17 命令 vs lzc2vsdx 2 工具模型不映射） |
| 导航激活色 | **`--color-system-blue`（#007AFF）**（§5.3 字面；用户所选方案文本含「system-blue 导航」） |

## 2. 设置界面目标（DESIGN-1 §5/§6 字面值）

**§5.1 弹窗壳**：`92vw` / 最大 `1280px` / `92vh`；圆角 `12px`；内边距 `32px 36px`；
背景 `var(--color-bg-secondary, #F7F3EA)`（**实心**，非玻璃）；
阴影主题感知 —— 浅色 `0 8px 40px rgba(0,0,0,0.1)`；深色 `0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(0,212,170,0.08)`；经 `UiModal`。

**§5.2 头部**：图标圆 `48×48px`（primary-soft 底 + primary 图标）；标题 `22px Bold` 文本主色；副标题 `13px` Muted；右侧关闭。

**§5.3 导航侧栏**：宽 `180px`；背景 `var(--color-bg-white)`；圆角 `12px`；内边距 `8px`；
条目高 `44px`；图标 RemixIcon `18px` Secondary；文字 `14px` Body；
激活态 = `--color-system-blue`（#007AFF）。

**§5.4 内容区**：`flex:1`，垂直滚动。

**§6.1 页面头部 Card**（若有）：白底，圆角 `16px`，内边距 `20px 24px`；面包屑分隔 `/` Faint；
标题 `30px Bold`、`letter-spacing:-0.5px`；描述 `15px` Secondary；恢复默认按钮 `height:48px` outline。

**§6.2 外观主题 Card**：两个预览卡并列；预览 `100%×128px`（顶条 `28px` + 内容 `54px`）；
名称 `16px Medium`；描述 `14px Muted`；激活态背景 `var(--color-primary-soft)` + 边框 `var(--color-primary)`；右上 ✓ 徽标。

**§6.3 强调色 Card**：5 个圆形色盘横排，间距 `40px`；直径 `80px`；选中内部白色 ✓ 图标；名称选中 Bold。

**§6.4 布局切换 Card**：两个 mockup 预览卡并列；mockup 高 `150px`。

**区块卡（`.settings-section` 等）**：**实心白/`--color-bg-card`**，圆角 `16px`（§6 字面；**不**玻璃化 —— 覆盖原 G6「补 Nebula 玻璃」方向，设置界面整体属 §5/§6 字面）。

> 注：设置界面**整体**从当前 Nebula 玻璃/lzc2vsdx 尺寸**回退**为 §5/§6 字面（实心卡 + 白导航 + system-blue 激活 + 92vw/1280/12px + 80px 色盘 + 128px 缩略图 + 30px 标题 + 48px 图标圆）。原 G5/G6（设置玻璃缺口）**被本回退取代**，不再按 Nebula 修。

## 3. 全站其余目标（lzc2vsdx/Nebula，补 G1–G20）

> 仅限**非设置**界面。全部沿用 lzc2vsdx 签名：青电光 `#00D4AA` 单一驱动、backdrop-blur 玻璃（浅色也玻璃）、`0.6px` 发丝线 + 青渐变分隔、发光微交互（`0 0 0 3px rgba(cyan,.4)` focus 环、弹簧 press）、Space Grotesk + JetBrains Mono。

| # | 面 | 当前（gap） | 目标 |
|---|---|---|---|
| G2 | 侧栏左 rail | 不透明 `--color-bg-secondary` 无 blur | 玻璃 `backdrop-filter:blur(12px)` + 右侧 0.6px 青渐变分隔 |
| G3 | 侧栏 outline/library/preview 面板 | 不透明白 + blur 无效 | 玻璃 blur + 0.6px 发丝 |
| G4 | AI 聊天面板 | 不透明白 + `border-left:1px` 无玻璃 | 玻璃 blur + `border-left:0.6px` 发丝 |
| G7 | slash 命令 | 不透明白 + `0.7px` + 16px 圆角 | 玻璃 + `0.6px` + 8px 圆角 |
| G8/G9 | 部分发丝线 | `0.7px` vs `0.6px` 不一致 | 全部 `0.6px` |
| G10 | `.ud-btn`/`.welcome-btn`/`.search-btn` | 10px / 10px / 6px 圆角 | 统一 `8px` |
| G11 | `.page-reset-button` | 12px 圆角 | `8px` |
| G13 | 编辑器 WYSIWYG 纸面 | `--doc-bg #faf6ee` 未涂（透明落 `#F4F7FA`） | 纸面涂 `--doc-bg`（羊皮纸），落出纸面区为 Nebula 底 |
| G14 | WYSIWYG 列宽 | `--document-width:760px` 固定 | 接 `contentWidth` 设置（TSX 接线） |
| G15 | 页脚 | 半透明无 blur | 玻璃 blur + 0.6px 顶发丝 |
| G16 | 阅读模式浮航 | `transparent bg` 非玻璃 | 玻璃 + 0.6px + 8px 圆角 |
| G17 | 状态栏/win-controls/右面板 | `0.7px` | `0.6px` |
| G19 | toast | 12px 圆角 | `10px` 圆角（注释所期） |
| G20 | `.code-mode.css` split | 死代码 | 删除 |

## 4. 明确不做（已裁决/超范围）

- 五色工具图标着色（G12，用户拍板跳过）
- 内容 1180px 居中（用户拍板保留全屏）
- 朱红强调色（用户拍板保持青色）
- 新增任何依赖 / 重写组件结构
- 微前端 reload 逻辑（lzeditor 非 Wujie 子应用，不适用 §6.4 reload 例外）

## 5. 文件清单

- `src/styles/settings-dialog.css`（§5/§6 字面回退）
- `src/styles/layout.css`（G2/G15/G17）
- `src/styles/panels.css`（G3/G7 部分/G11）
- `src/styles/ai-chat.css`（G4）
- `src/styles/floating.css`（G10 部分/G16）
- `src/styles/read-mode.css`（G16 部分）
- `src/styles/app.css`（G8/G9/G17）
- `src/styles/welcome-screen.css`（G10 部分）
- `src/styles/ui.css`（G7 部分/G19）
- `src/styles/tokens.css` + `src/styles/themes.ts`（`--color-system-blue`、`--doc-bg` 等令牌）
- `src/components/panels/SettingsDialog.tsx`（G14 相关/图标圆若需）
- 编辑器 WYSIWYG 组件（G14 contentWidth 接线）
- `tests/*.test.mjs`（钉旧值同步）

## 6. 验证

`npm run typecheck` 0 错 · `npm test` 全绿 · `npm run test:e2e` 3/3 · build-artifacts 绿 · 工作树干净。

## 7. 实施方式（待批准后 writing-plans）

**A. CSS 令牌级铺开（推荐）**：全部经现有 CSS 变量令牌（`--color-system-blue`/`--doc-bg` 等新增进 tokens + themes），无硬编码、无 `[data-theme]` 覆写块；G14 为唯一 TSX 接线点。零依赖、逐界面可回退。
