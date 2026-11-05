/**
 * One-time cleanup for older GitHub Desktop checkouts. The NodeCanvas image-only
 * installer must never ship as the DramaForge text-capable connector.
 * Removes only one exact known legacy file, leaving all other assets intact.
 */
import { lstat, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function removeLegacyInstaller(root = sourceRoot) {
  const file = path.join(root, 'web', 'downloads', 'NodeCanvas-Setup-v1.13.0.exe');
  try {
    const entry = await lstat(file);
    if (!entry.isFile()) throw new Error(`Legacy installer path is not a regular file: ${file}`);
    await rm(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const removed = await removeLegacyInstaller();
  console.log(removed ? 'Removed obsolete image-only installer from build worktree.' : 'No legacy NodeCanvas installer found.');
}
