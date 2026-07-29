# `@celtian/flag-resizer`

Generate optimized PNG and WebP country flags, plus a deterministic TypeScript
manifest, from the bundled Twemoji SVG artwork.

## Requirements

- Node.js 22 or newer
- npm, pnpm, Yarn, or Bun

## Installation

```sh
bun add --dev @celtian/flag-resizer
```

With npm:

```sh
npm install --save-dev @celtian/flag-resizer
```

## Configuration

Create `flag-resizer.config.ts` in your project:

```ts
import { defineConfig } from '@celtian/flag-resizer';

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

Filter values are lowercase flag/country codes, not language codes. For example,
use `cz` for the Czech flag and `gb` for the British flag. Unknown codes fail
validation.

All sizes in one profile must use the same aspect ratio. Output paths are
resolved relative to the configuration file. `publicPath` can be a root-relative
path or an absolute CDN URL.

C12 loads TypeScript, JavaScript, JSON, JSONC, JSON5, YAML, and TOML
configuration variants.

## CLI

Generate every profile:

```sh
bunx flag-resizer
```

Generate selected profiles:

```sh
bunx flag-resizer default marketing
```

Use another config or preview changes:

```sh
bunx flag-resizer --config ./config/flags.config.ts --concurrency 4
bunx flag-resizer --dry-run
bunx flag-resizer --dry-run --verbose
```

Interactive output stays compact and uses color when the terminal supports it:

```text
... Planning flag generation…
✔  default · 2 flags · 8 images · 13 created · 15 ms
```

Add `--verbose` to show the loaded configuration, requested sizes and formats,
asset output directories, generated TypeScript file, and managed manifest. Paths
inside the current project are kept relative for readability:

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

Set `NO_COLOR=1` to disable ANSI colors or `FORCE_COLOR=1` to enable them when
output is redirected.

The asset layout is:

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

The CLI records only files it owns in `.flag-resizer/manifest.json`. Later runs
remove stale generated files while preserving unrelated files in the same
folders.

## Generated TypeScript

Each profile generates:

- `FLAGS` and its filtered `CountryCode` union
- `FLAG_SIZES`, `FlagSize`, and `FLAG_DIMENSIONS`
- `FLAG_FORMATS` and `FlagFormat`
- `FLAG_PUBLIC_PATHS`
- `getFlagPath(code, size, format)`

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

## Programmatic API

Load a discovered or explicit config:

```ts
import { generate } from '@celtian/flag-resizer';

const result = await generate({
  configFile: './flag-resizer.config.ts',
  profiles: ['default'],
  concurrency: 4,
});
```

Or supply inline configuration:

```ts
import { defineConfig, generate } from '@celtian/flag-resizer';

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

## Validation and failures

The generator rejects:

- language codes or unknown country codes
- duplicate formats, sizes, or filter values
- dimensions that are not positive integers
- mixed aspect ratios within a profile
- missing output settings for an enabled format
- output collisions between profiles

All images are staged before existing outputs or the managed manifest are
updated. A conversion failure therefore leaves the manifest unchanged.

## Development

Install the frozen dependency graph and run the complete validation suite:

```sh
bun ci
bun run check
```

Husky installs the repository hooks during `bun ci`. The pre-commit hook runs
ESLint and Prettier on staged files through lint-staged, while the commit-message
hook validates Conventional Commits with Quick Commitlint.

## License and attribution

The package code is MIT licensed.

The bundled Twemoji graphics, and the PNG/WebP derivatives produced from them,
are licensed under CC-BY-4.0. Generated asset roots include attribution and
license notices. Keep an appropriate attribution when redistributing the
graphics. See [`ATTRIBUTION.txt`](./ATTRIBUTION.txt) and
[`LICENSE-GRAPHICS`](./LICENSE-GRAPHICS).
