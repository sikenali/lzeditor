# LZEditor — 懒猫编辑器

<p align="center">
  <strong>轻文档 · Markdown · AI 辅助写作 · 多端同步</strong>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-Embedded-003B57?logo=sqlite&logoColor=white">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-31-4790?logo=electron&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
  <img alt="Platform" src="https://img.shields.io/badge/Platform-Win%20|%20Mac%20|%20Linux-lightgrey">
</p>

---

## 项目介绍

**懒猫编辑器（LZEditor）**是一款面向个人与团队场景的轻文档 Markdown 编辑器，支持 AI 辅助写作、多文档管理、本地持久化存储与跨平台桌面客户端。前端基于 React + Vite + TipTap，后端采用 Express + SQLite，同时支持 LPK 云部署与 Electron 桌面应用，提供流畅的写作体验与智能 AI 能力。

### 核心功能

| 功能 | 说明 |
|------|------|
| **Markdown 编辑** | TipTap 富文本编辑器，支持 Markdown 语法、实时预览、分屏模式 |
| **AI 辅助写作** | 支持 Anthropic Claude / OpenAI / 自定义基座，摘要、续写、润色、翻译一键完成 |
| **多 Provider 支持** | Anthropic、OpenAI、Azure OpenAI、自定义兼容接口，模型自由切换 |
| **多文档管理** | 文档列表、新建/重命名/删除、快捷搜索、最近打开记录 |
| **历史版本** | 自动保存编辑历史，随时回退到任意版本，支持版本对比 |
| **导出格式** | 支持导出为 Markdown、HTML、PDF（通过 Electron）、纯文本 |
| **API Key 安全存储** | SQLite 加密存储 API Key，bcrypt 哈希，不上传至任何第三方 |
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
│   │   │   ├── FloatingToolbar.tsx  # 浮动工具栏
│   │   │   ├── Math.tsx          # KaTeX 公式渲染
│   │   │   ├── Graphviz.tsx      # Graphviz 可视化
│   │   │   ├── PlantUML.tsx      # PlantUML 图表
│   │   │   ├── ECharts.tsx       # ECharts 图表
│   │   │   └── DrawIOEditor.tsx  # Draw.io 集成
│   │   │
│   │   ├── layout/               # 布局组件
│   │   │   ├── Toolbar.tsx       # 顶部工具栏
│   │   │   ├── DocumentMetaBar.tsx  # 文档元信息栏
│   │   │   └── StatusBar.tsx     # 底部状态栏
│   │   │
│   │   ├── panels/               # 面板组件
│   │   │   ├── SettingsDialog.tsx   # 设置面板
│   │   │   ├── ExportDialog.tsx     # 导出面板
│   │   │   ├── HistoryPanel.tsx     # 历史版本面板
│   │   │   ├── LibraryPanel.tsx     # 文档库面板
│   │   │   ├── FilePanel.tsx        # 文件面板
│   │   │   ├── PreviewPanel.tsx     # 预览面板
│   │   │   └── ReadMode.tsx         # 阅读模式
│   │   │
│   │   └── sidebar/              # 侧边栏
│   │       ├── SidebarOutline.tsx  # 大纲导航
│   │       └── SidebarPreview.tsx  # 缩略图预览
│   │
│   ├── hooks/
│   │   ├── useTheme.ts           # 主题切换 (浅/深)
│   │   ├── useAI.ts              # AI 调用封装
│   │   ├── useFloatingToolbar.ts # 浮动工具栏位置
│   │   └── useDocumentSelection.ts  # 文档选中逻辑
│   │
│   ├── services/
│   │   ├── aiProvider.ts         # AI Provider 统一接口
│   │   ├── exportService.ts      # 导出服务 (MD/HTML/PDF)
│   │   ├── epubGenerator.ts      # EPUB 生成
│   │   ├── htmlToMd.ts           # HTML → Markdown 转换
│   │   └── promptTemplate.ts     # Prompt 模板管理
│   │
│   ├── store/
│   │   ├── editorStore.ts        # 编辑器 Zustand Store
│   │   ├── settingsStore.ts      # 设置 Zustand Store
│   │   └── aiStore.ts           # AI 状态 Store
│   │
│   ├── shared/
│   │   ├── types.ts              # 公共类型定义
│   │   └── languages.ts          # 多语言配置
│   │
│   ├── styles/                   # CSS 样式
│   │   ├── globals.css
│   │   ├── layout.css
│   │   ├── app.css
│   │   ├── panels.css
│   │   ├── settings-dialog.css
│   │   └── read-mode.css
│   │
│   └── content/
│       └── welcome.md            # 欢迎页模板
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
│  │  IPC: secrets:set/get/delete (AI API Key 内存存储)          │  │
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
│  │  LZEditor · AIPanel · FloatingToolbar · Math · Graphviz    │  │
│  │  PlantUML · ECharts · DrawIOEditor                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Hooks (组合式逻辑层)                            │  │
│  │  useTheme · useAI · useFloatingToolbar · useDocumentSelect  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Services (服务层)                               │  │
│  │  aiProvider · exportService · epubGenerator · htmlToMd      │  │
│  │  promptTemplate                                              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Zustand Stores (状态层)                         │  │
│  │  editorStore · settingsStore · aiStore                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│                    后端服务 (server/src/)                        │
│  Express + SQLite                                                │
│  - API 路由 (路由层)                                             │
│  - AI Provider 适配 (providers/)                                 │
│  - LPK 云部署兼容                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 实现原理

