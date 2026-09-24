# LZEditor 统一架构重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一 LZEditor 的模式状态机和弹框体系，修复左侧导航 chips 显示问题，建立 appMode 驱动的统一架构。

**Architecture:** 单一 `appMode` 状态机替代分散的 `isReadMode/codeMode/mainBottomPanel/showBottomPanel`；所有弹框统一迁移到 UnifiedDialog 组件；5 种模式（edit/code/style/history/read）行为明确定义。

**Tech Stack:** React 18, TypeScript 5, Zustand, TipTap, Vite

## Global Constraints

- 不改变任何业务逻辑（保存、导出、AI 调用等）
- 不改变 localStorage 数据结构
- 不改变 Toolbar 按钮视觉外观（仅修复样式/绑定）
- Sidebar 开关（Library/Outline/Preview）行为不变
- TypeScript 编译必须通过（排除已有 BookPreview 错误）
- 每次任务提交前运行 `npx tsc --noEmit` 验证

---

## File Map

| 操作 | 文件 |
|------|------|
| Modify | `src/shared/types.ts` — 添加 appMode 类型 |
| Modify | `src/store/editorStore.ts` — 合并状态字段，新增 appMode |
| Modify | `src/components/ui/UnifiedDialog.tsx` — 补充 export 类型 |
| Modify | `src/components/panels/SettingsDialog.tsx` — 迁移到 UnifiedDialog |
| Modify | `src/components/panels/LibraryPanel.tsx` — 弹窗模式迁移到 UnifiedDialog |
| Modify | `src/components/panels/FilePanel.tsx` — 迁移到 UnifiedDialog |
| Modify | `src/components/panels/PreviewPanel.tsx` — 迁移到 UnifiedDialog |
| Modify | `src/components/panels/HistoryPanel.tsx` — 统一 inline/modal 两种模式 |
| Modify | `src/components/panels/MainContentPreview.tsx` — 简化为纯预览组件 |
| Modify | `src/components/panels/StyleMainPanel.tsx` — 适配新 appMode |
| Modify | `src/components/layout/Toolbar.tsx` — 模式按钮绑定到 appMode |
| Modify | `src/App.tsx` — 重写主渲染逻辑 |
| Modify | `src/styles/settings-dialog.css` — 清理冗余 CSS |
| Modify | `src/styles/panels.css` — 清理冗余 CSS |
| Delete | `src/components/panels/InlineReadPreview.tsx` |
| Delete | `src/components/panels/MainContentPreview.tsx` |
| Delete | `src/components/panels/StyleMainPanel.tsx` |
| Delete | `src/components/panels/HistoryBottomPanel.tsx` |
| Delete | `src/components/panels/StylePreviewBottomPanel.tsx` |

---

## Task 1: Store 重构 — appMode 状态机

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/store/editorStore.ts`

**Interfaces:**
- Consumes: 现有 EditorStoreState 接口
- Produces: `appMode: 'edit' \| 'code' \| 'style' \| 'history' \| 'read'`，`setAppMode: (mode) => void`

- [ ] **Step 1: 更新 types.ts — 添加 appMode 类型并删除冗余字段**

在 `src/shared/types.ts` 中：
1. 找到 `EditorStoreState` 接口（约第 71 行）
2. 删除以下字段：
   - `isReadMode: boolean`
   - `showBottomPanel: 'none' | 'history' | 'style'`
   - `mainBottomPanel: 'none' | 'history' | 'style'`
   - `showHistory: boolean`
3. 删除对应的 setter：
   - `setReadMode: (isReadMode: boolean) => void`
   - `setShowBottomPanel: (panel: 'none' | 'history' | 'style') => void`
   - `setShowHistory: (showHistory: boolean) => void`
4. 新增：
   ```typescript
   appMode: 'edit' | 'code' | 'style' | 'history' | 'read'
   setAppMode: (mode: 'edit' | 'code' | 'style' | 'history' | 'read') => void
   ```
5. 保留 `codeMode: boolean`（向后兼容，Toolbar 等仍在使用）

- [ ] **Step 2: 更新 editorStore.ts — 替换冗余状态为 appMode**

在 `src/store/editorStore.ts` 中：
1. 删除初始值：
   - `isReadMode: false`
   - `showBottomPanel: 'none' as 'none' | 'history' | 'style'`
   - `showHistory: false`
   - `mainBottomPanel: 'none' as 'none' | 'history' | 'style'`
2. 新增初始值：`appMode: 'edit' as const`
3. 删除 setter：
   - `setReadMode: (isReadMode: boolean) => set({ isReadMode })`
   - `setShowBottomPanel: ...`
   - `setShowHistory: ...`
   - `setMainBottomPanel: ...`
4. 新增 setter：
   ```typescript
   setAppMode: (appMode: 'edit' | 'code' | 'style' | 'history' | 'read') => set({ appMode }),
   ```
5. 保留 `setCodeMode` 和 `codeMode`（向后兼容）

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd /home/jingle/opc/lzeditor
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```
Expected: 无新增错误（仅有 BookPreview 既有错误）

