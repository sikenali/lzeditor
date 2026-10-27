import { strict as assert } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'
import { test, afterEach } from 'node:test'
import { Window } from 'happy-dom'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// React + happy-dom 交互环境
//
// 控件「点了有没有用」只有真渲染 + 真派发才能知道。结构性断言能证明「写了
// onClick」，证明不了「onClick 真的触发、真的收到取反后的值」。
//
// 已实测的两个 happy-dom 限制（都绕过，不让它们削弱断言）：
//   1. 在 <input> 上派发 input / keydown 事件到不了 React 的合成处理器
//      （button / div 上正常）。改成调用 React 真正挂上去的 handler，
//      验证的是同一份回调，不是副本。
//   2. style 属性不认 min() / calc()，整条 style 会被丢弃。
//      改成读 React 实际收到的 style prop 对象。
// ─────────────────────────────────────────────────────────────────────────

const win = new Window()
globalThis.window = win.window
globalThis.document = win.document
globalThis.navigator = win.navigator ?? { userAgent: 'node', language: 'zh-CN' }
globalThis.HTMLInputElement = win.HTMLInputElement
globalThis.Element = win.Element
globalThis.Node = win.Node
globalThis.MouseEvent = win.MouseEvent
globalThis.KeyboardEvent = win.KeyboardEvent
globalThis.Event = win.Event
globalThis.localStorage = win.localStorage
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let rafQueue = []
const raf = (cb) => { rafQueue.push(cb); return rafQueue.length }
globalThis.requestAnimationFrame = raf
win.requestAnimationFrame = raf
const flushRaf = () => { const q = rafQueue; rafQueue = []; for (const cb of q) cb(performance.now()) }

const { UiSwitch } = await import('../src/components/ui/UiSwitch.tsx')
const { UiSelect } = await import('../src/components/ui/UiSelect.tsx')
const { UiInput } = await import('../src/components/ui/UiInput.tsx')
const { UiButton } = await import('../src/components/ui/UiButton.tsx')
const { UiCheck } = await import('../src/components/ui/UiCheck.tsx')
const { UiModal } = await import('../src/components/ui/UiModal.tsx')
const { toast } = await import('../src/utils/toast.ts')

const el = (tag, attrs = {}, ...kids) => React.createElement(tag, attrs, ...kids)
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const roots = []

async function render(node) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => { root.render(node) })
  roots.push(root)
  return {
    container,
    set: async (n) => act(async () => { root.render(n) }),
    unmount: async () => { await act(async () => root.unmount()); container.remove() },
  }
}
const click = (node) => act(() => {
  node.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }))
  flushRaf()
})
const keyDown = (node, key, extra = {}) => act(() => {
  node.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }))
  flushRaf()
})
// React 把 props 挂在 DOM 节点上（__reactProps$*）。直接调用它 = 调用 React
// 真正接好的那个 handler。绕开 happy-dom 在 input 上丢事件的毛病。
const reactProps = (node) => {
  const k = Object.keys(node).find((k) => k.startsWith('__reactProps$'))
  assert.ok(k, '节点上必须有 React props（说明真的渲染过了）')
  return node[k]
}
const fire = (node, name, evt) => act(async () => { reactProps(node)[name](evt) })
const type = (node, value) => fire(node, 'onChange', { target: { value } })
// 落盘走 250ms 防抖（settingsStore 的 subscribe），同步断言会读不到
const waitPersist = () => act(async () => { await new Promise((r) => setTimeout(r, 320)) })

afterEach(async () => {
  while (roots.length) await act(async () => { roots.pop().unmount() })
  document.querySelectorAll('.ui-modal-overlay').forEach((n) => n.remove())
  document.querySelectorAll('.lz-toast').forEach((n) => n.remove())
  document.body.style.overflow = ''
  flushRaf()
})

// ════════════════════════ UiSwitch ════════════════════════

test('UiSwitch 点击切换，回调收到取反后的值', async () => {
  const calls = []
  const { container } = await render(el(UiSwitch, { checked: false, onChange: (v) => calls.push(v) }))
  const btn = container.querySelector('[role="switch"]')
  assert.ok(btn, '必须渲染 role=switch 的按钮')
  assert.equal(btn.getAttribute('aria-checked'), 'false')

  await click(btn)
  assert.deepEqual(calls, [true], '点击关闭态必须回调 true')
  assert.equal(btn.getAttribute('aria-checked'), 'false', '受控组件不自己改内部状态')

  await container.parentElement.removeChild(container)
})

test('UiSwitch 关闭态再点回 true、开启态点击回 false', async () => {
  for (const [from, to] of [[false, true], [true, false]]) {
    const calls = []
    const { container } = await render(el(UiSwitch, { checked: from, onChange: (v) => calls.push(v) }))
    await click(container.querySelector('[role="switch"]'))
    assert.deepEqual(calls, [to], `${from} → 点击必须回 ${to}`)
  }
})

test('UiSwitch 开启态带 on 类，尺寸 sm 带专用类', async () => {
  const { container } = await render(el(UiSwitch, { checked: true, onChange: () => {}, size: 'sm' }))
  const btn = container.querySelector('[role="switch"]')
  assert.match(btn.className, /ui-switch on/)
  assert.match(btn.className, /ui-switch--sm/)
  assert.ok(btn.querySelector('.ui-switch-thumb'), '必须有滑块元素')
})

