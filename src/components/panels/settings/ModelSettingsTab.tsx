import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../../../store/settingsStore'
import type { ApiKeyEntry } from '../../../shared/types'
import { UiSelect, UiSelectCard, UiInput, UiButton, UiTip, UiModal, UiSwitch } from '../../ui'
import { toast } from '../../../utils/toast'

/* ── 内置服务商模型（bid-typesetting ModelSettingsView.vue providerModelsMap） ── */
const PROVIDER_MODELS: Record<string, string[]> = {
  '阿里云': ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long', 'qwen3-max', 'qwen3-plus', 'qwen-vl-max'],
  '百度': ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-speed-128k', 'bloomz-7b'],
  '智谱': ['glm-4.5', 'glm-4.6', 'glm-4-plus', 'glm-4-air', 'glm-4-flash', 'glm-4-long'],
  'DeepSeek': ['deepseek-chat', 'deepseek-reasoner'],
  'Moonshot': ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-k2-0711-preview', 'kimi-latest'],
  '零一万物': ['yi-large', 'yi-large-turbo', 'yi-medium', 'yi-light'],
  'OpenAI': ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini', 'o3'],
  'Anthropic': ['claude-sonnet-4-5-20250929', 'claude-opus-4-1-20250805', 'claude-haiku-4-5', 'claude-3-5-haiku-20241022'],
  'Google': ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  'Mistral': ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
  'Groq': ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b'],
}

/* 服务商 → 端点 / 协议。密钥落库时写入 key.endpoint、key.format，
   useAI.ts 依赖这两个字段发请求，表单上不呈现（bid 侧由后端解析，此处本地化补齐）。
   端点必须是 OpenAI 兼容的 chat/completions 地址，否则用AI.ts 里的 fetch 打不通。 */
