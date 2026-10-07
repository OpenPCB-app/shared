#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = ['contracts', 'opclib-pack'];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function dependencyDirectory(source, name) {
  const candidates = [join(source, 'node_modules', name), join(ROOT, 'node_modules', name)];
  const directory = candidates.find((candidate) => existsSync(join(candidate, 'package.json')));
  assert(directory, `Install shared dependencies before packaging: ${name}`);
  return directory;
}

function stagePackage(name, stageRoot) {
  const source = join(ROOT, 'packages', name);
  const stage = join(stageRoot, name);
  mkdirSync(stage);
  for (const entry of ['src', 'schemas', 'scripts', 'README.md', 'LICENSE', 'package.json', 'tsconfig.build.json']) {
    if (existsSync(join(source, entry))) cpSync(join(source, entry), join(stage, entry), { recursive: true });
  }
  const manifest = JSON.parse(readFileSync(join(stage, 'package.json'), 'utf8'));
  const config = JSON.parse(readFileSync(join(stage, 'tsconfig.build.json'), 'utf8'));
  const paths = {};
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    const directory = dependencyDirectory(source, dependency);
    paths[dependency] = [directory];
    paths[`${dependency}/*`] = [`${directory}/*`];
  }
  // Build-only paths avoid changing either repository's node_modules or package dependencies.
  config.compilerOptions.paths = paths;
  config.compilerOptions.typeRoots = [join(ROOT, 'node_modules', '@types')];
  writeFileSync(join(stage, 'tsconfig.build.json'), `${JSON.stringify(config, null, 2)}\n`);
  return { stage, manifest };
}

function verifyContents(stage, manifest) {
  if (manifest.name !== '@openpcb/contracts') return;
  assert(!('@openpcb/ai-core' in manifest.dependencies));
  assert(!('agentkit' in manifest.dependencies));
  assert(!existsSync(join(stage, 'dist', 'sdks', 'assistant')));
  for (const entry of readdirSync(join(stage, 'dist'), { recursive: true })) {
    if (!entry.endsWith('.js') && !entry.endsWith('.ts')) continue;
    const source = readFileSync(join(stage, 'dist', entry), 'utf8');
    assert(!/(?:from\s+|import\s*\()["'](?:@openpcb\/ai-core|agentkit)/.test(source), entry);
  }
}

function packPackage(name, stageRoot, output) {
  const { stage, manifest } = stagePackage(name, stageRoot);
  const result = execFileSync('npm', ['pack', '--json', '--cache', join(stageRoot, 'npm-cache'), '--pack-destination', output], {
    cwd: stage,
    env: { ...process.env, PATH: `${join(ROOT, 'node_modules', '.bin')}:${process.env.PATH}` },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const payload = result.match(/\[\s*\{[\s\S]*\}\s*\]\s*$/);
  assert(payload, `npm pack returned no JSON report: ${name}`);
  const [packed] = JSON.parse(payload[0]);
  verifyContents(stage, manifest);
  const artifact = join(output, packed.filename);
  return { name: manifest.name, version: manifest.version, artifact,
    sha256: sha256(readFileSync(artifact)), files: packed.files.length,
    dependencies: manifest.dependencies, publication: 'unpublished local verification artifact' };
}

function main() {
  assert(process.argv.length === 4 && process.argv[2] === '--out',
    'Usage: node scripts/pack-domain-candidates.mjs --out /absolute/output');
  const output = resolve(process.argv[3]);
  mkdirSync(output, { recursive: true });
  const stageRoot = mkdtempSync(join(tmpdir(), 'openpcb-domain-candidates-'));
  const packages = PACKAGES.map((name) => packPackage(name, stageRoot, output));
  const evidence = { workflow: 'npm pack with canonical package lifecycle', stageRoot, packages };
  writeFileSync(join(output, 'shared-candidate-artifacts.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

main();
