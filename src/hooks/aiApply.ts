import type { EditorFacade, FacadeSelection } from '../components/editor/facade/EditorFacade'
import type { AIAction, ApplyRecord } from '../shared/types'

/** 流式游标：跨 send/applyToDoc 共享（见 useAI 内 streamRef）。 */
export interface AIStreamState {
  active: boolean
  stale: boolean
  anchor: FacadeSelection | null
  expectedRev: number
  originalText: string
  insertStart: number
  totalLen: number
}

export interface ApplyPlan {
  record: Omit<ApplyRecord, 'id' | 'timestamp'>
  /** 是否已写入文档（false 表示 stale/事务失败仅登记，未覆盖用户内容）。 */
  wrote: boolean
}

/**
 * 计算「应用 AI 输出到文档」的写入计划（facade 必传；无 facade 由调用方短路）。
 *
 * - 流式已写入部分（active 且 totalLen>0）：只登记实际写入区间，不二次插入；
 * - stale 首 chunk（active 但 totalLen=0，首 chunk 即 revision 不匹配）：不覆盖
 *   用户在流式期间编辑的内容，只登记空应用（见任务 5 B 组）；
 * - 未流式/常规：以当前选区 replaceRange，事务失败（越界等）同样不覆盖、不抛错。
 */
export function planApply(
  facade: EditorFacade,
  s: AIStreamState,
  output: string,
  action: AIAction,
): ApplyPlan {
  if (s.active && s.totalLen > 0) {
    const appliedText = s.stale ? output.slice(0, s.totalLen) : output
    return {
      wrote: false,
      record: {
        action,
        originalText: s.originalText,
        newText: appliedText,
        position: { from: s.insertStart, to: s.insertStart + s.totalLen },
      },
    }
  }
  // stale 首 chunk：绝不能覆盖用户在流式期间的编辑
  if (s.stale) {
    return {
      wrote: false,
      record: {
        action,
        originalText: s.originalText,
        newText: '',
        position: { from: s.insertStart, to: s.insertStart },
      },
    }
  }
  const range = facade.getSelection()
  const from = range ? range.from : facade.getText().length
  const to = range ? range.to : from
  const original = facade.getText().slice(from, to)
  try {
    facade.replaceRange(from, to, output)
  } catch {
    // 选区越界/事务失败：不写入，仅登记空应用（避免未捕获崩溃）
    return {
      wrote: false,
      record: { action, originalText: original, newText: '', position: { from, to } },
    }
  }
  return {
    wrote: true,
    record: { action, originalText: original, newText: output, position: { from, to: from + output.length } },
  }
}
