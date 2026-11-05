import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('connection dialog provides health check but hides legacy recovery installer',()=>{
 const html=read('web/index.html'),main=read('web/main.mjs');
 for(const id of ['bridgeHealthBtn','bridgeRepairBtn'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(main,/127\.0\.0\.1:7331\/health/);
 assert.match(main,/bridgeRepairBtn'\)\.hidden=true/);
 assert.match(main,/startNativeConnection/);
 assert.match(main,/PC 연결 앱 열기/);
});
test('native launcher is protocol registered and local-only; no shell command injection API',()=>{
 const launcher=read('installer/ConnectorLauncher.cs');
 assert.match(launcher,/dramaforge:\/\/connect/);assert.match(launcher,/ParseActivation/);
 assert.match(launcher,/WindowsIdentity/);assert.match(launcher,/UserProfile|LocalApplicationData/);
 assert.match(launcher,/trusted-origins\.txt/);assert.match(launcher,/activations/);
 assert.match(launcher,/DRAMAFORGE_ACTIVATION_DIR/);
 assert.doesNotMatch(read('bridge/server.mjs'),/spawn\(.*shell.*true/);
});
