import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseTree } from 'jsonc-parser';
import { gitValue, type ProjectContext } from '../../project/context.js';
import { readRegular, type Mutation } from '../../project/files.js';
import { Stopped } from '../../orchestration/stopped.js';

export type LicensePreset = 'mit' | 'apache-2.0' | 'bsd-3-clause' | 'isc';
export type LicenseRequest = {
  cwd?: string;
  preset?: string | string[];
  author?: string;
  year?: string;
  force?: boolean;
  packageLicense?: boolean;
  install?: boolean;
};
export type Interaction = {
  text(message: string): Promise<string | undefined>;
  confirm(message: string): Promise<boolean | undefined>;
};
type Definition = { id: LicensePreset; spdx: string; copyright: boolean };

export const builtinLicenses: Record<LicensePreset, Definition> = {
  mit: { id: 'mit', spdx: 'MIT', copyright: true },
  'apache-2.0': { id: 'apache-2.0', spdx: 'Apache-2.0', copyright: false },
  'bsd-3-clause': { id: 'bsd-3-clause', spdx: 'BSD-3-Clause', copyright: true },
  isc: { id: 'isc', spdx: 'ISC', copyright: true },
};

function template(id: LicensePreset): string {
  return readFileSync(
    new URL(`./templates/${id}.txt`, import.meta.url),
    'utf8',
  );
}
function render(
  id: LicensePreset,
  input?: { author: string; year: string },
): string {
  const text = template(id);
  return input
    ? text
        .replaceAll('{{author}}', input.author)
        .replaceAll('{{year}}', input.year)
    : text;
}
export function renderLicense(
  id: LicensePreset = 'mit',
  input?: { author: string; year: string },
): string {
  return render(id, input);
}
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
function recognize(text: string): LicensePreset | undefined {
  if (/Apache License\s*Version 2\.0/i.test(text)) return 'apache-2.0';
  if (/BSD 3-Clause License/i.test(text)) return 'bsd-3-clause';
  if (/ISC License/i.test(text)) return 'isc';
  if (/MIT License|Permission is hereby granted, free of charge/i.test(text))
    return 'mit';
  return undefined;
}
function selected(request: LicenseRequest): Definition {
  const values =
    request.preset === undefined
      ? []
      : Array.isArray(request.preset)
        ? request.preset
        : [request.preset];
  if (values.length > 1 || (values[0] && !(values[0] in builtinLicenses)))
    throw new Stopped(
      'unsupported',
      `Unknown license preset '${values[0]}'. Available: ${Object.keys(builtinLicenses).join(', ')}.`,
    );
  return builtinLicenses[(values[0] ?? 'mit') as LicensePreset];
}
function authorName(value: unknown): string | undefined {
  const name =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object' && 'name' in value
        ? (value as { name?: unknown }).name
        : undefined;
  return typeof name === 'string'
    ? name
        .replace(/\s*<[^>]*>\s*(\([^)]*\))?\s*$/, '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .trim() || undefined
    : undefined;
}
function validAuthor(value: string): boolean {
  return Boolean(value.trim()) && !/[\x00-\x1f\x7f]/.test(value);
}
function validYear(value: string): boolean {
  if (!/^\d{4}(-\d{4})?$/.test(value)) return false;
  const [start, end = start] = value.split('-').map(Number);
  return start! > 0 && end! >= start!;
}

