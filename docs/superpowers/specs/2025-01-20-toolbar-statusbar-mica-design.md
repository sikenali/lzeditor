# Toolbar & Statusbar 毛玻璃卡片风格设计

## 概述

重新设计 Toolbar 和 Statusbar，采用毛玻璃卡片风格，跟随主题切换（深色/浅色），保持暖色调统一。

## 设计原则

1. **跟随主题**：深色和浅色模式下自动适配颜色和对比度
2. **毛玻璃效果**：半透明背景 + backdrop-filter 模糊
3. **暖色调统一**：保持项目的东方美学风格
4. **层次清晰**：Toolbar > 内容区 > Statusbar 视觉层次分明

## 配色方案

### 深色模式

| 元素 | 颜色值 | 用途 |
|------|--------|------|
| Toolbar 背景 | `rgba(15,12,10,0.85)` | 主背景 |
| Statusbar 背景 | `rgba(15,12,10,0.90)` | 主背景 |
| 主要文字 | `rgba(245,240,230,0.85)` | 图标和标签 |
| 次要文字 | `rgba(200,185,165,0.65)` | 辅助信息 |
| Hover 背景 | `rgba(255,255,255,0.08)` | 悬停反馈 |
| Active 背景 | `rgba(212,168,67,0.25)` | 激活状态 |
| Active 图标 | `#d4a843` | 金色高亮 |
| 边框/分割线 | `rgba(255,255,255,0.06)` | 分隔元素 |

### 浅色模式

| 元素 | 颜色值 | 用途 |
|------|--------|------|
| Toolbar 背景 | `rgba(250,246,237,0.88)` | 主背景 |
| Statusbar 背景 | `rgba(248,243,232,0.92)` | 主背景 |
| 主要文字 | `rgba(44,36,22,0.85)` | 图标和标签 |
| 次要文字 | `rgba(100,80,60,0.65)` | 辅助信息 |
| Hover 背景 | `rgba(0,0,0,0.05)` | 悬停反馈 |
| Active 背景 | `rgba(194,58,43,0.12)` | 激活状态 |
| Active 图标 | `#c23a2b` | 印章红高亮 |
| 边框/分割线 | `rgba(0,0,0,0.06)` | 分隔元素 |

## CSS 变量设计

### color-tokens.css

```css
/* 深色模式 */
:root {
  /* Toolbar */
  --toolbar-bg: rgba(15,12,10,0.85);
  --toolbar-hover: rgba(255,255,255,0.08);
  --toolbar-active-bg: rgba(212,168,67,0.25);
  --toolbar-icon: rgba(245,240,230,0.85);
  --toolbar-icon-hover: rgba(255,255,255,0.95);
  --toolbar-label: rgba(245,240,230,0.65);
  --toolbar-label-hover: rgba(255,255,255,0.85);
  --toolbar-active-icon: #d4a843;
  --toolbar-border: rgba(255,255,255,0.06);
  
  /* Statusbar */
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
}

/* 浅色模式 */
[data-theme="light"] {
  /* Toolbar */
  --toolbar-bg: rgba(250,246,237,0.88);
  --toolbar-hover: rgba(0,0,0,0.05);
  --toolbar-active-bg: rgba(194,58,43,0.12);
  --toolbar-icon: rgba(44,36,22,0.85);
  --toolbar-icon-hover: rgba(0,0,0,0.95);
  --toolbar-label: rgba(44,36,22,0.65);
  --toolbar-label-hover: rgba(0,0,0,0.85);
  --toolbar-active-icon: #c23a2b;
  --toolbar-border: rgba(0,0,0,0.06);
  
  /* Statusbar */
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
}
```

## 实现要点

### 1. Toolbar 样式

```css
.toolbar {
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 16px;
  background: var(--toolbar-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--toolbar-border);
  gap: 4px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.15);
}
```

### 2. Statusbar 样式

```css
.statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  padding: 0 20px;
  background: var(--statusbar-bg);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-top: 1px solid var(--toolbar-border);
  font-size: 12px;
  color: var(--statusbar-text-dim);
  flex-shrink: 0;
  gap: 20px;
  position: sticky;
  bottom: 0;
  z-index: 100;
}
```

### 3. 按钮样式

- 默认：使用 `--toolbar-icon` / `--toolbar-label`
- Hover：使用 `--toolbar-icon-hover` / `--toolbar-label-hover` + `--toolbar-hover` 背景
- Active：使用 `--toolbar-active-icon` + `--toolbar-active-bg` 背景 + 底部金线/红线

## 文件变更清单

1. `src/styles/color-tokens.css` - 添加新变量
2. `src/styles/layout.css` - 更新 toolbar/statusbar 样式
3. 无需修改组件代码（类名不变）

## 成功标准

- [ ] 深色模式下 toolbar/statusbar 背景为深蓝黑，文字为暖米白
- [ ] 浅色模式下 toolbar/statusbar 背景为暖米白，文字为深墨色
- [ ] 切换主题时过渡平滑（0.2s transition）
- [ ] 按钮 hover/active 状态在两种模式下都清晰可见
- [ ] 毛玻璃效果在两种模式下都有良好表现
