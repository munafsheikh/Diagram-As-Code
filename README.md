# Diagram-As-Code

Offline-first PlantUML diagram rendering for Azure DevOps Wiki, with full CI/CD automation.

## What this project does

1. Encodes PlantUML source using `plantuml-encoder`.
2. Decodes the payload to verify roundtrip correctness.
3. Runs **offline ASCII rendering** with PlantUML (`-ttxt -pipe`) and checks for syntax/error text via grep-compatible matching.
4. Uses the encoded payload to retrieve **SVG and PNG** from the PlantUML server for markdown/wiki rendering.
5. Packages deployment artifacts for Azure DevOps Wiki.

## Local usage

```bash
npm ci
npm run format:check
npm test
npm run render:all
```

Artifacts are written to `dist/`:

- `architecture.ascii.txt`
- `architecture.encoded.txt`
- `architecture.svg`
- `architecture.png`
- `deployment-summary.md` (when `npm run deploy:wiki` is used)

## Pipeline stages

Defined in `azure-pipelines.yml`:

- **Create**: install tools, run format + tests, validate ASCII output, generate encoded payload, fetch SVG/PNG.
- **Build**: package artifacts and produce wiki deployment summary.
- **Deploy**: publish wiki bundle for deployment workflows.

## Commands

```bash
npm run validate:ascii -- --input examples/architecture.puml --out-dir dist
node scripts/render-diagrams.js --input examples/architecture.puml --out-dir dist
node scripts/deploy-wiki.js --svg dist/architecture.svg --png dist/architecture.png --encoded dist/architecture.encoded.txt
```
