# 代码模式重写：backtickle 风格左右分栏

日期：2026-10-26
状态：已确认方向（复用现有 CM6 实例 / 实时渲染预览 / 固定双栏 / 仿 backtickle 栏头 / 直接删旧实现）

## 背景

代码模式（`appMode === 'code'`）现在是一整块全屏 textarea，套在自制的「阅读器壳」里：
Markdown/代码模式 标签、文档标题、作者头像、字数统计、布局窄栏切换、字号加减、目录侧栏。

这套壳的问题是：

- 左侧一个裸 textarea，没有语法高亮，和编辑模式（CM6 + markdown 高亮）观感落差大；
- 没有实时预览，写的时候看不到渲染结果；
- 壳子占掉大量竖排空间，实际能输入的文本区被标题、头像、字数挤小；
- 和开源参考源 backtickle（`/tmp/opencode/bt`）的「源码栏 + 预览栏 + 可拖拽分割线」布局完全对不上。

目标是把代码模式改成 backtickle 那种**左右分栏工作区**：左边源码、右边实时预览、
中间一根可拖拽的分割线。

## 方案取舍

| 方案 | 结论 |
| --- | --- |
| A. 抽出共享分栏基建，LZEditor 内做双栏 | **采用**。CM6 单例不动，工具栏/搜索/格式化照旧可用 |
| B. 把 SidebarPreview 改造成分栏组件 | 排除。要动编辑模式的稳定路径，回归面大；「公众号复制 + 关闭」语义和代码模式不同 |
| C. 代码模式完全独立实现 | 排除。渲染管线、mermaid、滚动同步、排版主题全要重写一遍，而 `split.ts` / `Splitter` 基建照样得抽，独立化收益为负 |

参考源：backtickle `src/shell/split.ts`（分栏几何）与 `src/shell/Splitter.svelte`（分割线交互）。
backtickle 的三态切换（纯源码 / 双栏 / 纯预览）不在本次范围内，代码模式固定双栏。

## 骨架

```
┌───────────────────────────────────────────────────────────────────┐
│ MARKDOWN SOURCE  ·  UTF-8        │  LIVE PREVIEW  ·  滚动同步      │
├──────────────────────────────────┼────────────────────────────────┤
│                                  │                                │
│        CM6 源码编辑器             │        实时渲染预览             │
│                                  │                                │
│                                  │                                │
│                                  │                                │
└──────────────────────────────────┼────────────────────────────────┘
                     └ 6px 可见线 / 24px 命中区 ┘
```

左栏可拖拽调宽，双击或 Enter 回 50/50。

## 1. 分栏几何 —— 新增 `src/utils/split.ts`

纯函数，不碰 DOM：

```ts
export const SPLITTER_WIDTH = 6    // 可见分割线宽度
export const MIN_PANE_WIDTH = 240  // 单栏最小宽度
export const DEFAULT_RATIO = 0.5
export const KEY_STEP = 0.02       // 一次键盘调整的量

clampRatio(ratio, containerWidth)        // 保证两栏都 ≥ MIN_PANE_WIDTH；装不下就退回 50/50
ratioFromPointer(x, left, width)         // 指针位置 → 左栏占比
gridColumns(ratio)                       // → `minmax(0, Rfr) 6px minmax(0, (1-R)fr)`
```

比 backtickle 少一个 `view` 参数（它要支持 editor / split / preview 三态，我们固定双栏）。

## 2. 分割线 —— 新增 `src/components/splitter/Splitter.tsx`

- 可见线 6px，外层命中区 24px（左右各扩 9px），保证够宽能点到；
- 指针拖拽走 `setPointerCapture`，拖拽期间禁掉文本选择；
- 键盘：← / → 各 ±2%，Enter / Home 回 50/50；双击回 50/50；
- 无障碍：`role="separator" aria-orientation="vertical" aria-label="调整源码与预览宽度"`
  + `aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(ratio*100)}` + `tabindex="0"`；
- focus-visible 焦点环。

组件只负责「把 ratio 变更抛出去」，自己不持有 ratio，也不负责持久化。

## 3. 代码模式主体 —— `src/components/editor/LZEditor.tsx`

整块 `read-mode-inline read-mode-code` 删掉，换成三列 grid：

```tsx
<div className="lz-editor-content lz-editor-content--code">
  <div className="code-split" style={{ gridTemplateColumns: gridColumns(ratio) }}>
    <section className="code-pane" aria-label="Markdown 源码">
      <header className="code-pane-header">
        MARKDOWN SOURCE · UTF-8  |  字体 · Npx · Tab N 空格
      </header>
      <div className="lz-editor-page"><CM6Editor docId initialContent /></div>
    </section>
    <Splitter ratio={ratio} onChange={onRatio} />
    <section className="code-pane" aria-label="预览">
      <header className="code-pane-header">LIVE PREVIEW · 滚动同步</header>
      <div className="code-preview-scroll" ref={scrollRef}>
        <div className="preview-doc" ref={articleRef} />
      </div>
    </section>
  </div>
</div>
```

