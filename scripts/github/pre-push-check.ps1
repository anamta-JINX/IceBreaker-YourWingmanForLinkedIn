$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $projectRoot

$privateFiles = @("config/.env", "src/backend/config/official-api-keys.js")
$insideGit = $false
try {
  git rev-parse --is-inside-work-tree | Out-Null
  $insideGit = $true
} catch {}

if ($insideGit) {
  foreach ($file in $privateFiles) {
    git ls-files --error-unmatch $file *> $null
    if ($LASTEXITCODE -eq 0) { throw "Private file is tracked: $file" }
  }

  $matches = git grep -nE '(gsk_[A-Za-z0-9_-]{20,}|sk-or-v1-[A-Za-z0-9_-]{20,})' -- ':!*.md' ':!*.example.*' ':!config/.env.example'
  if ($LASTEXITCODE -eq 0 -and $matches) {
    Write-Host $matches
    throw "A likely API key was found in tracked files."
  }
}

$runtimeKeyFile = Join-Path $projectRoot "src\backend\config\official-api-keys.js"
$createdPlaceholder = $false
if (-not (Test-Path $runtimeKeyFile)) {
  Copy-Item "src\backend\config\official-api-keys.example.js" $runtimeKeyFile
  $createdPlaceholder = $true
}

node scripts/github/validate-extension.mjs
if ($LASTEXITCODE -ne 0) { throw "Extension validation failed." }

Get-ChildItem src,scripts -Recurse -File | Where-Object { $_.Extension -in @('.js', '.mjs') } | ForEach-Object {
  node --check $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax failed: $($_.FullName)" }
}

if ($createdPlaceholder) { Remove-Item $runtimeKeyFile -Force }
Write-Host "IceBreaker pre-push checks passed." -ForegroundColor Green