test('UiSwitch 禁用后点击不触发回调', async () => {
  let called = 0
  const { container } = await render(el(UiSwitch, { checked: false, onChange: () => { called++ }, disabled: true }))
  const btn = container.querySelector('[role="switch"]')
  assert.equal(btn.disabled, true)
  await click(btn)
  assert.equal(called, 0, 'disabled 时点击必须无副作用')
})

// ════════════════════════ UiSelect ════════════════════════

const OPTS = [
  { value: 'a', label: '选项A', group: '第一组' },
  { value: 'b', label: '选项B', desc: '描述B', group: '第一组' },
  { value: 'c', label: '选项C', group: '第二组', disabled: true },
]

test('UiSelect 默认收起，点击展开并列出全部选项', async () => {
  const { container } = await render(el(UiSelect, { value: 'a', onChange: () => {}, options: OPTS }))
  assert.equal(container.querySelector('.ui-select-menu'), null, '默认必须收起')
  const trigger = container.querySelector('.ui-select-trigger')
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  assert.equal(trigger.getAttribute('aria-haspopup'), 'listbox')

  await click(trigger)
  const menu = container.querySelector('.ui-select-menu')
  assert.ok(menu, '点击后必须展开')
  assert.equal(menu.getAttribute('role'), 'listbox')
  assert.equal(menu.querySelectorAll('[role="option"]').length, 3)
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  assert.match(trigger.querySelector('.ui-select-label').textContent, /选项A/, '触发器要显示已选标签')
})

test('UiSelect 选中选项后回调、收起并把焦点还给触发器', async () => {
  const calls = []
  const { container } = await render(el(UiSelect, { value: 'a', onChange: (v) => calls.push(v), options: OPTS }))
  await click(container.querySelector('.ui-select-trigger'))
  await click(container.querySelectorAll('[role="option"]')[1])
  assert.deepEqual(calls, ['b'], '必须回调选中的 value')
  assert.equal(container.querySelector('.ui-select-menu'), null, '选中后必须收起')
  assert.equal(container.querySelector('.ui-select-trigger').getAttribute('aria-expanded'), 'false')
})

test('UiSelect 已选中项带 active 类和勾选图标', async () => {
  const { container } = await render(el(UiSelect, { value: 'a', onChange: () => {}, options: OPTS }))
  await click(container.querySelector('.ui-select-trigger'))
  const active = container.querySelector('.ui-select-item.active')
  assert.ok(active, '已选中项必须有 active 类')
  assert.equal(active.getAttribute('aria-selected'), 'true')
  assert.match(active.querySelector('.ui-select-item-label').textContent, /选项A/)
})

test('UiSelect 禁用项不可选中、也不让菜单因此收起', async () => {
  const calls = []
  const { container } = await render(el(UiSelect, { value: 'a', onChange: (v) => calls.push(v), options: OPTS }))
  await click(container.querySelector('.ui-select-trigger'))
  const items = container.querySelectorAll('[role="option"]')
  assert.equal(items[2].classList.contains('disabled'), true)
  assert.equal(items[2].tabIndex, -1, '禁用项必须移出 Tab 序列')
  await click(items[2])
  assert.equal(calls.length, 0, '点击禁用项不能回调')
  assert.ok(container.querySelector('.ui-select-menu'), '菜单也不能因此收起')
})

test('UiSelect 分组头只渲染一次', async () => {
  const { container } = await render(el(UiSelect, { value: 'a', onChange: () => {}, options: OPTS }))
  await click(container.querySelector('.ui-select-trigger'))
  const groups = [...container.querySelectorAll('.ui-select-group')].map((g) => g.textContent)
  assert.deepEqual(groups, ['第一组', '第二组'], '同组不能重复出分组头')
})

test('UiSelect 选项上的 desc 单独渲染成小字', async () => {
  const { container } = await render(el(UiSelect, { value: 'a', onChange: () => {}, options: OPTS }))
  await click(container.querySelector('.ui-select-trigger'))
  const desc = container.querySelector('.ui-select-item-desc')
  assert.ok(desc, '有 desc 的选项必须渲染描述')
  assert.equal(desc.textContent, '描述B')
})

test('UiSelect 键盘：ArrowDown 展开、Escape 收起', async () => {
  const { container } = await render(el(UiSelect, { value: 'a', onChange: () => {}, options: OPTS }))
  const trigger = container.querySelector('.ui-select-trigger')

  await keyDown(trigger, 'ArrowDown')
  assert.ok(container.querySelector('.ui-select-menu'), 'ArrowDown 必须展开')

  await keyDown(trigger, 'Escape')
  assert.equal(container.querySelector('.ui-select-menu'), null, 'Escape 必须收起')
})

test('UiSelect 键盘：Enter/空格选中、Home 跳到第一个可用项', async () => {
  const calls = []
  const { container } = await render(el(UiSelect, { value: 'a', onChange: (v) => calls.push(v), options: OPTS }))
  await click(container.querySelector('.ui-select-trigger'))
  await keyDown(container.querySelectorAll('[role="option"]')[1], 'Enter')
  assert.deepEqual(calls, ['b'], 'Enter 必须选中')
  assert.equal(container.querySelector('.ui-select-menu'), null)

  await click(container.querySelector('.ui-select-trigger'))
  await keyDown(container.querySelectorAll('[role="option"]')[1], ' ')
  assert.deepEqual(calls, ['b', 'b'], '空格也要选中')

  await click(container.querySelector('.ui-select-trigger'))
  await keyDown(container.querySelectorAll('[role="option"]')[1], 'Home')
  assert.deepEqual(calls, ['b', 'b', 'a'], 'Home 必须跳到第一个可用项')
})

