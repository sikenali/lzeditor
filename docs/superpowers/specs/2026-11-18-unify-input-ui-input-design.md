# 设计：统一输入框为 ui-input（去掉 ui-input-control）

日期：2026-11-18

## 意图 / 为什么

内层 `ui-input-control` 类是冗余的：任何放进 `.ui-input` 容器的 `<input>` 都应当
自动无边框、透明底、继承 `--color-text-primary`。查找/替换（SearchPanel）手写了
`.search-input-group` + `.search-input`，把 `.ui-input` / `.ui-input-control` 的
§8.2 样式重复维护了一遍，容易漂移。统一到 `ui-input` 容器，消除重复。

参考样式 = 文档库 `<input class="library-url-input">`（带边框 42px 盒）：
`0.7px solid var(--color-border)`、`var(--color-bg-secondary)`、`var(--radius-md)`、
focus 时 `var(--color-bg-white)` + 主色边框。`ui-input` 容器视觉上与之相同，仅 DOM
结构不同（容器 div + 无边框内层 input vs 单个带边框 input）。

## 目标

- 去掉 `ui-input-control` 类，改用 `.ui-input input` 后代选择器：内层 `<input>`
  无边框、`outline:none`、透明底、`color:var(--color-text-primary)`、
  `font-size:var(--text-md)`；`::placeholder` / `:disabled` 用 `--color-text-muted`。
- 查找/替换改用 `ui-input` 容器：「查找」「替换」标签作为前缀 `<span>` 保留在
  容器内，内层 `<input>` 不再带 `search-input` 类。
- 删除 panels.css 里 `.search-input-group` / `.search-input` 的重复 §8.2 样式。
- `library-url-input` / `library-search-input` / `library-folder-rename-input`
  保持不动：前两者已符合参考样式；重命名框是 34px 紧凑档、测试明确标注的例外。

## 非目标 / 反目标

- 不改 font-size 体系（`--text-md` 14px 保持 §8.2 基线；不改 `library-url-input`
  的 12px）。
- 不改 `library-folder-rename-input` 的 34px 紧凑例外。
- 不引入「单个带边框 input」替换 `ui-input` 容器结构（会破坏 prefix / clear /
  suffix 能力与 find/replace 的标签前缀）。

## 做法

1. `src/styles/ui.css`：`.ui-input-control`、`.ui-input-control::placeholder`、
   `.ui-input-control:disabled` → `.ui-input input`、`.ui-input input::placeholder`、
   `.ui-input input:disabled`（属性不变）。
2. `src/components/ui/UiInput.tsx`：内层 `<input>` 去掉 `className="ui-input-control"`。
3. `src/components/panels/SearchPanel.tsx`：两处 `.search-input-group` → `ui-input`；
   两处 `<input className="search-input">` → 无 class；`.search-input-label` 保留。
4. `src/styles/panels.css`：删 `.search-input-group`、`.search-input-group:focus-within`、
   `.search-input`、`.search-input::placeholder`，及文件尾部
   `.search-input { color: var(--t-fg-16); }`；保留 `.search-input-label`。
5. `tests/input-css-boundary.test.mjs`：
   - CHECKS 里 `.ui-input-control::placeholder` → `.ui-input input::placeholder`。
   - 移除 `.search-input-group` 检查项（find/replace 现在走 `.ui-input`，由第一项覆盖），
     并删除「`.search-input-group` 只定义一次」的测试与 `.search-input-group` 尾部重复定义相关注释。

## 留给实现者的决定

- `.search-input-label` 字号保持 13px（与内层 `--text-md` 14px 差 1px，属既有外观，不改）。
