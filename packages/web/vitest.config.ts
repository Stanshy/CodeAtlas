import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['__tests__/setup-i18n.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/types/**',
        'src/main.tsx',
        'src/styles/**',
        // Components require full React Flow rendering context — tested via E2E in Sprint 3
        'src/components/**',
        // App.tsx is integration — tested via E2E
        'src/App.tsx',
        // API layer requires network — integration test
        'src/api/**',
        // Force layout requires d3-force simulation — integration test
        'src/hooks/useForceLayout.ts',
        // Viewport animation requires React Flow context
        'src/hooks/useViewportAnimation.ts',
        // useGraphData requires fetch — integration test
        'src/hooks/useGraphData.ts',
      ],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
