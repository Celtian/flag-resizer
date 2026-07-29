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
