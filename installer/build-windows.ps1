$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$csc=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not (Test-Path -LiteralPath $csc)){throw 'Windows x64 .NET Framework C# compiler is required'}
$temp=Join-Path $env:TEMP ('DF-NodeCanvas-Port-'+[guid]::NewGuid().ToString('N'))
$exe='DramaForge-Setup-Windows.exe'
$destination=Join-Path $root ('web\downloads\'+$exe)
if(Test-Path -LiteralPath $destination){throw 'Installer already exists: refusing to overwrite '+$destination}
$refs=@('/r:System.Windows.Forms.dll','/r:System.Drawing.dll','/r:System.IO.Compression.dll','/r:System.IO.Compression.FileSystem.dll','/r:System.Web.dll','/r:System.Web.Extensions.dll')
try{
 New-Item -ItemType Directory -Path $temp -Force | Out-Null
 $source=Join-Path $root 'installer\NodeCanvasPort.cs'
 $unSource=Join-Path $root 'installer\NodeCanvasUninstallPort.cs'
 $launcher=Join-Path $temp '2026-10-31-DramaForgeConnect-v1.9.1.exe'
 & $csc /nologo /codepage:65001 /target:winexe /define:LAUNCHER ("/out:"+$launcher) @refs $source
 if($LASTEXITCODE -ne 0){throw 'Launcher compilation failed'}
 $launcherSelf=Start-Process -FilePath $launcher -ArgumentList '--self-test' -PassThru -Wait
 if($launcherSelf.ExitCode -ne 0){throw 'Launcher self-test failed'}
 $uninstaller=Join-Path $temp '2026-10-31-Uninstall-v1.9.1.exe'
 $owned=Join-Path $temp 'owned-files.txt'
 $files=@('2026-10-31-DramaForgeConnect-v1.9.1.exe','2026-10-31-Uninstall-v1.9.1.exe')
 $runtimeFiles=@('server.mjs','activation.mjs','provider.mjs','nodecanvas-codex.mjs')
 foreach($f in $runtimeFiles){$files+=('bridge/'+$f)}
 $files+=@('licenses/2026-10-31-Node-LICENSE.txt','licenses/2026-10-31-Codex-LICENSE.txt')
 [IO.File]::WriteAllLines($owned,$files)
 & $csc /nologo /codepage:65001 /target:winexe ("/out:"+$uninstaller) ("/resource:"+$owned+',owned-files') /r:System.Windows.Forms.dll $unSource
 if($LASTEXITCODE -ne 0){throw 'Uninstaller compilation failed'}
 $manifest=Join-Path $temp '2026-10-31-payload.sha256'
 $manifestRows=@()
 foreach($f in $runtimeFiles){$manifestRows+=((Get-FileHash (Join-Path $root ('bridge\'+$f))).Hash+'|bridge/'+$f)}
 foreach($name in @('Node-LICENSE.txt','Codex-LICENSE.txt')){$manifestRows+=((Get-FileHash (Join-Path $root ('installer\'+$name))).Hash+'|licenses/2026-10-31-'+$name)}
 $manifestRows+=((Get-FileHash $launcher).Hash+'|'+[IO.Path]::GetFileName($launcher))
 $manifestRows+=((Get-FileHash $uninstaller).Hash+'|'+[IO.Path]::GetFileName($uninstaller))
 [IO.File]::WriteAllLines($manifest,$manifestRows)
 $payload=Join-Path $temp 'payload.zip'
 Add-Type -AssemblyName System.IO.Compression
 Add-Type -AssemblyName System.IO.Compression.FileSystem
 $archive=[IO.Compression.ZipFile]::Open($payload,[IO.Compression.ZipArchiveMode]::Create)
 try{
  [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$manifest,'2026-10-31-payload.sha256')|Out-Null
  [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$launcher,[IO.Path]::GetFileName($launcher))|Out-Null
  [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$uninstaller,[IO.Path]::GetFileName($uninstaller))|Out-Null
  foreach($f in $runtimeFiles){[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,(Join-Path $root ('bridge\'+$f)),('bridge/'+$f))|Out-Null}
  foreach($f in @('Node-LICENSE.txt','Codex-LICENSE.txt')){[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,(Join-Path $root ('installer\'+$f)),('licenses/2026-10-31-'+$f))|Out-Null}
 }finally{$archive.Dispose()}
 New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force|Out-Null
 & $csc /nologo /codepage:65001 /target:winexe ("/resource:"+$payload+',payload.zip') ("/resource:"+$manifest+',trusted-manifest') ("/out:"+$destination) @refs $source
 if($LASTEXITCODE -ne 0){throw 'Installer compilation failed'}
 $self=Start-Process -FilePath $destination -ArgumentList '--self-test' -PassThru -Wait
 if($self.ExitCode -ne 0){throw 'Installer self-test failed'}
 Write-Host ('Built and tested native installer: '+$destination)
 Get-FileHash -LiteralPath $destination -Algorithm SHA256
} finally { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
