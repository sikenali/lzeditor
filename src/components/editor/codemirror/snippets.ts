export interface MarkdownSnippet {
  trigger: string
  label: string
  body: string
}

export const DEFAULT_SNIPPETS: MarkdownSnippet[] = [
  { trigger: '/heading', label: 'Heading', body: '## Heading\n' },
  { trigger: '/quote', label: 'Blockquote', body: '> quote\n' },
  { trigger: '/code', label: 'Code block', body: '```\ncode\n```' },
  { trigger: '/table', label: 'Table', body: '| Header 1 | Header 2 |\n| -------- | -------- |\n|          |          |' },
  { trigger: '/hr', label: 'Horizontal rule', body: '\n---\n' },
  { trigger: '/bold', label: 'Bold', body: '**bold**' },
  { trigger: '/italic', label: 'Italic', body: '*italic*' },
  { trigger: '/strike', label: 'Strikethrough', body: '~~strikethrough~~' },
  { trigger: '/code-inline', label: 'Inline code', body: '`code`' },
  { trigger: '/link', label: 'Link', body: '[text](url)' },
  { trigger: '/image', label: 'Image', body: '![alt](url)' },
  { trigger: '/task', label: 'Task list', body: '- [ ] task item\n- [x] completed task' },
  { trigger: '/math', label: 'Math block', body: '$$\n\\int_0^\\infty e^{-x} dx = 1\n$$' },
  { trigger: '/math-inline', label: 'Inline math', body: '$E = mc^2$' },
  { trigger: '/mermaid', label: 'Mermaid', body: '```mermaid\nflowchart LR\n  A --> B\n```' },
]
