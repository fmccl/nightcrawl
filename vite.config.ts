import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { index: "./index.html", worklet: fileURLToPath(new URL("./src/worklet/worklet.ts", import.meta.url)) },
      output: {
        entryFileNames: "[name].js",
      }
    }
  }
})
