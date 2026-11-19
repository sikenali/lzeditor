import type { AIMode, AIAction } from './types'

export const AI_MODES: Record<AIMode, { label: string; icon: string; hint: string; defaultAction: AIAction }> = {
  write:    { label: '写作', icon: 'ri-pen-nib-line',  hint: '改写、润色或续写…', defaultAction: 'rewrite' },
  review:   { label: '审校', icon: 'ri-eye-2-line',    hint: '审校、摘要或提问…', defaultAction: 'summarize' },
  create:   { label: '创作', icon: 'ri-sparkling-line', hint: '续写、起草…',       defaultAction: 'continue' },
  research: { label: '研究', icon: 'ri-search-line',    hint: '提问、检索…',       defaultAction: 'question' },
}

export const AI_MODE_ORDER: AIMode[] = ['write', 'review', 'create', 'research']
