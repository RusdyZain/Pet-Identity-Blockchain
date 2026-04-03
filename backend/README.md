# Backend Setup and Test Guide

Panduan ini fokus untuk menjalankan API backend, deploy smart contract, dan verifikasi hasil testing end-to-end.

## 1. Stack Backend

1. API: Express + TypeORM.
2. Database: PostgreSQL.
3. Smart contract tooling: Hardhat.
4. Auth: wallet challenge + signature (`/auth/wallet/challenge`, `/auth/register`, `/auth/login`).
5. On-chain write flow: `prepare -> sign/send tx via MetaMask -> submit txHash -> backend verifikasi receipt/event -> simpan ke DB`.

## 2. Prerequisites

1. Node.js 20+.
2. PostgreSQL aktif.
3. Salah satu node blockchain:
   - PoA lokal: Ganache (direkomendasikan untuk awal).
   - PoS testnet: Sepolia (opsional tahap lanjut).
4. MetaMask browser extension.

## 3. Install Dependencies

```powershell
cd backend
npm install
npx prisma migrate deploy
npm run chain:compile
```

## 4. Konfigurasi `.env`

Buat/isi file `backend/.env` dengan pola ini.

```ini
DATABASE_URL=postgresql://postgres:password@localhost:5432/pet_identity
JWT_SECRET=changeme
PORT=4000

# Backend RPC target (HARUS sama network yang dipakai frontend/MetaMask)
BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545
PET_IDENTITY_ADDRESS=0xYourContractAddress

# Deploy account for hardhat scripts
DEPLOYER_PRIVATE_KEY=0xYOUR_64_HEX_PRIVATE_KEY

# PoA local (Ganache)
GANACHE_RPC_URL=http://127.0.0.1:7545
GANACHE_CHAIN_ID=1337

# PoS testnet (Sepolia/Goerli) - isi jika dipakai
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
GOERLI_RPC_URL=https://eth-goerli.g.alchemy.com/v2/your-key
```

Catatan:
1. `DEPLOYER_PRIVATE_KEY` wajib 32-byte hex (64 karakter hex setelah `0x`).
2. `BLOCKCHAIN_RPC_URL` wajib menunjuk ke network yang sama dengan contract address.
3. Backend saat startup menjalankan `ensureSchema` untuk menambah kolom/index baru dan dedupe `wallet_address` lama jika duplikat.

## 5. Deploy Smart Contract

### 5.1 PoA Lokal (Ganache)

```powershell
cd backend
npm run deploy:ganache
```

Ambil output alamat contract, contoh:

```text
PetIdentityRegistry deployed to: 0xB8052Bfad575767BA1a109Da85E192020F73AaE3
```

Lalu update `PET_IDENTITY_ADDRESS` di `.env` backend.

### 5.2 PoS Testnet (Sepolia)

```powershell
cd backend
npm run deploy:sepolia
```

Setelah deploy sukses, update:

1. `PET_IDENTITY_ADDRESS` ke alamat kontrak Sepolia.
2. `BLOCKCHAIN_RPC_URL` ke endpoint Sepolia.

## 6. Menjalankan Backend

```powershell
cd backend
npm run dev
```

Cek health:

- `GET http://localhost:4000/health` harus return `{"status":"ok"}`.

## 7. Urutan Terminal untuk Uji Lokal PoA

Rekomendasi 4 terminal:

1. Terminal A: jalankan Ganache (GUI atau CLI) pada `127.0.0.1:7545`.
2. Terminal B: deploy contract (`npm run deploy:ganache`).
3. Terminal C: jalankan backend (`npm run dev`).
4. Terminal D: jalankan frontend (`cd ../frontend && npm run dev`).

## 8. Urutan Terminal untuk Uji PoS (Sepolia)

1. Pastikan `backend/.env` berisi:
   - `SEPOLIA_RPC_URL=https://...`
   - `BLOCKCHAIN_RPC_URL=https://...` (endpoint Sepolia yang sama)
   - `DEPLOYER_PRIVATE_KEY=0x...` (akun deployer yang punya Sepolia ETH)
