// 13 排版主题 — 参考 xedit 的 THEME_PRESETS，适配 lzeditor 内容区选择器。
// 每套主题控制：标题装饰、引用样式、代码块、表格、链接等文章内容呈现。
// 通过 [data-typography-theme="xxx"] 根选择器，作用域覆盖编辑器内容区、预览区、阅读模式。

export interface TypographyTheme {
  id: string
  name: string
  /** 主题代表色，用于选择器色块 */
  color: string
  /** 适用内容类型标签 */
  tag: string
  css: string
}

/** 引用块的装饰引号 SVG data-URI，支持公众号粘贴场景 */
const quoteMark = (color: string) =>
  `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='23' height='16' viewBox='0 0 23 16'%3E%3Cpath d='M10 0C4 2 0 6.5 0 11a5 5 0 1 0 10 0Z M23 0c-6 2-10 6.5-10 11a5 5 0 1 0 10 0Z' fill='%23${color}'/%3E%3C/svg%3E")`

// ── 签名造型：双色下划线（标题下细灰线贯通、文字下压一段粗黑线）──
const classic: TypographyTheme = {
  id: 'classic',
  name: '经典黑',
  color: '#333333',
  tag: '技术 · 深度长文',
  css: `
[data-typography-theme="classic"] .lz-editor-content,
[data-typography-theme="classic"] .read-article-body,
[data-typography-theme="classic"] .preview-doc,
[data-typography-theme="classic"] .export-preview-body {
  color: #2b2b2b;
}
[data-typography-theme="classic"] .lz-editor-content h1,
[data-typography-theme="classic"] .read-article-body h1,
[data-typography-theme="classic"] .preview-doc h1,
[data-typography-theme="classic"] .export-preview-body h1 {
  font-size: 22px; text-align: center; color: #1a1a1a;
}
[data-typography-theme="classic"] .lz-editor-content h2,
[data-typography-theme="classic"] .read-article-body h2,
[data-typography-theme="classic"] .preview-doc h2,
[data-typography-theme="classic"] .export-preview-body h2 {
  font-size: 20px; color: #1a1a1a; border-bottom: 1px solid #ececec; padding-bottom: 6px; margin-top: 24px;
}
[data-typography-theme="classic"] .lz-editor-content h3,
[data-typography-theme="classic"] .read-article-body h3,
[data-typography-theme="classic"] .preview-doc h3,
[data-typography-theme="classic"] .export-preview-body h3 {
  font-size: 17px; color: #1a1a1a; margin-top: 20px;
}
[data-typography-theme="classic"] .lz-editor-content h3::before,
[data-typography-theme="classic"] .read-article-body h3::before,
[data-typography-theme="classic"] .preview-doc h3::before,
[data-typography-theme="classic"] .export-preview-body h3::before {
  display: inline-block; width: 4px; height: 15px; background-color: #1a1a1a; margin-right: 9px; border-radius: 2px; content: '';
}
[data-typography-theme="classic"] .lz-editor-content h4,
[data-typography-theme="classic"] .read-article-body h4,
[data-typography-theme="classic"] .preview-doc h4,
[data-typography-theme="classic"] .export-preview-body h4 {
  font-size: 16px; color: #1a1a1a;
}
[data-typography-theme="classic"] .lz-editor-content a,
[data-typography-theme="classic"] .read-article-body a,
[data-typography-theme="classic"] .preview-doc a,
[data-typography-theme="classic"] .export-preview-body a {
  color: #0969da; text-decoration: none; border-bottom: 1px solid #b6d5f2;
}
[data-typography-theme="classic"] .lz-editor-content strong,
[data-typography-theme="classic"] .read-article-body strong,
[data-typography-theme="classic"] .preview-doc strong,
[data-typography-theme="classic"] .export-preview-body strong { color: #111111; }
[data-typography-theme="classic"] .lz-editor-content em,
[data-typography-theme="classic"] .read-article-body em,
[data-typography-theme="classic"] .preview-doc em,
[data-typography-theme="classic"] .export-preview-body em { color: #555555; }
[data-typography-theme="classic"] .lz-editor-content blockquote,
[data-typography-theme="classic"] .read-article-body blockquote,
[data-typography-theme="classic"] .preview-doc blockquote,
[data-typography-theme="classic"] .export-preview-body blockquote {
  border-left: 3px solid #e0e0e0; background-color: #fafafa; color: #595959; padding: 12px 18px; margin: 20px 0;
}
[data-typography-theme="classic"] .lz-editor-content code,
[data-typography-theme="classic"] .read-article-body code,
[data-typography-theme="classic"] .preview-doc code,
[data-typography-theme="classic"] .export-preview-body code {
  color: #d02f55; background-color: #f8f1f3; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="classic"] .lz-editor-content pre,
[data-typography-theme="classic"] .read-article-body pre,
[data-typography-theme="classic"] .preview-doc pre,
[data-typography-theme="classic"] .export-preview-body pre {
  background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="classic"] .lz-editor-content pre code,
[data-typography-theme="classic"] .read-article-body pre code,
[data-typography-theme="classic"] .preview-doc pre code,
[data-typography-theme="classic"] .export-preview-body pre code {
  background: none; padding: 0; color: inherit;
}
[data-typography-theme="classic"] .lz-editor-content th,
[data-typography-theme="classic"] .read-article-body th,
[data-typography-theme="classic"] .preview-doc th,
[data-typography-theme="classic"] .export-preview-body th { background-color: #f5f5f5; }
[data-typography-theme="classic"] .lz-editor-content hr,
[data-typography-theme="classic"] .read-article-body hr,
[data-typography-theme="classic"] .preview-doc hr,
[data-typography-theme="classic"] .export-preview-body hr {
  border-top: 1px solid #e8e8e8; margin: 24px 0;
}
[data-typography-theme="classic"] .lz-editor-content figcaption,
[data-typography-theme="classic"] .read-article-body figcaption,
[data-typography-theme="classic"] .preview-doc figcaption,
[data-typography-theme="classic"] .export-preview-body figcaption { color: #a3a3a3; font-size: 13px; text-align: center; margin-top: 6px; }
`
}

// ── 签名造型：荧光笔标记标题（正文黑标题压一道半透明绿）──
const wechatGreen: TypographyTheme = {
  id: 'wechat-green',
  name: '微信绿',
  color: '#07c160',
  tag: '职场 · 生活',
  css: `
[data-typography-theme="wechat-green"] .lz-editor-content,
[data-typography-theme="wechat-green"] .read-article-body,
[data-typography-theme="wechat-green"] .preview-doc,
[data-typography-theme="wechat-green"] .export-preview-body {
  color: #1f1f1f;
}
[data-typography-theme="wechat-green"] .lz-editor-content h1,
[data-typography-theme="wechat-green"] .read-article-body h1,
[data-typography-theme="wechat-green"] .preview-doc h1,
[data-typography-theme="wechat-green"] .export-preview-body h1 {
  font-size: 22px; text-align: center; color: #067f42;
}
[data-typography-theme="wechat-green"] .lz-editor-content h2,
[data-typography-theme="wechat-green"] .read-article-body h2,
[data-typography-theme="wechat-green"] .preview-doc h2,
[data-typography-theme="wechat-green"] .export-preview-body h2 {
  font-size: 20px; color: #1f1f1f; margin-top: 24px;
}
[data-typography-theme="wechat-green"] .lz-editor-content h2 > span,
[data-typography-theme="wechat-green"] .read-article-body h2 > span,
[data-typography-theme="wechat-green"] .preview-doc h2 > span,
[data-typography-theme="wechat-green"] .export-preview-body h2 > span {
  display: inline-block; padding: 0 5px 3px 2px;
  background-image: linear-gradient(transparent 60%, rgba(7,193,96,0.22) 60%);
}
[data-typography-theme="wechat-green"] .lz-editor-content h3,
[data-typography-theme="wechat-green"] .read-article-body h3,
[data-typography-theme="wechat-green"] .preview-doc h3,
[data-typography-theme="wechat-green"] .export-preview-body h3 {
  font-size: 17px; color: #067f42; margin-top: 20px;
}
[data-typography-theme="wechat-green"] .lz-editor-content h3::before,
[data-typography-theme="wechat-green"] .read-article-body h3::before,
[data-typography-theme="wechat-green"] .preview-doc h3::before,
[data-typography-theme="wechat-green"] .export-preview-body h3::before {
  display: inline-block; width: 7px; height: 7px; background-color: #07c160; border-radius: 50%; margin-right: 9px; vertical-align: middle; content: '';
}
[data-typography-theme="wechat-green"] .lz-editor-content h4,
[data-typography-theme="wechat-green"] .read-article-body h4,
[data-typography-theme="wechat-green"] .preview-doc h4,
[data-typography-theme="wechat-green"] .export-preview-body h4 {
  font-size: 16px; color: #067f42;
}
[data-typography-theme="wechat-green"] .lz-editor-content a,
[data-typography-theme="wechat-green"] .read-article-body a,
[data-typography-theme="wechat-green"] .preview-doc a,
[data-typography-theme="wechat-green"] .export-preview-body a {
  color: #07a355; text-decoration: none; border-bottom: 1px solid #a8e6c5;
}
[data-typography-theme="wechat-green"] .lz-editor-content strong,
[data-typography-theme="wechat-green"] .read-article-body strong,
[data-typography-theme="wechat-green"] .preview-doc strong,
[data-typography-theme="wechat-green"] .export-preview-body strong { color: #067f42; }
[data-typography-theme="wechat-green"] .lz-editor-content blockquote,
[data-typography-theme="wechat-green"] .read-article-body blockquote,
[data-typography-theme="wechat-green"] .preview-doc blockquote,
[data-typography-theme="wechat-green"] .export-preview-body blockquote {
  border-left: none; background-color: #f2f9f5; color: #52705f; border-radius: 8px; padding: 10px 18px; margin: 16px 0;
}
[data-typography-theme="wechat-green"] .lz-editor-content code,
[data-typography-theme="wechat-green"] .read-article-body code,
[data-typography-theme="wechat-green"] .preview-doc code,
[data-typography-theme="wechat-green"] .export-preview-body code {
  color: #0a8f4d; background-color: #ebf7f0; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="wechat-green"] .lz-editor-content pre,
[data-typography-theme="wechat-green"] .read-article-body pre,
[data-typography-theme="wechat-green"] .preview-doc pre,
[data-typography-theme="wechat-green"] .export-preview-body pre {
  background: #f0f8f0; border: 1px solid #d4ecc8; border-radius: 8px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="wechat-green"] .lz-editor-content pre code,
[data-typography-theme="wechat-green"] .read-article-body pre code,
[data-typography-theme="wechat-green"] .preview-doc pre code,
[data-typography-theme="wechat-green"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="wechat-green"] .lz-editor-content th,
[data-typography-theme="wechat-green"] .read-article-body th,
[data-typography-theme="wechat-green"] .preview-doc th,
[data-typography-theme="wechat-green"] .export-preview-body th { background-color: #ecf8f1; color: #056b36; }
[data-typography-theme="wechat-green"] .lz-editor-content td,
[data-typography-theme="wechat-green"] .read-article-body td,
[data-typography-theme="wechat-green"] .preview-doc td,
[data-typography-theme="wechat-green"] .export-preview-body td { border-color: #dcefe4; }
[data-typography-theme="wechat-green"] .lz-editor-content hr,
[data-typography-theme="wechat-green"] .read-article-body hr,
[data-typography-theme="wechat-green"] .preview-doc hr,
[data-typography-theme="wechat-green"] .export-preview-body hr { border-top: 1px solid #d8efe2; margin: 24px 0; }
`
}

