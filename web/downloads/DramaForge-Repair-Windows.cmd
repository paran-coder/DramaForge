@echo off
setlocal
set "DRAMAFORGE_DIAG=%~f0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$raw=[IO.File]::ReadAllText($env:DRAMAFORGE_DIAG);$marker='### DRAMAFORGE-DIAG-POWERSHELL ###';$i=$raw.LastIndexOf($marker);if($i -lt 0){exit 1};try{& ([ScriptBlock]::Create($raw.Substring($i+$marker.Length)))}catch{Write-Host $_.Exception.Message -ForegroundColor Red;exit 1}"
echo.
echo Close this window after reviewing the result.
pause
exit /b %errorlevel%
### DRAMAFORGE-DIAG-POWERSHELL ###
$ErrorActionPreference='Stop'
$root=Join-Path $env:LOCALAPPDATA 'Programs\DramaForgeConnector'
$launcher=Join-Path $root 'launch.ps1'
$node=Join-Path $root 'runtime\node.exe'
$server=Join-Path $root 'bridge\server.mjs'
$report=Join-Path $env:TEMP 'DramaForge-Connection-Check.txt'
$lines=New-Object System.Collections.Generic.List[string]
function Report([string]$text){Write-Host $text; $script:lines.Add($text)}
function Probe{
 try {
  $data=Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:7331/health' -TimeoutSec 3
  if($data.service -eq 'dramaforge-bridge' -and $data.ok){return [string]$data.version}
 }catch{}
 return $null
}
try {
 Report 'DramaForge local connector diagnostic (no project files read)'
 $version=Probe
 if($version){
  Report ('RUNNING: local bridge version '+$version)
  Report 'If the website still cannot connect: check site permission for Local network / Loopback network, and confirm the exact production URL.'
 }else{
  Report 'NOT RUNNING: local bridge did not answer on 127.0.0.1:7331.'
  if(-not (Test-Path -LiteralPath $launcher)){
    Report 'NOT INSTALLED: launch.ps1 was not found in the expected per-user connector folder.'
    Report 'Use the official DramaForge connector installer. Do not keep reinstalling before checking the installer log.'
  }elseif(-not (Test-Path -LiteralPath $node) -or -not (Test-Path -LiteralPath $server)){
    Report 'INCOMPLETE INSTALL: runtime/node.exe or bridge/server.mjs is missing.'
  }else{
    Report 'RESTART: running the installed local connector launcher once.'
    try { & $launcher; Report 'Launcher returned.' } catch { Report ('Launcher error: '+$_.Exception.Message) }
    Start-Sleep -Seconds 2
    $version=Probe
    if($version){Report ('RECOVERED: local bridge version '+$version)}
    else {Report 'STILL NOT RUNNING: inspect the local bridge stderr and original installer logs.'}
  }
 }
 if(-not (Probe)){
  $errors=Join-Path $root 'logs\bridge.stderr.log'
  if(Test-Path -LiteralPath $errors){
   Report '--- last 12 lines of local bridge errors (may include local paths) ---'
   Get-Content -LiteralPath $errors -Tail 12 -ErrorAction SilentlyContinue | ForEach-Object {Report ([string]$_)}
  }
  $setup=Join-Path $env:TEMP 'DramaForge-Setup.log'
  if(Test-Path -LiteralPath $setup){Report 'Installer log exists in the TEMP directory; inspect it for download/hash/install failures.'}
 }
} catch { Report ('Diagnostic error: '+$_.Exception.Message) }
finally{
 try{[IO.File]::WriteAllLines($report,$lines,[Text.UTF8Encoding]::new($false));Report ('Diagnostic saved: '+$report)}catch{}
 Report 'If sharing a diagnostic report, first remove any private paths, account names or tokens.'
}
