# Yeli 编辑器 vendor 拷贝

来源：https://github.com/whitesmell/yeli （MIT License）
钉住 commit：ade95cba294a72b8db033599367c3ddc250e2b0b
拷贝范围：src/editor、src/document、src/render、src/types、src/format/assets.ts、
src/i18n/en.ts、src/i18n/locale.ts、src/ui/{edit-canvas,metadata-inline,image-block,
image-preview,starter-assets,table-size-picker,use-document-store,use-dialog-focus}.*

同步方式：上游 main 更新后，以同一 commit 基准重新拷贝，本地只允许在
src/vendor/yeli/ 之外的适配层做改动；vendor 内改动需在 README 记录 diff 原因。

License：MIT，见 docs/third-party-notices-yeli.md。

## 与上游的差异（vendor 内改动记录）

1. `src/i18n/en.ts`：上游为 25KB 的 UI 文案目录（`en` 常量 + `Labels` 类型），
   属应用层而非纯逻辑。vendor 的纯逻辑层（editor/command-registry.ts、
   editor/table-commands.ts）仅以 `import type { Labels }` 方式引用它，从不读
   文案值。故 vendor 版本仅保留
   `export type Labels = Record<string, string> & { newTableCell: string; newTableColumn: string }`
   （`Record` 保证 `keyof Labels` 为 `string`，两个显式键供 `table-commands.ts`
   的 `Pick<Labels, "newTableCell" | "newTableColumn">` 可赋值），
   剥离了全部文案常量。若后续任务需要真实文案，请从上游同步完整文件并在此更新。

2. `src/types/markdown-it-footnote.d.ts`：未拷贝。lzeditor 已在
   `src/vite-env.d.ts` 提供等价的 `declare module "markdown-it-footnote"`
   （默认导出 `Plugin`），同时声明会与上游的 `declare module` 冲突
   （同一模块两个 default export 报错）。此处以上游 d.ts 为准会在
   typecheck 阶段产生重复声明，故跳过，交由项目现有声明提供该类型。

3. `src/types/jsdom.d.ts`：上游为测试（jsdom）声明的环境类型。vendor 拷贝范围内
   无任何文件 import "jsdom"，该声明为死代码，予以保留仅为忠实记录。

4. `src/i18n/locale.ts`：为 `ui/metadata-inline.tsx` 的运行时依赖
   （`normalizeLocale`）补拷。纯函数、零 import，原样拷贝。

5. `src/ui/*`（任务 3 补齐）：edit-canvas.tsx 及其直接 import 的 ui 兄弟模块
   （metadata-inline.tsx、image-block.ts、image-preview.tsx、starter-assets.ts、
   table-size-picker.tsx、use-document-store.ts、use-dialog-focus.ts）原样拷贝。
   它们依赖的 yeli 应用级资源（文案 `Labels`、样式、图标）由 lzeditor 适配层提供，
   见 `src/components/editor/yeli-labels.ts`（中文 `Labels` 实例）与
   `src/styles/yeli-canvas.css`（区块画布样式抽取）。

6. `src/render/markdown.ts`（任务 4 渲染边界扩展）：新增渲染边界注入点
   `registerRenderExtension({ install?, postProcess? })` 与 `RenderExtension` 类型。
   `rendererFor()` 在创建 markdown-it 实例后调用各扩展的 `install(md)`（注册
   mermaid/echarts/KaTeX/代码高亮规则）；`renderDocumentMarkdownSegments` /
   `renderSafeInlineMarkdown` 在 DOMPurify 净化后调用各扩展的 `postProcess(html)`
   （KaTeX slot 回填，避免公式 style 被净化剥除）。上游无此注入点，属 lzeditor
   适配层需要的扩展接口；上游算法（投影、事务、store）未改动。扩展实现见
   `src/components/editor/render-ext/`。

## 依赖补齐（相对上游新增的运行时/配置项）

- `yaml`：document/frontmatter.ts 运行时依赖（YAML 前文档元数据解析）。
  已在 package.json dependencies 中加入（上游同版本 yaml@2.9.0）。
- `@heroicons/react`：ui/* 模块的图标依赖（edit-canvas、metadata-inline、
  image-preview 从 `@heroicons/react/24/{outline,solid}` 取图标）。lzeditor 原无此包，
  已按上游版本（2.2.0）加入 dependencies 并同步 lockfile（vendor 原样，不改图标）。
- tsconfig `allowImportingTsExtensions: true`：上游源码全部使用带 `.ts`
  扩展名的相对 import（46 处），项目原 tsconfig 为 false 会导致 TS5097。
  已开启（bundler 模块解析下仅放开能力，不强制，向后兼容）。