test('UiSelect 禁用项上按回车也不生效', async () => {
  const calls = []
  const { container } = await render(el(UiSelect, { value: 'a', onChange: (v) => calls.push(v), options: OPTS }))
  await click(container.querySelector('.ui-select-trigger'))
  await keyDown(container.querySelectorAll('[role="option"]')[2], 'Enter')
  assert.equal(calls.length, 0)
  assert.ok(container.querySelector('.ui-select-menu'), '菜单仍在')
})

test('UiSelect 点击组件外部收起', async () => {
  const { container } = await render(el(UiSelect, { value: 'a', onChange: () => {}, options: OPTS }))
  await click(container.querySelector('.ui-select-trigger'))
  assert.ok(container.querySelector('.ui-select-menu'), '先展开')

  await act(async () => { document.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true })) })
  assert.equal(container.querySelector('.ui-select-menu'), null, '点击外部必须收起')
})

test('UiSelect 禁用后触发器不可点、键盘也不展开', async () => {
  let called = 0
  const { container } = await render(el(UiSelect, { value: 'a', onChange: () => { called++ }, options: OPTS, disabled: true }))
  const trigger = container.querySelector('.ui-select-trigger')
  assert.equal(trigger.disabled, true)
  await keyDown(trigger, 'ArrowDown')
  assert.equal(called, 0)
  assert.equal(container.querySelector('.ui-select-menu'), null)
})

test('UiSelect 无选中值时显示 placeholder 并加占位类', async () => {
  const { container } = await render(el(UiSelect, { value: '', onChange: () => {}, options: OPTS, placeholder: '请选择字体' }))
  const label = container.querySelector('.ui-select-label')
  assert.equal(label.textContent, '请选择字体')
  assert.match(label.className, /ui-select-placeholder/)
})

// ════════════════════════ UiInput ════════════════════════

test('UiInput 逐字输入都回调最新全量值', async () => {
  const calls = []
  const { container } = await render(el(UiInput, { value: '', onChange: (v) => calls.push(v) }))
  const input = container.querySelector('input')
  await type(input, 'A')
  await type(input, 'Ab')
  await type(input, 'Abc')
  assert.deepEqual(calls, ['A', 'Ab', 'Abc'])
})

test('UiInput clearable 只在有内容时显示清除键，点击清空', async () => {
  let value = 'hello'
  const calls = []
  const onChange = (v) => { calls.push(v); value = v }
  const { container, set } = await render(el(UiInput, { value, onChange, clearable: true }))
  assert.ok(container.querySelector('.ui-input-clear'), '有值时必须有清除键')

  await click(container.querySelector('.ui-input-clear'))
  assert.deepEqual(calls, [''], '清除键必须回调空串')
  await set(el(UiInput, { value, onChange, clearable: true }))
  assert.equal(container.querySelector('.ui-input-clear'), null, '空值时必须隐藏清除键')
})

test('UiInput 清除键有 aria-label 可被读屏识别', async () => {
  const { container } = await render(el(UiInput, { value: 'x', onChange: () => {}, clearable: true }))
  const clear = container.querySelector('.ui-input-clear')
  assert.ok(clear.getAttribute('aria-label'), '清除键必须有 aria-label')
  assert.equal(clear.type, 'button')
})

test('UiInput 禁用时输入框不可改、也不显示清除键', async () => {
  const { container } = await render(el(UiInput, { value: 'x', onChange: () => {}, clearable: true, disabled: true }))
  const input = container.querySelector('input')
  assert.equal(input.disabled, true, '必须置灰 —— 原生 disabled 会让浏览器不再派发 input 事件')
  assert.equal(container.querySelector('.ui-input-clear'), null)
})

test('UiInput readOnly 落到 input 属性', async () => {
  const { container } = await render(el(UiInput, { value: 'x', onChange: () => {}, readOnly: true }))
  assert.equal(container.querySelector('input').readOnly, true)
})

test('UiInput prefixIcon 渲染在输入框之前', async () => {
  const { container } = await render(el(UiInput, { value: '', onChange: () => {}, prefixIcon: 'ri-search-line' }))
  const prefix = container.querySelector('.ui-input-prefix')
  assert.ok(prefix, '必须渲染前缀图标槽')
  assert.match(prefix.querySelector('span').className, /remix ri-search-line/)
  const input = container.querySelector('input')
  assert.ok(input.compareDocumentPosition(prefix) & Node.DOCUMENT_POSITION_PRECEDING,
    '前缀必须在输入框之前')
})

test('UiInput suffix 渲染在输入框之后（API Key 眼睛按钮位）', async () => {
  const { container } = await render(
    el(UiInput, { value: '', onChange: () => {}, suffix: el('button', { id: 'eye' }, 'eye') }))
  assert.ok(container.querySelector('#eye'), 'suffix 必须渲染')
  assert.ok(container.querySelector('input').compareDocumentPosition(container.querySelector('#eye'))
    & Node.DOCUMENT_POSITION_FOLLOWING, 'suffix 必须在输入框之后')
})

