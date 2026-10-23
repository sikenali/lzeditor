# LZEditor — 懒猫编辑器

<p align="center">
  <strong>轻文档 · Markdown · AI 辅助写作 · 多端同步</strong>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white">
  <img alt="JSON Store" src="https://img.shields.io/badge/Data%20Store-JSON%20File-003B57?logo=json&logoColor=white">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-31-4790?logo=electron&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
  <img alt="Platform" src="https://img.shields.io/badge/Platform-Win%20|%20Mac%20|%20Linux-lightgrey">
</p>

---

## 项目介绍

**懒猫编辑器（LZEditor）**是一款面向个人与团队场景的轻文档 Markdown 编辑器，支持 AI 辅助写作、多文档管理、本地持久化存储与跨平台桌面客户端。前端基于 React + Vite + TipTap，后端采用 Express + 本地 JSON 文件存储（无外部原生依赖），同时支持 LPK 云部署与 Electron 桌面应用，提供流畅的写作体验与智能 AI 能力。

### 核心功能

| 功能 | 说明 |
|------|------|
| **Markdown 编辑** | TipTap 富文本编辑器，支持 Markdown 语法、实时预览、分屏模式 |
| **AI 辅助写作** | 支持 Anthropic Claude / OpenAI / 自定义基座，摘要、续写、润色、翻译一键完成 |
| **多 Provider 支持** | 国内（阿里/百度/智谱/DeepSeek/Moonshot/零一）+ 国外（OpenAI/Anthropic/Google/Mistral/Groq），走 openai 或 anthropic 两种协议，模型自由切换 |
| **多文档管理** | 文档列表、新建/重命名/删除、快捷搜索、最近打开记录 |
| **历史版本** | 自动保存编辑历史，随时回退到任意版本，支持版本对比 |
| **导出格式** | Markdown、HTML、PDF、DOCX（真实 OOXML）、EPUB（自动切章）、XLSX、PNG/SVG、DrawIO |
| **API Key 安全存储** | 仅保存在本地，明文不离开设备、不上传任何第三方；服务端以 SHA-256 加盐哈希入库 |
| **主题外观** | 浅色/深色主题，编辑区宽度调节，字体大小自定义 |
| **桌面客户端** | Electron 打包，支持 macOS / Windows / Linux，离线可用 |
| **LPK 云部署** | 懒猫云一键部署，公网访问，数据持久化到 `/lzcapp/var/data` |

---

## 代码架构

