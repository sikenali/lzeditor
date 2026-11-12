// tests/textus-source-control.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveExternalWrite } from "../src/additional/milkdown/textus/editor/source-control";
import { Window } from "happy-dom";
import {
  Editor,
  rootCtx,
  defaultValueCtx,
  parserCtx,
} from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { listener } from "@milkdown/kit/plugin/listener";
import {
  readSourceBlocks,
  writePreservingSource,
} from "../src/additional/milkdown/textus/editor/markdown/source-preserving";
import { openedParseCtx } from "../src/additional/milkdown/textus/editor/markdown/source-parts";

test("外部 md 与当前保真输出不同才 replace，相同则 no-op", () => {
  assert.equal(resolveExternalWrite("# 同文", "# 同文").replace, false); // 已流出，不重置光标
  assert.equal(resolveExternalWrite("# 旧文", "# 新文").replace, true); // 外部真写入才替换
});

// A full-fidelity round trip needs a real Milkdown parser/serializer (an
// @milkdown editor), which `node --test` cannot run without a DOM. happy-dom
// provides one; the globals below are scoped to this test file's process
// (node --test runs each file in its own child), so they never leak to the
// other suites. The `.ts` sources are loaded as ESM because
// `src/additional/milkdown/textus/package.json` declares `"type": "module"` —
// the plain node CJS loader can't resolve `@milkdown/kit`'s ESM-only subpath
// exports (see the note in source-control.ts).
const w = new Window();
Object.assign(globalThis, {
  window: w,
  document: w.document,
  navigator: w.navigator,
  HTMLElement: w.HTMLElement,
  HTMLImageElement: w.HTMLImageElement,
  HTMLAnchorElement: w.HTMLAnchorElement,
  HTMLInputElement: w.HTMLInputElement,
  DOMParser: w.DOMParser,
  MutationObserver: w.MutationObserver,
  CustomEvent: w.CustomEvent,
  Node: w.Node,
  DocumentFragment: w.DocumentFragment,
  Element: w.Element,
  Range: w.Range,
  Event: w.Event,
  EventTarget: w.EventTarget,
  getSelection: () => w.getSelection(),
  Document: w.Document,
  getComputedStyle: w.getComputedStyle.bind(w),
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  addEventListener: w.addEventListener.bind(w),
  removeEventListener: w.removeEventListener.bind(w),
  dispatchEvent: w.dispatchEvent.bind(w),
});

/** A real Milkdown editor (commonmark + listener), built once per process. */
let editorPromise;
function makeEditor(md) {
  editorPromise ??= (async () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const editor = Editor.make().use(commonmark).use(listener);
    editor.config((ctx) => {
      ctx.set(rootCtx, root);
      ctx.set(defaultValueCtx, md);
    });
    await editor.create();
    // The real editor's `openedParseRecorder` injects this; the minimal chain
    // doesn't, so inject the same default (null) the recorder would.
    await editor.action((c) => c.inject(openedParseCtx));
    return editor;
  })();
  return editorPromise;
}

test(
  "往返保真：改一个块，未动的块逐字节保留（readSourceBlocks → writePreservingSource）",
  async () => {
    const original = [
      "# 标题",
      "",
      "一段正文。",
      "",
      "- 项目一",
      "- 项目二",
      "",
      "```js",
      "const x = 1;",
      "```",
      "",
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
      "",
    ].join("\n");
    const editor = await makeEditor(original);
    const ctx = await editor.action((c) => c);
    const doc = await editor.action((c) => c.get(parserCtx)(original));
    const source = readSourceBlocks(ctx, original, doc);
    assert.ok(source, "readSourceBlocks 应能按块对上传入文本");

    const run = async (edited) => {
      // Simulate editing ONE block: parse the edited markdown into the doc
      // the editor would hold, then write back through the source-preserving
      // serializer.
      const editedDoc = await editor.action((c) => c.get(parserCtx)(edited));
      return writePreservingSource(ctx, source, editedDoc);
    };

    // 1) 改一段正文：未动的标题/列表/代码块/表格必须逐字节保留。
    const edited = original.replace("一段正文。", "一段改过的正文。");
    const out = await run(edited);
    assert.equal(out, edited, "只替换改过的那一段，其余原样");
    assert.ok(out.startsWith("# 标题"));
    assert.ok(out.includes("- 项目一\n- 项目二"));
    assert.ok(out.includes("```js\nconst x = 1;\n```"));
    assert.ok(out.includes("| A | B |\n|---|---|\n| 1 | 2 |"));
    assert.ok(out.includes("一段改过的正文。"));

    // 2) 改代码块内容：同样只有它变，其余未动。
    const edited2 = original.replace("const x = 1;", "const y = 2;");
    const out2 = await run(edited2);
    assert.equal(out2, edited2, "只替换改过的代码块，其余原样");
    assert.ok(out2.includes("```js\nconst y = 2;\n```"));
    assert.ok(out2.includes("一段正文。"));
  },
);
