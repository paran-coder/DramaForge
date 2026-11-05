import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('current healthy installation exits before checking the port or staging files', () => {
  const source = read('installer/NodeCanvasPort.cs');
  const install = source.split('async Task Install()')[1];
  assert.match(install, /if\(AlreadyInstalled\(existing\)\)return;[\s\S]*InstalledApp\.PortInUse\(\)[\s\S]*Program\.Extract/);
  assert.match(source, /existing\.Version==InstalledApp\.TargetVersion&&InstalledApp\.Valid\(existing\.Root,allowSameVersionBuild:true\)/);
});

test('connection dialog separates completion badges from the interactive actions', () => {
  const html = read('web/index.html');
  assert.match(html, /<span id="pcConnected"[^>]*hidden>PC 연결 완료<\/span>/);
  assert.match(html, /<span id="chatgptConnected"[^>]*hidden>ChatGPT 로그인 완료<\/span>/);
});

test('the workspace title opens a dialog that saves the same project record', () => {
  assert.match(read('web/index.html'), /id="renameProjectBtn"/);
  assert.match(read('web/main.mjs'), /renameProjectForm'\)\.onsubmit[\s\S]*persist\(\{\.\.\.current,title,updatedAt\}\)/);
});
