import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
test('Windows installation is compiled by Windows runner and published to Vercel static assets', () => {
  const workflow = read('.github/workflows/windows-installer.yml');
  assert.match(workflow, /runs-on: windows-latest/);
  assert.match(workflow, /build-windows\.ps1/);
  assert.match(workflow, /--extract-only/);
  assert.match(workflow, /actions\/upload-artifact/);
  assert.match(workflow, /actions\/download-artifact/);
  assert.match(workflow, /web\/downloads\/DramaForge-Setup-Windows\.exe/);
  assert.match(workflow, /git push origin HEAD:main/);
  assert.match(workflow, /permissions:\s*\n\s+contents: write/);
  assert.match(workflow, /on:\s*\n\s+push:/);
});
test('Native installation uses dedicated protocol, per-user registration and original verified runtime strategy', () => {
  const source = read('installer/NodeCanvasPort.cs');
  assert.match(source, /Register\(string launcher\)/);
  assert.match(source, /Software\\Classes\\dramaforge/);
  assert.match(source, /https:\/\/dramaforge-lemon-ten\.vercel\.app/);
  assert.match(source, /7331/);
  assert.match(source, /RuntimeHashes/);
  assert.match(source, /GetManifestResourceStream\("payload\.zip"\)/);
  assert.match(source, /TargetVersion=new Version\(1,9,2\)/);
});
test('Vercel build will not pretend installer exists when Windows job has not published it', () => {
  const script = read('scripts/build.mjs');
  assert.match(script,/ENOENT/);
  assert.match(script,/return false/);
  assert.match(script,/Invalid DramaForge Windows installer PE/);
  assert.match(script,/Buffer\.from\('DramaForge', 'utf16le'\)/);
  const ui = read('web/main.mjs');
  assert.match(ui,/checkInstallerAvailability/);
  assert.match(ui,/button\.disabled=/);
});
