import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const app = read('src/App.tsx')
const search = read('src/components/panels/SearchPanel.tsx')
const shortcutTab = read('src/components/panels/settings/ShortcutSettingsTab.tsx')
const formatPlugin = read('src/additional/milkdown/textus/editor/keys/format-shortcut-plugin.ts')

// ── 快捷键页不再有「暂无快捷键」说明文案 ──
assert.doesNotMatch(shortcutTab, /暂无快捷键/, '快捷键页不应再显示「暂无快捷键」说明')
assert.doesNotMatch(shortcutTab, /窗口重新加载、开发者工具、缩放/, '快捷键页不应再显示视图菜单说明')

// ── 查找/替换快捷键要真正聚焦到对应输入框 ──
assert.match(app, /setSearchFocus\('query'\)/, 'Mod+F 必须把焦点目标设为查找')
assert.match(app, /setSearchFocus\('replace'\)/, 'Mod+Shift+H 必须把焦点目标设为替换')
assert.match(search, /replaceRef/, '查找面板必须有替换输入框 ref')
assert.match(search, /searchFocus === 'replace'/, '查找面板必须按焦点目标聚焦替换框')

// ── 数字/字母快捷键不能依赖 Shift 后的 e.key（* & ( 等布局差异） ──
assert.match(app, /e\.code === 'Digit8'/, '无序列表快捷键必须按 Digit8 识别')
assert.match(app, /e\.code === 'Digit7'/, '有序列表快捷键必须按 Digit7 识别')
assert.match(app, /e\.code === 'Digit9'/, '待办快捷键必须按 Digit9 识别')
assert.match(app, /e\.code === 'KeyB'/, '引用快捷键必须按 KeyB 识别')
assert.match(app, /e\.code === 'KeyC'/, '代码块快捷键必须按 KeyC 识别')

// ── 非编辑模式也要执行命令 ──
assert.match(app, /const runCommand =/, '快捷键命令必须有切回编辑模式并等待 facade 的入口')
assert.match(app, /runCommand\('insert\.code-block'\)/, '代码块快捷键必须走 runCommand')
assert.match(app, /runCommand\('insert\.quote'\)/, '引用快捷键必须走 runCommand')

// ── Mod+Shift+H 留给替换，高亮改到 Alt+H，避免同键双触发 ──
assert.match(formatPlugin, /event\.altKey && event\.key\.toLowerCase\(\) === "h"/, '高亮快捷键必须改为 Alt+H')
assert.doesNotMatch(formatPlugin, /SHIFT_SHORTCUTS:\s*Record<string, FormatSpec>\s*=\s*\{\s*h:/, 'Shift+H 不应再绑高亮')

console.log('shortcut wiring ok')
