#!/usr/bin/env node
const { validateAsciiRendering } = require('../src/renderer');

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

  const asciiPath = await validateAsciiRendering(input, outDir);
  console.log(`ASCII generated successfully: ${asciiPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
