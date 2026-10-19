# 设置中心对齐 bid-typesetting — 设计文档

日期：2026-10-19
状态：已与用户确认设计，待写实施计划
参考：`/home/jingle/opc/bid-typesetting/src/components/layout/SettingsModal.vue`、`src/views/settings/ModelSettingsView.vue`
前序：`docs/superpowers/specs/2026-10-17-lzeditor-ui-refactor-design.md`（§3 设置中心，已落地）

## 0. 背景

lzeditor 的设置中心在 2026-10-17 那轮已按 bid-maker 规范移植过一版骨架。本轮对照的是同仓库体系的 **bid-typesetting**（Vue 3 + Vite），它是更新、更精细的版本。经逐行比对，现状与目标的差距集中在三处：**弹窗尺寸、卡片间距节奏、模型设置的结构**。侧边栏 CSS 已与目标逐字一致。

参考项目关键源文件：

| 文件 | 用途 |
|---|---|
| `src/components/layout/SettingsModal.vue` | 弹窗外壳 + `.nav-list` 侧边栏 |
| `src/views/settings/ModelSettingsView.vue` | 模型设置（本轮重建对象） |
| `src/views/settings/ThemeSettingsView.vue` | 主题设置（已对齐，仅参考） |
| `src/views/settings/AboutSettingsView.vue` | 关于页（已对齐，仅参考） |

## 1. 已确认的决策

| # | 决策 | 结论 |
|---|------|------|
| D1 | 侧边栏结构 | **保留** lzeditor 现有 4 组 + 个性设置子标签，不扁平化 |
| D2 | 侧边栏 CSS | **逐字照抄** bid-typesetting `.nav-list` |
| D3 | 弹窗尺寸 | **逐字照抄** `92vw` / `max-1400` / `92vh` |
| D4 | 模型设置 | **完全照抄** `ModelSettingsView.vue` 的结构、文案、交互 |
| D5 | 页头卡片 | **照抄隐藏**（bid 在 modal 内 `display:none`） |
| D6 | 区块标题 | **照抄裸标题** `.card-title`，去掉分隔线与区块级描述 |
| D7 | 数据层 | **不动**：Zustand store + localStorage、`useAI.ts`、后端接口 |
| D8 | 密钥行选中态 | **必须新增**（见 §7.2），否则 `selectedModelId` 失去唯一入口 |

## 2. 数据层边界（D7）

「照抄实现」= UI 结构、文案、交互与视觉逐字复刻；**存储与连通性检测仍走 lzeditor 现有链路**。

- bid 的密钥存服务端（`api/settings.js` 的 `getApiKeyList/addApiKey/...`），lzeditor 存 Zustand + localStorage。保留 lzeditor 方式，否则 `useAI.ts` 断链。
- bid 的连通性检测走后端 `testApiKey`，lzeditor 走前端 `GET {endpoint}/models`。保留 lzeditor 的**实际检测机制**，复刻 bid 的**视觉状态**（loader 旋转 / 对勾 / 叉 / 「连通性正常」文本 / `test-error-msg` 区块）。
- bid 的服务商密钥不存 endpoint（后端按 provider 名解析），lzeditor 的 `useAI.ts` 依赖 `key.endpoint`。因此保留一份 `provider → endpoint` 映射，UI 不显示、不影响视觉一致性。

## 3. 弹窗外壳（D3）

| 项 | 现状 | 目标 |
|---|---|---|
| `width` | `1320` | `"92vw"` |
| `max-width` | 无 | `1400`（`UiModal` 新增 `maxWidth` prop） |
| `height` | `'86vh'` | `'92vh'` |
| `bodyPadding` | `false` | `false`（不变） |
| `radius` / `shadow` | `16` / `0 8px 40px rgba(0,0,0,0.1)` | 不变 |

`UiModal.tsx` 改法：新增 `maxWidth?: number`，
`width: maxWidth ? \`min(${widthCss}, ${maxWidth}px)\` : \`min(${widthCss}, 94vw)\``。
（`92vw ≤ 94vw` 恒成立，无需再叠一层。）

## 4. 侧边栏（D2）

现状与 bid 逐字一致的项：`240px` 宽、`52px` 行高、`radius 12px`、`gap 14px`、`padding 0 20px`、icon `22px` 宽 / `20px` 字号、label `15px`、hover `--color-bg-secondary`、active `--color-primary-soft` + icon/label `--color-primary` + `weight 500`、容器 `radius 16px` / `padding 16px` / `gap 4px` / `overflow-y auto`。

