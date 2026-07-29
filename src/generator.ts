import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  rmdir,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import sharp from 'sharp';

import { resolveConfiguration } from './config.js';
import type { CountryCode } from './data/flags.js';
import { FlagResizerError } from './errors.js';
import { createTypeScriptManifest } from './generated-typescript.js';
import type {
  FlagFormat,
  GenerateOptions,
  GenerationResult,
  ProfileGenerationResult,
  ResolvedProfileConfig,
} from './types.js';

const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url));
const FLAGS_DIRECTORY = path.join(PACKAGE_ROOT, 'flags');
const ATTRIBUTION_FILE = path.join(PACKAGE_ROOT, 'ATTRIBUTION.txt');
const GRAPHICS_LICENSE_FILE = path.join(PACKAGE_ROOT, 'LICENSE-GRAPHICS');
const MANIFEST_VERSION = 1;

type ManagedFileKind = 'attribution' | 'image' | 'license' | 'typescript';
type FileStatus = 'created' | 'updated' | 'unchanged';

interface ManagedFile {
  root: string;
  relativePath: string;
  kind: ManagedFileKind;
}

interface ProfileManifest {
  files: ManagedFile[];
}

interface ManagedManifest {
  version: typeof MANIFEST_VERSION;
  profiles: Record<string, ProfileManifest>;
}

interface PlannedFile {
  entry: ManagedFile;
  target: string;
  image: boolean;
  createContent: () => Promise<Buffer>;
}

interface GenerationPlan {
  tasks: PlannedFile[];
  filesByProfile: Map<string, ManagedFile[]>;
  imageCountByProfile: Map<string, number>;
}

function emptyManifest(): ManagedManifest {
  return { version: MANIFEST_VERSION, profiles: {} };
}

function entryTarget(entry: ManagedFile): string {
  return path.resolve(entry.root, entry.relativePath);
}

function entryKey(entry: ManagedFile): string {
  return entryTarget(entry);
}

function assertSafeManagedFile(entry: ManagedFile): void {
  if (!path.isAbsolute(entry.root)) {
    throw new FlagResizerError('The managed manifest contains a non-absolute output root.');
  }
  if (path.isAbsolute(entry.relativePath) || entry.relativePath.includes('\0')) {
    throw new FlagResizerError('The managed manifest contains an unsafe file path.');
  }

  const target = entryTarget(entry);
  const relative = path.relative(entry.root, target);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw new FlagResizerError('The managed manifest contains a path outside its output root.');
  }

  const portable = entry.relativePath.split(path.sep).join('/');
  const valid =
    (entry.kind === 'attribution' && portable === 'ATTRIBUTION.txt') ||
    (entry.kind === 'license' && portable === 'LICENSE-GRAPHICS') ||
    (entry.kind === 'typescript' && /^[^/]+\.ts$/u.test(portable)) ||
    (entry.kind === 'image' &&
      /^[1-9]\d*x[1-9]\d*\/(?:[a-z]{2}|gb-(?:eng|nir|sct|wls)|us-(?:ak|al|ar|az|ca|co|ct|de|fl|ga|hi|ia|id|il|in|ks|ky|la|ma|md|me|mi|mn|mo|ms|mt|nc|nd|ne|nh|nj|nm|nv|ny|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|va|vt|wa|wi|wv|wy))\.(?:png|webp)$/u.test(
        portable,
      ));

  if (!valid) {
    throw new FlagResizerError(
      `The managed manifest contains an invalid ${entry.kind} path: ${entry.relativePath}.`,
    );
  }
}

