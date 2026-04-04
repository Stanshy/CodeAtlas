import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // No test files yet — CLI integration tests are planned for Sprint 2.
    // passWithNoTests prevents vitest from exiting with code 1 in CI when
    // the test suite is intentionally empty.
    passWithNoTests: true,
  },
});
