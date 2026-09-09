import { constants } from 'node:fs';
import { lstat, open, readFile } from 'node:fs/promises';

export async function readRegular(path: string): Promise<string | undefined> {
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.nlink > 1) {
      throw new Error(
        `Expected an ordinary file without symlinks or hard links: ${path}`,
      );
    }
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export type Mutation = {
  path: string;
  before: string | undefined;
  after: string;
};

export async function applyEdits(
  edits: Mutation[],
  changed: string[],
): Promise<void> {
  // Check every input before starting; failures after this point report partial work.
  for (const edit of edits) {
    if ((await readRegular(edit.path)) !== edit.before) {
      throw new Error(`File changed during planning; retry: ${edit.path}`);
    }
  }
  for (const edit of edits) {
    const flags =
      edit.before === undefined
        ? constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL
        : constants.O_RDWR | constants.O_NOFOLLOW;
    const handle = await open(edit.path, flags, 0o666);
    try {
      if (edit.before !== undefined) {
        if (
          (await handle.stat()).nlink > 1 ||
          (await handle.readFile('utf8')) !== edit.before
        ) {
          throw new Error(`File changed during planning; retry: ${edit.path}`);
        }
      }
      // Record the path before writing so even a partial write is reported.
      changed.push(edit.path);
      const content = Buffer.from(edit.after);
      let offset = 0;
      while (offset < content.length) {
        const { bytesWritten } = await handle.write(
          content,
          offset,
          content.length - offset,
          offset,
        );
        if (!bytesWritten)
          throw new Error(`Could not finish writing ${edit.path}`);
        offset += bytesWritten;
      }
      await handle.truncate(content.length);
    } finally {
      await handle.close();
    }
  }
}
