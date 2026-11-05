# NodeCanvas direct-port report — DramaForge v1.8.1

## Source basis
User supplied `2026-11-01-NodeCanvas-v1.13.0-github.zip`.

| NodeCanvas original | DramaForge port | Deliberate difference |
|---|---|---|
| `installer/2026-10-31-Connector.cs` | `installer/NodeCanvasPort.cs` | `nodecanvas://`→`dramaforge://`, port 7330→7331, version and origin filter, bridge file layout |
| `installer/2026-10-31-Uninstall.cs` | `installer/NodeCanvasUninstallPort.cs` | registry keys, file inventory |
| `2026-10-31-build-installer.ps1` | `installer/build-windows.ps1` | payload entries and renamed executable |
| `web/2026-10-31-app.mjs` one-time handshake | `web/bridge-client.mjs` | same SHA256(UTF8(hexSecret)) and protocol anchor click |
| `connector/2026-10-31-activation.mjs` | `bridge/activation.mjs` | same hash semantics, retains DramaForge test-injection API |

Reused semantics: pinned runtime SHA256, manifest checking, per-user Windows registry registration, staging and rollback, tray launcher, activation challenge, explicit website approval. Unchanged DramaForge modules: scripts, canon, continuity, storage, workflow, user data policy. The NodeCanvas image-only provider was *not* copied because DramaForge requires structured text jobs as well as image generation.

## Verification boundaries
- PASS: 150 Node.js tests + static build (see `npm run check`, `npm run build` output)
- EXPECTED BLOCK: Vercel production build without compiled EXE
- NOT TESTED: Windows C# compile, installer execution, protocol invocation, Codex login

## Release gate
1. Run GitHub Actions `Build DramaForge NodeCanvas-Ported Windows Installer` on a Windows runner.
2. Download and inspect its output artifact `DramaForge-Setup-Windows-v1.8.1-unsigned`.
3. Place the **real** EXE at `web/downloads/DramaForge-Setup-Windows.exe` and commit it to a preview branch.
4. On a Windows PC, install and verify `dramaforge://connect`, one-time website permission, ChatGPT login and an actual shot-generation request.
5. Promote preview to production only after passing the real-device checks. Windows code signing is required before a general-public release.
