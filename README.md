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

### 4.3 Sequence Diagram
### 4.3.1 Sequence Diagram Wallet Authentication
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
### 4.3.2 Sequence Diagram Admin
```mermaid
sequenceDiagram
    participant A as Admin (Contract Owner)
    participant FE as Frontend
    participant MM as MetaMask
    participant SC as Smart Contract

    A->>FE: Input Alamat Wallet Klinik Baru
    FE->>MM: Request Sign (addClinic)
    MM->>SC: call addClinic(newClinicAddress)
    
    Note over SC: Cek: msg.sender == contractOwner?
    
    alt Jika Pengirim adalah Owner
        SC->>SC: clinics[newClinicAddress] = true
        SC-->>FE: emit ClinicAccessUpdated(Success)
        FE-->>A: Notifikasi: Klinik Berhasil Terdaftar
    else Jika Pengirim BUKAN Owner
        SC-->>FE: Revert: "Not contract owner"
        FE-->>A: Notifikasi: Transaksi Gagal
    end
```

### 4.3.3 Sequence Diagram Owner
```mermaid
sequenceDiagram
    participant O as Pet Owner
    participant FE as Frontend
    participant BE as Backend (IPFS/DB)
    participant MM as MetaMask
    participant SC as Smart Contract

    O->>FE: Input Data Hewan (Nama, Ras, Foto)
    FE->>BE: Upload Data
    BE-->>FE: Return dataHash (Keccak256)
    FE->>MM: Request Sign Transaction
    MM->>SC: registerPet(dataHash)
    SC->>SC: Generate petId & Store Pet Struct
    SC-->>FE: Event: PetRegistered(petId)
    FE-->>O: Registrasi Selesai (ID Muncul)
```
### 4.3.4 Sequence Diagram Clinic
```mermaid
sequenceDiagram
    participant C as Clinic Wallet
    participant FE as Frontend
    participant BE as Backend
    participant SC as Smart Contract

    C->>FE: Cari Pet ID & Input Catatan Medis
    FE->>BE: Generate dataHash Catatan
    FE->>SC: addMedicalRecord(petId, dataHash)
    Note over SC: Modifier: onlyClinic
    SC->>SC: Push to medicalRecords[petId] (Status: PENDING)
    SC-->>FE: Event: MedicalRecordAdded(recordId)
    
    Note over C, SC: Proses Verifikasi (Opsional)
    
    C->>FE: Klik Verifikasi Catatan
    FE->>SC: verifyMedicalRecord(recordId, VERIFIED)
    SC->>SC: Update Status & verifiedBy
    SC-->>FE: Event: MedicalRecordReviewed
    FE-->>C: Catatan Medis Terverifikasi
```


### 4.3.5 Sequence Diagram Public Verifier
```mermaid
sequenceDiagram
    participant P as Public Verifier (Guest)
    participant FE as Frontend
    participant BE as Backend
    participant RPC as RPC Node
    participant DB as PostgreSQL

    P->>FE: Input ID Hewan atau Scan QR (dataHash)
    FE->>BE: GET /pets/verify/:id
    
    par Ambil Data Blockchain
        BE->>RPC: getPet(petId) / getMedicalRecords(petId)
        RPC-->>BE: dataHash, ownerAddr, verifiedStatus, clinicAddr
    and Ambil Data Backend
        BE->>DB: find pet metadata (Nama, Foto, Deskripsi)
        DB-->>BE: pet metadata + medical description
    end

    BE->>BE: Reconstruct & Compare Data
    Note over BE: Memastikan data di DB cocok dengan dataHash di Blockchain

    BE-->>FE: Response: Verified Pet Data + History
    FE-->>P: Tampilkan Profil Hewan & Centang Biru (Blockchain Verified)
```

