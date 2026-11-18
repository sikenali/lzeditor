import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createRegistry, pluginApi, pluginRegistries, runWillSave, runWillExport,
  registerDemoPlugins,
} from './plugins-shim.ts'

test('createRegistry: register / getSnapshot / subscribe / unsubscribe', () => {
  const reg = createRegistry()
  const snapshots = []
  const unsub = reg.subscribe(() => snapshots.push(reg.getSnapshot()))

  assert.equal(reg.list().length, 0, 'starts empty')

  const off1 = reg.register({ id: 'a' })
  const off2 = reg.register({ id: 'b' })
  assert.deepEqual(reg.list().map(x => x.id), ['a', 'b'], 'register appends')

  // 快照不可变：注册后是新的数组，原快照不被原地改动
  const snap = reg.getSnapshot()
  off1()
  assert.deepEqual(reg.list().map(x => x.id), ['b'], 'unregister removes')
  assert.deepEqual(snap.map(x => x.id), ['a', 'b'], 'old snapshot unchanged')
  assert.ok(snapshots.length >= 3, 'subscribe fired on each mutation')

  off2()
  assert.equal(reg.list().length, 0, 'all unregistered')
  unsub()
})

test('pluginApi.commands: register + run', async () => {
  let called = 0
  const off = pluginApi.commands.register({
    id: 'test.command', title: '测试', run: async (args) => { called++; return args },
  })
  const result = await pluginApi.commands.run('test.command', { x: 1 })
  assert.equal(called, 1, 'run invokes command')
  assert.deepEqual(result, { x: 1 }, 'run returns command result')
  await assert.rejects(() => pluginApi.commands.run('missing.command'), /No plugin command/, 'unknown command throws')
  off()
  await assert.rejects(() => pluginApi.commands.run('test.command'), /No plugin command/, 'after unregister throws')
})

test('pluginApi.settings: register default / get / set', () => {
  const off = pluginApi.settings.register({ key: 'test.setting', label: '测试设置', default: 42, type: 'number' })
  assert.equal(pluginApi.settings.get('test.setting'), 42, 'get returns default')
  pluginApi.settings.set('test.setting', 99)
  assert.equal(pluginApi.settings.get('test.setting'), 99, 'set overrides')
  off()
})

test('pluginApi contributions land in snapshots', () => {
  const offPage = pluginApi.settingsPages.register({ id: 'test.page', label: '测试页', render: () => null })
  const offStatus = pluginApi.statusItems.register({ id: 'test.status', render: () => null })
  const offTool = pluginApi.aiTools.register({ id: 'test.tool', label: '工具', run: async () => '' })
  const offMenu = pluginApi.menus.register({ id: 'test.menu', menu: 'block', label: '菜单', run: () => {} })

  assert.ok(pluginRegistries.settingsPages.list().some(p => p.id === 'test.page'), 'settingsPage registered')
  assert.ok(pluginRegistries.statusItems.list().some(s => s.id === 'test.status'), 'statusItem registered')
  assert.ok(pluginRegistries.aiTools.list().some(t => t.id === 'test.tool'), 'aiTool registered')
  assert.ok(pluginRegistries.menuItems.list().some(m => m.id === 'test.menu'), 'menuItem registered')

  offPage(); offStatus(); offTool(); offMenu()
})

test('runWillSave / runWillExport invoke hooks (read-only, non-blocking)', () => {
  const saved = []
  const exported = []
  const offSave = pluginApi.willSave.register({ id: 'test.save', run: (doc) => saved.push(doc) })
  const offExport = pluginApi.willExport.register({ id: 'test.export', run: (format) => exported.push(format) })

  runWillSave({ md: '# hi', title: 'doc.md' })
  runWillExport('pdf')

  assert.deepEqual(saved, [{ md: '# hi', title: 'doc.md' }], 'willSave called with doc')
  assert.deepEqual(exported, ['pdf'], 'willExport called with format')

  // 钩子抛错不阻断
  pluginApi.willSave.register({ id: 'test.save.bad', run: () => { throw new Error('boom') } })
  assert.doesNotThrow(() => runWillSave({ md: '', title: '' }), 'a throwing hook does not break others')

  offSave(); offExport()
})

test('registerDemoPlugins registers built-in demo contributions without throwing', () => {
  assert.doesNotThrow(() => registerDemoPlugins())
  assert.ok(pluginRegistries.commands.list().some(c => c.id === 'demo.say'), 'demo command registered')
  assert.ok(pluginRegistries.settingsPages.list().some(p => p.id === 'demo.page'), 'demo settings page registered')
  assert.ok(pluginRegistries.statusItems.list().some(s => s.id === 'demo.status'), 'demo status item registered')
  assert.ok(pluginRegistries.aiTools.list().some(t => t.id === 'demo.clean'), 'demo ai tool registered')
  assert.ok(pluginRegistries.menuItems.list().some(m => m.id === 'demo.menu.say'), 'demo menu item registered')
})