**唯一缺口**：bid 的 `.nav-item .icon` 有 `transition: color 0.2s ease`，lzeditor 的 `.settings-nav-ico` 没有。补上。

保留 lzeditor 的 `.settings-subtabs`（bid 无此概念，D1）。

## 5. 页头卡片与区块标题（D5/D6）

### 5.1 页头卡片：隐藏

照抄 bid：

```css
.settings-panel-content .page-header-card { display: none; }
```

**保留 JSX 不删**（含「恢复默认」/「清空表单」按钮），因此 `resetAll` / `resetForm` 处理器仍被引用，不触发 `noUnusedLocals`；DOM 结构不变，仅视觉不可见。

**已知代价（用户已接受）**：设置中心内不再有「恢复默认」「清空表单」入口 —— 这与 bid-typesetting 自身行为一致（其两个按钮在 modal 内同为死代码）。模型表单在保存成功后仍会 `resetForm()`，因此清空能力不丢全。

### 5.2 区块标题：裸标题

`.settings-section-title` 改为 bid 的 `.card-title`：

| 项 | 现状 | 目标 |
|---|---|---|
| font-size / weight | `17px` / `500` | `17px` / `500`（不变） |
| color | `--color-text-primary` | `--color-text-primary`（不变） |
| `display` | `flex` + `space-between` | `block` |
| `border-bottom` | `1px solid --color-border-soft` | **去掉** |
| `padding-bottom` / `margin-bottom` | `16px` / `16px` | `0` / `20px` |

间距改由标题的 `margin-bottom: 20px` 提供（bid 是靠子元素 `margin-top: 20px`，视觉效果等同）。

**同时删除 JSX 中的 `settings-section-desc` 节点，共 11 处**（`ModelSettingsTab` 的 4 处随 §7 重写自然消失）：

| 文件 | 处数 |
|---|---|
| `EditorSettingsTab.tsx` | 6 |
| `SettingsDialog.tsx`（`ThemeSettingsView` 的强调色 / 导航布局两处） | 2 |
| `ContentStyleTab.tsx` | 1 |
| `BehaviorSettingsTab.tsx` | 1 |
| `ShortcutSettingsTab.tsx` | 1 |

理由：bid 的 `.card-title` 无描述位；且这些区块级描述与其下每行的 `setting-hint` / `UDSettingRow desc` 内容重复，信息不丢。
注意 `ShortcutSettingsTab` 的标题里还有一个 `.shortcut-section-icon` 图标 span，**保留**；`display:block` 后各 span 仍按 inline 顺序排布（图标 + 标题），不受影响。

## 6. 间距节奏

| 选择器 | 现状 | 目标 |
|---|---|---|
| `.settings-content` `gap` | `16px` | `20px`（bid 各 view 的 flex column 均 20px） |
| 模型设置根容器 | 无 | 新增 `.model-view`：`display:flex; flex-direction:column; gap:20px; max-width:1620px` |

`.settings-panel-content` 的 `gap: 20px`、`padding-right: 4px` 已与 bid 一致，不动。

## 7. 模型设置重建（D4）

`src/components/panels/settings/ModelSettingsTab.tsx` 整体重写，结构逐块对齐 `ModelSettingsView.vue`。

### 7.1 结构树

