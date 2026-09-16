import { create } from 'zustand'
import type { ThemeState } from '../shared/types'

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  accentColor: '#5b8c5a',
}))