```
lzeditor/
├── electron/
│   ├── main.ts                   # Electron 主进程 (窗口管理 + IPC)
│   ├── preload.ts                # 预加载脚本 (contextBridge)
│   └── tsconfig.json             # Electron 进程 TS 配置
│
├── server/
│   └── src/
│       ├── index.ts              # Express 服务器入口
│       ├── routes/               # API 路由
│       └── providers/            # AI Provider 适配层
│
├── src/
│   ├── main.tsx                  # React 应用入口
│   ├── App.tsx                   # 根组件 (布局 + 面板调度)
│   │
│   ├── components/
│   │   ├── editor/               # 编辑器核心组件
│   │   │   ├── LZEditor.tsx      # 主编辑器 (TipTap + 扩展)
│   │   │   ├── AIPanel.tsx       # AI 辅助面板
│   │   │   ├── SlashCommand.tsx  # "/" 斜杠命令菜单
│   │   │   ├── constants.ts      # 内置文档内容
│   │   │   └── extensions/       # 自定义 TipTap 扩展
│   │   │       ├── CJKAutoSpace.ts          # 中日韩与拉丁文自动空格
│   │   │       ├── CodeHighlight.ts         # 代码高亮
│   │   │       ├── HeadingAnchors.ts        # 标题锚点
│   │   │       ├── ImageExt.ts              # 图片节点
│   │   │       ├── Mathematics.ts           # KaTeX 公式
│   │   │       ├── SupSub.ts                # 上标 / 下标
│   │   │       └── StyledInsertAttributes.ts# 插入内容的样式属性
│   │   │
│   │   ├── layout/               # 布局组件
│   │   │   ├── Toolbar.tsx       # 顶部工具栏
│   │   │   ├── DocumentMetaBar.tsx  # 文档元信息栏
│   │   │   ├── LeftNav.tsx       # 左侧图标导航
│   │   │   ├── StatusBar.tsx     # 底部状态栏
│   │   │   ├── Footer.tsx        # 页脚
│   │   │   ├── WelcomeScreen.tsx # 首次启动欢迎页
│   │   │   └── editorActions.tsx # 顶栏与侧栏共用的编辑动作
│   │   │
│   │   ├── panels/               # 面板组件
│   │   │   ├── SettingsDialog.tsx   # 设置面板
│   │   │   ├── ExportDialog.tsx     # 导出面板
│   │   │   ├── HistoryPanel.tsx     # 历史版本面板
│   │   │   ├── LibraryPanel.tsx     # 文档库面板
│   │   │   ├── LibraryTree.tsx      # 文档库树
│   │   │   ├── FilePanel.tsx        # 文件面板
│   │   │   ├── PreviewPanel.tsx     # 预览面板
│   │   │   ├── SearchPanel.tsx      # 搜索面板
│   │   │   ├── StyleMainPanel.tsx   # 样式面板
│   │   │   ├── ImageDialog.tsx      # 图片
│   │   │   ├── LinkDialog.tsx       # 链接
│   │   │   ├── CodeDialog.tsx       # 代码块
│   │   │   ├── FormulaDialog.tsx    # 公式
│   │   │   ├── TableDropdown.tsx    # 表格
│   │   │   ├── EmojiDialog.tsx      # 表情
│   │   │   ├── ChartDialog.tsx      # 图表
│   │   │   ├── ImportButtons.tsx    # 导入入口
│   │   │   └── settings/            # 各设置子页
│   │   │
│   │   ├── sidebar/              # 侧边栏
│   │   │   ├── SidebarOutline.tsx  # 大纲导航
│   │   │   └── SidebarPreview.tsx  # 即时预览
│   │   │
│   │   └── ui/                   # 基础 UI 原子组件
│   │       ├── UiModal.tsx / UiInput.tsx / UiButton.tsx
│   │       ├── UiSelect.tsx / UiSelectCard.tsx
│   │       ├── UiSwitch.tsx / UiCheck.tsx / UiTip.tsx
│   │       └── index.ts          # 统一导出入口
│   │
│   ├── hooks/
│   │   ├── useTheme.ts           # 主题切换
│   │   ├── useAI.ts              # AI 调用封装
│   │   ├── useScrollSpy.ts       # 滚动定位
│   │   └── useScrollSync.ts      # 编辑器 / 预览滚动同步
│   │
│   ├── services/
│   │   ├── exportService.ts      # 导出服务 (MD/HTML/PDF/DOCX/EPUB/DrawIO)
│   │   ├── docxGenerator.ts      # DOCX 生成 (OOXML)
│   │   ├── epubGenerator.ts      # EPUB 生成
│   │   └── promptTemplate.ts     # Prompt 模板管理
│   │
│   ├── store/
│   │   ├── editorStore.ts        # 编辑器 Zustand Store
│   │   ├── settingsStore.ts      # 设置 Zustand Store
│   │   └── aiStore.ts            # AI 状态 Store
│   │
│   ├── utils/
│   │   ├── mdToHtml.ts / htmlToMd.ts   # Markdown 互转
│   │   ├── docSource.ts / docImport.ts # 内置文档源 / 导入
│   │   ├── sanitizeHtml.ts / cleanContent.ts
│   │   ├── icon.ts / toast.ts / silentError.ts / recentDocs.ts
│   │
│   ├── shared/
│   │   ├── types.ts              # 公共类型定义
│   │   └── version.ts            # 版本号单一来源
│   │
│   ├── content/                  # 内置文档（使用手册等，中文文件名）
│   │   ├── welcome.md / readme.md
│   │   └── a01~a10、b01~b10.md
│   │
│   └── styles/                   # CSS 样式与主题
│       ├── tokens.css / color-tokens.css / themes.ts
│       ├── typography-themes.ts / code-themes.ts
│       ├── globals.css / layout.css / app.css
│       ├── ui.css / panels.css / settings-dialog.css
│       ├── read-mode.css / welcome-screen.css
│
├── public/
│   └── icon.png                  # 应用图标
│
├── dist/                         # Vite 构建输出
└── release/                      # Electron 打包输出
```