function managedFile(target: string, root: string, kind: ManagedFileKind): ManagedFile {
  const entry = {
    root: path.resolve(root),
    relativePath: path.relative(path.resolve(root), path.resolve(target)),
    kind,
  };
  assertSafeManagedFile(entry);
  return entry;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseManifest(value: unknown): ManagedManifest {
  if (!isRecord(value) || value['version'] !== MANIFEST_VERSION || !isRecord(value['profiles'])) {
    throw new FlagResizerError('The managed manifest has an unsupported or invalid structure.');
  }

  const profiles: Record<string, ProfileManifest> = {};
  for (const [profileName, profileValue] of Object.entries(value['profiles'])) {
    if (!isRecord(profileValue) || !Array.isArray(profileValue['files'])) {
      throw new FlagResizerError(`The manifest entry for profile "${profileName}" is invalid.`);
    }

    const files = profileValue['files'].map((file): ManagedFile => {
      if (
        !isRecord(file) ||
        typeof file['root'] !== 'string' ||
        typeof file['relativePath'] !== 'string' ||
        !['attribution', 'image', 'license', 'typescript'].includes(String(file['kind']))
      ) {
        throw new FlagResizerError(
          `The manifest contains an invalid file owned by profile "${profileName}".`,
        );
      }
      const entry: ManagedFile = {
        root: file['root'],
        relativePath: file['relativePath'],
        kind: file['kind'] as ManagedFileKind,
      };
      assertSafeManagedFile(entry);
      return entry;
    });
    profiles[profileName] = { files };
  }

  return { version: MANIFEST_VERSION, profiles };
}

async function pathExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function readManifest(file: string): Promise<ManagedManifest> {
  try {
    return parseManifest(JSON.parse(await readFile(file, 'utf8')) as unknown);
  } catch (error) {
    if (isRecord(error) && error['code'] === 'ENOENT') {
      return emptyManifest();
    }
    if (error instanceof FlagResizerError) throw error;
    throw new FlagResizerError(`Unable to read managed manifest ${file}.`, { cause: error });
  }
}

function resolveConcurrency(value: number | undefined): number {
  if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
    throw new FlagResizerError('concurrency must be a positive integer.');
  }
  return value ?? Math.max(1, Math.min(8, availableParallelism()));
}

async function runBounded<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      if (item) await worker(item, index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, runWorker),
  );
}

function svgDensity(width: number, height: number): number {
  const scale = Math.max(width, height) / 36;
  return Math.max(72, Math.ceil(scale * 72));
}

async function createImage(
  svg: Buffer,
  width: number,
  height: number,
  format: FlagFormat,
  quality: number,
): Promise<Buffer> {
  const pipeline = sharp(svg, { density: svgDensity(width, height) })
    .resize(width, height, {
      fit: 'cover',
      position: 'centre',
    })
    .ensureAlpha();

  if (format === 'png') {
    return pipeline
      .png({
        quality,
        compressionLevel: 9,
        adaptiveFiltering: true,
        effort: 7,
      })
      .toBuffer();
  }

  return pipeline.webp({ quality, effort: 4 }).toBuffer();
}

function addProfileFile(
  filesByProfile: Map<string, ManagedFile[]>,
  profileName: string,
  entry: ManagedFile,
): void {
  const entries = filesByProfile.get(profileName) ?? [];
  entries.push(entry);
  filesByProfile.set(profileName, entries);
}

