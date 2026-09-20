# Toolbar & Statusbar 毛玻璃卡片风格实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重新设计 Toolbar 和 Statusbar，采用毛玻璃卡片风格，跟随主题切换（深色/浅色），保持暖色调统一。

**Architecture:** 使用 CSS 变量系统驱动颜色和样式，通过 `data-theme` 属性区分深浅色模式。Toolbar 和 Statusbar 各自独立维护一套变量，确保主题切换时自动适配。

**Tech Stack:** CSS Variables, Tailwind-like utility classes, React (无组件改动)

## Global Constraints

- 所有颜色通过 CSS 变量定义，不硬编码
- 深色和浅色模式都必须有完整的变量定义
- 保持现有的 HTML 结构和类名不变
- 过渡动画 0.2s ease

---

### Task 1: 更新 color-tokens.css 变量

**Files:**
- Modify: `src/styles/color-tokens.css`

**Interfaces:**
- Consumes: 现有 `:root` 和 `[data-theme="light"]` 块
- Produces: 新的 toolbar 和 statusbar 变量

- [ ] **Step 1: 在 :root (深色模式) 中添加变量**

找到 `:root {` 块中的 `--toolbar-bg` 部分（约第56行），替换为：

```css
/* Toolbar — 毛玻璃卡片 */
--toolbar-bg: rgba(15,12,10,0.85);
--toolbar-hover: rgba(255,255,255,0.08);
--toolbar-active-bg: rgba(212,168,67,0.25);
--toolbar-icon: rgba(245,240,230,0.85);
--toolbar-icon-hover: rgba(255,255,255,0.95);
--toolbar-label: rgba(245,240,230,0.65);
--toolbar-label-hover: rgba(255,255,255,0.85);
--toolbar-active-icon: #d4a843;
--toolbar-border: rgba(255,255,255,0.06);

/* Statusbar — 毛玻璃卡片 */
--statusbar-bg: rgba(15,12,10,0.90);
--statusbar-text: rgba(245,240,230,0.85);
--statusbar-text-dim: rgba(200,185,165,0.65);
--statusbar-divider: rgba(194,168,122,0.3);
--statusbar-seal-bg: linear-gradient(135deg, #c23a2b, #d4624a);
--statusbar-pill-border: rgba(194,168,122,0.3);
--statusbar-pill-hover-bg: rgba(194,58,43,0.12);
--statusbar-pill-hover-border: rgba(194,58,43,0.5);
--statusbar-pill-hover-text: rgba(212,168,67,1);
--statusbar-icon-bg: rgba(61,51,34,1);
--statusbar-icon-text: rgba(212,196,160,1);
--statusbar-icon-hover: rgba(194,58,43,0.7);
--statusbar-badge-bg: rgba(61,51,34,0.6);
--statusbar-badge-border: rgba(194,168,122,0.2);
```

- [ ] **Step 2: 在 [data-theme="light"] 中添加变量**

找到 `[data-theme="light"]` 块中的 `--toolbar-bg` 部分（约第204行），替换为：

```css
/* Toolbar — 毛玻璃卡片 */
--toolbar-bg: rgba(250,246,237,0.88);
--toolbar-hover: rgba(0,0,0,0.05);
--toolbar-active-bg: rgba(194,58,43,0.12);
--toolbar-icon: rgba(44,36,22,0.85);
--toolbar-icon-hover: rgba(0,0,0,0.95);
--toolbar-label: rgba(44,36,22,0.65);
--toolbar-label-hover: rgba(0,0,0,0.85);
--toolbar-active-icon: #c23a2b;
--toolbar-border: rgba(0,0,0,0.06);

/* Statusbar — 毛玻璃卡片 */
--statusbar-bg: rgba(248,243,232,0.92);
--statusbar-text: rgba(44,36,22,0.85);
--statusbar-text-dim: rgba(100,80,60,0.65);
--statusbar-divider: rgba(194,168,122,0.4);
--statusbar-seal-bg: linear-gradient(135deg, #c23a2b, #d4624a);
--statusbar-pill-border: rgba(194,168,122,0.5);
--statusbar-pill-hover-bg: rgba(194,58,43,0.06);
--statusbar-pill-hover-border: rgba(194,58,43,0.4);
--statusbar-pill-hover-text: #c23a2b;
--statusbar-icon-bg: rgba(240,235,225,1);
--statusbar-icon-text: rgba(61,43,31,1);
--statusbar-icon-hover: rgba(194,58,43,0.15);
--statusbar-badge-bg: rgba(240,235,225,1);
--statusbar-badge-border: rgba(194,168,122,0.5);
```

