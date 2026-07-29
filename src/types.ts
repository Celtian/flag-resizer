import type { CountryCode } from './data/flags.js';

export type FlagFormat = 'png' | 'webp';
export type FlagSize = readonly [width: number, height: number];
export type FlagFilterPattern = `${string}*${string}`;
export type FlagFilterValue = CountryCode | FlagFilterPattern;

export interface FlagFilter {
  type: 'whitelist' | 'blacklist';
  values: readonly FlagFilterValue[];
}

export interface FormatOutput {
  dir: string;
  publicPath: string;
}

export interface ProfileOutput {
  png?: FormatOutput;
  webp?: FormatOutput;
  ts: string;
}

export interface ProfileConfig {
  filter: FlagFilter;
  sizes: readonly FlagSize[];
  quality: number;
  formats: readonly FlagFormat[];
  output: ProfileOutput;
}

export type FlagResizerConfig = Readonly<Record<string, ProfileConfig>>;

interface GenerateOptionsBase {
  cwd?: string;
  profiles?: readonly string[];
  concurrency?: number;
  dryRun?: boolean;
}

export interface GenerateInlineOptions extends GenerateOptionsBase {
  config: FlagResizerConfig;
  configFile?: never;
}

export interface GenerateFileOptions extends GenerateOptionsBase {
  config?: never;
  configFile?: string;
}

export type GenerateOptions = GenerateInlineOptions | GenerateFileOptions;

export interface ProfileGenerationResult {
  name: string;
  countries: number;
  images: number;
  sizes: readonly FlagSize[];
  formats: readonly FlagFormat[];
  outputDirectories: Partial<Record<FlagFormat, string>>;
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  typeScriptFile: string;
}

export interface GenerationResult {
  dryRun: boolean;
  durationMs: number;
  configFile?: string;
  manifestFile: string;
  profiles: ProfileGenerationResult[];
}

export interface ResolvedFormatOutput extends FormatOutput {
  dir: string;
}

export interface ResolvedProfileConfig extends Omit<ProfileConfig, 'output'> {
  name: string;
  countries: readonly CountryCode[];
  output: {
    png?: ResolvedFormatOutput;
    webp?: ResolvedFormatOutput;
    ts: string;
  };
}

export interface ResolvedConfiguration {
  baseDir: string;
  configFile?: string;
  profiles: readonly ResolvedProfileConfig[];
}
