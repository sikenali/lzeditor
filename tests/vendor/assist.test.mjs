import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

// assist 纯逻辑无 DOM 依赖；wiring 用例需要 DOM（事件分派），用 happy-dom 提供。
const win = new Window();
globalThis.window = win.window;
globalThis.document = win.document;
globalThis.navigator = win.navigator;
globalThis.HTMLElement = win.window.HTMLElement;
globalThis.Element = win.window.Element;
globalThis.Node = win.window.Node;
globalThis.NodeFilter = win.window.NodeFilter;
globalThis.Text = win.window.Text;
globalThis.requestAnimationFrame = () => 0;

const {
  autopairInsertion,
  autopairBackspace,
  isInsideCode,
  installAutopair,
} = await import("../../src/components/editor/assist/autopair.ts");
const {
  singleUrl,
  tsvRows,
  tableFromRows,
  linkMarkdown,
  imageMarkdown,
  installSmartPaste,
} = await import("../../src/components/editor/assist/smart-paste.ts");
const {
  typewriterScrollDelta,
  installTypewriter,
} = await import("../../src/components/editor/assist/typewriter.ts");
const {
  installFocusMode,
} = await import("../../src/components/editor/assist/focus-mode.ts");
const {
  createYeliFacade,
} = await import("../../src/components/editor/facade/YeliEditorFacade.ts");
const {
  YELI_LABELS_ZH,
} = await import("../../src/components/editor/yeli-labels.ts");

// ── autopair 纯逻辑 ──────────────────────────────────────────────────────────

test("autopairInsertion：`(`/`[`/`\"`/`*` 生成成对符，光标置于中间", () => {
  const source = "ab";
  assert.deepEqual(autopairInsertion(source, 1, "("), { insertion: "()", caretDelta: 1 });
  assert.deepEqual(autopairInsertion(source, 1, "["), { insertion: "[]", caretDelta: 1 });
  assert.deepEqual(autopairInsertion(source, 1, '"'), { insertion: '""', caretDelta: 1 });
  assert.deepEqual(autopairInsertion(source, 1, "*"), { insertion: "**", caretDelta: 1 });
});

test("autopairInsertion：非配对字符/越界/紧跟闭符 → null", () => {
  assert.equal(autopairInsertion("ab", 1, "x"), null);
  assert.equal(autopairInsertion("ab", -1, "("), null);
  assert.equal(autopairInsertion("ab", 3, "("), null);
  // 光标后已是闭符 → 不再插入。
  assert.equal(autopairInsertion("()", 1, "("), null);
});

test("autopairInsertion：代码上下文内关闭配对", () => {
  assert.equal(autopairInsertion("`code`", 3, "("), null);
  assert.equal(autopairInsertion("```\ncode\n```", 7, "("), null);
  // 普通文本内仍配对。
  assert.ok(autopairInsertion("hello world", 5, "("));
});

test("isInsideCode：行内代码与围栏代码块", () => {
  assert.equal(isInsideCode("`code` here", 3), true);
  assert.equal(isInsideCode("`code` here", 9), false);
  assert.equal(isInsideCode("```js\nconst a = 1;\n```", 14), true);
  assert.equal(isInsideCode("plain text", 5), false);
});

test("autopairBackspace：空配对整对删除，否则 null", () => {
  assert.deepEqual(autopairBackspace("a()b", 2), { from: 1, to: 3 });
  assert.deepEqual(autopairBackspace("a[]b", 2), { from: 1, to: 3 });
  assert.deepEqual(autopairBackspace('a""b', 2), { from: 1, to: 3 });
  assert.deepEqual(autopairBackspace("a**b", 2), { from: 1, to: 3 });
  assert.equal(autopairBackspace("a(b", 2), null);
  assert.equal(autopairBackspace("ab", 0), null);
});

// ── smart-paste 纯逻辑 ───────────────────────────────────────────────────────

