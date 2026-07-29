import { readFileSync } from 'node:fs';

interface PackageManifest {
  name: string;
  bin?: Record<string, string>;
  publishConfig?: {
    registry?: string;
  };
}

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageManifest;

if (manifest.name !== 'flag-resizer') {
  throw new Error(`Unexpected package name: ${manifest.name}`);
}
if (manifest.bin?.['flag-resizer'] !== 'dist/cli.js') {
  throw new Error('The flag-resizer executable must point to dist/cli.js.');
}
if (manifest.publishConfig?.registry !== 'https://registry.npmjs.org') {
  throw new Error('The package must publish to the npm registry.');
}

const cli = readFileSync(new URL('../dist/cli.js', import.meta.url), 'utf8');
if (!cli.startsWith('#!/usr/bin/env node\n')) {
  throw new Error('The published CLI is missing its Node.js shebang.');
}

const result = Bun.spawnSync(['bun', 'pm', 'pack', '--dry-run', '--ignore-scripts']);

if (!result.success) {
  throw new Error(result.stderr.toString() || 'bun pm pack failed.');
}

const output = result.stdout.toString();
const files = new Set(
  output
    .split(/\r?\n/u)
    .map((line) => /^packed\s+\S+\s+(.+)$/u.exec(line)?.[1])
    .filter((file): file is string => file !== undefined),
);

if (files.size === 0) {
  throw new Error('bun pm pack did not return a file list.');
}

const required = [
  'ATTRIBUTION.txt',
  'CHANGELOG.md',
  'LICENSE',
  'LICENSE-GRAPHICS',
  'README.md',
  'dist/cli.js',
  'dist/index.d.ts',
  'dist/index.js',
  'flags/ac.svg',
  'flags/cp.svg',
  'flags/cq.svg',
  'flags/cz.svg',
  'flags/dg.svg',
  'flags/ea.svg',
  'flags/gb.svg',
  'flags/gb-eng.svg',
  'flags/gb-nir.svg',
  'flags/gb-sct.svg',
  'flags/gb-wls.svg',
  'flags/ic.svg',
  'flags/ta.svg',
  'package.json',
];

for (const file of required) {
  if (!files.has(file)) throw new Error(`Published package is missing ${file}.`);
}

const flagCount = [...files].filter((file) =>
  /^flags\/(?:[a-z]{2}|gb-(?:eng|nir|sct|wls))\.svg$/u.test(file),
).length;
if (flagCount !== 263) {
  throw new Error(`Published package contains ${flagCount} SVG flags; expected 263.`);
}

console.log(`Package contents verified (${files.size} files, ${flagCount} flags).`);
