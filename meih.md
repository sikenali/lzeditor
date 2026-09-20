# doocs/md 主题切换实现参考

> 来源：https://github.com/doocs/md
> 分析日期：2026-09-18

---

## 一、架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                        ThemePanel.vue                        │
│  (UI: 主题卡片、颜色选择器、字体/字号/行高/间距控件)           │
└───────────────────────┬─────────────────────────────────────┘
                        │ 调用
┌───────────────────────▼─────────────────────────────────────┐
│                      useThemeStore                           │
│  - theme: ThemeName          (当前主题名)                    │
│  - themeSettings: Map        (每个主题的独立配置)             │
│  - primaryColor, fontFamily, fontSize, lineHeight ...       │
│  - applyCurrentTheme()       (核心应用方法)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ 调用
┌───────────────────────▼─────────────────────────────────────┐
│                  @md/core/theme/themeApplicator.ts            │
│  applyTheme({ themeName, themeCSS, customCSS, variables })   │
│  1. resolveThemeCSS()    → 合并 base.css + 主题 CSS          │
│  2. generateCSSVariables() → 生成 :root CSS 变量              │
│  3. generateHeadingStyles() → 生成标题样式 CSS                │
│  4. wrapCSSWithScope()   → 加 #output 作用域前缀              │
│  5. processCSS()         → 压缩/处理                          │
│  6. injector.inject()    → 注入 <style> 到 DOM                │
└───────────────────────┬─────────────────────────────────────┘
                        │ 数据
┌───────────────────────▼─────────────────────────────────────┐
│              @md/shared/configs/                            │
│  ├── theme-css/             (base.css + default/grace/simple) │
│  ├── style.ts               (所有选项数组: 字体/字号/颜色等)   │
│  └── theme.ts               (主题选项列表)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、配置数据结构

### 2.1 主题名称类型 (`theme.ts`)

```typescript
// 内置主题
export type BuiltinThemeName = 'default' | 'grace' | 'simple'
//  marketplace 主题: 'mp:<id>'
export type ThemeName = BuiltinThemeName | MarketplaceThemeKey

export const themeOptions: IConfigOption<ThemeName>[] = [
  { label: '经典', value: 'default', desc: '' },
  { label: '优雅', value: 'grace', desc: '@brzhang' },
  { label: '简洁', value: 'simple', desc: '@okooo5km' },
]
```

### 2.2 每主题独立设置 (`style.ts`)

```typescript
export interface PerThemeSettings {
  primaryColor: string       // 主色
  fontFamily: string         // 字体族
  fontSize: string           // 字号 (如 '16px')
  lineHeight: string         // 行高 (如 '1.75')
  blockSpacing: string       // 块间距倍数 (如 '1')
  linkColor: string          // 链接颜色
  blockquoteBackground: string // 引用块背景
  codeBlockTheme: string     // 代码高亮主题 URL
  headingStyles: HeadingStyles // 各级标题样式
  isShowLineNumber: boolean  // 代码行号
  isMacCodeBlock: boolean    // Mac 窗口风格代码块
}

// 每个主题可以有自己的设置覆盖
export type PerThemeSettingsMap = Partial<Record<ThemeName, PerThemeSettings>>
```

### 2.3 默认配置

```typescript
export const defaultStyleConfig = {
  isCiteStatus: false,
  isMacCodeBlock: true,
  isShowLineNumber: false,
  isCountStatus: false,
  theme: 'default',
  fontFamily: fontFamilyOptions[0].value,  // 无衬线
  fontSize: fontSizeOptions[2].value,      // 16px
  lineHeight: lineHeightOptions[2].value,  // 1.75
  blockSpacing: blockSpacingOptions[2].value, // 1×
  primaryColor: colorOptions[0].value,     // 经典蓝 #0F4C81
  linkColor: linkColorOptions[0].value,    // 微信蓝 #576b95
  blockquoteBackground: blockquoteBackgroundOptions[0].value, // default
  codeBlockTheme: codeBlockThemeOptions[23].value, // atom-one-dark
  legend: legendOptions[3].value,          // 只显示 alt
  headingStyles: {},
}
```

