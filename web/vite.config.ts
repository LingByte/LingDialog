import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true, // 允许外部访问
    watch: {
      // 启用文件系统监听
      usePolling: false, // 在 macOS 上通常不需要轮询
      interval: 100, // 轮询间隔（如果启用轮询）
    },
    hmr: {
      // HMR 配置 - 确保实时更新正常工作
      overlay: true, // 显示错误覆盖层
    },
    // 确保文件更改时立即重新加载
    fs: {
      // 允许访问工作区根目录之外的文件
      strict: false,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // 生产环境关闭sourcemap提升性能
    minify: 'esbuild', // 使用 esbuild 替代 terser
    rollupOptions: {
      output: {
        manualChunks: {
          // 将第三方库分离到单独的chunk
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          utils: ['tailwind-merge'],
        },
      },
    },
    // 启用gzip压缩
    reportCompressedSize: true,
    // 设置chunk大小警告限制
    chunkSizeWarningLimit: 1000,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
  },
})
