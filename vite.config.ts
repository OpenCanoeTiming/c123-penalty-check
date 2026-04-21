/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
  ],
  server: {
    fs: {
      // Allow serving fonts from linked timing-design-system package
      allow: ['.', '../timing-design-system'],
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // Bypass package exports to access source CSS files directly
      '@opencanoetiming/timing-design-system/src': resolve(
        __dirname,
        'node_modules/@opencanoetiming/timing-design-system/src'
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
    },
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react')) {
              return 'vendor'
            }
          }
        },
      },
    },
  },
  esbuild: {
    // Keep console.error and console.warn in production for debugging
    // Only drop debugger statements
    drop: ['debugger'],
    pure: ['console.log', 'console.debug', 'console.trace'],
    legalComments: 'none',
  },
})
