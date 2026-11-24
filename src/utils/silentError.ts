/** 静默 catch 的统一出口。
 *
 * 项目里大量 try/catch 是「尽力而为」的守卫：localStorage 在隐私模式下不可用、
 * DOM 滚动定位可能因元素未布局而抛错等。这些失败不影响功能，静默是正确的。
 *
 * 但另有一类 catch 吞掉的是真实故障（文档持久化失败、内置文档读取失败、
 * 导出内联样式失败），原先直接 `catch {}` 会让用户遇到「内容莫名消失」而
 * 无从排查。这类站点统一走这里：开发环境打 warning，生产环境只记 console.error。
 */
export function silentError(tag: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err)
  const ctx = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
    ? `lzeditor:${tag} (开发模式，本应静默的失败，请确认是否符合预期)`
    : `lzeditor:${tag}`
  console.error(ctx, msg, err instanceof Error ? err.stack : '')
}
