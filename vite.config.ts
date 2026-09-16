import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'md-raw-loader',
      enforce: 'pre',
      transform(code, id) {
        if (id.endsWith('.md?raw') || id.endsWith('.md&type=raw')) {
          const file = id.replace(/\?raw.*$/, '')
          return { code: `export default ${JSON.stringify(readFileSync(file, 'utf8'))}`, map: null }
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
