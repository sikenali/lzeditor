# 设置中心对齐 bid-typesetting — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 lzeditor 设置中心的外壳尺寸、侧边栏、区块标题与模型设置重建为 bid-typesetting 的样式与结构，数据层不动。

**Architecture:** 照抄 `bid-typesetting/src/components/layout/SettingsModal.vue`（外壳 + `.nav-list`）与 `src/views/settings/ModelSettingsView.vue`（模型设置）。React 中用现有 UI 原子（`UiModal`/`UiSelect`/`UiSelectCard`/`UiInput`/`UiSwitch`/`UiTip`）等价重建，只补 `UiModal.maxWidth` 与 `UiInput.suffix` 两个缺口。样式全部进 `src/styles/settings-dialog.css`。

**Tech Stack:** React 18 + TypeScript + Zustand + Vite；验证靠 `tsc` + `vite build` + Playwright（仓库无单测框架）。

## Global Constraints

- **主题规则（AGENT.md §7）**：**禁止 `[data-theme]` 选择器**。深浅色只通过 `--color-*` token（由 `src/styles/themes.ts` 内联重写）与 `--t-*` 成对 token 实现。新增 CSS 只用 `--color-*`。
- **可用 `--color-*` token 白名单**（`src/styles/color-tokens.css` 实测存在）：`--color-bg-white` `--color-bg-secondary` `--color-bg-card` `--color-bg-main` `--color-border` `--color-border-soft` `--color-text-primary` `--color-text-body` `--color-text-secondary` `--color-text-muted` `--color-primary` `--color-primary-soft` `--color-success` `--color-success-soft` `--color-error` `--color-error-soft`。**没有 `--color-text-faint`** —— bid 文案里的 `--color-text-faint` 一律映射为 `--color-text-muted`。
- **`--font-mono`** 存在（`color-tokens.css:182`），等价于 bid 的 `font-family: monospace`。
- **`color-mix()` 可用**（`ui.css:420` 已在用）。
- **`@keyframes lz-spin`** 已存在于 `settings-dialog.css:1058`，直接复用。
- **不要删这些类**：`.settings-save-btn` / `.settings-cancel-btn` 被 `BeautifyDialog.tsx` 与 `ImportButtons.tsx` 使用。
- **`--color-*` token 名不要改名**；`.settings-section` 的 `border-radius: 0`（`settings-dialog.css:2409` 的主题覆写）是既有视觉决策，**不要改回 16px**。
- 数据层不动：`settingsStore.ts`、`useAI.ts`、后端接口、快捷键、导出。
- 开发命令用 `npm run dev:web`（**不要** `npm run dev`）。vite 已在 5173 跑着，**不要 `pkill -f vite`**。
- 提交信息用英文 conventional commits。

## 文件结构

| 文件 | 责任 |
|---|---|
| `src/components/ui/UiModal.tsx` | 新增 `maxWidth` prop（§3 外壳尺寸） |
| `src/components/ui/UiInput.tsx` | 新增 `suffix` 渲染位（API Key 内嵌眼睛按钮） |
| `src/styles/settings-dialog.css` | 全局对齐（Task 2）+ 模型设置专属样式（Task 4） |
| `src/components/panels/SettingsDialog.tsx` | 外壳尺寸、`ai` 组 `subs` 清空、调用点、删 2 处 desc |
| `src/components/panels/settings/ModelSettingsTab.tsx` | 整体重写 |
| `src/components/panels/settings/{EditorSettingsTab,BehaviorSettingsTab,ContentStyleTab,ShortcutSettingsTab}.tsx` | 各删 `settings-section-desc` |

规格出处：`docs/superpowers/specs/2026-10-19-lzeditor-settings-bid-alignment-design.md`

---

### Task 1: UI 原子补件（UiModal.maxWidth / UiInput.suffix）

**Files:**
- Modify: `src/components/ui/UiModal.tsx:21-51`
- Modify: `src/components/ui/UiInput.tsx:1-31, 55-62`

**Interfaces:**
- Consumes: 无
- Produces: `UiModalProps.maxWidth?: number`；`UiInputProps.suffix?: React.ReactNode`

- [ ] **Step 1: `UiModal` 加 `maxWidth`**

`src/components/ui/UiModal.tsx`，在 `radius?: number` 之后加一行：

```ts
  /** 宽度上限（px）。设置中心用 min(92vw, 1400px) */
  maxWidth?: number
```

props 解构里 `radius = 18,` 后加 `maxWidth,`：

```ts
  closeOnOverlay = true, bodyPadding = true, children, footer, radius = 18,
  maxWidth, className,
```

