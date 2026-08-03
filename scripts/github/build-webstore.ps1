$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $projectRoot
$manifest = Get-Content manifest.json -Raw | ConvertFrom-Json
$version = $manifest.version
$work = Join-Path $projectRoot "build\webstore\IceBreaker"
$outDir = Join-Path $projectRoot "release"
$outFile = Join-Path $outDir "IceBreaker-v$version-WebStore.zip"

Remove-Item (Join-Path $projectRoot "build\webstore") -Recurse -Force -ErrorAction SilentlyContinue
New-Item (Join-Path $work "src\backend\config") -ItemType Directory -Force | Out-Null
New-Item $outDir -ItemType Directory -Force | Out-Null

Copy-Item manifest.json $work
Copy-Item assets $work -Recurse
Copy-Item "src\backend" (Join-Path $work "src") -Recurse
Copy-Item "src\frontend" (Join-Path $work "src") -Recurse
Copy-Item "src\backend\config\official-api-keys.example.js" (Join-Path $work "src\backend\config\official-api-keys.js") -Force

Compress-Archive -Path (Join-Path $work "*") -DestinationPath $outFile -Force
Write-Host "Created $outFile" -ForegroundColor Green
