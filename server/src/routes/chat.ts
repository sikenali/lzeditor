import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const router = Router()

/** 与前端约定：SSE 帧为 data:{"text":"..."}，结束时追加 [DONE]。 */
function writeSSE(res: any, text: string) {
  res.write('data: ' + JSON.stringify({ text }) + '\n\n')
}

function endSSE(res: any) {
  res.write('data: [DONE]\n\n')
  res.end()
}

function normalizeBaseUrl(raw?: string): string {
  return (raw || 'https://api.openai.com').replace(/\/+$/, '')
}

const routerEnvKey = (provider: string) => 'AI_KEY_' + provider.toUpperCase()

/** 解析请求中的 api key：body > settings > 环境变量。 */
function resolveApiKey(req: any, provider: string, settingId?: string): string {
  if (typeof req.body.apiKey === 'string' && req.body.apiKey) return req.body.apiKey
  const s = req.body.settings
  if (s?.apiKeys?.length) {
    const entry = s.apiKeys.find((k: any) => settingId && k.id === settingId)
      || s.apiKeys.find((k: any) => k.enabled && k.key)
    if (entry?.key) return entry.key
  }
  return process.env[routerEnvKey(provider)] || ''
}

async function runOpenAICompatible(
  res: any,
  opts: { apiKey: string; model: string; baseUrl: string; messages: any[]; temperature: number; maxTokens: number; isStream: boolean },
): Promise<void> {
  const openai = new OpenAI({ apiKey: opts.apiKey, baseURL: normalizeBaseUrl(opts.baseUrl) })
  const stream = await openai.chat.completions.create({
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    stream: opts.isStream,
  })
  if (!opts.isStream) {
    const text = (stream as any).choices?.[0]?.message?.content || ''
    res.json({ text })
    return
  }
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  for await (const chunk of stream as AsyncIterable<any>) {
    if (res.closed) break
    const text = chunk.choices?.[0]?.delta?.content || ''
    if (text) writeSSE(res, text)
  }
  endSSE(res)
}

async function runAnthropic(
  res: any,
  opts: { apiKey: string; model: string; baseUrl: string; messages: any[]; temperature: number; maxTokens: number; isStream: boolean },
): Promise<void> {
  const anthropic = new Anthropic({ apiKey: opts.apiKey, baseURL: normalizeBaseUrl(opts.baseUrl).replace(/\/v1$/, '') } as any)
  // SDK 的 create() 按 stream 参数做重载，传 `as any` 时会被解析成非流式
  // 的 Message 返回类型，后面 for await 遍历就会报类型错误 —— 这里显式放宽
  const resp: any = await anthropic.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    messages: opts.messages.filter((m: any) => m.role !== 'system'),
    system: opts.messages.find((m: any) => m.role === 'system')?.content,
    stream: opts.isStream,
  } as any)

  if (!opts.isStream) {
    const text = ('content' in resp)
      ? resp.content[0]?.type === 'text' ? (resp.content[0] as any).text : ''
      : ''
    res.json({ text })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  for await (const chunk of resp as AsyncIterable<any>) {
    if (res.closed) break
    if (chunk.type === 'content_block_delta') {
      const text = chunk.delta?.text || ''
      if (text) writeSSE(res, text)
    }
  }
  endSSE(res)
}

router.post('/', async (req: any, res: any) => {
  const {
    messages,
    provider,
    model,
    temperature = 0.7,
    maxTokens = 1024,
    stream = true,
    baseUrl,
    settings,
    settingId,
  } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' })
  }

  const resolvedProvider = provider || process.env.AI_PROVIDER || 'openai'
  const resolvedModel = model || process.env.AI_MODEL || 'gpt-4o'
  const apiKey = resolveApiKey(req, resolvedProvider, settingId)

  if (!apiKey) {
    return res.status(401).json({ error: `API key not configured for provider "${resolvedProvider}" (set ${routerEnvKey(resolvedProvider)} or pass apiKey)` })
  }

  try {
    if (resolvedProvider === 'anthropic') {
      await runAnthropic(res, { apiKey, model: resolvedModel, baseUrl: baseUrl || process.env.AI_BASE_URL || 'https://api.anthropic.com', messages, temperature, maxTokens, isStream: stream })
    } else {
      await runOpenAICompatible(res, { apiKey, model: resolvedModel, baseUrl: baseUrl || process.env.AI_BASE_URL || 'https://api.openai.com/v1', messages, temperature, maxTokens, isStream: stream })
    }
  } catch (err: any) {
    if (res.headersSent) return res.end()
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

export const chatRouter = router
