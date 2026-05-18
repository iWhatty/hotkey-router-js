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
//  - We bundle (bundle: true) so the reservations data JSON is inlined into
//    the dist files. Library is still zero-dependency — the only thing being
//    pulled in is local `./reservations.js` + `./data/browser-hotkeys.json`.
//  - We target modern environments (ES2020).
//  - dist/ is fully recreated on every build to avoid stale artifacts.

import { build } from 'esbuild'
import { rmSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

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

const common = {
  entryPoints: ['hotkey-router.js'],
  bundle: true,
  target: 'es2020',
  // The JSON data file is plain data; bundle it inline.
  loader: { '.json': 'json' },
}

// --- ESM (readable + sourcemap) ---
await build({
  ...common,
  outfile: 'dist/hotkey-router.js',
  format: 'esm',
  sourcemap: true,
  banner,
})

// --- ESM (minified) ---
await build({
  ...common,
  outfile: 'dist/hotkey-router.min.js',
  format: 'esm',
  minify: true,
  banner,
})

// --- CommonJS build ---
await build({
  ...common,
  outfile: 'dist/hotkey-router.cjs',
  format: 'cjs',
  sourcemap: true,
  banner,
})

// --- reservations standalone (ESM) ---
// Lets consumers `import { lookupReservation } from 'hotkey-router/reservations.js'`
// without pulling in the full router. JSON data is bundled inline.
await build({
  entryPoints: ['reservations.js'],
  outfile: 'dist/reservations.js',
  format: 'esm',
  bundle: true,
  target: 'es2020',
  sourcemap: true,
  loader: { '.json': 'json' },
  banner,
})

// --- Bundle size report ---
const report = (file) => {
  const raw = readFileSync(file)
  const gz = gzipSync(raw)
  return `${file}: ${raw.length} B raw, ${gz.length} B gzip`
}

console.log('✓ Built dist/')
console.log('  ' + report('dist/hotkey-router.js'))
console.log('  ' + report('dist/hotkey-router.min.js'))
console.log('  ' + report('dist/hotkey-router.cjs'))
console.log('  ' + report('dist/reservations.js'))