// ── 签名造型：左竖线 + 向右消失的浅蓝渐变洗底，h3 用小方框 ──
const techBlue: TypographyTheme = {
  id: 'tech-blue',
  name: '科技蓝',
  color: '#1e6bb8',
  tag: '技术教程',
  css: `
[data-typography-theme="tech-blue"] .lz-editor-content,
[data-typography-theme="tech-blue"] .read-article-body,
[data-typography-theme="tech-blue"] .preview-doc,
[data-typography-theme="tech-blue"] .export-preview-body {
  color: #14508c;
}
[data-typography-theme="tech-blue"] .lz-editor-content h1,
[data-typography-theme="tech-blue"] .read-article-body h1,
[data-typography-theme="tech-blue"] .preview-doc h1,
[data-typography-theme="tech-blue"] .export-preview-body h1 {
  font-size: 22px; text-align: center; color: #14508c;
}
[data-typography-theme="tech-blue"] .lz-editor-content h2,
[data-typography-theme="tech-blue"] .read-article-body h2,
[data-typography-theme="tech-blue"] .preview-doc h2,
[data-typography-theme="tech-blue"] .export-preview-body h2 {
  font-size: 19px; color: #14508c; margin-top: 24px;
}
[data-typography-theme="tech-blue"] .lz-editor-content h2 > span,
[data-typography-theme="tech-blue"] .read-article-body h2 > span,
[data-typography-theme="tech-blue"] .preview-doc h2 > span,
[data-typography-theme="tech-blue"] .export-preview-body h2 > span {
  display: inline-block; padding: 6px 12px; border-left: 4px solid #1e6bb8;
  background-image: linear-gradient(90deg, #eef5fc, rgba(238,245,252,0) 85%); border-radius: 0 6px 6px 0;
}
[data-typography-theme="tech-blue"] .lz-editor-content h3,
[data-typography-theme="tech-blue"] .read-article-body h3,
[data-typography-theme="tech-blue"] .preview-doc h3,
[data-typography-theme="tech-blue"] .export-preview-body h3 {
  font-size: 17px; color: #14508c; margin-top: 20px;
}
[data-typography-theme="tech-blue"] .lz-editor-content h3::before,
[data-typography-theme="tech-blue"] .read-article-body h3::before,
[data-typography-theme="tech-blue"] .preview-doc h3::before,
[data-typography-theme="tech-blue"] .export-preview-body h3::before {
  display: inline-block; width: 8px; height: 8px; border: 2px solid #1e6bb8; border-radius: 2px; margin-right: 9px; vertical-align: middle; content: '';
}
[data-typography-theme="tech-blue"] .lz-editor-content h4,
[data-typography-theme="tech-blue"] .read-article-body h4,
[data-typography-theme="tech-blue"] .preview-doc h4,
[data-typography-theme="tech-blue"] .export-preview-body h4 {
  font-size: 16px; color: #14508c;
}
[data-typography-theme="tech-blue"] .lz-editor-content a,
[data-typography-theme="tech-blue"] .read-article-body a,
[data-typography-theme="tech-blue"] .preview-doc a,
[data-typography-theme="tech-blue"] .export-preview-body a {
  color: #1e6bb8; text-decoration: none; border-bottom: 1px solid #a7cbe8;
}
[data-typography-theme="tech-blue"] .lz-editor-content strong,
[data-typography-theme="tech-blue"] .read-article-body strong,
[data-typography-theme="tech-blue"] .preview-doc strong,
[data-typography-theme="tech-blue"] .export-preview-body strong { color: #14508c; }
[data-typography-theme="tech-blue"] .lz-editor-content blockquote,
[data-typography-theme="tech-blue"] .read-article-body blockquote,
[data-typography-theme="tech-blue"] .preview-doc blockquote,
[data-typography-theme="tech-blue"] .export-preview-body blockquote {
  border-left: 3px solid #7fb3e3; background-color: #f3f8fd; color: #4a6a85; padding: 10px 16px; margin: 16px 0;
}
[data-typography-theme="tech-blue"] .lz-editor-content code,
[data-typography-theme="tech-blue"] .read-article-body code,
[data-typography-theme="tech-blue"] .preview-doc code,
[data-typography-theme="tech-blue"] .export-preview-body code {
  color: #1a63aa; background-color: #edf4fb; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="tech-blue"] .lz-editor-content pre,
[data-typography-theme="tech-blue"] .read-article-body pre,
[data-typography-theme="tech-blue"] .preview-doc pre,
[data-typography-theme="tech-blue"] .export-preview-body pre {
  background: #f0f6fb; border: 1px solid #d3e5f3; border-radius: 6px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="tech-blue"] .lz-editor-content pre code,
[data-typography-theme="tech-blue"] .read-article-body pre code,
[data-typography-theme="tech-blue"] .preview-doc pre code,
[data-typography-theme="tech-blue"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="tech-blue"] .lz-editor-content th,
[data-typography-theme="tech-blue"] .read-article-body th,
[data-typography-theme="tech-blue"] .preview-doc th,
[data-typography-theme="tech-blue"] .export-preview-body th { background-color: #e9f2fa; color: #14508c; }
[data-typography-theme="tech-blue"] .lz-editor-content tr:nth-child(even) td,
[data-typography-theme="tech-blue"] .read-article-body tr:nth-child(even) td,
[data-typography-theme="tech-blue"] .preview-doc tr:nth-child(even) td,
[data-typography-theme="tech-blue"] .export-preview-body tr:nth-child(even) td { background-color: #f7fafd; }
[data-typography-theme="tech-blue"] .lz-editor-content td,
[data-typography-theme="tech-blue"] .read-article-body td,
[data-typography-theme="tech-blue"] .preview-doc td,
[data-typography-theme="tech-blue"] .export-preview-body td { border-color: #d3e5f3; }
[data-typography-theme="tech-blue"] .lz-editor-content hr,
[data-typography-theme="tech-blue"] .read-article-body hr,
[data-typography-theme="tech-blue"] .preview-doc hr,
[data-typography-theme="tech-blue"] .export-preview-body hr { border-top: 1px solid #cadff0; margin: 24px 0; }
`
}