`modalStyle` 的 width 改为：

```ts
    width: maxWidth
      ? `min(${widthCss}, ${maxWidth}px)`
      : `min(${widthCss}, 94vw)`,
```

- [ ] **Step 2: `UiInput` 加 `suffix`**

`src/components/ui/UiInput.tsx`，在 `onBlur?` 之后加：

```ts
  /** 输入框尾部自定义控件（API Key 的眼睛按钮）；渲染在 input 之后、clear 按钮之前 */
  suffix?: React.ReactNode
```

解构里 `onBlur,` 后加 `suffix,`。

`<input ... />` 与 `{clearable && ...}` 之间插入：

```tsx
      {suffix}
```

- [ ] **Step 3: 类型检查**

```bash
npx tsc --noEmit
```
Expected: 无输出，exit 0。

- [ ] **Step 4: 提交**

```bash
git add src/components/ui/UiModal.tsx src/components/ui/UiInput.tsx
git commit -m "feat(ui): add UiModal maxWidth and UiInput suffix props"
```

---

### Task 2: 全局设置样式对齐

**Files:**
- Modify: `src/styles/settings-dialog.css`

四处改动，全部在该文件内。

**Interfaces:**
- Consumes: 无
- Produces: 裸标题 `.settings-section-title`、隐藏 `.page-header-card`、`.settings-content` gap 20px

- [ ] **Step 1: 侧边栏 icon 补 color 过渡**（bid `.nav-item .icon` 有，lzeditor 缺）

`settings-dialog.css:1826-1834`，`.settings-nav-ico` 块末追加一行（在 `flex-shrink: 0;` 之后）：

```css
  transition: color 0.2s ease;
```

- [ ] **Step 2: `.settings-content` gap 16 → 20**（bid 各 view 的 flex column 均 20px）

`settings-dialog.css:1908-1914`，把

```css
  gap: 16px;
```
改为
```css
  gap: 20px;
```

- [ ] **Step 3: 区块标题改裸标题**（bid `.card-title` 无分隔线、无描述位）

`settings-dialog.css:1928-1939`，整块替换为：

```css
.settings-section-title {
  display: block;
  font-size: 17px;
  font-weight: 500;
  color: var(--color-text-primary);
  padding-bottom: 0;
  margin-bottom: 20px;
  border-bottom: none;
}
.settings-section-title > span:first-child {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
```

**必须显式写 `padding-bottom: 0;` 与 `border-bottom: none;`**：该选择器在文件里有 3 处定义（`:113` / `:850` / `:1928`），`:113` 那处带
`padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle);`。只删 `:1928` 的声明会让分隔线从前一处穿透过来。
（同时删掉原来的 `justify-content: space-between` / `gap` / `font-weight: 500` 保留。）
保留 `.settings-section-title > span:first-child` 是因为 `ShortcutSettingsTab` 标题里有一个 `.shortcut-section-icon` 图标 span。

- [ ] **Step 4: modal 内隐藏页头卡片**（照抄 bid `.panel-content :deep(.page-header-card){display:none}`）

追加到 `settings-dialog.css` **末尾**（`.ud-select` 那条之后）：

```css
/* bid-typesetting SettingsModal：modal 内不显示页头卡片（JSX 保留，便于回退） */
.settings-panel-content .page-header-card {
  display: none;
}
```

- [ ] **Step 5: 类型检查**（CSS 改动，确认没写错选择器破坏别处）

```bash
npx tsc --noEmit
```
Expected: exit 0。

- [ ] **Step 6: 提交**

```bash
git add src/styles/settings-dialog.css
git commit -m "style(settings): align nav icon transition, content gap, bare section title"
```

---

### Task 3: SettingsDialog 与区块描述清理

**Files:**
- Modify: `src/components/panels/SettingsDialog.tsx:19-24, 37-40, 100, 234-237, 271-274`
- Modify: `src/components/panels/settings/EditorSettingsTab.tsx`（6 处）
- Modify: `src/components/panels/settings/BehaviorSettingsTab.tsx`（1 处）
- Modify: `src/components/panels/settings/ContentStyleTab.tsx`（1 处）
- Modify: `src/components/panels/settings/ShortcutSettingsTab.tsx`（1 处）

**Interfaces:**
- Consumes: `UiModal.maxWidth`（Task 1）
- Produces: `NAV_GROUPS` 的 `ai` 组 `subs: []`；`<ModelSettingsTab />` 不再接 `subTab`（Task 4 依赖）

- [ ] **Step 1: `ai` 组 `subs` 清空**

`SettingsDialog.tsx:19-24`，替换为：

