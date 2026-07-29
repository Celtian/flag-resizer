import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, test } from 'vitest';

import { generate, type FlagResizerConfig } from '../src/index.js';
import { profile } from './helpers.js';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'flag-resizer-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('generate', () => {
  test('creates real PNG/WebP images, typed metadata, and attribution', async () => {
    const cwd = await temporaryDirectory();
    const testConfig: FlagResizerConfig = {
      default: profile({
        sizes: [
          [20, 15],
          [40, 30],
        ],
        formats: ['png', 'webp'],
        output: {
          png: { dir: 'assets/png', publicPath: '/flags/png' },
          webp: { dir: 'assets/webp', publicPath: '/flags/webp' },
          ts: 'generated/flags.ts',
        },
      }),
    };

    const first = await generate({ cwd, config: testConfig, concurrency: 2 });
    expect(first.profiles[0]).toMatchObject({
      name: 'default',
      countries: 2,
      images: 8,
      removed: 0,
    });

    for (const format of ['png', 'webp'] as const) {
      for (const size of ['20x15', '40x30'] as const) {
        const [width, height] = size.split('x').map(Number);
        for (const code of ['cz', 'gb']) {
          const metadata = await sharp(
            path.join(cwd, 'assets', format, size, `${code}.${format}`),
          ).metadata();
          expect(metadata).toMatchObject({ format, width, height });
          expect(metadata.hasAlpha).toBe(true);
        }
      }
      await expect(
        readFile(path.join(cwd, 'assets', format, 'ATTRIBUTION.txt'), 'utf8'),
      ).resolves.toContain('Twemoji');
      await expect(
        readFile(path.join(cwd, 'assets', format, 'LICENSE-GRAPHICS'), 'utf8'),
      ).resolves.toContain('CC-BY-4.0');
    }

    const generated = await readFile(path.join(cwd, 'generated/flags.ts'), 'utf8');
    expect(generated).toContain('export const FLAGS');
    expect(generated).toContain('getFlagPath');
    expect(generated).not.toContain('us:');

    const manifest = JSON.parse(
      await readFile(path.join(cwd, '.flag-resizer/manifest.json'), 'utf8'),
    ) as { profiles: { default: { files: unknown[] } } };
    expect(manifest.profiles.default.files).toHaveLength(13);

    const second = await generate({ cwd, config: testConfig, concurrency: 2 });
    expect(second.profiles[0]).toMatchObject({
      created: 0,
      updated: 0,
      unchanged: 13,
      removed: 0,
    });
  });

  test('prunes stale owned files and preserves unrelated files', async () => {
    const cwd = await temporaryDirectory();
    const initial: FlagResizerConfig = {
      default: profile({
        sizes: [
          [20, 15],
          [40, 30],
        ],
        formats: ['png', 'webp'],
        output: {
          png: { dir: 'assets/png', publicPath: '/png' },
          webp: { dir: 'assets/webp', publicPath: '/webp' },
          ts: 'generated/flags.ts',
        },
      }),
    };
    await generate({ cwd, config: initial });
    await writeFile(path.join(cwd, 'assets/png/keep.txt'), 'user file');

    const reduced: FlagResizerConfig = {
      default: profile({
        filter: { type: 'whitelist', values: ['cz'] },
        sizes: [[20, 15]],
        formats: ['png'],
        output: {
          png: { dir: 'assets/png', publicPath: '/png' },
          ts: 'generated/flags.ts',
        },
      }),
    };
    const result = await generate({ cwd, config: reduced });

    await expect(stat(path.join(cwd, 'assets/png/20x15/cz.png'))).resolves.toBeDefined();
    await expect(stat(path.join(cwd, 'assets/png/keep.txt'))).resolves.toBeDefined();
    await expect(stat(path.join(cwd, 'assets/png/20x15/gb.png'))).rejects.toThrow();
    await expect(stat(path.join(cwd, 'assets/png/40x30/cz.png'))).rejects.toThrow();
    await expect(stat(path.join(cwd, 'assets/webp/20x15/cz.webp'))).rejects.toThrow();
    expect(result.profiles[0]?.removed).toBeGreaterThan(0);
  });

  test('dry-run reports changes without writing outputs or state', async () => {
    const cwd = await temporaryDirectory();
    const result = await generate({ cwd, config: { default: profile() }, dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.profiles[0]?.created).toBeGreaterThan(0);
    await expect(stat(path.join(cwd, 'output/png/20x15/cz.png'))).rejects.toThrow();
    await expect(stat(path.join(cwd, '.flag-resizer/manifest.json'))).rejects.toThrow();
  });

  test('supports selected-profile runs and bare all-profile runs', async () => {
    const cwd = await temporaryDirectory();
    const profiles: FlagResizerConfig = {
      compact: profile({
        filter: { type: 'whitelist', values: ['cz'] },
        output: {
          png: { dir: 'compact/png', publicPath: '/compact' },
          ts: 'compact/flags.ts',
        },
      }),
      detailed: profile({
        filter: { type: 'whitelist', values: ['gb'] },
        output: {
          png: { dir: 'detailed/png', publicPath: '/detailed' },
          ts: 'detailed/flags.ts',
        },
      }),
    };

    const selected = await generate({ cwd, config: profiles, profiles: ['compact'] });
    expect(selected.profiles.map(({ name }) => name)).toEqual(['compact']);
    await expect(stat(path.join(cwd, 'compact/png/20x15/cz.png'))).resolves.toBeDefined();
    await expect(stat(path.join(cwd, 'detailed/png/20x15/gb.png'))).rejects.toThrow();

    const all = await generate({ cwd, config: profiles });
    expect(all.profiles.map(({ name }) => name)).toEqual(['compact', 'detailed']);
    await expect(stat(path.join(cwd, 'detailed/png/20x15/gb.png'))).resolves.toBeDefined();

    const detailed = profiles['detailed'];
    if (!detailed) throw new Error('Missing detailed test profile.');
    await generate({ cwd, config: { detailed } });
    await expect(stat(path.join(cwd, 'compact/png/20x15/cz.png'))).rejects.toThrow();
    await expect(stat(path.join(cwd, 'detailed/png/20x15/gb.png'))).resolves.toBeDefined();
  });

  test('discovers JSONC config and resolves paths beside it', async () => {
    const cwd = await temporaryDirectory();
    await writeFile(
      path.join(cwd, 'flag-resizer.config.jsonc'),
      `{
        // JSONC is supported.
        "default": {
          "filter": { "type": "whitelist", "values": ["cz"] },
          "sizes": [[20, 15]],
          "quality": 100,
          "formats": ["png"],
          "output": {
            "png": { "dir": "public/flags", "publicPath": "/flags" },
            "ts": "generated/flags.ts"
          }
        }
      }`,
    );

    const result = await generate({ cwd });
    expect(result.profiles[0]?.countries).toBe(1);
    await expect(stat(path.join(cwd, 'public/flags/20x15/cz.png'))).resolves.toBeDefined();
  });

  test('does not write the managed manifest when commit fails', async () => {
    const cwd = await temporaryDirectory();
    await writeFile(path.join(cwd, 'blocked'), 'not a directory');
    const invalidDestination: FlagResizerConfig = {
      default: profile({
        output: {
          png: { dir: 'blocked/png', publicPath: '/png' },
          ts: 'generated/flags.ts',
        },
      }),
    };

    await expect(generate({ cwd, config: invalidDestination })).rejects.toThrow(
      'before the manifest was committed',
    );
    await expect(stat(path.join(cwd, '.flag-resizer/manifest.json'))).rejects.toThrow();
  });
});