// ── 签名造型：通栏渐变横条标题（白字、缺一角的圆角）──
const lanying: TypographyTheme = {
  id: 'lanying',
  name: '蓝莹',
  color: '#3aa1f0',
  tag: '技术 · 科普',
  css: `
[data-typography-theme="lanying"] .lz-editor-content,
[data-typography-theme="lanying"] .read-article-body,
[data-typography-theme="lanying"] .preview-doc,
[data-typography-theme="lanying"] .export-preview-body {
  color: #0e6fd0;
}
[data-typography-theme="lanying"] .lz-editor-content h1,
[data-typography-theme="lanying"] .read-article-body h1,
[data-typography-theme="lanying"] .preview-doc h1,
[data-typography-theme="lanying"] .export-preview-body h1 {
  font-size: 22px; text-align: center; color: #0e6fd0;
}
[data-typography-theme="lanying"] .lz-editor-content h2,
[data-typography-theme="lanying"] .read-article-body h2,
[data-typography-theme="lanying"] .preview-doc h2,
[data-typography-theme="lanying"] .export-preview-body h2 {
  font-size: 18px; margin-top: 24px;
}
[data-typography-theme="lanying"] .lz-editor-content h2 > span,
[data-typography-theme="lanying"] .read-article-body h2 > span,
[data-typography-theme="lanying"] .preview-doc h2 > span,
[data-typography-theme="lanying"] .export-preview-body h2 > span {
  display: block; color: #fff; background-image: linear-gradient(135deg, #38a0f2, #0e6fd0); padding: 8px 16px; border-radius: 8px 8px 8px 0; font-size: 17px; letter-spacing: 1px;
}
[data-typography-theme="lanying"] .lz-editor-content h3,
[data-typography-theme="lanying"] .read-article-body h3,
[data-typography-theme="lanying"] .preview-doc h3,
[data-typography-theme="lanying"] .export-preview-body h3 {
  font-size: 17px; color: #0e6fd0; margin-top: 20px;
}
[data-typography-theme="lanying"] .lz-editor-content h3::before,
[data-typography-theme="lanying"] .read-article-body h3::before,
[data-typography-theme="lanying"] .preview-doc h3::before,
[data-typography-theme="lanying"] .export-preview-body h3::before {
  display: inline-block; width: 4px; height: 16px; background-image: linear-gradient(180deg, #4aa8f5, #0e6fd0); margin-right: 8px; border-radius: 2px; content: '';
}
[data-typography-theme="lanying"] .lz-editor-content h4,
[data-typography-theme="lanying"] .read-article-body h4,
[data-typography-theme="lanying"] .preview-doc h4,
[data-typography-theme="lanying"] .export-preview-body h4 { font-size: 16px; color: #0e6fd0; }
[data-typography-theme="lanying"] .lz-editor-content a,
[data-typography-theme="lanying"] .read-article-body a,
[data-typography-theme="lanying"] .preview-doc a,
[data-typography-theme="lanying"] .export-preview-body a { color: #0e6fd0; text-decoration: none; border-bottom: 1px solid #9dcdf6; }
[data-typography-theme="lanying"] .lz-editor-content strong,
[data-typography-theme="lanying"] .read-article-body strong,
[data-typography-theme="lanying"] .preview-doc strong,
[data-typography-theme="lanying"] .export-preview-body strong { color: #0c62b8; }
[data-typography-theme="lanying"] .lz-editor-content blockquote,
[data-typography-theme="lanying"] .read-article-body blockquote,
[data-typography-theme="lanying"] .preview-doc blockquote,
[data-typography-theme="lanying"] .export-preview-body blockquote {
  border-left: 3px solid #58aef3; background-color: #f0f7fe; color: #4f6b83; border-radius: 0 8px 8px 0; padding: 10px 16px; margin: 16px 0;
}
[data-typography-theme="lanying"] .lz-editor-content code,
[data-typography-theme="lanying"] .read-article-body code,
[data-typography-theme="lanying"] .preview-doc code,
[data-typography-theme="lanying"] .export-preview-body code {
  color: #0d67c2; background-color: #ecf5fd; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="lanying"] .lz-editor-content pre,
[data-typography-theme="lanying"] .read-article-body pre,
[data-typography-theme="lanying"] .preview-doc pre,
[data-typography-theme="lanying"] .export-preview-body pre {
  background: #f0f8ff; border: 1px solid #c5e2f8; border-radius: 6px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="lanying"] .lz-editor-content pre code,
[data-typography-theme="lanying"] .read-article-body pre code,
[data-typography-theme="lanying"] .preview-doc pre code,
[data-typography-theme="lanying"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="lanying"] .lz-editor-content th,
[data-typography-theme="lanying"] .read-article-body th,
[data-typography-theme="lanying"] .preview-doc th,
[data-typography-theme="lanying"] .export-preview-body th { background-color: #e8f3fc; color: #0b5aa8; }
[data-typography-theme="lanying"] .lz-editor-content td,
[data-typography-theme="lanying"] .read-article-body td,
[data-typography-theme="lanying"] .preview-doc td,
[data-typography-theme="lanying"] .export-preview-body td { border-color: #d0e6f8; }
[data-typography-theme="lanying"] .lz-editor-content hr,
[data-typography-theme="lanying"] .read-article-body hr,
[data-typography-theme="lanying"] .preview-doc hr,
[data-typography-theme="lanying"] .export-preview-body hr { border-top: 1px solid #c5e2f8; margin: 24px 0; }
`
}

// ── 签名造型：橙底白字标签式 h2 + 右侧折角 ──
const orangeHeart: TypographyTheme = {
  id: 'orange-heart',
  name: '橙心',
  color: '#ef7060',
  tag: '情感 · 生活',
  css: `
[data-typography-theme="orange-heart"] .lz-editor-content,
[data-typography-theme="orange-heart"] .read-article-body,
[data-typography-theme="orange-heart"] .preview-doc,
[data-typography-theme="orange-heart"] .export-preview-body {
  color: #e05442;
}
[data-typography-theme="orange-heart"] .lz-editor-content h1,
[data-typography-theme="orange-heart"] .read-article-body h1,
[data-typography-theme="orange-heart"] .preview-doc h1,
[data-typography-theme="orange-heart"] .export-preview-body h1 {
  font-size: 22px; text-align: center; color: #e05442;
}
[data-typography-theme="orange-heart"] .lz-editor-content h2,
[data-typography-theme="orange-heart"] .read-article-body h2,
[data-typography-theme="orange-heart"] .preview-doc h2,
[data-typography-theme="orange-heart"] .export-preview-body h2 {
  font-size: 18px; border-bottom: 2px solid #ef7060; margin-top: 24px;
}
[data-typography-theme="orange-heart"] .lz-editor-content h2 > span,
[data-typography-theme="orange-heart"] .read-article-body h2 > span,
[data-typography-theme="orange-heart"] .preview-doc h2 > span,
[data-typography-theme="orange-heart"] .export-preview-body h2 > span {
  display: inline-block; background-color: #ef7060; color: #fff; padding: 5px 14px 4px; border-radius: 3px 3px 0 0; margin-right: 3px;
}
[data-typography-theme="orange-heart"] .lz-editor-content h3,
[data-typography-theme="orange-heart"] .read-article-body h3,
[data-typography-theme="orange-heart"] .preview-doc h3,
[data-typography-theme="orange-heart"] .export-preview-body h3 {
  font-size: 17px; color: #e05442; margin-top: 20px;
}
[data-typography-theme="orange-heart"] .lz-editor-content h3::before,
[data-typography-theme="orange-heart"] .read-article-body h3::before,
[data-typography-theme="orange-heart"] .preview-doc h3::before,
[data-typography-theme="orange-heart"] .export-preview-body h3::before {
  display: inline-block; width: 4px; height: 15px; background-color: #ef7060; margin-right: 9px; border-radius: 2px; content: '';
}
[data-typography-theme="orange-heart"] .lz-editor-content h4,
[data-typography-theme="orange-heart"] .read-article-body h4,
[data-typography-theme="orange-heart"] .preview-doc h4,
[data-typography-theme="orange-heart"] .export-preview-body h4 { font-size: 16px; color: #e05442; }
[data-typography-theme="orange-heart"] .lz-editor-content a,
[data-typography-theme="orange-heart"] .read-article-body a,
[data-typography-theme="orange-heart"] .preview-doc a,
[data-typography-theme="orange-heart"] .export-preview-body a { color: #e05442; text-decoration: none; border-bottom: 1px solid #f6b3aa; }
[data-typography-theme="orange-heart"] .lz-editor-content strong,
[data-typography-theme="orange-heart"] .read-article-body strong,
[data-typography-theme="orange-heart"] .preview-doc strong,
[data-typography-theme="orange-heart"] .export-preview-body strong { color: #d64937; }
[data-typography-theme="orange-heart"] .lz-editor-content blockquote,
[data-typography-theme="orange-heart"] .read-article-body blockquote,
[data-typography-theme="orange-heart"] .preview-doc blockquote,
[data-typography-theme="orange-heart"] .export-preview-body blockquote {
  border-left: 4px solid #ef7060; background-color: #fdf2ee; color: #595959; padding: 10px 16px; margin: 16px 0;
}
[data-typography-theme="orange-heart"] .lz-editor-content code,
[data-typography-theme="orange-heart"] .read-article-body code,
[data-typography-theme="orange-heart"] .preview-doc code,
[data-typography-theme="orange-heart"] .export-preview-body code {
  color: #d95948; background-color: #fdf0ed; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="orange-heart"] .lz-editor-content pre,
[data-typography-theme="orange-heart"] .read-article-body pre,
[data-typography-theme="orange-heart"] .preview-doc pre,
[data-typography-theme="orange-heart"] .export-preview-body pre {
  background: #fef8f6; border: 1px solid #f6ddd8; border-radius: 6px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="orange-heart"] .lz-editor-content pre code,
[data-typography-theme="orange-heart"] .read-article-body pre code,
[data-typography-theme="orange-heart"] .preview-doc pre code,
[data-typography-theme="orange-heart"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="orange-heart"] .lz-editor-content th,
[data-typography-theme="orange-heart"] .read-article-body th,
[data-typography-theme="orange-heart"] .preview-doc th,
[data-typography-theme="orange-heart"] .export-preview-body th { background-color: #fdefec; color: #c24b3b; }
[data-typography-theme="orange-heart"] .lz-editor-content td,
[data-typography-theme="orange-heart"] .read-article-body td,
[data-typography-theme="orange-heart"] .preview-doc td,
[data-typography-theme="orange-heart"] .export-preview-body td { border-color: #f6ddd8; }
[data-typography-theme="orange-heart"] .lz-editor-content hr,
[data-typography-theme="orange-heart"] .read-article-body hr,
[data-typography-theme="orange-heart"] .preview-doc hr,
[data-typography-theme="orange-heart"] .export-preview-body hr { border-top: 1px solid #f3d6d0; margin: 24px 0; }
`
}

