$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$csc=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not (Test-Path -LiteralPath $csc)){throw '.NET Framework C# compiler not found; Windows runner required'}
$dest=Join-Path $root 'web\downloads\DramaForge-Setup-Windows.exe'
& $csc /nologo /target:winexe /codepage:65001 /r:System.Windows.Forms.dll /r:System.Drawing.dll ("/resource:"+(Join-Path $root 'installer\install-windows.ps1')+',setup-script') ("/out:"+$dest) (Join-Path $root 'installer\Setup.cs')
if($LASTEXITCODE -ne 0){throw 'installer compile failed'}
$proc=Start-Process -FilePath $dest -ArgumentList '--self-test' -PassThru -Wait
if($proc.ExitCode -ne 0){throw 'installer self-test failed'}
Get-FileHash -LiteralPath $dest -Algorithm SHA256 | Format-Table
Write-Host ('Unsigned Windows installer built: '+$dest)
