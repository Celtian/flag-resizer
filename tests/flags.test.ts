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

    expect(COUNTRY_CODES).toHaveLength(262);
    expect(Object.keys(FLAGS)).toHaveLength(262);
    expect(files).toEqual([...COUNTRY_CODES].sort());
  });

  test('exports representative names', () => {
    expect(FLAGS.ac).toBe('Ascension Island');
    expect(FLAGS.cp).toBe('Clipperton Island');
    expect(FLAGS.cz).toBe('Czechia');
    expect(FLAGS.dg).toBe('Diego Garcia');
    expect(FLAGS.ea).toBe('Ceuta & Melilla');
    expect(FLAGS.gb).toBe('United Kingdom');
    expect(FLAGS['gb-eng']).toBe('England');
    expect(FLAGS['gb-nir']).toBe('Northern Ireland');
    expect(FLAGS['gb-sct']).toBe('Scotland');
    expect(FLAGS['gb-wls']).toBe('Wales');
    expect(FLAGS.ic).toBe('Canary Islands');
    expect(FLAGS.ta).toBe('Tristan da Cunha');
    expect(FLAGS.eu).toBe('European Union');
    expect(FLAGS.un).toBe('United Nations');
  });
});
