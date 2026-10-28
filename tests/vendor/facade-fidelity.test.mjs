import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createYeliFacade } from "../../src/components/editor/facade/YeliEditorFacade.ts";
import { planApply } from "../../src/hooks/aiApply.ts";

describe("YeliEditorFacade fidelity", () => {
  const MD = "# 标题\n\n正文段落，含 **粗体**。\n\n- 列表项一\n- 列表项二\n";

  it("no-edit zero diff: setText then getText returns identical md", () => {
    const f = createYeliFacade();
    f.setText(MD);
    assert.equal(f.getText(), MD);
  });

  it("replaceRange keeps surrounding markdown intact", () => {
    const f = createYeliFacade();
    f.setText(MD);
    f.replaceRange(2, 4, "新标题");
    assert.ok(f.getText().includes("# 新标题"));
    assert.ok(f.getText().includes("- 列表项二\n"));
  });

  it("insertText at end appends", () => {
    const f = createYeliFacade();
    f.setText("abc");
    f.insertText("def");
    assert.equal(f.getText(), "abcdef");
  });

  it("rejects out-of-range replace", () => {
    const f = createYeliFacade();
    f.setText("abc");
    assert.throws(() => f.replaceRange(0, 999, "x"));
    assert.equal(f.getText(), "abc");
  });

  it("onChange emits fidelity md after edits", () => {
    const f = createYeliFacade();
    let out = "";
    f.onChange((md) => {
      out = md;
    });
    f.setText(MD);
    f.insertText("tail");
    assert.ok(out.endsWith("tail"));
  });

  it("getRevision increments per transaction", () => {
    const f = createYeliFacade();
    f.setText("a");
    const rev = f.getRevision();
    f.insertText("b");
    assert.equal(f.getRevision(), rev + 1);
  });

  it("insertText at a collapsed anchor inserts at that point", () => {
    const f = createYeliFacade();
    f.setText("hello world");
    f.insertText("AI ", { from: 0, to: 0 });
    assert.equal(f.getText(), "AI hello world");
  });

  it("insertText at a non-collapsed anchor replaces the selection", () => {
    const f = createYeliFacade();
    f.setText("hello world");
    f.insertText("AI", { from: 0, to: 5 });
    assert.equal(f.getText(), "AI world");
  });

  it("stale-revision insert throws and leaves the document unchanged", () => {
    const f = createYeliFacade();
    f.setText("hello");
    const rev = f.getRevision();
    // 用户中途编辑，revision 前移
    f.replaceRange(0, 0, "!!");
    assert.throws(() => f.insertText("stale", { from: 2, to: 2 }, rev));
    assert.equal(f.getText(), "!!hello");
  });

  it("streaming interleaved with user edits never loses content", () => {
    const f = createYeliFacade();
    f.setText("hello world");
    let anchor = { from: 6, to: 6 };
    let rev = f.getRevision();

    // AI 流式：逐 chunk 事务，anchor 随插入前移，revision 递增
    f.insertText("AI ", anchor, rev);
    anchor = { from: anchor.from + 3, to: anchor.from + 3 };
    rev = f.getRevision();
    f.insertText("answer", anchor, rev);
    assert.equal(f.getText(), "hello AI answerworld");

    // 用户在此期间在别处编辑（revision 再前移）
    f.replaceRange(0, 0, ">> ");
    const userEditRev = f.getRevision();

    // 过期 chunk：revision 不匹配 → 丢弃，不覆盖用户最新内容
    const nextAnchor = { from: anchor.from + 6, to: anchor.from + 6 };
    assert.throws(() => f.insertText("STALE", nextAnchor, rev));
    assert.equal(f.getText(), ">> hello AI answerworld");
    assert.ok(f.getText().includes(">> "));
    assert.ok(!f.getText().includes("STALE"));

    // 新流式（携带最新 revision）仍可正常插入
    f.insertText(" fresh", { from: f.getText().length, to: f.getText().length }, userEditRev);
    assert.ok(f.getText().endsWith(" fresh"));
  });

  it("insertCodeBlock wraps code with a fenced language block", () => {
    const f = createYeliFacade();
    f.setText("");
    f.insertCodeBlock("js", "const a = 1;");
    assert.equal(f.getText(), "```js\nconst a = 1;\n```");
  });

  it("insertFormula wraps formula in an inline math span", () => {
    const f = createYeliFacade();
    f.setText("");
    f.insertFormula("E = mc^2");
    assert.equal(f.getText(), "$$E = mc^2$$");
  });

  it("insertCode anchors at cursor when a selection is provided", () => {
    const f = createYeliFacade();
    f.setText("hello world");
    // 光标在「hello |world」处：插入应落在此处，而非文末
    f.insertText("```js\nconst a = 1;\n```", { from: 6, to: 6 });
    assert.ok(f.getText().startsWith("hello ```js\nconst a = 1;\n```world"));
    assert.equal(f.getText(), "hello ```js\nconst a = 1;\n```world");
  });
});

