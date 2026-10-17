import type { AIProviderDef, AIModel, ChatMessage, AIRequestOptions } from '../shared/types'

export const PROVIDERS: AIProviderDef[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    defaultModel: 'claude-3-5-sonnet-20241022',
    baseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', maxTokens: 8192, supportsStreaming: true },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', maxTokens: 4096, supportsStreaming: true },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', maxTokens: 4096, supportsStreaming: true },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    baseUrl: 'https://api.openai.com',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 4096, supportsStreaming: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 4096, supportsStreaming: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 4096, supportsStreaming: true },
    ],
  },
  {
    id: 'qwen',
    name: '通义千问',
    defaultModel: 'qwen-max',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    models: [
      { id: 'qwen-max', name: 'Qwen Max', maxTokens: 8192, supportsStreaming: true },
      { id: 'qwen-plus', name: 'Qwen Plus', maxTokens: 8192, supportsStreaming: true },
      { id: 'qwen-turbo', name: 'Qwen Turbo', maxTokens: 8192, supportsStreaming: true },
    ],
  },
]

export function getProvider(id: string): AIProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

export function formatAnthropicMessages(messages: ChatMessage[]) {
  const system = messages.find((m) => m.role === 'system')
  const conversation = messages.filter((m) => m.role !== 'system')
  return { system: system?.content, messages: conversation }
}

export function formatOpenAIMessages(messages: ChatMessage[]) {
  return messages
}
