<div align="center">

# 🏁 Flag Resizer

**Generate typed, optimized PNG and WebP country flag assets from bundled Twemoji SVGs.**

[![npm version](https://img.shields.io/npm/v/flag-resizer)](https://www.npmjs.com/package/flag-resizer)
[![Test PR](https://github.com/Celtian/flag-resizer/actions/workflows/pull-request.yml/badge.svg)](https://github.com/Celtian/flag-resizer/actions/workflows/pull-request.yml)
[![License](https://img.shields.io/github/license/Celtian/flag-resizer)](LICENSE)

[npm](https://www.npmjs.com/package/flag-resizer) · [Changelog](CHANGELOG.md) · [Source](https://github.com/Celtian/flag-resizer)

</div>

`flag-resizer` converts its bundled country flag artwork into application-ready image sets.
Configure one or more profiles, choose the countries, dimensions, and formats you need, and generate
a deterministic TypeScript manifest alongside the assets.

## ✨ Why use it?

| Feature                           | Details                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| 🏳️ **Bundled country flags**      | Includes 252 two-letter country and territory flags from Twemoji.                              |
| 🖼️ **Optimized image sets**       | Generates PNG, WebP, or both at every configured size and quality.                             |
| 🧩 **Typed application paths**    | Produces country, size, format, dimension, and public-path constants with a typed path helper. |
| 🎯 **Reusable profiles**          | Supports independent country filters, dimensions, formats, and output locations.               |
| 🧹 **Safe deterministic updates** | Tracks owned files, removes stale generated output, and preserves unrelated files.             |
| 🛠️ **CLI and programmatic API**   | Works in package scripts or directly from TypeScript build tooling.                            |

## 🚀 Quick start

Node.js 22 or newer is required.

### 1. Install

With Bun:

```bash
bun add --dev flag-resizer
```

With npm:

```bash
npm install flag-resizer --save-dev
```

### 2. Configure

Create `flag-resizer.config.ts` in your project:

```ts
import { defineConfig } from 'flag-resizer';

export default defineConfig({
  default: {
    filter: {
      type: 'whitelist',
      values: ['cz', 'gb'],
    },
    sizes: [
      [20, 15],
      [40, 30],
      [60, 45],
      [80, 60],
      [120, 90],
    ],
    quality: 100,
    formats: ['png', 'webp'],
    output: {
      png: {
        dir: 'public/flags/png',
        publicPath: '/flags/png',
      },
      webp: {
        dir: 'public/flags/webp',
        publicPath: '/flags/webp',
      },
      ts: 'src/generated/flags.ts',
    },
  },
});
```

Filter values are lowercase flag or country codes, not language codes. For example, use `cz` for
the Czech flag and `gb` for the British flag. Unknown codes fail validation.

All sizes in one profile must use the same aspect ratio. Output paths are resolved relative to the
configuration file. A `publicPath` can be a root-relative path or an absolute CDN URL.

Configuration is loaded by C12 and may use TypeScript, JavaScript, JSON, JSONC, JSON5, YAML, or TOML.

### 3. Generate

```bash
bunx flag-resizer
```

```text
... Generating flag assets…
✔  default · 2 flags · 20 images · 25 created · 15 ms
```

## 🧭 CLI reference

```text
flag-resizer [profiles...] [options]

-c, --config <path>        Use an explicit configuration file.
    --concurrency <count>  Maximum parallel image conversions.
    --dry-run              Preview changes without writing files.
    --verbose              Show configuration and output details.
-h, --help                Display usage information.
-v, --version             Display the installed version.
```

With no profile arguments, every configured profile is generated. Pass profile names to generate
only those profiles:

```bash
bunx flag-resizer default marketing
```

Use an explicit config, limit parallel image conversions, or preview changes:

```bash
bunx flag-resizer --config ./config/flags.config.ts --concurrency 4
bunx flag-resizer --dry-run
bunx flag-resizer --dry-run --verbose
```

Interactive output stays compact and uses color when the terminal supports it. Set `NO_COLOR=1` to
disable ANSI colors or `FORCE_COLOR=1` to enable them when output is redirected.

### 🎨 Verbose output

Add `--verbose` to show the loaded configuration, requested sizes and formats, asset output
directories, generated TypeScript file, and managed manifest. Paths inside the current project are
kept relative for readability:

```text
... Planning flag generation…
✔  default · 2 flags · 8 images · 13 created · 15 ms

   config      flag-resizer.config.ts
   sizes       20x15, 40x30
   formats     png, webp
   png output  public/flags/png
   webp output public/flags/webp
   typescript  src/generated/flags.ts
   manifest    .flag-resizer/manifest.json
```

## 📁 Generated assets

Each format is organized into dimension directories:

```text
public/flags/png/
├── ATTRIBUTION.txt
├── LICENSE-GRAPHICS
├── 20x15/
│   ├── cz.png
│   └── gb.png
└── 40x30/
    ├── cz.png
    └── gb.png
```

The CLI records only files it owns in `.flag-resizer/manifest.json`. Later runs remove stale
generated files while preserving unrelated files in the same directories.

All images are staged before existing outputs or the ownership manifest are updated. A conversion
failure therefore leaves the current assets and manifest unchanged.

## 📝 Generated TypeScript

Each profile generates:

- `FLAGS` and its filtered `CountryCode` union.
- `FLAG_SIZES`, `FlagSize`, and `FLAG_DIMENSIONS`.
- `FLAG_FORMATS` and `FlagFormat`.
- `FLAG_PUBLIC_PATHS`.
- `getFlagPath(code, size, format)`.

```ts
import { FLAG_DIMENSIONS, getFlagPath, type CountryCode, type FlagSize } from './generated/flags';

function flagImage(code: CountryCode, size: FlagSize) {
  return {
    src: getFlagPath(code, size, 'png'),
    ...FLAG_DIMENSIONS[size],
  };
}
```

An Angular template can use the generated paths in a responsive picture:

```html
<picture>
  <source
    type="image/webp"
    [attr.srcset]="
      getFlagPath(code, '20x15', 'webp') + ', ' +
      getFlagPath(code, '40x30', 'webp') + ' 2x, ' +
      getFlagPath(code, '60x45', 'webp') + ' 3x'
    "
  />
  <img [src]="getFlagPath(code, '20x15', 'png')" [width]="20" [height]="15" [alt]="FLAGS[code]" />
</picture>
```

## 🛠️ Programmatic API

Load a discovered or explicit configuration file:

```ts
import { generate } from 'flag-resizer';

const result = await generate({
  configFile: './flag-resizer.config.ts',
  profiles: ['default'],
  concurrency: 4,
});
```

Or supply inline configuration:

```ts
import { defineConfig, generate } from 'flag-resizer';

const config = defineConfig({
  icons: {
    filter: { type: 'whitelist', values: ['cz', 'gb'] },
    sizes: [[40, 30]],
    quality: 100,
    formats: ['webp'],
    output: {
      webp: { dir: 'public/flags', publicPath: '/flags' },
      ts: 'src/generated/flags.ts',
    },
  },
});

await generate({ config });
```

## ✅ Validation

The generator rejects:

- Language codes or unknown country codes.
- Duplicate formats, sizes, or filter values.
- Dimensions that are not positive integers.
- Mixed aspect ratios within a profile.
- Missing output settings for an enabled format.
- Output collisions between profiles.

## 🏗️ Development

Use Node.js 24 from `.nvmrc` and Bun 1.3.14 from `package.json`:

```bash
bun ci
bun run check
```

`bun run check` runs formatting, linting, type checks, runtime and public-API tests, the build, and
published-package validation.

Husky installs the repository hooks during `bun ci`. The pre-commit hook runs ESLint and Prettier on
staged files through lint-staged, while the commit-message hook validates Conventional Commits with
Quick Commitlint.

## 🏷️ Releases

Run a release command from a clean working tree:

```bash
bun run release:patch
bun run release:minor
bun run release:major
```

Each command checks out `master`, validates the package, updates `CHANGELOG.md`, creates the release
commit and `v*` tag, then pushes the commit and tags. The tag workflow publishes `flag-resizer` to
npm and `@celtian/flag-resizer` to GitHub Packages.

Create an npm beta release with:

```bash
bun run release:beta
```

Beta tags publish with the npm `beta` dist-tag and are not copied to GitHub Packages. The repository
must provide the `NPM_AUTH_TOKEN` Actions secret; GitHub Packages uses the workflow's automatic
`GITHUB_TOKEN`.

## 🤝 Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and
pull-request checklist. Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## 🔒 Security

Report suspected vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## 📄 License and attribution

Copyright &copy; 2026 [Dominik Hladík](https://github.com/Celtian).

The package code is licensed under the [MIT License](LICENSE).

The bundled Twemoji graphics and the PNG/WebP derivatives produced from them are licensed under
CC-BY-4.0. Generated asset roots include attribution and license notices. Keep the required
attribution when redistributing the graphics. See [ATTRIBUTION.txt](ATTRIBUTION.txt) and
[LICENSE-GRAPHICS](LICENSE-GRAPHICS).
