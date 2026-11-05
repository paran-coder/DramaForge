import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(path.join(root, 'web/index.html'), 'utf8');

test('OG / Twitter tags reference a local 1200x630 image before deployment', () => {
  for (const marker of [
    'property="og:title"', 'property="og:description"',
    'property="og:image" content="/og-image.png"',
    'property="og:image:width" content="1200"',
    'property="og:image:height" content="630"',
    'name="twitter:card" content="summary_large_image"',
    'name="twitter:image" content="/og-image.png"',
  ]) assert.ok(source.includes(marker), `missing meta ${marker}`);
  const image = readFileSync(path.join(root, 'web/og-image.png'));
  assert.equal(image.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.ok(statSync(path.join(root, 'web/og-image.png')).size > 5000);
});

test('static HTML Vercel Analytics uses same-origin tracking script and no API key', () => {
  assert.match(source, /<script defer src="\/analytics-init\.js"><\/script>\s*<script defer src="\/_vercel\/insights\/script\.js"><\/script>/);
  assert.match(readFileSync(path.join(root, 'web/analytics-init.js'), 'utf8'), /window\.va/);
  assert.doesNotMatch(source, /@vercel\/analytics\/(?:next|react)/);
  const config = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const csp = config.headers.find(x=>x.source==='/(.*)').headers.find(item => item.key === 'Content-Security-Policy').value;
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /connect-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
});

test('build writes absolute OG/Twitter/canonical URLs from VERCEL_URL', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], {
    cwd:root, env:{...process.env, PUBLIC_SITE_URL:'', VERCEL_URL:'dramaforge-pr42.vercel.app'}, encoding:'utf8',
  });
  const html = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  assert.match(html, /property="og:image" content="https:\/\/dramaforge-pr42\.vercel\.app\/og-image\.png"/);
  assert.match(html, /name="twitter:image" content="https:\/\/dramaforge-pr42\.vercel\.app\/og-image\.png"/);
  assert.match(html, /property="og:url" content="https:\/\/dramaforge-pr42\.vercel\.app\/"/);
  assert.match(html, /rel="canonical" href="https:\/\/dramaforge-pr42\.vercel\.app\/"/);
  assert.equal(readFileSync(path.join(root, 'dist/og-image.png')).readUInt32BE(16), 1200);
  assert.ok(readFileSync(path.join(root, 'dist/main.mjs')).length > 0);
});

test('explicit PUBLIC_SITE_URL takes precedence over preview VERCEL_URL', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], {
    cwd:root, env:{...process.env, PUBLIC_SITE_URL:'https://dramaforge.example', VERCEL_URL:'random-preview.vercel.app'}, encoding:'utf8',
  });
  const html = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  assert.match(html, /property="og:image" content="https:\/\/dramaforge\.example\/og-image\.png"/);
  assert.doesNotMatch(html, /random-preview\.vercel\.app/);
});


test('production deploy uses public canonical domain instead of deployment-specific VERCEL_URL', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], {
    cwd: root,
    env: {
      ...process.env, PUBLIC_SITE_URL: '', VERCEL_ENV: 'production',
      VERCEL_URL: 'dramaforge-7zsr00dbr-private.vercel.app',
    },
    encoding: 'utf8',
  });
  const html = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  assert.match(html, /property="og:url" content="https:\/\/dramaforge-lemon-ten\.vercel\.app\/"/);
  assert.match(html, /rel="canonical" href="https:\/\/dramaforge-lemon-ten\.vercel\.app\/"/);
  assert.match(html, /property="og:image" content="https:\/\/dramaforge-lemon-ten\.vercel\.app\/og-image\.png"/);
  assert.match(html, /name="twitter:image" content="https:\/\/dramaforge-lemon-ten\.vercel\.app\/og-image\.png"/);
  assert.doesNotMatch(html, /private\.vercel\.app/);
});

test('preview deploy continues to use its own preview URL, not production domain', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], {
    cwd: root,
    env: {
      ...process.env, PUBLIC_SITE_URL: '', VERCEL_ENV: 'preview',
      VERCEL_URL: 'dramaforge-feature-123.vercel.app',
    },
    encoding: 'utf8',
  });
  const html = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  assert.match(html, /property="og:image" content="https:\/\/dramaforge-feature-123\.vercel\.app\/og-image\.png"/);
});
