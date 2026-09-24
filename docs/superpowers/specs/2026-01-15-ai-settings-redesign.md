# AI 设置模块重写设计

## 目标
参考 bid-maker 项目的 API Key 管理功能，重写 LZEditor 的 AI 设置模块。

## 设计概述

### 1. 左侧导航调整
移除 "应用设置" 和 "同步备份"，简化为：
- 主题设置
- 编辑设置
- AI 设置（新增 2 个内部标签）
- 快捷键设置
- 关于

### 2. AI 设置内部结构

**顶部 2 个标签：**
- **模型制造商** - 选择预设服务商和模型
- **自定义配置** - 自定义 API 地址和格式

#### 模型制造商 tab
```
服务商: [阿里云 ▼]        ← 下拉选择
模型:   [qwen-max ▼]      ← 根据服务商动态加载
API Key: [sk-... 🔒]      ← 输入框 + 显示/隐藏
[添加密钥]
```

**内置服务商列表：**
| 服务商 | 默认端点 | 可用模型 |
|--------|----------|----------|
| 阿里云(通义千问) | dashscope.aliyuncs.com | qwen-max, qwen-plus, qwen-turbo |
| 百度(文心一言) | aip.baidubce.com | ernie-4.0, ernie-3.5 |
| 智谱(GLM) | open.bigmodel.cn | glm-4, glm-4-plus |
| DeepSeek | api.deepseek.com | deepseek-chat, deepseek-coder |
| Moonshot | api.moonshot.cn | kimi-k2.6, moonshot-v1-128k |
| OpenAI | api.openai.com | gpt-4o, gpt-4o-mini, gpt-4 |
| Anthropic | api.anthropic.com | claude-3-5-sonnet, claude-opus |
| Google | generativelanguage.googleapis.com | gemini-pro, gemini-1.5-pro |

#### 自定义配置 tab
```
API 格式: [OpenAI ▼]      ← OpenAI / Anthropic
自定义地址: [https://...]  ← 输入框
模型 ID:   [gpt-4]         ← 输入框
API Key:   [sk-... 🔒]     ← 输入框 + 显示/隐藏
[添加密钥]
```

### 3. 已保存密钥列表
每个密钥显示：
- 服务商/名称
- 模型 ID
- 端点（如有）
- 操作按钮：测试 | 编辑 | 删除 | 启用开关

### 4. 状态管理变更

**新增状态字段（settingsStore）：**
```typescript
configTab: 'provider' | 'custom'  // 当前标签
customApiFormat: 'openai' | 'anthropic'
customEndpoint: string
customModelId: string
selectedProvider: string
selectedModelName: string
```

**保留字段：**
```typescript
apiKeys: ApiKeyEntry[]
selectedModelId: string
```

### 5. 文件变更

| 文件 | 变更 |
|------|------|
| `src/components/panels/SettingsDialog.tsx` | 重写 AISettings 组件 |
| `src/store/settingsStore.ts` | 新增状态字段 |
| `src/shared/types.ts` | 更新 SettingsState 类型 |

## 实现步骤
1. 更新 types.ts 添加新字段
2. 更新 settingsStore.ts 添加状态和 actions
3. 重写 SettingsDialog.tsx 中的 AISettings 组件
4. 更新 NAV_ITEMS 移除 app/sync
5. 验证 TypeScript 编译
