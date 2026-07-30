import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { resolveConfiguration } from '../src/config.js';
import type { FlagResizerConfig } from '../src/index.js';
import { config, profile } from './helpers.js';

describe('configuration', () => {
  test('resolves paths, public paths, filters, and selected profiles', async () => {
    const cwd = path.resolve('/tmp/flag-resizer-config');
    const resolved = await resolveConfiguration({
      cwd,
      config: {
        primary: profile({
          output: {
            png: { dir: 'public/png', publicPath: '/flags/png/' },
            ts: 'generated/primary.ts',
          },
        }),
        secondary: profile({
          filter: { type: 'blacklist', values: ['cz'] },
          output: {
            png: { dir: 'public/secondary', publicPath: 'https://cdn.test/flags/' },
            ts: 'generated/secondary.ts',
          },
        }),
      },
      profiles: ['secondary'],
    });

    expect(resolved.profiles).toHaveLength(1);
    expect(resolved.profiles[0]?.name).toBe('secondary');
    expect(resolved.profiles[0]?.countries).not.toContain('cz');
    expect(resolved.profiles[0]?.countries).toContain('gb');
    expect(resolved.profiles[0]?.output.png).toEqual({
      dir: path.join(cwd, 'public/secondary'),
      publicPath: 'https://cdn.test/flags',
    });
    expect(resolved.profiles[0]?.output.ts).toBe(path.join(cwd, 'generated/secondary.ts'));
  });

  test('supports wildcard whitelist and blacklist filter values', async () => {
    const whitelist = await resolveConfiguration({
      config: config(
        profile({
          filter: { type: 'whitelist', values: ['us-*'] },
        }),
      ),
    });
    const whitelistedCountries = whitelist.profiles[0]?.countries ?? [];

    expect(whitelistedCountries).toHaveLength(50);
    expect(whitelistedCountries.every((code) => code.startsWith('us-'))).toBe(true);
    expect(whitelistedCountries).not.toContain('us');

    const blacklist = await resolveConfiguration({
      config: config(
        profile({
          filter: { type: 'blacklist', values: ['us-*'] },
        }),
      ),
    });
    const blacklistedCountries = blacklist.profiles[0]?.countries ?? [];

    expect(blacklistedCountries).toContain('us');
    expect(blacklistedCountries.some((code) => code.startsWith('us-'))).toBe(false);
  });

  test('can exclude every subdivision with the global wildcard pattern', async () => {
    const resolved = await resolveConfiguration({
      config: config(
        profile({
          filter: { type: 'blacklist', values: ['*-*'] },
        }),
      ),
    });
    const countries = resolved.profiles[0]?.countries ?? [];

    expect(countries).toHaveLength(259);
    expect(countries.every((code) => !code.includes('-'))).toBe(true);
    expect(countries).toEqual(expect.arrayContaining(['us', 'hk', 'mo', 'ac']));
    expect(countries).not.toEqual(expect.arrayContaining(['us-ca', 'pt-02', 'gb-eng']));
  });

  test.each([
    ['format typo', config(profile({ formats: ['wepb' as never] })), 'Did you mean "webp"'],
    [
      'language code',
      config(
        profile({
          filter: { type: 'whitelist', values: ['cs' as never] },
        }),
      ),
      'Invalid flag-resizer configuration',
    ],
    [
      'filter pattern with no matches',
      config(
        profile({
          filter: { type: 'whitelist', values: ['zz-*'] },
        }),
      ),
      'matches no bundled flags',
    ],
    [
      'unsupported filter pattern syntax',
      config(
        profile({
          filter: { type: 'whitelist', values: ['us-?' as never] },
        }),
      ),
      'Invalid flag-resizer configuration',
    ],
    [
      'mixed ratios',
      config(
        profile({
          sizes: [
            [20, 15],
            [40, 40],
          ],
        }),
      ),
      'mixes aspect ratios',
    ],
    [
      'duplicate sizes',
      config(
        profile({
          sizes: [
            [20, 15],
            [20, 15],
          ],
        }),
      ),
      'duplicate sizes',
    ],
    [
      'missing output',
      config(
        profile({
          formats: ['webp'],
          output: { ts: 'generated/flags.ts' },
        }),
      ),
      'output.webp is missing',
    ],
  ])('rejects %s', async (_name, invalidConfig, message) => {
    await expect(resolveConfiguration({ config: invalidConfig })).rejects.toThrow(message);
  });

  test('rejects target collisions across profiles', async () => {
    const sharedOutput = {
      png: { dir: 'output', publicPath: '/flags' },
      ts: 'generated/flags.ts',
    };
    const invalid: FlagResizerConfig = {
      one: profile({ output: sharedOutput }),
      two: profile({
        output: {
          ...sharedOutput,
          ts: 'generated/other.ts',
        },
      }),
    };

    await expect(resolveConfiguration({ config: invalid })).rejects.toThrow('both generate');
  });

  test('rejects an unknown or duplicated selected profile', async () => {
    await expect(resolveConfiguration({ config: config(), profiles: ['missing'] })).rejects.toThrow(
      'Unknown profile',
    );
    await expect(
      resolveConfiguration({ config: config(), profiles: ['default', 'default'] }),
    ).rejects.toThrow('selected more than once');
  });

  test('requires at least one profile', async () => {
    await expect(resolveConfiguration({ config: {} })).rejects.toThrow('at least one profile');
  });
});
