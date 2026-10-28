import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import MarkdownIt from "markdown-it";

// 渲染边界需要真实 DOM（DOMPurify 净化 + mermaid 块发现），用 happy-dom 提供。
const win = new Window();
globalThis.window = win.window;
globalThis.document = win.document;
globalThis.navigator = win.navigator;

const { configureMarkdownSanitizer, registerRenderExtension, renderDocumentMarkdown } =
  await import("../../src/vendor/yeli/render/markdown.ts");
const { installRenderExt, renderersFor } = await import(
  "../../src/components/editor/render-ext/index.ts"
);
const { hydrateLazyContainers, collectLazyJobs, observeLazyContainers } = await import(
  "../../src/components/editor/render-ext/lazy-container.ts"
);
const { renderKatexLazy } = await import(
  "../../src/components/editor/render-ext/katex.ts"
);

configureMarkdownSanitizer(win.window);
registerRenderExtension({
  install: installRenderExt,
});

function mdOnly(src) {
  const md = new MarkdownIt();
  installRenderExt(md);
  return md.render(src);
}

// ── markdown-it 规则（bare 实例，不经过 vendor DOMPurify）──

test("mermaid fence 渲染成惰性容器（源码保留在 data-yeli-src）", () => {
  const html = mdOnly("```mermaid\nflowchart LR\n  A --> B\n```");
  assert.match(html, /data-yeli-lazy="mermaid"/);
  const decoded = decodeURIComponent(/data-yeli-src="([^"]*)"/.exec(html)[1]);
  assert.equal(decoded, "flowchart LR\n  A --> B");
});

test("echarts fence 渲染成惰性容器", () => {
  const html = mdOnly('```echarts\n{"series":[{"type":"bar","data":[1,2,3]}]}\n```');
  assert.match(html, /data-yeli-lazy="echarts"/);
  const decoded = decodeURIComponent(/data-yeli-src="([^"]*)"/.exec(html)[1]);
  assert.equal(decoded, '{"series":[{"type":"bar","data":[1,2,3]}]}');
});

test("普通语言 fence 走 highlight.js 高亮（不产生惰性容器）", () => {
  const html = mdOnly("```js\nconst a = 1;\n```");
  assert.match(html, /class="hljs/);
  assert.doesNotMatch(html, /data-yeli-lazy/);
  assert.match(html, /language-js/);
});

test("无语言 fence 退化为转义源码", () => {
  const html = mdOnly("```\nplain & <text>\n```");
  assert.doesNotMatch(html, /data-yeli-lazy/);
  assert.match(html, /&lt;text&gt;/);
});

test("$$...$$ 块级公式 → KaTeX 惰性容器（div，data-yeli-lazy=katex，源码在 data-yeli-src）", () => {
  const raw = mdOnly("$$\nx^2 + y^2\n$$");
  assert.match(raw, /<div class="yeli-lazy yeli-katex-display"/);
  assert.match(raw, /data-yeli-lazy="katex"/);
  const decoded = decodeURIComponent(/data-yeli-src="([^"]*)"/.exec(raw)[1]);
  assert.equal(decoded, "x^2 + y^2");
});

test("行内 $...$ → KaTeX 惰性容器（span，data-yeli-lazy=katex）", () => {
  const raw = mdOnly("质能方程 $E = mc^2$ 结尾");
  assert.match(raw, /<span class="yeli-lazy yeli-katex-inline"/);
  assert.match(raw, /data-yeli-lazy="katex"/);
  const decoded = decodeURIComponent(/data-yeli-src="([^"]*)"/.exec(raw)[1]);
  assert.equal(decoded, "E = mc^2");
});

// ── vendor 渲染边界集成（happy-dom 的 DOMPurify 会剥掉块级包装元素，故
//    只断言内层产物存活，证明扩展规则被安装到 vendor 渲染器上）──