- [ ] **Step 4: Commit**

```bash
git add src/shared/types.ts src/store/editorStore.ts
git commit -m "refactor: 统一 appMode 状态机，删除冗余 showBottomPanel/showHistory 字段"
```

---

## Task 2: UnifiedDialog 增强

**Files:**
- Modify: `src/components/ui/UnifiedDialog.tsx`

**Interfaces:**
- Consumes: 现有组件接口
- Produces: 新增 `NavChip` 类型导出，确保 CSS 类名一致

- [ ] **Step 1: 确保 NavChip 类型正确导出**

在 `src/components/ui/UnifiedDialog.tsx` 中，确认第 80-92 行：
```typescript
export interface NavChip {
  id: string
  label: string
  icon: string
  desc?: string
}

export const NavChipItem: React.FC<{ chip: NavChip; active: boolean; onClick: () => void }> = ({ chip, active, onClick }) => (
  <button className={`ud-chip${active ? ' active' : ''}`} onClick={onClick}>
    <span className={`remix ud-chip-icon ${chip.icon}`}></span>
    <span className="ud-chip-label">{chip.label}</span>
    {chip.desc && <span className="ud-chip-desc">{chip.desc}</span>}
  </button>
)
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/UnifiedDialog.tsx
git commit -m "feat: 确保 NavChip 类型正确导出供迁移弹框使用"
```

---

## Task 3: SettingsDialog 迁移到 UnifiedDialog

**Files:**
- Modify: `src/components/panels/SettingsDialog.tsx`

**Interfaces:**
- Consumes: `useSettingsStore`, `UnifiedDialog`, `NavChipItem`, `UDSection`, `UDSettingRow`, `UDToggle`, `UDSelect`, `UDInput`
- Produces: 统一的 leftNav chips + rightContent 动态渲染

- [ ] **Step 1: 重写 SettingsDialog 使用 UnifiedDialog**

将 `src/components/panels/SettingsDialog.tsx` 的返回部分（约第 149-1115 行）替换为：

```tsx
// 保留所有 import 和常量定义不变
// 只替换 return 语句部分

const leftNav = (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {NAV_ITEMS.map(item => (
      <button
        key={item.id}
        className={`ud-chip${activeGroup === item.id ? ' active' : ''}`}
        onClick={() => { setActiveGroup(item.id); setSubTab(subs[0]?.id ?? '') }}
      >
        <span className={`remix ud-chip-icon ${item.icon}`}></span>
        <div>
          <div className="ud-chip-label">{item.label}</div>
          <div className="ud-chip-desc">{item.desc}</div>
        </div>
      </button>
    ))}
  </div>
)

const rightTop = activeGroup !== 'about' ? (
  <div className="settings-top-tabs" style={{ ['--active-tab' as any]: activeSubIndex, ['--tab-count' as any]: Math.max(1, subs.length) }}>
    {subs.map((tab, i) => (
      <button key={tab.id} className={`settings-subtab-btn${i === activeSubIndex ? ' active' : ''}`} onClick={() => setSubTab(tab.id)}>
        <span className={`remix ${tab.icon}`}></span>
        <span>{tab.label}</span>
      </button>
    ))}
  </div>
) : null

const rightContent = activeGroup === 'about' ? (
  <div style={{ padding: '8px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 8 }}>LZEditor</div>
    <div style={{ marginBottom: 12 }}>版本: {import.meta.env.VITE_APP_VERSION || '0.1.0'}</div>
    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>© 2025 sikenali</div>
  </div>
) : (
  // 保持原有的 settings content 渲染逻辑（从第 200 行开始的所有内容）
  <div className="settings-content">{/* 原有内容保持不变 */}</div>
)

return (
  <UnifiedDialog
    onClose={onClose}
    icon="ri-settings-3-fill"
    title="设置"
    subtitle={`${NAV_ITEMS.find(g => g.id === activeGroup)?.label}${activeGroup !== 'about' && subs.length ? ` · ${subs.find(t => t.id === subTab)?.label}` : ''}`}
    leftNav={leftNav}
    rightTop={rightTop}
    rightContent={rightContent}
    hint="修改后自动保存到本地"
    cancelText="取消"
    submitText="保存"
    onSubmit={handleSave}
    size="lg"
  />
)
```