```tsx
  {
    id: 'ai', label: '模型设置', icon: 'ri-cpu-line',
    subs: [],
  },
```

（bid 用 `density-group` 两张卡做制造商/自定义切换，不再用顶部子标签。）

- [ ] **Step 2: 外壳尺寸照抄 bid UiModal 参数**

`SettingsDialog.tsx:37-40`：

```tsx
/* 面板长宽：bid-typesetting SettingsModal.vue —— 92vw / max 1400 / 92vh */
const PANEL_WIDTH = '92vw'
const PANEL_HEIGHT = '92vh'
const PANEL_MAX_WIDTH = 1400
const PANEL_SHADOW = '0 8px 40px rgba(0,0,0,0.1)'
```

`SettingsDialog.tsx:115-127` 的 `<UiModal>` 改为：

```tsx
    <UiModal
      open
      onClose={onClose}
      icon="ri-settings-3-line"
      title="设置中心"
      subtitle="选择要进入的设置界面"
      width={PANEL_WIDTH}
      maxWidth={PANEL_MAX_WIDTH}
      height={PANEL_HEIGHT}
      bodyPadding={false}
      radius={16}
      shadow={PANEL_SHADOW}
      closeOnOverlay={false}
    >
```

- [ ] **Step 3: 模型设置调用点去掉 subTab**

`SettingsDialog.tsx:100`：

```tsx
      {group.id === 'ai' && <ModelSettingsTab />}
```

- [ ] **Step 4: 删主题设置页 2 处 desc**

`SettingsDialog.tsx:234-237`（强调色）替换为：

```tsx
        <div className="settings-section-title">
          <span>强调色</span>
        </div>
```

`SettingsDialog.tsx:271-274`（导航布局）替换为：

```tsx
        <div className="settings-section-title">
          <span>导航布局</span>
        </div>
```

- [ ] **Step 5: 删 EditorSettingsTab 6 处 desc**

把每个 `<div className="settings-section-title"><span>X</span><span className="settings-section-desc">Y</span></div>` 改成 `<div className="settings-section-title"><span>X</span></div>`。
涉及行号 28 / 61 / 71 / 90 / 102 / 141，标题文本依次为：`排版`、`段落排版`、`工具栏`、`拼写检查`、`Markdown 快捷符号`、`编辑模式`。

- [ ] **Step 6: 删其余 3 处 desc**

- `BehaviorSettingsTab.tsx:8`：保留 `<span>行为设置</span>`，删 `<span className="settings-section-desc">应用启动与窗口管理</span>`
- `ContentStyleTab.tsx:8`：保留 `<span>内容样式</span>`，删 desc
- `ShortcutSettingsTab.tsx:44`：保留 `<span className="remix ri-list-check shortcut-section-icon"></span>` 与 `<span>常规操作</span>`，删 desc

- [ ] **Step 7: 确认无残留**

```bash
grep -rn "settings-section-desc" src --include=*.tsx
```
Expected: 无输出。

- [ ] **Step 8: 类型检查**

```bash
npx tsc --noEmit
```
Expected: exit 0。

- [ ] **Step 9: 提交**

```bash
git add src/components/panels/SettingsDialog.tsx \
  src/components/panels/settings/EditorSettingsTab.tsx \
  src/components/panels/settings/BehaviorSettingsTab.tsx \
  src/components/panels/settings/ContentStyleTab.tsx \
  src/components/panels/settings/ShortcutSettingsTab.tsx
git commit -m "refactor(settings): adopt bid modal size, drop subtab and section descriptions"
```

---

### Task 4: 模型设置重建

**Files:**
- Rewrite: `src/components/panels/settings/ModelSettingsTab.tsx`
- Modify: `src/styles/settings-dialog.css`（末尾追加模型设置专属样式）

**Interfaces:**
- Consumes: `UiSelectCard(selected,title,desc,onClick)`、`UiInput.suffix`（Task 1）、`UiTip(text,children)`、`UiSwitch(checked,onChange,size)`、`settingsStore.{apiKeys,selectedModelId,updateSetting,toggleApiKey,removeApiKey,setSelectedModelId}`
- Produces: 无（叶子组件）

**Design notes（照抄 bid `ModelSettingsView.vue`，含 2 处刻意偏离，见 spec D8）:**
1. 密钥行**可点击**并带 active 态 —— lzeditor 的 `selectedModelId`（`useAI.ts` 用它选密钥）唯一入口就是行点击，照抄会删掉这个能力。
2. 密钥**掩码**显示 —— bid 直接渲染 `k.api_key` 原文，是安全隐患。

