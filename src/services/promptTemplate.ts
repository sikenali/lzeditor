export interface PromptVars {
  selected_text: string
  context?: string
  context_before?: string
  context_after?: string
  style?: string
  user_instruction?: string
  word_count?: number
  target?: string
}

const TEMPLATES: Record<string, (v: PromptVars) => string> = {
  rewrite: (v) => `你是一个专业的文字编辑。请对以下 Markdown 文本进行改写，保持原意不变，提升表达质量，使其更符合${v.style || '自然流畅'}风格。

上下文（前后各2段）：
${v.context_before || ''}
━━━━━━━━
${v.selected_text}
━━━━━━━━
${v.context_after || ''}

直接输出改写后的文本，不要包含解释说明。`,

  polish: (v) => `请对以下 Markdown 文本进行专业润色：
1. 修正语法和拼写错误
2. 优化句子结构和表达
3. 保持原有语气和风格

原文：
${v.selected_text}

上下文：
${v.context || ''}

直接输出润色后的文本，使用 Markdown 格式。`,

  continue: (v) => `你正在协助撰写一篇 Markdown 文档。请根据以下内容，续写后续段落，保持风格一致、逻辑连贯、语言流畅。

前文：
${v.context_before || ''}${v.selected_text}

续写方向：${v.user_instruction || '保持原文风格'}
续写字数：约${v.word_count || 200}字

直接输出续写内容，不要包含"以下是续写"等引导语。`,

  summarize: (v) => `请为以下 Markdown 段落生成一个简洁的摘要：
- 提炼核心观点
- 控制在 1-3 句话
- 保留关键数据或结论

原文：
${v.selected_text}`,

  translate: (v) => `请将以下 Markdown 文本翻译为${v.target || '中文'}，保持格式不变：

${v.selected_text}`,
}

export function buildPrompt(action: string, vars: PromptVars): string {
  const template = TEMPLATES[action]
  if (!template) return vars.selected_text
  return template(vars)
}
