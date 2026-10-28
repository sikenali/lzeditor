/**
 * ECharts 渲染扩展：把 ```echarts 代码块渲染成惰性容器，容器进入视口/聚焦
 * 时才初始化 echarts 实例。option 源码按 JSON 解析（安全：不 eval 用户脚本）；
 * 解析失败降级为 raw 代码块 + 错误提示。
 */

import type { Token } from "markdown-it";
import { lazyContainerHtml } from "./lazy-container";

/** ```echarts → 惰性容器占位 HTML（渲染前仅 raw 代码块）。 */
export function echartsLazyHtml(tokens: Token[], index: number): string {
  const token = tokens[index]!;
  return lazyContainerHtml("echarts", token.content.replace(/\n$/u, ""));
}

export interface EchartsRenderer {
  init: (
    el: HTMLElement,
  ) => {
    setOption: (option: unknown, notMerge?: boolean) => void;
    dispose?: () => void;
  };
}

let injectedRenderer: EchartsRenderer | null = null;
let dynamicRenderer: EchartsRenderer | null = null;

/** 测试注入假 echarts 渲染器（null 恢复动态 import）。 */
export function _setEchartsForTest(renderer: EchartsRenderer | null): void {
  injectedRenderer = renderer;
  dynamicRenderer = null;
}

async function getRenderer(): Promise<EchartsRenderer> {
  if (injectedRenderer) return injectedRenderer;
  if (dynamicRenderer) return dynamicRenderer;
  const echarts = await import("echarts");
  dynamicRenderer = echarts as unknown as EchartsRenderer;
  return dynamicRenderer;
}

function parseOption(source: string): unknown {
  const text = source.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * 在单个惰性容器宿主上水合 echarts：清空占位、init、setOption。
 * 返回 Promise<boolean>：成功 true，解析/初始化失败降级 false。
 */
export async function renderEchartsLazy(
  host: HTMLElement,
  source: string,
): Promise<boolean> {
  const option = parseOption(source);
  if (!option || typeof option !== "object") return false;
  try {
    const echarts = await getRenderer();
    host.classList.add("yeli-echarts-ready");
    const chart = echarts.init(host);
    chart.setOption(option, true);
    return true;
  } catch {
    return false;
  }
}
