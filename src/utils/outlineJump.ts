/** 内容模式（阅读/样式）的目录跳转回调。模块级单例，仿照 components/editor/facade/registry.ts。 */
export type OutlineJumper = (id: string) => void
let current: OutlineJumper | null = null
export function registerOutlineJumper(fn: OutlineJumper): void { current = fn }
export function getOutlineJumper(): OutlineJumper | null { return current }
export function clearOutlineJumper(): void { current = null }
