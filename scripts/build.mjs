/**
 * Static Vercel build. No user projects or local application state is read.
 * Vercel injects VERCEL_URL on deployments; PUBLIC_SITE_URL takes precedence
 * when a custom domain is supplied. The approved stable production
 * hostname is used for production even when VERCEL_URL is an immutable build URL.
 */
import { cp, mkdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'web');
const output = path.join(root, 'dist');

const STABLE_PRODUCTION_ORIGIN = 'https://dramaforge-lemon-ten.vercel.app';

// Never publish a broken "install connector" action in production.
// A .exe placeholder is not a valid installation package.
async function verifyNativeInstaller(env = process.env) {
  const installer = path.join(source, 'downloads', 'DramaForge-Setup-Windows.exe');
  const strict = env.VERCEL_ENV === 'production';
  try {
    const details = await stat(installer);
    const bytes = await readFile(installer);
    const peOffset = bytes.length > 0x40 ? bytes.readUInt32LE(0x3c) : -1;
    if (details.size < 100_000 || bytes[0] !== 0x4d || bytes[1] !== 0x5a || peOffset < 0x40 || peOffset + 4 > bytes.length || bytes.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0') {
      throw new Error('The installer is not a valid Windows PE executable');
    }
    return true;
  } catch(error) {
    if (strict) throw new Error('Blocked production deployment: Windows installer not built. Run the NodeCanvas-derived Windows GitHub Actions workflow, verify the EXE, and place it at web/downloads/DramaForge-Setup-Windows.exe. '+error.message);
    console.warn('Connector installer not available. Preview/local build will show installation unavailable.');
    return false;
  }
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
