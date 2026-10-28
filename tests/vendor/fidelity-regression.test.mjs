import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createYeliFacade } from "../../src/components/editor/facade/YeliEditorFacade.ts";
import {
  createBlockReplacementPatch,
  projectMarkdown,
  resolveReadEditTarget,
} from "../../src/vendor/yeli/editor/block-projection.ts";
import {
  applySourcePatch,
  createSourcePatch,
  sourceDiffRange,
  sourceHash,
} from "../../src/vendor/yeli/editor/source-ranges.ts";

/**
 * 保真回归（任务 7）——对 yeli 上游 smart-write / block-projection 语义做锁定：
 *
 * 1. no-edit zero diff：加载后不重序列化，getText 逐字节等于 setText 输入；
 *    projectMarkdown 的 block 切片精确无缝隙地拼回源串。
 * 2. supported-block narrow diff：在受支持（可编辑）块内做替换，diff 收窄到
 *    该块区间，其它块逐字节不变。
 * 3. ambiguous syntax 安全回退：source-safe 块（raw-html / 引用定义 / 脚注 /
 *    数学 / 未闭合围栏 / 二义 frontmatter）被标记为不可编辑；对其做块级替换
 *    抛错而非静默改写；read→edit 目标二义时返回 fallbackReason 而非假选区。
 * 4. revision-bound stale 拒绝：过期 revision 的写入被拒绝且文档不变
 *    （facade 抛 RangeError；applySourcePatch 返回 STALE_REVISION /
 *    STALE_SOURCE_HASH）。
 *
 * 全部断言直接针对 facade 与 vendor 导出函数，不引 vitest，用 node:test。
 */

const MD = [
  "# 标题",
  "",
  "正文段落，含 **粗体** 与 `代码`。",
  "",
  "- 列表项一",
  "- 列表项二",
  "",
  "> 引用一段",
  "",
].join("\n");

describe("保真回归：no-edit zero diff", () => {
  it("facade：setText 后 getText 逐字节返回原串（零 diff，无重序列化）", () => {
    const f = createYeliFacade();
    f.setText(MD);
    assert.equal(f.getText(), MD);
    // 未做任何编辑 → diff 为空
    assert.equal(sourceDiffRange(f.getText(), f.getText()), null);
  });

  it("facade：零编辑后 revision 不虚增", () => {
    const f = createYeliFacade();
    f.setText(MD);
    const rev = f.getRevision();
    f.getText();
    assert.equal(f.getRevision(), rev);
  });

  it("projectMarkdown：source 与 sourceHash 保真，block 切片无缝拼回源串", () => {
    const projection = projectMarkdown(MD, 1);
    assert.equal(projection.source, MD);
    assert.equal(projection.sourceHash, sourceHash(MD));
    const rebuilt = projection.blocks
      .map((block) => block.expectedText)
      .join("");
    assert.equal(rebuilt, MD, "blocks.expectedText 应无缝隙无重叠地拼回 source");
    // 相邻 block 的 range 严格相接
    for (let i = 1; i < projection.blocks.length; i += 1) {
      assert.equal(
        projection.blocks[i].range.from,
        projection.blocks[i - 1].range.to,
        `block[${i}] 应与 block[${i - 1}] 相接`,
      );
    }
  });
});

describe("保真回归：supported-block narrow diff", () => {
  it("facade：段落内替换只改该段，其它块逐字节不变", () => {
    const f = createYeliFacade();
    f.setText(MD);
    const before = projectMarkdown(f.getText(), f.getRevision());
    // 在「正文段落…」内做一次窄替换（替换 `**粗体**` 为 `*强调*`）
    const para = before.blocks.find((block) => block.kind === "paragraph");
    const localFrom = para.expectedText.indexOf("**粗体**");
    const from = para.range.from + localFrom;
    const to = from + "**粗体**".length;
    f.replaceRange(from, to, "*强调*");

    const after = projectMarkdown(f.getText(), f.getRevision());
    assert.equal(after.blocks.length, before.blocks.length);
    let changed = 0;
    for (let i = 0; i < before.blocks.length; i += 1) {
      const b = before.blocks[i];
      const a = after.blocks[i];
      if (b.expectedText !== a.expectedText) {
        changed += 1;
        assert.equal(b.kind, "paragraph", "只有被编辑的段落块允许变化");
        assert.equal(b.range.from, a.range.from, "段落块区间起点不变");
      }
    }
    assert.equal(changed, 1, "恰好一个块被改动");
    // 列表、引用、标题保持原样
    assert.ok(after.blocks.some((block) => block.expectedText.includes("- 列表项一")));
    assert.ok(after.blocks.some((block) => block.expectedText.includes("> 引用一段")));
    assert.ok(after.blocks.some((block) => block.expectedText.includes("# 标题")));
  });

  it("facade：列表项内替换不改动相邻列表项与其它块", () => {
    const f = createYeliFacade();
    f.setText(MD);
    const before = projectMarkdown(f.getText(), f.getRevision());
    const listItem = before.blocks.find(
      (block) => block.kind === "list-item" && block.expectedText.includes("列表项一"),
    );
    const from = listItem.range.from + listItem.expectedText.indexOf("列表项一");
    f.replaceRange(from, from + "列表项一".length, "列表项甲");
    const after = projectMarkdown(f.getText(), f.getRevision());
    assert.equal(after.source, f.getText());
    assert.ok(after.source.includes("- 列表项甲"));
    assert.ok(after.source.includes("- 列表项二"));
    assert.ok(after.source.includes("> 引用一段"));
  });

  it("sourceDiffRange：窄替换返回收窄 diff（不改动前后缀）", () => {
    const f = createYeliFacade();
    f.setText("abcdef");
    f.replaceRange(2, 4, "XY");
    const diff = sourceDiffRange("abcdef", f.getText());
    assert.deepEqual(diff, {
      before: { from: 2, to: 4 },
      after: { from: 2, to: 4 },
    });
  });
});