test("vendor 渲染边界已挂 mermaid 扩展（fence 规则被安装，内层 code 带 hljs）", () => {
  const html = renderDocumentMarkdown("```mermaid\nflowchart LR\n  A --> B\n```", {});
  assert.match(html, /class="hljs language-mermaid"/);
});

test("vendor 渲染边界下 KaTeX 惰性容器存活（happy-dom 剥块级 div，inline span + data-yeli-lazy 存活）", () => {
  // 块级：happy-dom 的 DOMPurify 会剥掉 div 包装（同 mermaid），断言内层产物存活。
  const block = renderDocumentMarkdown("$$\nx^2 + y^2\n$$", {});
  assert.match(block, /class="hljs language-katex"/);
  // 行内：span 与 data-yeli-lazy/data-yeli-src 不被净化剥除。
  const inline = renderDocumentMarkdown("质能方程 $E = mc^2$ 结尾", {});
  assert.match(inline, /<span class="yeli-lazy yeli-katex-inline"/);
  assert.match(inline, /data-yeli-lazy="katex"/);
  assert.match(inline, /data-yeli-src=/);
});

// ── 惰性容器生命周期（happy-dom innerHTML 直插，绕开 DOMPurify）──

test("mermaid 渲染失败 → 容器降级 raw 源码 + 错误提示，不抛异常", async () => {
  const root = win.document.createElement("div");
  root.innerHTML = mdOnly("```mermaid\nflowchart LR\n  A --> B\n```");
  const failing = {
    initialize: () => {},
    render: async () => {
      throw new Error("语法错误");
    },
  };
  await hydrateLazyContainers(root, renderersFor({ mermaid: failing }));
  const host = root.querySelector("[data-yeli-lazy='mermaid']");
  assert.ok(host.hasAttribute("data-yeli-lazy-failed"));
  assert.ok(host.classList.contains("yeli-lazy-error"));
  assert.ok(host.querySelector(".yeli-lazy-error-note"));
  assert.ok(host.querySelector("code"));
});

test("mermaid 渲染成功 → 容器标记 done", async () => {
  const root = win.document.createElement("div");
  root.innerHTML = mdOnly("```mermaid\nflowchart LR\n  A --> B\n```");
  const ok = {
    initialize: () => {},
    render: async () => ({ svg: "<svg></svg>" }),
  };
  await hydrateLazyContainers(root, renderersFor({ mermaid: ok }));
  const host = root.querySelector("[data-yeli-lazy='mermaid']");
  assert.ok(host.hasAttribute("data-yeli-lazy-done"));
});

test("echarts option 非法 JSON → 降级，不抛异常", async () => {
  const root = win.document.createElement("div");
  root.innerHTML = mdOnly("```echarts\nnot-json\n```");
  await hydrateLazyContainers(root, renderersFor({}));
  const host = root.querySelector("[data-yeli-lazy='echarts']");
  assert.ok(host.hasAttribute("data-yeli-lazy-failed"));
  assert.ok(host.querySelector(".yeli-lazy-error-note"));
});

test("echarts 渲染器抛错 → 降级 raw 源码，不抛进水合调用方", async () => {
  const { _setEchartsForTest } = await import(
    "../../src/components/editor/render-ext/echarts.ts"
  );
  const root = win.document.createElement("div");
  root.innerHTML = mdOnly('```echarts\n{"series":[{"type":"bar","data":[1]}]}\n```');
  _setEchartsForTest({
    init: () => {
      throw new Error("canvas unavailable");
    },
  });
  try {
    await hydrateLazyContainers(root, renderersFor({}));
  } finally {
    _setEchartsForTest(null);
  }
  const host = root.querySelector("[data-yeli-lazy='echarts']");
  assert.ok(host.hasAttribute("data-yeli-lazy-failed"));
  assert.ok(host.querySelector("code"));
  assert.ok(host.querySelector(".yeli-lazy-error-note"));
});

