# Web-Blockchain Pet Identity Registry

Dokumentasi utama proyek skripsi untuk sistem identitas hewan berbasis wallet + blockchain.

## 1. Ringkasan
Sistem ini mengelola data hewan, catatan medis, transfer kepemilikan, notifikasi, dan trace publik dengan pola:
- Data detail disimpan di PostgreSQL.
- Bukti integritas transaksi disimpan di blockchain (hash + tx metadata).
- Login memakai wallet MetaMask (challenge + signature), bukan password.

## 2. Latar Belakang, Masalah, Tujuan, Batasan
### 2.1 Latar Belakang
Pencatatan data hewan sering tersebar dan sulit diaudit saat terjadi koreksi atau perubahan kepemilikan.

### 2.2 Rumusan Masalah
1. Bagaimana autentikasi pengguna tanpa password konvensional.
2. Bagaimana membuktikan aksi data yang penting telah tercatat di blockchain.
3. Bagaimana menjaga sinkronisasi antara data aplikasi (DB) dan data bukti (on-chain).

### 2.3 Tujuan
1. Menerapkan wallet-based authentication.
2. Menyimpan bukti transaksi on-chain (`txHash`, `blockNumber`, `blockTimestamp`) di DB.
3. Menyediakan alur operasional owner, clinic, admin, dan verifikasi publik.

### 2.4 Batasan
1. Blockchain dipakai sebagai lapisan bukti integritas, bukan penyimpanan data detail penuh.
2. Data sensitif dan query kompleks tetap di PostgreSQL.
3. Konsensus blockchain tidak diimplementasikan manual, hanya memakai jaringan PoA/PoS yang sudah ada.

## 3. Kebutuhan Sistem
### 3.1 Kebutuhan Fungsional
1. Login dan register berbasis wallet.
2. Registrasi pet, catatan medis, dan review koreksi dengan transaksi on-chain.
3. Simpan metadata transaksi on-chain di DB.
4. Otorisasi role: OWNER, CLINIC, ADMIN, PUBLIC_VERIFIER.
5. Trace publik berdasarkan `publicId`.

### 3.2 Kebutuhan Non-Fungsional
1. Integritas data: verifikasi event log dan sender transaction.
2. Keamanan: challenge auth sekali pakai + masa berlaku.
3. Auditabilitas: semua aksi penting menyimpan `txHash`, block info.
4. Maintainability: arsitektur frontend-backend terpisah.

## 4. Perancangan Sistem
### 4.1 Diagram Arsitektur
```mermaid
flowchart LR
    U[User: Owner/Clinic/Admin] --> FE[Frontend React + Vite]
    FE --> MM[MetaMask]
    FE --> BE[Backend Express + TypeORM]
    BE --> DB[(PostgreSQL)]
    MM --> RPC[RPC Node: Hardhat/Ganache/Besu/Sepolia/Goerli]
    BE --> RPC
    RPC --> SC[(PetIdentityRegistry Smart Contract)]
```

### 4.2 Diagram Use Case
```mermaid
flowchart TB
    Owner[OWNER] --> UC1[Register/Login Wallet]
    Owner --> UC2[Registrasi Pet]
    Owner --> UC3[Ajukan Koreksi]
    Owner --> UC4[Transfer Kepemilikan]
    Owner --> UC5[Lihat Notifikasi]

    Clinic[CLINIC] --> UC1
    Clinic --> UC6[Buat Catatan Medis]
    Clinic --> UC7[Verifikasi Catatan Medis]
    Clinic --> UC8[Review Koreksi]

    Admin[ADMIN] --> UC1
    Admin --> UC9[Kelola User]
    Admin --> UC10[Lihat Ringkasan Sistem]

    Public[PUBLIK] --> UC11[Trace by PublicId]
```

### 4.3 Sequence Diagram Wallet Authentication
```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant MM as MetaMask
    participant BE as Backend
    participant DB as PostgreSQL

    U->>FE: Connect Wallet
    FE->>MM: eth_requestAccounts
    MM-->>FE: walletAddress
    FE->>BE: POST /auth/wallet/challenge
    BE-->>FE: message + nonce + expiresAt
    FE->>MM: personal_sign(message)
    MM-->>FE: signature
    FE->>BE: POST /auth/register or /auth/login
    BE->>BE: verify signature + challenge
    alt Register
      BE->>DB: insert user + walletAddress
      BE-->>FE: user
    else Login
      BE->>DB: find user by walletAddress
      BE-->>FE: JWT + user
    end
```