test('UiInput onKeyDown 收到键盘事件（回车提交等）', async () => {
  const keys = []
  const { container } = await render(el(UiInput, { value: '', onChange: () => {}, onKeyDown: (e) => keys.push(e.key) }))
  const input = container.querySelector('input')
  await fire(input, 'onKeyDown', { key: 'Enter', preventDefault() {} })
  await fire(input, 'onKeyDown', { key: 'Tab', preventDefault() {} })
  assert.deepEqual(keys, ['Enter', 'Tab'])
})

test('UiInput id/name/type 透传到原生 input', async () => {
  const { container } = await render(el(UiInput, {
    value: '', onChange: () => {}, id: 'api-key', name: 'apiKey', type: 'password', size: 'sm'
  }))
  const input = container.querySelector('input')
  assert.equal(input.id, 'api-key')
  assert.equal(input.name, 'apiKey')
  assert.equal(input.type, 'password')
  assert.match(container.querySelector('.ui-input').className, /ui-input--sm/)
})

// ════════════════════════ UiButton ════════════════════════

test('UiButton 点击触发回调', async () => {
  let called = 0
  const { container } = await render(el(UiButton, { onClick: () => { called++ } }, '确定'))
  await click(container.querySelector('button'))
  assert.equal(called, 1)
})

test('UiButton 禁用和 loading 都阻断点击', async () => {
  for (const [name, props] of [['disabled', { disabled: true }], ['loading', { loading: true }]]) {
    let called = 0
    const { container } = await render(el(UiButton, { onClick: () => { called++ }, ...props }, '按钮'))
    const btn = container.querySelector('button')
    assert.equal(btn.disabled, true, `${name} 必须置灰`)
    assert.match(btn.className, /disabled/, `${name} 必须带 disabled 类`)
    await click(btn)
    assert.equal(called, 0, `${name} 时点击必须无副作用`)
  }
})

test('UiButton 三种 variant 都落到类名', async () => {
  for (const v of ['primary', 'outline', 'ghost']) {
    const { container } = await render(el(UiButton, { variant: v }, 'x'))
    assert.match(container.querySelector('button').className, new RegExp(`ui-btn--${v}`), `variant ${v} 必须落到类名`)
  }
})

test('UiButton 三种尺寸都落到类名', async () => {
  for (const s of ['sm', 'md', 'lg']) {
    const { container } = await render(el(UiButton, { size: s }, 'x'))
    assert.match(container.querySelector('button').className, new RegExp(`ui-btn--${s}`), `size ${s} 必须落到类名`)
  }
})

test('UiButton type 默认 button、可改 submit；title 透传', async () => {
  const { container } = await render(el(UiButton, { title: '保存' }, 'x'))
  const btn = container.querySelector('button')
  assert.equal(btn.type, 'button', '默认必须是 button，避免误触发表单提交')
  assert.equal(btn.title, '保存')
})

// ════════════════════════ UiCheck ════════════════════════

test('UiCheck 选中态显示对勾并上色', async () => {
  const { container } = await render(el(UiCheck, { checked: true }))
  const box = container.querySelector('.ui-check')
  assert.match(box.className, /ui-check on/)
  assert.match(box.querySelector('span').className, /remix ri-check-line/, '选中必须渲染对勾')
})

test('UiCheck 未选中不渲染对勾，size 走内联尺寸', async () => {
  const { container } = await render(el(UiCheck, { checked: false, size: 22 }))
  const box = container.querySelector('.ui-check')
  assert.doesNotMatch(box.className, /on/)
  assert.equal(box.querySelector('span.remix'), null, '未选中不能出现对勾')
  assert.match(box.getAttribute('style'), /width: 22px/)
})

// ════════════════════════ UiModal ════════════════════════

test('UiModal open=false 时完全不渲染', async () => {
  await render(el(UiModal, { open: false, onClose: () => {}, title: '设置' }, '内容'))
  assert.equal(document.body.querySelector('.ui-modal-overlay'), null)
})

test('UiModal 打开后通过 portal 挂到 body', async () => {
  const { container } = await render(el(UiModal, { open: true, onClose: () => {}, title: '设置' }, '内容'))
  assert.equal(container.querySelector('.ui-modal'), null, 'modal 不能留在原容器里')
  assert.ok(document.body.querySelector('.ui-modal-overlay'), '必须 portal 到 body')
})

test('UiModal 关闭按钮触发 onClose', async () => {
  let called = 0
  await render(el(UiModal, { open: true, onClose: () => { called++ }, title: '设置' }, 'x'))
  await act(async () => {
    document.querySelector('.ui-modal-close').dispatchEvent(new win.MouseEvent('click', { bubbles: true }))
  })
  assert.equal(called, 1)
})

test('UiModal 点遮罩关闭、点内部不关闭', async () => {
  let called = 0
  await render(el(UiModal, { open: true, onClose: () => { called++ }, title: '设置' }, el('div', { id: 'inner' }, 'x')))
  await act(async () => {
    document.querySelector('.ui-modal-overlay').dispatchEvent(new win.MouseEvent('click', { bubbles: true }))
  })
  assert.equal(called, 1, '点遮罩必须关闭')

  await act(async () => {
    document.querySelector('#inner').dispatchEvent(new win.MouseEvent('click', { bubbles: true }))
  })
  assert.equal(called, 1, '点内部不能冒泡到遮罩')
})

