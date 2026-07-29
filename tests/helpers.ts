import type {
  CountryCode,
  FlagFormat,
  FlagResizerConfig,
  FlagSize,
  ProfileConfig,
} from '../src/index.js';

export function profile(overrides: Partial<ProfileConfig> = {}): ProfileConfig {
  const formats: readonly FlagFormat[] = overrides.formats ?? ['png'];
  return {
    filter: overrides.filter ?? {
      type: 'whitelist',
      values: ['cz', 'gb'] satisfies CountryCode[],
    },
    sizes: overrides.sizes ?? ([[20, 15]] satisfies readonly FlagSize[]),
    quality: overrides.quality ?? 100,
    formats,
    output: overrides.output ?? {
      png: { dir: 'output/png', publicPath: '/flags/png' },
      ts: 'generated/flags.ts',
    },
  };
}

export function config(profileConfig: ProfileConfig = profile()): FlagResizerConfig {
  return { default: profileConfig };
}
