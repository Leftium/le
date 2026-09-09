import { discover } from '../project/context.js';
import { applyEdits, readRegular } from '../project/files.js';
import { planLicense, Stopped, type Interaction, type LicenseRequest } from '../addons/license/index.js';

export type AddRequest = LicenseRequest & { addon: string };
export type AddResult = {
  status: 'applied' | 'no-op' | 'unsupported' | 'conflict' | 'canceled' | 'failed';
  verification: 'passed' | 'failed' | 'skipped';
  changed: string[];
  message: string;
};

export async function runAdd(request: AddRequest, interaction?: Interaction): Promise<AddResult> {
  const changed: string[] = [];
  let verification: AddResult['verification'] = 'skipped';
  try {
    if (request.addon !== 'license') throw new Stopped('unsupported', `Add-on '${request.addon}' is not implemented in this slice. Supported: license.`);
    const context = await discover(request.cwd ?? process.cwd());
    const edits = await planLicense(context, request, interaction);
    await applyEdits(edits, changed);
    for (const edit of edits) {
      if (await readRegular(edit.path) !== edit.after) {
        verification = 'failed';
        throw new Error(`Verification failed: ${edit.path}`);
      }
    }
    verification = 'passed';
    return { status: changed.length ? 'applied' : 'no-op', verification, changed,
      message: changed.length ? 'MIT license applied and verified.' : 'MIT license already current.' };
  } catch (error) {
    return { status: error instanceof Stopped ? error.status : 'failed', verification, changed,
      message: `${error instanceof Error ? error.message : String(error)}${changed.length ? ' Partial output remains; review the affected files before retrying.' : ''}` };
  }
}