// ── 签名造型：居中细字距标题、两侧小圆点 + 浅紫细下划线 ──
const violet: TypographyTheme = {
  id: 'violet',
  name: '蔷薇紫',
  color: '#8e44ad',
  tag: '时尚 · 女性',
  css: `
[data-typography-theme="violet"] .lz-editor-content,
[data-typography-theme="violet"] .read-article-body,
[data-typography-theme="violet"] .preview-doc,
[data-typography-theme="violet"] .export-preview-body {
  color: #6d3487;
}
[data-typography-theme="violet"] .lz-editor-content h1,
[data-typography-theme="violet"] .read-article-body h1,
[data-typography-theme="violet"] .preview-doc h1,
[data-typography-theme="violet"] .export-preview-body h1 {
  font-size: 22px; text-align: center; color: #7d3c98;
}
[data-typography-theme="violet"] .lz-editor-content h2,
[data-typography-theme="violet"] .read-article-body h2,
[data-typography-theme="violet"] .preview-doc h2,
[data-typography-theme="violet"] .export-preview-body h2 {
  font-size: 19px; text-align: center; color: #6d3487; letter-spacing: 0.08em; margin-top: 24px;
}
[data-typography-theme="violet"] .lz-editor-content h2 > span,
[data-typography-theme="violet"] .read-article-body h2 > span,
[data-typography-theme="violet"] .preview-doc h2 > span,
[data-typography-theme="violet"] .export-preview-body h2 > span {
  display: inline-block; border-bottom: 2px solid #d9bce9; padding: 0 3px 6px 3px;
}
[data-typography-theme="violet"] .lz-editor-content h3,
[data-typography-theme="violet"] .read-article-body h3,
[data-typography-theme="violet"] .preview-doc h3,
[data-typography-theme="violet"] .export-preview-body h3 {
  font-size: 17px; color: #6d3487; margin-top: 20px;
}
[data-typography-theme="violet"] .lz-editor-content h3::before,
[data-typography-theme="violet"] .read-article-body h3::before,
[data-typography-theme="violet"] .preview-doc h3::before,
[data-typography-theme="violet"] .export-preview-body h3::before {
  display: inline-block; width: 4px; height: 15px; background-color: #a25dbd; margin-right: 9px; border-radius: 2px; content: '';
}
[data-typography-theme="violet"] .lz-editor-content h4,
[data-typography-theme="violet"] .read-article-body h4,
[data-typography-theme="violet"] .preview-doc h4,
[data-typography-theme="violet"] .export-preview-body h4 { font-size: 16px; color: #6d3487; }
[data-typography-theme="violet"] .lz-editor-content a,
[data-typography-theme="violet"] .read-article-body a,
[data-typography-theme="violet"] .preview-doc a,
[data-typography-theme="violet"] .export-preview-body a { color: #8e44ad; text-decoration: none; border-bottom: 1px solid #d3b3e0; }
[data-typography-theme="violet"] .lz-editor-content strong,
[data-typography-theme="violet"] .read-article-body strong,
[data-typography-theme="violet"] .preview-doc strong,
[data-typography-theme="violet"] .export-preview-body strong { color: #7d3c98; }
[data-typography-theme="violet"] .lz-editor-content blockquote,
[data-typography-theme="violet"] .read-article-body blockquote,
[data-typography-theme="violet"] .preview-doc blockquote,
[data-typography-theme="violet"] .export-preview-body blockquote {
  border: 1px solid #e9dbf2; background-color: #faf7fc; color: #6f5680; border-radius: 12px; padding: 10px 18px; margin: 16px 0;
}
[data-typography-theme="violet"] .lz-editor-content code,
[data-typography-theme="violet"] .read-article-body code,
[data-typography-theme="violet"] .preview-doc code,
[data-typography-theme="violet"] .export-preview-body code {
  color: #83429f; background-color: #f6effa; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="violet"] .lz-editor-content pre,
[data-typography-theme="violet"] .read-article-body pre,
[data-typography-theme="violet"] .preview-doc pre,
[data-typography-theme="violet"] .export-preview-body pre {
  background: #faf7fc; border: 1px solid #e9dbf2; border-radius: 8px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="violet"] .lz-editor-content pre code,
[data-typography-theme="violet"] .read-article-body pre code,
[data-typography-theme="violet"] .preview-doc pre code,
[data-typography-theme="violet"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="violet"] .lz-editor-content th,
[data-typography-theme="violet"] .read-article-body th,
[data-typography-theme="violet"] .preview-doc th,
[data-typography-theme="violet"] .export-preview-body th { background-color: #f4ecf9; color: #6e358a; }
[data-typography-theme="violet"] .lz-editor-content td,
[data-typography-theme="violet"] .read-article-body td,
[data-typography-theme="violet"] .preview-doc td,
[data-typography-theme="violet"] .export-preview-body td { border-color: #e7d8ef; }
[data-typography-theme="violet"] .lz-editor-content hr,
[data-typography-theme="violet"] .read-article-body hr,
[data-typography-theme="violet"] .preview-doc hr,
[data-typography-theme="violet"] .export-preview-body hr { border-top: 1px solid #e2cdec; margin: 24px 0; }
`
}

// ── 签名造型：「」括角标题（prefix/suffix 各画两条边拼成引号角）──
const ink: TypographyTheme = {
  id: 'ink',
  name: '水墨',
  color: '#576b95',
  tag: '文化 · 散文',
  css: `
[data-typography-theme="ink"] .lz-editor-content,
[data-typography-theme="ink"] .read-article-body,
[data-typography-theme="ink"] .preview-doc,
[data-typography-theme="ink"] .export-preview-body {
  font-family: Optima, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", serif;
  color: #40464f;
}
[data-typography-theme="ink"] .lz-editor-content h1,
[data-typography-theme="ink"] .read-article-body h1,
[data-typography-theme="ink"] .preview-doc h1,
[data-typography-theme="ink"] .export-preview-body h1 {
  font-size: 21px; text-align: center; color: #2f353d; letter-spacing: 0.15em;
}
[data-typography-theme="ink"] .lz-editor-content h2,
[data-typography-theme="ink"] .read-article-body h2,
[data-typography-theme="ink"] .preview-doc h2,
[data-typography-theme="ink"] .export-preview-body h2 {
  font-size: 18px; text-align: center; color: #2f353d; letter-spacing: 0.15em; margin-top: 24px;
}
[data-typography-theme="ink"] .lz-editor-content h2 > span,
[data-typography-theme="ink"] .read-article-body h2 > span,
[data-typography-theme="ink"] .preview-doc h2 > span,
[data-typography-theme="ink"] .export-preview-body h2 > span {
  display: inline-flex; align-items: center; gap: 8px;
}
[data-typography-theme="ink"] .lz-editor-content h3,
[data-typography-theme="ink"] .read-article-body h3,
[data-typography-theme="ink"] .preview-doc h3,
[data-typography-theme="ink"] .export-preview-body h3 {
  font-size: 16px; color: #40464f; letter-spacing: 0.1em; margin-top: 20px;
}
[data-typography-theme="ink"] .lz-editor-content h3::before,
[data-typography-theme="ink"] .read-article-body h3::before,
[data-typography-theme="ink"] .preview-doc h3::before,
[data-typography-theme="ink"] .export-preview-body h3::before {
  display: inline-block; width: 6px; height: 6px; border: 1px solid #576b95; border-radius: 50%; margin-right: 8px; vertical-align: middle; content: '';
}
[data-typography-theme="ink"] .lz-editor-content h4,
[data-typography-theme="ink"] .read-article-body h4,
[data-typography-theme="ink"] .preview-doc h4,
[data-typography-theme="ink"] .export-preview-body h4 { font-size: 16px; color: #40464f; }
[data-typography-theme="ink"] .lz-editor-content a,
[data-typography-theme="ink"] .read-article-body a,
[data-typography-theme="ink"] .preview-doc a,
[data-typography-theme="ink"] .export-preview-body a { color: #576b95; text-decoration: none; border-bottom: 1px dashed #8c9ab8; }
[data-typography-theme="ink"] .lz-editor-content strong,
[data-typography-theme="ink"] .read-article-body strong,
[data-typography-theme="ink"] .preview-doc strong,
[data-typography-theme="ink"] .export-preview-body strong { color: #1a1a1a; }
[data-typography-theme="ink"] .lz-editor-content em,
[data-typography-theme="ink"] .read-article-body em,
[data-typography-theme="ink"] .preview-doc em,
[data-typography-theme="ink"] .export-preview-body em { color: #576b95; font-style: normal; letter-spacing: 0.05em; }
[data-typography-theme="ink"] .lz-editor-content blockquote,
[data-typography-theme="ink"] .read-article-body blockquote,
[data-typography-theme="ink"] .preview-doc blockquote,
[data-typography-theme="ink"] .export-preview-body blockquote {
  border-left: 1px solid #c3cad6; background-color: transparent; color: #666e7e; padding: 2px 0 2px 16px; font-size: 15px; margin: 16px 0;
}
[data-typography-theme="ink"] .lz-editor-content code,
[data-typography-theme="ink"] .read-article-body code,
[data-typography-theme="ink"] .preview-doc code,
[data-typography-theme="ink"] .export-preview-body code {
  color: #4f608a; background-color: #eff1f6; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="ink"] .lz-editor-content pre,
[data-typography-theme="ink"] .read-article-body pre,
[data-typography-theme="ink"] .preview-doc pre,
[data-typography-theme="ink"] .export-preview-body pre {
  background: #f6f7f9; border: 1px solid #dfe3ea; border-radius: 4px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="ink"] .lz-editor-content pre code,
[data-typography-theme="ink"] .read-article-body pre code,
[data-typography-theme="ink"] .preview-doc pre code,
[data-typography-theme="ink"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="ink"] .lz-editor-content th,
[data-typography-theme="ink"] .read-article-body th,
[data-typography-theme="ink"] .preview-doc th,
[data-typography-theme="ink"] .export-preview-body th { background-color: #f2f4f7; color: #40464f; }
[data-typography-theme="ink"] .lz-editor-content td,
[data-typography-theme="ink"] .read-article-body td,
[data-typography-theme="ink"] .preview-doc td,
[data-typography-theme="ink"] .export-preview-body td { border-color: #dfe3ea; }
[data-typography-theme="ink"] .lz-editor-content hr,
[data-typography-theme="ink"] .read-article-body hr,
[data-typography-theme="ink"] .preview-doc hr,
[data-typography-theme="ink"] .export-preview-body hr { border-top: 1px dashed #c2c8d5; margin: 24px 0; }
`
}

