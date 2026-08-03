@echo off
set "STARTUP_FILE=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\IceBreaker-Ollama.cmd"
if exist "%STARTUP_FILE%" del /q "%STARTUP_FILE%"
echo IceBreaker Ollama startup fallback removed.
pause
