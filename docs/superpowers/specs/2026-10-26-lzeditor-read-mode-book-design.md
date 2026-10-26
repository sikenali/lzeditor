# 阅读模式改版：双联页书本翻页

日期：2026-10-26
状态：已确认方向（双联页并排 / 按块智能分页 / 保留翻页动画）

## 背景

`appMode === 'read'` 在代码库里只有读法没有写法：UI 全在（工具栏、字号、目录、阅读时长），
但 commit `a516f3e`「阅读模式退出菜单」把唯一入口摘掉了，`setAppMode('read')` 全库无调用。
`ShortcutSettingsTab.tsx:89` 仍写着「阅读模式：仅工具栏按钮」，那个按钮已不存在。

现状是单列无限滚动的文章页，用户要的是**双联页书本**：左右两页并排，点击翻页。

## 方案取舍

| 方案 | 结论 |
| --- | --- |
| A. 隐藏渲染 + 测量 + 装箱 | **采用**。分页与真实渲染一致 |
| B. 全文 + `overflow:hidden` 裁切 | 排除。跨页块必然被硬切断，与「按块智能分页」矛盾 |
| C. Markdown 层按行数估算 | 排除。字号/图片/代码块高度一估错整书就漂 |

## 骨架

```
┌ 阅读模式   布局 ▸   － 17 ＋   目录        [ 编辑模式 ] ┐
├─────────────────────┬──┬──────────────────────┤
│   左页              │书│   右页                │  右半屏点击 = 下一页对
│                     │脊│                      │  左半屏点击 = 上一页对
├─────────────────────┴──┴──────────────────────┤
│  ◀ 上一页      第 2 / 7 页  ●●●○○○○○      ▶ 下一页 │
└───────────────────────────────────────────────┘
```

沿用现有 `read-mode-*` 工具栏（字号 12–24、布局宽度、目录侧栏、阅读时长）。
布局宽度的语义改为**整本书的宽度**，再均分两页 + 书脊。

单页宽重定为 `300 / 400 / 520`（narrow / normal / wide），
书宽 = 单页宽 × 2 + 书脊 24。原有 `LAYOUT_MAX_W`（530/760/1000）是单列文章的宽度，
直接除以 2 会得到 265px 的页宽，一行只能排 15 个字，读不了，所以不复用。
字号与行高不变，页高由容器高度决定。

## 分页引擎

纯函数，可单测，零 DOM 依赖：

```ts
type BlockKind = 'heading' | 'para' | 'list' | 'code' | 'image' | 'table' | 'quote' | 'hr' | 'math'

interface PageBlock {
  h: number        // offsetHeight，测量得到
  kind: BlockKind  // 标签名 → kind 的查表
  line: number     // 0-based 起始源码行，取自块的 data-line，目录跳页靠它
  key: string      // 稳定键，翻页时复用节点
}

interface Page { blocks: PageBlock[]; height: number; over: boolean }

paginate(blocks: PageBlock[], pageHeight: number): Page[]
pageOfLine(pages: Page[], line: number): number | null
```

`pageOfLine` 是二分：找到 `page.blocks` 里行号区间覆盖 `line` 的那一页，
命中不了（目录项落在页间空白或文档已变更）返回 `null`，调用方跳到最后一页。

规则：

1. **整块不可切**。放不下就整块移到下一页。
2. **标题不做页尾孤行**：标题是本页最后一块且后续块放不下时，标题整块移到下一页。
   宁肯上一页末尾留白，也不要"标题孤零零在页脚、内容在下一页"。
3. **单块高度 > 页高**：独占一页，`over: true`，该页内允许垂直滚动。
   长代码块、大图、宽表格都走这条。
4. **页高取不到或为 0**：返回 `[]`，调用方回退到单列滚动。
5. **空文档**：返回 `[]`。

## 测量与重排

1. 建 `position:absolute; left:-10000px; top:0; width:<单页宽>; visibility:hidden` 的测量容器
2. `dangerouslySetInnerHTML` 一次全文，量每个顶层子元素的 `offsetHeight`
3. `paginate()` 装箱
4. **把测出的节点直接搬进页容器**（`appendChild` 移动，不重渲染），删掉测量容器
5. 每页只保留自己那批节点，翻页是切换显示，不是重排

失效重跑时机：**内容变化、字号变化、布局宽度变化、窗口宽度变化**。
翻页**不重跑**。

测量容器用 `visibility:hidden` 而不是 `display:none`（后者量不到尺寸），
用绝对定位脱离文档流，`left:-10000px` 避开可视区与鼠标命中。

## 翻页动画

用户已确认要动画。做法：

- 容器 `perspective: 1400px`
- 翻页页 `transform-origin` 取**书脊侧**（向左翻 = 右页 `left center`，向右翻 = 左页 `right center`）
- 出场页 `rotateY(-90deg)` 绕书脊翻走 + 透明度 0
- 入场页从 `translateX(24px) + rotateY(6deg)` 归位到 `translateX(0) rotateY(0)`，同时淡入
- 时长 **240ms**，缓动 `cubic-bezier(.2,.7,.2,1)`
- 只动 `transform` 和 `opacity`，两个都在合成层，不触发重排

明确**不做**纸边卷曲（curl）：那需要把纸页切成 N 段逐段旋转或上 canvas 变形，
在含图片/代码块的桌面 Electron 里翻页会掉帧。以上是**整页绕书脊轴的刚性翻转**，
视觉上是翻开的书，不是卷纸角。