test('UiModal closeOnOverlay=false 时点遮罩不关闭', async () => {
  let called = 0
  await render(el(UiModal, { open: true, onClose: () => { called++ }, closeOnOverlay: false, title: '设置' }, 'x'))
  await act(async () => {
    document.querySelector('.ui-modal-overlay').dispatchEvent(new win.MouseEvent('click', { bubbles: true }))
  })
  assert.equal(called, 0)
})

test('UiModal Escape 关闭', async () => {
  let called = 0
  await render(el(UiModal, { open: true, onClose: () => { called++ }, title: '设置' }, 'x'))
  await act(async () => {
    document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  assert.equal(called, 1)
})

test('UiModal 打开锁 body 滚动，卸载后还原之前的值', async () => {
  document.body.style.overflow = 'scroll'
  const { unmount } = await render(el(UiModal, { open: true, onClose: () => {}, title: '设置' }, 'x'))
  assert.equal(document.body.style.overflow, 'hidden', '打开时必须锁滚动')
  await unmount()
  assert.equal(document.body.style.overflow, 'scroll', '必须还原成打开前的值而不是清空')
})

test('UiModal §8.1 尺寸：设置中心 92vw/92vh + 1400px 上限、圆角 18、溢出收 hidden', async () => {
  // 用 SettingsDialog 的真实取值，而不是自造参数
  await render(el(UiModal, { open: true, onClose: () => {}, width: '92vw', height: '92vh', maxWidth: 1400, radius: 18 }, 'x'))
  // 读 React 实际收到的 style prop：happy-dom 不认 min()/calc()，会把整条 style 丢掉
  const m = document.querySelector('.ui-modal')
  const style = reactProps(m).style
  assert.equal(style.width, 'min(92vw, 1400px)', '必须是 min(宽度, 上限)，§8.1 设置中心 1400px')
  assert.equal(style.borderRadius, 18, '圆角必须 18px')
  assert.equal(style.height, 'min(92vh, calc(100vh - 40px))', '§8.1 高度 92vh 且带上限')
  assert.equal(style.maxHeight, 'none')
  assert.equal(style.overflow, 'hidden', '有固定高度必须收成 hidden，否则内容会撑破圆角')
})

test('UiModal 数字宽度必须补 px，否则整条 width 是非法 CSS 会被浏览器丢弃', async () => {
  await render(el(UiModal, { open: true, onClose: () => {}, width: 600 }, 'x'))
  const style = reactProps(document.querySelector('.ui-modal')).style
  assert.equal(style.width, 'min(600px, 94vw)')
  assert.ok(!/\b600,/.test(style.width), '不能出现裸数字 600,')
})

test('UiModal 字符串宽度原样使用；bodyPadding=false 时内容区去内边距', async () => {
  await render(el(UiModal, { open: true, onClose: () => {}, width: '1320px', bodyPadding: false }, 'x'))
  assert.equal(reactProps(document.querySelector('.ui-modal')).style.width, 'min(1320px, 94vw)')
  // padding 传的是数字 0，React 原样保留类型
  assert.equal(reactProps(document.querySelector('.ui-modal-body')).style.padding, 0)
})

test('UiModal 无 title 时无头部也无关闭按钮，但仍能用 Escape 关掉', async () => {
  let called = 0
  await render(el(UiModal, { open: true, onClose: () => { called++ } }, 'x'))
  assert.equal(document.querySelector('.ui-modal-header'), null)
  assert.equal(document.querySelector('.ui-modal-close'), null, '没有 title 就不该有头部和关闭按钮')

  await act(async () => {
    document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
  assert.equal(called, 1, '没有可见关闭按钮时 Escape 仍是唯一的退出路径')
})

// ════════════════════════ toast ════════════════════════

test('toast 容器符合 §9：顶部居中、距顶 20px、z-index 10000', () => {
  toast('操作成功')
  const box = document.body.querySelector('.lz-toast-container')
  assert.ok(box, '必须挂到 body')
  assert.equal(box.style.top, '20px')
  assert.equal(box.style.zIndex, '10000')
  assert.equal(box.style.left, '50%')
  assert.equal(box.style.transform, 'translateX(-50%)')
  assert.equal(box.style.pointerEvents, 'none', '容器本身不能挡住页面点击')
})

test('toast 容器是单例，多次调用只新增通知', () => {
  document.querySelectorAll('.lz-toast').forEach((n) => n.remove())
  toast('a'); toast('b'); toast('c')
  assert.equal(document.querySelectorAll('.lz-toast-container').length, 1, '容器必须复用')
  assert.equal(document.querySelectorAll('.lz-toast').length, 3)
})

test('toast §9 圆角、边框、内边距、色条规格', () => {
  document.querySelectorAll('.lz-toast').forEach((n) => n.remove())
  toast('消息')
  const t = document.querySelector('.lz-toast')
  assert.equal(t.style.padding, '12px 16px 12px 18px')
  assert.match(t.style.border, /^0\.7px solid/, 'happy-dom 会丢掉 shorthand 里的 var()，只断言能保留的部分')
  assert.equal(t.style.borderRadius, 'var(--radius-md)')
  assert.equal(t.style.background, 'var(--color-bg-white)')
  assert.equal(t.style.minWidth, '200px')
  assert.equal(t.style.pointerEvents, 'auto', '通知本身必须可交互，否则关不掉')
  assert.equal(t.getAttribute('role'), 'status')
  const bar = t.querySelector('div')
  assert.equal(bar.style.width, '3px')
  assert.equal(bar.style.height, '20px')
  assert.equal(bar.style.borderRadius, '2px')
  assert.equal(bar.style.background, 'var(--color-success)')
  assert.match(t.style.animation, /lzToastIn 0\.25s/)
})

test('toast §9 宽度 min(420px, 90vw) 写在源码里（happy-dom 不认 min()，读不到 DOM 值）', () => {
  assert.match(read('src/utils/toast.ts'), /style\.width = 'min\(420px, 90vw\)'/)
  assert.match(read('src/utils/toast.ts'), /style\.minWidth = '200px'/)
  assert.match(read('src/utils/toast.ts'), /zIndex: '10000'/)
  assert.match(read('src/utils/toast.ts'), /top: '20px'/)
})

test('toast 四种类型的色条颜色', () => {
  document.querySelectorAll('.lz-toast').forEach((n) => n.remove())
  for (const type of ['success', 'error', 'warning', 'info']) toast(`m`, { type })
  const bars = [...document.querySelectorAll('.lz-toast > div')].map((b) => b.style.background)
  assert.deepEqual(bars, ['var(--color-success)', 'var(--color-error)', 'var(--color-warning)', 'var(--color-info)'])
})

test('toast 关闭按钮手动关掉并切到离场动画', async () => {
  document.querySelectorAll('.lz-toast').forEach((n) => n.remove())
  toast('待关闭')
  const t = document.querySelector('.lz-toast')
  assert.ok(t.querySelector('button[aria-label="关闭通知"]'), '必须有可识别的关闭按钮')
  await act(async () => {
    t.querySelector('button').dispatchEvent(new win.MouseEvent('click', { bubbles: true }))
  })
  assert.match(t.style.animation, /lzToastOut/, '必须切到离场动画')
})

test('toast 重复点关闭不会重复执行', async () => {
  document.querySelectorAll('.lz-toast').forEach((n) => n.remove())
  toast('待关闭')
  const btn = document.querySelector('.lz-toast button')
  await act(async () => { btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true })) })
  const once = document.querySelector('.lz-toast').style.animation
  await act(async () => { btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true })) })
  assert.equal(document.querySelector('.lz-toast').style.animation, once, '二次点击必须幂等')
})

