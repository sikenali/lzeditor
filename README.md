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
</p>

## 软件说明

懒猫编辑器（LZEditor）是一款面向个人与团队场景的轻文档 Markdown 编辑器，支持 AI 辅助写作、多文档管理、本地持久化存储与跨平台桌面客户端。前端基于 React + Vite + TipTap，后端采用 Express + SQLite，同时支持 LPK 云部署与 Electron 桌面应用，提供流畅的写作体验与智能 AI 能力。

**核心功能**

| 功能 | 说明 |
|------|------|
| Markdown 编辑 | TipTap 富文本编辑器，支持 Markdown 语法、实时预览、分屏模式 |
| AI 辅助写作 | 支持 Anthropic Claude / OpenAI / 自定义基座，摘要、续写、润色、翻译一键完成 |
| 多 Provider 支持 | Anthropic、OpenAI、Azure OpenAI、自定义兼容接口，模型自由切换 |
| 多文档管理 | 文档列表、新建/重命名/删除、快捷搜索、最近打开记录 |
| 历史版本 | 自动保存编辑历史，随时回退到任意版本，支持版本对比 |
| 导出格式 | 支持导出为 Markdown、HTML、PDF（通过 Electron）、纯文本 |
| API Key 安全存储 | SQLite 加密存储 API Key，bcrypt 哈希，不上传至任何第三方 |
| 主题外观 | 浅色/深色主题，编辑区宽度调节，字体大小自定义 |
| 桌面客户端 | Electron 打包，支持 macOS / Windows / Linux，离线可用 |
| LPK 云部署 | 懒猫云一键部署，公网访问，数据持久化到 `/lzcapp/var/data` |

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

## 软件声明

### 重要声明

1. **无官方隶属关系**
   本工具与 Anthropic、OpenAI 及其他 AI 服务商不存在官方合作、授权、从属关系，使用本工具调用 AI 接口，必须严格遵守对应服务商用户协议、服务条款及风控规则。

2. **API Key 安全责任**
   AI 服务密钥（API Key）仅保存在本地 SQLite 数据库中，采用 bcrypt 哈希存储。服务器 / 部署环境的运维安全、访问权限管控、防泄露防护工作由使用者全权负责，开发者不承担因服务器漏洞、配置不当导致的数据泄露责任。

3. **平台接口限制说明**
   各大 AI 服务商存在 API 调用频次限制、安全策略动态更新机制，使用工具过程中若出现接口限流、账号受限等问题，请根据服务商官方规范自行调整使用方式。

### 责任划分

- 因违规使用工具、违背平台协议、服务器防护不足、人为误操作所造成的账号封禁、数据丢失、隐私泄露、经济损失、行政处罚及民事 / 刑事责任，全部由**终端使用者自行承担**。
- 工具开发者不对工具运行稳定性、持续性、适配性做保证，对于使用本工具产生的一切直接、间接损失与潜在风险，不承担任何赔偿、兜底及法律责任。

### 商标声明

**懒猫微服™** 为企业注册商标，**懒猫编辑器™** 属于未注册商标，两者之间没有关联关系。本开源项目仅用于个人学习与交流，非懒猫微服官方发布的编辑器应用。

## License

[MIT](./LICENSE)

<p align="center">Powered by LightOS · Made for LCMD</p>
