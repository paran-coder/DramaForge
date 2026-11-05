import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html=readFileSync(path.join(root,'web/index.html'),'utf8');
const css=readFileSync(path.join(root,'web/theme.css'),'utf8');

const hex=key=>{
 const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const found=css.match(new RegExp(`${escaped}:\\s*(#[a-f0-9]{6})\\s*;`,'i'));
 assert.ok(found,`required token missing: ${key}`);
 return found[1];
};
const luminance=h=>{
 const c=h.slice(1).match(/.{2}/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return .2126*c[0]+.7152*c[1]+.0722*c[2];
};
const contrast=(a,b)=>{
 const [u,v]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (u+.05)/(v+.05);
};

test('theme is layered after the unchanged base stylesheet',()=>{
 assert.match(html,/<link rel="stylesheet" href="\/styles\.css">\s*<link rel="stylesheet" href="\/theme\.css">/);
 assert.match(html,/PROJECT WORKSPACE \/ v1\.9\.5/);
});
test('brand tokens match supplied palette and CTA contrast is AA',()=>{
 assert.equal(hex('--color-primary'),'#fcd535');
 assert.equal(hex('--color-canvas'),'#0b0e11');
 assert.equal(hex('--color-surface'),'#1e2329');
 assert.ok(contrast(hex('--color-on-primary'),hex('--color-primary'))>=4.5);
 assert.ok(contrast(hex('--color-text'),hex('--color-surface'))>=4.5);
 assert.ok(contrast(hex('--color-muted'),hex('--color-surface'))>=4.5);
 assert.ok(contrast(hex('--color-muted-soft'),hex('--color-canvas'))>=4.5);
});
test('page, panel, editor, body, metadata use a bounded typographic hierarchy',()=>{
 for (const size of ['26px','18px','16px','14px','13px','12px']) assert.ok(css.includes(size));
 assert.match(css,/\.big-editor,\s*\.writer-script-editor,\s*\.episode-script\s*\{[^}]*font-size:\s*15px/s);
 assert.match(css,/\.field-label[^}]*font-size:\s*var\(--font-size-body-sm\)/s);
 assert.match(css,/\.panel h2[^}]*font-size:\s*var\(--font-size-title-panel\)/s);
});
test('focus-visible, mobile layout and reduced motion are handled',()=>{
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media \(max-width: 560px\)/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
});