注意：`rightContent` 中的设置内容部分需要完整保留原有逻辑（第 200-1115 行的所有 settings content JSX）。

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/SettingsDialog.tsx
git commit -m "refactor: SettingsDialog 迁移到 UnifiedDialog 统一弹框规范"
```

---

## Task 4: LibraryPanel 弹窗模式迁移到 UnifiedDialog

**Files:**
- Modify: `src/components/panels/LibraryPanel.tsx`

**Interfaces:**
- Consumes: `useEditorStore`, `UnifiedDialog`, `NavChipItem`
- Produces: 弹窗模式使用 UnifiedDialog，sidebar 模式保持不变

- [ ] **Step 1: 保留 sidebar 模式，重写弹窗模式**

在 `src/components/panels/LibraryPanel.tsx` 中：
1. 保留第 1-261 行的 sidebar 模式代码不变
2. 将第 263-387 行的弹窗模式部分替换为：

```tsx
// Dialog mode — 使用 UnifiedDialog
const leftNav = (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {CATEGORIES.map(c => (
      <button key={c.id} className={`ud-chip${category === c.id ? ' active' : ''}`} onClick={() => setCategory(c.id)}>
        <span className={`remix ud-chip-icon ${c.icon}`}></span>
        <div>
          <div className="ud-chip-label">{c.label}</div>
          <div className="ud-chip-desc">{c.desc}</div>
        </div>
      </button>
    ))}
  </div>
)

const rightContent = (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {category === 'docs' && (
      <UDSection label="文档库">
        {docLibraries.length === 0 ? (
          <div className="library-empty-state">
            <span className="remix ri-folder-open-line library-empty-icon"></span>
            <div className="library-empty-title">暂无文档库</div>
            <div className="library-empty-desc">点击右下角"新建文档库"开始组织文档</div>
          </div>
        ) : (
          <div className="library-list">
            {docLibraries.map((lib: any) => (
              <button key={lib.id} className={`library-doc-item${activeLibraryId === lib.id ? 'active' : ''}`}
                onClick={() => { setActiveLibrary(lib.id); setShowLibrary(true); handleClose() }}>
                <span className="remix ri-folder-3-fill library-doc-icon"></span>
                <div className="library-doc-info">
                  <div className="library-doc-name">{lib.name}</div>
                  <div className="library-doc-meta">{docs.filter((doc: any) => (doc.libraryId || 'default') === lib.id).length} 个文档</div>
                </div>
                <span className="remix ri-arrow-right-s-line library-doc-arrow"></span>
              </button>
            ))}
          </div>
        )}
      </UDSection>
    )}
    {/* git/blog/gitbook 导入区域保持原有逻辑 */}
    {category === 'git' && <UDSection label="导入 Git 仓库"><div className="library-empty-state">...</div></UDSection>}
    {category === 'blog' && <UDSection label="导入博客"><div className="library-empty-state">...</div></UDSection>}
    {category === 'gitbook' && <UDSection label="导入 GitBook"><div className="library-empty-state">...</div></UDSection>}
  </div>
)