// ── 签名造型：印章式标题——正红方块字 + 右下角硬投影 ──
const chineseRed: TypographyTheme = {
  id: 'chinese-red',
  name: '绛红',
  color: '#c0392b',
  tag: '品牌 · 活动',
  css: `
[data-typography-theme="chinese-red"] .lz-editor-content,
[data-typography-theme="chinese-red"] .read-article-body,
[data-typography-theme="chinese-red"] .preview-doc,
[data-typography-theme="chinese-red"] .export-preview-body {
  color: #a93226;
}
[data-typography-theme="chinese-red"] .lz-editor-content h1,
[data-typography-theme="chinese-red"] .read-article-body h1,
[data-typography-theme="chinese-red"] .preview-doc h1,
[data-typography-theme="chinese-red"] .export-preview-body h1 {
  font-size: 22px; text-align: center; color: #a93226;
}
[data-typography-theme="chinese-red"] .lz-editor-content h2,
[data-typography-theme="chinese-red"] .read-article-body h2,
[data-typography-theme="chinese-red"] .preview-doc h2,
[data-typography-theme="chinese-red"] .export-preview-body h2 {
  font-size: 18px; margin-top: 24px;
}
[data-typography-theme="chinese-red"] .lz-editor-content h2 > span,
[data-typography-theme="chinese-red"] .read-article-body h2 > span,
[data-typography-theme="chinese-red"] .preview-doc h2 > span,
[data-typography-theme="chinese-red"] .export-preview-body h2 > span {
  display: inline-block; background-color: #c0392b; color: #fff; padding: 6px 18px; font-size: 17px; letter-spacing: 2px; border-radius: 2px; box-shadow: 4px 4px 0 #f5ddd9;
}
[data-typography-theme="chinese-red"] .lz-editor-content h3,
[data-typography-theme="chinese-red"] .read-article-body h3,
[data-typography-theme="chinese-red"] .preview-doc h3,
[data-typography-theme="chinese-red"] .export-preview-body h3 {
  font-size: 17px; color: #a93226; margin-top: 20px;
}
[data-typography-theme="chinese-red"] .lz-editor-content h3::before,
[data-typography-theme="chinese-red"] .read-article-body h3::before,
[data-typography-theme="chinese-red"] .preview-doc h3::before,
[data-typography-theme="chinese-red"] .export-preview-body h3::before {
  display: inline-block; width: 8px; height: 8px; background-color: #c0392b; border-radius: 1px; margin-right: 9px; vertical-align: middle; content: '';
}
[data-typography-theme="chinese-red"] .lz-editor-content h4,
[data-typography-theme="chinese-red"] .read-article-body h4,
[data-typography-theme="chinese-red"] .preview-doc h4,
[data-typography-theme="chinese-red"] .export-preview-body h4 { font-size: 16px; color: #a93226; }
[data-typography-theme="chinese-red"] .lz-editor-content a,
[data-typography-theme="chinese-red"] .read-article-body a,
[data-typography-theme="chinese-red"] .preview-doc a,
[data-typography-theme="chinese-red"] .export-preview-body a { color: #c0392b; text-decoration: none; border-bottom: 1px solid #e3a49c; }
[data-typography-theme="chinese-red"] .lz-editor-content strong,
[data-typography-theme="chinese-red"] .read-article-body strong,
[data-typography-theme="chinese-red"] .preview-doc strong,
[data-typography-theme="chinese-red"] .export-preview-body strong { color: #a93226; }
[data-typography-theme="chinese-red"] .lz-editor-content blockquote,
[data-typography-theme="chinese-red"] .read-article-body blockquote,
[data-typography-theme="chinese-red"] .preview-doc blockquote,
[data-typography-theme="chinese-red"] .export-preview-body blockquote {
  border-left: 3px solid #d98479; background-color: #fbf3f1; color: #7a5750; border-radius: 0 8px 8px 0; padding: 10px 16px; margin: 16px 0;
}
[data-typography-theme="chinese-red"] .lz-editor-content code,
[data-typography-theme="chinese-red"] .read-article-body code,
[data-typography-theme="chinese-red"] .preview-doc code,
[data-typography-theme="chinese-red"] .export-preview-body code {
  color: #b03425; background-color: #faece9; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="chinese-red"] .lz-editor-content pre,
[data-typography-theme="chinese-red"] .read-article-body pre,
[data-typography-theme="chinese-red"] .preview-doc pre,
[data-typography-theme="chinese-red"] .export-preview-body pre {
  background: #fef8f6; border: 1px solid #f0d5d0; border-radius: 6px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="chinese-red"] .lz-editor-content pre code,
[data-typography-theme="chinese-red"] .read-article-body pre code,
[data-typography-theme="chinese-red"] .preview-doc pre code,
[data-typography-theme="chinese-red"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="chinese-red"] .lz-editor-content th,
[data-typography-theme="chinese-red"] .read-article-body th,
[data-typography-theme="chinese-red"] .preview-doc th,
[data-typography-theme="chinese-red"] .export-preview-body th { background-color: #f9ebe8; color: #a93226; }
[data-typography-theme="chinese-red"] .lz-editor-content td,
[data-typography-theme="chinese-red"] .read-article-body td,
[data-typography-theme="chinese-red"] .preview-doc td,
[data-typography-theme="chinese-red"] .export-preview-body td { border-color: #f0d5d0; }
[data-typography-theme="chinese-red"] .lz-editor-content hr,
[data-typography-theme="chinese-red"] .read-article-body hr,
[data-typography-theme="chinese-red"] .preview-doc hr,
[data-typography-theme="chinese-red"] .export-preview-body hr { border-top: 1px solid #ecccc6; margin: 24px 0; }
`
}