describe("保真回归：ambiguous syntax 安全回退", () => {
  const AMBIGUOUS = [
    { name: "raw-html", source: "<div>hi</div>\n" },
    { name: "reference-definition", source: "[ref]: https://example.com\n" },
    // 带空格标签的脚注不被 indexFootnotes 索引 → 走正则分支，source-safe。
    { name: "footnote", source: "[^a b]: 脚注内容\n" },
    { name: "math", source: "$$\nE = mc^2\n$$\n" },
    { name: "unclosed code-fence", source: "```js\nconst a = 1;\n" },
    { name: "unknown-extension", source: ":::info\n内容\n:::\n" },
  ];

  for (const { name, source } of AMBIGUOUS) {
    it(`projectMarkdown 把 ${name} 标记为不可编辑（source-safe）`, () => {
      const projection = projectMarkdown(source, 1);
      assert.equal(projection.status, "degraded");
      const block = projection.blocks[0];
      assert.equal(block.editable, false, `${name} 应不可编辑`);
      assert.ok(block.reason, `${name} 应有降级原因`);
      // 对 source-safe 块做块级替换必须抛错，绝不静默改写
      assert.throws(
        () => createBlockReplacementPatch(block, "改写"),
        /source-safe/u,
        `${name} 的块级替换应被拒绝`,
      );
    });
  }

  it("projectMarkdown 把被引用的脚注定义为可编辑（smart-write 脚注正文路径）", () => {
    const source = "正文引用脚注[^1]\n\n[^1]: 脚注内容\n";
    const projection = projectMarkdown(source, 1);
    const footnote = projection.blocks.find((block) => block.kind === "footnote");
    assert.equal(footnote.editable, true, "被 indexFootnotes 索引的脚注应可编辑正文");
    assert.equal(projection.status, "ready");
  });

  it("projectMarkdown 标记二义 frontmatter 为不可编辑", () => {
    const source = "---\nnot: valid: yaml: here\n---\n正文\n";
    const projection = projectMarkdown(source, 1);
    const front = projection.blocks.find((block) => block.kind === "frontmatter");
    assert.equal(front.editable, false);
    assert.equal(front.reason, "ambiguous-frontmatter");
  });

  it("resolveReadEditTarget：selectionWasAmbiguous 回退为 selection-ambiguous，不产假选区", () => {
    const projection = projectMarkdown("# hi\n\npara\n", 1);
    const block = projection.blocks.find((item) => item.kind === "heading");
    const result = resolveReadEditTarget(projection, {
      block,
      revision: projection.revision,
      selection: {
        start: 0,
        end: 2,
        renderedText: "hi",
        selectedText: "hi",
      },
      selectionWasAmbiguous: true,
      sourceHash: projection.sourceHash,
      viewportTop: 0,
    });
    assert.equal(result.fallbackReason, "selection-ambiguous");
    assert.equal(result.selection, undefined, "二义目标不应携带可写选区");
    assert.equal(result.block, block);
  });

  it("resolveReadEditTarget：revision 不匹配回退为 stale-target", () => {
    const projection = projectMarkdown("# hi\n\npara\n", 2);
    const block = projection.blocks.find((item) => item.kind === "heading");
    const result = resolveReadEditTarget(projection, {
      block,
      revision: 1, // 过期
      selection: null,
      selectionWasAmbiguous: false,
      sourceHash: projection.sourceHash,
      viewportTop: 0,
    });
    assert.equal(result.fallbackReason, "stale-target");
    assert.equal(result.selection, undefined);
  });

  it("resolveReadEditTarget：选区与渲染文本不符回退为 selection-ambiguous", () => {
    const projection = projectMarkdown("# hi\n\npara\n", 1);
    const block = projection.blocks.find((item) => item.kind === "heading");
    const result = resolveReadEditTarget(projection, {
      block,
      revision: projection.revision,
      selection: {
        start: 0,
        end: 2,
        renderedText: "hi",
        selectedText: "WRONG", // 渲染与选区不一致
      },
      selectionWasAmbiguous: false,
      sourceHash: projection.sourceHash,
      viewportTop: 0,
    });
    assert.equal(result.fallbackReason, "selection-ambiguous");
    assert.equal(result.selection, undefined);
  });
});

