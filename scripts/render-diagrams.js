#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const {
  decodePlantUml,
  encodePlantUml,
  fetchRenderedDiagrams,
  validateAsciiRendering
} = require('../src/renderer');

function readArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1];
}

async function main() {
  const input = readArg('--input');
  const outDir = readArg('--out-dir', 'dist');
  if (!input) {
    throw new Error('Missing --input argument.');
  }

  const source = await fs.readFile(input, 'utf-8');
  const encoded = encodePlantUml(source);
  const decoded = decodePlantUml(encoded);

  if (decoded.trim() !== source.trim()) {
    throw new Error('Encode/decode roundtrip validation failed.');
  }

  const asciiPath = await validateAsciiRendering(input, outDir);
  const baseName = path.parse(input).name;
  const rendered = await fetchRenderedDiagrams(encoded, outDir, baseName);

  await fs.writeFile(path.join(outDir, `${baseName}.encoded.txt`), `${encoded}\n`, 'utf-8');

  console.log(`ASCII validation passed: ${asciiPath}`);
  console.log(`SVG: ${rendered.svgPath}`);
  console.log(`PNG: ${rendered.pngPath}`);
  console.log(`SVG URL: ${rendered.svgUrl}`);
  console.log(`PNG URL: ${rendered.pngUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