// ── 签名造型：匾额式上下细线居中标题，h3 圆点 + 尾线 ──
const bambooTeal: TypographyTheme = {
  id: 'bamboo',
  name: '青竹',
  color: '#0e9285',
  tag: '国风 · 读书',
  css: `
[data-typography-theme="bamboo"] .lz-editor-content,
[data-typography-theme="bamboo"] .read-article-body,
[data-typography-theme="bamboo"] .preview-doc,
[data-typography-theme="bamboo"] .export-preview-body {
  color: #0b7268;
}
[data-typography-theme="bamboo"] .lz-editor-content h1,
[data-typography-theme="bamboo"] .read-article-body h1,
[data-typography-theme="bamboo"] .preview-doc h1,
[data-typography-theme="bamboo"] .export-preview-body h1 {
  font-size: 22px; text-align: center; color: #0b7268; letter-spacing: 0.1em;
}
[data-typography-theme="bamboo"] .lz-editor-content h2,
[data-typography-theme="bamboo"] .read-article-body h2,
[data-typography-theme="bamboo"] .preview-doc h2,
[data-typography-theme="bamboo"] .export-preview-body h2 {
  font-size: 18px; text-align: center; color: #0e9285; letter-spacing: 0.15em; margin-top: 24px;
}
[data-typography-theme="bamboo"] .lz-editor-content h2 > span,
[data-typography-theme="bamboo"] .read-article-body h2 > span,
[data-typography-theme="bamboo"] .preview-doc h2 > span,
[data-typography-theme="bamboo"] .export-preview-body h2 > span {
  display: inline-block; border-top: 1px solid #0e9285; border-bottom: 1px solid #0e9285; padding: 6px 18px;
}
[data-typography-theme="bamboo"] .lz-editor-content h3,
[data-typography-theme="bamboo"] .read-article-body h3,
[data-typography-theme="bamboo"] .preview-doc h3,
[data-typography-theme="bamboo"] .export-preview-body h3 {
  font-size: 17px; color: #0b7268; margin-top: 20px;
}
[data-typography-theme="bamboo"] .lz-editor-content h3::before,
[data-typography-theme="bamboo"] .read-article-body h3::before,
[data-typography-theme="bamboo"] .preview-doc h3::before,
[data-typography-theme="bamboo"] .export-preview-body h3::before {
  display: inline-block; width: 5px; height: 5px; background-color: #0e9285; border-radius: 50%; margin-right: 7px; vertical-align: middle; content: '';
}
[data-typography-theme="bamboo"] .lz-editor-content h4,
[data-typography-theme="bamboo"] .read-article-body h4,
[data-typography-theme="bamboo"] .preview-doc h4,
[data-typography-theme="bamboo"] .export-preview-body h4 { font-size: 16px; color: #0b7268; }
[data-typography-theme="bamboo"] .lz-editor-content a,
[data-typography-theme="bamboo"] .read-article-body a,
[data-typography-theme="bamboo"] .preview-doc a,
[data-typography-theme="bamboo"] .export-preview-body a { color: #0e9285; text-decoration: none; border-bottom: 1px solid #79ccc2; }
[data-typography-theme="bamboo"] .lz-editor-content strong,
[data-typography-theme="bamboo"] .read-article-body strong,
[data-typography-theme="bamboo"] .preview-doc strong,
[data-typography-theme="bamboo"] .export-preview-body strong { color: #0b7268; }
[data-typography-theme="bamboo"] .lz-editor-content blockquote,
[data-typography-theme="bamboo"] .read-article-body blockquote,
[data-typography-theme="bamboo"] .preview-doc blockquote,
[data-typography-theme="bamboo"] .export-preview-body blockquote {
  border-left: 2px solid #8fd0c8; background-color: #f3faf8; color: #4f6f6b; border-radius: 0 8px 8px 0; padding: 10px 16px; margin: 16px 0;
}
[data-typography-theme="bamboo"] .lz-editor-content code,
[data-typography-theme="bamboo"] .read-article-body code,
[data-typography-theme="bamboo"] .preview-doc code,
[data-typography-theme="bamboo"] .export-preview-body code {
  color: #0b7268; background-color: #e9f5f2; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="bamboo"] .lz-editor-content pre,
[data-typography-theme="bamboo"] .read-article-body pre,
[data-typography-theme="bamboo"] .preview-doc pre,
[data-typography-theme="bamboo"] .export-preview-body pre {
  background: #f0f8f6; border: 1px solid #b9e2dc; border-radius: 6px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="bamboo"] .lz-editor-content pre code,
[data-typography-theme="bamboo"] .read-article-body pre code,
[data-typography-theme="bamboo"] .preview-doc pre code,
[data-typography-theme="bamboo"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="bamboo"] .lz-editor-content th,
[data-typography-theme="bamboo"] .read-article-body th,
[data-typography-theme="bamboo"] .preview-doc th,
[data-typography-theme="bamboo"] .export-preview-body th { background-color: #e9f5f2; color: #0a655c; }
[data-typography-theme="bamboo"] .lz-editor-content td,
[data-typography-theme="bamboo"] .read-article-body td,
[data-typography-theme="bamboo"] .preview-doc td,
[data-typography-theme="bamboo"] .export-preview-body td { border-color: #d4eae6; }
[data-typography-theme="bamboo"] .lz-editor-content hr,
[data-typography-theme="bamboo"] .read-article-body hr,
[data-typography-theme="bamboo"] .preview-doc hr,
[data-typography-theme="bamboo"] .export-preview-body hr { border-top: 1px solid #b9e2dc; margin: 24px 0; }
`
}

// ── 签名造型：杂志顶线——h2 上方通栏黑细线，衬线字 ──
const magazine: TypographyTheme = {
  id: 'magazine',
  name: '杂志风',
  color: '#1a1a1a',
  tag: '深度 · 评论',
  css: `
[data-typography-theme="magazine"] .lz-editor-content,
[data-typography-theme="magazine"] .read-article-body,
[data-typography-theme="magazine"] .preview-doc,
[data-typography-theme="magazine"] .export-preview-body {
  font-family: Optima, Georgia, "Songti SC", "Noto Serif SC", serif;
  color: #2b2b2b;
}
[data-typography-theme="magazine"] .lz-editor-content p,
[data-typography-theme="magazine"] .read-article-body p,
[data-typography-theme="magazine"] .preview-doc p,
[data-typography-theme="magazine"] .export-preview-body p { line-height: 1.85; }
[data-typography-theme="magazine"] .lz-editor-content h1,
[data-typography-theme="magazine"] .read-article-body h1,
[data-typography-theme="magazine"] .preview-doc h1,
[data-typography-theme="magazine"] .export-preview-body h1 {
  font-size: 24px; text-align: center; letter-spacing: 0.05em; color: #1a1a1a;
}
[data-typography-theme="magazine"] .lz-editor-content h1 > span,
[data-typography-theme="magazine"] .read-article-body h1 > span,
[data-typography-theme="magazine"] .preview-doc h1 > span,
[data-typography-theme="magazine"] .export-preview-body h1 > span {
  display: inline-block; border-bottom: 3px double #1a1a1a; padding-bottom: 8px;
}
[data-typography-theme="magazine"] .lz-editor-content h2,
[data-typography-theme="magazine"] .read-article-body h2,
[data-typography-theme="magazine"] .preview-doc h2,
[data-typography-theme="magazine"] .export-preview-body h2 {
  font-size: 20px; letter-spacing: 0.05em; color: #1a1a1a; border-top: 1px solid #1a1a1a; padding-top: 12px; margin-top: 24px;
}
[data-typography-theme="magazine"] .lz-editor-content h2 > span,
[data-typography-theme="magazine"] .read-article-body h2 > span,
[data-typography-theme="magazine"] .preview-doc h2 > span,
[data-typography-theme="magazine"] .export-preview-body h2 > span {
  display: inline-block; border-bottom: 1px solid #1a1a1a; padding-bottom: 3px;
}
[data-typography-theme="magazine"] .lz-editor-content h3,
[data-typography-theme="magazine"] .read-article-body h3,
[data-typography-theme="magazine"] .preview-doc h3,
[data-typography-theme="magazine"] .export-preview-body h3 {
  font-size: 17px; color: #1a1a1a; margin-top: 20px;
}
[data-typography-theme="magazine"] .lz-editor-content h4,
[data-typography-theme="magazine"] .read-article-body h4,
[data-typography-theme="magazine"] .preview-doc h4,
[data-typography-theme="magazine"] .export-preview-body h4 { font-size: 16px; color: #1a1a1a; }
[data-typography-theme="magazine"] .lz-editor-content a,
[data-typography-theme="magazine"] .read-article-body a,
[data-typography-theme="magazine"] .preview-doc a,
[data-typography-theme="magazine"] .export-preview-body a { color: #1a1a1a; text-decoration: none; border-bottom: 2px solid #d8c9a3; }
[data-typography-theme="magazine"] .lz-editor-content strong,
[data-typography-theme="magazine"] .read-article-body strong,
[data-typography-theme="magazine"] .preview-doc strong,
[data-typography-theme="magazine"] .export-preview-body strong { color: #1a1a1a; }
[data-typography-theme="magazine"] .lz-editor-content em,
[data-typography-theme="magazine"] .read-article-body em,
[data-typography-theme="magazine"] .preview-doc em,
[data-typography-theme="magazine"] .export-preview-body em { color: #6b5d3f; }
[data-typography-theme="magazine"] .lz-editor-content blockquote,
[data-typography-theme="magazine"] .read-article-body blockquote,
[data-typography-theme="magazine"] .preview-doc blockquote,
[data-typography-theme="magazine"] .export-preview-body blockquote {
  border-left: none; background-color: transparent; text-align: center; color: #6b6b6b; font-size: 17px; padding: 26px 24px 6px; background-image: ${quoteMark('d8c9a3')}; background-repeat: no-repeat; background-position: center 4px; background-size: 24px 17px; margin: 20px 0;
}
[data-typography-theme="magazine"] .lz-editor-content blockquote p,
[data-typography-theme="magazine"] .read-article-body blockquote p,
[data-typography-theme="magazine"] .preview-doc blockquote p,
[data-typography-theme="magazine"] .export-preview-body blockquote p { line-height: 1.8; text-align: center; }
[data-typography-theme="magazine"] .lz-editor-content code,
[data-typography-theme="magazine"] .read-article-body code,
[data-typography-theme="magazine"] .preview-doc code,
[data-typography-theme="magazine"] .export-preview-body code {
  color: #8a6d1d; background-color: #f7f2e4; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="magazine"] .lz-editor-content pre,
[data-typography-theme="magazine"] .read-article-body pre,
[data-typography-theme="magazine"] .preview-doc pre,
[data-typography-theme="magazine"] .export-preview-body pre {
  background: #faf7ef; border: 1px solid #e6dfd0; border-radius: 4px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="magazine"] .lz-editor-content pre code,
[data-typography-theme="magazine"] .read-article-body pre code,
[data-typography-theme="magazine"] .preview-doc pre code,
[data-typography-theme="magazine"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="magazine"] .lz-editor-content th,
[data-typography-theme="magazine"] .read-article-body th,
[data-typography-theme="magazine"] .preview-doc th,
[data-typography-theme="magazine"] .export-preview-body th { background-color: #f5f1e6; color: #4a4234; }
[data-typography-theme="magazine"] .lz-editor-content td,
[data-typography-theme="magazine"] .read-article-body td,
[data-typography-theme="magazine"] .preview-doc td,
[data-typography-theme="magazine"] .export-preview-body td { border-color: #e6dfd0; }
[data-typography-theme="magazine"] .lz-editor-content hr,
[data-typography-theme="magazine"] .read-article-body hr,
[data-typography-theme="magazine"] .preview-doc hr,
[data-typography-theme="magazine"] .export-preview-body hr { border-top: 3px double #cccccc; margin: 24px 0; }
[data-typography-theme="magazine"] .lz-editor-content figcaption,
[data-typography-theme="magazine"] .read-article-body figcaption,
[data-typography-theme="magazine"] .preview-doc figcaption,
[data-typography-theme="magazine"] .export-preview-body figcaption { font-style: italic; color: #a39c8c; text-align: center; margin-top: 6px; }
`
}

