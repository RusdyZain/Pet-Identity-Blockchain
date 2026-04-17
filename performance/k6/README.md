# K6 Performance Suite (Kompatibel Sepolia + RPC Lokal)

Panduan ini untuk pengguna baru setelah clone repo.

## 1. Yang Diuji

Flow utama:
- read-heavy traffic
- write-heavy blockchain flow
- auth burst
- trace/notification/correction/transfer flow

Metrik utama:
- `tx_submit_ms`
- `tx_confirm_ms`
- `rpc_error_rate`
- `nonce_conflict_count`
- `end_to_end_flow_latency`

## 2. Mode Signer (Penting)

Suite ini mendukung 2 mode signer:

1. `local_private_key` (disarankan untuk Sepolia public RPC)
- Sign challenge login lokal dari private key.
- Sign transaksi lokal, kirim lewat `eth_sendRawTransaction`.
- Tidak butuh `eth_accounts`, `personal_sign`, atau `eth_sendTransaction` dari RPC.

2. `rpc_unlocked` (untuk Ganache/Anvil/geth unlocked)
- Mengandalkan RPC wallet unlocked (`eth_accounts`, `personal_sign/eth_sign`, `eth_sendTransaction`).

`SIGNER_MODE=auto` akan otomatis pakai:
- `local_private_key` jika private key pool diisi
- `rpc_unlocked` jika private key pool kosong

## 3. Struktur Folder

```text
performance/k6/
  main.js
  scenarios.json
  .env.example
  run_cloud.ps1
  run_ci.sh
  lib/
  vendor/
```

## 4. Prasyarat

1. Backend up (`http://localhost:4000/health` mengembalikan `ok`).
2. RPC endpoint aktif (Sepolia/public/local sesuai mode).
3. k6 CLI terinstall.
4. Token Grafana Cloud (`K6_CLOUD_TOKEN`).

## 5. Quick Start (Windows)

### Step 1 - Install k6

```powershell
winget install -e --id k6.k6 --source winget
k6 version
```

### Step 2 - Siapkan env

```powershell
Copy-Item performance/k6/.env.example performance/k6/.env
```

Lalu edit `performance/k6/.env`.

Contoh **Sepolia (recommended)**:

```env
K6_PROFILE=ci
API_URL=http://localhost:4000
RPC_URL=https://sepolia.infura.io/v3/xxxx
CHAIN_ID=11155111

SIGNER_MODE=local_private_key

OWNER_PRIVATE_KEYS=0x...,0x...
CLINIC_PRIVATE_KEYS=0x...

# optional (kalau mau override hasil derive dari private key)
# OWNER_WALLET_ADDRESSES=0x...,0x...
# CLINIC_WALLET_ADDRESSES=0x...
```

Contoh **RPC unlocked (Ganache/Anvil)**:

```env
SIGNER_MODE=rpc_unlocked
RPC_URL=http://127.0.0.1:7545
CHAIN_ID=1337
OWNER_WALLET_ADDRESSES=0x...,0x...
CLINIC_WALLET_ADDRESSES=0x...
CHECK_UNLOCKED_WALLETS=true
```

### Step 3 - Login Grafana Cloud (sekali)

```powershell
$env:K6_CLOUD_TOKEN="isi_token"
k6 cloud login --token $env:K6_CLOUD_TOKEN
```

### Step 4 - Jalankan test

Jika API/RPC lokal/private network:

```powershell
powershell -ExecutionPolicy Bypass -File performance/k6/run_cloud.ps1 -Profile ci -LocalExecution -EnvFile performance/k6/.env
```

Jika target public (bisa diakses cloud runner):

```powershell
powershell -ExecutionPolicy Bypass -File performance/k6/run_cloud.ps1 -Profile baseline -EnvFile performance/k6/.env
```

## 6. Profil Skenario

Sumber tunggal: `performance/k6/scenarios.json`

Profil tersedia:
- `ci`
- `baseline`
- `spike`
- `stress`
- `soak`

## 7. Menjalankan Tanpa Wrapper Script

```powershell
k6 cloud run --local-execution performance/k6/main.js --env K6_PROFILE=ci
```

```powershell
k6 cloud run performance/k6/main.js --env K6_PROFILE=baseline
```

## 8. Troubleshooting

### A. `k6 : The term 'k6' is not recognized`
Install k6, tutup terminal, buka terminal baru, cek `k6 version`.

### B. Error `eth_accounts` / `personal_sign` / `eth_sendTransaction`
Kamu kemungkinan pakai Sepolia public RPC tapi mode masih `rpc_unlocked`.
Gunakan:
- `SIGNER_MODE=local_private_key`
- isi `OWNER_PRIVATE_KEYS` dan `CLINIC_PRIVATE_KEYS`

### C. `Nonce too low` / konflik nonce
Tambah wallet pool (hindari reuse wallet di VU tinggi), dan cek `nonce_conflict_count`.

### D. Cloud run tidak bisa akses localhost
Pakai `-LocalExecution`.

## 9. Keamanan

- Jangan commit private key/token ke git.
- Gunakan wallet test khusus load test, jangan wallet produksi.
