import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // e2e/ holds Playwright specs (import from @playwright/test, run by a
    // separate runner) — without this, Vitest's default *.spec.ts glob picks
    // them up too and crashes on the conflicting test.describe() global.
    // Specifying `exclude` replaces Vitest's own default list rather than
    // extending it, so the usual defaults are repeated here alongside it.
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      'e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', '.next', 'src/test'],
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
