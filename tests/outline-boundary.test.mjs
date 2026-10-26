import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const {
  OUTLINE_DEPTHS, currentSectionIndex, depthLabel, filterByDepth,
  nextStop, sectionCountLabel, shownCurrent,
} = await import('../src/utils/outline.ts')
const { parseMdOutline } = await import('../src/utils/mdOutline.ts')
const sidebar = read('src/components/sidebar/SidebarOutline.tsx')
const outlineCss = read('src/styles/layout.css')

const H = (line, level) => ({ line, level })
const HEADINGS = [H(3, 1), H(7, 2), H(12, 2), H(20, 3), H(31, 1), H(40, 4)]

test('currentSectionIndex 返回光标所在节，第一条标题之前是 -1', () => {
  assert.equal(currentSectionIndex(HEADINGS, 0), -1, '首条标题之前不属于任何一节')
  assert.equal(currentSectionIndex(HEADINGS, 3), 0, '正好落在标题行就是那一节')
  assert.equal(currentSectionIndex(HEADINGS, 6), 0, '两条标题之间属于上一条')
  assert.equal(currentSectionIndex(HEADINGS, 7), 1, '落到下一条标题')
  assert.equal(currentSectionIndex(HEADINGS, 999), 5, '文末属于最后一节')
  assert.equal(currentSectionIndex([], 10), -1, '空文档')
})

test('亚行容差：即将进入的标题也算进入了', () => {
  assert.equal(currentSectionIndex(HEADINGS, 6.96), 1, '容差内算进入下一节')
  assert.equal(currentSectionIndex(HEADINGS, 6.9), 0, '超出容差还属于上一节')
})

test('filterByDepth 只放过该层级以内的标题，且保留完整下标', () => {
  assert.deepEqual(filterByDepth(HEADINGS, 0).map(e => e.index), [0, 1, 2, 3, 4, 5], '0 显示全部')
  assert.deepEqual(filterByDepth(HEADINGS, 2).map(e => e.index), [0, 1, 2, 4], '深度 2 过滤掉 H3/H4')
  assert.deepEqual(filterByDepth(HEADINGS, 2).map(e => e.heading.level), [1, 2, 2, 1], '层级被正确保留')
  assert.deepEqual(filterByDepth([], 1), [])
})

test('shownCurrent 指向当前节，被过滤时退回上一条可见标题', () => {
  const d2 = filterByDepth(HEADINGS, 2)
  assert.equal(shownCurrent(d2, 4), 3, '当前节可见时就是它自己（完整下标 4）')
  assert.equal(shownCurrent(d2, 3), 2, '当前节被过滤时退到上一条可见')
  assert.equal(shownCurrent(d2, 2), 2, '等于当前下标也算')
  assert.equal(shownCurrent(d2, -1), null, '第一条标题之前没有可见项')
  assert.equal(shownCurrent([], 5), null)
})

test('sectionCountLabel 与 depthLabel 的文案', () => {
  assert.equal(sectionCountLabel(6, 6), '6 节')
  assert.equal(sectionCountLabel(1, 1), '1 节')
  assert.equal(sectionCountLabel(4, 6), '4 / 6 节')
  assert.equal(depthLabel(0), '全部')
  assert.equal(depthLabel(2), '2')
  assert.deepEqual(OUTLINE_DEPTHS, [0, 1, 2, 3])
})

test('nextStop 只认上下与首尾键，越界收敛', () => {
  assert.equal(nextStop('Home', 4, 5), 0)
  assert.equal(nextStop('End', 0, 5), 4)
  assert.equal(nextStop('ArrowUp', 0, 5), 0, '第一项再上不回绕')
  assert.equal(nextStop('ArrowDown', 4, 5), 4, '最后一项再下不回绕')
  assert.equal(nextStop('ArrowDown', 2, 5), 3)
  assert.equal(nextStop('ArrowRight', 2, 5), null, '左右键让给折叠/缩进，不移动')
  assert.equal(nextStop('ArrowDown', 0, 0), null, '空列表无处可去')
})

test('大纲接在 CM6 上，跳转走字符偏移', () => {
  assert.match(sidebar, /currentSectionIndex/, '当前节必须用纯模型算')
  assert.match(sidebar, /filterByDepth/, '深度过滤必须走纯模型')
  assert.match(sidebar, /sectionCountLabel/, '头部要显示节数')
  assert.match(sidebar, /getCM6Editor\(\)\?\.goto\(item\.pos/, '点击标题必须跳到源码位置')
})

test('大纲列表用 roving tabindex + aria-current 暴露当前位置', () => {
  assert.match(sidebar, /tabIndex=\{position === stop \? 0 : -1\}/, '只有一个 tab 停点')
  assert.match(sidebar, /aria-current=\{isCurrent \? 'location' : undefined\}/, '当前位置对读屏器可见')
  assert.match(sidebar, /role="radiogroup"/, '层级过滤是单选组')
  assert.match(sidebar, /role="radio"/, '层级按钮是 radio')
  assert.match(sidebar, /nextStop\(/, '方向键导航走纯模型')
  assert.match(sidebar, /scrollIntoView\(\{ block: 'nearest' \}\)/, '换节时当前项留在视口内')
})

test('样式落在 backtickle 式的高亮与深度按钮上，旧折叠样式已清掉', () => {
  assert.match(outlineCss, /outline-jump-btn\.current/, '当前项有专门高亮')
  assert.match(outlineCss, /outline-badge\.l1/, 'H1/H2/H3 徽标分级')
  assert.match(outlineCss, /outline-depth-btn\.active/, '层级按钮有选中态')
  assert.match(outlineCss, /outline-count/, '头部有节数徽章')
  for (const dead of ['outline-toggle-btn', 'outline-content-btn', 'outline-number', 'outline-node', 'outline-toggle-placeholder']) {
    assert.doesNotMatch(outlineCss, new RegExp(dead), `${dead} 是折叠版大纲的残留，不该再留在 CSS 里`)
  }
})

test('代码块围栏内的 # 不算标题', () => {
  const items = parseMdOutline('# 真标题\n\n```\n# 不是标题\n```\n## 二级\n')
  assert.deepEqual(items.map(i => i.level), [1, 2], '围栏内的 # 被跳过')
})
