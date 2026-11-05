# DramaForge 1.7.2 per-user bootstrap. Bundled into a downloadable .cmd file.
# Downloads pinned, SHA-256 verified official Node.js and Codex archives.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$origin = 'https://dramaforge-lemon-ten.vercel.app'
$folder = Join-Path $env:LOCALAPPDATA 'Programs\DramaForgeConnector'
$staging = Join-Path $env:TEMP ('DramaForgeSetup-' + [guid]::NewGuid().ToString('N'))
$setupLog = Join-Path $env:TEMP 'DramaForge-Setup.log'
try { Start-Transcript -Path $setupLog -Append -ErrorAction Stop | Out-Null } catch { Write-Host ('설치 로그 생성 실패: ' + $_.Exception.Message) }
$nodeVersion = 'v24.14.1'
$codexVersion = '0.149.1'
$checks = @(
  @{ Name='Node.js'; Url='https://nodejs.org/dist/v24.14.1/node-v24.14.1-win-x64.zip'; Sha='6e50ce5498c0cebc20fd39ab3ff5df836ed2f8a31aa093cecad8497cff126d70' },
  @{ Name='Codex CLI'; Url='https://github.com/openai/codex/releases/download/rust-v0.149.1/codex-x86_64-pc-windows-msvc.exe.zip'; Sha='c19dd84738dee791c4d39a96bd080d94f098af074ae9d2ef5e27d3d85a122665' },
  @{ Name='Codex image host'; Url='https://github.com/openai/codex/releases/download/rust-v0.149.1/codex-code-mode-host-x86_64-pc-windows-msvc.exe.zip'; Sha='99e86c60dc20d7ca5b17062922062216700c67d146836a795370b7a8da7c4d14' },
  @{ Name='DramaForge connector'; Url=($origin + '/downloads/DramaForge-Connector-v1.7.2.zip'); Sha='19c020af64ba8ee9ff16980a57ed0aa3fcc25b0d325840900c4ea6cb8384dfcb' }
)
function GrabVerified([string]$url, [string]$sha, [string]$output) {
  if (-not $url.StartsWith('https://', [StringComparison]::Ordinal)) { throw 'HTTPS 연결만 허용됩니다.' }
  Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
  $actual = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $sha.ToLowerInvariant()) { throw ('설치 파일 검증 실패: ' + $url) }
}
function FromZip([string]$archive, [string]$file, [string]$dest) {
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [IO.Compression.ZipFile]::OpenRead($archive)
  try {
    $items = @($zip.Entries | Where-Object { [IO.Path]::GetFileName($_.FullName) -eq $file })
    if ($items.Count -ne 1) { throw ('다운로드한 구성 요소 누락: ' + $file) }
    $inputStream = $items[0].Open()
    try {
      $outputStream = [IO.File]::Open($dest, [IO.FileMode]::CreateNew)
      try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose() }
    } finally { $inputStream.Dispose() }
  } finally { $zip.Dispose() }
}
try {
  if (-not [Environment]::Is64BitOperatingSystem) { throw '현재 설치 도우미는 Windows x64용입니다.' }
  Write-Host 'DramaForge AI 연결 도우미 · 자동 설치' -ForegroundColor Yellow
  Write-Host '이 PC의 사용자 폴더에 Node.js와 Codex CLI를 설치합니다. ChatGPT 로그인은 별도입니다.'
  New-Item -ItemType Directory -Path $staging -Force | Out-Null
  $runtime = Join-Path $staging 'runtime'
  New-Item -ItemType Directory -Path $runtime -Force | Out-Null
  $archives = @()
  for ($i=0; $i -lt $checks.Count; $i++) {
    $item = $checks[$i]
    $dest = Join-Path $staging ('package-' + $i + '.zip')
    Write-Host ('[{0}/4] {1} 다운로드·검증 중...' -f ($i+1), $item.Name)
    GrabVerified $item.Url $item.Sha $dest
    $archives += $dest
  }
  FromZip $archives[0] 'node.exe' (Join-Path $runtime 'node.exe')
  FromZip $archives[1] 'codex-x86_64-pc-windows-msvc.exe' (Join-Path $runtime 'codex.exe')
  FromZip $archives[1] 'codex-command-runner.exe' (Join-Path $runtime 'codex-command-runner.exe')
  FromZip $archives[1] 'codex-windows-sandbox-setup.exe' (Join-Path $runtime 'codex-windows-sandbox-setup.exe')
  FromZip $archives[2] 'codex-code-mode-host-x86_64-pc-windows-msvc.exe' (Join-Path $runtime 'codex-code-mode-host.exe')
  $payload = Join-Path $staging 'payload'
  New-Item -ItemType Directory -Path $payload -Force | Out-Null
  Expand-Archive -LiteralPath $archives[3] -DestinationPath $payload -Force
  if (-not (Test-Path (Join-Path $payload 'bridge\server.mjs')) -or -not (Test-Path (Join-Path $payload 'bridge\provider.mjs'))) { throw '연결 프로그램 파일이 누락되었습니다.' }
  Move-Item -LiteralPath (Join-Path $payload 'bridge') -Destination (Join-Path $staging 'bridge')
  $launcher = @'
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = Join-Path $root 'runtime\node.exe'
$env:DRAMAFORGE_CODEX = Join-Path $root 'runtime\codex.exe'
$env:PATH = (Join-Path $root 'runtime') + ';' + $env:PATH
$server = Join-Path $root 'bridge\server.mjs'
$logs = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$stdout = Join-Path $logs 'bridge.stdout.log'
$stderr = Join-Path $logs 'bridge.stderr.log'
function Get-LocalBridge {
  try {
    $h = Invoke-RestMethod -Uri 'http://127.0.0.1:7331/health' -Method Get -TimeoutSec 2
    if ($h.ok -and $h.service -eq 'dramaforge-bridge') { return $h }
  } catch { }
  return $null
}
$active = Get-LocalBridge
if ($active) {
  if ($active.version -eq '1.7.2') { Write-Host 'DramaForge 연결 프로그램 실행 중'; return }
  throw ('다른 버전의 연결 프로그램이 실행 중입니다: ' + $active.version + '. 먼저 이전 연결 프로그램을 종료한 다음 다시 실행하세요.')
}
$tcp = New-Object System.Net.Sockets.TcpClient
try {
  $connected = $false
  try {
    $task = $tcp.ConnectAsync('127.0.0.1',7331)
    $connected = $task.Wait(250) -and $tcp.Connected
  } catch { $connected = $false }
  if ($connected) { throw '포트 7331을 다른 프로세스가 사용 중입니다. 사용 중인 프로그램을 확인하세요.' }
} finally { $tcp.Dispose() }
if (-not (Test-Path -LiteralPath $node) -or -not (Test-Path -LiteralPath $server)) { throw '설치된 실행 파일이 누락되었습니다.' }
$process = Start-Process -FilePath $node -ArgumentList @(('"' + $server + '"'), '--origin', 'https://dramaforge-lemon-ten.vercel.app') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
for ($i=0; $i -lt 25; $i++) {
  Start-Sleep -Milliseconds 500
  $active = Get-LocalBridge
  if ($active -and $active.version -eq '1.7.2') { Write-Host 'DramaForge 연결 프로그램 정상 실행 확인'; return }
  if ($process.HasExited) { break }
}
$tail = if (Test-Path $stderr) { (Get-Content -LiteralPath $stderr -Tail 12 -ErrorAction SilentlyContinue) -join ' / ' } else { '오류 로그가 아직 없습니다.' }
throw ('브리지 시작 실패. 로그: ' + $stderr + ' / ' + $tail)
'@
  [IO.File]::WriteAllText((Join-Path $staging 'launch.ps1'), $launcher, [Text.UTF8Encoding]::new($false))
  $old = $folder + '.backup'
  if (Test-Path -LiteralPath $old) { throw '이전 설치의 백업 폴더가 남아 있습니다. 수동 삭제 전에 지원팀에 문의하세요.' }
  if (Test-Path -LiteralPath $folder) { Move-Item -LiteralPath $folder -Destination $old }
  $parent = Split-Path -Parent $folder
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  try {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
    foreach ($entry in @('runtime','bridge','launch.ps1')) { Move-Item -LiteralPath (Join-Path $staging $entry) -Destination (Join-Path $folder $entry) }
  } catch {
    Remove-Item -LiteralPath $folder -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $old) { Move-Item -LiteralPath $old -Destination $folder }
    throw
  }
  if (Test-Path -LiteralPath $old) { Remove-Item -LiteralPath $old -Recurse -Force }
  $runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
  $runValue = 'powershell.exe -NoProfile -WindowStyle Hidden -File "' + (Join-Path $folder 'launch.ps1') + '"'
  New-ItemProperty -Path $runKey -Name 'DramaForgeConnector' -Value $runValue -PropertyType String -Force | Out-Null
  & (Join-Path $folder 'launch.ps1')
  Write-Host '설치 완료. 웹브라우저로 돌아가면 자동 연결됩니다.' -ForegroundColor Green
} catch {
  Write-Host ('설치 실패: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host ('설치 로그: ' + $setupLog) -ForegroundColor Yellow
  exit 1
} finally {
  Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
  try { Stop-Transcript -ErrorAction SilentlyContinue | Out-Null } catch {}
}