test("已失败/已完成的容器不重复水合", async () => {
  const root = win.document.createElement("div");
  root.innerHTML = mdOnly("```mermaid\nflowchart LR\n  A --> B\n```");
  const failing = {
    initialize: () => {},
    render: async () => {
      throw new Error("x");
    },
  };
  const renderers = renderersFor({ mermaid: failing });
  await hydrateLazyContainers(root, renderers);
  await hydrateLazyContainers(root, renderers);
  const host = root.querySelector("[data-yeli-lazy='mermaid']");
  assert.ok(host.hasAttribute("data-yeli-lazy-failed"));
  assert.equal(collectLazyJobs(root).length, 0);
});

// ── KaTeX 惰性生命周期：进入视口/水合前不求值，聚焦后（hydrate）才渲染 ──

test("collectLazyJobs 收集 KaTeX 惰性容器（含行内与块级）", () => {
  const root = win.document.createElement("div");
  root.innerHTML = mdOnly("$$\nx^2 + y^2\n$$\n\n质能方程 $E = mc^2$ 结尾");
  const jobs = collectLazyJobs(root);
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].kind, "katex");
  assert.equal(jobs[0].source, "x^2 + y^2");
  assert.equal(jobs[1].kind, "katex");
  assert.equal(jobs[1].source, "E = mc^2");
});

test("KaTeX 容器水合前不求值，水合后才回填 .katex（style 保留）", async () => {
  const root = win.document.createElement("div");
  root.innerHTML = mdOnly("$$\nx^2 + y^2\n$$");
  assert.doesNotMatch(root.innerHTML, /class="katex"/);
  await hydrateLazyContainers(root, renderersFor({}));
  const host = root.querySelector("[data-yeli-lazy='katex']");
  assert.ok(host.hasAttribute("data-yeli-lazy-done"));
  assert.ok(host.querySelector(".katex"));
  assert.match(host.innerHTML, /style=/);
});

test("KaTeX 渲染异常 → 降级 <pre class=yeli-katex-error>，不抛异常", async () => {
  const root = win.document.createElement("div");
  root.innerHTML = mdOnly("$$\nx^2 + y^2\n$$");
  await hydrateLazyContainers(root, {
    katex: (host, source) =>
      renderKatexLazy(host, source, {
        inject: () => {
          throw new Error("katex boom");
        },
      }),
  });
  const host = root.querySelector("[data-yeli-lazy='katex']");
  assert.ok(host.hasAttribute("data-yeli-lazy-failed"));
  assert.ok(host.classList.contains("yeli-lazy-error"));
  assert.ok(host.querySelector("pre.yeli-katex-error"));
  assert.ok(host.querySelector(".yeli-lazy-error-note"));
});

test("observeLazyContainers：KaTeX 进入视口才求值（observer 触发前不求值）", async () => {
  let capturedObserver = null;
  const RealIO = globalThis.IntersectionObserver;
  class FakeIO {
    constructor(callback) {
      this.callback = callback;
      this.targets = new Set();
      capturedObserver = this;
    }
    observe(target) {
      this.targets.add(target);
    }
    unobserve(target) {
      this.targets.delete(target);
    }
    disconnect() {
      this.targets.clear();
    }
  }
  globalThis.IntersectionObserver = FakeIO;
  try {
    const root = win.document.createElement("div");
    root.innerHTML = mdOnly("$$\nx^2 + y^2\n$$");
    const dispose = observeLazyContainers(root, renderersFor({}));
    assert.ok(capturedObserver, "observer 应被创建");
    const host = root.querySelector("[data-yeli-lazy='katex']");
    assert.ok(capturedObserver.targets.has(host), "katex 容器应被 observe");
    assert.doesNotMatch(root.innerHTML, /class="katex"/, "进入视口前不求值");
    capturedObserver.callback(
      [{ isIntersecting: true, target: host }],
      capturedObserver,
    );
    assert.ok(host.hasAttribute("data-yeli-lazy-done"), "进入视口后标记 done");
    assert.ok(host.querySelector(".katex"), "进入视口后回填 .katex");
    dispose();
  } finally {
    globalThis.IntersectionObserver = RealIO;
  }
});
