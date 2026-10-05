import { discover } from '../project/context.js';
import { applyEdits, readRegular } from '../project/files.js';
import {
  planLicense,
  type Interaction,
  type LicenseRequest,
} from '../addons/license/index.js';
import {
  applyGitConfig,
  planGitattributes,
  removeGitConfig,
  verifyGitConfig,
  type GitattributesRequest,
} from '../addons/gitattributes/index.js';
import { Stopped } from './stopped.js';
import { delegateSvAdd, sveltePackage } from '../providers/sv.js';

export function isBuiltinAddon(addon: string): boolean {
  return addon === 'license' || addon === 'gitattributes';
}

export type AddRequest = (LicenseRequest | GitattributesRequest) & {
  addon: string;
  // Upstream flags and extra add-ons; target selection belongs in cwd.
  upstreamArgs?: readonly string[];
};
export type AddResult = {
  status:
    'applied' | 'no-op' | 'unsupported' | 'conflict' | 'canceled' | 'failed';
  verification: 'passed' | 'failed' | 'skipped';
  changed: string[];
  effects: AddEffect[];
  message: string;
  delegated?: { exitCode: number; signal?: NodeJS.Signals };
};
// TODO: Keep effects generic enough for composed add-ons. A future nodiff
// add-on may report separate gitattributes and gitconfig child effects without
// representing .git/config as a tracked file.
export type AddEffect =
  | { kind: 'file'; path: string }
  | { kind: 'git-config'; scope: 'local'; key: string };

export async function runAdd(
  request: AddRequest,
  interaction?: Interaction,
): Promise<AddResult> {
  const changed: string[] = [];
  const effects: AddEffect[] = [];
  let verification: AddResult['verification'] = 'skipped';
  let installedGitConfig:
    Awaited<ReturnType<typeof planGitattributes>>['gitConfig'] | undefined;
  try {
    const context = await discover(request.cwd ?? process.cwd());
    if (!isBuiltinAddon(request.addon)) {
      const addon = request.addon.startsWith('sv:')
        ? request.addon.slice(3)
        : request.addon;
      if (!addon || addon.startsWith('-'))
        throw new Stopped(
          'unsupported',
          'Supply an upstream add-on name after sv:.',
        );
      const packageRoot = await sveltePackage(context);
      const delegated = await delegateSvAdd(context, packageRoot, [
        addon,
        ...(request.upstreamArgs ?? []),
      ]);
      return {
        status:
          delegated.exitCode === 0 && !delegated.signal ? 'applied' : 'failed',
        verification: 'skipped',
        changed,
        effects,
        delegated,
        message: delegated.signal
          ? `sv terminated with ${delegated.signal}.`
          : `sv exited with status ${delegated.exitCode}.`,
      };
    }
    let edits;
    if (request.addon === 'license')
      edits = await planLicense(context, request, interaction);
    else if (request.addon === 'gitattributes') {
      const plan = await planGitattributes(context, request);
      edits = plan.edits;
      if (plan.gitConfig && (await applyGitConfig(plan.gitConfig))) {
        installedGitConfig = plan.gitConfig;
        effects.push({
          kind: 'git-config',
          scope: 'local',
          key: plan.gitConfig.key,
        });
      }
    } else
      throw new Stopped(
        'unsupported',
        `Add-on '${request.addon}' is not implemented in this slice. Supported: license, gitattributes.`,
      );
    try {
      await applyEdits(edits, changed);
    } catch (error) {
      if (installedGitConfig) {
        await removeGitConfig(installedGitConfig);
        effects.splice(
          effects.findIndex((effect) => effect.kind === 'git-config'),
          1,
        );
        installedGitConfig = undefined;
      }
      throw error;
    }
    effects.unshift(
      ...changed.map((path) => ({ kind: 'file' as const, path })),
    );
    for (const edit of edits) {
      if ((await readRegular(edit.path)) !== edit.after) {
        verification = 'failed';
        throw new Error(`Verification failed: ${edit.path}`);
      }
    }
    if (request.addon === 'gitattributes') {
      const plan = await planGitattributes(context, request);
      if (plan.gitConfig) await verifyGitConfig(plan.gitConfig);
    }
    verification = 'passed';
    return {
      status: effects.length ? 'applied' : 'no-op',
      verification,
      changed,
      effects,
      message: effects.length
        ? `${request.addon} applied and verified.`
        : `${request.addon} already current.`,
    };
  } catch (error) {
    return {
      status: error instanceof Stopped ? error.status : 'failed',
      verification,
      changed,
      effects,
      message: `${error instanceof Error ? error.message : String(error)}${changed.length || effects.length ? ' Partial output remains; review the reported effects before retrying.' : ''}`,
    };
  }
}