### 4.4 Sequence Diagram Aksi On-Chain 
### 4.4.1 Sequence Diagram Aksi On-Chain Pendaftaran Hewan
```mermaid
sequenceDiagram
    participant O as Pet Owner
    participant FE as Frontend
    participant BE as Backend
    participant MM as MetaMask
    participant RPC as RPC Node
    participant DB as PostgreSQL

    O->>FE: Isi Form Identitas Hewan
    FE->>BE: POST /pets/prepare-registration
    BE->>BE: Generate dataHash (Keccak256)
    BE-->>FE: txRequest (registerPet) + dataHash
    FE->>MM: eth_sendTransaction
    MM->>RPC: submit tx
    RPC-->>FE: txHash
    FE->>FE: Wait confirmation
    FE->>BE: POST /pets/confirm (payload + txHash)
    BE->>RPC: eth_getTransactionReceipt
    BE->>BE: Parse PetRegistered event (get petId)
    BE->>DB: Save Pet Profile + petId + txHash
    BE-->>FE: Response: Hewan Berhasil Terdaftar
```
### 4.4.2 Sequence Diagram Aksi On-Chain Pendaftaran Klinik
```mermaid
sequenceDiagram
    participant A as Admin (Contract Owner)
    participant FE as Frontend
    participant BE as Backend
    participant MM as MetaMask
    participant RPC as RPC Node
    participant DB as PostgreSQL

    A->>FE: Input Alamat Wallet Klinik
    FE->>BE: POST /clinics/prepare-access
    BE-->>FE: txRequest (to: addClinic, data: encodedAddr)
    FE->>MM: eth_sendTransaction
    MM->>RPC: submit tx
    RPC-->>FE: txHash
    FE->>FE: Wait confirmation
    FE->>BE: POST /clinics/verify (txHash)
    BE->>RPC: eth_getTransactionReceipt
    BE->>BE: Validate ClinicAccessUpdated event
    BE->>DB: Update clinic status to 'VERIFIED'
    BE-->>FE: Response: Klinik Berhasil Aktif
```
### 4.4.3 Sequence Diagram Aksi On-Chain Penambahan Catatan Medis
```mermaid
sequenceDiagram
    participant C as Clinic Wallet
    participant FE as Frontend
    participant BE as Backend
    participant MM as MetaMask
    participant RPC as RPC Node
    participant DB as PostgreSQL

    C->>FE: Pilih Pet + Input Rekam Medis (Vaksin, dsb)
    FE->>BE: POST /medical/prepare-record
    BE->>BE: Generate medicalDataHash
    BE-->>FE: txRequest (addMedicalRecord)
    FE->>MM: eth_sendTransaction
    MM->>RPC: submit tx
    
    Note over RPC, MM: Jika wallet belum terdaftar di SC, RPC akan REVERT 'Caller is not clinic'
    
    RPC-->>FE: txHash
    FE->>FE: Wait confirmation
    FE->>BE: POST /medical/confirm (txHash)
    BE->>RPC: eth_getTransactionReceipt
    BE->>BE: Parse MedicalRecordAdded event (get recordId)
    BE->>DB: Save Medical Record + Status: PENDING
    BE-->>FE: Response: Catatan Medis Terunggah
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

Kebijakan akun wallet-based:
1. Login tetap via challenge + signature wallet (tanpa password form).
2. Admin tidak dapat mengubah password akun.
3. Admin tidak dapat menghapus akun yang sudah terikat `walletAddress` blockchain.

### 8.6 Pemisahan Halaman Frontend per Role
1. OWNER (`/owner/*`)
   - Dashboard owner, registrasi hewan, detail hewan, riwayat medis, ajukan koreksi, transfer kepemilikan, notifikasi owner, akun owner.
2. CLINIC (`/clinic/*`)
   - Dashboard klinik, detail pasien, tambah catatan medis, verifikasi pending, review koreksi, notifikasi klinik.
3. ADMIN (`/admin/*`)
   - Dashboard admin, manajemen akun/role, daftar semua hewan.
4. Setiap route dibatasi `ProtectedRoute` berdasarkan role sehingga owner dan klinik memiliki halaman + fungsi yang berbeda.

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

# Optional: bootstrap ADMIN otomatis saat backend startup
ADMIN_SEED_ENABLED=true
ADMIN_NAME=Super Admin
ADMIN_EMAIL=admin@example.com
ADMIN_WALLET_ADDRESS=0xYourAdminWalletAddress
# Optional: hanya hash internal bootstrap; login tetap via wallet
ADMIN_PASSWORD=isi_jika_perlu
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

# Target chain MetaMask (pilih sesuai mode run)
VITE_CHAIN_ID=1337
VITE_CHAIN_NAME=Ganache Local
VITE_CHAIN_RPC_URL=http://127.0.0.1:7545
VITE_CHAIN_CURRENCY_SYMBOL=ETH
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

### 11.3 Tentang `db:seed` dan Setup Laptop Baru
1. Tidak perlu menjalankan `npm run db:seed` (script itu tidak dipakai di repo ini).
2. Untuk admin awal, gunakan seed otomatis via `backend/.env`:
```ini
ADMIN_SEED_ENABLED=true
ADMIN_EMAIL=admin@example.com
ADMIN_WALLET_ADDRESS=0xYourAdminWalletAddress
```
3. Seed admin otomatis berjalan saat backend start (`npm run dev` atau `npm run start`).
4. Cek log backend untuk memastikan:
   - `[seed-admin] Admin created for ...`
   - `[seed-admin] Admin synced for ...`

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

## 13. Cara Menjalankan Aplikasi (PoA dan PoS)
### 13.1 Mode PoA Lokal (Ganache) - Rekomendasi Demo Skripsi
1. Isi `backend/.env`:
```ini
BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545
GANACHE_RPC_URL=http://127.0.0.1:7545
GANACHE_CHAIN_ID=1337
DEPLOYER_PRIVATE_KEY=0xPRIVATE_KEY_AKUN_GANACHE_BERSALDO
```
2. Isi `frontend/.env`:
```ini
VITE_API_URL=http://localhost:4000
VITE_CHAIN_ID=1337
VITE_CHAIN_NAME=Ganache Local
VITE_CHAIN_RPC_URL=http://127.0.0.1:7545
VITE_CHAIN_CURRENCY_SYMBOL=ETH
```
3. Terminal A: jalankan Ganache (GUI/CLI) di `127.0.0.1:7545`.
4. Terminal B: deploy kontrak ke Ganache.
```powershell
cd backend
npm run deploy:ganache
```
5. Salin alamat hasil deploy ke `backend/.env`:
```ini
PET_IDENTITY_ADDRESS=0xAlamatKontrakHasilDeploy
```
6. Terminal C: jalankan backend.
```powershell
cd backend
npm run dev
```
7. Terminal D: jalankan frontend.
```powershell
cd frontend
npm run dev
```
8. Pastikan MetaMask berada di network Ganache chainId `1337`.

### 13.2 Mode PoS Testnet (Sepolia)
1. Siapkan Sepolia ETH untuk akun deployer (faucet).
2. Isi `backend/.env`:
```ini
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
DEPLOYER_PRIVATE_KEY=0xPRIVATE_KEY_AKUN_SEPOLIA
```
3. Deploy kontrak ke Sepolia:
```powershell
cd backend
npm run deploy:sepolia
```
4. Salin alamat hasil deploy ke:
```ini
PET_IDENTITY_ADDRESS=0xAlamatKontrakSepolia
```
5. Isi `frontend/.env`:
```ini
VITE_API_URL=http://localhost:4000
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=Sepolia
VITE_CHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
VITE_CHAIN_CURRENCY_SYMBOL=ETH
```
6. Jalankan backend dan frontend:
```powershell
cd backend
npm run dev
```
```powershell
cd frontend
npm run dev
```
7. Pastikan MetaMask di Sepolia dan wallet punya Sepolia ETH untuk gas.

### 13.3 Mode Local Hardhat Node (Opsional)
Mode ini bukan PoA/PoS nyata, hanya local dev chain dari Hardhat.
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
3. Set `backend/.env`:
```ini
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
PET_IDENTITY_ADDRESS=0xAlamatKontrakLocalhost
```
4. Set `frontend/.env`:
```ini
VITE_CHAIN_ID=31337
VITE_CHAIN_NAME=Hardhat Local
VITE_CHAIN_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_CURRENCY_SYMBOL=ETH
```
5. Jalankan backend + frontend (`npm run dev` masing-masing).

### 13.4 Harian (tanpa deploy ulang kontrak)
Biasanya cukup 3 terminal: node blockchain, backend, frontend.

## 14. Skenario Operasional Awam
1. Buka frontend.
2. Register OWNER (`/register`) dengan wallet MetaMask.
3. Login wallet (`/login`).
4. Buat data pet.
5. Saat transaksi muncul di MetaMask, klik confirm.
6. Sistem menyimpan data pet + bukti transaksi on-chain.

## 15. Pengujian Performa (K6 + Grafana Cloud)
Folder utama: `performance/k6/`

Panduan detail untuk pemula ada di:
- `performance/k6/README.md`

Ringkas (copy-paste friendly):
```powershell
# dari root project
Copy-Item performance/k6/.env.example performance/k6/.env
# edit performance/k6/.env: isi token, API/RPC, lalu pilih signer mode
# - Sepolia/public RPC: SIGNER_MODE=local_private_key + OWNER_PRIVATE_KEYS/CLINIC_PRIVATE_KEYS
# - Ganache unlocked: SIGNER_MODE=rpc_unlocked + OWNER_WALLET_ADDRESSES/CLINIC_WALLET_ADDRESSES

# jika API/RPC masih localhost/private
powershell -ExecutionPolicy Bypass -File performance/k6/run_cloud.ps1 -Profile ci -LocalExecution -EnvFile performance/k6/.env

# jika API/RPC public reachable
powershell -ExecutionPolicy Bypass -File performance/k6/run_cloud.ps1 -Profile baseline -EnvFile performance/k6/.env
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
   - Bisa pakai seed ENV, isi di `backend/.env`:
```ini
ADMIN_SEED_ENABLED=true
ADMIN_EMAIL=admin@example.com
ADMIN_WALLET_ADDRESS=0xYourAdminWalletAddress
```
   - Restart backend, akun akan otomatis dibuat/diupdate jadi `ADMIN`.

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

## 18. Draft Bab IV: Implementasi, Pembahasan, dan Pengujian

### 4.1 Implementasi Sistem

#### 4.1.1 Implementasi Arsitektur Sistem
Implementasi arsitektur sistem menggunakan pola tiga lapis:
1. Frontend (`React + Vite`) sebagai antarmuka pengguna.
2. Backend (`Node.js + Express + TypeORM`) sebagai orkestrator logika bisnis, validasi, dan sinkronisasi data.
3. Blockchain (`Ethereum Sepolia` untuk testnet PoS, dengan opsi PoA lokal untuk pengujian) sebagai lapisan integritas data.

Hubungan antar komponen ditunjukkan pada diagram berikut.

```mermaid
flowchart LR
    U[User: Owner/Clinic/Verifier] --> FE[Frontend React]
    FE --> MM[MetaMask Wallet]
    FE --> BE[Backend Node.js Express]
    BE --> DB[(PostgreSQL)]
    MM --> RPC[JSON-RPC Endpoint]
    BE --> RPC
    RPC --> SC[(PetIdentityRegistry\nEthereum Sepolia)]
```

Alur data end-to-end (user -> blockchain) adalah sebagai berikut:
1. User mengisi data di frontend.
2. Frontend meminta backend menyiapkan payload transaksi (`txRequest` berisi `to` dan `data` ABI-encoded).
3. Frontend mengirim `txRequest` ke MetaMask untuk ditandatangani user.
4. MetaMask menyiarkan transaksi ke network blockchain melalui JSON-RPC.
5. Setelah transaksi mined, frontend menerima `txHash`.
6. Frontend mengirim `txHash` ke backend.
7. Backend memverifikasi receipt dan event log dari chain, lalu menyimpan data bisnis + metadata blockchain (`txHash`, `blockNumber`, `blockTimestamp`) ke PostgreSQL.

Diagram urutan end-to-end:

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend React
    participant BE as Backend Node.js
    participant MM as MetaMask
    participant RPC as Ethereum Sepolia RPC
    participant SC as Smart Contract
    participant DB as PostgreSQL

    U->>FE: Input data (registrasi/rekam medis/verifikasi)
    FE->>BE: Request prepare transaction
    BE-->>FE: txRequest + dataHash
    FE->>MM: eth_sendTransaction(txRequest)
    MM->>RPC: Broadcast signed transaction
    RPC->>SC: Execute function
    RPC-->>FE: txHash + receipt (setelah mined)
    FE->>BE: Submit payload + txHash
    BE->>RPC: Ambil receipt dan event
    BE->>BE: Validasi sender, event, dataHash
    BE->>DB: Simpan data + tx metadata
    BE-->>FE: Success response
```

#### 4.1.2 Implementasi Smart Contract
Smart contract `PetIdentityRegistry` diimplementasikan untuk menyimpan bukti transaksi dan status validasi data penting.

Desain logika utama:
1. `mapping(uint256 => Pet) pets` dipakai agar lookup hewan berdasarkan `petId` bersifat O(1) dan hemat gas dibanding pencarian array.
2. `mapping(uint256 => MedicalRecord[]) medicalRecords` dipakai untuk mengelompokkan catatan medis per hewan.
3. `mapping(bytes32 => uint256) petHashToId` dipakai agar hash data dapat ditelusuri kembali ke `petId` secara cepat dan mencegah duplikasi hash.
4. `mapping(uint256 => RecordPointer) recordPointers` dipakai agar verifikasi catatan medis berdasarkan `recordId` dapat langsung menemukan lokasi data tanpa iterasi panjang.

Alasan hash yang disimpan ke blockchain:
1. Data detail hewan/medis tidak disimpan penuh on-chain untuk mengurangi biaya gas.
2. Hash (`bytes32`) berfungsi sebagai sidik jari data untuk uji integritas: perubahan data off-chain akan menghasilkan hash berbeda.
3. Pendekatan ini menjaga privasi relatif lebih baik karena data sensitif tetap berada di database aplikasi.

Constraint implementasi:
1. Gas cost:
   - Operasi tulis on-chain (`registerPet`, `addMedicalRecord`, `verifyMedicalRecord`, `updatePetBasicData`) adalah operasi berbiaya.
   - Karena itu, hanya data ringkas (hash + metadata audit) yang dicatat di chain.
2. Immutability:
   - Data transaksi yang sudah masuk blok tidak dapat dihapus/diubah.
   - Koreksi dilakukan dengan transaksi baru (append), bukan overwrite histori on-chain.

#### 4.1.3 Implementasi Sistem Eksternal (Per Actor)

##### 4.1.3.1 Pemilik Hewan
1. Registrasi:
   - Pemilik mendaftarkan data hewan melalui alur `prepare-registration -> MetaMask transaction -> submit txHash`.
   - Backend memverifikasi event `PetRegistered` sebelum menyimpan data ke database.
2. Transfer ownership:
   - Aplikasi saat ini menjalankan proses bisnis transfer di layer database (status pending dan acceptance owner baru).
   - Smart contract sudah menyediakan fungsi `transferOwnership` untuk finalisasi on-chain sehingga histori transfer dapat ditambatkan ke `txHash` pada pengembangan lanjutan.

Interaksi blockchain utama untuk aktor owner saat ini adalah registrasi hewan dan aksi lain yang membutuhkan transaksi terverifikasi.

##### 4.1.3.2 Klinik
1. Input medical record:
   - Klinik mengirim data rekam medis, backend membuat `txRequest` untuk `addMedicalRecord`.
   - Klinik menandatangani transaksi melalui MetaMask, lalu backend memverifikasi event `MedicalRecordAdded`.
2. Verifikasi:
   - Klinik melakukan review status (`VERIFIED` atau `REJECTED`) melalui fungsi `verifyMedicalRecord`.
   - Backend memvalidasi event `MedicalRecordReviewed` dan memperbarui status data di database.

##### 4.1.3.3 Verifikator
1. Trace publik:
   - Verifikator menggunakan `publicId` untuk menelusuri data yang sudah dipublikasikan aplikasi.
   - Bukti transaksi dapat dilacak melalui `txHash` yang tersimpan pada entitas terkait dan dapat dibuka di block explorer.

Setiap aksi user yang masuk kategori aksi on-chain menghasilkan transaksi blockchain dengan `txHash`.

#### 4.1.4 Integrasi Software dengan Blockchain
Integrasi software ke blockchain dilakukan dengan mekanisme berikut:
1. Transport protocol: JSON-RPC.
2. Library blockchain di backend: `ethers.js` (`JsonRpcProvider`, `Contract`, decoding event ABI).
3. Wallet signer di frontend: MetaMask (`eth_requestAccounts`, `personal_sign`, `eth_sendTransaction`).

Flow transaksi:
1. Input user diterima frontend.
2. Backend menghasilkan data hash dan `txRequest` (fungsi kontrak + ABI encoded data).
3. Frontend meneruskan `txRequest` ke MetaMask.
4. User menandatangani transaksi di MetaMask.
5. Transaksi dibroadcast ke network (Sepolia/PoA lokal) dan menunggu mining/confirmation.
6. `txHash` dikirim kembali ke backend untuk validasi receipt, validasi event, dan persist metadata.

Analisis kenapa perlu MetaMask:
1. Private key tetap berada di sisi user (non-custodial), sehingga backend tidak menyimpan kredensial blockchain user.
2. Signature wallet memberikan bukti kriptografis bahwa aksi benar disetujui pemilik akun.
3. Model ini menurunkan risiko single point of compromise pada server backend.

Analisis kenapa tidak langsung backend:
1. Jika backend menandatangani semua transaksi user, maka kontrol transaksi menjadi terpusat.
2. Pendekatan backend-signer menggeser trust dari user ke server dan meningkatkan risiko kebocoran private key.
3. Untuk sistem audit publik, non-repudiation lebih kuat jika transaksi ditandatangani langsung oleh wallet user.

### 4.2 Pembahasan Sistem

#### 4.2.1 Analisis Arsitektur Hybrid (On-Chain + Off-Chain)
Sistem tidak diimplementasikan sebagai full blockchain karena alasan teknis dan operasional:
1. On-chain menyimpan hash transaksi dan metadata audit (`txHash`, block info).
2. Off-chain (PostgreSQL) menyimpan data detail, query kompleks, relasi, dan kebutuhan operasional aplikasi.

Analisis arsitektur hybrid:
1. Efisiensi gas:
   - Menyimpan data detail (string panjang, histori lengkap) langsung on-chain akan mahal.
   - Penyimpanan hash menurunkan jejak data on-chain.
2. Skalabilitas:
   - Operasi list/filter/report lebih efisien di DB relasional.
   - Blockchain difokuskan untuk finality dan audit, bukan beban query tinggi.
3. Keamanan:
   - Integritas data dijaga melalui verifikasi hash terhadap event on-chain.
   - Jika ada manipulasi off-chain, mismatch hash dapat dideteksi.

#### 4.2.2 Analisis Keamanan Sistem
1. Immutability:
   - Data transaksi blockchain tidak bisa diubah secara retroaktif, sehingga rekam audit lebih kuat.
2. Signature wallet:
   - Login menggunakan challenge + signature (`personal_sign`) memverifikasi kepemilikan wallet tanpa password.
   - Transaksi state-changing ditandatangani langsung di MetaMask.
3. Hash integrity:
   - Hash data pet/medis/koreksi dibandingkan dengan nilai event on-chain.
   - Backend menolak sinkronisasi jika sender transaksi atau hash tidak cocok.

#### 4.2.3 Analisis Transparansi dan Traceability
1. Setiap transaksi on-chain memiliki `txHash` unik.
2. `txHash` disimpan pada data aplikasi untuk membentuk audit trail lintas layer (frontend-backend-blockchain).
3. Dengan `txHash`, pihak eksternal dapat memverifikasi keberadaan dan status transaksi melalui block explorer.

### 4.3 Pengujian Sistem

#### 4.3.1 Pengujian Smart Contract
Pengujian smart contract dilakukan melalui:
1. Kompilasi dan deployment kontrak (`hardhat compile` + script deploy).
2. Smoke test konektivitas kontrak (`scripts/smokeTest.js`).
3. Validasi integrasi receipt/event pada backend (`confirmRegisterPetTx`, `confirmAddMedicalRecordTx`, `confirmVerifyMedicalRecordTx`, `confirmUpdatePetBasicDataTx`).

Seluruh skenario pengujian yang dijalankan menunjukkan status PASS. Hal ini memvalidasi bahwa logika kontrak, event emission, dan sinkronisasi metadata transaksi bekerja sesuai rancangan.

#### 4.3.2 Pengujian Blackbox
Pengujian blackbox dilakukan pada endpoint utama (auth, pet, medical record, correction, trace) dengan fokus input-output dan validasi rule akses.

Analisis hasil:
1. Hasil pengujian menunjukkan seluruh fungsi berjalan sesuai spesifikasi.
2. Hal ini mengindikasikan bahwa sistem telah memenuhi kebutuhan fungsional yang dirancang pada tahap analisis (Bab III).
3. Validasi error handling (misal `txHash` wajib, role-based access, signature mismatch) juga memastikan sistem menolak kondisi tidak valid secara konsisten.

#### 4.3.3 Pengujian Kinerja
Pengujian kinerja menggunakan K6 (Grafana Cloud-first) dengan profil `ci`, `baseline`, `spike`, `stress`, dan `soak` dari `performance/k6/scenarios.json`.

Interpretasi hasil kinerja:
1. Response time endpoint murni REST (tanpa transaksi on-chain) cenderung lebih rendah dan stabil.
2. Endpoint yang menunggu finalitas transaksi blockchain menunjukkan latensi lebih tinggi.
3. Bottleneck utama berada pada proses blockchain (broadcast, mempool, mining/confirmation), bukan pada rendering frontend.
4. Pada mode PoA lokal, konfirmasi transaksi umumnya lebih cepat dibanding Sepolia karena lingkungan validator lebih kecil dan terkontrol.

#### 4.3.4 Pengujian Blockchain (PoA / Aspek Blockchain)
a. Desentralisasi
1. Arsitektur tidak bergantung pada satu server aplikasi untuk pembuktian transaksi karena bukti berada di jaringan blockchain.
2. Node blockchain memegang ledger transaksi terdistribusi sesuai topologi jaringan yang dipakai (Sepolia/PoA lokal).

b. Transparansi
1. Bukti transaksi tersedia dalam bentuk `txHash`.
2. `txHash` dapat diverifikasi pada explorer, sehingga proses audit dapat dilakukan lintas pihak.

c. Immutability
1. Data on-chain tidak mendukung update/delete historis secara langsung.
2. Perubahan direpresentasikan sebagai transaksi baru (append-only), sehingga jejak audit tetap utuh.

d. Konsensus (PoA / testnet behavior)
1. Pada Sepolia, finalisasi transaksi mengikuti mekanisme konsensus Ethereum testnet (validator jaringan publik).
2. Pada PoA lokal (misalnya Besu Clique/Ganache untuk kebutuhan pengujian), validator/authority lebih terbatas sehingga throughput dan kecepatan konfirmasi relatif lebih tinggi.
3. Dampaknya, mode PoA cocok untuk demonstrasi dan uji cepat, sedangkan Sepolia lebih representatif untuk perilaku jaringan publik.
