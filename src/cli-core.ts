import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

import { FlagResizerError } from './errors.js';
import { generate } from './generator.js';
import type { GenerationResult } from './types.js';

const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url));
const PACKAGE_JSON = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as {
  version: string;
};

const ansi = {
  reset: '\u001B[0m',
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  cyan: '\u001B[36m',
  brightCyan: '\u001B[96m',
  dim: '\u001B[2m',
  dimCyan: '\u001B[2;36m',
} as const;

interface Palette {
  red: (value: string) => string;
  green: (value: string) => string;
  yellow: (value: string) => string;
  cyan: (value: string) => string;
  brightCyan: (value: string) => string;
  dim: (value: string) => string;
  dimCyan: (value: string) => string;
}

const plain = (value: string): string => value;

function palette(enabled: boolean): Palette {
  const color =
    (code: string) =>
    (value: string): string =>
      enabled ? `${code}${value}${ansi.reset}` : value;
  return {
    red: color(ansi.red),
    green: color(ansi.green),
    yellow: color(ansi.yellow),
    cyan: color(ansi.cyan),
    brightCyan: color(ansi.brightCyan),
    dim: color(ansi.dim),
    dimCyan: color(ansi.dimCyan),
  };
}

function colorsEnabled(stream: NodeJS.WriteStream): boolean {
  if (process.env['NO_COLOR'] !== undefined || process.env['FORCE_COLOR'] === '0') return false;
  return stream.isTTY || Boolean(process.env['FORCE_COLOR']);
}

function plural(value: number, word: string): string {
  return `${value} ${word}${value === 1 ? '' : 's'}`;
}

function help(colors: Palette): string {
  return `
${colors.brightCyan('Flag Resizer')}

${colors.yellow('Usage:')}
  flag-resizer [profiles...] [options]

Generate typed PNG and WebP flag assets from flag-resizer.config.*
With no profile arguments, every configured profile is generated.

${colors.yellow('Options:')}
  ${colors.green('-c, --config <path>')}        Use an explicit configuration file.
  ${colors.green('    --concurrency <count>')} Maximum parallel image conversions.
  ${colors.green('    --dry-run')}             Preview changes without writing files.
  ${colors.green('    --verbose')}             Show configuration and output details.
  ${colors.green('-h, --help')}                Display usage information.
  ${colors.green('-v, --version')}             Display the installed version.
`;
}

interface ParsedCliArguments {
  positionals: string[];
  values: {
    config?: string;
    concurrency?: string;
    dryRun: boolean;
    verbose: boolean;
    help: boolean;
    version: boolean;
  };
}

function parseCliArguments(args: readonly string[]): ParsedCliArguments {
  const parsed = parseArgs({
    args: [...args],
    allowPositionals: true,
    strict: true,
    options: {
      config: { type: 'string', short: 'c' },
      concurrency: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  });
  const values = parsed.values;

  return {
    positionals: parsed.positionals,
    values: {
      ...(typeof values.config === 'string' ? { config: values.config } : {}),
      ...(typeof values.concurrency === 'string' ? { concurrency: values.concurrency } : {}),
      dryRun: values['dry-run'],
      verbose: values.verbose,
      help: values.help,
      version: values.version,
    },
  };
}

function parseConcurrency(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new FlagResizerError('--concurrency must be a positive integer.');
  }
  return parsed;
}

interface PrintableProfile {
  name: string;
  countries: number;
  images: number;
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
}

export function formatProfileSummary(
  profile: PrintableProfile,
  durationMs: number | undefined,
  useColor = false,
): string {
  const colors = useColor
    ? palette(true)
    : {
        red: plain,
        green: plain,
        yellow: plain,
        cyan: plain,
        brightCyan: plain,
        dim: plain,
        dimCyan: plain,
      };
  const details = [
    plural(profile.countries, 'flag'),
    plural(profile.images, 'image'),
    ...(profile.created > 0 ? [colors.green(`${profile.created} created`)] : []),
    ...(profile.updated > 0 ? [colors.yellow(`${profile.updated} updated`)] : []),
    ...(profile.unchanged > 0 ? [colors.dim(`${profile.unchanged} unchanged`)] : []),
    ...(profile.removed > 0 ? [colors.red(`${profile.removed} removed`)] : []),
    ...(durationMs === undefined ? [] : [colors.dimCyan(`${durationMs} ms`)]),
  ];
  return `${colors.green('✔')}  ${colors.cyan(profile.name)} · ${details.join(' · ')}`;
}

