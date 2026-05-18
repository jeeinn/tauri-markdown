import {defineConfig} from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'
import ElementPlus from 'unplugin-element-plus/vite'

// vditor local cdn
import fs from "fs-extra"
// auto copy vditor dist
try {
  fs.copySync('node_modules/vditor/dist', 'public/vditor-cdn/dist', {})
  console.log('Copy vditor dist as local cdn success!')
} catch (err) {
  console.error(err)
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      // 优化：只扫描 src 目录，排除 node_modules 和 dist
      dirs: ['src/components'],
      extensions: ['vue'],
      deep: true,
      dts: false, // 禁用类型声明生成，加快构建速度
    }),
    ElementPlus({
      resolvers: [ElementPlusResolver()],
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
  },
  // to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri 2 uses modern Chromium
    target: ["es2022", "chrome105", "safari16"],
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 优化 chunk 大小警告阈值（从默认的 500KB 提高到 1MB）
    chunkSizeWarningLimit: 1000,
    // 启用 rollup 缓存
    cacheDir: 'node_modules/.vite',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Vue 核心库
            if (id.includes('vue')) return 'vue'
            // Vditor 编辑器
            if (id.includes('vditor')) return 'vditor'
            // Element Plus UI 库
            if (id.includes('element-plus')) return 'element-plus'
            // html2pdf.js 单独分包（体积大，按需加载）
            if (id.includes('html2pdf') || id.includes('pdfmake') || id.includes('html2canvas')) {
              return 'pdf-libs'
            }
          }
        },
        // 优化 chunk 命名，避免 hash 变化导致缓存失效
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
});