### 2.4 可选值定义

```typescript
// 字体
export const fontFamilyOptions = [
  { label: '无衬线', value: '-apple-system-font,BlinkMacSystemFont,Helvetica Neue,...' },
  { label: '衬线',   value: 'Optima-Regular, Optima, PingFangSC-light,...' },
  { label: '等宽',   value: 'Menlo, Monaco, Courier New, monospace' },
]

// 字号
export const fontSizeOptions = [
  { label: '14px', value: '14px', desc: '更小' },
  { label: '15px', value: '15px', desc: '稍小' },
  { label: '16px', value: '16px', desc: '推荐' },
  { label: '17px', value: '17px', desc: '稍大' },
  { label: '18px', value: '18px', desc: '更大' },
]

// 行高
export const lineHeightOptions = [
  { label: '1.5',  value: '1.5',  desc: '紧凑' },
  { label: '1.65', value: '1.65', desc: '稍紧' },
  { label: '1.75', value: '1.75', desc: '推荐' },
  { label: '1.9',  value: '1.9',  desc: '稍松' },
  { label: '2.05', value: '2.05', desc: '宽松' },
]

// 块间距 (倍数)
export const blockSpacingOptions = [
  { label: '0.75×', value: '0.75', desc: '紧凑' },
  { label: '0.9×',  value: '0.9',  desc: '稍紧' },
  { label: '1×',    value: '1',    desc: '推荐' },
  { label: '1.15×', value: '1.15', desc: '稍松' },
  { label: '1.35×', value: '1.35', desc: '宽松' },
]

// 强调色 (11 色)
export const colorOptions = [
  { label: '经典蓝',   value: '#0F4C81' },
  { label: '翡翠绿',   value: '#009874' },
  { label: '活力橘',   value: '#FA5151' },
  { label: '柠檬黄',   value: '#FECE00' },
  { label: '薰衣紫',   value: '#92617E' },
  { label: '天空蓝',   value: '#55C9EA' },
  { label: '玫瑰金',   value: '#B76E79' },
  { label: '橄榄绿',   value: '#556B2F' },
  { label: '石墨黑',   value: '#333333' },
  { label: '雾烟灰',   value: '#A9A9A9' },
  { label: '樱花粉',   value: '#FFB7C5' },
]

// 代码块主题 (76 个，来自 CDN highlight.js)
const codeBlockUrlPrefix = 'https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles/'
export const codeBlockThemeOptions = codeBlockThemeList.map(code => ({
  label: code,
  value: `${codeBlockUrlPrefix}${code}.min.css`,
}))
// 默认: atom-one-dark (index 23)

// 标题样式
export const headingStyleOptions = [
  { label: '默认',    value: 'default' },
  { label: '主题色文字', value: 'color-only' },
  { label: '下边框',  value: 'border-bottom' },
  { label: '左边框',  value: 'border-left' },
  { label: '自定义',  value: 'custom' },
]

export type HeadingStyles = {
  h1?: HeadingStyleType
  h2?: HeadingStyleType
  h3?: HeadingStyleType
  h4?: HeadingStyleType
  h5?: HeadingStyleType
  h6?: HeadingStyleType
}
```

---

## 三、主题应用流程

### 3.1 applyTheme() 核心逻辑

