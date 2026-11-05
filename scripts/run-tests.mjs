// Portable test entrypoint: Windows cmd does not expand `tests/*.test.mjs`.
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tests = (await readdir(join(root, 'tests')))
  .filter(file => file.endsWith('.test.mjs'))
  .sort()
  .map(file => join(root, 'tests', file));
if (!tests.length) throw new Error('No DramaForge tests found');
const result = spawnSync(process.execPath, ['--test', ...tests], {cwd: root, stdio: 'inherit'});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
