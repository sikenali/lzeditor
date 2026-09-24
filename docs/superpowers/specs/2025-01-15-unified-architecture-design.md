# LZEditor 统一架构重构设计

## 1. 背景与问题

### 1.1 当前问题

**弹框左侧栏显示异常（核心痛点）：**
- UnifiedDialog 已存在 7 个弹框正确使用左侧导航（Export/Code/Formula/Image/Link/Emoji/Chart）
- 但 SettingsDialog、LibraryPanel（弹窗模式）、FilePanel、PreviewPanel 使用自定义 HTML 结构，引用了相似的 CSS 类名但结构不匹配，导致左侧 chips 无法正确渲染
- 根因：UnifiedDialog 在 `ccc2084` 提交时创建，但这些旧弹框在其之前编写，两者 HTML 结构不兼容

**状态管理冗余：**
- `showBottomPanel` 与 `mainBottomPanel` 功能重复
- `isReadMode` 与 `appMode` 概念重叠
- ReadMode（全屏遮罩）与 InlineReadPreview（内联）双轨并存

**模式边界模糊：**
- `isReadMode=true` 时主区显示 InlineReadPreview
- `mainBottomPanel='history'` 时也显示 MainContentPreview + 底部历史栏
- 两者关系不清，用户困惑

### 1.2 目标

- 统一所有弹框到 UnifiedDialog 组件
- 用单一 `appMode` 状态机管理所有界面模式
- 修复左侧导航 chips 显示问题
- 保持已有功能不丢失

---

## 2. 模式状态机设计

### 2.1 状态定义

```typescript
// editorStore.ts
appMode: 'edit' | 'code' | 'style' | 'history' | 'read'
```

### 2.2 模式行为矩阵

| appMode | 主内容区 | 底部面板 | Toolbar | MetaBar | StatusBar | 侧边栏 |
|---------|---------|---------|---------|---------|-----------|--------|
| `edit` | LZEditor | 无 | 可见 | 可见 | 可见 | Library/Outline/Preview 可控 |
| `code` | Code Textarea | 无 | 可见 | 可见 | 可见 | Library/Outline/Preview 可控 |
| `style` | 阅读预览 (read-article-body) | 样式操作栏+卡片列表 | 可见(样式按钮高亮) | 可见 | 可见 | 保持原状态 |
| `history` | 阅读预览 (read-article-body) | 版本操作栏+时间线 | 可见(历史按钮高亮) | 可见 | 可见 | 保持原状态 |
| `read` | 全屏阅读(含TOC) | 无 | **隐藏** | **隐藏** | **隐藏** | TOC 替代 Library |

### 2.3 模式切换规则

```
edit ──[代码按钮]──→ code
edit ──[样式按钮]──→ style
edit ──[历史按钮]──→ history
edit ──[模式菜单→阅读]──→ read
code ──[编辑按钮]──→ edit
style ──[底部关闭]──→ edit
history ──[底部关闭]──→ edit
read ──[退出阅读]──→ edit
```

### 2.4 删除的冗余状态

| 删除字段 | 替代方案 |
|---------|---------|
| `showBottomPanel` | 删除（与 mainBottomPanel 重复） |
| `mainBottomPanel` | 删除（由 appMode 替代） |
| `showHistory` | 删除（由 appMode 替代） |
| `isReadMode` | 删除（由 appMode === 'read' 替代） |
| `codeMode` | 保留但改为 appMode === 'code' 驱动 |

---

## 3. UnifiedDialog 统一规范

### 3.1 组件结构

```tsx
<UnifiedDialog
  onClose={...}
  icon="ri-xxx"           // 头部图标
  title="标题"             // 主标题
  subtitle="副标题"        // 可选副标题
  leftNav={...}           // 左侧导航 chip 列表（可选）
  rightTop={...}          // 右侧顶部区域（可选）
  rightContent={...}      // 右侧主要内容区
  rightBottom={...}       // 右侧底部区域（可选）
  hint="提示文字"          // 底部提示
  cancelText="取消"        // 取消按钮文字
  submitText="确定"        // 提交按钮文字（可选）
  onSubmit={...}          // 提交回调
  submitDisabled={false}  // 提交按钮禁用状态
  size="md"               // sm | md | lg | xl
/>
```