// ── 签名造型：暗底 Tokyo Night 配色，h2 蓝紫渐变下划线 ──
const nightIndigo: TypographyTheme = {
  id: 'night',
  name: '靛夜',
  color: '#1a1b26',
  tag: '程序员 · 夜读',
  css: `
[data-typography-theme="night"] .lz-editor-content,
[data-typography-theme="night"] .read-article-body,
[data-typography-theme="night"] .preview-doc,
[data-typography-theme="night"] .export-preview-body {
  background-color: #1a1b26; color: #c6cade;
}
[data-typography-theme="night"] .lz-editor-content p,
[data-typography-theme="night"] .read-article-body p,
[data-typography-theme="night"] .preview-doc p,
[data-typography-theme="night"] .export-preview-body p { color: #c6cade; }
[data-typography-theme="night"] .lz-editor-content h1,
[data-typography-theme="night"] .read-article-body h1,
[data-typography-theme="night"] .preview-doc h1,
[data-typography-theme="night"] .export-preview-body h1 {
  font-size: 22px; text-align: center; color: #7aa2f7;
}
[data-typography-theme="night"] .lz-editor-content h2,
[data-typography-theme="night"] .read-article-body h2,
[data-typography-theme="night"] .preview-doc h2,
[data-typography-theme="night"] .export-preview-body h2 {
  font-size: 19px; color: #7aa2f7; margin-top: 24px;
}
[data-typography-theme="night"] .lz-editor-content h2 > span,
[data-typography-theme="night"] .read-article-body h2 > span,
[data-typography-theme="night"] .preview-doc h2 > span,
[data-typography-theme="night"] .export-preview-body h2 > span {
  display: inline-block; padding: 0 2px 8px; background-image: linear-gradient(90deg, #7aa2f7, #bb9af7); background-repeat: no-repeat; background-size: 100% 3px; background-position: 0 100%;
}
[data-typography-theme="night"] .lz-editor-content h3,
[data-typography-theme="night"] .read-article-body h3,
[data-typography-theme="night"] .preview-doc h3,
[data-typography-theme="night"] .export-preview-body h3 {
  font-size: 17px; color: #bb9af7; margin-top: 20px;
}
[data-typography-theme="night"] .lz-editor-content h3::before,
[data-typography-theme="night"] .read-article-body h3::before,
[data-typography-theme="night"] .preview-doc h3::before,
[data-typography-theme="night"] .export-preview-body h3::before {
  display: inline-block; width: 4px; height: 16px; background-color: #bb9af7; margin-right: 8px; border-radius: 2px; content: '';
}
[data-typography-theme="night"] .lz-editor-content h4,
[data-typography-theme="night"] .read-article-body h4,
[data-typography-theme="night"] .preview-doc h4,
[data-typography-theme="night"] .export-preview-body h4 { font-size: 16px; color: #7dcfff; }
[data-typography-theme="night"] .lz-editor-content a,
[data-typography-theme="night"] .read-article-body a,
[data-typography-theme="night"] .preview-doc a,
[data-typography-theme="night"] .export-preview-body a { color: #7aa2f7; text-decoration: none; border-bottom: 1px solid #3d59a1; }
[data-typography-theme="night"] .lz-editor-content strong,
[data-typography-theme="night"] .read-article-body strong,
[data-typography-theme="night"] .preview-doc strong,
[data-typography-theme="night"] .export-preview-body strong { color: #ff9e64; }
[data-typography-theme="night"] .lz-editor-content em,
[data-typography-theme="night"] .read-article-body em,
[data-typography-theme="night"] .preview-doc em,
[data-typography-theme="night"] .export-preview-body em { color: #bb9af7; }
[data-typography-theme="night"] .lz-editor-content blockquote,
[data-typography-theme="night"] .read-article-body blockquote,
[data-typography-theme="night"] .preview-doc blockquote,
[data-typography-theme="night"] .export-preview-body blockquote {
  border-left: 3px solid #414868; background-color: #24283b; color: #9aa5ce; border-radius: 0 8px 8px 0; padding: 10px 16px; margin: 16px 0;
}
[data-typography-theme="night"] .lz-editor-content code,
[data-typography-theme="night"] .read-article-body code,
[data-typography-theme="night"] .preview-doc code,
[data-typography-theme="night"] .export-preview-body code {
  color: #7dcfff; background-color: #292e42; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="night"] .lz-editor-content pre,
[data-typography-theme="night"] .read-article-body pre,
[data-typography-theme="night"] .preview-doc pre,
[data-typography-theme="night"] .export-preview-body pre {
  background: #24283b; border: 1px solid #414868; border-radius: 6px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="night"] .lz-editor-content pre code,
[data-typography-theme="night"] .read-article-body pre code,
[data-typography-theme="night"] .preview-doc pre code,
[data-typography-theme="night"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="night"] .lz-editor-content th,
[data-typography-theme="night"] .read-article-body th,
[data-typography-theme="night"] .preview-doc th,
[data-typography-theme="night"] .export-preview-body th { background-color: #24283b; color: #7aa2f7; }
[data-typography-theme="night"] .lz-editor-content tr:nth-child(even) td,
[data-typography-theme="night"] .read-article-body tr:nth-child(even) td,
[data-typography-theme="night"] .preview-doc tr:nth-child(even) td,
[data-typography-theme="night"] .export-preview-body tr:nth-child(even) td { background-color: #1f2335; }
[data-typography-theme="night"] .lz-editor-content td,
[data-typography-theme="night"] .read-article-body td,
[data-typography-theme="night"] .preview-doc td,
[data-typography-theme="night"] .export-preview-body td { border-color: #414868; }
[data-typography-theme="night"] .lz-editor-content hr,
[data-typography-theme="night"] .read-article-body hr,
[data-typography-theme="night"] .preview-doc hr,
[data-typography-theme="night"] .export-preview-body hr { border-top: 1px solid #414868; margin: 24px 0; }
[data-typography-theme="night"] .lz-editor-content figcaption,
[data-typography-theme="night"] .read-article-body figcaption,
[data-typography-theme="night"] .preview-doc figcaption,
[data-typography-theme="night"] .export-preview-body figcaption { color: #565f89; }
`
}

