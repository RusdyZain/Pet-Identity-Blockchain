param(
  [string]$Profile = "ci",
  [switch]$LocalExecution,
  [string]$EnvFile = "",
  [string]$Stack = ""
)

$ErrorActionPreference = "Stop"

function Import-EnvFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw "Env file not found: $Path"
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) {
      return
    }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if ($key.Length -gt 0) {
      [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

if ($EnvFile) {
  Import-EnvFile -Path $EnvFile
}

if (-not $env:K6_CLOUD_TOKEN) {
  throw "K6_CLOUD_TOKEN wajib di-set. Isi via env atau file .env."
}

if ($Stack) {
  [System.Environment]::SetEnvironmentVariable("K6_CLOUD_STACK", $Stack, "Process")
}

$scriptPath = Join-Path $PSScriptRoot "main.js"

$cmd = @("cloud", "run")
if ($LocalExecution.IsPresent) {
  $cmd += "--local-execution"
}
$cmd += $scriptPath
$cmd += "--env"
$cmd += "K6_PROFILE=$Profile"

Write-Host "Running Grafana Cloud k6 profile '$Profile'"
Write-Host "Command: k6 $($cmd -join ' ')"

& k6 @cmd
