/**
 * Markdown 方言注册表 + 自动检测。
 *
 * 六个方言的渲染差异全部收敛在 render.ts 的方言表里；这里只负责「是什么方言」。
 * 检测是启发式打分，不保证正确——`auto` 只是默认值，设置里可以手动指定。
 */
export type FlavorId = 'commonmark' | 'gfm' | 'obsidian' | 'pandoc' | 'quarto' | 'mdx'

/** 设置项的值：`auto` 走自动检测，其余是固定方言。 */
export type FlavorSetting = 'auto' | FlavorId

/**
 * 剥掉围栏代码块。代码示例里写 `+ item`、`[[link]]`、`import x` 是常态，
 * 拿这些做方言特征会把每个文档都判成 pandoc/obsidian/mdx。
 */
function outsideFences(md: string): string {
  const out: string[] = []
  let inFence = false
  let fenceChar = ''
  for (const line of md.split('\n')) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (m) {
      const ch = m[1][0]
      if (!inFence) {
        inFence = true
        fenceChar = ch
      } else if (ch === fenceChar) {
        inFence = false
        fenceChar = ''
      }
      out.push('')
      continue
    }
    out.push(inFence ? '' : line)
  }
  return out.join('\n')
}

// 特征表按「越独有越靠前」的顺序判定，先命中先返回。
const S = {
  // YAML front matter：必须是文档开头、且中间真的有一行 YAML 键值
  frontMatter: /^---\r?\n[^\n]*:[^\n]*\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,
  mdxModule: /^ {0,3}(?:import|export)\s+[^;\n]*(?:"[^"\n]+"|;)[^\n]*$/m,
  mdxJsx: /<[A-Z][A-Za-z0-9_.]*[\s/>]/,
  wikiLink: /\[\[[^\]\n]+\]\]/,
  obsidianCallout: /^> *\[![a-z][a-z0-9-]*\]/im,
  obsidianComment: /^%%/m,
  quartoId: /^#{1,6}[^#\n]*\{#[\w-]+\}/m,
  quartoExec: /^ {0,3}(`{3,}|~{3,}) *\{[a-z0-9-]+\}/m,
  callout: /^ {0,3}:::.*callout.*$/im,
  pandocDiv: /^ {0,3}::: *\{?[\w.-]*\{#[\w-]+/,
  pandocCite: /(^|[^\w])@cite\w*\{[^}\n]+\}/,
  pandocATex: /^=+ [^\n]+$/,
  pandocBlockCite: /^\[[^\]\n]+\]$/,
  pandocAttr: /\{#[\w-]+(?:\s+[\w.-]+)*\}/,
  gfmTable: /^ {0,3}\|[^\n]*\|[\s\S]{0,40}?\n[ \t]*\|[\s:|-]+\|?[\s\S]*$/,
  gfmStrike: /~~[^\s~][^~\n]*~~/,
  gfmTask: /^ {0,3}[-*+]\s+\[[ xX]\]/m,
  gfmAutolink: /^ {0,3}https?:\/\/[^\s)]+$/m,
}

/** 按特征推断方言。没有特征时回退 commonmark，避免把普通文档渲染成带表格的 GFM。 */
export function detectFlavor(md: string): FlavorId {
  if (!md) return 'commonmark'
  const src = outsideFences(md)

  if (S.mdxModule.test(src) || S.mdxJsx.test(src)) return 'mdx'
  if (S.wikiLink.test(src) || S.obsidianCallout.test(src) || S.obsidianComment.test(src)) return 'obsidian'
  if (S.quartoId.test(src) || S.quartoExec.test(src) || S.callout.test(src)) return 'quarto'
  if (S.pandocDiv.test(src) || S.pandocCite.test(src) || S.pandocATex.test(src)) return 'pandoc'
  // {#id} 属性列表和块引用单独出现可能是代码里抄来的例子，只在前有 front matter 时判定为 pandoc
  if (S.frontMatter.test(md) && (S.pandocBlockCite.test(src) || S.pandocAttr.test(src))) return 'pandoc'
  if (S.gfmTable.test(src) || S.gfmStrike.test(src) || S.gfmTask.test(src) || S.gfmAutolink.test(src)) return 'gfm'

  return 'commonmark'
}

export function resolveFlavor(setting: FlavorSetting, md: string): FlavorId {
  return setting === 'auto' || !setting ? detectFlavor(md) : setting
}
