@echo off
setlocal EnableExtensions EnableDelayedExpansion
title IceBreaker - Ollama Setup

set "EXTENSION_ID=obomeikfhecigjneagkdhgfdibodeile"
set "ORIGIN=chrome-extension://%EXTENSION_ID%"
set "ENDPOINT=http://127.0.0.1:11434"
set "LOGDIR=%LOCALAPPDATA%\IceBreaker"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\IceBreaker-Ollama.cmd"

if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>&1

echo.
echo IceBreaker - one-time Ollama connection setup
echo ===============================================

echo [1/6] Checking Ollama...
where ollama.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Ollama was not found in PATH.
  echo Open a new CMD and verify that this command works: ollama list
  echo If it works there, run this BAT again from that same Windows account.
  goto :failed
)

echo [2/6] Saving permanent environment settings...
setx OLLAMA_ORIGINS "chrome-extension://*" >nul
setx OLLAMA_HOST "127.0.0.1:11434" >nul
setx OLLAMA_KEEP_ALIVE "-1" >nul
set "OLLAMA_ORIGINS=chrome-extension://*"
set "OLLAMA_HOST=127.0.0.1:11434"
set "OLLAMA_KEEP_ALIVE=-1"

echo [3/6] Closing old Ollama processes...
taskkill /F /IM ollama.exe >nul 2>&1
taskkill /F /IM "ollama app.exe" >nul 2>&1
taskkill /F /IM ollama_llama_server.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [4/6] Starting a clean Ollama server...
start "Ollama for IceBreaker" /MIN cmd.exe /c "set OLLAMA_ORIGINS=chrome-extension://*&& set OLLAMA_HOST=127.0.0.1:11434&& set OLLAMA_KEEP_ALIVE=-1&& ollama serve 1^>^>\"%LOGDIR%\ollama.log\" 2^>^&1"

echo [5/6] Waiting for the local API...
set "READY=0"
for /L %%I in (1,1,30) do (
  curl.exe -s --max-time 2 "%ENDPOINT%/api/tags" > "%TEMP%\icebreaker-models.json" 2>nul
  if not errorlevel 1 (
    set "READY=1"
    goto :api_ready
  )
  timeout /t 1 /nobreak >nul
)

:api_ready
if not "%READY%"=="1" (
  echo [ERROR] Ollama did not start on %ENDPOINT%.
  echo Check this log: %LOGDIR%\ollama.log
  goto :failed
)

echo [6/6] Verifying Chrome-extension CORS permission...
curl.exe -s -D "%TEMP%\icebreaker-headers.txt" -o nul --max-time 5 -H "Origin: %ORIGIN%" "%ENDPOINT%/api/tags"
findstr /I /C:"Access-Control-Allow-Origin:" "%TEMP%\icebreaker-headers.txt" >nul
if errorlevel 1 (
  echo [ERROR] Ollama is running, but its CORS header is missing.
  echo Fully exit the Ollama tray app, then run this BAT again.
  echo.
  type "%TEMP%\icebreaker-headers.txt"
  goto :failed
)

> "%STARTUP%" echo @echo off
>> "%STARTUP%" echo curl.exe -s --max-time 2 http://127.0.0.1:11434/api/tags ^>nul 2^>^&1 ^&^& exit /b 0
>> "%STARTUP%" echo set "OLLAMA_ORIGINS=chrome-extension://*"
>> "%STARTUP%" echo set "OLLAMA_HOST=127.0.0.1:11434"
>> "%STARTUP%" echo set "OLLAMA_KEEP_ALIVE=-1"
>> "%STARTUP%" echo start "Ollama for IceBreaker" /MIN cmd.exe /c "ollama serve 1^>^>\"%%LOCALAPPDATA%%\IceBreaker\ollama.log\" 2^>^&1"

echo.
echo [OK] Ollama API: %ENDPOINT%
echo [OK] Chrome extension origin is allowed.
echo [OK] Windows Startup launcher created.
echo.
echo Now reload IceBreaker at chrome://extensions and reopen its panel.
echo Test manually with:
echo curl.exe -i -H "Origin: %ORIGIN%" %ENDPOINT%/api/tags
echo.
pause
exit /b 0

:failed
echo.
echo Setup failed. Read the error above.
echo You can still start Ollama manually with:
echo   set OLLAMA_ORIGINS=chrome-extension://*
echo   set OLLAMA_HOST=127.0.0.1:11434
echo   ollama serve
echo.
pause
exit /b 1
