import React, { useState, useRef, useEffect } from 'react'
import { useSettingsStore } from '../../../store/settingsStore'
import type { ApiKeyEntry } from '../../../shared/types'
import { UiSelect, UiSwitch, UiInput, UiButton } from '../../ui'
import { toast } from '../../../utils/toast'

// 内置服务商配置
const PROVIDER_CONFIGS: Record<string, { endpoint: string; format: 'openai' | 'anthropic'; models: string[] }> = {
  '阿里云':    { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode', format: 'openai', models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'] },
  '百度':     { endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom', format: 'openai', models: ['ernie-4.0', 'ernie-3.5', 'ernie-speed'] },
  '智谱':     { endpoint: 'https://open.bigmodel.cn/api/paas/v4', format: 'openai', models: ['glm-4', 'glm-4-plus', 'glm-4-air', 'glm-4-flash'] },
  'DeepSeek': { endpoint: 'https://api.deepseek.com', format: 'openai', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  'Moonshot': { endpoint: 'https://api.moonshot.cn/v1', format: 'openai', models: ['kimi-k2.6', 'moonshot-v1-128k', 'moonshot-v1-32k'] },
  'OpenAI':   { endpoint: 'https://api.openai.com/v1', format: 'openai', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'] },
  'Anthropic':{ endpoint: 'https://api.anthropic.com/v1', format: 'anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
  'Google':   { endpoint: 'https://generativelanguage.googleapis.com/v1beta', format: 'openai', models: ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
}

const PROVIDER_NAMES = Object.keys(PROVIDER_CONFIGS)

export const ModelSettingsTab: React.FC<{ subTab: string }> = ({ subTab }) => {
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [customFormat, setCustomFormat] = useState<'openai' | 'anthropic'>('openai')
  const [customEndpoint, setCustomEndpoint] = useState('')
  const [customModelId, setCustomModelId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [testId, setTestId] = useState<string | null>(null)
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const testTimerRef2 = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (testTimerRef.current) clearTimeout(testTimerRef.current)
      if (testTimerRef2.current) clearTimeout(testTimerRef2.current)
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    }
  }, [])
  const [testResult, setTestResult] = useState<Record<string, 'success' | 'failed'>>({})

  const s = useSettingsStore(s => s)
  const u = useSettingsStore(s => s.updateSetting)
  const apiKeys: ApiKeyEntry[] = s.apiKeys || []
  const setSelectedModelId = useSettingsStore(s => s.setSelectedModelId)
  const toggleApiKey = useSettingsStore(s => s.toggleApiKey)
  const removeApiKey = useSettingsStore(s => s.removeApiKey)
  const addApiKey = useSettingsStore(s => s.addApiKey)

  useEffect(() => {
    if (s.customApiFormat) setCustomFormat(s.customApiFormat)
    if (s.customEndpoint) setCustomEndpoint(s.customEndpoint)
    if (s.customModelId) setCustomModelId(s.customModelId)
    if (s.selectedProvider) setSelectedProvider(s.selectedProvider)
    if (s.selectedModelName) setSelectedModel(s.selectedModelName)
  }, [])

  const currentModels = selectedProvider ? (PROVIDER_CONFIGS[selectedProvider]?.models || []) : []

  const handleAdd = () => {
    const key = apiKey.trim()
    if (!key) { toast('请输入 API Key'); return }
    if (subTab === 'add') {
      if (!selectedProvider || !selectedModel) { toast('请选择服务商和模型'); return }
      const cfg = PROVIDER_CONFIGS[selectedProvider]
      addApiKey({ id: `preset-${Date.now()}`, provider: selectedProvider, model: selectedModel,
        modelName: `${selectedProvider} · ${selectedModel}`, key, enabled: true,
        endpoint: cfg?.endpoint, format: cfg?.format || 'openai' })
    } else {
      if (!customModelId.trim()) { toast('请填写模型 ID'); return }
      addApiKey({ id: `custom-${Date.now()}`, provider: '自定义', model: customModelId.trim(),
        modelName: customModelId.trim(), key, enabled: true,
        endpoint: customEndpoint.trim() || undefined, format: customFormat })
    }
    setApiKey(''); setKeyVisible(false)
  }

  const handleTest = async (key: ApiKeyEntry) => {
    setTestId(key.id)
    try {
      const endpoint = key.endpoint || 'https://api.openai.com/v1'
      const url = `${endpoint.replace(/\/v1$/, '')}/models`
      const headers: Record<string, string> = key.format === 'anthropic'
        ? { 'Content-Type': 'application/json', 'x-api-key': key.key, 'anthropic-version': '2023-06-01' }
        : { 'Authorization': `Bearer ${key.key}` }
      const resp = await fetch(url, { method: 'GET', headers })
      setTestResult(prev => ({ ...prev, [key.id]: resp.ok ? 'success' : 'failed' }))
    } catch { setTestResult(prev => ({ ...prev, [key.id]: 'failed' })) }
    testTimerRef.current = setTimeout(() => setTestId(null), 2000)
    testTimerRef2.current = setTimeout(() => { setTestResult(prev => { const n = { ...prev }; delete n[key.id]; return n }) }, 4000)
  }

  const startEdit = (key: ApiKeyEntry) => {
    setEditId(key.id); setApiKey(key.key); setCustomModelId(key.model)
    setCustomEndpoint(key.endpoint || ''); setCustomFormat(key.format || 'openai')
    if (key.endpoint) { setSelectedProvider(''); setSelectedModel('') }
    else { setSelectedProvider(key.provider); setSelectedModel(key.model) }
  }
  const cancelEdit = () => { setEditId(null); setApiKey('') }
  const saveEdit = () => {
    if (!editId || !customModelId.trim() || !apiKey.trim()) return
    const updated = apiKeys.map(k => k.id === editId ? {
      ...k, key: apiKey, model: customModelId, modelName: customModelId,
      endpoint: customEndpoint || undefined, format: customFormat,
    } : k)
    u('apiKeys', updated); cancelEdit()
  }

  // 二次确认删除，避免误删
  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      removeApiKey(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
      deleteTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 2500)
    }
  }

  return (
    <>
      {/* 服务商/模型选择 */}
      {subTab === 'add' && (
        <div className="settings-section">
          <div className="settings-section-title"><span>预设服务商</span><span className="settings-section-desc">选择模型制造商并快速添加其 API Key</span></div>
          <div className="setting-row">
            <div className="setting-label"><span>服务商</span></div>
            <UiSelect value={selectedProvider} onChange={v => { setSelectedProvider(v); setSelectedModel('') }} options={PROVIDER_NAMES.map(p => ({ value: p, label: p }))} style={{ flex: 1, maxWidth: 300 }} />
          </div>
          {selectedProvider && (
            <div className="setting-row">
              <div className="setting-label"><span>模型</span></div>
              <UiSelect value={selectedModel} onChange={setSelectedModel} options={currentModels.map(m => ({ value: m, label: m }))} style={{ flex: 1, maxWidth: 300 }} />
            </div>
          )}
        </div>
      )}

      {/* 自定义配置 */}
      {subTab === 'keys' && (
        <div className="settings-section">
          <div className="settings-section-title"><span>自定义配置</span><span className="settings-section-desc">手动输入 API 地址和模型 ID</span></div>
          <div className="setting-row">
            <div className="setting-label"><span>API 格式</span></div>
            <div className="segmented-control" style={{ flex: 1, maxWidth: 200 }}>
              <button className={`segmented-btn${customFormat === 'openai' ? ' active' : ''}`} onClick={() => setCustomFormat('openai')}>OpenAI</button>
              <button className={`segmented-btn${customFormat === 'anthropic' ? ' active' : ''}`} onClick={() => setCustomFormat('anthropic')}>Anthropic</button>
            </div>
          </div>
          <div className="setting-row">
            <div className="setting-label"><span>自定义地址</span><span className="setting-hint">OpenAI 兼容格式</span></div>
            <UiInput type="text" value={customEndpoint} onChange={setCustomEndpoint} placeholder="https://api.example.com/v1" style={{ flex: 1, maxWidth: 400 }} />
          </div>
          <div className="setting-row">
            <div className="setting-label"><span>模型 ID</span></div>
            <UiInput type="text" value={customModelId} onChange={setCustomModelId} placeholder="如：gpt-4o、claude-3-5-sonnet" style={{ flex: 1, maxWidth: 300, fontFamily: 'var(--font-mono)' }} />
          </div>
        </div>
      )}

      {/* API Key 输入 */}
      <div className="settings-section">
        <div className="settings-section-title"><span>API Key</span><span className="settings-section-desc">本地存储，不上传服务器</span></div>
        <div className="setting-row">
          <div className="setting-label"><span><span className="remix ri-key-line"></span> API Key</span></div>
          <div style={{ display: 'flex', gap: 8, flex: 1, maxWidth: 400 }}>
            <UiInput type={keyVisible ? 'text' : 'password'} value={apiKey} onChange={setApiKey} placeholder="sk-..." style={{ flex: 1, fontFamily: 'var(--font-mono)' }} />
            <UiButton variant="ghost" size="sm" onClick={() => setKeyVisible(!keyVisible)} title={keyVisible ? '隐藏' : '显示'}>
              <span className={`remix ${keyVisible ? 'ri-eye-line' : 'ri-eye-off-line'}`}></span>
            </UiButton>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {editId ? (
            <><button className="settings-save-btn" onClick={saveEdit}><span className="remix ri-check-line"></span> 保存</button><button className="settings-cancel-btn" onClick={cancelEdit}>取消</button></>
          ) : (
            <button className="settings-save-btn" onClick={handleAdd}><span className="remix ri-key-fill"></span> 添加密钥</button>
          )}
        </div>
      </div>

      {/* 已保存密钥列表 */}
      {apiKeys.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title"><span>已保存的密钥</span><span className="settings-section-desc">共 {apiKeys.length} 个</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {apiKeys.map((key) => {
              const isActive = s.selectedModelId === key.id
              const ts = testResult[key.id]
              return (
                <div key={key.id} className={`api-key-item${isActive ? ' active' : ''}`} onClick={() => setSelectedModelId(key.id)} title="点击设为当前模型" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: isActive ? 'var(--accent-a10)' : 'var(--bg-code)', borderRadius: 10, border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>{key.modelName || key.model}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      <span>{key.provider}</span><span style={{ opacity: 0.5 }}> · </span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{key.model}</span>
                      {key.endpoint && <><span style={{ opacity: 0.5 }}> · </span><span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{key.endpoint}</span></>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button className="ai-key-test-btn" onClick={() => handleTest(key)} disabled={testId === key.id} title={ts === 'success' ? '连通成功' : ts === 'failed' ? '测试失败' : '测试连通性'}>
                      {testId === key.id ? <span className="remix ri-loader-4-line" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} />
                        : ts === 'success' ? <span className="remix ri-check-line" style={{ fontSize: 13, color: '#22c55e' }} />
                        : ts === 'failed' ? <span className="remix ri-close-line" style={{ fontSize: 13, color: '#ef4444' }} />
                        : <span className="remix ri-play-line" style={{ fontSize: 13 }} />}
                    </button>
                    <button className="ai-key-edit-btn" onClick={() => startEdit(key)} title="编辑"><span className="remix ri-edit-line"></span></button>
                    <button className="ai-key-delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(key.id) }} title={confirmDeleteId === key.id ? '再点一次确认删除' : '删除'}>{confirmDeleteId === key.id ? <span style={{ fontSize: 11 }}>确认?</span> : <span className="remix ri-delete-bin-line"></span>}</button>
                    <UiSwitch size="sm" checked={key.enabled} onChange={() => toggleApiKey(key.id)} />
                    {isActive && <span className="remix ri-checkbox-circle-fill" style={{ fontSize: 16, color: 'var(--accent-primary)' }} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
