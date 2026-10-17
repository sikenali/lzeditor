import { heroui } from "@heroui/theme/plugin"
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts}',
  ],
  darkMode: 'class',
  plugins: [
    heroui({
      defaultTheme: 'dark',
      defaultExtendTheme: 'dark',
      themes: {
        dark: {
          extend: 'dark',
          colors: {
            background: '#0a0a0a',
            foreground: '#f5f5f7',
            content1: '#1c1c1e',
            content2: '#2c2c2e',
            content3: '#3a3a3c',
            content4: '#151517',
            divider: 'rgba(255,255,255,0.08)',
            primary: {
              50: 'rgba(59,168,115,0.03)',
              100: 'rgba(59,168,115,0.05)',
              200: 'rgba(59,168,115,0.08)',
              300: 'rgba(59,168,115,0.10)',
              400: 'rgba(59,168,115,0.15)',
              500: '#3ba873',
              600: 'rgba(59,168,115,0.60)',
              foreground: '#ffffff',
            },
          },
          layout: {
            fontSize: { tiny: '0.7rem', small: '0.8rem', medium: '0.9rem', large: '1rem' },
            borderRadius: { small: '0.25rem', medium: '0.5rem', large: '0.75rem' },
          },
        },
        light: {
          extend: 'light',
          colors: {
            background: '#f5f0e8',
            foreground: '#3d3226',
            content1: '#fdf9f0',
            content2: '#ffffff',
            content3: '#efe9dc',
            content4: '#f0ebe0',
            divider: 'rgba(0,0,0,0.08)',
            primary: {
              50: 'rgba(59,168,115,0.03)',
              100: 'rgba(59,168,115,0.05)',
              200: 'rgba(59,168,115,0.08)',
              300: 'rgba(59,168,115,0.10)',
              400: 'rgba(59,168,115,0.15)',
              500: '#3ba873',
              600: 'rgba(59,168,115,0.60)',
              foreground: '#ffffff',
            },
          },
          layout: {
            fontSize: { tiny: '0.7rem', small: '0.8rem', medium: '0.9rem', large: '1rem' },
            borderRadius: { small: '0.25rem', medium: '0.5rem', large: '0.75rem' },
          },
        },
      },
    }),
  ],
}

export default config
