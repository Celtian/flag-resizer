import { afterEach, describe, expect, test, vi } from 'vitest';

import { runCli } from '../src/cli-core.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CLI', () => {
  test('prints help and version', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(runCli(['--help'])).resolves.toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Usage: flag-resizer'));

    log.mockClear();
    await expect(runCli(['--version'])).resolves.toBe(0);
    expect(log).toHaveBeenCalledWith('0.1.0');
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
});
