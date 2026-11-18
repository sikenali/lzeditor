# 统一阅读/样式模式大纲设计

## 意图与为什么

阅读模式与样式模式各自内嵌一个 `read-toc-sidebar` 目录侧栏，与顶栏「大纲」按钮触发的 `SidebarOutline` 组件功能重叠但实现不同：

- 样式模式有滚动同步（`useScrollSpy`），阅读模式是翻页式跳转（`pageOfLine`→`jumpTo`）。
- 顶栏「大纲」组件（`SidebarOutline`）在阅读/样式模式下**不可用**——它用编辑器光标行（`cursorPosition`）高亮、用 `getEditorFacade()` 跳转，而阅读/样式模式没有源码编辑器，点了没反应。

本次统一：阅读/样式模式的目录都改用顶栏「大纲」组件 `SidebarOutline`，保证目录与内容同步（样式模式按滚动同步、阅读模式按当前页同步），点击目录跳转到对应章节。

## 目标

- 阅读/样式模式显示统一大纲面板（`SidebarOutline`），不再各自内嵌 `read-toc-sidebar`。
- 目录与内容同步：样式模式滚动高亮跟随；阅读模式翻页高亮跟随当前页所在章节。
- 点击目录项跳转到对应章节（样式滚动到章节；阅读跳到章节所在页）。
- 「目录」按钮（阅读/样式模式工具栏）继续可用，改造成切换统一大纲面板（`showOutline`）。

## 非目标 / 反目标

- 不改编辑模式的 `SidebarOutline` 行为（光标高亮 + 编辑器跳转）。
- 不改阅读模式的翻页交互本身（仍是翻页式，不改成滚动式）。
- 不改变大纲面板的视觉样式（沿用 `SidebarOutline` 现有样式与面板容器）。
- 不同时保留内嵌目录和顶栏大纲（避免双份目录）。

## 约束

- `parseMdOutline` 的标题 id 与 `mdToHtml` 渲染的标题锚点 id 一致（已确认：均走 `headingId`/`makeHeadingIdGen`，除 `{#id}` 显式锚点边界情形外匹配）。
- 阅读/样式模式没有源码编辑器，`SidebarOutline` 不能依赖 `getEditorFacade()`。
- `SidebarOutline` 渲染在 App 骨架（`.app-left-body` / `.app-main`），与内容模式组件（ReadMode / StyleMainPanel）分离，需跨组件通信。

## 方案

### 方案 A（选定）：`SidebarOutline` 模式感知 + 跳转注册表

**新增「大纲跳转注册表」**：`src/utils/outlineJump.ts`，`registerOutlineJumper(fn)` / `getOutlineJumper()`（仿照 `components/editor/facade/registry.ts` 的模块级单例）。

**`SidebarOutline` 感知模式**（读 store `appMode`）：

- 编辑模式：现状不变——`cursorPosition` 行号算 `currentSectionIndex` 高亮；点击用 `getEditorFacade().setSelection/focus` 跳转。
- 阅读/样式模式：用 store `activeTocId` 高亮（`items.findIndex(i => i.id === activeTocId)`）；点击调用 `getOutlineJumper()?.(item.id)`。

**阅读模式（ReadMode）**：

- 移除内嵌 `read-toc-sidebar` 与 `readTocOpen` 布局逻辑。
- 翻页同步：`spread`/`pages` 变化时，取当前页对的首个源码行，反查最后一个不晚于该行的 `parseMdOutline` 项 → `setActiveTocId(id)`。
- 挂载时注册跳转：`registerOutlineJumper((id) => { const it = toc.find(i => i.id === id); if (!it) return; const p = pageOfLine(pages, it.line - 1); jumpTo(p === null ? 0 : Math.floor(p / 2)); })`。

**样式模式（StyleMainPanel）**：

- 移除内嵌 `read-toc-sidebar` 与 `readTocOpen` 布局逻辑。
- 滚动同步改用 `parseMdOutline(md)` 的 id（当前是 `style-h-${i}`，需改为渲染锚点 id）：`useScrollSpy` 的 `items` 由渲染 DOM 中带 id 的标题元素构成，`setActiveId` → `setActiveTocId`。
- 挂载时注册跳转：`registerOutlineJumper((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))`。

**「目录」按钮**（阅读/样式模式工具栏）：`onClick` 改为 `setShowOutline(!showOutline)`。

**store 清理**：移除 `readTocOpen`（统一后无使用者）；`tocItems` 仅被内嵌目录读取，统一后无读者，一并移除（若实现中发现它处仍引用则保留）。

**样式清理**：移除不再被引用的 `read-toc-*` 死样式（`read-toc-sidebar` / `read-toc-header` / `read-toc-list` / `read-toc-item` / `read-toc-dot` / `read-toc-text` / `read-toc-close`）。

### 方案 C（未选）：大纲作为子组件塞进模式内

把 `SidebarOutline` 渲染进 ReadMode / StyleMainPanel 内部，跳过全局注册表。结构改动更大（大纲要从 App 骨架挪进各模式），顶栏「大纲」按钮也不好直接控制它，弃。

## 留给实现者的部分

- `SidebarOutline` 内容模式下 `current` 从 `activeTocId` 反查 index，注意 `activeTocId` 为空/失配时兜底（`-1` 不高亮）。
- 阅读模式「当前页章节」反查的精确启发式：当前页对的首个块源码行 → 最后一个不晚于该行的标题；空页/末页边界处理。
- 样式模式滚动同步 id 与 `parseMdOutline` 对齐；`useScrollSpy` 的 `items[].el` 依赖渲染后 DOM 已就绪（现有 effect 时序已满足）。
- 移除 `readTocOpen` / `tocItems` 前确认无其它引用（含 tests）。
- `read-toc-*` 样式是否还有其它引用（如 SidebarPreview）再决定删除范围。