function createGenerationPlan(profiles: readonly ResolvedProfileConfig[]): GenerationPlan {
  const taskByTarget = new Map<string, PlannedFile>();
  const filesByProfile = new Map<string, ManagedFile[]>();
  const imageCountByProfile = new Map<string, number>();
  const svgCache = new Map<CountryCode, Promise<Buffer>>();
  let attributionContent: Promise<Buffer> | undefined;
  let licenseContent: Promise<Buffer> | undefined;

  const readSvg = (code: CountryCode): Promise<Buffer> => {
    let content = svgCache.get(code);
    if (!content) {
      content = readFile(path.join(FLAGS_DIRECTORY, `${code}.svg`));
      svgCache.set(code, content);
    }
    return content;
  };

  const register = (
    profileName: string,
    entry: ManagedFile,
    image: boolean,
    createContent: () => Promise<Buffer>,
  ): void => {
    const target = entryTarget(entry);
    if (!taskByTarget.has(target)) {
      taskByTarget.set(target, { entry, target, image, createContent });
    }
    addProfileFile(filesByProfile, profileName, entry);
  };

  for (const profile of profiles) {
    const typeScriptEntry = managedFile(
      profile.output.ts,
      path.dirname(profile.output.ts),
      'typescript',
    );
    register(profile.name, typeScriptEntry, false, () =>
      Promise.resolve(Buffer.from(createTypeScriptManifest(profile))),
    );

    let imageCount = 0;
    for (const format of profile.formats) {
      const output = profile.output[format];
      if (!output) {
        throw new FlagResizerError(
          `Profile "${profile.name}" has no resolved output for ${format}.`,
        );
      }

      const attributionEntry = managedFile(
        path.join(output.dir, 'ATTRIBUTION.txt'),
        output.dir,
        'attribution',
      );
      register(profile.name, attributionEntry, false, () => {
        attributionContent ??= readFile(ATTRIBUTION_FILE);
        return attributionContent;
      });

      const licenseEntry = managedFile(
        path.join(output.dir, 'LICENSE-GRAPHICS'),
        output.dir,
        'license',
      );
      register(profile.name, licenseEntry, false, () => {
        licenseContent ??= readFile(GRAPHICS_LICENSE_FILE);
        return licenseContent;
      });

      for (const [width, height] of profile.sizes) {
        for (const code of profile.countries) {
          const target = path.join(output.dir, `${width}x${height}`, `${code}.${format}`);
          const entry = managedFile(target, output.dir, 'image');
          register(profile.name, entry, true, async () =>
            createImage(await readSvg(code), width, height, format, profile.quality),
          );
          imageCount += 1;
        }
      }
    }
    imageCountByProfile.set(profile.name, imageCount);
  }

  return {
    tasks: [...taskByTarget.values()].sort((left, right) =>
      left.target.localeCompare(right.target),
    ),
    filesByProfile,
    imageCountByProfile,
  };
}

async function buffersEqual(file: string, expected: Buffer): Promise<boolean> {
  try {
    const currentStat = await stat(file);
    if (currentStat.size !== expected.byteLength) return false;
    return (await readFile(file)).equals(expected);
  } catch (error) {
    if (isRecord(error) && error['code'] === 'ENOENT') return false;
    throw error;
  }
}

async function writeStagedFile(target: string, staged: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temporaryTarget = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`,
  );

  try {
    await copyFile(staged, temporaryTarget);
    await rename(temporaryTarget, target);
  } finally {
    await rm(temporaryTarget, { force: true });
  }
}

async function writeAtomic(target: string, content: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temporaryTarget = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`,
  );

  try {
    await writeFile(temporaryTarget, content);
    await rename(temporaryTarget, target);
  } finally {
    await rm(temporaryTarget, { force: true });
  }
}

async function removeEmptyParents(start: string, root: string): Promise<void> {
  let directory = path.resolve(start);
  const resolvedRoot = path.resolve(root);

  while (directory !== resolvedRoot) {
    const relative = path.relative(resolvedRoot, directory);
    if (relative === '..' || relative.startsWith(`..${path.sep}`)) return;
    try {
      await rmdir(directory);
    } catch {
      return;
    }
    directory = path.dirname(directory);
  }
}

async function pruneFile(entry: ManagedFile): Promise<boolean> {
  assertSafeManagedFile(entry);
  const target = entryTarget(entry);
  try {
    await unlink(target);
    await removeEmptyParents(path.dirname(target), entry.root);
    return true;
  } catch (error) {
    if (isRecord(error) && error['code'] === 'ENOENT') return false;
    throw new FlagResizerError(`Unable to remove stale generated file ${target}.`, {
      cause: error,
    });
  }
}

function sortedManifest(manifest: ManagedManifest): ManagedManifest {
  return {
    version: MANIFEST_VERSION,
    profiles: Object.fromEntries(
      Object.entries(manifest.profiles)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([profileName, profile]) => [
          profileName,
          {
            files: [...profile.files].sort((left, right) =>
              entryTarget(left).localeCompare(entryTarget(right)),
            ),
          },
        ]),
    ),
  };
}

function nextManifest(
  previous: ManagedManifest,
  plan: GenerationPlan,
  selectedProfiles: readonly ResolvedProfileConfig[],
  fullRun: boolean,
): ManagedManifest {
  const profiles: Record<string, ProfileManifest> = fullRun ? {} : { ...previous.profiles };
  for (const profile of selectedProfiles) {
    profiles[profile.name] = { files: plan.filesByProfile.get(profile.name) ?? [] };
  }
  return sortedManifest({ version: MANIFEST_VERSION, profiles });
}