- [ ] **Step 1: 重写 `ModelSettingsTab.tsx`**

整文件替换为：

```tsx
import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../../../store/settingsStore'
import type { ApiKeyEntry } from '../../../shared/types'
import { UiModal, UiSelect, UiSelectCard, UiSwitch, UiInput, UiTip } from '../../ui'
import { toast } from '../../../utils/toast'

/* 服务商 → 端点。useAI.ts 依赖 key.endpoint，不在 UI 上呈现（bid 由后端按 provider 名解析） */
const PROVIDER_ENDPOINTS: Record<string, { endpoint: string; format: 'openai' | 'anthropic' }> = {
  '阿里云':     { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode', format: 'openai' },
  '百度':       { endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom', format: 'openai' },
  '智谱':       { endpoint: 'https://open.bigmodel.cn/api/paas/v4', format: 'openai' },
  'DeepSeek':   { endpoint: 'https://api.deepseek.com', format: 'openai' },
  'Moonshot':   { endpoint: 'https://api.moonshot.cn/v1', format: 'openai' },
  '零一万物':   { endpoint: 'https://api.siliconflow.cn/v1', format: 'openai' },
  'OpenAI':     { endpoint: 'https://api.openai.com/v1', format: 'openai' },
  'Anthropic':  { endpoint: 'https://api.anthropic.com/v1', format: 'anthropic' },
  'Google':     { endpoint: 'https://generativelanguage.googleapis.com/v1beta', format: 'openai' },
  'Mistral':    { endpoint: 'https://api.mistral.ai/v1', format: 'openai' },
  'Groq':       { endpoint: 'https://api.groq.com/openai/v1', format: 'openai' },
}

const PROVIDER_MODELS: Record<string, string[]> = {
  '阿里云':     ['qwen3.7-max', 'qwen3.7-plus', 'qwen3.6-plus', 'qwen3.5-plus', 'qwen3-max', 'qwen-plus', 'qwen-flash', 'qwen3-coder-plus'],
  '百度':       ['ernie-4.0', 'ernie-3.5', 'ernie-speed'],
  '智谱':       ['glm-5.1', 'glm-4.6', 'glm-4'],
  'DeepSeek':   ['deepseek-v4-pro', 'deepseek-r1', 'deepseek-chat'],
  'Moonshot':   ['kimi-k2.6', 'moonshot-v1-128k', 'moonshot-v1-32k'],
  '零一万物':   ['yi-large', 'yi-medium', 'yi-34b-chat'],
  'OpenAI':     ['gpt-5.6-sol', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-pro', 'gpt-5.3-codex', 'o4-mini', 'o3', 'gpt-4.1'],
  'Anthropic':  ['claude-fable-5', 'claude-opus-4.8', 'claude-opus-4.7', 'claude-sonnet-4.6', 'claude-haiku-4.5'],
  'Google':     ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-pro'],
  'Mistral':    ['mistral-large-3', 'mistral-medium-3', 'mistral-small-3'],
  'Groq':       ['llama-3.3-70b', 'llama-3.1-8b', 'mixtral-8x7b-32768'],
}

const PROVIDER_OPTIONS = [
  { value: '阿里云', label: '阿里云', desc: '通义千问', group: '国内' },
  { value: '百度', label: '百度', desc: '文心一言', group: '国内' },
  { value: '智谱', label: '智谱', desc: 'GLM', group: '国内' },
  { value: 'DeepSeek', label: 'DeepSeek', group: '国内' },
  { value: 'Moonshot', label: 'Moonshot', desc: '月之暗面', group: '国内' },
  { value: '零一万物', label: '零一万物', desc: 'Yi', group: '国内' },
  { value: 'OpenAI', label: 'OpenAI', desc: 'GPT', group: '国外' },
  { value: 'Anthropic', label: 'Anthropic', desc: 'Claude', group: '国外' },
  { value: 'Google', label: 'Google', desc: 'Gemini', group: '国外' },
  { value: 'Mistral', label: 'Mistral AI', group: '国外' },
  { value: 'Groq', label: 'Groq', group: '国外' },
]

const FORMAT_OPTIONS = [
  { value: 'openai', label: 'OpenAI Chat Completions 格式' },
  { value: 'anthropic', label: 'Anthropic Messages 格式' },
]

type ConfigTab = 'provider' | 'custom'

function maskKey(key: string): string {
  return key.length < 10 ? '••••' : `${key.slice(0, 6)}…${key.slice(-4)}`
}

export const ModelSettingsTab: React.FC = () => {
  const s = useSettingsStore()
  const apiKeys = s.apiKeys || []

  const [configTab, setConfigTab] = useState<ConfigTab>('provider')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [customFormat, setCustomFormat] = useState<'openai' | 'anthropic'>('openai')
  const [customEndpoint, setCustomEndpoint] = useState('')
  const [customModelId, setCustomModelId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [testId, setTestId] = useState<string | null>(null)
  const [testSuccess, setTestSuccess] = useState<Record<string, boolean>>({})
  const [testFailed, setTestFailed] = useState<Record<string, boolean>>({})
  const [testError, setTestError] = useState<Record<string, string>>({})

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    if (s.customApiFormat) setCustomFormat(s.customApiFormat)
    if (s.customEndpoint) setCustomEndpoint(s.customEndpoint)
    if (s.customModelId) setCustomModelId(s.customModelId)
    if (s.selectedProvider) setSelectedProvider(s.selectedProvider)
    if (s.selectedModelName) setSelectedModel(s.selectedModelName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentModels = selectedProvider ? (PROVIDER_MODELS[selectedProvider] || []) : []

  const resetForm = () => {
    setApiKey('')
    setKeyVisible(false)
    setSelectedProvider('')
    setSelectedModel('')
    setCustomEndpoint('')
    setCustomModelId('')
    setEditId(null)
  }

  const startEdit = (key: ApiKeyEntry) => {
    setEditId(key.id)
    setApiKey('')
    if (key.endpoint) {
      setConfigTab('custom')
      setCustomFormat(key.format || 'openai')
      setCustomEndpoint(key.endpoint)
      setCustomModelId(key.model)
    } else {
      setConfigTab('provider')
      setSelectedProvider(key.provider)
      setSelectedModel(key.model)
    }
  }

  const handleSave = () => {
    // 留空则保留原密钥（编辑态）；新增态必须填
    const resolvedKey = apiKey.trim() || apiKeys.find(k => k.id === editId)?.key || ''
    if (!resolvedKey) { toast('请输入 API Key'); return }

    const base = apiKeys.find(k => k.id === editId)
    const merge = (entry: ApiKeyEntry) =>
      s.updateSetting('apiKeys', editId
        ? apiKeys.map(k => (k.id === editId ? { ...k, ...entry } : k))
        : [...apiKeys, entry])

    if (configTab === 'custom') {
      if (!customEndpoint.trim() || !customModelId.trim()) { toast('请填写自定义地址和模型 ID'); return }
      merge({
        id: editId || `custom-${Date.now()}`,
        provider: customFormat === 'anthropic' ? 'Anthropic (自定义)' : 'OpenAI (自定义)',
        model: customModelId.trim(),
        modelName: customModelId.trim(),
        key: resolvedKey,
        enabled: base?.enabled ?? true,
        endpoint: customEndpoint.trim(),
        format: customFormat,
      })
      toast(editId ? '自定义配置已更新' : '自定义配置已保存')
      resetForm()
      return
    }

    if (!selectedProvider || !selectedModel) { toast('请选择服务商和模型'); return }
    const cfg = PROVIDER_ENDPOINTS[selectedProvider]
    merge({
      id: editId || `preset-${Date.now()}`,
      provider: selectedProvider,
      model: selectedModel,
      modelName: `${selectedProvider} · ${selectedModel}`,
      key: resolvedKey,
      enabled: base?.enabled ?? true,
      endpoint: cfg?.endpoint,
      format: cfg?.format || (selectedProvider === 'Anthropic' ? 'anthropic' : 'openai'),
    })
    toast(editId ? `「${selectedProvider}」配置已更新` : `「${selectedProvider}」API Key 已保存`)
    resetForm()
  }

  const handleTest = async (key: ApiKeyEntry) => {
    setTestId(key.id)
    setTestSuccess(p => ({ ...p, [key.id]: false }))
    setTestFailed(p => ({ ...p, [key.id]: false }))
    setTestError(p => ({ ...p, [key.id]: '' }))
    try {
      const endpoint = key.endpoint || 'https://api.openai.com/v1'
      const url = `${endpoint.replace(/\/v1$/, '')}/models`
      const headers: Record<string, string> = key.format === 'anthropic'
        ? { 'Content-Type': 'application/json', 'x-api-key': key.key, 'anthropic-version': '2023-06-01' }
        : { 'Authorization': `Bearer ${key.key}` }
      const resp = await fetch(url, { method: 'GET', headers })
      if (resp.ok) {
        setTestSuccess(p => ({ ...p, [key.id]: true }))
      } else {
        setTestFailed(p => ({ ...p, [key.id]: true }))
        setTestError(p => ({ ...p, [key.id]: `请求失败（HTTP ${resp.status}）` }))
      }
    } catch {
      setTestFailed(p => ({ ...p, [key.id]: true }))
      setTestError(p => ({ ...p, [key.id]: '网络错误或跨域拦截' }))
    } finally {
      setTestId(null)
    }
  }

  const openDelete = (id: string) => { setDeletingId(id); setShowDeleteDialog(true) }

  const confirmDelete = () => {
    if (!deletingId) return
    s.removeApiKey(deletingId)
    if (editId === deletingId) resetForm()
    setShowDeleteDialog(false)
    setDeletingId('')
    toast('已删除')
  }

  const testErrorText = Object.values(testError).find(v => v)

  return (
    <div className="model-view">
      {/* 页面头部卡片：bid 在 modal 内隐藏；JSX 保留以便一行回退找回「清空表单」入口 */}
      <div className="page-header-card">
        <div className="page-header-content">
          <div className="page-header-info">
            <div className="page-breadcrumb">
              <span>首页</span>
              <span className="sep">/</span>
              <span>设置中心</span>
              <span className="sep">/</span>
              <span className="current">模型设置</span>
            </div>
            <div className="page-header-title">
              <h1>模型设置</h1>
              <p>配置 AI 大模型服务商与 API Key 连接</p>
            </div>
          </div>
          <button type="button" className="page-reset-button" onClick={resetForm}>
            <span className="remix ri-restart-line"></span>
            清空表单
          </button>
        </div>
      </div>

      <div className="settings-section model-card">
        <div className="settings-section-title"><span>API Key</span></div>

        <div className="density-group">
          <UiSelectCard
            selected={configTab === 'provider'}
            title="模型制造商"
            desc="从内置服务商列表选择模型并填写 API Key"
            onClick={() => setConfigTab('provider')}
          />
          <UiSelectCard
            selected={configTab === 'custom'}
            title="自定义配置"
            desc="手动填写 API 格式、端点地址和模型 ID"
            onClick={() => setConfigTab('custom')}
          />
        </div>

        <div className="config-form">
          {configTab === 'provider' ? (
            <>
              <div className="form-field">
                <label className="form-label">服务商</label>
                <UiSelect
                  value={selectedProvider}
                  onChange={v => { setSelectedProvider(v); setSelectedModel('') }}
                  options={PROVIDER_OPTIONS}
                  placeholder="请选择服务商"
                />
              </div>
              <div className="form-field">
                <label className="form-label">模型</label>
                <UiSelect
                  value={selectedModel}
                  onChange={setSelectedModel}
                  options={currentModels.map(m => ({ value: m, label: m }))}
                  placeholder="请选择模型"
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-field">
                <label className="form-label">API格式</label>
                <UiSelect
                  value={customFormat}
                  onChange={v => setCustomFormat(v as 'openai' | 'anthropic')}
                  options={FORMAT_OPTIONS}
                />
              </div>
              <div className="form-field">
                <label className="form-label">自定义地址</label>
                <UiInput value={customEndpoint} onChange={setCustomEndpoint} placeholder="https://api.example.com/v1" clearable />
              </div>
              <div className="form-field">
                <label className="form-label">模型ID</label>
                <UiInput value={customModelId} onChange={setCustomModelId} placeholder="例如: gpt-4" clearable />
              </div>
            </>
          )}

          <div className="form-field">
            <label className="form-label">API Key</label>
            <div className="form-input-row">
              <UiInput
                type={keyVisible ? 'text' : 'password'}
                value={apiKey}
                onChange={setApiKey}
                placeholder={editId ? '留空则保留原密钥，输入则更换' : 'sk-...'}
                suffix={
                  <button
                    type="button"
                    className="form-key-toggle"
                    onClick={() => setKeyVisible(v => !v)}
                    aria-label={keyVisible ? '隐藏密钥' : '显示密钥'}
                  >
                    <span className={`remix ${keyVisible ? 'ri-eye-line' : 'ri-eye-off-line'}`}></span>
                  </button>
                }
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-save" onClick={handleSave}>
            {editId ? '更新配置' : '保存配置'}
          </button>
        </div>

        {apiKeys.length > 0 && (
          <div className="saved-keys">
            <span className="saved-keys-title">已保存的密钥</span>
            {apiKeys.map(key => {
              const isActive = s.selectedModelId === key.id
              return (
                <div
                  key={key.id}
                  className={`saved-key-item${isActive ? ' active' : ''}`}
                  onClick={() => s.setSelectedModelId(key.id)}
                  title="点击设为当前模型"
                >
                  <div className="saved-key-info">
                    <span className="saved-key-provider">{key.provider}</span>
                    <span className="saved-key-model">
                      {key.model}
                      {key.endpoint && <span className="saved-key-endpoint"> · {key.endpoint}</span>}
                    </span>
                  </div>
                  <div className="saved-key-actions">
                    <span className="saved-key-masked">{maskKey(key.key)}</span>
                    <button
                      type="button"
                      className="saved-key-test"
                      onClick={e => { e.stopPropagation(); handleTest(key) }}
                      disabled={testId === key.id}
                    >
                      {testId === key.id
                        ? <span className="remix spinning ri-loader-4-line"></span>
                        : testSuccess[key.id]
                          ? <span className="remix success ri-check-line"></span>
                          : testFailed[key.id]
                            ? <span className="remix failed ri-close-circle-line"></span>
                            : <span>测试</span>}
                    </button>
                    <UiTip text="编辑">
                      <button
                        type="button"
                        className="saved-key-edit"
                        onClick={e => { e.stopPropagation(); startEdit(key) }}
                      >
                        <span className="remix ri-edit-line"></span>
                      </button>
                    </UiTip>
                    <UiTip text="删除">
                      <button
                        type="button"
                        className="saved-key-delete"
                        onClick={e => { e.stopPropagation(); openDelete(key.id) }}
                      >
                        <span className="remix ri-delete-bin-line"></span>
                      </button>
                    </UiTip>
                    <span onClick={e => e.stopPropagation()}>
                      <UiSwitch size="sm" checked={key.enabled} onChange={() => s.toggleApiKey(key.id)} />
                    </span>
                  </div>
                </div>
              )
            })}
            {testErrorText && <div className="test-error-msg">{testErrorText}</div>}
          </div>
        )}
      </div>

      <UiModal
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        icon="ri-delete-bin-line"
        title="删除密钥"
        subtitle="删除后使用该密钥的抽取将不可用"
        width={480}
        radius={16}
        closeOnOverlay={false}
        footer={
          <>
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--md" onClick={() => setShowDeleteDialog(false)}>
              取消
            </button>
            <button type="button" className="btn-save" onClick={confirmDelete}>确认删除</button>
          </>
        }
      >
        <p className="confirm-text">确定删除该 API 密钥配置？</p>
      </UiModal>
    </div>
  )
}
```

