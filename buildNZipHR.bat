@echo off
cd /d C:\temp\heritage-restored-site

echo Running npm build...
call npm run build

echo Zipping files...
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\temp\heritage-restored-site\zipDaSite.ps1"

echo Done.
