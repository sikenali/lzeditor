# lzeditor 左侧 rail 图标化改造 —— 设计

- 日期：2026-10-20
- 范围：`src/components/layout/LeftNav.tsx` + `src/styles/layout.css` 的 `.rail-*` 段
- 触发：rail 下半留白 + 15 个按钮塞文字过密

## 需求（用户原话拆解）

1. rail 只显示图标，不显示文字
2. 3 组按钮按上 / 中 / 下分布
3. hover 后显示文字，使用 `UiTip` 组件
4. 「小圆点」依旧保留 —— 标记「会弹出子菜单」的按钮

## 现状

`.rail-nav`（`.app-left-nav` 内，76px 宽）= 顶 logo + `.rail-body`（3 组）+ 底版本号。

| 组 | 按钮 |
|---|---|
| 文档 | 文档库 / 新建 / 大纲 / 查找 |
| 编辑 | 格式 / 图片 / 链接 / 表格 / 插入 |
| 应用 | AI / 模式 / 历史 / 样式 / 导出 / 设置 |

- `.rail-btn`：58px 宽，`flex-direction: column`，图标 20px + 标签 11px 竖排
- 子菜单指示器 = `.rail-btn--menu .rail-label::after { content: '›' }`，**挂在标签文字后面**
- 文字来源 = 原生 `title` 属性
- `.rail-body`：`gap: 6px` + 组间 `margin-top:4px` 顶起，3 组全部顶靠左上，下半大片空

**核心矛盾**：标签一隐藏，`›` 跟随 `.rail-label` 一起消失 —— 指示器必须从 label 上挪走。

## 设计

### 1. LeftNav.tsx

- 引入 `UiTip`（`../ui/UiTip`），复用现有组件，**不改组件本身**
- `btn()` / `menu()` 外层包 `<UiTip text={label} placement="right">`
- `title={label}` → `aria-label={label}`（label 隐藏后按钮无可见文本，保留可访问名；同时避免与 UiTip 双重提示）
- `menu()` 按钮内新增独立元素 `<span className="rail-menu-dot" aria-hidden="true" />`，不依赖 label 存在
- logo / 版本号按钮同样套 UiTip（`"LZEditor"` / `"关于"`）
- `.rail-label` **保留在 DOM**，仅 CSS 隐藏 —— 保留可访问性与后续切换余地
- 所有 `onClick`、`flyout`、`ActionMenu` 逻辑与 3 组构成/顺序不变

`placement="right"`：rail 贴视口左缘，tooltip 必须向右弹出，不能向左出屏。`.ui-tip--right::after` 已支持（`left: calc(100% + 8px); top: 50%; transform: translateY(-50%)`），z-index 2100。

### 2. layout.css（`.rail-*` 段）

| 选择器 | 变更 |
|---|---|
| `.rail-btn` | `width:58px/padding:5px 0 4px/column/gap:1px` → `width:height:var(--rail-btn-size)`、`padding:0`、flex 居中、`border-radius:var(--rail-btn-radius)` |
| `.rail-label` | → `display: none` |
| `.rail-btn--menu .rail-label::after` | **删除**（`›` 改为独立 `.rail-menu-dot`） |
| `.rail-icon-wrap`（新增） | 包图标与点，`position:relative; display:inline-flex`。点是它的绝对定位子元素，故点位锚定**图标盒**而非按钮 |
| `.rail-menu-dot`（新增） | `position:absolute; top:50%; left:calc(100% + 2px); transform:translateY(-50%); 4px 圆; background:currentColor; opacity:.4`；`.rail-btn.active` 时 `opacity:1` |
| `.rail-body` | 加 `justify-content: space-between` → 3 组上/中/下；`overflow-y:auto; overflow-x:hidden` → `overflow: visible`；`gap` → `var(--rail-body-gap, 6px)` |
| `.rail-group` | `gap: 3px` → `var(--rail-group-gap, 2px)`；删 `.rail-group + .rail-group` 的 `margin-top:4px; padding-top:6px`（间距交由 space-between） |
| `.rail-group + .rail-group::before` | 保留 26×1px 分隔线，`margin: 0 auto 5px` |
| `.rail-nav` | 定义尺寸变量；`padding: 10px 0 8px` → `8px 0 6px` |
| `.rail-top` / `.rail-bottom` | `padding 6px` → `4px` |

