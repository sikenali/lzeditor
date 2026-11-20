import assert from 'node:assert/strict'
import { apiRoot, resolveApiUrl } from '../src/utils/apiUrl.ts'

// 版本段不能被改写：/v2、/v4、/v1beta/openai 都保持原样再拼接口。
assert.equal(
  resolveApiUrl('https://qianfan.baidubce.com/v2', 'chat/completions'),
  'https://qianfan.baidubce.com/v2/chat/completions',
)
assert.equal(
  resolveApiUrl('https://open.bigmodel.cn/api/paas/v4', 'chat/completions'),
  'https://open.bigmodel.cn/api/paas/v4/chat/completions',
)
assert.equal(
  resolveApiUrl('https://generativelanguage.googleapis.com/v1beta/openai', 'chat/completions'),
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
)
assert.equal(
  resolveApiUrl('https://api.openai.com/v1', 'chat/completions'),
  'https://api.openai.com/v1/chat/completions',
)
assert.equal(
  resolveApiUrl('https://api.deepseek.com', 'chat/completions'),
  'https://api.deepseek.com/chat/completions',
)

// 已写完整接口地址时不再重复拼接；测试连接要换接口也能正确还原根。
assert.equal(
  resolveApiUrl('https://api.openai.com/v1/chat/completions', 'chat/completions'),
  'https://api.openai.com/v1/chat/completions',
)
assert.equal(
  resolveApiUrl('https://api.openai.com/v1/chat/completions', 'models'),
  'https://api.openai.com/v1/models',
)
assert.equal(
  resolveApiUrl('https://api.anthropic.com/v1/messages', 'messages'),
  'https://api.anthropic.com/v1/messages',
)
assert.equal(apiRoot('https://api.example.com/v1/'), 'https://api.example.com/v1')

console.log('api url resolution ok')
