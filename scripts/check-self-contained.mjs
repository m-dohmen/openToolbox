#!/usr/bin/env node
// Fails when any given HTML file references an external resource.
// The built tool and the published demos must render with the network cable
// pulled; this gate keeps that promise enforced instead of remembered.
//
// Usage: node scripts/check-self-contained.mjs FILE_OR_DIR [FILE_OR_DIR ...]
// Directories are walked for *.html files.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Only references a renderer fetches on its own. Plain links
// (<a href="https://...">) are deliberate content and stay allowed.
// Patterns are case-sensitive on purpose: CSS url() is lowercase, and the
// minified bundle contains `new URL("https://...")` for the usage counter,
// which must not trip this check.
const PATTERNS = [
  ['external script src', /<script\b[^>]*\bsrc\s*=\s*(["']?)(?:https?:)?\/\//],
  ['external link href', /<link\b[^>]*\bhref\s*=\s*(["']?)(?:https?:)?\/\//],
  ['external image', /<(?:img|image)\b[^>]*\b(?:src|href)\s*=\s*(["']?)(?:https?:)?\/\//],
  ['external frame or media', /<(?:iframe|audio|video|source|embed|track)\b[^>]*\bsrc\s*=\s*(["']?)(?:https?:)?\/\//],
  ['external svg use', /<use\b[^>]*\b(?:xlink:)?href\s*=\s*(["']?)(?:https?:)?\/\//],
  ['external srcset', /\bsrcset\s*=\s*(["'])[^"']*(?:https?:)?\/\//],
  ['css @import', /@import\b/],
  ['css external url()', /url\(\s*(["']?)(?:https?:)?\/\//],
]

function collectFiles(target, out) {
  const s = statSync(target)
  if (s.isDirectory()) {
    for (const entry of readdirSync(target)) collectFiles(join(target, entry), out)
  } else if (target.endsWith('.html')) {
    out.push(target)
  }
}

function findViolations(text) {
  const found = []
  for (const [label, source] of PATTERNS) {
    const re = new RegExp(source.source, source.flags + 'g')
    let m
    while ((m = re.exec(text)) !== null) {
      const line = text.slice(0, m.index).split('\n').length
      const excerpt = text.slice(m.index, m.index + 90).replace(/\s+/g, ' ')
      found.push({ label, line, excerpt })
      if (m.index === re.lastIndex) re.lastIndex++
    }
  }
  return found
}

const targets = process.argv.slice(2)
if (targets.length === 0) {
  console.error('usage: node scripts/check-self-contained.mjs FILE_OR_DIR [FILE_OR_DIR ...]')
  process.exit(2)
}

const files = []
for (const t of targets) collectFiles(resolve(t), files)

let bad = 0
for (const file of files) {
  for (const v of findViolations(readFileSync(file, 'utf8'))) {
    bad++
    console.error(`${file}:${v.line}: ${v.label}: ${v.excerpt}...`)
  }
}

console.log(`checked ${files.length} file(s), ${bad} violation(s)`)
process.exit(bad > 0 ? 1 : 0)
