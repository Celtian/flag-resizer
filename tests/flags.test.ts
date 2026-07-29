import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { COUNTRY_CODES, FLAGS } from '../src/index.js';

describe('flag data', () => {
  test('matches all bundled SVG files exactly', async () => {
    const files = (await readdir(path.resolve('flags')))
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.replace(/\.svg$/u, ''))
      .sort();

    expect(COUNTRY_CODES).toHaveLength(252);
    expect(Object.keys(FLAGS)).toHaveLength(252);
    expect(files).toEqual([...COUNTRY_CODES].sort());
  });

  test('exports representative names', () => {
    expect(FLAGS.cz).toBe('Czechia');
    expect(FLAGS.gb).toBe('United Kingdom');
    expect(FLAGS.eu).toBe('European Union');
    expect(FLAGS.un).toBe('United Nations');
  });
});
