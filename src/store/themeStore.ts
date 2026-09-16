import { create } from 'zustand'
import type { ThemeState } from '../shared/types'

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  accentColor: '#39FF9E',
}))
