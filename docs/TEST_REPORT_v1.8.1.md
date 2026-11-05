# DramaForge v1.8.1 — NodeCanvas direct-port verification

## Automated verification
- `npm run check`: PASS (150/150 Node.js tests)
- `npm run build`: PASS (static preview/local build only)
- `VERCEL_ENV=production npm run build`: Expected BLOCK if `web/downloads/DramaForge-Setup-Windows.exe` is absent
- Windows `csc.exe` compile and EXE self-tests: NOT TESTED (Windows runner unavailable in this execution environment)
- Native `dramaforge://` protocol registration / Windows consent dialog: NOT TESTED
- ChatGPT real login, actual AI shot generation, live Vercel deployment: NOT TESTED

## Change boundaries
- Character canon and timeline logic: untouched
- Browser IndexedDB and backups: untouched
- Static site and OG/Analytics: untouched, except build fail-closed when installer absent
- Native installer, launcher and uninstaller: ported from user's NodeCanvas 1.13.0
- Browser/native challenge: normalized to NodeCanvas SHA-256(UTF8(hexSecret))

## Self-review
- Structure and direct reuse: 9/10 — original installation/launcher flow preserved
- Automated code contract tests: 9/10 — all 150 pass; no native execution
- **Release readiness: 4/10** — requires Windows build, unsigned EXE review, real user device test, preview deployment

This version must not be described as a ready-to-install Windows binary.
