#!/usr/bin/env node
// Compiles Swift helpers after npm install.
// Only runs on macOS — skipped silently on other platforms.

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

if (process.platform !== 'darwin') {
  console.log('build-helpers: skipping Swift compilation (not macOS)')
  process.exit(0)
}

const helpersDir = path.join(__dirname, '..', 'helpers')

const helpers = [
  { src: 'copy_selection.swift', out: 'copy_selection' },
]

for (const { src, out } of helpers) {
  const srcPath = path.join(helpersDir, src)
  const outPath = path.join(helpersDir, out)

  if (!fs.existsSync(srcPath)) {
    console.warn(`build-helpers: source not found: ${srcPath}`)
    continue
  }

  try {
    execSync(`swiftc "${srcPath}" -o "${outPath}"`, { stdio: 'inherit' })
    fs.chmodSync(outPath, 0o755)
    console.log(`build-helpers: compiled ${src} → helpers/${out}`)
  } catch (e) {
    console.error(`build-helpers: failed to compile ${src}`)
    console.error('Make sure Xcode Command Line Tools are installed: xcode-select --install')
    process.exit(1)
  }
}