- [ ] **Step 2: 追加模型设置专属 CSS**

追加到 `src/styles/settings-dialog.css` **最末尾**（在 Task 2 Step 4 的 `.settings-panel-content .page-header-card` 之后）：

```css
/* ═══════════════════════════════════════════
   模型设置 — bid-typesetting ModelSettingsView.vue
   密度卡片切换制造商/自定义，左标签 90px + 右控件
 ══════════════════════════════════════════════ */
.model-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1620px;
}
.model-card { padding: 24px 40px; }

.density-group {
  display: flex;
  gap: 24px;
  margin-top: 20px;
}
.density-group > * { flex: 1; min-width: 0; }

.config-form {
  margin-top: 24px;
  background: var(--color-bg-card);
  border: 0.7px solid var(--color-border-soft);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field { display: flex; align-items: center; gap: 16px; }
.form-label {
  width: 90px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}
.form-field > .ui-select,
.form-field > .ui-input,
.form-input-row > .ui-input { flex: 1; min-width: 0; }

.form-input-row { display: flex; align-items: center; flex: 1; min-width: 0; }
.form-key-toggle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-right: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.form-key-toggle .remix { font-size: 18px; }
.form-key-toggle:hover { color: var(--color-text-secondary); }

.form-actions { margin-top: 20px; display: flex; justify-content: flex-end; }

.btn-save {
  height: 44px;
  padding: 0 28px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary);
  color: var(--color-bg-white);
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, transform 0.1s;
}
.btn-save:hover { background: color-mix(in srgb, var(--color-primary) 88%, #000); }
.btn-save:active { transform: scale(0.97); }

.saved-keys {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border-soft);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.saved-keys-title {
  padding-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.saved-key-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-card);
  border: 0.7px solid var(--color-border-soft);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.saved-key-item.active {
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}
.saved-key-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.saved-key-provider { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.saved-key-model {
  font-size: 12px;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.saved-key-endpoint { font-size: 11px; color: var(--color-text-muted); font-family: var(--font-mono); }
.saved-key-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.saved-key-masked {
  font-size: 12px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  padding: 0 8px;
}

.saved-key-test,
.saved-key-edit,
.saved-key-delete {
  height: 30px;
  padding: 0 10px;
  border: 0.7px solid var(--color-border-soft);
  border-radius: 8px;
  background: var(--color-bg-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  font-family: inherit;
  color: var(--color-text-secondary);
  transition: background 0.15s, color 0.15s;
}
.saved-key-test:hover,
.saved-key-edit:hover { background: var(--color-bg-secondary); }
.saved-key-delete:hover {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  color: var(--color-primary);
}
.saved-key-test:disabled { opacity: 0.4; cursor: not-allowed; }
.saved-key-test .remix,
.saved-key-edit .remix,
.saved-key-delete .remix { font-size: 14px; }
.saved-key-test .remix.spinning { animation: lz-spin 1s linear infinite; }
.saved-key-test .remix.success { color: var(--color-success); }
.saved-key-test .remix.failed { color: var(--color-error); }

.test-error-msg { margin-top: 8px; font-size: 12px; color: var(--color-error); }

.confirm-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-body);
}
```

