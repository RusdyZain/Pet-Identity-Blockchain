$ErrorActionPreference = "Stop"

if (-not $env:API_URL) {
  $env:API_URL = "http://localhost:4000"
}

$reportsDir = Join-Path $PSScriptRoot "reports"
New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null

$scenarios = @(
  @{ Name = "users_10"; Users = 10; Spawn = 2; Duration = "5m" },
  @{ Name = "users_50"; Users = 50; Spawn = 10; Duration = "5m" },
  @{ Name = "users_100"; Users = 100; Spawn = 20; Duration = "5m" }
)

foreach ($scenario in $scenarios) {
  $csvPrefix = Join-Path $reportsDir $scenario.Name
  Write-Host "Running $($scenario.Name) ($($scenario.Users) users)"
  locust `
    -f (Join-Path $PSScriptRoot "locustfile.py") `
    --headless `
    --host $env:API_URL `
    -u $scenario.Users `
    -r $scenario.Spawn `
    -t $scenario.Duration `
    --csv $csvPrefix `
    --csv-full-history
}

Write-Host "All scenarios complete. Reports stored at $reportsDir"