function formatCombinedSummary(
  profiles: readonly PrintableProfile[],
  durationMs: number,
  colors: Palette,
): string {
  const totals = profiles.reduce(
    (current, profile) => ({
      flags: current.flags + profile.countries,
      images: current.images + profile.images,
      files: current.files + profile.created + profile.updated + profile.unchanged,
    }),
    { flags: 0, images: 0, files: 0 },
  );
  return [
    `${colors.green('✔')}  ${plural(profiles.length, 'profile')}`,
    plural(totals.flags, 'flag'),
    plural(totals.images, 'image'),
    plural(totals.files, 'file'),
    colors.dimCyan(`${durationMs} ms`),
  ].join(' · ');
}

function displayPath(target: string, cwd: string): string {
  const relative = path.relative(cwd, target);
  if (relative === '') return '.';
  return relative.startsWith('..') ? target : relative;
}

function verboseRow(label: string, value: string, colors: Palette): string {
  return `   ${colors.dim(label.padEnd(12))}${value}`;
}

export function formatVerboseDetails(
  result: GenerationResult,
  cwd = process.cwd(),
  useColor = false,
): string {
  const colors = palette(useColor);
  const rows: string[] = [];

  if (result.configFile) {
    rows.push(verboseRow('config', displayPath(result.configFile, cwd), colors));
  }

  for (const profile of result.profiles) {
    rows.push(
      verboseRow(
        'sizes',
        profile.sizes.map(([width, height]) => `${width}x${height}`).join(', '),
        colors,
      ),
      verboseRow('formats', profile.formats.join(', '), colors),
    );
    for (const format of profile.formats) {
      const directory = profile.outputDirectories[format];
      if (directory) {
        rows.push(verboseRow(`${format} output`, displayPath(directory, cwd), colors));
      }
    }
    rows.push(verboseRow('typescript', displayPath(profile.typeScriptFile, cwd), colors));
  }

  rows.push(verboseRow('manifest', displayPath(result.manifestFile, cwd), colors));
  return rows.join('\n');
}

export async function runCli(args: readonly string[]): Promise<number> {
  const stdoutColors = palette(colorsEnabled(process.stdout));
  const stderrColors = palette(colorsEnabled(process.stderr));
  let parsed: ParsedCliArguments;
  try {
    parsed = parseCliArguments(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${stderrColors.red('error')}: ${message}`);
    return 1;
  }

  if (parsed.values.help) {
    console.log(help(stdoutColors));
    return 0;
  }
  if (parsed.values.version) {
    console.log(`flag-resizer ${PACKAGE_JSON.version}`);
    return 0;
  }

  try {
    const concurrency = parseConcurrency(parsed.values.concurrency);
    const action = parsed.values.dryRun ? 'Planning flag generation…' : 'Generating flag assets…';
    console.error(`${stderrColors.cyan('...')} ${stderrColors.dim(action)}`);
    const result = await generate({
      ...(parsed.values.config ? { configFile: parsed.values.config } : {}),
      ...(parsed.positionals.length > 0 ? { profiles: parsed.positionals } : {}),
      ...(concurrency === undefined ? {} : { concurrency }),
      dryRun: parsed.values.dryRun,
    });

    for (const profile of result.profiles) {
      console.error(
        formatProfileSummary(
          profile,
          result.profiles.length === 1 ? result.durationMs : undefined,
          colorsEnabled(process.stderr),
        ),
      );
    }
    if (result.profiles.length > 1) {
      console.error(formatCombinedSummary(result.profiles, result.durationMs, stderrColors));
    }
    if (parsed.values.verbose) {
      console.error('');
      console.error(formatVerboseDetails(result, process.cwd(), colorsEnabled(process.stderr)));
    }
    return 0;
  } catch (error) {
    if (error instanceof FlagResizerError) {
      console.error(`${stderrColors.red('error')}: ${error.message}`);
    } else {
      console.error(`${stderrColors.red('error')}: unexpected failure`, error);
    }
    return 1;
  }
}
