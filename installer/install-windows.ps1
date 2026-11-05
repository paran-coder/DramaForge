# DramaForge v1.8.0 user-scoped native installation, embedded in Setup.exe.
# Only pinned official runtime archives are downloaded. Bridge and launcher are embedded resources.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = Join-Path $env:LOCALAPPDATA 'Programs\DramaForgeConnector'
$source = $env:DRAMAFORGE_PAYLOAD_STAGE
$stage = Join-Path $env:TEMP ('DramaForge-v1.8-stage-' + [guid]::NewGuid().ToString('N'))
$log = Join-Path $env:TEMP 'DramaForge-Setup.log'
try { Start-Transcript -Path $log -Append -ErrorAction Stop | Out-Null } catch {}
function Download-Verified([string]$Url,[string]$Hash,[string]$Destination) {
  if (-not $Url.StartsWith('https://',[StringComparison]::Ordinal)) { throw 'HTTPS 주소만 허용합니다.' }
  Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing
  $actual = (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $Hash.ToLowerInvariant()) { throw ('다운로드 해시 오류: ' + $Url) }
}
function From-Zip([string]$Archive,[string]$File,[string]$Destination) {
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
  try {
    $match = @($zip.Entries | Where-Object { [IO.Path]::GetFileName($_.FullName) -eq $File })
    if ($match.Count -ne 1) { throw ('필수 파일 누락: ' + $File) }
    $input = $match[0].Open()
    try {
      $output = [IO.File]::Open($Destination, [IO.FileMode]::CreateNew)
      try { $input.CopyTo($output) } finally { $output.Dispose() }
    } finally { $input.Dispose() }
  } finally { $zip.Dispose() }
}
function Health() {
  try {
    $h = Invoke-RestMethod -Uri 'http://127.0.0.1:7331/health' -TimeoutSec 2 -Method Get
    if ($h.ok -and $h.service -eq 'dramaforge-bridge') { return [string]$h.version }
  } catch { }
  return ''
}
function Stop-Previous-Trusted-Bridge {
  if (-not (Test-Path -LiteralPath $root)) { return }
  $prefix = ([IO.Path]::GetFullPath($root).TrimEnd('\') + '\').ToLowerInvariant()
  $candidates = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue)
  foreach ($proc in $candidates) {
    $path = [string]$proc.ExecutablePath
    $command = [string]$proc.CommandLine
    if ($path.ToLowerInvariant().StartsWith($prefix) -and $command.Contains('server.mjs')) {
      Stop-Process -Id $proc.ProcessId -ErrorAction Stop
      Start-Sleep -Milliseconds 350
    }
  }
  $launchers = @(Get-CimInstance Win32_Process -Filter "Name = 'DramaForge-Connect.exe'" -ErrorAction SilentlyContinue)
  foreach ($proc in $launchers) {
    if ([string]$proc.ExecutablePath -and ([string]$proc.ExecutablePath).ToLowerInvariant().StartsWith($prefix)) {
      Stop-Process -Id $proc.ProcessId -ErrorAction Stop
      Start-Sleep -Milliseconds 350
    }
  }
}
function Register-Protocol([string]$Launcher) {
  $reg = 'HKCU:\Software\Classes\dramaforge'
  New-Item -Path $reg -Force | Out-Null
  Set-Item -Path $reg -Value 'URL:DramaForge Connection'
  New-ItemProperty -Path $reg -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
  $command = Join-Path $reg 'shell\open\command'
  New-Item -Path $command -Force | Out-Null
  Set-Item -Path $command -Value ('"' + $Launcher + '" "%1"')
}
try {
  if (-not [Environment]::Is64BitOperatingSystem) { throw 'Windows x64가 필요합니다.' }
  if (-not (Test-Path -LiteralPath $source -PathType Container)) { throw '설치 프로그램의 내장 리소스를 찾지 못했습니다.' }
  foreach($required in @('DramaForge-Connect.exe','bridge\server.mjs','bridge\provider.mjs','bridge\activation.mjs')) {
    if (-not (Test-Path (Join-Path $source $required) -PathType Leaf)) { throw ('누락된 설치 파일: ' + $required) }
  }
  New-Item -ItemType Directory -Path (Join-Path $stage 'runtime') -Force | Out-Null
  $packages = @(
    @{ Name='Node.js'; Url='https://nodejs.org/dist/v24.14.1/node-v24.14.1-win-x64.zip'; Sha='6e50ce5498c0cebc20fd39ab3ff5df836ed2f8a31aa093cecad8497cff126d70' },
    @{ Name='Codex CLI'; Url='https://github.com/openai/codex/releases/download/rust-v0.149.1/codex-x86_64-pc-windows-msvc.exe.zip'; Sha='c19dd84738dee791c4d39a96bd080d94f098af074ae9d2ef5e27d3d85a122665' },
    @{ Name='Codex image host'; Url='https://github.com/openai/codex/releases/download/rust-v0.149.1/codex-code-mode-host-x86_64-pc-windows-msvc.exe.zip'; Sha='99e86c60dc20d7ca5b17062922062216700c67d146836a795370b7a8da7c4d14' }
  )
  $archive = @()
  for ($i=0;$i -lt $packages.Count;$i++) {
    Write-Host ('[{0}/3] {1} 다운로드 및 무결성 확인' -f ($i+1),$packages[$i].Name)
    $file=Join-Path $stage ('download-'+$i+'.zip')
    Download-Verified $packages[$i].Url $packages[$i].Sha $file
    $archive += $file
  }
  $runtime=Join-Path $stage 'runtime'
  From-Zip $archive[0] 'node.exe' (Join-Path $runtime 'node.exe')
  From-Zip $archive[1] 'codex-x86_64-pc-windows-msvc.exe' (Join-Path $runtime 'codex.exe')
  From-Zip $archive[1] 'codex-command-runner.exe' (Join-Path $runtime 'codex-command-runner.exe')
  From-Zip $archive[1] 'codex-windows-sandbox-setup.exe' (Join-Path $runtime 'codex-windows-sandbox-setup.exe')
  From-Zip $archive[2] 'codex-code-mode-host-x86_64-pc-windows-msvc.exe' (Join-Path $runtime 'codex-code-mode-host.exe')
  Copy-Item -LiteralPath (Join-Path $source 'bridge') -Destination (Join-Path $stage 'bridge') -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $source 'DramaForge-Connect.exe') -Destination (Join-Path $stage 'DramaForge-Connect.exe')
  $backup=$root+'.v1.8-backup'
  if (Test-Path -LiteralPath $backup) { throw '이전 설치 백업이 남아 있습니다. 안전을 위해 설치를 중단합니다.' }
  # Never stop or adopt a foreign process that owns port 7331.
  Stop-Previous-Trusted-Bridge
  $version=Health
  if ($version) { throw ('다른 연결 앱이 포트를 사용 중입니다: ' + $version) }
  New-Item -ItemType Directory -Path (Split-Path -Parent $root) -Force | Out-Null
  $hadOld=Test-Path -LiteralPath $root
  $oldProtocolCommand = $null
  $oldProtocolKey = 'HKCU:\Software\Classes\dramaforge\shell\open\command'
  if (Test-Path -LiteralPath $oldProtocolKey) { $oldProtocolCommand = (Get-Item -LiteralPath $oldProtocolKey).GetValue('') }
  if ($hadOld) { Move-Item -LiteralPath $root -Destination $backup }
  $installed=$false
  try {
    # Move only the checked files, never a ZIP entry or arbitrary OS path.
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    foreach($f in @('runtime','bridge','DramaForge-Connect.exe')) {
      Move-Item -LiteralPath (Join-Path $stage $f) -Destination (Join-Path $root $f)
    }
    Register-Protocol (Join-Path $root 'DramaForge-Connect.exe')
    Start-Process -FilePath (Join-Path $root 'DramaForge-Connect.exe') | Out-Null
    $healthy=$false
    for($i=0;$i -lt 30;$i++) {
      Start-Sleep -Milliseconds 400
      if ((Health) -eq '1.8.0') { $healthy=$true; break }
    }
    if (-not $healthy) { throw '브리지가 실행되지 않았습니다. 재설치 전에 로그를 확인하세요.' }
    $installed=$true
  } finally {
    if (-not $installed) {
      Stop-Previous-Trusted-Bridge
      Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
      if ($hadOld -and (Test-Path -LiteralPath $backup)) { Move-Item -LiteralPath $backup -Destination $root }
      if ($oldProtocolCommand) { Set-Item -LiteralPath $oldProtocolKey -Value $oldProtocolCommand }
      else { Remove-Item -LiteralPath 'HKCU:\Software\Classes\dramaforge' -Recurse -Force -ErrorAction SilentlyContinue }
    }
  }
  if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
  # Old v1.7.x auto-start registry entry is replaced by on-demand custom URL activation.
  Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'DramaForgeConnector' -ErrorAction SilentlyContinue
  Write-Host 'DramaForge 1.8.0 연결 앱 설치 완료. 이제 웹에서 AI 연결을 누르세요.' -ForegroundColor Green
} catch {
  Write-Host ('설치 실패: '+$_.Exception.Message) -ForegroundColor Red
  Write-Host ('설치 로그: '+$log)
  exit 1
} finally {
  Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
  try { Stop-Transcript -ErrorAction SilentlyContinue | Out-Null } catch {}
}
