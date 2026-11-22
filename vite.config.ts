import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // monaco-editor 0.57 exports-map rewrites deep imports — alias workers to real files
      { find: /^monaco-editor\/esm\/vs\/editor\/editor\.worker\.js/, replacement: path.resolve(__dirname, "node_modules/monaco-editor/esm/vs/editor/editor.worker.js") },
      { find: /^monaco-editor\/esm\/vs\/language\/css\/css\.worker\.js/, replacement: path.resolve(__dirname, "node_modules/monaco-editor/esm/vs/language/css/css.worker.js") },
      { find: /^monaco-editor\/esm\/vs\/language\/html\/html\.worker\.js/, replacement: path.resolve(__dirname, "node_modules/monaco-editor/esm/vs/language/html/html.worker.js") },
      { find: /^monaco-editor\/esm\/vs\/language\/typescript\/ts\.worker\.js/, replacement: path.resolve(__dirname, "node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js") },
    ],
  },
});
