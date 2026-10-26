import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // Electron 用 file:// 加载 dist/index.html，绝对路径 /assets/* 会解析成 file:///assets/* 而 404，
  // 所以资产一律走相对路径
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // echarts / emoji-picker-react 已由 App.tsx 里的 React.lazy 切分，
    // 这里把编辑器运行时单独成块，让核心 UI 与编辑器库可独立缓存
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@codemirror') || id.includes('@lezer')) return 'vendor-codemirror'
            if (id.includes('/xlsx') || id.includes('/jszip') || id.includes('/epub')) return 'vendor-export'
            if (id.includes('katex')) return 'vendor-katex'
            if (id.includes('markdown-it')) return 'vendor-markdown'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    // AI 请求由前端直连 provider，/api 代理已随 server/src/routes 一起删除，不再需要
  },
})