要点：

- **CM6 单例不动**。`cm6Visible = !codeMode` 与对应的 `display:none` 可以删——
  阅读模式在 `App.tsx` 里整块换成 `ReadMode`，LZEditor 根本不渲染，
  所以那套隐藏逻辑本来只服务代码模式。CM6 单例、工具栏、搜索、格式化、自动补全在代码模式继续可用。
- **右栏渲染管线照 `SidebarPreview` 抄**：`mdToHtml` → 写入 `.preview-doc`
  → `getTypographyTheme(typographyTheme)` 注入排版主题 → `renderMermaidBlocks(el, isDark)`。
- **滚动同步直接调 `useScrollSync`**，和编辑模式预览完全一致：按源码行号对位，
  预览点击跳源码，双向。
- **栏头做成 backtickle 那种细长小标**：源栏显示编码 + 字体 + 字号 + Tab 宽，
  预览栏显示「滚动同步」状态。**预览栏不放公众号复制按钮**（用户已确认去掉）。
- **不单独放退出按钮**：退出代码模式交给顶部工具栏的模式切换。
- `App.tsx` 的 `showRightPreview` 保持排除 code 不变——代码模式自己的右栏不占 App 的右面板。

## 4. 状态与持久化

`settingsStore` 新增 `codeSplitRatio?: number`，默认 0.5。
走已有的「全 store 订阅 + 250ms 防抖」落盘通道，`PERSIST_SKIP` 不动
（`activeGroup` / `subTab` 仍只跳过这两个导航态字段）。

代码模式私有状态全部删除：`codeEditMd`、`codeAreaRef`、`codeTocItems`、
`scrollToCodeHeading`、`handleCodeModeChange`、`LAYOUT_LABELS`、`LAYOUT_MAX_W`、`cm6Visible`。
内容的读写由 CM6 自己的 onChange 驱动（编辑模式本来就这样）。

## 5. CSS

删（仅代码模式使用）：

- `.read-mode-code`（floating.css）
- `.read-article-code` + `::placeholder` + `:focus`（read-mode.css）
- `.read-article-wrapper`、`.read-article-container`、`.read-article-header`、`.read-article-title`
- `.read-tags-row`、`.read-author-*`、`.read-avatar`、`.read-divider-v`
- `.read-views*`、`.read-mode-meta`

必须留（阅读模式共用）：

- `.read-mode-inline`、`.read-mode-body`、`.read-mode-toolbar`、`.read-mode-controls`
- `.read-mode-label`、`.read-mode-exit-btn`、`.read-font-size-value`、`.read-tool-btn`
- `.read-toc-*`、`.read-tag`（`StyleMainPanel` 也用）

`.read-frog*` 与代码模式无关（翻译扩展的 DOM 清理），不动。

新增：`.code-split`、`.code-pane`、`.code-pane-header`、`.code-preview-scroll`、
`.code-splitter`、`.code-splitter-line`。颜色、字号、间距全部走现有 `--` 变量，不写死色值。

## 6. 测试

新增 `tests/split.test.mjs` —— 三个纯函数的单测：

- `clampRatio`：正常区间原样返回；触碰 240px 下限时夹住；容器装不下两栏时退回 0.5
- `ratioFromPointer`：指针换算与 `clampRatio` 复合正确
- `gridColumns`：输出格式为 `minmax(0, Xfr) 6px minmax(0, Yfr)`，X + Y = 1

新增 `tests/code-mode-boundary.test.mjs` —— 接线与回归防线：

- `LZEditor.tsx` 里不再有 `textarea`，不再有 `read-article-code`
- `Splitter.tsx` 有 `role="separator"`、`aria-valuenow`、`onKeyDown` 键盘处理
- `LZEditor.tsx` 在 codeMode 分支里调用 `gridColumns`
- `App.tsx` 的 `showRightPreview` 仍排除 `appMode === 'code'`
- 共用样式规则仍在：`.read-mode-toolbar`、`.read-toc-*`（防误删阅读模式样式）

## 明确不做

- 不做 backtickle 的三态切换（纯源码 / 双栏 / 纯预览）
- 不复用 / 改造 `SidebarPreview`
- 不在代码模式保留旧的单栏 textarea 与阅读器壳，直接删
- 不新增退出代码模式的独立按钮
- 预览栏不放公众号复制按钮
- 不动 CM6 的创建方式与 `getCM6Editor()` 单例约定
