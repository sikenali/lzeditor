import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createYeliFacade } from "../../src/components/editor/facade/YeliEditorFacade.ts";

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

  it("insertFormula wraps formula in a math block", () => {
    const f = createYeliFacade();
    f.setText("");
    f.insertFormula("E = mc^2");
    assert.equal(f.getText(), "$$\nE = mc^2\n$$");
  });
});
