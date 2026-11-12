/**
 * File 对象 → 真实磁盘路径。
 *
 * `File.path` 在 Electron 32 已弃用 → 优先走 preload 桥的
 * `webUtils.getPathForFile(file)`（前向兼容），浏览器 dev（无 electronAPI）回落
 * `file.path`，最终返回 ''（无法追踪路径时 git 历史降级为仅本地快照）。
 */
export function getDiskPath(file: File): string {
  try {
    const api = (window as any).electronAPI
    if (api?.getPathForFile) {
      const p = api.getPathForFile(file)
      if (p) return p
    }
  } catch {}
  return (file as any)?.path || ''
}
