import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseTree } from 'jsonc-parser';
import { classify, reconcile, render } from './License.gen.js';
import { gitValue, type ProjectContext } from '../../project/context.js';
import { readRegular, type Mutation } from '../../project/files.js';

export type LicenseRequest = {
  cwd?: string;
  preset?: string;
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
export class Stopped extends Error {
  constructor(public status: 'conflict' | 'unsupported' | 'canceled', message: string) { super(message); }
}

export async function licenseFiles(directory: string): Promise<{ path: string; text: string }[]> {
  const names = (await readdir(directory)).filter(name => /^(licen[sc]e|copying)(\.(md|txt|markdown))?$/i.test(name)).sort();
  return Promise.all(names.map(async name => {
    const path = join(directory, name);
    const text = await readRegular(path);
    if (text === undefined) throw new Error(`License disappeared during inspection: ${path}`);
    return { path, text };
  }));
}

function authorName(value: unknown): string | undefined {
  const name = typeof value === 'string' ? value : value && typeof value === 'object' && 'name' in value ? value.name : undefined;
  if (typeof name !== 'string') return undefined;
  return name.replace(/\s*<[^>]*>\s*(\([^)]*\))?\s*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim() || undefined;
}

function validAuthor(author: string): boolean { return Boolean(author.trim()) && !/[\x00-\x1f\x7f]/.test(author); }
function validYear(year: string): boolean {
  if (!/^\d{4}(-\d{4})?$/.test(year)) return false;
  const [start, end = start] = year.split('-').map(Number);
  return start! > 0 && end! >= start!;
}

/** Resolves the inputs required to add a new MIT notice before a creator writes files. */
export async function resolveNewLicenseRequest(request: LicenseRequest, cwd: string): Promise<Pick<LicenseRequest, 'author' | 'year'>> {
  const author = request.author ?? await gitValue(cwd, ['config', 'user.name']);
  const year = request.year ?? String(new Date().getFullYear());
  if (author === undefined) throw new Stopped('conflict', 'Cannot infer a copyright holder. Supply --author <name>.');
  if (!validAuthor(author)) throw new Stopped('conflict', 'Supply a nonempty, single-line --author.');
  if (!validYear(year)) throw new Stopped('conflict', 'Supply --year as YYYY or YYYY-YYYY in ascending order.');
  return { author: author.trim(), year };
}

function updateLicenseMetadata(text: string): string {
  const root = parseTree(text)!;
  const existing = root.children?.find(property => property.children?.[0]?.value === 'license');
  const value = existing?.children?.[1];
  if (value) return `${text.slice(0, value.offset)}"MIT"${text.slice(value.offset + value.length)}`;
  const closeOffset = root.offset + root.length - 1;
  const properties = root.children ?? [];
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const indent = text.match(/\r?\n([ \t]+)"/)?.[1] ?? '  ';
  const closingIndent = text.slice(text.lastIndexOf(eol, closeOffset - 1) + eol.length, closeOffset);
  if (properties.length === 0) {
    return `${text.slice(0, root.offset + 1)}${eol}${indent}"license": "MIT"${eol}${closingIndent}${text.slice(closeOffset)}`;
  }
  const last = properties.at(-1)!;
  const lastEnd = last.offset + last.length;
  return `${text.slice(0, lastEnd)},${eol}${indent}"license": "MIT"${eol}${closingIndent}${text.slice(closeOffset)}`;
}

export async function planLicense(context: ProjectContext, request: LicenseRequest, interaction?: Interaction): Promise<Mutation[]> {
  if (request.preset !== undefined && request.preset !== 'mit') throw new Stopped('unsupported', 'Only --preset mit is supported.');
  const files = await licenseFiles(context.target);
  if (request.packageLicense && context.target !== context.packageRoot) {
    throw new Stopped('conflict', 'Select a package directory containing package.json with -C when using --package-license.');
  }
  if (context.workspaceRoot && context.packageRoot && context.target !== context.workspaceRoot) {
    const ancestors: string[] = [];
    for (let directory = dirname(context.target); ; directory = dirname(directory)) {
      ancestors.push(...(await licenseFiles(directory)).map(file => file.path));
      if (directory === context.workspaceRoot || directory === dirname(directory)) break;
    }
    if (ancestors.length && !request.packageLicense) {
      const message = `Ancestor license(s): ${ancestors.join(', ')}. Add a separate package license?`;
      if (context.target !== context.packageRoot) throw new Stopped('conflict', `${message} Select the package directory with -C and --package-license.`);
      const choice = await interaction?.confirm(message);
      if (choice === undefined && interaction) throw new Stopped('canceled', 'Canceled before writing.');
      if (!choice) throw new Stopped('conflict', `${message} Use --package-license for an explicit package-level choice.`);
    }
  }

  // A copyright line is usable evidence only when the full file is canonical MIT.
  const first = files[0]?.text;
  const notice = first?.match(/^Copyright \(c\) (\d{4}(?:-\d{4})?) (.+)\r?$/m);
  const existing = notice && classify([first!], render(notice[2]!.trim(), notice[1]!)) === 'Correct' ? notice : undefined;
  let author = request.author ?? existing?.[2]?.trim() ?? authorName(context.manifest?.data.author) ?? await gitValue(context.target, ['config', 'user.name']);
  const year = request.year ?? existing?.[1] ?? String(new Date().getFullYear());
  if (author === undefined && interaction) {
    author = await interaction.text('Copyright holder name');
    if (author === undefined) throw new Stopped('canceled', 'Canceled before writing.');
  }
  if (author === undefined) throw new Stopped('conflict', 'Cannot infer a copyright holder. Supply --author <name>.');
  if (!validAuthor(author)) throw new Stopped('conflict', 'Supply a nonempty, single-line --author.');
  if (!validYear(year)) throw new Stopped('conflict', 'Supply --year as YYYY or YYYY-YYYY in ascending order.');
  author = author.trim();
  const desired = render(author, year);
  const state = classify(files.map(file => file.text), desired);
  const metadata = context.manifest?.data.license;
  const metadataConflict = context.manifest !== undefined && metadata !== undefined && metadata !== 'MIT';
  let decision = reconcile(state, metadataConflict, Boolean(context.manifest && metadata === undefined), request.force ?? false);
  if (decision.TAG === 'RequireChoice') {
    const details = `${decision._0}${metadataConflict ? ' The package.json license field will also become MIT.' : ''}`;
    const choice = await interaction?.confirm(details);
    if (choice === undefined && interaction) throw new Stopped('canceled', 'Canceled before writing.');
    if (!choice) throw new Stopped('conflict', `${details} Use --force to approve replacement.`);
    decision = reconcile(state, metadataConflict, Boolean(context.manifest && metadata === undefined), true);
  }
  if (decision.TAG !== 'Ready') throw new Stopped('conflict', decision._0);
  const edits: Mutation[] = [];
  if (decision.writeLicense) {
    // Consistent alternate files are replaced together only with explicit approval.
    for (const file of files.length ? files : [{ path: join(context.target, 'LICENSE'), text: undefined }]) {
      edits.push({ path: file.path, before: file.text, after: desired });
    }
  }
  if (decision.writeMetadata && context.manifest) {
    const { text, path } = context.manifest;
    const after = updateLicenseMetadata(text);
    if (after !== text) edits.push({ path, before: text, after });
  }
  return edits;
}