describe("YeliEditorFacade search/replace (B1)", () => {
  const OPT = (over = {}) => ({
    term: "foo", regex: false, caseSensitive: false, wholeWord: false, ...over,
  });

  it("searchMatches counts literal hits and highlights the first", () => {
    const f = createYeliFacade();
    f.setText("foo bar foo baz");
    const n = f.searchMatches(OPT());
    assert.equal(n, 2);
    // 高亮重置到第一处
    assert.deepEqual(f.getSelection(), { from: 0, to: 3 });
  });

  it("case-sensitive search only matches exact case", () => {
    const f = createYeliFacade();
    f.setText("Foo foo FOO");
    assert.equal(f.searchMatches(OPT({ term: "foo", caseSensitive: true })), 1);
  });

  it("wholeWord search requires non-whitespace boundaries", () => {
    const f = createYeliFacade();
    f.setText("foo foobar foo");
    assert.equal(f.searchMatches(OPT({ wholeWord: true })), 2);
  });

  it("regex search compiles the term and throws on invalid pattern", () => {
    const f = createYeliFacade();
    f.setText("abc123");
    assert.equal(f.searchMatches(OPT({ term: "\\d+", regex: true })), 1);
    assert.throws(() => f.searchMatches(OPT({ term: "(", regex: true })), RangeError);
  });

  it("findNext/findPrev wrap around the match list", () => {
    const f = createYeliFacade();
    f.setText("foo x foo y foo");
    f.searchMatches(OPT());
    assert.equal(f.findNext(), true);
    assert.deepEqual(f.getSelection(), { from: 6, to: 9 });
    assert.equal(f.findNext(), true);
    assert.deepEqual(f.getSelection(), { from: 12, to: 15 });
    // 末处回绕到首处
    assert.equal(f.findNext(), true);
    assert.deepEqual(f.getSelection(), { from: 0, to: 3 });
    // 首处回绕到末处
    assert.equal(f.findPrev(), true);
    assert.deepEqual(f.getSelection(), { from: 12, to: 15 });
  });

  it("findNext returns false when there are no matches", () => {
    const f = createYeliFacade();
    f.setText("bar");
    assert.equal(f.searchMatches(OPT()), 0);
    assert.equal(f.findNext(), false);
  });

  it("replaceCurrent replaces the highlighted hit and advances to the next", () => {
    const f = createYeliFacade();
    f.setText("foo foo");
    f.searchMatches(OPT());
    const remaining = f.replaceCurrent("bar");
    assert.equal(remaining, 1, "替换一处后还剩一处");
    assert.equal(f.getText(), "bar foo");
    // 自动前进到下一处
    assert.deepEqual(f.getSelection(), { from: 4, to: 7 });
  });

  it("replaceCurrent replaces the highlighted hit after navigation, not the first (issue 1)", () => {
    const f = createYeliFacade();
    f.setText("foo foo foo");
    f.searchMatches(OPT());
    // 导航到第 2 处（index 1）
    assert.equal(f.findNext(), true);
    assert.deepEqual(f.getSelection(), { from: 4, to: 7 });
    // 面板在 replace 前会先重建命中集（相同查询参数）——不应把高亮重置回第一处
    f.searchMatches(OPT());
    assert.deepEqual(f.getSelection(), { from: 4, to: 7 }, "重建命中集不应重置高亮到第一处");
    const remaining = f.replaceCurrent("bar");
    assert.equal(remaining, 2);
    assert.equal(f.getText(), "foo bar foo", "应替换当前高亮处（第 2 处），而非第 1 处");
  });

  it("replaceAll replaces every hit and clears the match set", () => {
    const f = createYeliFacade();
    f.setText("foo foo foo");
    f.searchMatches(OPT());
    const replaced = f.replaceAll("bar");
    assert.equal(replaced, 3);
    assert.equal(f.getText(), "bar bar bar");
    // 命中集已清空
    assert.equal(f.findNext(), false);
  });
});

