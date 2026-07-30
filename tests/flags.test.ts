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

    expect(COUNTRY_CODES).toHaveLength(550);
    expect(Object.keys(FLAGS)).toHaveLength(550);
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

  test('preserves the official non-rectangular Polish flag silhouettes', async () => {
    for (const code of ['pl-28', 'pl-30']) {
      const { data, info } = await sharp(path.resolve('flags', `${code}.svg`))
        .resize(360, 360)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const alpha = data[(270 * info.width + 300) * info.channels + 3];

      expect(alpha, `${code} should remain transparent at its lower fly`).toBe(0);
    }
  });

  test('preserves the Holy Cross flag hoist panel', async () => {
    const { data, info } = await sharp(path.resolve('flags/pl-26.svg'))
      .resize(360, 360)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number): number[] => {
      const offset = (y * info.width + x) * info.channels;

      return [...data.subarray(offset, offset + info.channels)];
    };

    expect(pixel(40, 100)).toEqual([250, 207, 0, 255]);
    expect(pixel(150, 70)).toEqual([0, 147, 221, 255]);
  });

  test('preserves colors inherited from third-party SVG roots', async () => {
    const centerPixel = async (code: string): Promise<number[]> => {
      const { data, info } = await sharp(path.resolve('flags', `${code}.svg`))
        .resize(360, 360)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const offset = (180 * info.width + 180) * info.channels;

      return [...data.subarray(offset, offset + info.channels)];
    };

    await expect(centerPixel('at-9')).resolves.toEqual([255, 255, 255, 255]);
    await expect(centerPixel('gr-a')).resolves.toEqual([255, 204, 51, 255]);
  });

  test('exports representative names', () => {
    expect(FLAGS.ac).toBe('Ascension Island');
    expect(FLAGS['at-1']).toBe('Burgenland');
    expect(FLAGS['at-9']).toBe('Vienna');
    expect(FLAGS['au-act']).toBe('Australian Capital Territory');
    expect(FLAGS['au-wa']).toBe('Western Australia');
    expect(FLAGS['br-ac']).toBe('Acre');
    expect(FLAGS['br-df']).toBe('Federal District');
    expect(FLAGS['br-sp']).toBe('São Paulo');
    expect(FLAGS['br-to']).toBe('Tocantins');
    expect(FLAGS['ca-ab']).toBe('Alberta');
    expect(FLAGS['ca-on']).toBe('Ontario');
    expect(FLAGS['ca-yt']).toBe('Yukon');
    expect(FLAGS['ch-ag']).toBe('Aargau');
    expect(FLAGS['ch-ge']).toBe('Genève');
    expect(FLAGS['ch-gr']).toBe('Graubünden');
    expect(FLAGS['ch-zh']).toBe('Zürich');
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
    expect(FLAGS['gr-69']).toBe('Mount Athos');
    expect(FLAGS['gr-c']).toBe('Western Macedonia');
    expect(FLAGS.ic).toBe('Canary Islands');
    expect(FLAGS['it-21']).toBe('Piedmont');
    expect(FLAGS['it-32']).toBe('Trentino-South Tyrol');
    expect(FLAGS['it-82']).toBe('Sicily');
    expect(FLAGS['it-88']).toBe('Sardinia');
    expect(FLAGS['jp-01']).toBe('Hokkaido');
    expect(FLAGS['jp-13']).toBe('Tokyo');
    expect(FLAGS['jp-26']).toBe('Kyoto');
    expect(FLAGS['jp-47']).toBe('Okinawa');
    expect(FLAGS['mx-agu']).toBe('Aguascalientes');
    expect(FLAGS['mx-cmx']).toBe('Mexico City');
    expect(FLAGS['mx-mex']).toBe('State of Mexico');
    expect(FLAGS['mx-zac']).toBe('Zacatecas');
    expect(FLAGS['pl-02']).toBe('Lower Silesia');
    expect(FLAGS['pl-32']).toBe('West Pomerania');
    expect(FLAGS.ta).toBe('Tristan da Cunha');
    expect(FLAGS.eu).toBe('European Union');
    expect(FLAGS.un).toBe('United Nations');
    expect(FLAGS['us-ak']).toBe('Alaska');
    expect(FLAGS['us-ca']).toBe('California');
    expect(FLAGS['us-wy']).toBe('Wyoming');
  });
});