### 4.4 Sequence Diagram Aksi On-Chain (Contoh Registrasi Pet)
```mermaid
sequenceDiagram
    participant FE as Frontend
    participant MM as MetaMask
    participant BE as Backend
    participant RPC as RPC Node
    participant DB as PostgreSQL

    FE->>BE: POST /pets/prepare-registration
    BE-->>FE: txRequest(to,data) + dataHash + publicId
    FE->>MM: eth_sendTransaction(txRequest)
    MM->>RPC: submit tx
    RPC-->>FE: txHash
    FE->>FE: wait receipt mined
    FE->>BE: POST /pets (payload + txHash)
    BE->>RPC: getTransactionReceipt(txHash)
    BE->>BE: parse PetRegistered event + validate sender/dataHash
    BE->>DB: save pet + tx metadata
    BE-->>FE: response success
```

### 4.5 ERD Ringkas
```mermaid
erDiagram
    USERS ||--o{ PETS : owns
    USERS ||--o{ MEDICAL_RECORDS : clinic_creates
    USERS ||--o{ MEDICAL_RECORDS : verifies
    USERS ||--o{ CORRECTION_REQUESTS : submits
    USERS ||--o{ CORRECTION_REQUESTS : reviews
    USERS ||--o{ NOTIFICATIONS : receives
    PETS ||--o{ MEDICAL_RECORDS : has
    PETS ||--o{ CORRECTION_REQUESTS : has
    PETS ||--o{ OWNERSHIP_HISTORY : tracks

    USERS {
      int id
      string email
      string role
      string wallet_address
    }
    PETS {
      int id
      string public_id
      int on_chain_pet_id
      string data_hash
      string tx_hash
      int block_number
      datetime block_timestamp
    }
    MEDICAL_RECORDS {
      int id
      int on_chain_record_id
      string data_hash
      string tx_hash
      int block_number
      datetime block_timestamp
    }
    CORRECTION_REQUESTS {
      int id
      string data_hash
      string tx_hash
      int block_number
      datetime block_timestamp
    }
```

## 5. Cara Kerja Wallet Authentication (Sederhana)
1. Frontend ambil wallet address dari MetaMask.
2. Backend membuat challenge message unik (`nonce`) yang berlaku 5 menit.
3. User menandatangani challenge di MetaMask.
4. Frontend kirim `walletAddress + message + signature` ke backend.
5. Backend recover address dari signature.
6. Jika cocok:
   - Register: simpan user baru.
   - Login: cari user berdasarkan wallet address, lalu buat JWT.
7. Challenge hanya sekali pakai. Jika sudah dipakai/expired, harus minta challenge baru.

## 6. Sinkronisasi On-Chain dan Database
Pola write endpoint penting:
1. Endpoint `prepare` mengembalikan `txRequest` (to + data).
2. Frontend kirim transaksi dengan MetaMask dan menunggu mined.
3. Frontend kirim `txHash` ke endpoint final backend.
4. Backend validasi:
   - transaksi benar ke kontrak yang benar,
   - status receipt sukses,
   - sender tx sama dengan wallet user login,
   - event log sesuai data hash dan entity id.
5. Backend simpan data ke DB plus:
   - `txHash`
   - `blockNumber`
   - `blockTimestamp`

## 7. Komponen Frontend dan Backend
### 7.1 Frontend
- `frontend/src/services/walletClient.ts`: connect wallet, sign challenge, send tx, wait receipt.
- `frontend/src/services/apiClient.ts`: seluruh REST client.
- `frontend/src/context/AuthContext.tsx`: state login JWT.
- `frontend/src/pages/auth/*`: register/login wallet.

### 7.2 Backend
- `backend/src/services/authService.ts`: challenge, verify signature, register/login.
- `backend/src/blockchain/petIdentityClient.ts`: prepare tx + verify receipt/event.
- `backend/src/controllers/*`: implementasi flow per modul.
- `backend/src/config/ensureSchema.ts`: penyesuaian schema otomatis saat startup.

## 8. Daftar Endpoint Utama
### 8.1 Auth
- `POST /auth/wallet/challenge`
- `POST /auth/register`
- `POST /auth/login`

### 8.2 Pet
- `POST /pets/prepare-registration`
- `POST /pets`
- `GET /pets`
- `GET /pets/:id`
- `GET /pets/:petId/ownership-history`