- [ ] **Step 3: 类型检查**

```bash
npx tsc --noEmit
```
Expected: exit 0。若报 `customApiFormat` 等字段不存在，去 `src/shared/types.ts` 的 `SettingsState` 确认字段名后按实际改名。

- [ ] **Step 4: 构建**

```bash
npm run build
```
Expected: `vite build` 成功，无 error。

- [ ] **Step 5: 提交**

```bash
git add src/components/panels/settings/ModelSettingsTab.tsx src/styles/settings-dialog.css
git commit -m "feat(settings): rebuild model settings after bid-typesetting ModelSettingsView"
```

---

### Task 5: 端到端验证

**Files:**
- Create: `/tmp/opencode/harness/settings-alignment.mjs`（临时验证脚本，不入仓）

**Interfaces:**
- Consumes: 全部前述任务
- Produces: 验证结论

**Playwright 约定（沿用本仓惯例）:**
- Chrome: `/home/jingle/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`
- 启动参数含 `--no-sandbox`
- 打开 5173 后先执行 localStorage sentinel：
  `if (localStorage.getItem('__lz_test_first')) return; localStorage.clear(); localStorage.setItem('__lz_test_first','1')`
- 打开设置中心：写入 `localStorage.setItem('lzeditor-settings', JSON.stringify({...JSON.parse(localStorage.getItem('lzeditor-settings')||'{}'), navMode:'top'}))` 后 reload，再点击 footer 的设置按钮（或直接点左下角版本号按钮）