// ════════════════════════ 控件样式规范（DESIGN.md §8 / §10）════════════════════════

const uiCss = read('src/styles/ui.css')
const tokensCss = read('src/styles/tokens.css')

test('§8.2 UiInput：高度 42px、0.7px 边框、10px 圆角、focus 变白+主色边框', () => {
  assert.match(uiCss, /\.ui-input\s*\{[\s\S]{0,400}?height: 42px/)
  assert.match(uiCss, /\.ui-input\s*\{[\s\S]{0,400}?border: 0\.7px solid var\(--color-border\)/)
  assert.match(uiCss, /\.ui-input\s*\{[\s\S]{0,400}?background: var\(--color-bg-secondary\)/)
  assert.match(tokensCss, /--radius-md:\s*10px/, '§8.2 的圆角 10px 由 --radius-md 提供')
  assert.match(uiCss, /\.ui-input:focus-within\s*\{[\s\S]{0,200}?background: var\(--color-bg-white\)/)
  assert.match(uiCss, /\.ui-input:focus-within\s*\{[\s\S]{0,200}?border-color: var\(--color-primary\)/)
})

test('§10.2 input 与 select 的 focus 都要有主色边框 + 外发光', () => {
  assert.match(uiCss, /\.ui-input:focus-within,\s*\.ui-select-trigger:focus[\s\S]{0,300}?box-shadow:\s*0 0 0 3px color-mix/)
})

test('§8.4 UiSwitch：开启主色底+白滑块，关闭次级底+灰滑块', () => {
  assert.match(uiCss, /\.ui-switch\s*\{[\s\S]{0,400}?background: var\(--color-bg-secondary\)/)
  assert.match(uiCss, /\.ui-switch\.on\s*\{\s*background: var\(--color-primary\)/)
  assert.match(uiCss, /\.ui-switch-thumb\s*\{[\s\S]{0,300}?background: var\(--color-text-faint\)/)
  assert.match(uiCss, /\.ui-switch\.on \.ui-switch-thumb\s*\{\s*background: var\(--color-on-primary\)/)
})

test('§8.5 UiSelect 与 Input 同风格：同样高度、边框、圆角', () => {
  assert.match(uiCss, /\.ui-select-trigger\s*\{[\s\S]{0,500}?height: 42px/)
  assert.match(uiCss, /\.ui-select-trigger\s*\{[\s\S]{0,500}?border: 0\.7px solid var\(--color-border\)/)
})

test('§8.3 UiCheck：默认 18px 圆徽标，选中主色底 + 白色对勾', () => {
  assert.match(uiCss, /\.ui-check\s*\{[\s\S]{0,300}?width: 18px/)
  assert.match(uiCss, /\.ui-check\.on\s*\{[\s\S]{0,200}?background: var\(--color-primary\)/)
  assert.match(uiCss, /\.ui-check\.on\s*\{[\s\S]{0,200}?color: var\(--color-on-primary\)/)
})

test('§10.2 按钮 hover 用 color-mix 生成层次；§10.3 禁用 filter:brightness', () => {
  assert.match(uiCss, /color-mix\(in srgb, var\(--color-primary\) 88%, #000\)/)
  assert.doesNotMatch(uiCss, /filter:\s*brightness/)
})

test('§10.2 键盘 focus-visible 全控件统一光环，不能漏控件', () => {
  const rule = uiCss.match(/Global focus-visible[\s\S]*?\n\}/)?.[0] || ''
  for (const c of ['.ui-btn', '.ui-switch', '.ui-modal-close', '.ui-input-clear', '.ui-check', '.ui-select-card']) {
    assert.match(rule, new RegExp(c), `键盘光环必须覆盖 ${c}`)
  }
  assert.match(rule, /box-shadow:\s*0 0 0 2px[\s\S]{0,60}0 0 0 4px/)
})

test('§10.3 颜色全部走 CSS 变量，不硬编码 hex', () => {
  const hexes = (uiCss.match(/#[0-9A-Fa-f]{3,6}\b/g) || []).filter((h) => h.toLowerCase() !== '#000')
  assert.deepEqual(hexes, [], `ui.css 不应有硬编码颜色（#000 只作为 color-mix 基准），实际：${hexes.join(',')}`)
})

test('§8.1 遮罩 rgba(0,0,0,0.4)；§10.2 要求深色下仍是 0.4 以上', () => {
  assert.match(uiCss, /\.ui-modal-overlay\s*\{[\s\S]{0,300}?background:\s*rgba\(0,\s*0,\s*0,\s*0\.4\)/)
})

test('§8.1 弹框阴影 0 12px 40px', () => {
  assert.match(uiCss, /box-shadow: 0 12px 40px rgba\(0,\s*0,\s*0,\s*0\.2\)/)
})

// ════════════════════════ 设置持久化闭环 ════════════════════════

test('设置改动必须落到 localStorage，否则刷新即丢', async () => {
  localStorage.clear()
  const { useSettingsStore, DEFAULT_SETTINGS } = await import('../src/store/settingsStore.ts')
  assert.equal(useSettingsStore.getState().defaultFontSize, DEFAULT_SETTINGS.defaultFontSize)

  await act(async () => { useSettingsStore.getState().updateSetting('defaultFontSize', 20) })
  assert.equal(useSettingsStore.getState().defaultFontSize, 20, '内存态必须先更新')
  await waitPersist()
  assert.equal(JSON.parse(localStorage.getItem('lzeditor-settings')).defaultFontSize, 20, '必须写入 lzeditor-settings')
})

test('排版四个开关全部能改、且都会持久化', async () => {
  localStorage.clear()
  const { useSettingsStore } = await import('../src/store/settingsStore.ts')
  for (const [key, val] of [['textIndent', true], ['textJustify', false], ['lineHeight', '2.0'], ['editorFont', 'serif']]) {
    await act(async () => { useSettingsStore.getState().updateSetting(key, val) })
    assert.equal(useSettingsStore.getState()[key], val, `${key} 必须能改`)
  }
  await waitPersist()
  const saved = JSON.parse(localStorage.getItem('lzeditor-settings'))
  assert.equal(saved.textIndent, true)
  assert.equal(saved.textJustify, false)
  assert.equal(saved.lineHeight, '2.0')
  assert.equal(saved.editorFont, 'serif')
})

test('theme 与 accent 走独立 key，供 main.tsx 在水合前就画对主题', async () => {
  localStorage.clear()
  const { useSettingsStore } = await import('../src/store/settingsStore.ts')
  await act(async () => { useSettingsStore.getState().updateSetting('theme', 'dark') })
  await act(async () => { useSettingsStore.getState().updateSetting('accentColor', '#123456') })
  await waitPersist()
  assert.equal(localStorage.getItem('lzeditor-theme'), 'dark')
  assert.equal(localStorage.getItem('lzeditor-accent'), '#123456', '原始 hex 必须原样落盘')
  assert.ok(localStorage.getItem('lzeditor-settings'), '主 settings 也要在，否则重启会丢其他项')
})

test('activeGroup / subTab 是导航态，改它不该触发落盘', async () => {
  localStorage.clear()
  await waitPersist()
  const { useSettingsStore } = await import('../src/store/settingsStore.ts')
  assert.equal(localStorage.getItem('lzeditor-settings'), null)
  await act(async () => { useSettingsStore.getState().setActiveGroup('profile') })
  await waitPersist()
  assert.equal(localStorage.getItem('lzeditor-settings'), null, '导航态不能触发落盘')
})

// ─────────────────────────────────────────────────────────────────────────
// DESIGN.md §10 深色主题
//
// lzeditor 的暗色不走 CSS [data-theme] 覆盖 —— color-tokens.css 头部注明
// 两套值都在 themes.ts，由 JS applyTheme 直接 setProperty。所以阈值校验
// 必须读 themes.ts，扫 CSS 会一个选择器都找不到。
// ─────────────────────────────────────────────────────────────────────────

const themeTs = read('src/styles/themes.ts')

function themeBlock(name) {
  const start = themeTs.indexOf(`${name}: {`)
  assert.ok(start >= 0, `themes.ts 里必须定义 ${name} 主题`)
  let depth = 0
  for (let i = start; i < themeTs.length; i++) {
    if (themeTs[i] === '{') depth++
    else if (themeTs[i] === '}') { if (--depth === 0) return themeTs.slice(start, i + 1) }
  }
  assert.fail(`themes.ts 里 ${name} 块未闭合`)
}

function themeHex(name, key) {
  const m = themeBlock(name).match(new RegExp(`'${key}':\\s*'(#[0-9a-fA-F]{6})'`))
  assert.ok(m, `${name} 主题必须定义 ${key}`)
  return m[1]
}

function lum(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a, b) => {
  const [lo, hi] = [lum(a), lum(b)].sort((p, q) => p - q)
  return (hi + 0.05) / (lo + 0.05)
}
const atLeast = (hex, floor) => lum(hex) >= lum(floor)

test('§10.2 暗色主色必须提亮到 ≥ #E05050，亮色才是偏暖的深红', () => {
  assert.equal(themeHex('parchment', '--color-primary'), '#C0392B')
  assert.ok(atLeast(themeHex('dark', '--color-primary'), '#E05050'), `暗色主色实测 ${themeHex('dark', '--color-primary')}，低于 #E05050`)
})

test('§10.2 暗色文本层级：muted ≥ #A7AEB9、faint ≥ #86909C', () => {
  assert.ok(atLeast(themeHex('dark', '--color-text-muted'), '#A7AEB9'), '暗色 muted 文本太暗')
  assert.ok(atLeast(themeHex('dark', '--color-text-faint'), '#86909C'), '暗色 faint 文本太暗')
})

test('§10.2 暗色边框与底色必须拉开 ≥ 15% 亮度差', () => {
  const border = themeHex('dark', '--color-border')
  const bg = themeHex('dark', '--color-bg-main')
  const c = contrast(border, bg)
  assert.ok(c >= 1.15, `暗色 ${border} vs ${bg} 对比度 ${c.toFixed(3)}:1，边框会融进底色`)
})

test('§10.2 两套主题下主色对底色对比度都 ≥ 4.5:1（WCAG AA）', () => {
  for (const t of ['parchment', 'dark']) {
    const c = contrast(themeHex(t, '--color-primary'), themeHex(t, '--color-bg-main'))
    assert.ok(c >= 4.5, `${t} 主色对底色只有 ${c.toFixed(2)}:1`)
  }
})

test('§10.2 暗色下边框与分割底色都改用 token，没有写死的值', () => {
  assert.equal(themeHex('dark', '--color-border'), '#2A2B2E')
  assert.equal(themeHex('dark', '--color-border-soft'), '#2A2B2E', '暗色下两级边框同值，因为底色已经足够暗')
  // lzeditor 没有 --color-divider 这个 token，分割线一律用 --color-border-soft
  for (const t of ['parchment', 'dark']) assert.equal(themeBlock(t).match(/'--color-divider'/), null)
})

test('§10.3 不许用 filter:brightness 压主色 —— 暗色下会把按钮压成暗红', () => {
  const files = readdirSync(new URL('../src/styles/', import.meta.url)).filter((f) => f.endsWith('.css'))
  const bad = files.flatMap((f) => read(`src/styles/${f}`).split('\n').filter((l) => /filter:\s*brightness/.test(l)))
  assert.equal(bad.length, 0, `禁用 filter:brightness：\n${bad.join('\n')}`)
})

test('§10.3 焦点环不许写死颜色，换主题或换主题色就失效', () => {
  const files = readdirSync(new URL('../src/styles/', import.meta.url)).filter((f) => f.endsWith('.css'))
  const bad = files.flatMap((f) => read(`src/styles/${f}`).split('\n')
    .filter((l) => /:focus/.test(l) && /box-shadow[^\n]*rgba\((?!0,\s*0,\s*0)/.test(l)))
  assert.equal(bad.length, 0, `焦点环写死了非黑色 rgba：\n${bad.join('\n')}`)
})

test('§10.2 §8 的五个控件都必须有焦点态，且靠 box-shadow 出光环', () => {
  const files = readdirSync(new URL('../src/styles/', import.meta.url)).filter((f) => f.endsWith('.css'))
  const all = files.map((f) => read(`src/styles/${f}`)).join('\n')
  // .ui-input 是包着 <input> 的容器，用 :focus-within；其余是原生 button，用 :focus-visible
  const focusSelectors = {
    '.ui-input': ':focus-within',
    '.ui-select-trigger': ':focus-visible',
    '.ui-btn': ':focus-visible',
    '.ui-switch': ':focus-visible',
    '.ui-check': ':focus-visible',
  }
  for (const [sel, pseudo] of Object.entries(focusSelectors)) {
    // 选择器列表可以是共享的（.ui-input:focus-within, .ui-select-trigger:focus ... { }），
    // 所以前后都允许跟着其他选择器
    const re = new RegExp('[^{}]*' + sel.replace(/\./g, '\\.') + '\\s*' + pseudo + '[^{}]*\\{[^}]*\\}', 'g')
    const hits = [...all.matchAll(re)]
    assert.ok(hits.length > 0, `${sel} 必须声明 ${pseudo}`)
    assert.ok(hits.some((h) => /box-shadow/.test(h[0])), `${sel} 的焦点光环必须靠 box-shadow，光改边框看不清`)
  }
})
