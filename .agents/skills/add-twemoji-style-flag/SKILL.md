---
name: add-twemoji-style-flag
description: Add missing geographic or subdivision flag SVGs to flag-resizer and normalize third-party artwork to its rounded Twemoji-style 36×36 canvas. Use when adding a flag code, importing non-Twemoji flag artwork, matching an SVG to the existing visual style, auditing flag-code compatibility, or updating the registry, licensing, tests, documentation, and package checks for new flags.
---

# Add a Twemoji-Style Flag

Add sourced flag artwork without conflating ISO countries, reserved Unicode regions, subdivisions,
or unofficial designs. Preserve the repository's visual consistency, deterministic output, ownership
safety, and graphics licensing.

## Workflow

### 1. Inspect the repository and source

- Read `AGENTS.md` and inspect the working tree before editing.
- Compare the requested code with `src/data/flags.ts`, `flags/*.svg`, and the proposed source.
- Search the supplied Twemoji directory first. Decode regional-indicator filenames and tag sequences
  when necessary instead of guessing from screenshots.
- When completeness matters, compare the whole source catalog with the repository.

### 2. Classify the code

Verify current data from authoritative sources:

- ISO 3166 for assigned, reserved, user-assigned, and subdivision codes.
- Unicode's latest `emoji-sequences.txt` for RGI regional and tag-sequence flags.
- CLDR subdivision data for codes such as `gb-eng`, `gb-nir`, `gb-sct`, and `gb-wls`.
- FlagCDN's `codes.json` when compatibility with that catalog is requested.

Treat these as distinct namespaces. A valid Unicode region can be absent from FlagCDN, and a valid
subdivision can be non-RGI as an emoji. Record any caveat, such as an unofficial or historical flag,
in `README.md`.

### 3. Verify artwork provenance

- Prefer the exact Twemoji SVG when Twemoji implements the flag.
- For non-Twemoji artwork, identify the upstream project and license before copying it.
- Update `ATTRIBUTION.txt` and `LICENSE-GRAPHICS` when adding a new artwork source.
- Do not describe third-party artwork as Twemoji.
- Do not imply that a historical or representative design is an official flag.

### 4. Normalize rectangular artwork

Existing Twemoji assets use a 36×36 canvas with the visible flag inset from `y=5` through `y=31`
and approximately four-unit rounded corners. If imported artwork fills a rectangular viewport, run:

```bash
node .agents/skills/add-twemoji-style-flag/scripts/wrap-svg.mjs \
  path/to/source.svg \
  flags/<code>.svg
```

The script preserves the source vector content inside a clipped 36×36 wrapper. It intentionally
stretches the original viewport into the same 36×26 visible area used by the bundled Twemoji flags.
Do not wrap an asset that already uses this geometry.

### 5. Integrate the flag

Update every affected contract:

- Add the code and display name to `src/data/flags.ts` in deterministic order.
- Extend the managed-image safety regex in `src/generator.ts` for a new hyphenated code.
- Ensure generated TypeScript quotes non-identifier property names.
- Update expected counts and required files in `tests/flags.test.ts` and
  `scripts/check-package.ts`.
- Add runtime generation and public type assertions for novel code shapes.
- Update `README.md`, `AGENTS.md`, attribution, and graphics licensing.

Keep the ownership-manifest path validation narrow. Never broaden it to arbitrary paths merely to
make a new code pass.

### 6. Render and inspect

Render the new asset and representative neighboring flags with Sharp. Compare them on a neutral
background and inspect the output with the available image viewer. Confirm:

- a 36×36 SVG viewport;
- visible artwork at `y=5..31`;
- rounded corners and transparent outer canvas;
- centered, legible emblems;
- successful PNG and WebP generation at project sizes.

If the source differs intentionally, encode that expectation precisely in tests rather than
weakening assertions for all flags.

### 7. Validate

Run focused checks while iterating, then finish with:

```bash
bun run check
```

Confirm the packed flag count, exact working-tree scope, and `git diff --check`. Do not commit or
publish unless the user asks.