return (
  <UnifiedDialog
    onClose={handleClose}
    icon="ri-archive-2-line"
    title="文档库"
    subtitle={categoryMeta.label}
    leftNav={leftNav}
    rightContent={rightContent}
    hint={category === 'docs' ? '新建后会自动出现在左侧文档库侧边栏' : categoryMeta.desc}
    cancelText="关闭"
    submitText={category === 'docs' ? '新建文档库' : undefined}
    onSubmit={category === 'docs' ? handlePrimaryAction : undefined}
    size="lg"
  />
)
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/LibraryPanel.tsx
git commit -m "refactor: LibraryPanel 弹窗模式迁移到 UnifiedDialog"
```

---

## Task 5: FilePanel 迁移到 UnifiedDialog

**Files:**
- Modify: `src/components/panels/FilePanel.tsx`

**Interfaces:**
- Consumes: `useEditorStore`, `UnifiedDialog`
- Produces: 使用 UnifiedDialog 标准结构

- [ ] **Step 1: 重写 FilePanel**

```tsx
import React, { useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { LFSInput } from '../ui/LFInput'
import { UnifiedDialog, UDSection } from '../ui/UnifiedDialog'

const FILE_TEMPLATES = [
  { id: 'blank', name: '空白文档', desc: '从头开始', icon: 'ri-file-line' },
  { id: 'markdown', name: 'Markdown 模板', desc: '标准 Markdown 结构', icon: 'ri-markdown-fill' },
  { id: 'report', name: '技术报告', desc: '带章节的长文档', icon: 'ri-file-text-line' },
  { id: 'notes', name: '会议记录', desc: '日程与待办', icon: 'ri-article-line' },
]

export const FilePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const setTitle = useEditorStore((s: any) => s.setTitle)
  const setDocPath = useEditorStore((s: any) => s.setDocPath)
  const setOpenPanel = useEditorStore((s: any) => s.setOpenPanel)
  const [searchText, setSearchText] = useState('')

  const handleCreate = (templateId: string) => {
    const names: Record<string, string> = { blank: 'untitled.md', markdown: 'markdown-template.md', report: 'technical-report.md', notes: 'meeting-notes.md' }
    setTitle(names[templateId] || 'untitled.md')
    setDocPath('')
    setOpenPanel('none')
    onClose()
  }

  const handleOpen = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.txt,.markdown'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (file) { setTitle(file.name); setDocPath(file.name); setOpenPanel('none'); onClose() }
    }
    input.click()
  }

  const filtered = FILE_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(searchText.toLowerCase()) ||
    t.desc.toLowerCase().includes(searchText.toLowerCase())
  )

  const leftNav = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {filtered.map(t => (
        <button key={t.id} className="ud-chip" onClick={() => handleCreate(t.id)}>
          <span className={`remix ud-chip-icon ${t.icon}`}></span>
          <div><div className="ud-chip-label">{t.name}</div><div className="ud-chip-desc">{t.desc}</div></div>
        </button>
      ))}
    </div>
  )

  const rightContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <UDSection label="搜索">
        <LFSInput value={searchText} onChange={setSearchText} placeholder="搜索模板…" prefix={<span className="remix ri-search-line"></span>} />
      </UDSection>
      <UDSection label="快速打开">
        <button className="ud-btn" onClick={handleOpen} style={{ width: '100%', justifyContent: 'center' }}>
          <span className="remix ri-folder-open-line"></span> 打开本地文件
        </button>
      </UDSection>
    </div>
  )

  return (
    <UnifiedDialog
      onClose={onClose}
      icon="ri-file-list-2-line"
      title="文件"
      subtitle="新建或打开文档"
      leftNav={leftNav}
      rightContent={rightContent}
      hint="选择模板将直接创建新文档"
      size="md"
    />
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/FilePanel.tsx
git commit -m "refactor: FilePanel 迁移到 UnifiedDialog"
```

---

## Task 6: PreviewPanel 迁移到 UnifiedDialog

**Files:**
- Modify: `src/components/panels/PreviewPanel.tsx`

**Interfaces:**
- Consumes: `useEditorStore`, `UnifiedDialog`, `copyRichText`
- Produces: 无 leftNav 的单列布局

- [ ] **Step 1: 重写 PreviewPanel**

保持 PreviewPanel 的现有逻辑（MD → HTML 转换、源码切换、公众号复制），但将外部包装改为 UnifiedDialog：

```tsx
// 删除旧的 modal-overlay 包装
// 替换为：
return (
  <UnifiedDialog
    onClose={onClose}
    icon="ri-eye-2-line"
    title="预览"
    subtitle={docTitle}
    rightContent={/* 保持原有预览内容不变 */}
    rightBottom={
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {isCodeMode ? 'Markdown 源码视图' : '富文本预览'} · 点击外部区域关闭
      </div>
    }
    size="md"
  />
)
```

注意：PreviewPanel 无 leftNav，直接使用 rightContent-only 模式。

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/PreviewPanel.tsx
git commit -m "refactor: PreviewPanel 迁移到 UnifiedDialog"
```

---

## Task 7: HistoryPanel 统一 inline/modal 两种模式

**Files:**
- Modify: `src/components/panels/HistoryPanel.tsx`

**Interfaces:**
- Consumes: `useEditorStore`
- Produces: `inline` prop 控制模式，统一底部面板样式

- [ ] **Step 1: 重写 HistoryPanel 支持两种模式**

```tsx
export const HistoryPanel: React.FC<{ onClose?: () => void; inline?: boolean }> = ({ onClose, inline }) => {
  // ... 保持所有逻辑不变 ...
  
  if (inline) {
    // inline 模式：返回底部面板内容（由 App.tsx 渲染在编辑器下方）
    return (
      <div className="history-bottom-bar">
        {/* 版本操作栏 + 时间线 + 元信息行 */}
        {/* 结构与 MainContentPreview 中的版本面板一致 */}
      </div>
    )
  }
  
  // modal 模式：保持原有弹窗结构
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        {/* 原有弹窗内容保持不变 */}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/HistoryPanel.tsx
git commit -m "feat: HistoryPanel 支持 inline/modal 两种模式"
```

---

## Task 8: App.tsx 重写 — appMode 驱动渲染

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `appMode`, `setAppMode`, `openPanel`, `insertPanel`, `showLibrary`, `showOutline`, `showPreview`
- Produces: 根据 appMode 条件渲染不同布局

- [ ] **Step 1: 重写 mainArea 渲染逻辑**

```tsx
const mainArea = (
  <div className="app-main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
    <div className={`app-layout ${appMode === 'read' ? 'read-mode-active' : ''} ${appMode === 'code' ? 'code-mode-active' : ''}`} style={{ flex: 1, minHeight: 0 }}>
      {showLibrary && <LibraryPanel sidebar />}
      {showOutline && <SidebarOutline />}
      
      {appMode === 'edit' && <><LZEditor />{showPreview && <SidebarPreview />}</>}
      {appMode === 'code' && <><LZEditor />{showPreview && <SidebarPreview />}</>}
      {appMode === 'style' && <StyleMainPanel />}
      {appMode === 'history' && <HistoryPanel inline />}
      {appMode === 'read' && <ReadMode onClose={() => setAppMode('edit')} />}
    </div>
  </div>
)
```

- [ ] **Step 2: 更新弹窗渲染条件**

```tsx
// 删除旧的条件：
// {openPanel === 'history' && <HistoryPanel onClose={closePanel} />}
// 改为：
{openPanel === 'history' && <HistoryPanel onClose={closePanel} />}
```

- [ ] **Step 3: 删除不再使用的 imports**

```tsx
// 删除这些 imports（已不再使用）:
// import { InlineReadPreview } from './components/panels/InlineReadPreview'
// import { MainContentPreview } from './components/panels/MainContentPreview'
// import { StyleMainPanel } from './components/panels/StyleMainPanel'
```

- [ ] **Step 4: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: App.tsx 重写为 appMode 驱动渲染"
```

---

## Task 9: Toolbar 调整 — 绑定 appMode

**Files:**
- Modify: `src/components/layout/Toolbar.tsx`

**Interfaces:**
- Consumes: `appMode`, `setAppMode`, `openPanel`, `setOpenPanel`
- Produces: 模式按钮高亮状态同步

- [ ] **Step 1: 更新模式按钮状态绑定**

在 Toolbar.tsx 中：
1. 替换 `mainBottomPanel` 相关代码：
   ```tsx
   // 删除:
   const mainBottomPanel = useEditorStore((s: any) => s.mainBottomPanel)
   const setMainBottomPanel = useEditorStore((s: any) => s.setMainBottomPanel)
   
   // 新增:
   const appMode = useEditorStore((s: any) => s.appMode)
   const setAppMode = useEditorStore((s: any) => s.setAppMode)
   ```
2. 更新按钮 onClick 处理：
   ```tsx
   // 历史按钮:
   <button className={`toolbar-btn ${appMode === 'history' ? 'active' : ''}`}
     onClick={() => setAppMode(appMode === 'history' ? 'edit' : 'history')}>
     <span className="remix toolbar-icon ri-history-fill"></span>
     <span className="toolbar-label">历史</span>
   </button>
   
   // 样式按钮:
   <button className={`toolbar-btn ${appMode === 'style' ? 'active' : ''}`}
     onClick={() => setAppMode(appMode === 'style' ? 'edit' : 'style')}>
     <span className="remix toolbar-icon ri-palette-fill"></span>
     <span className="toolbar-label">样式</span>
   </button>
   ```
3. 更新模式菜单中的阅读/代码切换：
   ```tsx
   case 'read':
     setAppMode('read')
     break
   case 'code':
     setAppMode('code')
     break
   ```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Toolbar.tsx
git commit -m "refactor: Toolbar 模式按钮绑定到 appMode"
```

---

## Task 10: CSS 清理

**Files:**
- Modify: `src/styles/settings-dialog.css`
- Modify: `src/styles/panels.css`

**Interfaces:**
- Consumes: 现有 CSS 类
- Produces: 清理冗余选择器，保留 UnifiedDialog 规范

- [ ] **Step 1: 清理 settings-dialog.css 中的冲突 CSS**

删除以下冲突选择器（已被 UnifiedDialog CSS 替代）：
```css
/* 删除这些 */
.settings-body { display: flex; flex: 1; overflow: hidden; min-height: 0; }
.settings-body { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0; }
.settings-body { grid-template-columns: 230px minmax(0, 1fr); }
.settings-sidebar { width: auto !important; ... }
```

保留：
```css
.unified-dialog { ... }
.ud-header { ... }
.ud-body { ... }
.ud-left { ... }
.ud-chip { ... }
.ud-section { ... }
.ud-setting-row { ... }
.ud-toggle { ... }
.ud-select { ... }
.ud-input { ... }
.ud-preview-card { ... }
.ud-footer { ... }
.ud-btn { ... }
```

- [ ] **Step 2: 清理 panels.css 中的冲突 CSS**

删除 `export-body-split` 相关规则（已不使用）：
```css
/* 删除 */
.export-body-split { display: flex; gap: 24px; align-items: flex-start; }
.export-left { flex: 1; min-width: 0; }
.export-right { width: 280px; ... }
```

保留 `.export-body-redesigned` 和 `.library-dialog-*` 相关规则。

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```

- [ ] **Step 4: Commit**

```bash
git add src/styles/settings-dialog.css src/styles/panels.css
git commit -m "style: 清理冲突 CSS，保留 UnifiedDialog 规范"
```

---

## Task 11: 清理无用文件

**Files:**
- Delete: `src/components/panels/InlineReadPreview.tsx`
- Delete: `src/components/panels/MainContentPreview.tsx`
- Delete: `src/components/panels/StyleMainPanel.tsx`
- Delete: `src/components/panels/HistoryBottomPanel.tsx`
- Delete: `src/components/panels/StylePreviewBottomPanel.tsx`

- [ ] **Step 1: 删除无用组件**

```bash
rm src/components/panels/InlineReadPreview.tsx
rm src/components/panels/MainContentPreview.tsx
rm src/components/panels/StyleMainPanel.tsx
rm src/components/panels/HistoryBottomPanel.tsx
rm src/components/panels/StylePreviewBottomPanel.tsx
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "BookPreview"
```

- [ ] **Step 3: Commit**

```bash
git add -A src/components/panels/
git rm src/components/panels/InlineReadPreview.tsx src/components/panels/MainContentPreview.tsx src/components/panels/StyleMainPanel.tsx src/components/panels/HistoryBottomPanel.tsx src/components/panels/StylePreviewBottomPanel.tsx
git commit -m "chore: 删除已迁移的旧组件文件"
```

---

## Task 12: 最终验证

- [ ] **Step 1: 全量 TypeScript 编译检查**

```bash
cd /home/jingle/opc/lzeditor
npx tsc --noEmit 2>&1
```
Expected: 仅有 BookPreview.tsx 的既有错误

- [ ] **Step 2: 启动开发服务器验证**

```bash
npm run dev:web &
# 在浏览器中测试：
# 1. 默认编辑模式正常显示
# 2. 点击"历史"按钮 → 底部显示版本时间线
# 3. 点击"样式"按钮 → 底部显示样式卡片
# 4. 点击"模式→阅读模式" → 全屏阅读 + TOC
# 5. 打开"设置"弹框 → 左侧分类 chips 正常显示
# 6. 打开"文档库"弹框 → 左侧来源 chips 正常显示
# 7. 打开"导出"弹框 → 左侧格式 chips 正常显示
# 8. 点击"插入→图片" → UnifiedDialog 正常弹出
```

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat: 统一架构重构完成 — appMode 状态机 + UnifiedDialog 弹框规范"
```