`prefers-reduced-motion: reduce` 时跳过动画直接换页，此时 `isFlipping` 立即置 false，
否则翻页会永久锁死。

翻页期间锁输入：动画 240ms 内忽略下一次翻页请求，避免连点导致节点状态错乱。
用 `isFlipping` 布尔位 + `setTimeout` 解锁。

## 交互

- **点击翻页**：命中区域右半屏 → 下一页对，左半屏 → 上一页对。
  点落在 `a, button, input, textarea, select, summary, label, [role=button], [role=tab], [contenteditable=true]`
  上不算翻页（复用 `lines.ts` 的 `OWN_ACTION` 选择器）。
  非主键、带修饰键、双击三击、拖选结束也不算。
- **底部按钮**：◀ 上一页 / ▶ 下一页，首末页禁用。
- **键盘**：← → 翻页，Home 首页，End 末页。翻页时阻止默认滚动。
- **页码**：显示**页对**数 `第 X / N 页`，N 为页数除以 2 向上取整。
- **进度点**：小圆点表示当前页对位置，超过 12 个点退化为进度条。
- **目录跳转**：点目录项直接跳到那一页，不滚动正文。
  大纲项的 `line` 传给 `pageOfLine(pages, line)` 拿到页号，再 `setPage()`。

## 入口与清理

- 工具栏 + 左栏各加一个「阅读」按钮，图标 `ri-book-open-fill`（已确认字形存在）
- `MODE_ITEMS` 加回 `{ icon: 'ri-book-open-line', label: '阅读模式', action: 'read' }`
- `modeAction` 补 `read` 分支：`setAppMode(st.appMode === 'read' ? 'edit' : 'read')`
- `App.tsx` 的 `centerContent`：`appMode === 'read'` 时渲染 `<ReadMode />`
  （与 `history` 分支并列），**不要**给右栏留位
- `showRightPreview` 补 `appMode !== 'read'`
- 删除 `LZEditor.tsx:354-433` 现有阅读模式整块（无入口的死代码）
- 434-522 代码模式沿用 `read-mode-*` 类名，**不动**
- CM6 保持挂载：沿用 `LZEditor.tsx:60` 的 `appMode !== 'read'` 隐藏逻辑，卸载会让
  `getCM6Editor()` 返回 null、工具栏与搜索命令全部失效
- `ShortcutSettingsTab.tsx:89` 的「仅工具栏按钮」改成真实快捷键 `Ctrl/⌘+R`，
  并在快捷键表里挂上处理
- `tests/mode-boundary.test.mjs:15` 的 `doesNotMatch /action: 'read'/` 反转为 `match`

## 文件划分

| 文件 | 职责 |
| --- | --- |
| `src/utils/pagination.ts` | 纯分页引擎。只吃数字与枚举，零 DOM、零 React |
| `src/utils/blockKind.ts` | 顶层块标签名 → `BlockKind` 的查表，`paginate` 与测量共用 |
| `src/components/editor/ReadMode.tsx` | 阅读模式视图：工具栏 + 双联页 + 翻页 + 目录 |
| `src/styles/read-mode.css` | 追加双联页/书脊/翻页动画样式，现有 `read-article-body` 排版规则复用 |

`ReadMode` 不塞进 `LZEditor`：阅读模式是完全替换正文区的视图，
塞进去会让那个文件继续膨胀，而现在它已经同时承担编辑态、代码态、斜杠命令四个职责。

## 测试

新增 `tests/pagination.test.mjs`（纯函数，直接跑）：

- 装箱正确性：页高 100，块 `[60, 40, 50, 40]` → 两页，页高分别 100 与 90，块集合正确
- 标题孤行：`[para 60, heading 30, para 60]` 页高 100 → 标题不在第一页页尾
- 超高块：单块 150 / 页高 100 → 独占一页且 `over: true`
- 页高恰好整除：不产生多余空页
- 单块、空数组、页高 0、块高 0 的边界
- 标题连续两页都是孤行时的收敛（不能无限后移）
- `pageOfLine`：命中行号区间的那一页、命中不了返回 `null`、空页表返回 `null`

更新 `tests/mode-boundary.test.mjs`：

- 阅读模式回到模式菜单
- 断言 `ReadMode.tsx` 调用了 `paginate`
- 断言 `modeAction` 处理 `read`

## 验收

1. 工具栏点「阅读」→ 双联页出现，左右两页有内容
2. 改字号 → 重新分页，页码更新
3. 改窗口宽度 → 重新分页
4. 页内块没有一处被从中间切断
5. 标题不出现在页脚最后一行
6. 点右半屏翻下一页对，动画是绕书脊翻转，无掉帧
7. 连点翻页不出现节点重复或丢失
8. 长代码块独占一页且该页可垂直滚动
9. 点目录项直接跳到对应页
10. 退出阅读模式后编辑态内容不丢、光标位置保留

## 已知风险

- 图片懒加载会改变块高度，导致分页结果与首次测量不一致。
  缓解：进入阅读模式时先把所有 `img` 的 `src` 触发加载，等 `complete` 或超时 1.2s 再测量。
- 中文字体（Google Fonts CDN）加载晚导致首屏分页错乱。
  与既有图标 CDN 问题同源，本次不修，只靠 `document.fonts.ready` 后再测量兜底。