const PROVIDER_ENDPOINTS: Record<string, { endpoint: string; format: 'openai' | 'anthropic' }> = {
  '阿里云': { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', format: 'openai' },
  // 百度千帆的 OpenAI 兼容口在 qianfan.baidubce.com/v2；aip.baidubce.com 是旧版自定义平台
  '百度': { endpoint: 'https://qianfan.baidubce.com/v2', format: 'openai' },
  '智谱': { endpoint: 'https://open.bigmodel.cn/api/paas/v4', format: 'openai' },
  'DeepSeek': { endpoint: 'https://api.deepseek.com', format: 'openai' },
  'Moonshot': { endpoint: 'https://api.moonshot.cn/v1', format: 'openai' },
  '零一万物': { endpoint: 'https://api.lingyiwanwu.com/v1', format: 'openai' },
  'OpenAI': { endpoint: 'https://api.openai.com/v1', format: 'openai' },
  'Anthropic': { endpoint: 'https://api.anthropic.com/v1', format: 'anthropic' },
  // v1beta/openai 才是 Google 的 OpenAI 兼容前缀，纯 /v1beta 是 Gemini 原生协议
  'Google': { endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', format: 'openai' },
  'Mistral': { endpoint: 'https://api.mistral.ai/v1', format: 'openai' },
  'Groq': { endpoint: 'https://api.groq.com/openai/v1', format: 'openai' },
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

const TEMPERATURES = [
  { value: '0', label: '0（结果确定）' },
  { value: '0.2', label: '0.2' },
  { value: '0.4', label: '0.4' },
  { value: '0.7', label: '0.7（默认）' },
  { value: '1.0', label: '1.0' },
  { value: '1.2', label: '1.2（更随机）' },
]

const MAX_TOKENS = [
  { value: '256', label: '256' },
  { value: '512', label: '512' },
  { value: '1024', label: '1024（默认）' },
  { value: '2048', label: '2048' },
  { value: '4096', label: '4096' },
  { value: '8192', label: '8192' },
]

/* 密钥只存本地且列表始终可见，必须打码 —— bid 直接渲染 k.api_key 原文，这里收敛 */
function maskKey(key: string): string {
  if (!key) return '••••'
  if (key.length < 10) return '••••'
  return `${key.slice(0, 6)}…${key.slice(-4)}`
}

type ConfigTab = 'provider' | 'custom'

export const ModelSettingsTab: React.FC = () => {
  const s = useSettingsStore()
  const u = s.updateSetting
  const apiKeys: ApiKeyEntry[] = s.apiKeys || []

  const [configTab, setConfigTab] = useState<ConfigTab>('provider')
  const [keyInput, setKeyInput] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)

  const [customApiFormat, setCustomApiFormat] = useState<'openai' | 'anthropic'>('openai')
  const [customEndpoint, setCustomEndpoint] = useState('')
  const [customModelId, setCustomModelId] = useState('')

  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModelName, setSelectedModelName] = useState('')

  // 正在编辑的密钥 id（空表示新增）
  const [editingId, setEditingId] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  const [testingKey, setTestingKey] = useState<string | null>(null)
  const [testSuccess, setTestSuccess] = useState<Record<string, boolean>>({})
  const [testFailed, setTestFailed] = useState<Record<string, boolean>>({})
  const [testError, setTestError] = useState<Record<string, string>>({})

  const currentModels = (selectedProvider ? (PROVIDER_MODELS[selectedProvider] || []) : [])
    .map(m => ({ value: m, label: m }))

  // 表单草稿同步写回 store：关掉设置面板再打开还能看到上次选的服务商 / 模型 / 自定义地址，
  // 也保证 useAI.ts 读到的 selectedProvider / selectedModelName 与界面一致
  const setProvider = (v: string) => { setSelectedProvider(v); u('selectedProvider', v) }
  const setModel = (v: string) => { setSelectedModelName(v); u('selectedModelName', v) }
  const setCustomFormat = (v: 'openai' | 'anthropic') => { setCustomApiFormat(v); u('customApiFormat', v) }
  const setEndpointDraft = (v: string) => { setCustomEndpoint(v); u('customEndpoint', v) }
  const setModelDraft = (v: string) => { setCustomModelId(v); u('customModelId', v) }

  useEffect(() => {
    // 每次打开设置面板都从 store 还原草稿，不能只在首次挂载时读一次
    setCustomApiFormat(s.customApiFormat === 'anthropic' ? 'anthropic' : 'openai')
    setCustomEndpoint(s.customEndpoint || '')
    setCustomModelId(s.customModelId || '')
    setSelectedProvider(s.selectedProvider || '')
    setSelectedModelName(s.selectedModelName || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = () => {
    setKeyInput('')
    setKeyVisible(false)
    setProvider('')
    setModel('')
    setEndpointDraft('')
    setModelDraft('')
    setEditingId('')
  }

  const persistKeys = (next: ApiKeyEntry[], selectId?: string) => {
    u('apiKeys', next)
    if (selectId) s.setSelectedModelId(selectId)
  }

  const handleSave = () => {
    const key = keyInput.trim()
    if (configTab === 'custom') {
      if (!customEndpoint.trim() || !customModelId.trim()) {
        toast('请填写自定义地址和模型 ID')
        return
      }
      if (!editingId && !key) { toast('请输入 API Key'); return }
      const provider = customApiFormat === 'anthropic' ? 'Anthropic (自定义)' : 'OpenAI (自定义)'
      const payload = { provider, model: customModelId.trim(), modelName: customModelId.trim() }
      if (editingId) {
        const next = apiKeys.map(k => k.id === editingId
          ? { ...k, ...payload, key: key || k.key, endpoint: customEndpoint.trim(), format: customApiFormat }
          : k)
        persistKeys(next)
        toast('自定义配置已更新')
      } else {
        const entry: ApiKeyEntry = {
          id: `custom-${Date.now()}`, ...payload, key, enabled: true,
          endpoint: customEndpoint.trim(), format: customApiFormat,
        }
        persistKeys([...apiKeys, entry], entry.id)
        toast('自定义配置已保存')
      }
      resetForm()
      return
    }

    if (!selectedProvider || !selectedModelName) {
      toast('请选择服务商和模型')
      return
    }
    if (!editingId && !key) { toast('请输入 API Key'); return }
    const endpoint = PROVIDER_ENDPOINTS[selectedProvider]
    const format: 'openai' | 'anthropic' = endpoint?.format ?? 'openai'
    const payload = {
      provider: selectedProvider, model: selectedModelName,
      modelName: `${selectedProvider} · ${selectedModelName}`,
    }
    if (editingId) {
      const next = apiKeys.map(k => k.id === editingId
        ? { ...k, ...payload, key: key || k.key, endpoint: endpoint?.endpoint, format }
        : k)
      persistKeys(next)
      toast(`「${selectedProvider}」配置已更新`)
    } else {
      const entry: ApiKeyEntry = {
        id: `preset-${Date.now()}`, ...payload, key, enabled: true,
        endpoint: endpoint?.endpoint, format,
      }
      persistKeys([...apiKeys, entry], entry.id)
      toast(`「${selectedProvider}」API Key 已保存`)
    }
    resetForm()
  }

  const openDelete = (id: string) => {
    setDeletingId(id)
    setShowDeleteDialog(true)
  }

  const confirmDelete = () => {
    if (!deletingId) return
    s.removeApiKey(deletingId)
    toast('已删除')
    if (editingId === deletingId) resetForm()
    setShowDeleteDialog(false)
    setDeletingId('')
  }

  // 连通性测试：OpenAI 兼容口有 GET /v1/models，Anthropic 没有这个端点，
  // 只能发一个 max_tokens:1 的真实请求探活。
  const handleTest = async (key: ApiKeyEntry) => {
    setTestingKey(key.id)
    setTestSuccess(p => ({ ...p, [key.id]: false }))
    setTestFailed(p => ({ ...p, [key.id]: false }))
    setTestError(p => ({ ...p, [key.id]: '' }))
    try {
      const base = (key.endpoint || 'https://api.openai.com/v1').replace(/\/v1$/, '').replace(/\/$/, '')
      let resp: Response
      if (key.format === 'anthropic') {
        const body = JSON.stringify({
          model: key.model, max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        })
        resp = await fetch(`${base}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key.key,
            'anthropic-version': '2023-06-01',
          },
          body,
        })
      } else {
        resp = await fetch(`${base}/v1/models`, {
          headers: { 'Authorization': `Bearer ${key.key}` },
        })
      }
      if (resp.ok) {
        setTestSuccess(p => ({ ...p, [key.id]: true }))
      } else {
        setTestFailed(p => ({ ...p, [key.id]: true }))
        let detail = ''
        try { detail = (await resp.text()).slice(0, 160) } catch { /* 忽略 */ }
        setTestError(p => ({ ...p, [key.id]: `服务返回 HTTP ${resp.status}${detail ? ' ' + detail : ''}` }))
      }
    } catch {
      setTestFailed(p => ({ ...p, [key.id]: true }))
      setTestError(p => ({ ...p, [key.id]: '网络错误：端点不可达或被跨域策略拦截' }))
    } finally {
      setTestingKey(null)
    }
  }

  const startEdit = (key: ApiKeyEntry) => {
    setEditingId(key.id)
    if (key.endpoint) {
      setConfigTab('custom')
      setCustomApiFormat(key.format || 'openai')
      setCustomEndpoint(key.endpoint)
      setCustomModelId(key.model)
    } else {
      setConfigTab('provider')
      setSelectedProvider(key.provider)
      setSelectedModelName(key.model)
    }
    setKeyInput('')
  }

  const testErrorMsg = Object.values(testError).find(v => v)

  return (
    <div className="model-view">
      {/* 页面头部卡片（modal 内已按 bid 隐藏，保留 JSX 供回退） */}
      <div className="page-header-card">
        <div className="page-header-content">
          <div className="page-header-info">
            <div className="page-breadcrumb">
              <span>首页</span>
              <span className="sep">/</span>
              <span>设置中心</span>
              <span className="sep">/</span>
              <span className="current">模型管理</span>
            </div>
            <div className="page-header-title">
              <h1>模型管理</h1>
              <p>配置 AI 大模型服务商与 API Key 连接</p>
            </div>
          </div>
          <button type="button" className="page-reset-button" onClick={resetForm}>
            <span className="remix ri-restart-line"></span>
            清空表单
          </button>
        </div>
      </div>

      {/* 配置面板 */}
      <div className="settings-section model-card">
        <div className="settings-section-title"><span>API Key</span></div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, padding: '0 14px 12px' }}>
          密钥只保存在本机浏览器；AI 请求由前端直连服务商，不经过任何中转服务。
        </div>

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
                  onChange={v => { setProvider(v); setModel('') }}
                  options={PROVIDER_OPTIONS}
                  placeholder="请选择服务商"
                />
              </div>
              <div className="form-field">
                <label className="form-label">模型</label>
                <UiSelect
                  value={selectedModelName}
                  onChange={setModel}
                  options={currentModels}
                  placeholder="请选择模型"
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-field">
                <label className="form-label">API格式</label>
                <UiSelect
                  value={customApiFormat}
                  onChange={v => setCustomFormat(v as 'openai' | 'anthropic')}
                  options={FORMAT_OPTIONS}
                />
              </div>
              <div className="form-field">
                <label className="form-label">自定义地址</label>
                <UiInput
                  value={customEndpoint}
                  onChange={setEndpointDraft}
                  placeholder="https://api.example.com/v1"
                  clearable
                />
              </div>
              <div className="form-field">
                <label className="form-label">模型ID</label>
                <UiInput
                  value={customModelId}
                  onChange={setModelDraft}
                  placeholder="例如: gpt-4o"
                  clearable
                />
              </div>
            </>
          )}

          <div className="form-field">
            <label className="form-label">API Key</label>
            <div className="form-input-row">
              <UiInput
                value={keyInput}
                onChange={setKeyInput}
                type={keyVisible ? 'text' : 'password'}
                placeholder={editingId ? '留空则保留原密钥，输入则更换' : 'sk-...'}
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
            {editingId ? '更新配置' : '保存配置'}
          </button>
        </div>

        {apiKeys.length > 0 && (
          <div className="saved-keys">
            <span className="saved-keys-title">已保存的密钥</span>
            {apiKeys.map(key => (
              <div
                key={key.id}
                className={`saved-key-item${s.selectedModelId === key.id ? ' active' : ''}`}
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
                    disabled={testingKey === key.id}
                  >
                    {testingKey === key.id
                      ? <span className="remix spinning ri-loader-4-line"></span>
                      : testSuccess[key.id]
                        ? (<><span className="remix success ri-check-line"></span><span>连通性正常</span></>)
                        : testFailed[key.id]
                          ? (<><span className="remix failed ri-close-circle-line"></span><span>失败</span></>)
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
                  <span
                    className="saved-key-switch"
                    onClick={e => e.stopPropagation()}
                  >
                    <UiSwitch size="sm" checked={key.enabled} onChange={() => s.toggleApiKey(key.id)} />
                  </span>
                </div>
              </div>
            ))}
            {testErrorMsg && <div className="test-error-msg">{testErrorMsg}</div>}
          </div>
        )}
      </div>

      {/* 生成参数：useAI.ts 会随每次请求带上，之前只有默认值没有入口 */}
      <div className="settings-section model-card">
        <div className="settings-section-title"><span>生成参数</span></div>
        <div className="config-form">
          <div className="form-field">
            <label className="form-label">Temperature</label>
            <UiSelect
              value={String(s.temperature)}
              onChange={v => u('temperature', Number(v))}
              options={TEMPERATURES}
            />
          </div>
          <div className="form-field">
            <label className="form-label">最大输出 Token</label>
            <UiSelect
              value={String(s.maxTokens)}
              onChange={v => u('maxTokens', Number(v))}
              options={MAX_TOKENS}
            />
          </div>
        </div>
      </div>

      {/* 删除密钥确认弹窗 */}
      <UiModal
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="删除密钥"
        subtitle="删除后使用该密钥的抽取将不可用"
        icon="ri-delete-bin-line"
        width={480}
        footer={
          <div className="confirm-actions">
            <UiButton variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)}>取消</UiButton>
            <UiButton variant="primary" size="sm" onClick={confirmDelete}>确认删除</UiButton>
          </div>
        }
      >
        <p className="confirm-text">确定删除该 API 密钥配置？</p>
      </UiModal>
    </div>
  )
}
