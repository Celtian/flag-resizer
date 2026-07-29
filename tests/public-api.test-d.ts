import { expectTypeOf, test } from 'vitest';

import {
  defineConfig,
  generate,
  type CountryCode,
  type FlagFormat,
  type FlagResizerConfig,
  type GenerationResult,
} from '../src/index.js';

test('public API preserves literal configuration types', () => {
  const config = defineConfig({
    default: {
      filter: { type: 'whitelist', values: ['cz', 'gb'] },
      sizes: [[20, 15]],
      quality: 100,
      formats: ['png'],
      output: {
        png: { dir: 'public/flags', publicPath: '/flags' },
        ts: 'generated/flags.ts',
      },
    },
  });

  expectTypeOf(config).toExtend<FlagResizerConfig>();
  expectTypeOf(config.default.formats[0]).toEqualTypeOf<'png'>();
  expectTypeOf(generate).returns.resolves.toEqualTypeOf<GenerationResult>();
  expectTypeOf<'au-act'>().toExtend<CountryCode>();
  expectTypeOf<'ca-on'>().toExtend<CountryCode>();
  expectTypeOf<'cq'>().toExtend<CountryCode>();
  expectTypeOf<'cz'>().toExtend<CountryCode>();
  expectTypeOf<'dg'>().toExtend<CountryCode>();
  expectTypeOf<'gb-eng'>().toExtend<CountryCode>();
  expectTypeOf<'gb-nir'>().toExtend<CountryCode>();
  expectTypeOf<'us-ca'>().toExtend<CountryCode>();
  expectTypeOf<'webp'>().toExtend<FlagFormat>();
});
