/**
 * 惰性渲染容器：mermaid / echarts 等重量级区块在进入视口或获得焦点前只按
 * raw 代码块呈现，避免编辑（typing）期间反复重算导致抖动；容器在合适的时机
 * 才实例化真渲染器。渲染异常一律降级为 raw 代码块 + 错误提示，绝不把异常
 * 抛进编辑事务（设计第 5 节：渲染边界）。
 *
 * 本模块只负责容器的发现、生命周期标记与降级；真正的渲染器（mermaid /
 * echarts）由调用方注入，便于在 happy-dom 等无 SVG/Canvas 环境里替换成假件。
 */

export type LazyRenderKind = "mermaid" | "echarts";

export interface LazyRenderJob {
  host: HTMLElement;
  kind: LazyRenderKind;
  source: string;
}

export interface LazyRenderers {
  mermaid?: (host: HTMLElement, source: string) => Promise<boolean> | boolean;
  echarts?: (host: HTMLElement, source: string) => Promise<boolean> | boolean;
}

const LAZY_ATTR = "data-yeli-lazy";
const SRC_ATTR = "data-yeli-src";
const DONE_ATTR = "data-yeli-lazy-done";
const FAILED_ATTR = "data-yeli-lazy-failed";

/** 构造一个惰性容器的占位 HTML（渲染前，仅 raw 代码块 + 元数据）。 */
export function lazyContainerHtml(
  kind: LazyRenderKind,
  source: string,
  className = "yeli-lazy",
): string {
  const safe = source
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const encoded = encodeURIComponent(source);
  return `<div class="${className}" ${LAZY_ATTR}="${kind}" ${SRC_ATTR}="${encoded}"><pre><code class="hljs language-${kind}">${safe}</code></pre></div>`;
}

export function isLazyContainer(element: HTMLElement): boolean {
  return element.hasAttribute(LAZY_ATTR);
}

/** 从根节点收集未完成/未失败的惰性容器。 */
export function collectLazyJobs(root: HTMLElement): LazyRenderJob[] {
  const hosts = [...root.querySelectorAll<HTMLElement>(`[${LAZY_ATTR}]`)];
  return hosts
    .map((host) => {
      const kind = (host.getAttribute(LAZY_ATTR) ?? "") as LazyRenderKind;
      const raw = host.getAttribute(SRC_ATTR) ?? "";
      return {
        host,
        kind,
        source:
          raw.length > 0
            ? decodeURIComponent(raw)
            : (host.textContent ?? "").trim(),
      };
    })
    .filter(
      (job): job is LazyRenderJob =>
        (job.kind === "mermaid" || job.kind === "echarts") &&
        !job.host.hasAttribute(DONE_ATTR) &&
        !job.host.hasAttribute(FAILED_ATTR),
    );
}

export function markLazyRendered(host: HTMLElement): void {
  host.setAttribute(DONE_ATTR, "");
  host.classList.remove("yeli-lazy-error");
}

/** 渲染失败：保留 raw 源码，附加错误提示，并打上失败标记防止反复重试。 */
export function degradeLazyContainer(
  host: HTMLElement,
  source: string,
  errorLabel = "渲染失败，已降级为源码",
): void {
  host.setAttribute(FAILED_ATTR, "");
  host.classList.add("yeli-lazy-error");
  if (!host.querySelector("code")) {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.className = "hljs";
    code.textContent = source;
    pre.append(code);
    host.append(pre);
  }
  if (!host.querySelector(".yeli-lazy-error-note")) {
    const note = document.createElement("span");
    note.className = "yeli-lazy-error-note";
    note.textContent = errorLabel;
    host.append(note);
  }
}

function runRenderer(
  job: LazyRenderJob,
  renderers: LazyRenderers,
): Promise<void> | void {
  const render = renderers[job.kind];
  if (!render) return;
  try {
    const result = render(job.host, job.source);
    if (result instanceof Promise) {
      return result
        .then((ok) => {
          if (ok) markLazyRendered(job.host);
          else degradeLazyContainer(job.host, job.source);
        })
        .catch(() => degradeLazyContainer(job.host, job.source));
    }
    if (result) markLazyRendered(job.host);
    else degradeLazyContainer(job.host, job.source);
  } catch {
    degradeLazyContainer(job.host, job.source);
  }
}

/**
 * 立即水合根节点下的惰性容器（跳过已渲染/已失败的），并等待所有异步渲染器
 * 完成（mermaid/echarts 是 async，调用方 `await` 后可断言 done/failed 标记）。
 * 供测试与"进入视口"以外的直接刷新路径使用。
 */
export async function hydrateLazyContainers(
  root: HTMLElement,
  renderers: LazyRenderers,
): Promise<void> {
  const pending = collectLazyJobs(root)
    .map((job) => runRenderer(job, renderers))
    .filter((result): result is Promise<void> => result instanceof Promise);
  await Promise.all(pending);
}

/**
 * 观察根节点下的惰性容器：进入视口（或容器获得焦点）时才水合。
 * 返回断开函数；无 IntersectionObserver 环境退化为立即水合。
 */
export function observeLazyContainers(
  root: HTMLElement,
  renderers: LazyRenderers,
): () => void {
  if (typeof IntersectionObserver === "undefined") {
    hydrateLazyContainers(root, renderers);
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const host = entry.target as HTMLElement;
        const kind = (host.getAttribute(LAZY_ATTR) ?? "") as LazyRenderKind;
        const raw = host.getAttribute(SRC_ATTR) ?? "";
        const source =
          raw.length > 0 ? decodeURIComponent(raw) : (host.textContent ?? "");
        runRenderer({ host, kind, source }, renderers);
        observer.unobserve(host);
      }
    },
    { root: null, rootMargin: "120px" },
  );
  for (const job of collectLazyJobs(root)) {
    if (!job.host.hasAttribute(DONE_ATTR) && !job.host.hasAttribute(FAILED_ATTR)) {
      observer.observe(job.host);
    }
  }
  return () => observer.disconnect();
}
