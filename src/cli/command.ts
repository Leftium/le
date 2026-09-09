import { Command } from 'commander';
import * as prompts from '@clack/prompts';
import { runAdd } from '../orchestration/add.js';
import { runCreate } from '../orchestration/create.js';
import type { Interaction, LicenseRequest } from '../addons/license/index.js';
import { version } from '../version.js';

function terminalInteraction(): Interaction {
  return {
    async text(message) {
      const answer = await prompts.text({ message, validate: value => value?.trim() ? undefined : 'Enter a value.' });
      return typeof answer === 'string' ? answer : undefined;
    },
    async confirm(message) {
      const answer = await prompts.confirm({ message, initialValue: false });
      return typeof answer === 'boolean' ? answer : undefined;
    },
  };
}

function interactive(options: { nonInteractive?: boolean }): boolean {
  return !options.nonInteractive && Boolean(process.stdin.isTTY && process.stdout.isTTY) && !process.env.CI;
}

export function createCommand(): Command {
  const program = new Command('leftium')
    .description('Apply project conventions to existing directories.')
    .version(version)
    .addHelpText('before', `leftium ${version}\n\n`)
    .action(() => program.outputHelp());
  program.command('add')
    .argument('[addon]', 'add-on to apply (license or gitattributes; choose interactively when omitted)')
    .option('-C, --cwd <dir>', 'target directory')
    .option('--preset <name>', 'add-on preset (repeatable)', (value, previous: string[] | undefined) => [...(previous ?? []), value])
    .option('--author <name>', 'copyright holder')
    .option('--year <year>', 'copyright year or range')
    .option('--force', 'replace conflicting license content and package license metadata')
    .option('--package-license', 'explicitly add a separate license at the selected workspace package')
    .option('--non-interactive', 'never prompt; fail when a required choice is missing')
    .option('--no-install', 'skip dependency installation (license needs no installation)')
    .action(async (addon: string | undefined, options: LicenseRequest & { nonInteractive?: boolean }) => {
      const tty = interactive(options);
      if (!addon) {
        if (!tty) { process.stderr.write('failed: Supply an add-on (license or gitattributes); selection requires an interactive terminal.\n'); process.exitCode = 1; return; }
        const choice = await prompts.select({ message: 'What would you like to add?', options: [{ value: 'license', label: 'License' }, { value: 'gitattributes', label: 'Git attributes' }] });
        if (prompts.isCancel(choice)) { process.stderr.write('canceled: Canceled before writing.\n'); process.exitCode = 1; return; }
        addon = choice as 'license' | 'gitattributes';
      }
      if (tty && addon === 'license' && options.preset === undefined) {
        const choice = await prompts.select({ message: 'Select a license', initialValue: 'mit', options: [{ value: 'mit', label: 'MIT' }, { value: 'apache-2.0', label: 'Apache 2.0' }, { value: 'bsd-3-clause', label: 'BSD 3-Clause' }, { value: 'isc', label: 'ISC' }] });
        if (prompts.isCancel(choice)) { process.stderr.write('canceled: Canceled before writing.\n'); process.exitCode = 1; return; }
        options.preset = choice as string;
      }
      if (tty && addon === 'gitattributes' && options.preset === undefined) {
        const choice = await prompts.multiselect({ message: 'Select git attribute presets', required: true, initialValues: ['nodiff'], options: [{ value: 'nodiff', label: 'nodiff' }, { value: 'eol', label: 'eol' }] });
        if (prompts.isCancel(choice)) { process.stderr.write('canceled: Canceled before writing.\n'); process.exitCode = 1; return; }
        options.preset = choice as string[];
      }
      if (!addon) throw new Error('Add-on selection did not resolve.');
      const result = await runAdd({ ...options, addon }, tty ? terminalInteraction() : undefined);
      const success = result.status === 'applied' || result.status === 'no-op';
      const output = success ? process.stdout : process.stderr;
      output.write(`${result.status}: ${result.message}\n`);
      for (const path of result.changed) output.write(`  ${path}\n`);
      process.exitCode = success ? 0 : 1;
    });
  program.command('create')
    .argument('<directory>', 'new, empty project directory')
    .option('--template <template>', 'creator template', 'sv:minimal')
    .option('--types <types>', 'language mode', 'typescript')
    .option('--add <addon>', 'creation add-on (prettier or license)', (value, previous: string[] = []) => [...previous, value], [])
    .option('--author <name>', 'copyright holder for --add license')
    .option('--year <year>', 'copyright year or range for --add license')
    .option('--install <package-manager>', 'install dependencies with npm or pnpm')
    .option('--no-install', 'write dependencies without installing them')
    .action(async (directory: string, options) => {
      try {
        if (options.template !== 'sv:minimal') throw new Error('The Svelte spike currently supports only --template sv:minimal.');
        const install = options.install !== false;
        const packageManager = typeof options.install === 'string' ? options.install : 'pnpm';
        const result = await runCreate({ cwd: directory, template: 'minimal', types: options.types, addons: options.add, author: options.author, year: options.year, packageManager, install });
        process.stdout.write(`created: ${result.cwd}${result.installed ? '' : ' (dependencies not installed)'}\n`);
        if (result.warning) process.stderr.write(`warning: ${result.warning}\n`);
      } catch (error: unknown) {
        process.stderr.write(`failed: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
      }
    });
  return program;
}
