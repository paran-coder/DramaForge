# DramaForge Connector v1.7.0

The helper runs only on 127.0.0.1:7331 and permits the exact origin `https://dramaforge-lemon-ten.vercel.app`. A manual pairing code is no longer needed. It requires Node.js 20+ and OpenAI Codex CLI already installed, with optional interactive ChatGPT login from the web app.

## First use (explicit user consent)
- Windows: run `run-windows.cmd` after inspecting the extracted files.
- macOS/Linux: run `sh run-unix.sh` from the extracted folder.
- Open DramaForge and press **AI 연결** to auto-connect.
- Keep the terminal running while using AI.

A website cannot silently install or execute native applications. This is a runnable helper archive, **not an unattended installer or signed executable**. Do not bypass browser or OS security prompts.

No script, image, shot or character data is sent to Vercel by the helper. AI content sent to Codex goes to OpenAI under the user's authentication. Only approved website Origin and local loopback Host are allowed. Do not add arbitrary shell execution endpoints.