describe("保真回归：revision-bound stale 拒绝", () => {
  it("facade：过期 revision 的 insertText 抛 RangeError 且文档不变", () => {
    const f = createYeliFacade();
    f.setText("hello");
    const stale = f.getRevision();
    f.replaceRange(0, 0, "!!"); // 用户中途编辑，revision 前移
    assert.throws(() => f.insertText("stale", { from: 2, to: 2 }, stale), RangeError);
    assert.equal(f.getText(), "!!hello");
  });

  it("facade：过期 revision 的 insertText 不写入（revision 不再前进）", () => {
    const f = createYeliFacade();
    f.setText("a");
    const stale = f.getRevision();
    f.replaceRange(1, 1, "b");
    const afterUserEdit = f.getRevision();
    assert.throws(() => f.insertText("c", { from: 2, to: 2 }, stale));
    assert.equal(f.getRevision(), afterUserEdit, "被拒写入不得推进 revision");
  });

  it("facade：携带当前 revision 的写入正常通过（revision 前进 1）", () => {
    const f = createYeliFacade();
    f.setText("a");
    const rev = f.getRevision();
    f.insertText("b", { from: 1, to: 1 }, rev);
    assert.equal(f.getText(), "ab");
    assert.equal(f.getRevision(), rev + 1);
  });

  it("applySourcePatch：revision 不匹配返回 STALE_REVISION", () => {
    const source = "abc";
    const patch = createSourcePatch(
      {
        id: "document",
        expectedText: source,
        range: { from: 0, to: source.length },
        revision: 5,
        sourceHash: sourceHash(source),
      },
      "x",
      "replace",
      { from: 1, to: 1 },
    );
    const result = applySourcePatch(source, { revision: 4 }, patch);
    assert.equal(result.ok, false);
    assert.equal(result.code, "STALE_REVISION");
  });

  it("applySourcePatch：sourceHash 不匹配返回 STALE_SOURCE_HASH", () => {
    const source = "abc";
    const patch = createSourcePatch(
      {
        id: "document",
        expectedText: source,
        range: { from: 0, to: source.length },
        revision: 1,
        sourceHash: "deadbeef", // 与真实 hash 不符
      },
      "x",
      "replace",
      { from: 1, to: 1 },
    );
    const result = applySourcePatch(source, { revision: 1 }, patch);
    assert.equal(result.ok, false);
    assert.equal(result.code, "STALE_SOURCE_HASH");
  });

  it("applySourcePatch：范围越界返回 INVALID_RANGE 且源串不变", () => {
    // createSourcePatch 会挡住越界 range，这里直接构造补丁以命中
    // applySourcePatch 自身的 INVALID_RANGE 守卫（防御纵深）。
    const source = "abc";
    const patch = {
      blockId: "document",
      expectedText: source.slice(0, 999),
      insert: "x",
      operation: "replace",
      range: { from: 0, to: 999 },
      revision: 1,
      sourceHash: sourceHash(source),
    };
    const result = applySourcePatch(source, { revision: 1 }, patch);
    assert.equal(result.ok, false);
    assert.equal(result.code, "INVALID_RANGE");
    assert.equal(result.source, source);
  });

  it("applySourcePatch：合法写入推进 revision 并重算 hash", () => {
    const source = "abc";
    const patch = createSourcePatch(
      {
        id: "document",
        expectedText: source,
        range: { from: 0, to: source.length },
        revision: 1,
        sourceHash: sourceHash(source),
      },
      "XY",
      "replace",
      { from: 1, to: 2 },
    );
    const result = applySourcePatch(source, { revision: 1 }, patch);
    assert.equal(result.ok, true);
    assert.equal(result.source, "aXYc");
    assert.equal(result.revision, 2);
    assert.equal(result.sourceHash, sourceHash("aXYc"));
    assert.equal(result.changedRange.before.from, 1);
  });
});
