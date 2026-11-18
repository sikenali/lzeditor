import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
const { useAIStore } = await import('../src/store/aiStore.ts')
const { AI_MODES } = await import('../src/shared/aiModes.ts')

// 每个用例从 store 的初始状态出发，避免用例间的状态串扰。
const initialState = useAIStore.getState()
beforeEach(() => {
  useAIStore.setState(initialState, true)
})

test('addMessage/updateMessage/appendStreamToMessage 变更 messages', () => {
  const s = useAIStore.getState()
  s.addMessage({ id: 'a1', role: 'assistant', content: '', mode: 'write', status: 'streaming' })
  s.appendStreamToMessage('a1', 'Hello')
  s.appendStreamToMessage('a1', ' world')
  s.updateMessage('a1', { status: 'done' })
  const m = useAIStore.getState().messages.find(x => x.id === 'a1')
  assert.equal(m.content, 'Hello world')
  assert.equal(m.status, 'done')
})

test('messages 初始为空且 mode 初始为 write', () => {
  const st = useAIStore.getState()
  assert.deepEqual(st.messages, [])
  assert.equal(st.mode, 'write')
})

test('setMode / setSelectedText', () => {
  const s = useAIStore.getState()
  s.setMode('create'); s.setSelectedText('sel')
  const st = useAIStore.getState()
  assert.equal(st.mode, 'create'); assert.equal(st.panelSelectedText, 'sel')
})

test('AI_MODES 含 4 模式与默认动作', () => {
  assert.deepEqual(Object.keys(AI_MODES).sort(), ['create','research','review','write'])
  assert.equal(AI_MODES.write.defaultAction, 'rewrite')
})

test('showPanel(mode) 保留 messages，重置输入/状态', () => {
  const s = useAIStore.getState()
  s.addMessage({ id: 'm1', role: 'user', content: 'hi', mode: 'write' })
  s.setPanelInput('草稿')

  s.showPanel('create', 'sel', { x: 1, y: 2 })
  const st = useAIStore.getState()
  assert.equal(st.panelVisible, true)
  assert.equal(st.mode, 'create')
  assert.equal(st.panelSelectedText, 'sel')
  assert.deepEqual(st.panelPosition, { x: 1, y: 2 })
  assert.equal(st.messages.length, 1, '重新打开面板不能清空对话')
  assert.equal(st.panelInput, '', '重新打开面板要清空输入')
  assert.equal(st.panelStatus, 'idle')
})
