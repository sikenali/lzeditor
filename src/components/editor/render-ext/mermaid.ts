/**
 * Mermaid 渲染扩展：把 ```mermaid 代码块渲染成惰性容器（进入视口/聚焦才跑
 * mermaid 实例化，避免编辑期间反复重算）。水合复用 lzeditor 既有 mermaid
 * 管线（src/utils/markdown/mermaid.ts，含失败降级与防重复重试），不重复造轮子。
 */

import type { Token } from "markdown-it";
import { lazyContainerHtml } from "./lazy-container";

/** ```mermaid → 惰性容器占位 HTML（渲染前仅 raw 代码块）。 */
export function mermaidLazyHtml(tokens: Token[], index: number): string {
  const token = tokens[index]!;
  return lazyContainerHtml("mermaid", token.content.replace(/\n$/u, ""));
}

/**
 * 在单个惰性容器宿主上跑 mermaid 渲染，返回成功与否。
 * 渲染器注入：`inject` 为测试用假件；为 null 时动态 import 真实 mermaid。
 */
export async function renderMermaidLazy(
  host: HTMLElement,
  _source: string,
  dark: boolean,
  inject?: unknown,
): Promise<boolean> {
  const { renderMermaidBlocks, _setMermaidForTest } = await import(
    "../../../utils/markdown/mermaid.ts"
  );
  if (inject) _setMermaidForTest(inject as never);
  try {
    await renderMermaidBlocks(host, dark);
    // renderMermaidBlocks 把惰性容器里的 <pre><code> 换成 .mermaid-diagram：
    // 成功 → 内含 <svg>；失败 → 该 div 带 data-mermaid-failed + mermaid-error。
    // 失败必须返回 false，让 lazy-container 把容器标记为 failed（防重试），
    // 不能只看 host 自身类名（错误类打在内部 diagram 上）。
    const diagram = host.querySelector<HTMLElement>(".mermaid-diagram");
    return diagram ? !diagram.hasAttribute("data-mermaid-failed") : true;
  } finally {
    if (inject) _setMermaidForTest(null);
  }
}
