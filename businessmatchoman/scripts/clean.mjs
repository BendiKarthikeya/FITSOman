#!/usr/bin/env node
/**
 * Safe local cleanup script.
 * Removes common temp/patch artifacts and sensitive stray files that should not be committed.
 * Cross-platform and dependency-free.
 */
import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();

// Define relative path matchers (POSIX-style) for files to delete
const patterns = [
  /^\.admin-.*\.cjs$/, // root dotfiles
  /^\.apply-.*\.cjs$/,
  /^\.audit-.*\.cjs$/,
  /^\.check-.*\.cjs$/,
  /^\.fix-.*\.cjs$/,
  /^\.patch-.*\.cjs$/,
  /^\$null$/, // stray file sometimes created by shells
  /^dburl\.txt$/, // sensitive local file
  /^docs\/admin-i18n-audit-.*\.txt$/, // reports
  /^server\/\.\w.*\.tmp$/, // hidden tmp files in server
  /^server\/.*\.tmp$/, // tmp files in server
];

/** Convert a native path to POSIX for regex matching */
function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** Recursively list files under a directory */
function listFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip common large or irrelevant dirs
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      out.push(...listFiles(full));
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function shouldDelete(relPosix) {
  return patterns.some((re) => re.test(relPosix));
}

function main() {
  const files = listFiles(repoRoot);
  const toRemove = [];
  for (const f of files) {
    const rel = path.relative(repoRoot, f);
    const relPosix = toPosix(rel);
    if (shouldDelete(relPosix)) {
      toRemove.push({ abs: f, rel: relPosix });
    }
  }

  if (toRemove.length === 0) {
    console.log('No matching temp/sensitive files found.');
    return;
  }

  for (const f of toRemove) {
    try {
      fs.rmSync(f.abs, { force: true });
      console.log('Removed', f.rel);
    } catch (err) {
      console.warn('Failed to remove', f.rel, '-', err.message);
    }
  }
}

main();

