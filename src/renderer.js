const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');
const plantumlEncoder = require('plantuml-encoder');

const execFileAsync = promisify(execFile);

function encodePlantUml(source) {
  return plantumlEncoder.encode(source);
}

function decodePlantUml(encoded) {
  return plantumlEncoder.decode(encoded);
}

function buildPlantUmlServerUrls(encoded, baseUrl = 'https://www.plantuml.com/plantuml') {
  const normalized = baseUrl.replace(/\/$/, '');
  return {
    svgUrl: `${normalized}/svg/${encoded}`,
    pngUrl: `${normalized}/png/${encoded}`
  };
}

function grepAsciiForErrors(asciiText) {
  return /(error|syntax)/i.test(asciiText);
}

async function validateAsciiRendering(inputFile, outDir, runner = execFileAsync) {
  await fs.mkdir(outDir, { recursive: true });
  const asciiFile = path.join(outDir, `${path.parse(inputFile).name}.ascii.txt`);

  const source = await fs.readFile(inputFile, 'utf-8');
  const { stdout } = await runner('plantuml', ['-ttxt', '-pipe'], { input: source });
  await fs.writeFile(asciiFile, stdout, 'utf-8');

  if (grepAsciiForErrors(stdout)) {
    throw new Error(`PlantUML ASCII rendering contains errors. See ${asciiFile}`);
  }

  return asciiFile;
}

async function fetchRenderedDiagrams(encoded, outDir, name, fetchImpl = fetch) {
  await fs.mkdir(outDir, { recursive: true });

  const { svgUrl, pngUrl } = buildPlantUmlServerUrls(encoded);
  const svgPath = path.join(outDir, `${name}.svg`);
  const pngPath = path.join(outDir, `${name}.png`);

  const svgRes = await fetchImpl(svgUrl);
  if (!svgRes.ok) {
    throw new Error(`Failed to retrieve SVG from ${svgUrl}: ${svgRes.status}`);
  }

  const pngRes = await fetchImpl(pngUrl);
  if (!pngRes.ok) {
    throw new Error(`Failed to retrieve PNG from ${pngUrl}: ${pngRes.status}`);
  }

  await fs.writeFile(svgPath, Buffer.from(await svgRes.arrayBuffer()));
  await fs.writeFile(pngPath, Buffer.from(await pngRes.arrayBuffer()));

  return { svgPath, pngPath, svgUrl, pngUrl };
}

module.exports = {
  buildPlantUmlServerUrls,
  decodePlantUml,
  encodePlantUml,
  fetchRenderedDiagrams,
  grepAsciiForErrors,
  validateAsciiRendering
};
