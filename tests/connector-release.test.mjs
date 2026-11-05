import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read=(f)=>readFileSync(path.join(root,f),'utf8');
test('connection popup speaks only about DramaForge and does not activate login without approval',()=>{
 const html=read('web/index.html'),main=read('web/main.mjs');
 const dialog=html.split('<dialog id="connectDialog"')[1]?.split('</dialog>')[0];
 assert.ok(dialog,'connection dialog exists');
 assert.doesNotMatch(dialog,/NodeCanvas|nodecanvas:|7330|GitHub Actions|v1\.13\.0/);
 assert.match(dialog,/id="loginBtn"[^>]*disabled/);
 assert.match(main,/\$\('loginBtn'\)\.disabled=true/);
 assert.match(main,/\$\('loginBtn'\)\.disabled=false/);
 assert.match(main,/checkInstallerAvailability\(/);
});
test('wrong original image-only installer is not distributed in DramaForge public assets',()=>{
 assert.equal(existsSync(path.join(root,'web/downloads/NodeCanvas-Setup-v1.13.0.exe')),false);
 assert.equal(existsSync(path.join(root,'vendor/nodecanvas-v1.13.0/web/2026-10-31-NodeCanvas-Setup-v1.13.0.exe')),true);
 assert.match(read('web/main.mjs'),/WINDOWS_SETUP='\/downloads\/DramaForge-Setup-Windows\.exe'/);
});
test('native installer can safely repair its own current release and will not downgrade newer versions',()=>{
 const installer=read('installer/NodeCanvasPort.cs');
 assert.match(installer,/TargetVersion=new Version\(1,9,2\)/);
 assert.match(installer,/var targetVersion=new Version\(1,9,2\)/);
 assert.match(installer,/!InstalledApp\.CanRepair\(new Version\(1,9,2\)\)/);
 assert.match(installer,/InstalledApp\.CanRepair\(new Version\(1,9,3\)\)/);
});
