import { fileURLToPath, URL } from 'node:url'
import ElementPlus from 'unplugin-element-plus/vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig((env) => ({
  base: env.command === 'serve' ? '/' : '/otomad-online/',
  server: {
    host: '0.0.0.0',
    // port: 3000
  },
  plugins: [
    ElementPlus({ defaultLocale: 'zh-cn' }),
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
}))
