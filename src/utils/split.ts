/**
 * 两栏之间的分栏几何。全部在 CSS 像素下工作，纯函数，不碰 DOM。
 * 数值抄 backtickle 的 src/shell/split.ts。
 */

/** 可见分割线宽度。 */
export const SPLITTER_WIDTH = 6
/** 单栏不允许比这更窄，否则代码根本写不下去。 */
export const MIN_PANE_WIDTH = 240
export const DEFAULT_RATIO = 0.5
/** 一次键盘调整左栏占比的量。 */
export const KEY_STEP = 0.02

/**
 * 夹住左栏占比，保证两栏都 ≥ MIN_PANE_WIDTH。
 * 容器装不下两栏时退回 50/50 —— 宁可放弃用户设置的比例，也不能让某一栏变负。
 */
export function clampRatio(ratio: number, containerWidth: number): number {
  const usable = containerWidth - SPLITTER_WIDTH
  if (usable < MIN_PANE_WIDTH * 2) return DEFAULT_RATIO
  const min = MIN_PANE_WIDTH / usable
  return Math.min(1 - min, Math.max(min, ratio))
}

/** 分割线中心指在 x 时左栏的占比，已夹住边界。 */
export function ratioFromPointer(x: number, containerLeft: number, containerWidth: number): number {
  const usable = containerWidth - SPLITTER_WIDTH
  if (usable <= 0) return DEFAULT_RATIO
  return clampRatio((x - containerLeft - SPLITTER_WIDTH / 2) / usable, containerWidth)
}

/** 左栏 + 分割线 + 右栏的 grid 列模板。比例先夹住，外面传未夹的值也不会算坏。 */
export function gridColumns(ratio: number, containerWidth: number): string {
  const clamped = clampRatio(ratio, containerWidth)
  const left = Number(clamped.toFixed(4))
  const right = Number((1 - clamped).toFixed(4))
  return `minmax(0, ${left}fr) ${SPLITTER_WIDTH}px minmax(0, ${right}fr)`
}
