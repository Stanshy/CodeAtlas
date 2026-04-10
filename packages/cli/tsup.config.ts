import { defineConfig } from 'tsup';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Recursively copy a directory.
 */
function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

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
  // Bundle @codeatlas/core into the CLI output so npm users don't need
  // to install it separately. Core is a workspace dependency that would
  // otherwise be treated as external by tsup.
  noExternal: ['@codeatlas/core'],
  sourcemap: false,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2022',
  banner: {
    // Inject the Node.js shebang only into the ESM entry that is used as the bin target.
    js: '#!/usr/bin/env node',
  },
  async onSuccess() {
    // 1. Copy locale JSON files to dist/locales/
    const localeSrc = path.resolve('src/locales');
    const localeDest = path.resolve('dist/locales');
    fs.mkdirSync(localeDest, { recursive: true });
    for (const file of fs.readdirSync(localeSrc)) {
      if (file.endsWith('.json')) {
        fs.copyFileSync(path.join(localeSrc, file), path.join(localeDest, file));
      }
    }

    // 2. Bundle web dist into cli dist/web/ for npm distribution.
    //    This allows `npm install -g codeatlas` to work without the monorepo.
    const webDistSrc = path.resolve('..', 'web', 'dist');
    const webDistDest = path.resolve('dist', 'web');
    if (fs.existsSync(webDistSrc)) {
      copyDirSync(webDistSrc, webDistDest);
      const fileCount = fs.readdirSync(webDistDest).length;
      console.log(`  Bundled web dist (${fileCount} entries) → dist/web/`);
    } else {
      console.warn('  ⚠ packages/web/dist not found — run web build first');
    }
  },
});
