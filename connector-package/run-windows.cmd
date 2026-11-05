@echo off
cd /d "%~dp0"
echo DramaForge Connector v1.7.0
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 20+ is required.
 pause
 exit /b 1
)
node bridge/server.mjs --origin "https://dramaforge-lemon-ten.vercel.app"
pause
