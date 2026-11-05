import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { removeLegacyInstaller } from '../scripts/prepare-windows-installer-build.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('legacy cleanup deletes only obsolete NodeCanvas installer and is idempotent', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'dramaforge-clean-'));
  try {
    const downloads = path.join(dir, 'web', 'downloads');
    await mkdir(downloads, { recursive: true });
    await writeFile(path.join(downloads, 'NodeCanvas-Setup-v1.13.0.exe'), 'obsolete');
    await writeFile(path.join(downloads, 'DramaForge-Connector-v1.7.0.zip'), 'keep');
    assert.equal(await removeLegacyInstaller(dir), true);
    await assert.rejects(access(path.join(downloads, 'NodeCanvas-Setup-v1.13.0.exe')));
    assert.equal(await removeLegacyInstaller(dir), false);
    assert.equal(await readFile(path.join(downloads, 'DramaForge-Connector-v1.7.0.zip'), 'utf8'), 'keep');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Windows workflow cleans old installer before tests and removes it in publish commit', async () => {
  const yaml = await readFile(path.join(root, '.github/workflows/windows-installer.yml'), 'utf8');
  assert.ok(yaml.indexOf('node scripts/prepare-windows-installer-build.mjs') < yaml.indexOf('run: npm test'));
  assert.match(yaml, /git rm -f --ignore-unmatch -- web\/downloads\/NodeCanvas-Setup-v1\.13\.0\.exe/);
});

test('Vercel build excludes old NodeCanvas EXE from published static output', async () => {
  const source = await readFile(path.join(root, 'scripts/build.mjs'), 'utf8');
  assert.match(source, /await rm\(path\.join\(output, 'downloads', 'NodeCanvas-Setup-v1\.13\.0\.exe'\), \{ force: true \}\)/);
});
