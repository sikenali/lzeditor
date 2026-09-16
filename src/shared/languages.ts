export const LANGUAGES = [
  { code: 'zh', name: '简体中文', native: '中文' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ja', name: '日本語', native: '日本語' },
  { code: 'ko', name: '한국어', native: '한국어' },
  { code: 'fr', name: 'Français', native: 'Français' },
  { code: 'de', name: 'Deutsch', native: 'Deutsch' },
  { code: 'es', name: 'Español', native: 'Español' },
  { code: 'ru', name: 'Русский', native: 'Русский' },
  { code: 'ar', name: 'العربية', native: 'العربية' },
  { code: 'pt', name: 'Português', native: 'Português' },
  { code: 'it', name: 'Italiano', native: 'Italiano' },
  { code: 'hi', name: 'हिन्दী', native: 'हिन्दी' },
] as const

export type LanguageCode = typeof LANGUAGES[number]['code']