2. Deploy contract:
```powershell
cd backend
npm run deploy:sepolia
```
3. Update `PET_IDENTITY_ADDRESS` di `backend/.env` dengan alamat hasil deploy Sepolia.
4. Jalankan backend:
```powershell
cd backend
npm run dev
```
5. Jalankan frontend di terminal terpisah:
```powershell
cd frontend
npm run dev
```
6. Pastikan MetaMask berada di jaringan Sepolia.

## 9. Skenario Uji Manual End-to-End

1. Buka frontend `http://localhost:5173/register`.
2. Register wallet OWNER (connect wallet + sign challenge).
3. Login di `http://localhost:5173/login` (connect wallet + sign challenge).
4. Buka halaman daftar hewan (`/owner/pets/new`), isi form, submit.
5. Approve transaksi di MetaMask.
6. Frontend kirim `txHash` ke backend.
7. Backend verifikasi receipt/event/sender lalu simpan data ke DB.

## 10. Cek Hasil Testing

### 10.1 Cek Blockchain (Ganache/Sepolia explorer)

1. Pastikan transaksi muncul.
2. `to` harus alamat kontrak `PET_IDENTITY_ADDRESS`.
3. Status transaksi sukses/mined.

### 10.2 Cek Database PostgreSQL

```sql
SELECT id, wallet_address
FROM users
WHERE wallet_address IS NOT NULL
ORDER BY id DESC
LIMIT 10;

SELECT id, public_id, tx_hash, block_number, block_timestamp
FROM pets
ORDER BY created_at DESC
LIMIT 10;

SELECT id, pet_id, tx_hash, block_number, block_timestamp
FROM medical_records
ORDER BY created_at DESC
LIMIT 10;
```

Jika `tx_hash`, `block_number`, `block_timestamp` terisi, sinkronisasi on-chain -> DB berhasil.

## 11. Load Test (Locust)

Folder load test ada di `../performance`.

```powershell
cd ..
py -m pip install -r performance/requirements.txt

$env:API_URL="http://localhost:4000"
$env:RPC_URL="http://127.0.0.1:7545"
$env:OWNER_PRIVATE_KEYS="0xkey1,0xkey2"
$env:CLINIC_PRIVATE_KEYS="0xkey3,0xkey4"

powershell -ExecutionPolicy Bypass -File performance/run_scenarios.ps1
```

Skenario yang dijalankan:

1. 10 user concurrency.
2. 50 user concurrency.
3. 100 user concurrency.

Laporan ada di `performance/reports` (`*_stats.csv`, `*_failures.csv`, `*_stats_history.csv`).

## 12. Troubleshooting

1. `Error HH8 ... private key too short`.
   - Perbaiki `DEPLOYER_PRIVATE_KEY` agar valid 32-byte hex.
2. `Wallet is not registered` saat login.
   - Jalankan register wallet dulu di `/register` dengan alamat yang sama.
3. `Transaction sender does not match authenticated wallet`.
   - Wallet login harus sama dengan wallet yang approve transaksi on-chain.
4. `could not create unique index users_wallet_address_key`.
   - Backend sudah dedupe otomatis saat startup; restart backend setelah update kode terbaru.
5. `Assertion failed ... UV_HANDLE_CLOSING` setelah deploy.
   - Biasanya muncul saat shutdown process; jika alamat kontrak tercetak dan file `deployed/petIdentity.json` terupdate, deploy tetap berhasil.
6. Transaksi tidak muncul di Ganache.
   - Cek MetaMask network, chainId, dan RPC harus sama dengan Ganache.

## 13. Referensi Endpoint Utama

1. `POST /auth/wallet/challenge`
2. `POST /auth/register`
3. `POST /auth/login`
4. `POST /pets/prepare-registration`
5. `POST /pets`
6. `POST /pets/:petId/medical-records/prepare`
7. `POST /pets/:petId/medical-records`
8. `PATCH /medical-records/:id/verify/prepare`
9. `PATCH /medical-records/:id/verify`
10. `PATCH /corrections/:id/prepare`
11. `PATCH /corrections/:id`