- [ ] **Step 1: 尺寸与结构断言**

脚本断言（全部为 `data-testid` 缺失时的 className 定位）：

1. `.ui-modal` 宽度 ≈ `min(92vw, 1400)`、高度 ≈ `min(92vh, 100vh-40)`。
2. `.settings-nav-list` 宽 240px；`.settings-nav-row` 高 52px、radius 12px、gap 14px；active 行 `backgroundColor` 等于计算后的 `--color-primary-soft`。
3. `.page-header-card` 的 `display === 'none'`。
4. `.settings-section-title` 的 `borderBottomWidth === '0px'` 且 `display === 'block'`。
5. `.settings-content` 的 `rowGap === '20px'`。
6. `.settings-nav-ico` 的 `transitionProperty` 含 `color`。

- [ ] **Step 2: 模型设置交互断言**

1. 点「模型设置」→ `.settings-subtabs` **不存在**；`.density-group` 有 2 个 `.ui-select-card`。
2. 点「自定义配置」卡 → `.config-form` 内出现 `API格式` / `自定义地址` / `模型ID` 三个 `.form-label`。
3. 点回「模型制造商」→ 出现 `服务商` / `模型`，服务商下拉展开后有 `国内` 与 `国外` 两个 `.ui-select-group`，共 11 项。
4. 填 API Key + 服务商 + 模型 → 点 `.btn-save` → `.saved-keys` 出现一行 `.saved-key-item`；`.saved-key-masked` 不含完整密钥（长度 < 原始 key 长度）。
5. 点该行 → 该类出现 `active`，且 `localStorage` 中 `selectedModelId` 变为该行 id。
6. 点删除按钮 → 弹出 480px `.ui-modal`，标题「删除密钥」，正文「确定删除该 API 密钥配置？」→ 点「确认删除」→ 行消失。
7. 点开关 → 不触发行选中态变化（`stopPropagation` 生效）。
8. 全程无 `pageerror` / `console.error`。

- [ ] **Step 3: 主题回归**

切到深色主题，重跑 Step 1 的第 3/4/5 项断言，确认 `--color-*` 取值变化但结构与数值不变。

- [ ] **Step 4: 最终提交（若有验证期修复）**

```bash
git status --short
git add -A && git commit -m "fix(settings): address verification findings"
```
