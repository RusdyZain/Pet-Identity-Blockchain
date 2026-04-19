param(
  [string]$Profile = "ci",
  [switch]$LocalExecution,
  [string]$EnvFile = "",
  [string]$Stack = ""
)

$ErrorActionPreference = "Stop"

$k6EnvForwardKeys = @(
  "API_URL",
  "RPC_URL",
  "CHAIN_ID",
  "SIGNER_MODE",
  "OWNER_PRIVATE_KEYS",
  "CLINIC_PRIVATE_KEYS",
  "OWNER_WALLET_ADDRESSES",
  "CLINIC_WALLET_ADDRESSES",
  "OWNER_ADDRESSES",
  "CLINIC_ADDRESSES",
  "OWNER_WALLET_EMAILS",
  "CLINIC_WALLET_EMAILS",
  "STRICT_WALLET_POOL",
  "CHECK_UNLOCKED_WALLETS",
  "LOG_RPC_ERRORS",
  "TRANSFER_ACCEPT_ENABLED",
  "OWNER_SECONDARY_OFFSET",
  "TRACE_PUBLIC_IDS",
  "TX_GAS_LIMIT",
  "TX_TIMEOUT_MS",
  "TX_POLL_INTERVAL_MS",
  "TX_MAX_RETRIES",
  "USE_EIP1559",
  "MAX_PRIORITY_FEE_GWEI",
  "MAX_FEE_MULTIPLIER",
  "THROUGHPUT_MIN_RPS"
)

function Import-EnvFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw "Env file not found: $Path"
  }

  $loaded = @{}

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
      $loaded[$key] = $value
    }
  }

  return $loaded
}

function Add-K6EnvArg {
  param(
    [ref]$ArgsRef,
    [string]$Key,
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Key) -or [string]::IsNullOrWhiteSpace($Value)) {
    return
  }

  $ArgsRef.Value += "--env"
  $ArgsRef.Value += "$Key=$Value"
}

function Build-DisplayCommand {
  param([string[]]$CommandArgs)

  $display = @()
  $sensitiveKeyPattern = '(_PRIVATE_KEYS?|TOKEN|SECRET|PASSWORD)'

  for ($i = 0; $i -lt $CommandArgs.Count; $i++) {
    $item = $CommandArgs[$i]

    if ($item -eq "--env" -and ($i + 1) -lt $CommandArgs.Count) {
      $envPair = $CommandArgs[$i + 1]
      $display += $item

      $parts = $envPair -split "=", 2
      if ($parts.Count -eq 2 -and $parts[0] -match $sensitiveKeyPattern) {
        $display += "$($parts[0])=***REDACTED***"
      } else {
        $display += $envPair
      }

      $i++
      continue
    }

    $display += $item
  }

  return $display
}

$loadedEnv = @{}
if ($EnvFile) {
  $loadedEnv = Import-EnvFile -Path $EnvFile
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

foreach ($key in $k6EnvForwardKeys) {
  $value = $null

  if ($loadedEnv.ContainsKey($key)) {
    $value = $loadedEnv[$key]
  } else {
    $value = [System.Environment]::GetEnvironmentVariable($key, "Process")
  }

  Add-K6EnvArg -ArgsRef ([ref]$cmd) -Key $key -Value $value
}

Add-K6EnvArg -ArgsRef ([ref]$cmd) -Key "K6_PROFILE" -Value $Profile

Write-Host "Running Grafana Cloud k6 profile '$Profile'"
$displayCmd = Build-DisplayCommand -CommandArgs $cmd
Write-Host "Command: k6 $($displayCmd -join ' ')"

& k6 @cmd
