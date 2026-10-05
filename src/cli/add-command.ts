import { Command } from 'commander';
import { isBuiltinAddon } from '../orchestration/add.js';

// Commander must not parse upstream flags, including flags also owned by le.
// Built-ins retain the ordinary strict Commander parser.
export class AddCommand extends Command {
  upstreamArgs?: string[];

  override parseOptions(argv: string[]): {
    operands: string[];
    unknown: string[];
  } {
    let addonIndex = -1;
    for (let index = 0; index < argv.length; index++) {
      const arg = argv[index]!;
      if (arg === '--') {
        addonIndex = index + 1 < argv.length ? index + 1 : -1;
        break;
      }
      if (!arg.startsWith('-')) {
        addonIndex = index;
        break;
      }
      const option = this.options.find((option) =>
        [option.short, option.long].includes(arg.split('=')[0]!),
      );
      if ((option?.required || arg === '--install') && !arg.includes('='))
        index++;
    }
    const addon = argv[addonIndex];
    if (!addon || isBuiltinAddon(addon)) return super.parseOptions(argv);
    const forwarded: string[] = [];
    let literal = false;
    for (let index = 0; index < argv.length; index++) {
      const arg = argv[index]!;
      if (index === addonIndex) continue;
      if (arg === '--') {
        literal = true;
        forwarded.push(arg);
      } else if (!literal && (arg === '-C' || arg === '--cwd')) {
        const cwd = argv[++index];
        if (!cwd) this.error(`error: option '${arg}' argument missing`);
        this.setOptionValue('cwd', cwd);
      } else if (
        !literal &&
        (arg.startsWith('--cwd=') || (arg.startsWith('-C') && arg.length > 2))
      ) {
        this.setOptionValue(
          'cwd',
          arg.startsWith('--cwd=') ? arg.slice(6) : arg.slice(2),
        );
      } else if (!literal && arg === '--non-interactive') {
        this.error(
          'error: --non-interactive is for Leftium add-ons. Supply explicit sv add-on options and upstream --no-install / --no-download-check flags to avoid upstream prompts.',
        );
      } else forwarded.push(arg);
    }
    this.upstreamArgs = forwarded;
    return { operands: [addon], unknown: [] };
  }
}