- [ ] **Step 3: 删除旧的 toolbar-dark-* 变量**

搜索并删除以下内容（如果存在）：
- `--toolbar-dark-bg`
- `--toolbar-dark-border`
- `--toolbar-dark-hover`
- `--toolbar-dark-active`
- `--toolbar-active-line`

- [ ] **Step 4: 验证 TypeScript**

```bash
npx tsc --noEmit
```

预期：无错误

- [ ] **Step 5: 提交**

```bash
git add src/styles/color-tokens.css
git commit -m "feat: add mica card theme variables for toolbar and statusbar"
```

---

### Task 2: 更新 layout.css 样式

**Files:**
- Modify: `src/styles/layout.css`

**Interfaces:**
- Consumes: 新的 CSS 变量
- Produces: 更新后的 toolbar 和 statusbar 样式

- [ ] **Step 1: 更新 .toolbar 样式**

找到 `.toolbar {` 块，替换为：

```css
/* ── Toolbar — Mica glass card ── */
.toolbar {
  display: flex; align-items: center;
  height: 52px; padding: 0 16px;
  background: var(--toolbar-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--toolbar-border);
  gap: 4px; flex-shrink: 0;
  position: sticky; top: 0; z-index: 100;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.15);
}
```

- [ ] **Step 2: 更新 .toolbar-btn 样式**

找到 `.toolbar-btn {` 块，替换为：

```css
/* ── Toolbar Button ── */
.toolbar-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; padding: 6px 10px;
  min-width: 48px; transition: color 0.15s, background 0.15s; cursor: pointer;
  border-radius: 8px; border: none; background: transparent; position: relative;
  -webkit-tap-highlight-color: transparent;
}
.toolbar-btn:hover   { background: var(--toolbar-hover); }
.toolbar-btn:hover .toolbar-icon { color: var(--toolbar-icon-hover); }
.toolbar-btn:hover .toolbar-label { color: var(--toolbar-label-hover); }
.toolbar-btn:active { transform: scale(0.95); transition: transform 80ms ease-out; }
/* Active: colored icon + underline */
.toolbar-btn.active  { background: var(--toolbar-active-bg); }
.toolbar-btn.active .toolbar-icon { color: var(--toolbar-active-icon); }
.toolbar-btn.active .toolbar-label { color: var(--toolbar-active-icon); }
.toolbar-btn.active::after {
  content: '';
  position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
  width: 60%; height: 2px; border-radius: 1px;
  background: var(--toolbar-active-icon);
  opacity: 0.6;
}
.toolbar-icon { font-size: 18px; color: var(--toolbar-icon); line-height: 1; transition: color 0.15s; }
.toolbar-label { font-size: 11px; color: var(--toolbar-label); transition: color 0.15s; white-space: nowrap; letter-spacing: -0.01em; }
.toolbar-label-hidden { display: none; }
```

- [ ] **Step 3: 更新 .statusbar 样式**

找到 `.statusbar {` 块，替换为：