test("singleUrl：识别 URL，忽略普通文本", () => {
  assert.equal(singleUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(singleUrl("  mailto:x@y.z  "), "mailto:x@y.z");
  assert.equal(singleUrl("hello world"), null);
});

test("tsvRows：行宽一致且 ≥2 列才算表格", () => {
  assert.deepEqual(tsvRows("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
  assert.equal(tsvRows("single\tcolumn"), null);
  assert.equal(tsvRows("a\tb\n1"), null);
});

test("tableFromRows：GFM 表格（管道转义 + 分隔行）", () => {
  const md = tableFromRows([["a", "b|c"], ["1", "2"]]);
  assert.equal(md, "| a | b\\|c |\n| --- | --- |\n| 1 | 2 |");
});

test("linkMarkdown / imageMarkdown", () => {
  assert.equal(linkMarkdown("https://x.y"), "[https://x.y](https://x.y)");
  assert.equal(linkMarkdown("https://x.y", "链接文字"), "[链接文字](https://x.y)");
  assert.equal(imageMarkdown("图", "blob:abc"), "![图](blob:abc)");
});

// ── typewriter / focus-mode 纯逻辑 ──────────────────────────────────────────

test("typewriterScrollDelta：光标在可视带内 → 0，带外 → 滚到 anchor", () => {
  // 容器 top=0 height=600，anchor=240。
  assert.equal(typewriterScrollDelta(300, 0, 600), 0);
  assert.equal(typewriterScrollDelta(900, 0, 600), Math.round(240 - 900));
  assert.equal(typewriterScrollDelta(-100, 0, 600), Math.round(240 - -100));
});

// ── facade 集成：typed 事务 + execCommand 完整路由 ──────────────────────────

test("autopair 输入经 facade replaceRange typed 事务落库", () => {
  const facade = createYeliFacade();
  facade.setText("hello world");
  const ins = autopairInsertion(facade.getText(), 5, "(");
  assert.ok(ins);
  facade.replaceRange(5, 5, ins.insertion);
  assert.equal(facade.getText(), "hello() world");
});

test("smart-paste URL/表格经 facade replaceRange 落库", () => {
  const facade = createYeliFacade();
  facade.setText("看这里");
  const url = singleUrl("https://example.com");
  assert.ok(url);
  facade.replaceRange(3, 3, linkMarkdown(url, "看这里"));
  assert.equal(facade.getText(), "看这里[看这里](https://example.com)");
});

test("execCommand：selection.bold 用真实命令名包裹选区", () => {
  const facade = createYeliFacade({ labels: YELI_LABELS_ZH, locale: "zh-CN" });
  facade.setText("hello world");
  facade.setSelection(0, 5);
  facade.execCommand("selection.bold");
  assert.equal(facade.getText(), "**hello** world");
});

test("execCommand：selection.* 在 #selection 为空时从 DOM 选区兜底（不经 setSelection 绕过链）", () => {
  const root = win.document.createElement("div");
  root.className = "yeli-canvas-shell";
  const shell = win.document.createElement("div");
  shell.setAttribute("data-source-from", "0");
  shell.setAttribute("data-source-to", "11");
  const editable = win.document.createElement("div");
  editable.className = "block-content-editable";
  editable.contentEditable = "true";
  editable.textContent = "hello world";
  shell.append(editable);
  root.append(shell);
  win.document.body.append(root);
  // 建立 DOM 选区：选中 "hello"（源码偏移 0..5）。
  const textNode = editable.firstChild;
  const range = win.document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, 5);
  const selection = win.window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  const facade = createYeliFacade({ labels: YELI_LABELS_ZH, locale: "zh-CN" });
  facade.setText("hello world");
  // 不调 setSelection（模拟 typewriter 未同步）：selection.bold 应经 DOM 兜底生效。
  facade.execCommand("selection.bold");
  assert.equal(facade.getText(), "**hello** world");
  root.remove();
});

test("execCommand：斜杠插入命令（insert.paragraph）追加段落", () => {
  const facade = createYeliFacade({ labels: YELI_LABELS_ZH, locale: "zh-CN" });
  facade.setText("# 标题");
  facade.execCommand("insert.paragraph");
  assert.match(facade.getText(), /\n正文\n/);
});

test("execCommand：未知命令抛错，undo/redo 直接透传", () => {
  const facade = createYeliFacade({ labels: YELI_LABELS_ZH, locale: "zh-CN" });
  facade.setText("abc");
  assert.throws(() => facade.execCommand("no.such.command"));
  facade.setSelection(0, 1);
  facade.execCommand("selection.bold");
  assert.equal(facade.undo(), true);
});

// ── wiring：键盘/paste 事件 → facade typed 事务 ─────────────────────────────

function stubFacade() {
  const calls = [];
  return {
    calls,
    replaceRange: (from, to, text) => calls.push(["replaceRange", from, to, text]),
    insertText: (text) => calls.push(["insertText", text]),
    getText: () => "hello world",
    getSelection: () => null,
    setSelection: () => {},
    onSelectionChange: () => () => {},
  };
}

test("installAutopair：键入 `(` → facade.replaceRange(offset, offset, '()')", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  const uninstall = installAutopair(root, facade, { readOffset: () => 5 });
  const event = new win.window.KeyboardEvent("keydown", {
    key: "(",
    bubbles: true,
    cancelable: true,
  });
  root.dispatchEvent(event);
  uninstall();
  assert.deepEqual(facade.calls, [["replaceRange", 5, 5, "()"]]);
});

test("installAutopair：Backspace 空配对 → facade.replaceRange 整对删除", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  facade.getText = () => "a()b";
  const uninstall = installAutopair(root, facade, { readOffset: () => 2 });
  const event = new win.window.KeyboardEvent("keydown", {
    key: "Backspace",
    bubbles: true,
    cancelable: true,
  });
  root.dispatchEvent(event);
  uninstall();
  assert.deepEqual(facade.calls, [["replaceRange", 1, 3, ""]]);
});

test("installAutopair：普通字符不拦截（不 preventDefault）", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  const uninstall = installAutopair(root, facade, { readOffset: () => 5 });
  const event = new win.window.KeyboardEvent("keydown", {
    key: "a",
    bubbles: true,
    cancelable: true,
  });
  root.dispatchEvent(event);
  uninstall();
  assert.deepEqual(facade.calls, []);
});