export async function resolveNewLicenseRequest(
  request: LicenseRequest,
  cwd: string,
): Promise<Pick<LicenseRequest, 'author' | 'year'>> {
  const author =
    request.author ?? (await gitValue(cwd, ['config', 'user.name']));
  const year = request.year ?? String(new Date().getFullYear());
  if (author === undefined)
    throw new Stopped(
      'conflict',
      'Cannot infer a copyright holder. Supply --author <name>.',
    );
  if (!validAuthor(author))
    throw new Stopped('conflict', 'Supply a nonempty, single-line --author.');
  if (!validYear(year))
    throw new Stopped(
      'conflict',
      'Supply --year as YYYY or YYYY-YYYY in ascending order.',
    );
  return { author: author.trim(), year };
}
export async function licenseFiles(
  directory: string,
): Promise<{ path: string; text: string }[]> {
  const names = (await readdir(directory))
    .filter((name) =>
      /^(licen[sc]e|copying)(\.(md|txt|markdown))?$/i.test(name),
    )
    .sort();
  return Promise.all(
    names.map(async (name) => {
      const path = join(directory, name);
      const text = await readRegular(path);
      if (text === undefined)
        throw new Error(`License disappeared during inspection: ${path}`);
      return { path, text };
    }),
  );
}
function updateMetadata(text: string, spdx: string): string {
  const root = parseTree(text)!;
  const prop = root.children?.find(
    (item) => item.children?.[0]?.value === 'license',
  );
  const value = prop?.children?.[1];
  if (value)
    return `${text.slice(0, value.offset)}"${spdx}"${text.slice(value.offset + value.length)}`;
  const close = root.offset + root.length - 1,
    eol = text.includes('\r\n') ? '\r\n' : '\n',
    indent = text.match(/\r?\n([ \t]+)"/)?.[1] ?? '  ',
    properties = root.children ?? [];
  if (!properties.length)
    return `${text.slice(0, root.offset + 1)}${eol}${indent}"license": "${spdx}"${eol}${text.slice(close)}`;
  const last = properties.at(-1)!,
    end = last.offset + last.length;
  return `${text.slice(0, end)},${eol}${indent}"license": "${spdx}"${eol}${text.slice(close)}`;
}

export async function planLicense(
  context: ProjectContext,
  request: LicenseRequest,
  interaction?: Interaction,
): Promise<Mutation[]> {
  const definition = selected(request),
    files = await licenseFiles(context.target);
  if (request.packageLicense && context.target !== context.packageRoot)
    throw new Stopped(
      'conflict',
      'Select a package directory containing package.json with -C when using --package-license.',
    );
  if (
    context.workspaceRoot &&
    context.packageRoot &&
    context.target !== context.workspaceRoot &&
    !request.packageLicense
  ) {
    const ancestors: string[] = [];
    for (
      let directory = dirname(context.target);
      ;
      directory = dirname(directory)
    ) {
      ancestors.push(
        ...(await licenseFiles(directory)).map((file) => file.path),
      );
      if (
        directory === context.workspaceRoot ||
        directory === dirname(directory)
      )
        break;
    }
    if (ancestors.length) {
      const message = `Ancestor license(s): ${ancestors.join(', ')}. Add a separate package license?`;
      if (context.target !== context.packageRoot)
        throw new Stopped(
          'conflict',
          `${message} Select the package directory with -C and --package-license.`,
        );
      const choice = await interaction?.confirm(message);
      if (choice === undefined && interaction)
        throw new Stopped('canceled', 'Canceled before writing.');
      if (!choice)
        throw new Stopped(
          'conflict',
          `${message} Use --package-license for an explicit package-level choice.`,
        );
    }
  }
  let input: { author: string; year: string } | undefined;
  if (definition.copyright) {
    const notice = files[0]?.text.match(
      /^Copyright \(c\) (\d{4}(?:-\d{4})?)[, ]+(.+)\r?$/m,
    );
    const existing =
      notice && recognize(files[0]!.text) === definition.id
        ? notice
        : undefined;
    let author =
      request.author ??
      existing?.[2]?.trim() ??
      authorName(context.manifest?.data.author) ??
      (await gitValue(context.target, ['config', 'user.name']));
    const year =
      request.year ?? existing?.[1] ?? String(new Date().getFullYear());
    if (author === undefined && interaction)
      author = await interaction.text('Copyright holder name');
    if (author === undefined)
      throw new Stopped(
        interaction ? 'canceled' : 'conflict',
        interaction
          ? 'Canceled before writing.'
          : 'Cannot infer a copyright holder. Supply --author <name>.',
      );
    if (!validAuthor(author))
      throw new Stopped('conflict', 'Supply a nonempty, single-line --author.');
    if (!validYear(year))
      throw new Stopped(
        'conflict',
        'Supply --year as YYYY or YYYY-YYYY in ascending order.',
      );
    input = { author: author.trim(), year };
  }
  const desired = render(definition.id, input);
  const equal =
    files.length > 0 &&
    files.every((file) => normalize(file.text) === normalize(files[0]!.text));
  if (files.length > 1 && !equal)
    throw new Stopped(
      'conflict',
      'Multiple inconsistent license files; resolve them before retrying.',
    );
  const correct = equal && normalize(files[0]!.text) === normalize(desired);
  const metadata = context.manifest?.data.license,
    metadataConflict = metadata !== undefined && metadata !== definition.spdx;
  if (((files.length && !correct) || metadataConflict) && !request.force) {
    const answer = await interaction?.confirm(
      `Existing license or package.json metadata differs. Replace it with ${definition.spdx}?`,
    );
    if (answer === undefined)
      throw new Stopped(
        interaction ? 'canceled' : 'conflict',
        interaction
          ? 'Canceled before writing.'
          : 'Use --force to approve replacement.',
      );
    if (!answer)
      throw new Stopped('conflict', 'Use --force to approve replacement.');
  }
  const edits: Mutation[] = [];
  if (!correct)
    for (const file of files.length
      ? files
      : [{ path: join(context.target, 'LICENSE'), text: undefined }])
      edits.push({ path: file.path, before: file.text, after: desired });
  if (context.manifest && (metadata === undefined || metadataConflict)) {
    const after = updateMetadata(context.manifest.text, definition.spdx);
    if (after !== context.manifest.text)
      edits.push({
        path: context.manifest.path,
        before: context.manifest.text,
        after,
      });
  }
  return edits;
}
