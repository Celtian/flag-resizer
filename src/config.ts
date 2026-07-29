import path from 'node:path';

import { loadConfig } from 'c12';
import { z } from 'zod';

import { COUNTRY_CODES, FLAGS, type CountryCode } from './data/flags.js';
import { FlagResizerError } from './errors.js';
import type {
  FlagFormat,
  FlagResizerConfig,
  GenerateOptions,
  ProfileConfig,
  ResolvedConfiguration,
  ResolvedProfileConfig,
} from './types.js';

const countryCodeSchema = z.enum(COUNTRY_CODES as [CountryCode, ...CountryCode[]]);
const formatSchema = z.enum(['png', 'webp']);
const sizeSchema = z.tuple([
  z.number().int().positive('width must be a positive integer'),
  z.number().int().positive('height must be a positive integer'),
]);
const formatOutputSchema = z
  .object({
    dir: z.string().trim().min(1),
    publicPath: z.string().trim().min(1),
  })
  .strict();
const profileSchema = z
  .object({
    filter: z
      .object({
        type: z.enum(['whitelist', 'blacklist']),
        values: z.array(countryCodeSchema),
      })
      .strict(),
    sizes: z.array(sizeSchema).min(1),
    quality: z.number().int().min(1).max(100),
    formats: z.array(formatSchema).min(1),
    output: z
      .object({
        png: formatOutputSchema.optional(),
        webp: formatOutputSchema.optional(),
        ts: z.string().trim().min(1),
      })
      .strict(),
  })
  .strict();
const configSchema = z.record(z.string().trim().min(1), profileSchema);

interface LoadedConfig {
  raw: unknown;
  baseDir: string;
  configFile?: string;
}

export function defineConfig<const T extends FlagResizerConfig>(config: T): T {
  return config;
}

function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const location = issue.path.length > 0 ? issue.path.join('.') : 'config';
      const received = issue.code === 'invalid_value' ? ` (${String(issue.input)})` : '';
      return `${location}: ${issue.message}${received}`;
    })
    .join('\n');
}

function preflightFormatTypos(raw: unknown): void {
  if (typeof raw !== 'object' || raw === null) return;

  for (const [profileName, value] of Object.entries(raw)) {
    if (typeof value !== 'object' || value === null) continue;
    const formats: unknown = Reflect.get(value, 'formats');
    if (Array.isArray(formats) && formats.includes('wepb')) {
      throw new FlagResizerError(
        `Profile "${profileName}" contains format "wepb". Did you mean "webp"?`,
      );
    }
  }
}

function normalizePublicPath(publicPath: string): string {
  const normalized = publicPath.replace(/\/+$/u, '');
  return normalized === '' ? '/' : normalized;
}

function assertUniqueValues(profileName: string, profile: ProfileConfig): void {
  const formats = new Set(profile.formats);
  if (formats.size !== profile.formats.length) {
    throw new FlagResizerError(`Profile "${profileName}" contains duplicate formats.`);
  }

  const sizes = new Set(profile.sizes.map(([width, height]) => `${width}x${height}`));
  if (sizes.size !== profile.sizes.length) {
    throw new FlagResizerError(`Profile "${profileName}" contains duplicate sizes.`);
  }

  const countries = new Set(profile.filter.values);
  if (countries.size !== profile.filter.values.length) {
    throw new FlagResizerError(`Profile "${profileName}" contains duplicate filter values.`);
  }
}

function assertConsistentRatio(profileName: string, profile: ProfileConfig): void {
  const first = profile.sizes[0];
  if (!first) return;

  const [baseWidth, baseHeight] = first;
  for (const [width, height] of profile.sizes.slice(1)) {
    if (width * baseHeight !== height * baseWidth) {
      throw new FlagResizerError(
        `Profile "${profileName}" mixes aspect ratios: ${baseWidth}x${baseHeight} and ${width}x${height}.`,
      );
    }
  }
}

function selectCountries(profile: ProfileConfig): readonly CountryCode[] {
  const values = new Set(profile.filter.values);
  return COUNTRY_CODES.filter((code) =>
    profile.filter.type === 'whitelist' ? values.has(code) : !values.has(code),
  );
}

