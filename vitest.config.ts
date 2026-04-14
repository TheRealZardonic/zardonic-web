import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        'src/components/ui/**',
        'api/**',
      ],
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 50,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
