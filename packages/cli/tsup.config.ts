import { defineConfig } from 'tsup';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    compilerOptions: {
      composite: false,
      declaration: true,
      declarationMap: true,
    },
  },
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2022',
  banner: {
    // Inject the Node.js shebang only into the ESM entry that is used as the bin target.
    js: '#!/usr/bin/env node',
  },
  async onSuccess() {
    // Copy locale JSON files to dist/locales/ so readFileSync can find them
    // when running from the built dist/ directory.
    const srcDir = path.resolve('src/locales');
    const destDir = path.resolve('dist/locales');
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of fs.readdirSync(srcDir)) {
      if (file.endsWith('.json')) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }
    }
  },
});
