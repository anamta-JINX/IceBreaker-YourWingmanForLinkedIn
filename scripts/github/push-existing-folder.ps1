param(
  [string]$RepositoryUrl = "https://github.com/anamta-JINX/IceBreaker---Your_Wingman_For_LinkedIn.git",
  [string]$CommitMessage = "Release IceBreaker v1.4.77"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

if (-not (Test-Path "manifest.json")) {
  throw "manifest.json was not found in $ProjectRoot"
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is not installed or is not available in PATH."
}

& powershell -ExecutionPolicy Bypass -File "scripts\github\pre-push-check.ps1"
if ($LASTEXITCODE -ne 0) {
  throw "The pre-push validation failed. Fix the reported problem before pushing."
}

if (-not (Test-Path ".git")) {
  git init
}

git branch -M main

$origin = git remote 2>$null | Where-Object { $_ -eq "origin" }
if ($origin) {
  git remote set-url origin $RepositoryUrl
} else {
  git remote add origin $RepositoryUrl
}

git add .
$changes = git status --porcelain
if ($changes) {
  git commit -m $CommitMessage
} else {
  Write-Host "No uncommitted changes were found."
}

git fetch origin
$remoteMain = git branch -r | Where-Object { $_.Trim() -eq "origin/main" }
if ($remoteMain) {
  $mergeBase = git merge-base main origin/main 2>$null
  if (-not $mergeBase) {
    git merge origin/main --allow-unrelated-histories -X ours -m "Merge existing GitHub history"
  } else {
    git merge origin/main -X ours -m "Merge latest GitHub history"
  }
}

git push -u origin main
Write-Host "IceBreaker was pushed to $RepositoryUrl" -ForegroundColor Green
