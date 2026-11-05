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

// The downloadable installer is produced by the Windows GitHub Actions job.
// Vercel builds only static assets. A missing EXE is NOT a completed installer.
async function verifyNativeInstaller() {
  const installer = path.join(source, 'downloads', 'DramaForge-Setup-Windows.exe');
  let bytes;
  try { bytes = await readFile(installer); }
  catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('NOTICE: Windows EXE not published yet; the UI will disable installation until GitHub Actions publishes it.');
      return false;
    }
    throw error;
  }
  const peOffset = bytes.length > 0x40 ? bytes.readUInt32LE(0x3c) : -1;
  if (bytes.length < 100_000 || bytes.length > 25_000_000 || bytes[0] !== 0x4d || bytes[1] !== 0x5a ||
    peOffset < 0x40 || peOffset + 4 > bytes.length || bytes.toString('ascii', peOffset, peOffset+4) !== 'PE\0\0' ||
    !bytes.includes(Buffer.from('DramaForge', 'utf16le')) || !bytes.includes(Buffer.from('dramaforge', 'utf16le')))
      throw new Error('Invalid DramaForge Windows installer PE. Rejecting deployment.');
  const sha = createHash('sha256').update(bytes).digest('hex');
  console.log('Verified DramaForge Windows EXE:', bytes.length, 'bytes, SHA-256', sha);
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
// Defense in depth: an old tracked NodeCanvas image-only EXE is not a DramaForge installer.
await rm(path.join(output, 'downloads', 'NodeCanvas-Setup-v1.13.0.exe'), { force: true });
const htmlPath = path.join(output, 'index.html');
const original = await readFile(htmlPath, 'utf8');
await writeFile(htmlPath, decorateMetadata(original, deploymentOrigin()));
console.log('DramaForge static build complete. OG image:', deploymentOrigin() ?? '(local relative URL)');
export { deploymentOrigin, decorateMetadata, verifyNativeInstaller };
