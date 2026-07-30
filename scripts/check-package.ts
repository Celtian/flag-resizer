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
  'flags/at-1.svg',
  'flags/at-9.svg',
  'flags/au-act.svg',
  'flags/au-wa.svg',
  'flags/br-ac.svg',
  'flags/br-to.svg',
  'flags/ca-ab.svg',
  'flags/ca-yt.svg',
  'flags/ch-ag.svg',
  'flags/ch-zh.svg',
  'flags/cp.svg',
  'flags/cq.svg',
  'flags/cz.svg',
  'flags/de-bb.svg',
  'flags/de-th.svg',
  'flags/dg.svg',
  'flags/ea.svg',
  'flags/es-an.svg',
  'flags/es-vc.svg',
  'flags/gb.svg',
  'flags/gb-eng.svg',
  'flags/gb-nir.svg',
  'flags/gb-sct.svg',
  'flags/gb-wls.svg',
  'flags/gr-69.svg',
  'flags/gr-c.svg',
  'flags/ic.svg',
  'flags/it-21.svg',
  'flags/it-88.svg',
  'flags/jp-01.svg',
  'flags/jp-13.svg',
  'flags/jp-47.svg',
  'flags/mx-agu.svg',
  'flags/mx-cmx.svg',
  'flags/mx-zac.svg',
  'flags/pl-02.svg',
  'flags/pl-32.svg',
  'flags/ta.svg',
  'flags/us-ak.svg',
  'flags/us-ca.svg',
  'flags/us-wy.svg',
  'package.json',
];

for (const file of required) {
  if (!files.has(file)) throw new Error(`Published package is missing ${file}.`);
}

const flagCount = [...files].filter((file) =>
  /^flags\/(?:[a-z]{2}|at-[1-9]|au-(?:act|nsw|nt|qld|sa|tas|vic|wa)|br-(?:ac|al|am|ap|ba|ce|df|es|go|ma|mg|ms|mt|pa|pb|pe|pi|pr|rj|rn|ro|rr|rs|sc|se|sp|to)|ca-(?:ab|bc|mb|nb|nl|ns|nt|nu|on|pe|qc|sk|yt)|ch-(?:ag|ai|ar|be|bl|bs|fr|ge|gl|gr|ju|lu|ne|nw|ow|sg|sh|so|sz|tg|ti|ur|vd|vs|zg|zh)|de-(?:bb|be|bw|by|hb|he|hh|mv|ni|nw|rp|sh|sl|sn|st|th)|es-(?:an|ar|as|cb|ce|cl|cm|cn|ct|ex|ga|ib|mc|md|ml|nc|pv|ri|vc)|gb-(?:eng|nir|sct|wls)|gr-(?:69|a|b|c)|it-(?:21|23|25|32|34|36|42|45|52|55|57|62|65|67|72|75|77|78|82|88)|jp-(?:0[1-9]|[1-3]\d|4[0-7])|mx-(?:agu|bcn|bcs|cam|chh|chp|cmx|coa|col|dur|gro|gua|hid|jal|mex|mic|mor|nay|nle|oax|pue|que|roo|sin|slp|son|tab|tam|tla|ver|yuc|zac)|pl-(?:02|04|06|08|10|12|14|16|18|20|22|24|26|28|30|32)|us-(?:ak|al|ar|az|ca|co|ct|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy))\.svg$/u.test(
    file,
  ),
).length;
if (flagCount !== 550) {
  throw new Error(`Published package contains ${flagCount} SVG flags; expected 550.`);
}

console.log(`Package contents verified (${files.size} files, ${flagCount} flags).`);
