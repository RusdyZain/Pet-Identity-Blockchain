# Performance Test Suite

Folder `performance/` punya 2 pendekatan:

1. **K6 Grafana Cloud-first (utama)** -> `performance/k6/`
2. **Locust (legacy, referensi lama)** -> `performance/locustfile.py`

## Untuk Pemula (Mulai dari Sini)

1. Buka panduan utama K6: `performance/k6/README.md`.
2. Copy env template:

```powershell
Copy-Item performance/k6/.env.example performance/k6/.env
```

3. Isi `performance/k6/.env`:
   - `SIGNER_MODE=local_private_key` + `OWNER_PRIVATE_KEYS/CLINIC_PRIVATE_KEYS` untuk Sepolia/public RPC.
   - atau `SIGNER_MODE=rpc_unlocked` + wallet address untuk Ganache/Anvil unlocked.
4. Jalankan:

```powershell
# endpoint localhost/private
powershell -ExecutionPolicy Bypass -File performance/k6/run_cloud.ps1 -Profile ci -LocalExecution -EnvFile performance/k6/.env
```

```powershell
# endpoint public
powershell -ExecutionPolicy Bypass -File performance/k6/run_cloud.ps1 -Profile baseline -EnvFile performance/k6/.env
```

## Legacy Locust

Implementasi lama tetap disimpan untuk referensi historis:
- `performance/locustfile.py`
- `performance/run_scenarios.ps1`