describe("planApply stale protection", () => {
  const STREAM_BASE = {
    active: false, stale: false, anchor: null, expectedRev: -1,
    originalText: "", insertStart: 0, totalLen: 0,
  };

  it("stale first chunk: skips replaceRange, does not throw, doc unchanged", () => {
    let replaced = 0;
    const f = {
      getText: () => "hello world",
      getSelection: () => null,
      replaceRange: () => { replaced += 1; },
    };
    // 模拟首 chunk 即 revision 不匹配：active=true 但 totalLen=0（insert 抛错未递增）
    const s = { ...STREAM_BASE, active: true, stale: true, insertStart: 0 };
    let plan;
    assert.doesNotThrow(() => { plan = planApply(f, s, "AI output", "continue"); });
    assert.equal(replaced, 0, "stale 时绝不调用 replaceRange 覆盖用户内容");
    assert.equal(plan.wrote, false);
    assert.equal(plan.record.newText, "");
    assert.deepEqual(plan.record.position, { from: 0, to: 0 });
  });

  it("out-of-range replace: caught, does not throw uncaught RangeError", () => {
    const f = {
      getText: () => "abc",
      getSelection: () => ({ from: 999, to: 999 }),
      replaceRange: () => { throw new RangeError("out of range"); },
    };
    let plan;
    assert.doesNotThrow(() => { plan = planApply(f, { ...STREAM_BASE }, "out", "continue"); });
    assert.equal(plan.wrote, false);
    assert.equal(plan.record.newText, "");
    assert.deepEqual(plan.record.position, { from: 999, to: 999 });
  });

  it("normal apply replaces the selection at cursor", () => {
    const calls = [];
    const f = {
      getText: () => "hello world",
      getSelection: () => ({ from: 6, to: 6 }),
      replaceRange: (from, to, t) => calls.push([from, to, t]),
    };
    const plan = planApply(f, { ...STREAM_BASE }, "AI", "continue");
    assert.equal(plan.wrote, true);
    assert.deepEqual(calls, [[6, 6, "AI"]]);
    assert.deepEqual(plan.record.position, { from: 6, to: 8 });
  });

  it("streamed content records applied range without re-inserting", () => {
    const f = {
      getText: () => "hello AI answer world",
      getSelection: () => null,
      replaceRange: () => { throw new Error("must not re-insert streamed content"); },
    };
    const s = { ...STREAM_BASE, active: true, insertStart: 6, totalLen: 16 };
    const plan = planApply(f, s, "hello AI answer", "continue");
    assert.equal(plan.wrote, false);
    assert.equal(plan.record.newText, "hello AI answer");
    assert.deepEqual(plan.record.position, { from: 6, to: 22 });
  });
});
