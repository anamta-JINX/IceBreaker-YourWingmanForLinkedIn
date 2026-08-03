param(
  [string]$ExtensionId = "obomeikfhecigjneagkdhgfdibodeile"
)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "IceBreaker - Ollama Repair"

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "[OK] $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "[!] $Text" -ForegroundColor Yellow }

Write-Host ""
Write-Host "IceBreaker - one-time Ollama connection repair" -ForegroundColor White
Write-Host "Ollama stays on 127.0.0.1 and accepts Chrome-extension origins." -ForegroundColor DarkGray

$ollama = Get-Command ollama.exe -ErrorAction SilentlyContinue
if (-not $ollama) { $ollama = Get-Command ollama -ErrorAction SilentlyContinue }
if (-not $ollama) {
  throw "The ollama command was not found. Install Ollama for Windows, reopen PowerShell, and run this script again."
}

$endpoint = "http://127.0.0.1:11434"
$testOrigin = "chrome-extension://$ExtensionId"
$allowedOrigins = "chrome-extension://*"

Write-Step "Saving supported browser-extension origin settings"
[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", $allowedOrigins, "User")
[Environment]::SetEnvironmentVariable("OLLAMA_HOST", "127.0.0.1:11434", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "-1", "User")
$env:OLLAMA_ORIGINS = $allowedOrigins
$env:OLLAMA_HOST = "127.0.0.1:11434"
$env:OLLAMA_KEEP_ALIVE = "-1"
Write-Ok "OLLAMA_ORIGINS=$allowedOrigins"
Write-Ok "OLLAMA_HOST=127.0.0.1:11434"

Write-Step "Stopping Ollama and the current port owner"
try {
  Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
} catch {
  Write-Warn "Could not inspect the port owner; continuing with process cleanup."
}
Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessName -like "ollama*" } |
  Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Step "Starting a clean Ollama server"
$logDir = Join-Path $env:LOCALAPPDATA "IceBreaker"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$stdoutLog = Join-Path $logDir "ollama-stdout.log"
$stderrLog = Join-Path $logDir "ollama-stderr.log"
Remove-Item $stdoutLog,$stderrLog -Force -ErrorAction SilentlyContinue
Start-Process -FilePath $ollama.Source -ArgumentList "serve" -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog | Out-Null

Write-Step "Verifying API and CORS for $testOrigin"
$ready = $false
$allowOrigin = ""
for ($i = 0; $i -lt 50; $i++) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "$endpoint/api/tags" -Headers @{ Origin = $testOrigin } -TimeoutSec 3
    $allowOrigin = [string]$response.Headers["Access-Control-Allow-Origin"]
    if ($response.StatusCode -eq 200 -and ($allowOrigin -eq $testOrigin -or $allowOrigin -eq "*" -or $allowOrigin -eq $allowedOrigins)) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 700
  }
}

if (-not $ready) {
  Write-Host ""
  Write-Host "CORS verification failed." -ForegroundColor Red
  Write-Host "Expected Access-Control-Allow-Origin for: $testOrigin" -ForegroundColor Yellow
  Write-Host "Received: $allowOrigin" -ForegroundColor Yellow
  Write-Host "Ollama error log: $stderrLog" -ForegroundColor Yellow
  throw "Ollama is reachable but did not accept the Chrome-extension origin. Close the Ollama tray app and run this script again."
}
Write-Ok "Ollama returned HTTP 200 with Access-Control-Allow-Origin=$allowOrigin"

Write-Step "Adding a Windows Startup fallback"
$startupDir = [Environment]::GetFolderPath("Startup")
$startupFile = Join-Path $startupDir "IceBreaker-Ollama.cmd"
$ollamaPath = $ollama.Source.Replace('"','""')
$startupContent = @"
@echo off
curl.exe -s --max-time 2 http://127.0.0.1:11434/api/tags >nul 2>&1 && exit /b 0
set "OLLAMA_ORIGINS=chrome-extension://*"
set "OLLAMA_HOST=127.0.0.1:11434"
set "OLLAMA_KEEP_ALIVE=-1"
start "Ollama for IceBreaker" /MIN "$ollamaPath" serve
"@
Set-Content -Path $startupFile -Value $startupContent -Encoding Ascii
Write-Ok "Startup fallback created: $startupFile"

Write-Host ""
Write-Host "Ollama is ready for IceBreaker." -ForegroundColor Green
Write-Host "Reload IceBreaker in chrome://extensions, close the old panel, and open it again." -ForegroundColor White
Write-Host ""
Write-Host "Manual browser-origin test:" -ForegroundColor DarkGray
Write-Host "curl.exe -i -H `"Origin: $testOrigin`" $endpoint/api/tags" -ForegroundColor Gray