function staleEntries(previous: ManagedManifest, next: ManagedManifest): ManagedFile[] {
  const retainedTargets = new Set(
    Object.values(next.profiles).flatMap((profile) => profile.files.map(entryKey)),
  );
  const stale = new Map<string, ManagedFile>();

  for (const profile of Object.values(previous.profiles)) {
    for (const entry of profile.files) {
      const target = entryKey(entry);
      if (!retainedTargets.has(target)) stale.set(target, entry);
    }
  }
  return [...stale.values()];
}

function removedOwnershipCount(
  previous: ManagedManifest,
  next: ManagedManifest,
  profileName: string,
): number {
  const nextFiles = new Set((next.profiles[profileName]?.files ?? []).map(entryKey));
  return (previous.profiles[profileName]?.files ?? []).filter(
    (entry) => !nextFiles.has(entryKey(entry)),
  ).length;
}

export async function generate(options: GenerateOptions = {}): Promise<GenerationResult> {
  const started = performance.now();
  const concurrency = resolveConcurrency(options.concurrency);
  const resolved = await resolveConfiguration(options);
  const manifestFile = path.join(resolved.baseDir, '.flag-resizer', 'manifest.json');
  const previousManifest = await readManifest(manifestFile);
  const plan = createGenerationPlan(resolved.profiles);
  const fullRun = !options.profiles || options.profiles.length === 0;
  const manifest = nextManifest(previousManifest, plan, resolved.profiles, fullRun);
  const stale = staleEntries(previousManifest, manifest);
  const statuses = new Map<string, FileStatus>();
  const dryRun = options.dryRun ?? false;

  if (dryRun) {
    await runBounded(plan.tasks, concurrency, async (task) => {
      statuses.set(task.target, (await pathExists(task.target)) ? 'updated' : 'created');
    });
  } else {
    const stagingDirectory = await mkdtemp(path.join(os.tmpdir(), 'flag-resizer-'));
    const stagedFiles = new Map<string, string>();

    try {
      await runBounded(plan.tasks, concurrency, async (task, index) => {
        const content = await task.createContent();
        const exists = await pathExists(task.target);
        if (exists && (await buffersEqual(task.target, content))) {
          statuses.set(task.target, 'unchanged');
          return;
        }

        statuses.set(task.target, exists ? 'updated' : 'created');
        const staged = path.join(stagingDirectory, String(index));
        await writeFile(staged, content);
        stagedFiles.set(task.target, staged);
      });

      for (const task of plan.tasks) {
        const staged = stagedFiles.get(task.target);
        if (staged) await writeStagedFile(task.target, staged);
      }

      for (const entry of stale) await pruneFile(entry);
      await writeAtomic(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    } catch (error) {
      throw new FlagResizerError('Flag generation failed before the manifest was committed.', {
        cause: error,
      });
    } finally {
      await rm(stagingDirectory, { recursive: true, force: true });
    }
  }

  const profiles: ProfileGenerationResult[] = resolved.profiles.map((profile) => {
    const entries = plan.filesByProfile.get(profile.name) ?? [];
    const counts = { created: 0, updated: 0, unchanged: 0 };
    for (const entry of entries) {
      const status = statuses.get(entryTarget(entry));
      if (status) counts[status] += 1;
    }

    return {
      name: profile.name,
      countries: profile.countries.length,
      images: plan.imageCountByProfile.get(profile.name) ?? 0,
      sizes: profile.sizes,
      formats: profile.formats,
      outputDirectories: Object.fromEntries(
        profile.formats.map((format) => [format, profile.output[format]?.dir]),
      ),
      ...counts,
      removed: removedOwnershipCount(previousManifest, manifest, profile.name),
      typeScriptFile: profile.output.ts,
    };
  });

  return {
    dryRun,
    durationMs: Math.round(performance.now() - started),
    ...(resolved.configFile ? { configFile: resolved.configFile } : {}),
    manifestFile,
    profiles,
  };
}
