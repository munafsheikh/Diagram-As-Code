const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPlantUmlServerUrls,
  decodePlantUml,
  encodePlantUml,
  fetchRenderedDiagrams,
  grepAsciiForErrors,
  validateAsciiRendering
} = require('../src/renderer');

const sample = '@startuml\nAlice -> Bob: hello\n@enduml\n';

test('encodes and decodes without losing information', () => {
  const encoded = encodePlantUml(sample);
  assert.equal(typeof encoded, 'string');
  assert.equal(decodePlantUml(encoded).trim(), sample.trim());
});

test('builds SVG and PNG URLs from encoded payload', () => {
  const encoded = encodePlantUml(sample);
  const urls = buildPlantUmlServerUrls(encoded, 'https://example.com/plantuml/');
  assert.equal(urls.svgUrl, `https://example.com/plantuml/svg/${encoded}`);
  assert.equal(urls.pngUrl, `https://example.com/plantuml/png/${encoded}`);
});

test('detects syntax or error markers in ASCII output', () => {
  assert.equal(grepAsciiForErrors('Everything looks good'), false);
  assert.equal(grepAsciiForErrors('Syntax Error?'), true);
  assert.equal(grepAsciiForErrors('pipeline ERROR reported'), true);
});

test('writes ascii output and passes when no error marker exists', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'renderer-ok-'));
  const inputFile = path.join(tempDir, 'diagram.puml');
  await fs.writeFile(inputFile, sample, 'utf-8');

  const runner = async () => ({ stdout: 'ASCII OK\nA -> B' });
  const asciiPath = await validateAsciiRendering(inputFile, tempDir, runner);

  await fs.access(asciiPath);
});

test('fails validation when ascii output includes an error marker', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'renderer-fail-'));
  const inputFile = path.join(tempDir, 'diagram.puml');
  await fs.writeFile(inputFile, sample, 'utf-8');

  const runner = async () => ({ stdout: 'Syntax Error at line 1' });
  await assert.rejects(
    async () => validateAsciiRendering(inputFile, tempDir, runner),
    /contains errors/
  );
});

test('fetches and writes SVG/PNG artifacts for markdown rendering', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'renderer-fetch-'));
  const encoded = encodePlantUml(sample);

  let calls = 0;
  const fakeFetch = async () => {
    calls += 1;
    return calls === 1
      ? { ok: true, arrayBuffer: async () => Buffer.from('<svg/>') }
      : { ok: true, arrayBuffer: async () => Buffer.from([1, 2, 3]) };
  };

  const result = await fetchRenderedDiagrams(encoded, tempDir, 'diagram', fakeFetch);

  assert.match(result.svgUrl, new RegExp(`/svg/${encoded}$`));
  assert.match(result.pngUrl, new RegExp(`/png/${encoded}$`));
  assert.match(await fs.readFile(result.svgPath, 'utf-8'), /<svg\/>/);
  assert.equal((await fs.readFile(result.pngPath)).length, 3);
  assert.equal(calls, 2);
});