```
.model-view
├─ .page-header-card                        （保留 JSX，被 §5.1 隐藏）
│  └─ 含「清空表单」.reset-button（18px icon + 文案，48px 高，radius 12）
└─ .section-card                            padding: 24px 40px（bid ModelSettingsView 值）
   ├─ .card-title 「API Key」
   ├─ .density-group                        gap 24，两个等宽
   │  ├─ UiSelectCard 模型制造商 / 从内置服务商列表选择模型并填写 API Key
   │  └─ UiSelectCard 自定义配置 / 手动填写 API 格式、端点地址和模型 ID
   ├─ .config-form                          bg-card 内嵌卡，padding 24，radius 16，gap 20
   │  ├─ [制造商] .form-field 服务商  → UiSelect（分组下拉，国内/国外）
   │  ├─ [制造商] .form-field 模型    → UiSelect
   │  ├─ [自定义] .form-field API格式  → UiSelect（替代原 segmented）
   │  ├─ [自定义] .form-field 自定义地址 → UiInput clearable
   │  ├─ [自定义] .form-field 模型ID   → UiInput clearable
   │  └─        .form-field API Key    → UiInput password + 内嵌眼睛按钮
   ├─ .form-actions                         flex-end
   │  └─ .btn-save 保存配置 / 更新配置     44px，radius 10，padding 0 28px，primary 底
   └─ .saved-keys                           仅 apiKeys.length > 0 时渲染
      ├─ .saved-keys-title 「已保存的密钥」 13px/600 uppercase
      ├─ .saved-key-item × n               padding 12 16，radius 12，bg-card
      │  ├─ .saved-key-info（provider 14/600 · model 12 · endpoint 11 mono）
      │  └─ .saved-key-actions（masked 12 mono · 测试 · 编辑 · 删除 · UiSwitch sm）
      └─ .test-error-msg                    仅当有错误时
```

### 7.2 交互与文案（逐字）

- 制表页切换从顶部 `.settings-subtabs` **移入** `.density-group` 的两张 `UiSelectCard`，`ModelSettingsTab` 不再接收 `subTab` prop（`SettingsDialog` 的 `NAV_GROUPS` 中 `ai` 组的 `subs` 清空为 `[]`，`.settings-subtabs` 因此不渲染，同时 `<ModelSettingsTab subTab={subTab} />` 改为 `<ModelSettingsTab />`）。
- 服务商切换时 `selectedModel` 清空（bid `onProviderChange`）。
- 保存文案：未编辑 `保存配置` / 编辑中 `更新配置`；成功 toast `「{provider}」API Key 已保存` / `「{provider}」配置已更新` / `自定义配置已保存` / `自定义配置已更新`。
- 校验文案：`请选择服务商和模型`、`请填写自定义地址和模型 ID`、`请输入 API Key`。
- 测试按钮：检测中 loader 旋转 + `spinning`；成功 `✓` + 「连通性正常」；失败 `⊠` + 「失败」；默认文案「测试」。
- 删除：**行内两击确认改为 480px `UiModal` 确认框** —— `title 删除密钥` / `subtitle 删除后使用该密钥的抽取将不可用` / `icon ri-delete-bin-line` / `confirm-text 确认删除` / 正文 `确定删除该 API 密钥配置？`。
- **D8 密钥行可点击 + 选中态（对 bid 的必要新增）**：bid 的 `.saved-key-item` 不可点击，但 lzeditor 的 `useAI.ts` 靠 `settings.selectedModelId` 选密钥，而它的**唯一** UI 就是现有密钥行的 `onClick`。照抄会把这个能力删掉，因此保留行点击并新增选中态：`cursor:pointer` + `title="点击设为当前模型"`；active 时 `border-color:var(--color-primary)` 与 `background:var(--color-primary-soft)`（复用 bid 自己的 active 令牌，与 `.nav-item.active` 同一套视觉语言）。
- **密钥掩码（对 bid 的必要修正）**：bid 的 `.saved-key-menu` 直接渲染 `k.api_key` 原文，属安全隐患。lzeditor 渲染 `key.key.slice(0,6) + '…' + key.key.slice(-4)`（长度 <10 时全打码为 `••••`），CSS 不变。
- 编辑：`startEdit` 按是否有 endpoint 决定回填制造商页还是自定义页；回填后 `apiKey` 置空（bid 行为），placeholder 显示「留空则保留原密钥，输入则更换」。
- 「清空表单」= `resetForm()`：清 key / 服务商 / 模型 / 自定义三字段 / 编辑态。

### 7.3 服务商数据

采用 bid 的 11 家及各自模型名（含 lzeditor 原来没有的 **零一万物 / Mistral / Groq**），并补 `desc` / `group`：

| 国内 | 国外 |
|---|---|
| 阿里云（通义千问）· 百度（文心一言）· 智谱（GLM）· DeepSeek · Moonshot（月之暗面）· 零一万物（Yi） | OpenAI（GPT）· Anthropic（Claude）· Google（Gemini）· Mistral AI · Groq |

模型名与 bid 完全一致（如 `qwen3.7-max`、`gpt-5.6-sol`、`claude-opus-4.8`、`yi-large`、`mistral-large-3`、`llama-3.3-70b`）。