### 8.3 Medical Record
- `POST /pets/:petId/medical-records/prepare`
- `POST /pets/:petId/medical-records`
- `PATCH /medical-records/:id/verify/prepare`
- `PATCH /medical-records/:id/verify`

### 8.4 Correction
- `GET /corrections`
- `PATCH /corrections/:id/prepare`
- `PATCH /corrections/:id`

### 8.5 Lainnya
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `GET /trace/:publicId`
- `GET /admin/summary`
- `GET|POST|PATCH|DELETE /admin/users`
- `GET /admin/pets`

## 9. Persiapan Lingkungan
1. Node.js 20+ (disarankan 24 sesuai pengembangan repo).
2. PostgreSQL aktif.
3. MetaMask di browser.
4. RPC blockchain (local/testnet).

## 10. Konfigurasi Environment
### 10.1 Backend `.env`
Minimal:
```ini
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB_NAME
JWT_SECRET=your_jwt_secret
PORT=4000
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
PET_IDENTITY_ADDRESS=0xYourDeployedContract
```

Untuk deploy Hardhat (opsional sesuai target):
```ini
DEPLOYER_PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://...
GOERLI_RPC_URL=https://...
GANACHE_RPC_URL=http://127.0.0.1:7545
GANACHE_CHAIN_ID=1337
BESU_CLIQUE_RPC_URL=http://127.0.0.1:8545
BESU_CLIQUE_CHAIN_ID=1337
```

### 10.2 Frontend `.env`
```ini
VITE_API_URL=http://localhost:4000
```

## 11. Instalasi dan Migrasi
### 11.1 Backend
```powershell
cd backend
npm install
npx prisma migrate deploy
npm run chain:compile
```

### 11.2 Frontend
```powershell
cd frontend
npm install
```

## 12. Deploy Smart Contract
### 12.1 Local Hardhat
```powershell
cd backend
npm run deploy:localhost
```

### 12.2 PoS Testnet
```powershell
cd backend
npm run deploy:sepolia
# atau
npm run deploy:goerli
```

### 12.3 PoA Local
```powershell
cd backend
npm run deploy:ganache
# atau
npm run deploy:besu
```

Setelah deploy, update `PET_IDENTITY_ADDRESS` dengan alamat kontrak terbaru.

## 13. Cara Menjalankan Aplikasi
### 13.1 Full Local dari Nol (4 terminal)
1. Terminal A:
```powershell
cd backend
npx hardhat node
```
2. Terminal B:
```powershell
cd backend
npm run deploy:localhost
```
3. Terminal C:
```powershell
cd backend
npm run dev
```
4. Terminal D:
```powershell
cd frontend
npm run dev
```

### 13.2 Harian (tanpa deploy ulang kontrak)
Biasanya cukup 3 terminal: node blockchain, backend, frontend.

## 14. Skenario Operasional Awam
1. Buka frontend.
2. Register OWNER (`/register`) dengan wallet MetaMask.
3. Login wallet (`/login`).
4. Buat data pet.
5. Saat transaksi muncul di MetaMask, klik confirm.
6. Sistem menyimpan data pet + bukti transaksi on-chain.

## 15. Pengujian Performa (Locust)
Folder: `performance/`
- `locustfile.py`
- `run_scenarios.ps1`
- skenario 10, 50, 100 user

Ringkas:
```powershell
pip install -r performance/requirements.txt
powershell -ExecutionPolicy Bypass -File performance/run_scenarios.ps1
```

## 16. Troubleshooting Umum
1. `Wallet is not registered`
   - Wallet belum lewat endpoint register.
2. `Wallet challenge expired`
   - Minta challenge baru dan sign ulang.
3. `Transaction sender does not match authenticated wallet`
   - Wallet login berbeda dengan wallet yang kirim transaksi.
4. `could not create unique index users_wallet_address_key`
   - Data wallet lama duplikat; startup sekarang sudah ada dedup otomatis di `ensureSchema`.
5. `Missing BLOCKCHAIN_RPC_URL` atau `Missing PET_IDENTITY_ADDRESS`
   - Cek `.env` backend.
6. Frontend tidak bisa hit backend
   - Cek `frontend/.env` `VITE_API_URL`.
7. Belum punya akun ADMIN awal
   - Register dulu sebagai OWNER, lalu ubah role via SQL:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'email_admin@contoh.com';
```

## 17. Struktur Direktori
```text
backend/
  contracts/
  scripts/
  src/
    blockchain/
    controllers/
    routes/
    services/
    entities/
  prisma/
frontend/
  src/
    pages/
    services/
    context/
performance/
```
