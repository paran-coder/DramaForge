#!/bin/sh
# One-time user-approved bootstrap. No sudo, no browser privileges.
set -eu
ORIGIN='https://dramaforge-lemon-ten.vercel.app'
VERSION='v24.14.1'
CODEX='0.149.1'
PAYLOAD_SHA='19c020af64ba8ee9ff16980a57ed0aa3fcc25b0d325840900c4ea6cb8384dfcb'
ROOT="${HOME}/.local/share/dramaforge-connector"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT HUP INT TERM
require() { command -v "$1" >/dev/null 2>&1 || { printf '%s 필요\n' "$1" >&2; exit 1; }; }
require curl
require tar
os="$(uname -s)"; arch="$(uname -m)"
case "$os:$arch" in
  Darwin:arm64) plat='darwin-arm64' ;;
  Darwin:x86_64) plat='darwin-x64' ;;
  Linux:x86_64) plat='linux-x64' ;;
  Linux:aarch64) plat='linux-arm64' ;;
  *) echo '현재 자동 설치가 지원되지 않는 환경입니다.' >&2; exit 1 ;;
esac
mkdir -p "$WORK/runtime" "$WORK/bridge"
# Use a compatible system Node if already available, otherwise use an official portable Node.
node=''
if command -v node >/dev/null 2>&1 && node -e 'process.exit(Number(process.versions.node.split(".")[0])>=20?0:1)' ; then
  node="$(command -v node)"
else
  name="node-${VERSION}-${plat}.tar.xz"
  base="https://nodejs.org/dist/${VERSION}"
  echo '공식 Node.js 다운로드·검증 중...'
  curl --fail --location --silent --show-error "${base}/SHASUMS256.txt" -o "$WORK/SHASUMS256.txt"
  sha="$(awk -v n="$name" '$2==n {print $1}' "$WORK/SHASUMS256.txt")"
  [ -n "$sha" ] || { echo 'Node.js 해시를 찾지 못했습니다.' >&2; exit 1; }
  curl --fail --location --silent --show-error "${base}/${name}" -o "$WORK/$name"
  if command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$WORK/$name" | awk '{print $1}')"
  else
    require sha256sum
    actual="$(sha256sum "$WORK/$name" | awk '{print $1}')"
  fi
  [ "$sha" = "$actual" ] || { echo 'Node.js 무결성 확인 실패' >&2; exit 1; }
  tar -xJf "$WORK/$name" -C "$WORK/runtime" --strip-components=1
  node="$WORK/runtime/bin/node"
fi
mkdir -p "$WORK/npm"
echo 'Codex CLI 사용자 영역 설치 중...'
if [ -x "$WORK/runtime/bin/npm" ]; then npm="$WORK/runtime/bin/npm"; else require npm; npm="$(command -v npm)"; fi
PATH="$(dirname "$node"):$PATH" "$node" "$npm" install --prefix "$WORK/npm" --no-audit --no-fund "@openai/codex@${CODEX}"
[ -x "$WORK/npm/node_modules/.bin/codex" ] || { echo 'Codex 설치 확인 실패' >&2; exit 1; }
echo 'DramaForge 연결 파일 다운로드 중...'
curl --fail --location --silent --show-error "${ORIGIN}/downloads/DramaForge-Connector-v1.7.2.zip" -o "$WORK/connector.zip"
if command -v shasum >/dev/null 2>&1; then digest="$(shasum -a 256 "$WORK/connector.zip" | awk '{print $1}')"; else digest="$(sha256sum "$WORK/connector.zip" | awk '{print $1}')"; fi
[ "$digest" = "$PAYLOAD_SHA" ] || { echo '연결 파일 무결성 확인 실패' >&2; exit 1; }
require unzip
unzip -q "$WORK/connector.zip" -d "$WORK/package"
[ -f "$WORK/package/bridge/server.mjs" ] && [ -f "$WORK/package/bridge/provider.mjs" ] || { echo '연결 파일 형식 오류' >&2; exit 1; }
cp -R "$WORK/package/bridge/." "$WORK/bridge/"
mkdir -p "$(dirname "$ROOT")"
if [ -d "$ROOT" ]; then echo '기존 연결 앱을 먼저 종료해야 합니다.' >&2; exit 1; fi
mkdir -p "$ROOT"
cp -R "$WORK/bridge" "$WORK/npm" "$ROOT/"
if [ -x "$WORK/runtime/bin/node" ]; then cp -R "$WORK/runtime" "$ROOT/"; fi
if [ -x "$ROOT/runtime/bin/node" ]; then NODE="$ROOT/runtime/bin/node"; else NODE="$node"; fi
cat > "$ROOT/launch.sh" <<EOF
#!/bin/sh
set -eu
export DRAMAFORGE_CODEX="$ROOT/npm/node_modules/.bin/codex"
export PATH="$(dirname "$NODE"):\$PATH"
exec "$NODE" "$ROOT/bridge/server.mjs" --origin '$ORIGIN'
EOF
chmod 700 "$ROOT/launch.sh"
if [ "$os" = 'Darwin' ]; then
  dest="$HOME/Library/LaunchAgents"
  mkdir -p "$dest"
  cat > "$dest/com.dramaforge.connector.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key><string>com.dramaforge.connector</string><key>ProgramArguments</key><array><string>$ROOT/launch.sh</string></array><key>RunAtLoad</key><true/><key>KeepAlive</key><true/></dict></plist>
EOF
  launchctl load "$dest/com.dramaforge.connector.plist" || nohup "$ROOT/launch.sh" >"$ROOT/bridge.stdout.log" 2>"$ROOT/bridge.stderr.log" &
else
  dest="$HOME/.config/autostart"
  mkdir -p "$dest"
  cat > "$dest/dramaforge-connector.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=DramaForge Connector
Exec=$ROOT/launch.sh
X-GNOME-Autostart-enabled=true
Terminal=false
EOF
  nohup "$ROOT/launch.sh" >"$ROOT/bridge.stdout.log" 2>"$ROOT/bridge.stderr.log" &
fi
# Check that a freshly started local bridge actually responds.
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if curl --fail --silent --max-time 2 'http://127.0.0.1:7331/health' | grep -q '"version":"1.7.2"'; then ready=1; break; fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo '연결 프로그램이 실행되지 않았습니다. bridge.stderr.log를 확인하세요.' >&2
  exit 1
fi
echo '설치 및 브리지 실행 확인 완료. 브라우저로 돌아가면 자동 연결됩니다.'
