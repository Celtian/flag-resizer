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