**点位锚定图标盒**：`.remix` 图标盒实测宽度约 20.2px（≠ `font-size`，含 side bearing），若用 `calc(50% + Npx)` 相对按钮定位，按钮尺寸一变 N 就得重算。改让点位于图标盒内、`left: calc(100% + 2px)`，任意尺寸档下间距恒定 2px。

**两档响应式**（图标恒 20px）：

| 视口高 | 按钮 | 组内 gap / 组间 gap | 组内容合计 | rail-body 可用 |
|---|---|---|---|---|
| > 830 | 40px / r11 | 2 / 6 | 652px | vpH − 176 |
| ≤ 830 | 36px / r10 | 0 / 0 | 550px | vpH − 176 |
| ≤ 700 | 32px / r8 | 0 / 0 | 490px | vpH − 176 |

`rail-body 可用 = 视口高 − 176`（实测 950→774、760→584、690→514）。三档均在对应视口下有正余量，末组不与版本号重叠。

**为何不用纵向滚动**：`overflow` 不能「只裁纵向不裁横向」——`overflow-y:auto` + `overflow-x:visible` 时 x 会按规范算成 `auto`，tooltip 必被拦在 rail 内。故保持 `overflow: visible`，改为压缩按钮尺寸。

### 3. 不改

`.app-left-nav` 76px 宽、logo 顶置、版本号底置、子菜单 `ActionMenu` 的 `align="right"` 与定位、3 组按钮构成与顺序、`rail-top` / `rail-logo` / `rail-version` 尺寸、`UiTip` 组件源码。

## 已知代价

- **rail 永久 icon-only**，不受 `showToolbarLabels` 设置影响（该设置仅作用于顶部 `.navtop.toolbar`）。文字仅作为 tooltip 内容存在。
- **`.rail-body` 失去纵向滚动**，改为按视口高两档压缩按钮尺寸（40 → 36 → 32px，阈值 830 / 700）。实测 `rail-body 可用高 = 视口高 − 176`，三档内容合计 652 / 550 / 490px 均有正余量，末组不与版本号重叠。
- **视口高 < ~660px 时内容会略溢出**（32px 档缺口约 6px）。权衡：纵向滚动必然夹住向右弹出的 tooltip（`overflow-y:auto` + `overflow-x:visible` 时 x 按规范算成 `auto`），故选择保持 `overflow:visible` + 压缩尺寸，把退化推到极低视口。

## 验证

1. `npx tsc --noEmit`
2. Playwright `rail-audit.mjs` —— 4 档视口 × 深浅色 = **108 项全过**：
   - 视口：`1600×950`(浅色, 40px 档) / `1500×820`(浅色, 36px 档) / `1440×760`(深色, 36px 档) / `1366×690`(深色, 32px 档)
   - `.rail-label` 实测 `display:none`（15/15）；按钮实测为同尺寸正方形（40/36/32 各档一致）
   - `.rail-menu-dot`：5 个菜单按钮各 1 个、10 个普通按钮 0 个；4×4；与图标右缘间距 **2.1px（三档一致）**；与图标同中线（Δy=0）；不超出按钮
   - `.rail-body` 实测 `justify-content:space-between`、`overflow:visible`；3 组；首组在 logo 下方；**末组 bottom ≤ 版本号 top（四档均不重叠）**
   - 悬停：`::after` `opacity=1`、文案 = 按钮 `aria-label`、`left = wrapWidth + 8px`、`z-index=2100`、原生 `title` 为 null、`aria-label` 保留
   - **逐个裁剪祖先实测 tooltip 起点均落在其盒子内**（blockers 为空）
   - 点击菜单按钮仍弹出 `.toolbar-submenu`；`menu-open` 时点 `opacity=1`
   - 无 pageerror / console error