function resolveProfile(
  name: string,
  profile: ProfileConfig,
  baseDir: string,
): ResolvedProfileConfig {
  assertUniqueValues(name, profile);
  assertConsistentRatio(name, profile);

  for (const format of profile.formats) {
    if (!profile.output[format]) {
      throw new FlagResizerError(
        `Profile "${name}" enables "${format}" but output.${format} is missing.`,
      );
    }
  }

  return {
    ...profile,
    name,
    countries: selectCountries(profile),
    output: {
      ...(profile.output.png
        ? {
            png: {
              dir: path.resolve(baseDir, profile.output.png.dir),
              publicPath: normalizePublicPath(profile.output.png.publicPath),
            },
          }
        : {}),
      ...(profile.output.webp
        ? {
            webp: {
              dir: path.resolve(baseDir, profile.output.webp.dir),
              publicPath: normalizePublicPath(profile.output.webp.publicPath),
            },
          }
        : {}),
      ts: path.resolve(baseDir, profile.output.ts),
    },
  };
}

function profileTargets(profile: ResolvedProfileConfig): Iterable<string> {
  const targets: string[] = [profile.output.ts];

  for (const format of profile.formats) {
    const output = profile.output[format];
    if (!output) continue;
    for (const [width, height] of profile.sizes) {
      for (const code of profile.countries) {
        targets.push(path.join(output.dir, `${width}x${height}`, `${code}.${format}`));
      }
    }
  }

  return targets;
}

function assertNoTargetCollisions(profiles: readonly ResolvedProfileConfig[]): void {
  const owners = new Map<string, string>();

  for (const profile of profiles) {
    for (const target of profileTargets(profile)) {
      const owner = owners.get(target);
      if (owner) {
        throw new FlagResizerError(
          `Profiles "${owner}" and "${profile.name}" both generate ${target}.`,
        );
      }
      owners.set(target, profile.name);
    }
  }
}

async function loadRawConfiguration(options: GenerateOptions): Promise<LoadedConfig> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  if ('config' in options) {
    return { raw: options.config, baseDir: cwd };
  }

  const requestedFile = options.configFile ? path.resolve(cwd, options.configFile) : undefined;

  try {
    const result = await loadConfig({
      name: 'flag-resizer',
      cwd,
      ...(requestedFile ? { configFile: requestedFile } : {}),
      configFileRequired: true,
      rcFile: false,
      globalRc: false,
      packageJson: false,
      dotenv: false,
      envName: false,
      extend: false,
    });
    const discoveredFile =
      typeof result.configFile === 'string' ? path.resolve(result.configFile) : requestedFile;

    return {
      raw: result.config,
      baseDir: discoveredFile ? path.dirname(discoveredFile) : cwd,
      ...(discoveredFile ? { configFile: discoveredFile } : {}),
    };
  } catch (error) {
    const target = requestedFile ?? path.join(cwd, 'flag-resizer.config.*');
    throw new FlagResizerError(`Unable to load flag-resizer configuration from ${target}.`, {
      cause: error,
    });
  }
}

export async function resolveConfiguration(
  options: GenerateOptions,
): Promise<ResolvedConfiguration> {
  const loaded = await loadRawConfiguration(options);
  preflightFormatTypos(loaded.raw);

  const parsed = configSchema.safeParse(loaded.raw);
  if (!parsed.success) {
    throw new FlagResizerError(
      `Invalid flag-resizer configuration:\n${formatValidationError(parsed.error)}`,
    );
  }

  const entries = Object.entries(parsed.data);
  if (entries.length === 0) {
    throw new FlagResizerError('The configuration must contain at least one profile.');
  }

  const allProfiles = entries.map(([name, profile]) =>
    resolveProfile(name, profile as ProfileConfig, loaded.baseDir),
  );
  assertNoTargetCollisions(allProfiles);

  const requested = options.profiles;
  const selected =
    requested && requested.length > 0
      ? requested.map((name) => {
          const profile = allProfiles.find((candidate) => candidate.name === name);
          if (!profile) {
            throw new FlagResizerError(
              `Unknown profile "${name}". Available profiles: ${allProfiles
                .map((candidate) => candidate.name)
                .join(', ')}.`,
            );
          }
          return profile;
        })
      : allProfiles;

  if (new Set(selected.map((profile) => profile.name)).size !== selected.length) {
    throw new FlagResizerError('A profile was selected more than once.');
  }

  return {
    baseDir: loaded.baseDir,
    profiles: selected,
    ...(loaded.configFile ? { configFile: loaded.configFile } : {}),
  };
}

export function getCountryName(code: CountryCode): string {
  return FLAGS[code];
}

export function isFlagFormat(value: string): value is FlagFormat {
  return value === 'png' || value === 'webp';
}
