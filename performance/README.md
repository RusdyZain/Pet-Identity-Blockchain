# Load Test (Locust)

## Setup

1. Install dependencies:
   - `pip install -r performance/requirements.txt`
2. Set env vars:
   - `API_URL`
   - `RPC_URL`
   - `CHAIN_ID` (optional, auto-detected if omitted)
   - `OWNER_PRIVATE_KEYS` (comma-separated private keys)
   - `CLINIC_PRIVATE_KEYS` (comma-separated private keys)
3. Ensure all wallets are registered on the target chain and have test ETH for gas.

## Run all scenarios

- `powershell -ExecutionPolicy Bypass -File performance/run_scenarios.ps1`

Scenarios:
- `10` concurrent users
- `50` concurrent users
- `100` concurrent users

Duration per scenario: `5 minutes`.

## Metrics to collect

From Locust CSV output in `performance/reports`:
- `*_stats.csv`:
  - Throughput/TPS: requests per second (`Requests/s`)
  - Latency: `Median`, `95%`, `99%` response time
  - Error rate: `# Fails / # Requests`
- `*_failures.csv`: failure breakdown by endpoint/error
- `*_stats_history.csv`: time-series trend for TPS and latency
