/**
 * 版本快照 id 的生成器。
 *
 * 不能直接用 Date.now()：编辑是 800ms 防抖批量触发的，一次触发可能连落好几条快照，
 * 同一毫秒内 Date.now() 会返回同一个值，导致 id 重复——React key 撞车、
 * HistoryPanel 的「版本 #N」编号错乱、按 id find 回滚时命中错的版本。
 *
 * 用「模块加载时刻 + 递增计数」做基址：既保证会话内单调递增且唯一，
 * 又保持纯数字字符串，HistoryPanel 里 `Number(id)` 排序和 `toString(16)` 短哈希继续成立。
 */
let seq = Date.now()

export function nextVersionId(): string {
  return String(++seq)
}