### 架构层次

```
┌──────────────────────────────────────────────────────────────────┐
│                    Electron 主进程 (electron/main.ts)             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  窗口管理 (1440×900, 最小 1024×640, frameless)              │  │
│  │  IPC: window-minimize, window-maximize, window-close        │  │
│  │  预加载: preload.ts (contextBridge → window.electronAPI)    │  │
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                     渲染进程 — React + TipTap 应用                │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌─────────────┐ │
│  │  App.tsx     │ │  Layout      │ │  Panels  │ │  Sidebar    │ │
│  │  根组件      │ │  Toolbar     │ │  Settings│ │  Outline    │ │
│  │              │ │  MetaBar     │ │  Export  │ │  Preview    │ │
│  │              │ │  StatusBar   │ │  History │ │             │ │
│  └──────────────┘ └──────────────┘ └──────────┘ └─────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   编辑器核心 (components/editor/)           │  │
│  │  LZEditor · AIPanel · SlashCommand · extensions/            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Hooks (组合式逻辑层)                            │  │
│  │  useTheme · useAI · useScrollSpy · useScrollSync             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Services (服务层)                               │  │
│  │  exportService · docxGenerator · epubGenerator · promptTemplate │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Zustand Stores (状态层)                         │  │
│  │  editorStore · settingsStore · aiStore                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│                    后端服务 (server/src/)                        │
│  Express + JSON 文件存储（keys.json 存 key 摘要，明文只在浏览器）  │
│  - routes/chat.ts   AI 代理（Anthropic / OpenAI 兼容）          │
│  - routes/settings.ts  key 摘要存取                            │
│  - /api/health  健康检查（lzcinit）                             │
│  - LPK 云部署兼容（自打包 musl node 运行时）                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 实现原理

### TipTap 编辑器扩展体系

```
LZEditor (TipTap Core)
  ├── StarterKit (基础 Markdown 语法，关闭内置 codeBlock)
  ├── Table / TableRow / TableHeader / TableCell  → 表格支持
  ├── TaskList / TaskItem                      → 待办事项
  ├── Emoji (@tiptap/extension-emoji)           → 表情节点
  ├── SearchAndReplace (@memfoldai)             → 搜索高亮
  └── 自定义扩展 (extensions/):
      ├── CodeHighlight         代码块语法高亮
      │                        (内含 CodeBlockLowlight + lowlight
      │                         + Highlight，内置 codeBlock 已关闭)
      ├── Superscript/Subscript 上标 / 下标
      ├── StyledInsertAttributes 插入块统一样式属性
      ├── HeadingAnchors        标题自动生成锚点 id
      ├── CJKAutoSpace          中日韩与拉丁文之间自动加空格
      ├── Mathematics           KaTeX 公式渲染
      └── ImageExt              图片节点（对齐 / 圆角 / 阴影）
```

### AI 辅助写作流程

```
用户选中文本 / 输入 Prompt
  → useAI hook（settingsStore 里选中的模型配置）
  → 按 key 的 format 分支直连 Anthropic 或 OpenAI 兼容端点
  → 浏览器端直接发起请求，不经过本地后端
  → 流式响应 (SSE)
  → AIPanel 实时展示结果
  → 一键插入 / 替换 / 续写
