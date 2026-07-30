import { expectTypeOf, test } from 'vitest';

import {
  defineConfig,
  generate,
  type CountryCode,
  type FlagFilterPattern,
  type FlagFilterValue,
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
  expectTypeOf<'ar-c'>().toExtend<CountryCode>();
  expectTypeOf<'at-9'>().toExtend<CountryCode>();
  expectTypeOf<'au-act'>().toExtend<CountryCode>();
  expectTypeOf<'br-sp'>().toExtend<CountryCode>();
  expectTypeOf<'ca-on'>().toExtend<CountryCode>();
  expectTypeOf<'ch-zh'>().toExtend<CountryCode>();
  expectTypeOf<'co-dc'>().toExtend<CountryCode>();
  expectTypeOf<'cq'>().toExtend<CountryCode>();
  expectTypeOf<'cz'>().toExtend<CountryCode>();
  expectTypeOf<'de-by'>().toExtend<CountryCode>();
  expectTypeOf<'dg'>().toExtend<CountryCode>();
  expectTypeOf<'es-cn'>().toExtend<CountryCode>();
  expectTypeOf<'gb-eng'>().toExtend<CountryCode>();
  expectTypeOf<'gb-nir'>().toExtend<CountryCode>();
  expectTypeOf<'gr-69'>().toExtend<CountryCode>();
  expectTypeOf<'it-82'>().toExtend<CountryCode>();
  expectTypeOf<'jp-13'>().toExtend<CountryCode>();
  expectTypeOf<'mx-cmx'>().toExtend<CountryCode>();
  expectTypeOf<'pl-30'>().toExtend<CountryCode>();
  expectTypeOf<'pt-20'>().toExtend<CountryCode>();
  expectTypeOf<'us-ca'>().toExtend<CountryCode>();
  expectTypeOf<'br-*'>().toExtend<FlagFilterPattern>();
  expectTypeOf<'ar-*'>().toExtend<FlagFilterPattern>();
  expectTypeOf<'at-*'>().toExtend<FlagFilterPattern>();
  expectTypeOf<'ch-*'>().toExtend<FlagFilterValue>();
  expectTypeOf<'jp-*'>().toExtend<FlagFilterPattern>();
  expectTypeOf<'mx-*'>().toExtend<FlagFilterValue>();
  expectTypeOf<'gr-*'>().toExtend<FlagFilterValue>();
  expectTypeOf<'pl-*'>().toExtend<FlagFilterPattern>();
  expectTypeOf<'co-*'>().toExtend<FlagFilterPattern>();
  expectTypeOf<'pt-*'>().toExtend<FlagFilterValue>();
  expectTypeOf<'us-*'>().toExtend<FlagFilterPattern>();
  expectTypeOf<'us-*'>().toExtend<FlagFilterValue>();
  expectTypeOf<'webp'>().toExtend<FlagFormat>();
});
