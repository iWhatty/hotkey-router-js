// build.js
//
// Production build script for hotkey-router.
//
// Outputs:
//  - dist/hotkey-router.js       (ESM, readable, sourcemap)
//  - dist/hotkey-router.min.js   (ESM, minified for CDN)
//  - dist/hotkey-router.cjs      (CommonJS for require() consumers)
//
// Notes:
//  - We do NOT bundle (bundle: false) because this is a zero-dependency library.
//  - We target modern environments (ES2020).
//  - dist/ is fully recreated on every build to avoid stale artifacts.

import { build } from 'esbuild'
import { rmSync, mkdirSync, readFileSync } from 'node:fs'

// --- Read package metadata (robust across Node versions) ---
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
)

const banner = {
  // Keep banner short so it doesn’t bloat minified output.
  js: `// hotkey-router v${pkg.version} | ${pkg.license}\n`,
}

// --- Clean dist directory ---
// Remove previous build output to prevent stale files.
rmSync('dist', { recursive: true, force: true })
mkdirSync('dist')

// --- ESM (readable + sourcemap) ---
// Primary entry used by modern bundlers and Node ESM.
await build({
  entryPoints: ['hotkey-router.js'],
  outfile: 'dist/hotkey-router.js',
  format: 'esm',
  bundle: false,
  sourcemap: true,
  target: 'es2020',
  banner,
})

// --- ESM (minified) ---
// Optimized for CDN usage and production delivery.
await build({
  entryPoints: ['hotkey-router.js'],
  outfile: 'dist/hotkey-router.min.js',
  format: 'esm',
  bundle: false,
  minify: true,
  target: 'es2020',
  banner,
})

// --- CommonJS build ---
// Enables require('hotkey-router') compatibility.
await build({
  entryPoints: ['hotkey-router.js'],
  outfile: 'dist/hotkey-router.cjs',
  format: 'cjs',
  bundle: false,
  sourcemap: true,
  target: 'es2020',
  banner,
})

console.log('✓ Built dist/')