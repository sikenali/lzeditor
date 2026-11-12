// tests/textus-source-control.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveExternalWrite } from "../src/additional/milkdown/textus/editor/source-control";
test("外部 md 与当前保真输出不同才 replace，相同则 no-op", () => {
  assert.equal(resolveExternalWrite("# 同文", "# 同文").replace, false); // 已流出，不重置光标
  assert.equal(resolveExternalWrite("# 旧文", "# 新文").replace, true); // 外部真写入才替换
});
