/**
 * Static Vercel build. No user projects or local application state is read.
 * Vercel injects VERCEL_URL on deployments; PUBLIC_SITE_URL takes precedence
 * when a stable production/custom domain is provided later.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'web');
const output = path.join(root, 'dist');

function deploymentOrigin(env = process.env) {
  const raw = env.PUBLIC_SITE_URL?.trim() || env.VERCEL_URL?.trim();
  if (!raw) return null; // local build: keep same-origin OG path for preview
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw new Error('PUBLIC_SITE_URL / VERCEL_URL must be a public HTTPS origin');
  }
  return url.origin;
}

function decorateMetadata(html, origin) {
  if (!origin) return html;
  const imageUrl = `${origin}/og-image.png`;
  return html
    .replace('content="/og-image.png"', `content="${imageUrl}"`)
    .replace('name="twitter:image" content="/og-image.png"', `name="twitter:image" content="${imageUrl}"`)
    .replace('  <meta property="og:type"', `  <meta property="og:url" content="${origin}/">\n  <link rel="canonical" href="${origin}/">\n  <meta property="og:type"`);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true, force: true });
const htmlPath = path.join(output, 'index.html');
const original = await readFile(htmlPath, 'utf8');
await writeFile(htmlPath, decorateMetadata(original, deploymentOrigin()));
console.log('DramaForge static build complete. OG image:', deploymentOrigin() ?? '(local relative URL)');
export { deploymentOrigin, decorateMetadata };
