<div align="center">

# 🏁 Flag Resizer

**Generate typed, optimized PNG and WebP flag assets from bundled SVG artwork.**

[![npm version](https://img.shields.io/npm/v/flag-resizer)](https://www.npmjs.com/package/flag-resizer)
[![Test PR](https://github.com/Celtian/flag-resizer/actions/workflows/pull-request.yml/badge.svg)](https://github.com/Celtian/flag-resizer/actions/workflows/pull-request.yml)
[![License](https://img.shields.io/github/license/Celtian/flag-resizer)](LICENSE)

[npm](https://www.npmjs.com/package/flag-resizer) · [Changelog](CHANGELOG.md) · [Source](https://github.com/Celtian/flag-resizer)

</div>

`flag-resizer` converts its bundled flag artwork into application-ready image sets.
Configure one or more profiles, choose the regions, dimensions, and formats you need, and generate
a deterministic TypeScript manifest alongside the assets.

## ✨ Why use it?

| Feature                           | Details                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| 🏳️ **Bundled flags**              | Includes 550 regional and subdivision flags across Twemoji, FlagCDN, and ISO 3166-2 sources.   |
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
      values: ['cz', 'gb', 'us-*'],
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

Filter values are lowercase flag or country codes, not language codes. They can be exact codes or
patterns using `*` as a wildcard. For example, use `cz` for the Czech flag, `gb` for the British
flag, or `us-*` for all 50 U.S. subdivision flags. The `us-*` pattern does not include the national
`us` flag; add `us` separately if needed. Likewise, `at-*` selects Austrian states, `ca-*` selects
Canadian subdivisions, `au-*` selects Australian subdivisions, `br-*` selects Brazilian federative
units, `ch-*` selects Swiss cantons, `de-*` selects German states, `es-*` selects Spanish autonomous
communities and cities, `gr-*` selects the four Greek subdivisions with bundled flags, `it-*`
selects Italian regions, `jp-*` selects Japanese prefectures, `mx-*` selects Mexican federal
entities, `pl-*` selects Polish voivodeships, and `*` selects every bundled flag.

Subdivision codes can also be selected individually: `gb-eng`, `gb-nir`, `gb-sct`, and `gb-wls`
for the United Kingdom; `us-ca` for California; `ca-on` for Ontario; or `au-nsw` for New South
Wales. Unknown codes, malformed patterns, and patterns that match no bundled flags fail validation.

The Northern Ireland asset is the historical Ulster Banner from
[flag-icons](https://github.com/lipis/flag-icons). Northern Ireland has no current distinct official
flag; the United Kingdom flag is its official flag.

The 50 U.S. state assets come from [FlagCDN](https://flagcdn.com/), whose flag artwork is based on
[Wikimedia Commons](https://commons.wikimedia.org/) vectors and identified as public domain in
[Flagpedia's terms](https://flagpedia.net/terms). The source artwork is normalized to the same
rounded 36×36 canvas as the bundled Twemoji flags.

The 9 Austrian, 13 Canadian, 8 Australian, 27 Brazilian, 26 Swiss, 16 German, 4 Greek, 19 Spanish,
20 Italian, 47 Japanese, 32 Mexican, and 16 Polish subdivision sets primarily come from the
MIT-licensed
[iso3166-flags](https://github.com/amckenna41/iso3166-flags) dataset and use current ISO 3166-2
codes. The `ch-ar` asset instead uses the square, public-domain flag artwork from
[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Flag_of_Canton_of_Appenzell_Ausserrhoden.svg);
this avoids stretching the shield-shaped upstream artwork. Spain's set covers its 17 autonomous
communities and 2 autonomous cities, not its 50 provinces; Italy's set covers its regions, not its
provinces or metropolitan cities; Brazil's set covers its 26 states and Federal District;
Switzerland's set covers its 26 cantons; Japan's set covers its 47 prefectures; and Mexico's set
covers its 31 states and Mexico City. Greece has 14 current ISO 3166-2 subdivisions, but the source
provides official flags only for Mount Athos and the three Macedonian regions (`gr-69`, `gr-a`,
`gr-b`, and `gr-c`); its other 10 administrative regions are therefore not bundled. The three
Macedonian codes intentionally share the same flag artwork. Some Mexican subdivision designs are
representative de facto banners rather than legally adopted state flags.
The Mexico City source is raster-backed because the ISO dataset provides that asset only as a PNG;
it is embedded in the normalized SVG wrapper. The non-rectangular official silhouettes of
`pl-28` and `pl-30` intentionally retain transparency around their fly edges. All source artwork is
normalized to the rounded 36×36 canvas.

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
import {
  FLAGS,
  FLAG_DIMENSIONS,
  getFlagPath,
  type CountryCode,
  type FlagSize,
} from './generated/flags';

function flagImage(code: CountryCode, size: FlagSize) {
  return {
    src: getFlagPath(code, size, 'png'),
    ...FLAG_DIMENSIONS[size],
  };
}
```

An Angular component can precompute the generated paths for a responsive picture, keeping
function calls out of the template:

```ts
function createFlagPicture(code: CountryCode) {
  return {
    webpSrcset: [
      getFlagPath(code, '20x15', 'webp'),
      `${getFlagPath(code, '40x30', 'webp')} 2x`,
      `${getFlagPath(code, '60x45', 'webp')} 3x`,
    ].join(', '),
    pngSrc: getFlagPath(code, '20x15', 'png'),
    alt: FLAGS[code],
  };
}

export class FlagComponent {
  protected readonly flag = createFlagPicture('cz');
}
```

```html
<picture>
  <source type="image/webp" [attr.srcset]="flag.webpSrcset" />
  <img [src]="flag.pngSrc" [width]="20" [height]="15" [alt]="flag.alt" />
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

- Language codes, unknown country codes, malformed patterns, or patterns with no matches.
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

The bundled graphics use source-specific terms: Twemoji is licensed under CC-BY-4.0; the Northern
Ireland and ISO-sourced subdivision assets are MIT-licensed; and the FlagCDN U.S. state artwork is
public domain. Generated asset roots include attribution and license notices. Keep the required
notices when redistributing the graphics. See [ATTRIBUTION.txt](ATTRIBUTION.txt) and
[LICENSE-GRAPHICS](LICENSE-GRAPHICS).
