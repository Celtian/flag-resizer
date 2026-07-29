import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { formatProfileSummary, formatVerboseDetails, runCli } from '../src/cli-core.js';
import type { GenerationResult } from '../src/types.js';

const packageVersion = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CLI', () => {
  test('prints help and version', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(runCli(['--help'])).resolves.toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('flag-resizer [profiles...]'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('--verbose'));

    log.mockClear();
    await expect(runCli(['--version'])).resolves.toBe(0);
    expect(log).toHaveBeenCalledWith(`flag-resizer ${packageVersion}`);
  });

  test('reports parser and generation errors', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(runCli(['--unknown'])).resolves.toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Unknown option'));

    error.mockClear();
    await expect(runCli(['--config', '/definitely/missing/config.ts'])).resolves.toBe(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Unable to load flag-resizer configuration'),
    );
  });

  test('validates concurrency before generation', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(runCli(['--concurrency', '0'])).resolves.toBe(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('--concurrency must be a positive integer'),
    );
  });

  test('formats compact plain and colored profile summaries', () => {
    const profile = {
      name: 'default',
      countries: 2,
      images: 8,
      created: 13,
      updated: 0,
      unchanged: 0,
      removed: 0,
    };

    expect(formatProfileSummary(profile, 13)).toBe(
      '✔  default · 2 flags · 8 images · 13 created · 13 ms',
    );
    expect(formatProfileSummary(profile, 13, true)).toContain('\u001B[32m✔\u001B[0m');
    expect(formatProfileSummary(profile, 13, true)).toContain('\u001B[36mdefault\u001B[0m');
  });

  test('formats verbose configuration and output details using relative paths', () => {
    const result: GenerationResult = {
      dryRun: true,
      durationMs: 13,
      configFile: '/workspace/flag-resizer.config.ts',
      manifestFile: '/workspace/.flag-resizer/manifest.json',
      profiles: [
        {
          name: 'default',
          countries: 2,
          images: 8,
          sizes: [
            [20, 15],
            [40, 30],
          ],
          formats: ['png', 'webp'],
          outputDirectories: {
            png: '/workspace/public/flags/png',
            webp: '/workspace/public/flags/webp',
          },
          created: 13,
          updated: 0,
          unchanged: 0,
          removed: 0,
          typeScriptFile: '/workspace/src/generated/flags.ts',
        },
      ],
    };

    expect(formatVerboseDetails(result, '/workspace')).toBe(
      [
        '   config      flag-resizer.config.ts',
        '   sizes       20x15, 40x30',
        '   formats     png, webp',
        '   png output  public/flags/png',
        '   webp output public/flags/webp',
        '   typescript  src/generated/flags.ts',
        '   manifest    .flag-resizer/manifest.json',
      ].join('\n'),
    );
  });
});