```typescript
// packages/core/src/theme/themeApplicator.ts
export async function applyTheme(config: ThemeConfig): Promise<void> {
  // 1. 生成 CSS 变量 (注入到 :root)
  const variablesCSS = generateCSSVariables(config.variables)

  // 2. 获取主题 CSS (base + 主题特定)
  const themeCSS = resolveThemeCSS(config.themeName, config.themeCSS)
  //   → base.css + (非 default 主题时追加 grace.css 或 simple.css)

  // 3. 添加 #output 作用域，避免污染页面其他部分
  const scopedThemeCSS = wrapCSSWithScope(themeCSS, '#output')

  // 4. 生成标题样式
  const headingStylesCSS = generateHeadingStyles(config.variables)

  // 5. 自定义 CSS (用户通过 CSS 编辑器编写)
  const scopedCustomCSS = config.customCSS
    ? wrapCSSWithScope(config.customCSS, '#output')
    : ''

  // 6. 合并所有 CSS
  let mergedCSS = [
    variablesCSS,      // :root { --md-primary-color: ... }
    baseCSSContent,    // 基础重置样式
    scopedThemeCSS,    // 主题样式 (带 #output 前缀)
    headingStylesCSS,  // 标题样式
    scopedCustomCSS,   // 用户自定义
  ].filter(Boolean).join('\n\n')

  // 7. CSS 处理 (压缩等)
  mergedCSS = processCSS(mergedCSS)

  // 8. 注入到 DOM
  const injector = getThemeInjector()
  injector.inject(mergedCSS)
}
```

### 3.2 CSS 变量生成

```typescript
// packages/core/src/theme/cssVariables.ts
export function generateCSSVariables(config: CSSVariableConfig): string {
  const blockquoteBackground = config.blockquoteBackground && config.blockquoteBackground !== 'default'
    ? `\n  --md-blockquote-background: ${config.blockquoteBackground};`
    : ''

  return `
:root {
  --md-primary-color: ${config.primaryColor};
  --md-font-family: ${config.fontFamily};
  --md-font-size: ${config.fontSize};
  --md-line-height: ${config.lineHeight || '1.75'};
  --md-block-spacing: ${config.blockSpacing || '1'};
  --md-link-color: ${config.linkColor || '#576b95'};${blockquoteBackground}
}

/* 首行缩进 & 两端对齐 */
#output p {
  ${config.isUseIndent ? 'text-indent: 2em;' : ''}
  ${config.isUseJustify ? 'text-align: justify;' : ''}
}
  `.trim()
}
```

### 3.3 标题样式生成

