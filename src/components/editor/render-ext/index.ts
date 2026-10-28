/**
 * 区块内特效渲染扩展（render-ext）统一入口。
 *
 * 在 yeli 渲染边界（src/vendor/yeli/render/markdown.ts）上做扩展：
 *  - 注册 markdown-it 规则：```mermaid / ```echarts → 惰性容器；
 *    ```lang → highlight.js 高亮；$$...$$ / $...$ → KaTeX 惰性容器。
 *  - observeLazyContainers：惰性容器进入视口/聚焦才跑 mermaid/echarts/katex。
 *
 * 渲染异常全部降级为 raw 代码块 + 错误提示，绝不抛进编辑事务。
 */

import type { MarkdownIt as MarkdownItType } from "markdown-it";
import { highlightFence } from "./code-highlight";
import { mermaidLazyHtml, renderMermaidLazy } from "./mermaid";
import { echartsLazyHtml, renderEchartsLazy } from "./echarts";
import { installKatex, renderKatexLazy } from "./katex";
import {
  observeLazyContainers,
  type LazyRenderers,
} from "./lazy-container";

export type { LazyRenderKind, LazyRenderers } from "./lazy-container";

export interface RenderExtHydrateOptions {
  dark?: boolean;
  /** 测试注入：mermaid 假渲染器。 */
  mermaid?: unknown;
}

/**
 * 把所有特效渲染规则注册进一个 markdown-it 实例。
 * fence 规则按 mermaid/echarts/其它语言分派；KaTeX 注册块级与行内规则。
 */
export function installRenderExt(md: MarkdownItType): void {
  md.renderer.rules.fence = (tokens, index, _options, _env) => {
    const token = tokens[index]!;
    const rawLang = token.info.trim().split(/\s+/u)[0] ?? "";
    if (rawLang === "mermaid") return mermaidLazyHtml(tokens, index);
    if (rawLang === "echarts") return echartsLazyHtml(tokens, index);
    // 空/无语言 fence 也交给 highlightFence（内部退化为转义源码）；
    // 不能回退 self.renderToken —— fence 是单 token，renderToken 只发开标签，
    // 内容会丢失（见 render-ext.test.mjs "无语言 fence 退化为转义源码"）。
    return highlightFence(tokens, index);
  };
  installKatex(md);
}

/** 组装 mermaid/echarts/katex 渲染器（供惰性水合）。 */
export function renderersFor(options: RenderExtHydrateOptions = {}): LazyRenderers {
  return {
    mermaid: (host, source) =>
      renderMermaidLazy(host, source, options.dark ?? false, options.mermaid),
    echarts: (host, source) => renderEchartsLazy(host, source),
    katex: (host, source) => renderKatexLazy(host, source),
  };
}

/** 观察根节点下的惰性容器，进入视口/聚焦才水合。返回断开函数。 */
export function observeLazyRenderers(
  root: HTMLElement,
  options: RenderExtHydrateOptions = {},
): () => void {
  return observeLazyContainers(root, renderersFor(options));
}
