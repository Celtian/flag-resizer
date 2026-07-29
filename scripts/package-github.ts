import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface PackageManifest {
  name: string;
  publishConfig?: {
    registry?: string;
  };
}

const packageFile = path.resolve(import.meta.dirname, '..', 'package.json');
const manifest = JSON.parse(readFileSync(packageFile, 'utf8')) as PackageManifest;

if (manifest.name !== 'flag-resizer') {
  throw new Error(`Unexpected package name: ${manifest.name}`);
}

manifest.name = '@celtian/flag-resizer';
manifest.publishConfig = {
  registry: 'https://npm.pkg.github.com',
};

writeFileSync(packageFile, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Prepared package.json for GitHub Packages.');
