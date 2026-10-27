import { useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { applyTypographyOverrides } from '../styles/themes'

/**
 * 把「排版」设置折算成 --read-* 变量写到 :root，供预览面板 / 阅读模式 / 导出共用。
 *
 * 挂在 App 上而不是 LZEditor：读模式、历史模式会把 LZEditor 整个替换掉，
 * 那时编辑器不在树里，变量就没人写、预览和阅读区掉回回退值。
 */
export function useTypographyOverrides(): void {
  const editorFont = useSettingsStore((s) => s.editorFont)
  const defaultFontSize = useSettingsStore((s) => s.defaultFontSize)
  const lineHeight = useSettingsStore((s) => s.lineHeight)
  const textIndent = useSettingsStore((s) => s.textIndent)
  const textJustify = useSettingsStore((s) => s.textJustify)

  useEffect(() => {
    applyTypographyOverrides({
      fontSize: defaultFontSize,
      lineHeight,
      fontFamily: fontStackFor(editorFont),
      textIndent,
      textJustify,
    })
  }, [editorFont, defaultFontSize, lineHeight, textIndent, textJustify])
}

/** 设置里的字体取值 → CSS 字体栈。走 var() 而不是裸字体名，换主题时回退链才跟着走。
 *  导出供测试：这个映射错了用户的字体选择会静默失效，不值得只靠人工看。 */
export function fontStackFor(editorFont?: string): string {
  switch (editorFont) {
    case 'serif': return 'var(--font-serif)'
    case 'monospace': return 'var(--font-mono)'
    case 'sans-serif':
    case undefined:
      return 'var(--font-sans)'
    default:
      return editorFont
  }
}
