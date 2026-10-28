import type { Labels } from "../../vendor/yeli/i18n/en.ts";

/**
 * 中文 UI 文案，满足 yeli 的 {@link Labels} 类型。
 *
 * yeli 上游的 `src/i18n/en.ts` 是应用层文案目录（25KB，含 `en` 常量）。
 * vendor 只保留了 `Labels` 类型（`Record<string, string>`），不携带任何文案值
 * （见 src/vendor/yeli/README.md 差异记录 1）。lzeditor 界面为中文，故在适配层
 * 构造一份中文 Labels 实例传给 `EditCanvas` / `createYeliFacade` 的 command 路径。
 *
 * `Record<string, string>` 的索引签名意味着任何键都返回 `string`（运行时缺键为
 * `undefined`），因此这里按 edit-canvas、command-registry、table-commands 及 ui
 * 兄弟模块实际读取的全部键补齐文案，避免运行时出现空标签。
 */
export const YELI_LABELS_ZH: Labels = {
  // ── 通用 ──
  applyChange: "应用更改",
  cancel: "取消",
  close: "关闭",
  insert: "插入",
  language: "语言",
  tags: "标签",
  authors: "作者",
  footnote: "脚注",
  code: "代码",
  image: "图片",
  linkAddress: "链接地址",
  selectImage: "选择图片",

  // ── 文档元数据 ──
  addDocumentProperty: "添加文档属性",
  addTag: "添加标签",
  removeTag: "移除标签",
  documentMetadata: "文档元数据",
  documentTitle: "文档标题",

  // ── 区块画布 ──
  blockActions: "区块操作",
  blockCanvas: "区块画布",
  blockMenu: "区块菜单",
  blockType: "块类型",
  editBlock: "编辑区块",
  editRawBlock: "编辑原始块",
  imageNotLoaded: "图片未加载",
  inlineFormatting: "行内格式",
  insertBlock: "插入块",
  insertBelowMenu: "在下方插入",
  markComplete: "标记完成",
  markIncomplete: "标记未完成",
  projectionPending: "正在投影…",
  writeConflict: "写入冲突",
  commandNoResults: "没有匹配的命令",

  // ── 插入菜单 ──
  insertParagraph: "段落",
  insertBulletList: "无序列表",
  insertNumberedList: "有序列表",
  insertQuote: "引用",
  insertCodeBlock: "代码块",
  insertDivider: "分割线",
  insertTable: "表格",
  insertTask: "任务",

  // ── 斜杠命令 ──
  slashCommands: "斜杠命令",
  slashCommandsBasic: "基础",
  slashCommandsTemplate: "模板",
  slashKeyboardHint: "输入以过滤命令",
  slashSelectHint: "↑↓ 选择 · Enter 插入",

  // ── 源码安全编辑 ──
  sourceSafeTitle: "源码安全编辑",
  sourceSafeDescription: "此区块包含无法安全投影的标记，请在源码中编辑。",
  sourceSafeEditor: "源码编辑器",

  // ── 表格 ──
  tableCell: "单元格",
  tableColumnShort: "列",
  tableRowShort: "行",
  tableStructureTools: "表格结构工具",
  chooseTableSize: "选择表格大小",
  tableDimensions: "表格尺寸",

  // ── 图片预览 ──
  imagePreview: "图片预览",

  // ── command-registry / table-commands 插入占位 ──
  insertSection: "章节",
  insertHeading1: "一级标题",
  insertHeading2: "二级标题",
  insertHeading3: "三级标题",
  insertHeading4: "四级标题",
  insertHeading5: "五级标题",
  insertHeading6: "六级标题",
  convertHeading1: "一级标题",
  convertHeading2: "二级标题",
  convertHeading3: "三级标题",
  convertHeading4: "四级标题",
  convertHeading5: "五级标题",
  convertHeading6: "六级标题",
  newParagraph: "正文",
  newSection: "新章节",
  newTask: "任务",
  newListItem: "列表项",
  newQuote: "引用",
  newCode: "代码",
  newTableCell: "单元格",
  newTableColumn: "列",

  // ── 命令 label（动态 labels[definition.label]）──
  bold: "粗体",
  italic: "斜体",
  strikethrough: "删除线",
  inlineCode: "行内代码",
  clearFormatting: "清除格式",
  addLink: "链接",
  convertParagraph: "段落",
  convertHeading: "标题",
  convertQuote: "引用",
  convertBulletList: "无序列表",
  convertNumberedList: "有序列表",
  convertTask: "任务列表",
  convertCodeBlock: "代码块",
  deleteBlock: "删除区块",
  duplicateBlock: "复制区块",
  insertBelow: "在下方插入",
  insertRowAbove: "上方插入行",
  insertRowBelow: "下方插入行",
  insertColumnLeft: "左侧插入列",
  insertColumnRight: "右侧插入列",
  deleteTableRow: "删除行",
  deleteTableColumn: "删除列",
  undo: "撤销",
  redo: "重做",
  saveFile: "保存",
  searchDocument: "搜索文档",
  outline: "大纲",
  fontSize: "字号",
  pageWidth: "页面宽度",
  present: "演示",
  efficiencyGuideMenu: "效率指南",
  templateMeeting: "会议记录模板",
};
