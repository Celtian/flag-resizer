import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

import { FlagResizerError } from './errors.js';
import { generate } from './generator.js';

const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url));
const PACKAGE_JSON = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as {
  version: string;
};

const HELP = `Usage: flag-resizer [profiles...] [options]

Generate typed PNG and WebP flag assets from flag-resizer.config.*

Options:
  -c, --config <path>       Use an explicit configuration file
      --concurrency <count> Maximum parallel image conversions
      --dry-run             Show planned changes without writing files
  -h, --help                Show this help
  -v, --version             Show the package version

With no profile arguments, every configured profile is generated.
`;

interface ParsedCliArguments {
  positionals: string[];
  values: {
    config?: string;
    concurrency?: string;
    dryRun: boolean;
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

export async function runCli(args: readonly string[]): Promise<number> {
  let parsed: ParsedCliArguments;
  try {
    parsed = parseCliArguments(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}\n\n${HELP}`);
    return 1;
  }

  if (parsed.values.help) {
    console.log(HELP);
    return 0;
  }
  if (parsed.values.version) {
    console.log(PACKAGE_JSON.version);
    return 0;
  }

  try {
    const concurrency = parseConcurrency(parsed.values.concurrency);
    const result = await generate({
      ...(parsed.values.config ? { configFile: parsed.values.config } : {}),
      ...(parsed.positionals.length > 0 ? { profiles: parsed.positionals } : {}),
      ...(concurrency === undefined ? {} : { concurrency }),
      dryRun: parsed.values.dryRun,
    });

    for (const profile of result.profiles) {
      console.log(
        [
          result.dryRun ? 'Planned' : 'Generated',
          `"${profile.name}":`,
          `${profile.countries} flags,`,
          `${profile.images} images,`,
          `${profile.created} created,`,
          `${profile.updated} updated,`,
          `${profile.unchanged} unchanged,`,
          `${profile.removed} removed`,
        ].join(' '),
      );
    }
    console.log(
      `${result.dryRun ? 'Dry run completed' : 'Done'} in ${result.durationMs}ms. Manifest: ${result.manifestFile}`,
    );
    return 0;
  } catch (error) {
    if (error instanceof FlagResizerError) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
    return 1;
  }
}
