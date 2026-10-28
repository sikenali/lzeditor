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
const {
  installRenderExt,
  postProcessRenderExt,
  renderersFor,
} = await import("../../src/components/editor/render-ext/index.ts");
const { hydrateLazyContainers, collectLazyJobs } = await import(
  "../../src/components/editor/render-ext/lazy-container.ts"
);

configureMarkdownSanitizer(win.window);
registerRenderExtension({
  install: installRenderExt,
  postProcess: postProcessRenderExt,
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

test("$$...$$ 块级公式 → KaTeX slot，postProcess 回填为 katex HTML（style 保留）", () => {
  const raw = mdOnly("$$\nx^2 + y^2\n$$");
  assert.match(raw, /data-yeli-katex/);
  const filled = postProcessRenderExt(raw);
  assert.match(filled, /class="katex/);
  assert.match(filled, /style=/);
});

test("行内 $...$ 也回填为 katex", () => {
  const raw = mdOnly("质能方程 $E = mc^2$ 结尾");
  const filled = postProcessRenderExt(raw);
  assert.match(filled, /class="katex/);
});

// ── vendor 渲染边界集成（happy-dom 的 DOMPurify 会剥掉块级包装元素，故
//    只断言内层产物存活，证明扩展规则被安装到 vendor 渲染器上）──

test("vendor 渲染边界已挂 mermaid 扩展（fence 规则被安装，内层 code 带 hljs）", () => {
  const html = renderDocumentMarkdown("```mermaid\nflowchart LR\n  A --> B\n```", {});
  assert.match(html, /class="hljs language-mermaid"/);
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
