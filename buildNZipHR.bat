@echo off
cd /d C:\temp\mc1234\heritage-restored-site

REM ── Remove existing dist folder if it exists ─────────────────────────
if exist "dist" (
  echo Removing old dist folder...
  rd /s /q "dist"
)

echo Running npm build...
call npm run build

echo Zipping files...
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\temp\mc1234\heritage-restored-site\zipDaSite.ps1"

echo Done.