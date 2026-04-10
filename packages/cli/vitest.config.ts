import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    // passWithNoTests allows CI to pass if the only tests present are
    // intentionally disabled or the suite is temporarily empty.
    passWithNoTests: true,
  },
});
