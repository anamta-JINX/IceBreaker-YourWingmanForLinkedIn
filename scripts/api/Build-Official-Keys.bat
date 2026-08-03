@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-Official-Keys.ps1"
pause
