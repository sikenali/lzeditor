# LZEditor — 懒猫编辑器

<p align="center">
  <strong>轻文档 · Markdown · AI 辅助写作 · 多端可用</strong>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Milkdown" src="https://img.shields.io/badge/Milkdown-7-6B4FBB">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-31-4790?logo=electron&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
</p>

## 软件说明

懒猫编辑器（LZEditor）是一款面向个人与小团队的轻文档 Markdown 编辑器，提供所见即所得编辑、源码编辑、AI 辅助写作、大纲与即时预览、历史版本和多格式导出。文档与配置保存在本机浏览器，不依赖业务服务端；同时支持 LPK 云部署与 Electron 桌面客户端。

**核心功能**

| 功能 | 说明 |
|------|------|
| Markdown 编辑 | 所见即所得区块编辑 + CodeMirror 源码模式，支持标题、列表、表格、代码块、公式、图表与图片 |
| AI 辅助写作 | 摘要、续写、润色、翻译，支持 OpenAI / Anthropic 两种协议与多家服务商自定义端点 |
| 文档管理 | 新建、切换、导入、文档库与最近打开记录，数据保存在本机浏览器 |
| 大纲与预览 | 标题大纲导航、层级过滤、即时预览、排版预览与样式切换 |
| 历史版本 | 保存编辑历史并支持回退到任意版本 |
| 导出格式 | Markdown、HTML、PDF、DOCX、EPUB、XLSX、PNG、SVG |
| 主题外观 | 浅色 / 深色主题、强调色、导航布局、字体与排版参数调节 |
| 桌面客户端 | Electron 打包，支持 Windows（便携版）/ macOS / Linux，离线可用 |
| LPK 云部署 | 懒猫云一键部署，公网访问，数据持久化到 `/lzcapp/var/data` |
| 隐私 | 文档与 API Key 仅保存在本机，密钥不经过任何中转服务 |

## 部署说明

### LPK 部署

```bash
cd lzc && bash package.sh        # 本地打包生成 .lpk
lzc-cli lpk install cloud.lazycat.app.lzeditor-v<版本>.lpk
```

访问应用：`https://<子域名>.<域名>`

### Electron 桌面版

从 [GitHub Releases](https://github.com/sikenali/lzeditor/releases) 下载对应平台的发布包。Windows 版本为单文件便携版，双击即可运行，无需安装。

```bash
npm install
npm run electron:dev             # 开发调试
npm run electron:build           # 打包当前平台
```

## 软件声明

### 重要声明

1. **无官方隶属关系**
   本工具与各 AI 服务商不存在官方合作、授权、从属关系；使用本工具调用模型服务，须遵守对应服务商的用户协议与计费规则。

2. **数据存储与安全责任**
   文档、设置与 API Key 均保存在本机浏览器 `localStorage`。设备安全、浏览器权限与备份工作由使用者自行负责，开发者不承担因设备失陷、浏览器配置不当导致的数据丢失或泄露责任。

3. **AI 服务依赖**
   AI 辅助功能依赖用户自行配置的 API Key 与服务端点。工具本身不提供模型，不对生成内容的准确性、服务可用性负责。

4. **平台接口限制说明**
   各 AI 服务商存在调用频次限制与安全策略调整，若出现限流、鉴权失败等情况，请按服务商官方规范自行调整。

### 责任划分

- 因违规使用、服务器或设备防护不足、人为误操作造成的账号受限、数据丢失、隐私泄露、经济损失等，由**终端使用者自行承担**。
- 工具开发者不对运行稳定性、持续性、适配性作保证，对使用本工具产生的一切直接或间接损失不承担赔偿责任。

### 商标声明

**懒猫微服™** 为企业注册商标，**懒猫编辑器™** 属于未注册商标，两者之间没有关联关系。本开源项目仅用于个人学习与交流，非懒猫微服官方发布的编辑器应用。

## License

[MIT](./LICENSE)

<p align="center">Powered by LightOS · Made for LCMD</p>