```typescript
function generateHeadingCSS(level: 'h1'|'h2'|...|'h6', style: string): string {
  const base = 'display:block; text-align:left; background:transparent;'
  switch (style) {
    case 'color-only':
      return `#output ${level} { ${base} color: var(--md-primary-color); }`
    case 'border-bottom':
      return `#output ${level} { ${base} padding-bottom:0.3em; border-bottom:2px solid var(--md-primary-color); color:var(--md-primary-color); }`
    case 'border-left':
      return `#output ${level} { ${base} margin-left:0; padding-left:10px; border-left:4px solid var(--md-primary-color); color:var(--md-primary-color); }`
    default: return ''
  }
}
```

### 3.4 作用域包装

```typescript
// 给所有 CSS 选择器加 #output 前缀，避免影响页面其他部分
function wrapCSSWithScope(css: string, scope: string): string {
  // 正则: 在所有选择器前插入 #output
  return css.replace(/([^{][^{}]*?)\{/g, `${scope} $1{`)
}
```

---

## 四、主题 CSS 文件结构

### 4.1 base.css (基础重置)

```css
/* 容器 */
#output {
  font-family: var(--md-font-family);
  font-size: var(--md-font-size);
  line-height: var(--md-line-height);
  text-align: left;
}

/* 重置 */
#output blockquote { margin-left: 0; margin-right: 0; margin-top: 0; }
#output table { border-collapse: collapse; min-width: 100%; }

/* emoji 图片限制大小 */
#output img.md-emoji { max-height: 1.4em; width: auto; vertical-align: text-bottom; }
```

### 4.2 default.css / grace.css / simple.css

每个主题 CSS 定义：
- 背景色、文字颜色
- 标题样式 (h1-h6)
- 段落、引用、代码块样式
- 表格样式
- 等...

主题 CSS 中大量使用 `var(--md-primary-color)` 等 CSS 变量，由 `generateCSSVariables()` 注入实际值。

---

## 五、Store 状态管理

```typescript
// useThemeStore (Pinia)
const theme = store.reactive('theme', 'default')          // 当前主题
const themeSettings = store.reactive('themeSettings', {}) // PerThemeSettingsMap

// 计算属性：获取当前主题的实时设置
const currentSettings = computed(() => {
  return themeSettings.value[theme.value] ?? defaultPerThemeSettings()
})

// 每个设置项都是 getter/setter，写入 themeSettings[theme]
const primaryColor = computed({
  get: () => currentSettings.value.primaryColor,
  set: (v) => {
    const t = theme.value
    const existing = themeSettings.value[t] ?? defaultPerThemeSettings()
    themeSettings.value = { ...themeSettings.value, [t]: { ...existing, primaryColor: v } }
  }
})

// 切换主题时自动应用
watch(theme, () => { applyCurrentTheme() })

// 重置当前主题的所有设置
const resetStyle = () => {
  themeSettings.value[theme.value] = defaultPerThemeSettings()
}
```

**关键设计**：每个主题可以有独立的设置（如「经典」用蓝色、「优雅」用绿色），切换主题时保留各自的字体/字号等配置。

---

## 六、与 LZEditor 的对照

| doocs/md | LZEditor 当前状态 |
|----------|------------------|
| `theme` (default/grace/simple) | `styleSet` (ocean/neon-dark/graphite/sakura/mint/minimal) |
| `themeSettings` per-theme map | 全局 `styleSet` + CSS `[data-style-set]` 选择器 |
| `applyTheme()` → inject `<style>` | `applyStyleSet()` → set `data-style-set` attribute |
| CSS 变量 `--md-primary-color` | CSS 变量 `--accent-primary` 等 |
| 11 色强调色选择 | 5 色 accent preset (red/teal/green/gold/ink) |
| 字体/字号/行高/间距/链接色/引用背景 | 字体/字号/行高/宽度 (缺少链接色/引用背景) |
| 76 个代码高亮主题 | 3 个 (github/github-dark/atom-one-dark) |
| 标题样式 (color-only/border-bottom/border-left) | 无 |
| 首行缩进/两端对齐 | 无 |
| Mac 代码块窗口 | 无 |
| 代码行号 | 有 (`showLineNumbers`) |

---

## 七、可借鉴的改进方向

### 7.1 主题设置 per-theme 独立存储
当前 LZEditor 的 `styleSet` 是全局单一的，切换主题后字体/字号等设置会丢失。可改为：
```typescript
// settingsStore
themeSettings: Record<string, { fontSize: number; lineHeight: string; ... }>
```

### 7.2 动态 CSS 变量注入 (参考 applyTheme)
当前用 `[data-style-set="ocean"]` CSS 选择器切换主题，无法运行时动态改色。可改为：
```typescript
function applyStyleSetDynamic(styleSetId: string, overrides?: Partial<CSSVars>) {
  const vars = generateCSSVars(styleSetId, overrides)
  document.documentElement.style.cssText = vars
}
```

### 7.3 标题样式预设
参考 doocs/md 的 `headingStyles`，支持：
- `color-only`: 标题用主题色
- `border-bottom`: 标题下方横线
- `border-left`: 标题左侧竖线

### 7.4 代码块主题扩展
从 3 个扩展到 76 个，URL 模板：
```
https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles/{theme}.min.css
```

### 7.5 文本对齐选项
- 首行缩进: `text-indent: 2em`
- 两端对齐: `text-align: justify`

---

## 八、关键文件路径 (doocs/md 仓库)

```
apps/web/src/stores/theme.ts          # 主题 store (UI 状态)
packages/shared/src/configs/style.ts   # 所有选项数组 (字体/颜色/尺寸等)
packages/shared/src/configs/theme.ts   # 主题列表
packages/shared/src/configs/theme-css/ # CSS 主题文件
packages/core/src/theme/
  ├── themeApplicator.ts   # applyTheme() 入口
  ├── cssVariables.ts      # 生成 :root CSS 变量
  ├── cssScopeWrapper.ts   # 添加 #output 作用域
  ├── cssProcessor.ts      # CSS 压缩处理
  └── themeInjector.ts     # 注入 <style> 到 DOM
```