保留 lzeditor 的 endpoint 映射（`provider → endpoint`，不进 UI）：沿用现有 8 家的地址，新增 3 家为
`零一万物 https://api.siliconflow.cn/v1`、`Mistral https://api.mistral.ai/v1`、`Groq https://api.groq.com/openai/v1`。
`format` 仍按 `Anthropic → anthropic`、其余 `openai` 推导。

自定义配置的 provider 名沿用 bid：`Anthropic (自定义)` / `OpenAI (自定义)`。

### 7.4 UI 原子补件

| 组件 | 改动 | 用途 |
|---|---|---|
| `UiInput` | 新增 `suffix?: React.ReactNode`，渲染于 input 之后、clear 按钮之前 | API Key 内嵌眼睛切换（bid 用 `#suffix` 插槽） |
| `UiModal` | 新增 `maxWidth?: number` | §3 外壳尺寸 |

`UiSelect` 已支持 `group` / `desc`，`UiSelectCard` 已支持 `selected` / `title` / `desc` / `onClick`，均无需改动。
`UiSwitch` 的 `checked` + `onChange` 复用现状。

## 8. 不在本次范围

- 主题设置 / 个性设置 4 个 tab / 关于页的**结构**不动（数值已与 bid 一致），仅受 §5 标题改法与 §6 间距影响。
- 数据层、后端接口、`useAI.ts`、快捷键、导出等业务逻辑不动。
- LPK 打包链路、主题 token 体系（AGENT.md §7：禁 `[data-theme]` 选择器，深浅色走 `--t-*` 成对 token）不动。
- `ShortcutSettingsTab` / `ContentStyleTab` 内部的表格与样式清单排版不动。

## 9. 涉及文件

| 文件 | 改动 |
|---|---|
| `src/components/ui/UiModal.tsx` | 新增 `maxWidth` |
| `src/components/ui/UiInput.tsx` | 新增 `suffix` |
| `src/components/panels/SettingsDialog.tsx` | 外壳尺寸、`ai` 组 `subs` 清空、`ThemeSettingsView` 删 2 处 `settings-section-desc` |
| `src/components/panels/settings/ModelSettingsTab.tsx` | **重写** |
| `src/components/panels/settings/EditorSettingsTab.tsx` | 删 `settings-section-desc` |
| `src/components/panels/settings/BehaviorSettingsTab.tsx` | 删 `settings-section-desc` |
| `src/components/panels/settings/ContentStyleTab.tsx` | 删 `settings-section-desc` |
| `src/components/panels/settings/ShortcutSettingsTab.tsx` | 删 `settings-section-desc` |
| `src/styles/settings-dialog.css` | nav-ico transition、外壳无关、`.settings-content` gap、`.settings-section-title`、新增 `.model-view` / `.density-group` / `.config-form` / `.form-field` / `.form-label` / `.form-input-row` / `.form-key-toggle` / `.form-actions` / `.btn-save` / `.saved-keys*` / `.test-error-msg` / `.settings-panel-content .page-header-card` |

## 10. 验证

1. `npx tsc --noEmit` exit 0。
2. `npm run build` 通过。
3. Playwright（脚本置 `/tmp/opencode/harness/`，chrome `--no-sandbox`，localStorage sentinel 清库）：
   - 设置弹窗尺寸 ≈ `min(92vw, 1400px)` × `min(92vh, 100vh-40px)`。
   - 侧边栏 4 组行高 52px、宽 240px；active 项背景为 `--color-primary-soft`。
   - 模型设置：`density-group` 两张卡可切换，表单字段随切换变化；`.settings-subtabs` 不渲染。
   - 保存一条密钥 → 出现在 `.saved-keys`；开关、编辑、删除（走 480px 确认框）、测试均可用；**点击行可选中**（active 行背景为 `--color-primary-soft`），`selectedModelId` 随点击变化。
   - 页头卡片 `display:none`，区块标题无分隔线。
   - 无 pageerror / console error。

## 11. 回退面

若用户后续要求找回「恢复默认」/「清空表单」入口，只需删除 §5.1 的 `display:none` 一行（按钮 JSX 从未删除）。
若要求找回区块级描述，需恢复 4 个 tab 的 `settings-section-desc` 节点并恢复 `.settings-section-title` 的 flex + 分隔线。
