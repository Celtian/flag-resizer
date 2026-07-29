import { execFileSync } from 'node:child_process';

const output = execFileSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['pack', '--dry-run', '--json', '--ignore-scripts'],
  { encoding: 'utf8' },
);
const [pack] = JSON.parse(output);
if (!pack?.files) throw new Error('npm pack did not return a file list.');

const files = new Set(pack.files.map((entry) => entry.path));
const required = [
  'ATTRIBUTION.txt',
  'LICENSE',
  'LICENSE-GRAPHICS',
  'README.md',
  'dist/cli.js',
  'dist/index.d.ts',
  'dist/index.js',
  'flags/cz.svg',
  'flags/gb.svg',
  'package.json',
];

for (const file of required) {
  if (!files.has(file)) throw new Error(`Published package is missing ${file}.`);
}

const flagCount = [...files].filter((file) => /^flags\/[a-z]{2}\.svg$/u.test(file)).length;
if (flagCount !== 252) {
  throw new Error(`Published package contains ${flagCount} SVG flags; expected 252.`);
}

console.log(`Package contents verified (${files.size} files, ${flagCount} flags).`);
