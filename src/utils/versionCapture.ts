/**
 * 程序化载入（回滚/重播）期间抑制快照采集的模块级标记。
 *
 * 回滚/重播会调 `setText(md)`，编辑器 onChange 会把内容回填 store 并调度
 * 180ms debounce 的 addVersion——若不禁，回滚本身会再落一条「回滚后的内容」
 * 快照，时间线上多出与回滚目标重复的项。
 *
 * 用法：载入前 `setVersionSuppressed(true)`，载入后延时（覆盖 debounce 窗口）
 * 再 `setVersionSuppressed(false)`。
 */
let suppressed = false

export function setVersionSuppressed(v: boolean): void {
  suppressed = v
}

export function isVersionSuppressed(): boolean {
  return suppressed
}
