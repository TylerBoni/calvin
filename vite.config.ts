import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte'],
          ai: ['openai'],
          auth: ['@auth/sveltekit', 'lucia']
        }
      }
    }
  },
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
    }
  }
})
