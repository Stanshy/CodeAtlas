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
  noExternal: ['@codeatlas/core'],
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

    // Copy web UI dist into dist/web/ so the CLI works when installed from npm
    // (where the monorepo structure is not available).
    const webDistSrc = path.resolve('..', 'web', 'dist');
    const webDistDest = path.resolve('dist', 'web');
    if (fs.existsSync(webDistSrc)) {
      copyDirRecursive(webDistSrc, webDistDest);
    }
  },
});

/**
 * Recursively copy a directory and all its contents.
 */
function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