```css
/* ── Status Bar — Mica glass card ── */
.statusbar {
  display: flex; align-items: center; justify-content: space-between;
  height: 42px; padding: 0 20px;
  background: var(--statusbar-bg);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-top: 1px solid var(--toolbar-border);
  font-size: 12px; color: var(--statusbar-text-dim);
  flex-shrink: 0; gap: 20px;
  position: sticky; bottom: 0; z-index: 100;
}
```

- [ ] **Step 4: 更新状态栏子元素样式**

更新以下选择器使用新变量：

```css
.statusbar-seal {
  width: 22px; height: 22px;
  background: var(--statusbar-seal-bg);
  border-radius: 5px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 11px; flex-shrink: 0;
}

.statusbar-item { display: flex; align-items: center; gap: 6px; color: var(--statusbar-text); }
.statusbar-divider { width: 1px; height: 18px; background: var(--statusbar-divider); border-radius: 1px; }

.statusbar-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 14px; border-radius: 999px;
  background: transparent;
  border: 1px solid var(--statusbar-pill-border);
  cursor: pointer; font-size: 12px;
  color: var(--statusbar-text-dim);
  transition: all 0.2s ease;
  white-space: nowrap;
}
.statusbar-pill:hover {
  border-color: var(--statusbar-pill-hover-border);
  color: var(--statusbar-pill-hover-text);
  background: var(--statusbar-pill-hover-bg);
}

.statusbar-icon-btn {
  width: 26px; height: 26px;
  background: var(--statusbar-icon-bg);
  border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  color: var(--statusbar-icon-text); font-size: 12px;
  border: none; cursor: pointer;
  transition: all 0.2s ease;
}
.statusbar-icon-btn:hover {
  background: var(--statusbar-icon-hover);
  transform: translateY(-1px);
}

.statusbar-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 10px; border-radius: 999px;
  font-size: 11px;
  color: var(--statusbar-text);
  background: var(--statusbar-badge-bg);
  border: 1px solid var(--statusbar-badge-border);
}
```

- [ ] **Step 5: 验证 TypeScript**

```bash
npx tsc --noEmit
```

预期：无错误

- [ ] **Step 6: 提交**

```bash
git add src/styles/layout.css
git commit -m "feat: update toolbar and statusbar to mica glass card style"
```

---

### Task 3: 验证和测试

**Files:**
- 无需新建文件

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev:web
```

- [ ] **Step 2: 验证深色模式**

访问 http://localhost:5173，确认：
- [ ] Toolbar 背景为深蓝黑 `rgba(15,12,10,0.85)`
- [ ] 图标和文字为暖米白色
- [ ] 点击按钮后出现金色高亮和下划线
- [ ] Statusbar 背景与 Toolbar 协调
- [ ] Seal 图标显示红色渐变

- [ ] **Step 3: 验证浅色模式**

切换到浅色主题，确认：
- [ ] Toolbar 背景为暖米白 `rgba(250,246,237,0.88)`
- [ ] 图标和文字为深墨色
- [ ] 点击按钮后出现红色高亮和下划线
- [ ] Statusbar 背景为浅暖色
- [ ] 整体视觉协调

- [ ] **Step 4: 验证毛玻璃效果**

- [ ] Toolbar 有模糊背景效果
- [ ] 滚动页面时背景内容可见但模糊
- [ ] 过渡动画平滑（0.15-0.2s）

- [ ] **Step 5: 最终提交（如有需要）**

```bash
git add -A
git commit -m "chore: finalize toolbar and statusbar mica card redesign"
```

---

## 成功标准

- [ ] 深色模式下 toolbar/statusbar 背景为深蓝黑，文字为暖米白
- [ ] 浅色模式下 toolbar/statusbar 背景为暖米白，文字为深墨色
- [ ] 切换主题时过渡平滑（0.2s transition）
- [ ] 按钮 hover/active 状态在两种模式下都清晰可见
- [ ] 毛玻璃效果在两种模式下都有良好表现
- [ ] TypeScript 编译无错误
- [ ] 浏览器控制台无报错