// ── 签名造型：居中荧光粉标记标题 + 花瓣 h3 ──
const sakura: TypographyTheme = {
  id: 'sakura',
  name: '樱粉',
  color: '#e8618c',
  tag: '女性 · 生活',
  css: `
[data-typography-theme="sakura"] .lz-editor-content,
[data-typography-theme="sakura"] .read-article-body,
[data-typography-theme="sakura"] .preview-doc,
[data-typography-theme="sakura"] .export-preview-body {
  color: #2f2f2f;
}
[data-typography-theme="sakura"] .lz-editor-content h1,
[data-typography-theme="sakura"] .read-article-body h1,
[data-typography-theme="sakura"] .preview-doc h1,
[data-typography-theme="sakura"] .export-preview-body h1 {
  font-size: 22px; text-align: center; color: #d8577f;
}
[data-typography-theme="sakura"] .lz-editor-content h2,
[data-typography-theme="sakura"] .read-article-body h2,
[data-typography-theme="sakura"] .preview-doc h2,
[data-typography-theme="sakura"] .export-preview-body h2 {
  font-size: 19px; text-align: center; color: #2f2f2f; margin-top: 24px;
}
[data-typography-theme="sakura"] .lz-editor-content h2 > span,
[data-typography-theme="sakura"] .read-article-body h2 > span,
[data-typography-theme="sakura"] .preview-doc h2 > span,
[data-typography-theme="sakura"] .export-preview-body h2 > span {
  display: inline-block; padding: 0 6px 3px; background-image: linear-gradient(transparent 58%, #fbdce6 58%);
}
[data-typography-theme="sakura"] .lz-editor-content h3,
[data-typography-theme="sakura"] .read-article-body h3,
[data-typography-theme="sakura"] .preview-doc h3,
[data-typography-theme="sakura"] .export-preview-body h3 {
  font-size: 17px; color: #d8577f; margin-top: 20px;
}
[data-typography-theme="sakura"] .lz-editor-content h3::before,
[data-typography-theme="sakura"] .read-article-body h3::before,
[data-typography-theme="sakura"] .preview-doc h3::before,
[data-typography-theme="sakura"] .export-preview-body h3::before {
  display: inline-block; width: 10px; height: 10px; background-image: linear-gradient(135deg, #f6b6ca, #e8618c); border-radius: 50% 50% 50% 0; margin-right: 8px; vertical-align: middle; content: '';
}
[data-typography-theme="sakura"] .lz-editor-content h4,
[data-typography-theme="sakura"] .read-article-body h4,
[data-typography-theme="sakura"] .preview-doc h4,
[data-typography-theme="sakura"] .export-preview-body h4 { font-size: 16px; color: #d8577f; }
[data-typography-theme="sakura"] .lz-editor-content a,
[data-typography-theme="sakura"] .read-article-body a,
[data-typography-theme="sakura"] .preview-doc a,
[data-typography-theme="sakura"] .export-preview-body a { color: #e8618c; text-decoration: none; border-bottom: 1px solid #f0a1bb; }
[data-typography-theme="sakura"] .lz-editor-content strong,
[data-typography-theme="sakura"] .read-article-body strong,
[data-typography-theme="sakura"] .preview-doc strong,
[data-typography-theme="sakura"] .export-preview-body strong { color: #d8577f; }
[data-typography-theme="sakura"] .lz-editor-content blockquote,
[data-typography-theme="sakura"] .read-article-body blockquote,
[data-typography-theme="sakura"] .preview-doc blockquote,
[data-typography-theme="sakura"] .export-preview-body blockquote {
  border: 1px dashed #f3c3d3; background-color: #fdf6f9; color: #8a6470; border-radius: 12px; padding: 10px 18px; margin: 16px 0;
}
[data-typography-theme="sakura"] .lz-editor-content code,
[data-typography-theme="sakura"] .read-article-body code,
[data-typography-theme="sakura"] .preview-doc code,
[data-typography-theme="sakura"] .export-preview-body code {
  color: #d8577f; background-color: #fcf0f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="sakura"] .lz-editor-content pre,
[data-typography-theme="sakura"] .read-article-body pre,
[data-typography-theme="sakura"] .preview-doc pre,
[data-typography-theme="sakura"] .export-preview-body pre {
  background: #fdf6f9; border: 1px dashed #f0b6c8; border-radius: 8px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="sakura"] .lz-editor-content pre code,
[data-typography-theme="sakura"] .read-article-body pre code,
[data-typography-theme="sakura"] .preview-doc pre code,
[data-typography-theme="sakura"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="sakura"] .lz-editor-content th,
[data-typography-theme="sakura"] .read-article-body th,
[data-typography-theme="sakura"] .preview-doc th,
[data-typography-theme="sakura"] .export-preview-body th { background-color: #fceff4; color: #c94f76; }
[data-typography-theme="sakura"] .lz-editor-content td,
[data-typography-theme="sakura"] .read-article-body td,
[data-typography-theme="sakura"] .preview-doc td,
[data-typography-theme="sakura"] .export-preview-body td { border-color: #f5d9e2; }
[data-typography-theme="sakura"] .lz-editor-content hr,
[data-typography-theme="sakura"] .read-article-body hr,
[data-typography-theme="sakura"] .preview-doc hr,
[data-typography-theme="sakura"] .export-preview-body hr { border-top: 1px dashed #f0b6c8; margin: 24px 0; }
`
}

// ── 签名造型：没有造型——纯字重与灰阶分层，适合万字长文 ──
const minimalGray: TypographyTheme = {
  id: 'minimal',
  name: '极简',
  color: '#8c8c8c',
  tag: '万字长文',
  css: `
[data-typography-theme="minimal"] .lz-editor-content,
[data-typography-theme="minimal"] .read-article-body,
[data-typography-theme="minimal"] .preview-doc,
[data-typography-theme="minimal"] .export-preview-body {
  color: #3d3d3d;
}
[data-typography-theme="minimal"] .lz-editor-content p,
[data-typography-theme="minimal"] .read-article-body p,
[data-typography-theme="minimal"] .preview-doc p,
[data-typography-theme="minimal"] .export-preview-body p { line-height: 1.9; color: #3d3d3d; }
[data-typography-theme="minimal"] .lz-editor-content h1,
[data-typography-theme="minimal"] .read-article-body h1,
[data-typography-theme="minimal"] .preview-doc h1,
[data-typography-theme="minimal"] .export-preview-body h1 {
  font-size: 21px; font-weight: 600; color: #1f1f1f;
}
[data-typography-theme="minimal"] .lz-editor-content h2,
[data-typography-theme="minimal"] .read-article-body h2,
[data-typography-theme="minimal"] .preview-doc h2,
[data-typography-theme="minimal"] .export-preview-body h2 {
  font-size: 18px; font-weight: 600; color: #1f1f1f; margin-top: 24px;
}
[data-typography-theme="minimal"] .lz-editor-content h3,
[data-typography-theme="minimal"] .read-article-body h3,
[data-typography-theme="minimal"] .preview-doc h3,
[data-typography-theme="minimal"] .export-preview-body h3 {
  font-size: 16px; font-weight: 600; color: #1f1f1f; margin-top: 20px;
}
[data-typography-theme="minimal"] .lz-editor-content h4,
[data-typography-theme="minimal"] .read-article-body h4,
[data-typography-theme="minimal"] .preview-doc h4,
[data-typography-theme="minimal"] .export-preview-body h4 { font-size: 15px; font-weight: 600; color: #404040; }
[data-typography-theme="minimal"] .lz-editor-content a,
[data-typography-theme="minimal"] .read-article-body a,
[data-typography-theme="minimal"] .preview-doc a,
[data-typography-theme="minimal"] .export-preview-body a { color: #1f1f1f; text-decoration: none; border-bottom: 1px solid #c9c9c9; }
[data-typography-theme="minimal"] .lz-editor-content strong,
[data-typography-theme="minimal"] .read-article-body strong,
[data-typography-theme="minimal"] .preview-doc strong,
[data-typography-theme="minimal"] .export-preview-body strong { color: #000; font-weight: 600; }
[data-typography-theme="minimal"] .lz-editor-content em,
[data-typography-theme="minimal"] .read-article-body em,
[data-typography-theme="minimal"] .preview-doc em,
[data-typography-theme="minimal"] .export-preview-body em { color: #595959; }
[data-typography-theme="minimal"] .lz-editor-content blockquote,
[data-typography-theme="minimal"] .read-article-body blockquote,
[data-typography-theme="minimal"] .preview-doc blockquote,
[data-typography-theme="minimal"] .export-preview-body blockquote {
  border-left: 2px solid #e0e0e0; background-color: transparent; color: #8c8c8c; padding: 1px 18px; margin: 16px 0;
}
[data-typography-theme="minimal"] .lz-editor-content code,
[data-typography-theme="minimal"] .read-article-body code,
[data-typography-theme="minimal"] .preview-doc code,
[data-typography-theme="minimal"] .export-preview-body code {
  color: #595959; background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;
}
[data-typography-theme="minimal"] .lz-editor-content pre,
[data-typography-theme="minimal"] .read-article-body pre,
[data-typography-theme="minimal"] .preview-doc pre,
[data-typography-theme="minimal"] .export-preview-body pre {
  background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 4px; padding: 14px 16px; margin: 16px 0; overflow-x: auto;
}
[data-typography-theme="minimal"] .lz-editor-content pre code,
[data-typography-theme="minimal"] .read-article-body pre code,
[data-typography-theme="minimal"] .preview-doc pre code,
[data-typography-theme="minimal"] .export-preview-body pre code { background: none; padding: 0; color: inherit; }
[data-typography-theme="minimal"] .lz-editor-content th,
[data-typography-theme="minimal"] .read-article-body th,
[data-typography-theme="minimal"] .preview-doc th,
[data-typography-theme="minimal"] .export-preview-body th { background-color: #fafafa; }
[data-typography-theme="minimal"] .lz-editor-content td,
[data-typography-theme="minimal"] .read-article-body td,
[data-typography-theme="minimal"] .preview-doc td,
[data-typography-theme="minimal"] .export-preview-body td { border-color: #eaeaea; }
[data-typography-theme="minimal"] .lz-editor-content hr,
[data-typography-theme="minimal"] .read-article-body hr,
[data-typography-theme="minimal"] .preview-doc hr,
[data-typography-theme="minimal"] .export-preview-body hr { border-top: 1px solid #eee; margin: 24px 0; }
`
}

export const TYPOGRAPHY_THEMES: TypographyTheme[] = [
  classic,
  wechatGreen,
  techBlue,
  lanying,
  orangeHeart,
  violet,
  ink,
  chineseRed,
  bambooTeal,
  magazine,
  nightIndigo,
  sakura,
  minimalGray,
]

export function getTypographyTheme(id: string): TypographyTheme | undefined {
  return TYPOGRAPHY_THEMES.find(t => t.id === id)
}

export function getActiveTypographyTheme(): TypographyTheme | undefined {
  const id = document.documentElement.getAttribute('data-typography-theme')
  return getTypographyTheme(id ?? '')
}

/**
 * Apply a typography theme by injecting / updating a <style> tag in document.head.
 * Also sets data-typography-theme attribute on root for CSS cascade.
 */
export function applyTypographyTheme(themeId: string): void {
  const theme = getTypographyTheme(themeId)
  const root = document.documentElement
  root.setAttribute('data-typography-theme', themeId)

  let styleEl = document.getElementById('lz-typography-theme-css') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'lz-typography-theme-css'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = theme?.css ?? ''
}