```

### 多 Provider 适配

每个 key 带一个 `format` 字段，只有两种取值：

| format | 请求方式 |
|--------|---------|
| `openai` | `POST {endpoint}/chat/completions`，`Authorization: Bearer` |
| `anthropic` | `POST {endpoint}/messages`，`x-api-key` + `anthropic-version` |

内置厂商预设（可自由覆盖 endpoint）：

| 国内 | 国外 |
|------|------|
| 阿里云通义千问、百度文心一言、智谱 GLM、DeepSeek、Moonshot、零一万物 | OpenAI、Anthropic、Google、Mistral、Groq |

除 Anthropic 外全部走 OpenAI 兼容模式，所以新增厂商只需加一行 endpoint。

### 文档持久化

- **浏览器 / 桌面端**: 文档与 API Key 只写在本地 `localStorage`，不上传服务器
- **服务端**: 不存文档，只落 `keys.json`（key 的加盐 SHA-256 摘要），无外部原生依赖
- **API Key**: 服务端以 SHA-256 加盐哈希存储，仅用于存在性校验，不可反向解出明文

### 导出链路

| 格式 | 实现 |
|------|------|
| **Markdown** | TipTap JSON → text |
| **HTML** | 独立样式的单文件 HTML，可带目录 / 页码 / 行号 |
| **PDF** | 打印友好的新窗口 → 系统打印对话框 |
| **DOCX** | docxGenerator.ts 生成真实 OOXML 包 (JSZip: document.xml + styles.xml + 图片内嵌) |
| **EPUB** | epubGenerator.ts，按 h1/h2 自动切章 |
| **XLSX** | SheetJS，表格导出 |
| **PNG / SVG** | 单张图片导出 |
| **DrawIO** | 合法 mxfile XML，块级节点纵向布局 + 相邻连线 |

---

## 本地开发

```bash
npm install

npm run dev          # 前端 (vite, :5173) + 后端 (:3001)
npm run dev:web      # 仅前端
npm run dev:server   # 仅后端

npm run typecheck    # tsc --noEmit
npm run test         # node --test tests/*.test.mjs
npm run check        # typecheck + test
npm run build        # tsc && vite build
```

`tests/` 下是对源码做静态文本匹配的回归断言（`node --test`），校验 UI 原子、
设置结构、主题边界、插入块样式边界等约定，不需要浏览器或 DOM 环境。

## 部署说明

### LPK 部署

```bash
cd lzc && bash package.sh        # 本地打包生成 .lpk
lzc-cli lpk install cloud.lazycat.app.lzeditor-<版本>.lpk
```

访问应用：`https://<子域名>.<域名>`

### Electron 桌面版

从 [GitHub Releases](https://github.com/sikenali/lzeditor/releases) 下载对应平台的安装包。

```bash
# 开发环境
npm run electron:dev

# 打包（自动识别平台）
npm run electron:build

# 指定平台打包
npm run electron:build:mac      # macOS
npm run electron:build:win      # Windows
npm run electron:build:linux    # Linux
```

---

## 声明

1. **使用目的**：本工具旨在辅助 Markdown 文档的编写与创作，不保证 AI 生成内容的准确性。用户应自行核对最终内容的正确性。

2. **AI 服务依赖**：AI 辅助功能依赖用户自行配置的 API Key 与服务端点。工具本身不提供 AI 模型，不对任何 AI 服务的可用性、准确性或内容安全性负责。

3. **API Key 安全责任**：AI 服务密钥（API Key）仅保存在本机——浏览器端存于 `localStorage`，服务端以 SHA-256 加盐哈希落盘（非加密，不可解密，仅用于存在性校验）。服务器 / 部署环境的运维安全、访问权限管控、防泄露防护工作由使用者全权负责，开发者不承担因服务器漏洞、配置不当导致的数据泄露责任。

4. **平台接口限制说明**：各大 AI 服务商存在 API 调用频次限制、安全策略动态更新机制，使用工具过程中若出现接口限流、账号受限等问题，请根据服务商官方规范自行调整使用方式。

5. **免责声明**：本工具按"现有状态"提供，不作任何形式的明示或默示保证，包括但不限于适销性、特定用途适用性和非侵权性的保证。在任何情况下，作者或版权持有人均不对因使用本工具而产生的任何索赔、损害或其他责任负责。

6. **开源许可**：本项目基于 MIT 许可证开源，详情见 [LICENSE](./LICENSE) 文件。

---

## License

[MIT](./LICENSE)

<p align="center">Powered by LightOS · Made for LCMD</p>
