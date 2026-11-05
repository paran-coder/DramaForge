$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$csc=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not (Test-Path -LiteralPath $csc)) { throw '.NET Framework C# compiler required (Windows runner)' }
$temp=Join-Path $env:TEMP ('DFNativeBuild-' + [guid]::NewGuid().ToString('N'))
try {
 New-Item -ItemType Directory -Path (Join-Path $temp 'payload\bridge') -Force | Out-Null
 foreach($file in @('server.mjs','provider.mjs','activation.mjs')) { Copy-Item (Join-Path $root ('bridge\'+$file)) (Join-Path $temp ('payload\bridge\'+$file)) }
 $launcher=Join-Path $temp 'DramaForge-Connect.exe'
 & $csc /nologo /target:winexe /codepage:65001 /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.dll /r:System.Web.Extensions.dll ("/out:"+$launcher) (Join-Path $root 'installer\ConnectorLauncher.cs')
 if($LASTEXITCODE -ne 0) { throw 'Native launcher compile failed' }
 $self=Start-Process -FilePath $launcher -ArgumentList '--self-test' -PassThru -Wait
 if($self.ExitCode -ne 0) { throw 'Native launcher self-test failed' }
 $payload=Join-Path $temp 'payload.zip'
 Compress-Archive -LiteralPath (Join-Path $temp 'payload\bridge') -DestinationPath $payload
 New-Item -ItemType Directory -Path (Join-Path $root 'web\downloads') -Force | Out-Null
 $dest=Join-Path $root 'web\downloads\DramaForge-Setup-Windows.exe'
 & $csc /nologo /target:winexe /codepage:65001 /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll ("/resource:"+(Join-Path $root 'installer\install-windows.ps1')+',setup-script') ("/resource:"+$launcher+',launcher-bin') ("/resource:"+$payload+',payload.zip') ("/out:"+$dest) (Join-Path $root 'installer\Setup.cs')
 if($LASTEXITCODE -ne 0) { throw 'Native setup compile failed' }
 $self=Start-Process -FilePath $dest -ArgumentList '--self-test' -PassThru -Wait
 if($self.ExitCode -ne 0) { throw 'Setup embedded-resource self-test failed' }
 Get-FileHash -LiteralPath $dest -Algorithm SHA256 | Format-List
 Write-Host ('UNSIGNED build completed: '+$dest)
} finally { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
