# AGENTS.md

This file provides repository-specific guidance for coding agents. Follow
`CONTRIBUTING.md` for the contributor-facing workflow and use this file for
implementation details.

## Environment and commands

- Use Node.js 24 from `.nvmrc` and Bun 1.3.14 from `package.json`.
- Use Bun for dependency management and scripts. Keep `bun.lock` in sync and do
  not introduce another package-manager lockfile.
- Install the frozen dependency graph with `bun ci`.
- Run focused checks while developing:
  - `bun run lint`
  - `bun run format:check`
  - `bun run typecheck`
  - `bun run test`
  - `bun run test:types`
  - `bun run build`
- Before handing off a completed change, run `bun run check`. It also validates
  the packed package contents.

## Project map

- `src/config.ts`: configuration loading, normalization, and validation.
- `src/generator.ts`: generation planning, image output, ownership manifest, and
  stale-file cleanup.
- `src/generated-typescript.ts`: deterministic TypeScript manifest generation.
- `src/cli-core.ts`: CLI parsing, execution, and user-facing output.
- `src/cli.ts`: executable entry point.
- `src/index.ts`: public programmatic API exports.
- `src/types.ts`: shared public and internal types.
- `tests/*.test.ts`: runtime behavior tests.
- `tests/public-api.test-d.ts`: compile-time public API assertions.
- `flags/*.svg`: bundled flag source artwork.
- `scripts/check-package.ts`: published-package content assertions.

## Implementation conventions

- The package is ESM and TypeScript uses `NodeNext` resolution. Include `.js`
  extensions in relative imports from TypeScript source.
- Preserve strict TypeScript settings, including exact optional properties and
  unchecked indexed-access handling. Avoid broad assertions that bypass them.
- Keep the public API intentional. Add exports through `src/index.ts` and update
  runtime and type-level tests when public types or signatures change.
- Keep generated TypeScript output deterministic. Do not include timestamps,
  machine-specific paths, unstable iteration order, or platform-specific path
  separators.
- Preserve the ownership-manifest safety model: stale cleanup may remove only
  files recorded as owned by flag-resizer and must preserve unrelated files.
- Keep CLI output compact and stable. Update CLI tests for wording, colors,
  relative-path formatting, or exit behavior.
- Add behavior tests for fixes and features. Prefer temporary directories and
  small representative flag sets rather than writing fixtures into the
  repository.

## Generated assets and licensing

- Do not commit generated PNG or WebP files, `.flag-resizer` state, `dist`, or
  coverage output.
- Treat `flags/*.svg` as source assets, not generated test output. The published
  package must contain exactly the expected 448 SVG files: all 259 Twemoji
  regional flags, 4 UK subdivision flags, 50 FlagCDN-compatible U.S. state
  flags, 13 Canadian subdivision flags, 8 Australian subdivision flags, 27
  Brazilian subdivision flags, 16 German state flags, 19 Spanish autonomous
  community/city flags, 20 Italian region flags, and 32 Mexican subdivision
  flags.
- Changes to Twemoji artwork, `ATTRIBUTION.txt`, or `LICENSE-GRAPHICS` must
  preserve the CC-BY-4.0 license and required attribution.
- The `gb-nir.svg` Ulster Banner comes from `flag-icons` under the MIT license;
  preserve its attribution and license notice.
- The `us-*.svg` U.S. state flags come from FlagCDN's public-domain artwork;
  preserve the source and public-domain notices.
- The `ca-*.svg`, `au-*.svg`, `br-*.svg`, `de-*.svg`, `es-*.svg`, `it-*.svg`,
  and `mx-*.svg` subdivision flags come from `iso3166-flags` under the MIT
  license; preserve its attribution and license notice. The `mx-cmx.svg`
  wrapper embeds the raster source because upstream does not provide an SVG.
- Generated asset directories must receive the attribution and graphics-license
  files expected by the generator tests.

## Documentation and CI

- Update `README.md` when changing public CLI behavior, configuration, generated
  TypeScript, output layout, or the programmatic API.
- Keep GitHub Actions on the Node version declared in `.nvmrc` by using
  `actions/setup-node` with `node-version-file`.
- Do not weaken package checks, test coverage thresholds, or validation rules to
  make a change pass. Fix the implementation or update an assertion only when
  the intended behavior has genuinely changed.
