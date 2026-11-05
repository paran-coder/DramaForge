/**
 * Static Vercel build. No user projects or local application state is read.
 * Vercel injects VERCEL_URL on deployments; PUBLIC_SITE_URL takes precedence
 * when a custom domain is supplied. The approved stable production
 * hostname is used for production even when VERCEL_URL is an immutable build URL.
 */
import { cp, mkdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'web');
const output = path.join(root, 'dist');

const STABLE_PRODUCTION_ORIGIN = 'https://dramaforge-lemon-ten.vercel.app';

// Use the user's proven NodeCanvas v1.13.0 installer EXACTLY as supplied.
// Check the binary fingerprint; there is no Windows compilation on Vercel.
const NODECANVAS_SHA256 = '2ffa9dfa6232d6435c992dd741c27018316c6a01beb553ecde9c530351a74178';
async function verifyNativeInstaller() {
  const installer=path.join(source,'downloads','NodeCanvas-Setup-v1.13.0.exe');
  const bytes=await readFile(installer);
  const peOffset=bytes.length>0x40?bytes.readUInt32LE(0x3c):-1;
  const sha=createHash('sha256').update(bytes).digest('hex');
  if(bytes.length<100_000||bytes[0]!==0x4d||bytes[1]!==0x5a||peOffset<0x40||peOffset+4>bytes.length||bytes.toString('ascii',peOffset,peOffset+4)!=='PE\0\0'||sha!==NODECANVAS_SHA256)
    throw new Error('원본 NodeCanvas 설치 EXE의 내용이나 무결성이 맞지 않습니다.');
  return true;
}

function deploymentOrigin(env = process.env) {
  const raw = env.PUBLIC_SITE_URL?.trim()
    || (env.VERCEL_ENV === 'production' ? STABLE_PRODUCTION_ORIGIN : env.VERCEL_URL?.trim());
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

await verifyNativeInstaller();
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true, force: true });
const htmlPath = path.join(output, 'index.html');
const original = await readFile(htmlPath, 'utf8');
await writeFile(htmlPath, decorateMetadata(original, deploymentOrigin()));
console.log('DramaForge static build complete. OG image:', deploymentOrigin() ?? '(local relative URL)');
export { deploymentOrigin, decorateMetadata, verifyNativeInstaller };
