import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // onnxruntime-web resolves its .wasm / worker .mjs relative to its own module
  // URL. Keep it out of the esbuild cache so Vite serves those siblings straight
  // from node_modules in dev, and emits them as hashed assets on build.
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  server: {
    port: 5173,
  },
})