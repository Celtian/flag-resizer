import { readdir } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';
import { describe, expect, test } from 'vitest';

import { COUNTRY_CODES, FLAGS } from '../src/index.js';

describe('flag data', () => {
  test('matches all bundled SVG files exactly', async () => {
    const files = (await readdir(path.resolve('flags')))
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.replace(/\.svg$/u, ''))
      .sort();

    expect(COUNTRY_CODES).toHaveLength(369);
    expect(Object.keys(FLAGS)).toHaveLength(369);
    expect(files).toEqual([...COUNTRY_CODES].sort());
  });

  test('all bundled SVG files decode on the 36×36 source canvas', async () => {
    const invalid: string[] = [];

    for (const code of COUNTRY_CODES) {
      try {
        const metadata = await sharp(path.resolve('flags', `${code}.svg`)).metadata();
        if (metadata.format !== 'svg' || metadata.width !== 36 || metadata.height !== 36) {
          invalid.push(`${code}: ${metadata.format} ${metadata.width}×${metadata.height}`);
        }
      } catch (error) {
        invalid.push(`${code}: ${String(error)}`);
      }
    }

    expect(invalid).toEqual([]);
  });

  test('exports representative names', () => {
    expect(FLAGS.ac).toBe('Ascension Island');
    expect(FLAGS['au-act']).toBe('Australian Capital Territory');
    expect(FLAGS['au-wa']).toBe('Western Australia');
    expect(FLAGS['ca-ab']).toBe('Alberta');
    expect(FLAGS['ca-on']).toBe('Ontario');
    expect(FLAGS['ca-yt']).toBe('Yukon');
    expect(FLAGS.cp).toBe('Clipperton Island');
    expect(FLAGS.cq).toBe('Sark');
    expect(FLAGS.cz).toBe('Czechia');
    expect(FLAGS['de-be']).toBe('Berlin');
    expect(FLAGS['de-by']).toBe('Bavaria');
    expect(FLAGS['de-th']).toBe('Thuringia');
    expect(FLAGS.dg).toBe('Diego Garcia');
    expect(FLAGS.ea).toBe('Ceuta & Melilla');
    expect(FLAGS['es-an']).toBe('Andalusia');
    expect(FLAGS['es-cn']).toBe('Canary Islands');
    expect(FLAGS['es-vc']).toBe('Valencian Community');
    expect(FLAGS.gb).toBe('United Kingdom');
    expect(FLAGS['gb-eng']).toBe('England');
    expect(FLAGS['gb-nir']).toBe('Northern Ireland');
    expect(FLAGS['gb-sct']).toBe('Scotland');
    expect(FLAGS['gb-wls']).toBe('Wales');
    expect(FLAGS.ic).toBe('Canary Islands');
    expect(FLAGS.ta).toBe('Tristan da Cunha');
    expect(FLAGS.eu).toBe('European Union');
    expect(FLAGS.un).toBe('United Nations');
    expect(FLAGS['us-ak']).toBe('Alaska');
    expect(FLAGS['us-ca']).toBe('California');
    expect(FLAGS['us-wy']).toBe('Wyoming');
  });
});