function pasteEvent(win, text, files = []) {
  const event = new win.window.Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: {
      getData: (type) => (type === "text/plain" ? text : ""),
      files,
    },
  });
  return event;
}

test("installSmartPaste：URL → 链接事务", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  const uninstall = installSmartPaste(root, facade, { readOffset: () => 5 });
  const event = pasteEvent(win, "https://example.com");
  root.dispatchEvent(event);
  uninstall();
  assert.equal(facade.calls.length, 1);
  assert.equal(facade.calls[0][0], "replaceRange");
  assert.match(facade.calls[0][3], /^\[.*\]\(https:\/\/example\.com\)$/);
  assert.equal(event.defaultPrevented, true);
});

test("installSmartPaste：智能分派失败回退默认粘贴（不 preventDefault，不静默丢内容）", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  // 事务失败（如 stale revision / 越界）：必须不接管事件，交默认粘贴。
  facade.replaceRange = () => {
    throw new Error("事务失败");
  };
  const uninstall = installSmartPaste(root, facade, { readOffset: () => 5 });
  const event = pasteEvent(win, "https://example.com");
  root.dispatchEvent(event);
  uninstall();
  assert.equal(event.defaultPrevented, false);
});

test("installSmartPaste：图片事务失败也不接管事件（默认粘贴接管，不静默丢图）", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  facade.replaceRange = () => {
    throw new Error("事务失败");
  };
  const blob = { type: "image/png", name: "a.png" };
  const uninstall = installSmartPaste(root, facade, {
    readOffset: () => 0,
    onImageBlob: () => "asset://paste.png",
  });
  const event = pasteEvent(win, "", [blob]);
  root.dispatchEvent(event);
  uninstall();
  assert.equal(event.defaultPrevented, false);
});

test("installSmartPaste：URL 且有选区 → 用选区文字作链接并替换选区区间", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  facade.getText = () => "看这里 hello";
  facade.getSelection = () => ({ from: 0, to: 3 });
  const uninstall = installSmartPaste(root, facade, { readOffset: () => 3 });
  const event = pasteEvent(win, "https://example.com");
  root.dispatchEvent(event);
  uninstall();
  assert.equal(facade.calls.length, 1);
  assert.equal(facade.calls[0][1], 0);
  assert.equal(facade.calls[0][2], 3);
  assert.equal(facade.calls[0][3], "[看这里](https://example.com)");
});

test("installSmartPaste：TSV → 表格事务", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  const uninstall = installSmartPaste(root, facade, { readOffset: () => 0 });
  const event = pasteEvent(win, "a\tb\n1\t2");
  root.dispatchEvent(event);
  uninstall();
  assert.equal(facade.calls.length, 1);
  assert.equal(facade.calls[0][3], "| a | b |\n| --- | --- |\n| 1 | 2 |");
  assert.equal(event.defaultPrevented, true);
});

test("installSmartPaste：默认文本不拦截（交 vendor canvas）", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  const uninstall = installSmartPaste(root, facade, { readOffset: () => 5 });
  const event = pasteEvent(win, "plain text here");
  root.dispatchEvent(event);
  uninstall();
  assert.deepEqual(facade.calls, []);
  assert.equal(event.defaultPrevented, false);
});

test("installSmartPaste：图片 → 图片块事务（onImageBlob 提供 src）", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  const blob = { type: "image/png", name: "a.png" };
  const uninstall = installSmartPaste(root, facade, {
    readOffset: () => 0,
    onImageBlob: () => "asset://paste.png",
  });
  const event = pasteEvent(win, "", [blob]);
  root.dispatchEvent(event);
  uninstall();
  assert.equal(facade.calls.length, 1);
  assert.match(facade.calls[0][3], /^!\[.*\]\(asset:\/\/paste\.png\)$/);
  assert.equal(event.defaultPrevented, true);
});

test("installTypewriter：selectionchange 同步 facade.setSelection", () => {
  const root = win.document.createElement("div");
  const facade = stubFacade();
  facade.setSelection = (from, to) => facade.calls.push(["setSelection", from, to]);
  const uninstall = installTypewriter(root, facade, {
    readOffset: () => 7,
    follow: false,
  });
  win.document.dispatchEvent(new win.window.Event("selectionchange"));
  uninstall();
  assert.deepEqual(facade.calls, [["setSelection", 7, 7]]);
});

test("installFocusMode：焦点进出切换 yeli-focus-mode class", () => {
  const root = win.document.createElement("div");
  const editable = win.document.createElement("div");
  editable.className = "block-content-editable";
  editable.contentEditable = "true";
  root.append(editable);
  const facade = stubFacade();
  const uninstall = installFocusMode(root, facade);
  assert.equal(root.classList.contains("yeli-focus-mode"), false);
  editable.dispatchEvent(new win.window.FocusEvent("focusin", { bubbles: true }));
  assert.equal(root.classList.contains("yeli-focus-mode"), true);
  root.dispatchEvent(
    new win.window.FocusEvent("focusout", { bubbles: true, relatedTarget: null }),
  );
  assert.equal(root.classList.contains("yeli-focus-mode"), false);
  uninstall();
});
