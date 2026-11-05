import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('browser entrypoint has all referenced DOM elements and local module entrypoints',()=>{
 const html=readFileSync(path.join(root,'web/index.html'),'utf8'),script=readFileSync(path.join(root,'web/main.mjs'),'utf8');
 const ids=[...script.matchAll(/\$\(['"]([\w-]+)['"]\)/g)].map(m=>m[1]);
 const available=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 for(const id of ids)assert.ok(available.has(id),`missing HTML id: ${id}`);
 for(const f of ['main.mjs','guards.mjs','core.mjs','canon.mjs','bridge-client.mjs','storage.mjs'])assert.ok(readFileSync(path.join(root,'web',f)).length>0);
 assert.equal((html.match(/<section\b/g)||[]).length,(html.match(/<\/section>/g)||[]).length);
});