### 3.2 CSS 规范

所有弹窗统一使用 `unified-dialog` 类，CSS 定义在 `settings-dialog.css`：

- `.unified-dialog` — 容器：圆角、毛玻璃、居中
- `.ud-header` — 头部：图标 + 标题组 + 关闭按钮
- `.ud-body` — 主体：flex column，flex: 1
- `.ud-body-split` — 左右分栏：leftNav + rightContent
- `.ud-left` — 左侧：220px 宽，chip 列表
- `.ud-right` — 右侧：flex: 1，分 top/content/bottom 三区
- `.ud-footer` — 底部：提示 + 操作按钮
- `.ud-chip` — 导航 chip：hover/active 状态

### 3.3 待迁移弹框改造方案

#### SettingsDialog
- leftNav: 7 个设置分类 chip（主题/编辑/应用/AI/快捷键/同步/关于）
- rightContent: 根据 activeGroup 动态渲染对应设置项
- 保留现有 sub-tab 切换逻辑

#### LibraryPanel（弹窗模式）
- leftNav: 4 个来源 chip（文档库/Git仓库/博客/GitBook）
- rightContent: 对应来源的内容区
- sidebar 模式保持不变（独立组件）

#### FilePanel
- leftNav: 4 个模板 chip（空白/Markdown/报告/笔记）
- rightContent: 模板预览 + 打开文件 + 新建按钮
- 简化为单列布局

#### PreviewPanel
- 无 leftNav（单列）
- rightContent: 预览内容 + 公众号复制 + 源码切换
- 简化为 rightContent-only 模式

---

## 4. 阅读模式（read）详细设计

### 4.1 全屏独占布局

```
┌─────────────────────────────────────────────────────┐
│  [📄 文档名]     [A-][A+][窄|标|宽]     [×退出阅读]  │  ← TopBar
├──────────────┬──────────────────────────────────────┤
│  📑 目录      │                                      │
│  ├─ 一级标题  │  文章内容区（支持 scrollSpy 高亮）    │
│  │  二级标题  │                                      │
│  ├─ 一级标题  │  ...                                 │
│  └─ ...      │                                      │
└──────────────┴──────────────────────────────────────┘
```

### 4.2 交互行为

- 点击左侧 TOC 条目 → 右侧滚动到对应锚点（smooth scroll）
- 右侧滚动 → 左侧高亮当前可见章节（scrollSpy）
- 快捷键：`⌘+B` 切换目录显示，`⌘ +/-` 缩放字体
- 退出阅读 → 回到 `edit` 模式，恢复原侧边栏状态

### 4.3 与现有 ReadMode 的关系

- `ReadMode.tsx` 保留作为基础实现
- 新建 `ReadView.tsx` 封装全屏阅读逻辑，集成到 appMode === 'read'
- 删除 `InlineReadPreview.tsx`（由 ReadView 替代）

---

## 5. 实施步骤

### Step 1: Store 重构
- `editorStore.ts`: 新增 `appMode`，删除 `showBottomPanel`/`mainBottomPanel`/`showHistory`
- `types.ts`: 同步更新类型定义

### Step 2: UnifiedDialog 增强
- 补充缺少的 CSS（如 `.ud-right-top` 的 padding）
- 确保 `size` 参数正确映射到宽度

### Step 3-6: 弹框迁移
- SettingsDialog → UnifiedDialog
- LibraryPanel（弹窗模式）→ UnifiedDialog
- FilePanel → UnifiedDialog
- PreviewPanel → UnifiedDialog

### Step 7: App.tsx 重写
- 根据 `appMode` 条件渲染不同布局
- 处理模式切换动画

### Step 8: Toolbar 调整
- 模式按钮绑定到 `appMode`
- 历史/样式按钮激活状态同步

### Step 9: HistoryPanel 统一
- 支持 `inline` 和 `modal` 两种模式
- inline 模式由 appMode === 'history' 驱动

### Step 10: 清理
- 删除无用组件和 CSS
- TypeScript 类型清理

---

## 6. 兼容性说明

- 不改变任何业务逻辑（保存、导出、AI 等）
- 不改变 localStorage 数据结构
- 不改变 Toolbar 按钮的视觉外观（仅修复样式）
- Sidebar 开关（Library/Outline/Preview）行为不变
