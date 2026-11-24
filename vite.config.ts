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
    // 这里把编辑器运行时单独成块，让核心 UI 与编辑器库可独立缓存。
    // react 抽成独立块：它被所有懒加载块共享，和 app 主块拆开能独立缓存
    // （改业务代码不重下框架，改框架不重下业务）
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@codemirror') || id.includes('@lezer')) return 'vendor-codemirror'
            if (id.includes('/xlsx') || id.includes('/jszip') || id.includes('/epub')) return 'vendor-export'
            if (id.includes('katex')) return 'vendor-katex'
            if (id.includes('markdown-it')) return 'vendor-markdown'
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')
              || id.includes('/node_modules/scheduler/')) return 'vendor-react'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    // Ctrl+S 保存历史走后端（server/src/index.ts 的 /api/versions）：
    // dev 经 vite 代理转发到本机 3001；LPK 里 /api/ 由 lzcinit 直接 exec://3001。
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
