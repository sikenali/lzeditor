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
});
