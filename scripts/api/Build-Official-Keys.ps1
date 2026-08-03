$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptRoot "..\..")).Path
$envFile = Join-Path $projectRoot "config\.env"
$outputFile = Join-Path $projectRoot "src\backend\config\official-api-keys.js"

if (-not (Test-Path $envFile)) {
  throw "config\.env was not found in the project root."
}

$values = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $parts = $line.Split("=", 2)
    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    $values[$name] = $value
  }
}

$required = @("GROQ_API_KEY_1", "GROQ_API_KEY_2", "OPENROUTER_API_KEY_1", "OPENROUTER_API_KEY_2")
foreach ($name in $required) {
  if (-not $values.ContainsKey($name) -or -not $values[$name] -or $values[$name] -match "PASTE_.*_HERE") {
    throw "Add a real value for $name in config\.env first."
  }
}

function JsString([string]$value) {
  return ($value | ConvertTo-Json -Compress)
}

$content = @"
// Generated from config/.env by scripts/api/Build-Official-Keys.ps1.
// WARNING: keys bundled in an unpacked or published Chrome extension are extractable.
export const OFFICIAL_API_KEYS = Object.freeze({
  groq: Object.freeze([
    $(JsString $values["GROQ_API_KEY_1"]),
    $(JsString $values["GROQ_API_KEY_2"])
  ]),
  openrouter: Object.freeze([
    $(JsString $values["OPENROUTER_API_KEY_1"]),
    $(JsString $values["OPENROUTER_API_KEY_2"])
  ])
});
"@

Set-Content -Path $outputFile -Value $content -Encoding UTF8
Write-Host "Official key configuration generated successfully." -ForegroundColor Green
Write-Host "Reload IceBreaker from chrome://extensions." -ForegroundColor Cyan
Write-Warning "These keys are inside the extension package and can be extracted. A backend proxy is safer for public distribution."