### TipTap 编辑器扩展体系

```
LZEditor (TipTap Core)
  ├── StarterKit (基础 Markdown 语法)
  ├── Table / Table-Cell / Table-Header    → 表格支持
  ├── Highlight                              → 高亮文本
  ├── TaskItem / TaskList                    → 待办事项
  ├── CodeBlockLowlight + highlight.js       → 代码块语法高亮
  └── 自定义扩展:
      ├── Math (KaTeX 公式渲染)
      ├── Graphviz (Mermaid/Graphviz 可视化)
      ├── PlantUML (UML 图)
      ├── ECharts (图表)
      └── DrawIO (流程图)
```

### AI 辅助写作流程

```
用户选中文本 / 输入 Prompt
  → useAI hook
  → aiProvider 统一接口
  → Anthropic Claude / OpenAI / Azure OpenAI / 自定义基座
  → 流式响应 (SSE)
  → AIPanel 实时展示结果
  → 一键插入 / 替换 / 续写
```

### 多 Provider 适配

| Provider | 客户端 SDK | 兼容模式 |
|----------|-----------|---------|
| Anthropic Claude | `@anthropic-ai/sdk` | 原生 |
| OpenAI | `openai` | 原生 |
| Azure OpenAI | `openai` | endpoint + api-key |
| 自定义基座 | `openai` 兼容 | baseURL + apiKey |

### 文档持久化

- **桌面端**: SQLite 本地数据库，文档存储在 `~/AppData/Roaming/lzeditor/` 或 `~/.config/lzeditor/`
- **云部署 (LPK)**: SQLite 持久化到 `/lzcapp/var/data`
- **API Key**: bcrypt 哈希后存入 SQLite，内存中临时解密供 IPC 使用

### 导出链路

| 格式 | 实现 |
|------|------|
| **Markdown** | 原生 TipTap JSON → text |
| **HTML** | TipTap JSON → DOM → htmlToMd 反向 |
| **PDF** | Electron shell.openExternal → 系统打印 |
| **EPUB** | epubGenerator.ts (ZIP + XHTML) |

---

## 部署说明

### LPK 部署

```bash
cd lzc && bash package.sh        # 本地打包生成 .lpk
lzc-cli lpk install cloud.lazycat.app.lazycateditor-<版本>.lpk
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

### Docker 部署（自托管）

```bash
docker build -t lzeditor .
docker run -d -p 3001:3001 -v $(pwd)/data:/app/data lzeditor
```

---

## 声明

1. **使用目的**：本工具旨在辅助 Markdown 文档的编写与创作，不保证 AI 生成内容的准确性。用户应自行核对最终内容的正确性。

2. **AI 服务依赖**：AI 辅助功能依赖用户自行配置的 API Key 与服务端点。工具本身不提供 AI 模型，不对任何 AI 服务的可用性、准确性或内容安全性负责。

3. **API Key 安全责任**：AI 服务密钥（API Key）仅保存在本地 SQLite 数据库中，采用 bcrypt 哈希存储。服务器 / 部署环境的运维安全、访问权限管控、防泄露防护工作由使用者全权负责，开发者不承担因服务器漏洞、配置不当导致的数据泄露责任。

4. **平台接口限制说明**：各大 AI 服务商存在 API 调用频次限制、安全策略动态更新机制，使用工具过程中若出现接口限流、账号受限等问题，请根据服务商官方规范自行调整使用方式。

5. **免责声明**：本工具按"现有状态"提供，不作任何形式的明示或默示保证，包括但不限于适销性、特定用途适用性和非侵权性的保证。在任何情况下，作者或版权持有人均不对因使用本工具而产生的任何索赔、损害或其他责任负责。

6. **开源许可**：本项目基于 MIT 许可证开源，详情见 [LICENSE](./LICENSE) 文件。

---

## License

[MIT](./LICENSE)

<p align="center">Powered by LightOS · Made for LCMD</p>
