import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Produces a single self-contained HTML file (JS/CSS inlined, no ES module
// script tags) that can be opened directly via a file:// URL — double-click
// to run, no dev server or local web server needed.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: '../PayGuard-Production-Build',
    emptyOutDir: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
})
