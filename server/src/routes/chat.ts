import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const router = Router()

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

router.post('/', async (req: any, res: any) => {
  const { messages, provider, model, temperature = 0.7, maxTokens = 1024, customBaseUrl } = req.body

  if (!messages || !provider || !model) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const apiKey = process.env['AI_KEY_' + provider.toUpperCase()] || ''

  if (!apiKey) {
    return res.status(401).json({ error: 'API key not configured for ' + provider })
  }

  const isStream = req.headers['x-stream'] === 'true'

  try {
    if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey })
      const resp = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages.filter((m: ChatMessage) => m.role !== 'system'),
        system: messages.find((m: ChatMessage) => m.role === 'system')?.content,
        stream: isStream,
      })

      if (isStream && 'stream' in resp) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        for await (const chunk of resp) {
          if (chunk.type === 'content_block_delta') {
            res.write('data: ' + JSON.stringify({ text: chunk.delta?.text || '' }) + '\n\n')
          }
        }
        res.end()
      } else {
        const text = ('content' in resp)
          ? resp.content[0]?.type === 'text' ? (resp.content[0] as any).text : ''
          : ''
        res.json({ text })
      }
    } else {
      const baseUrl = provider === 'qwen'
        ? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        : (customBaseUrl || 'https://api.openai.com/v1')

      const openai = new OpenAI({ apiKey, baseURL: baseUrl })
      const stream = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      })

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) {
          res.write('data: ' + JSON.stringify({ text }) + '\n\n')
        }
      }
      res.end()
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

export const chatRouter = router
