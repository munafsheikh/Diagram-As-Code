#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');

const writeMode = process.argv.includes('--write');
const root = process.cwd();
const allowedExtensions = new Set(['.js', '.json', '.md', '.yml', '.yaml', '.puml']);
const ignored = new Set(['node_modules', '.git', 'dist']);

async function gatherFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const collected = [];

  for (const entry of entries) {
    if (ignored.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await gatherFiles(fullPath)));
    } else if (allowedExtensions.has(path.extname(entry.name))) {
      collected.push(fullPath);
    }
  }

  return collected;
}

function normalize(content) {
  const unix = content.replace(/\r\n/g, '\n');
  const trimmedLines = unix
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');
  return trimmedLines.endsWith('\n') ? trimmedLines : `${trimmedLines}\n`;
}

async function main() {
  const files = await gatherFiles(root);
  const diffs = [];

  for (const file of files) {
    const original = await fs.readFile(file, 'utf-8');
    const normalized = normalize(original);

    if (original !== normalized) {
      diffs.push(path.relative(root, file));
      if (writeMode) {
        await fs.writeFile(file, normalized, 'utf-8');
      }
    }
  }

  if (diffs.length && !writeMode) {
    console.error('Formatting issues found in:');
    for (const file of diffs) {
      console.error(` - ${file}`);
    }
    process.exit(1);
  }

  if (diffs.length && writeMode) {
    console.log(`Formatted ${diffs.length} files.`);
  } else {
    console.log('Formatting check passed.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
