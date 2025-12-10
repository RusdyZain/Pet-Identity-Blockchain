# Pet-Identity-Blockchain

Platform skripsi yang menggabungkan backend Node.js/Express + frontend React untuk mengelola identitas digital hewan peliharaan berbasis blockchain. Setiap registrasi hewan, catatan vaksin, koreksi, dan transfer kepemilikan tersimpan di PostgreSQL sekaligus disinkronkan ke smart contract `PetIdentityRegistry` (Solidity).

---

## 1. Arsitektur & Tech Stack

| Lapisan          | Teknologi utama                                                                                           |
|------------------|-----------------------------------------------------------------------------------------------------------|
| Smart contract   | Solidity ^0.8.20, Hardhat + @nomicfoundation/hardhat-toolbox, jaringan Hardhat lokal & Sepolia testnet    |
| Backend API      | Node.js 24, Express 5, TypeScript, Prisma ORM, PostgreSQL, JWT auth                                       |
| Frontend         | React 19, Vite, TypeScript, Tailwind CSS                                                                  |
| Integrasi chain  | `ethers` v6, file helper `backend/src/blockchain/petIdentityClient.ts`                                    |

Alur utama:
1. Pengguna registrasi hewan via UI (React).
2. Backend menyimpan data di PostgreSQL dan memanggil kontrak `registerPet`, menyimpan `onChainPetId` yang dikembalikan event `PetRegistered`.
3. Catatan medis baru memanggil `addMedicalRecord` dengan `onChainPetId` yang tersimpan di database.
4. Debug/troubleshooting bisa memakai router `backend/src/routes/debugBlockchain.ts` untuk mencoba call langsung ke chain.

---

## 2. Persiapan lingkungan

- **Node.js 24.x** dan npm 10+ (gunakan `nvs use 24` atau `nvm use 24` supaya konsisten).
- **PostgreSQL 14+** dan koneksi database yang dapat diakses lokal.
- **Git**, **pnpm/npm** sesuai preferensi (repo memakai npm).
- Akses RPC Sepolia + private key jika ingin deploy ke testnet.

Cek versi runtime:
```powershell
node -v    # v24.x.x
npm -v
```

---

## 3. Struktur repository

```
├─ backend/           # Express + Prisma API, blockchain client, Hardhat project
│  ├─ contracts/      # PetIdentityRegistry.sol
│  ├─ scripts/        # Hardhat deploy scripts
│  ├─ src/
│  │  ├─ blockchain/  # ethers.js client (petIdentityClient.ts)
│  │  ├─ controllers/ # pet, medical record, dll
│  │  ├─ routes/      # termasuk debugBlockchain.ts
│  │  └─ services/
│  └─ hardhat.config.js
└─ frontend/          # Vite + React client
```

---

## 4. Backend setup (Express + Prisma)

### 4.1 Environment variables
Copy `backend/.env.example` ke `.env` dan isi:
```ini
DATABASE_URL=postgresql://user:password@localhost:5432/pet_identity
JWT_SECRET=supersecret
PORT=4000

# Blockchain client
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/XXXX
BLOCKCHAIN_PRIVATE_KEY=0xabcdef...
PET_IDENTITY_ADDRESS=0xDeployedContractAddress
```
Untuk Hardhat Sepolia, tambahkan juga:
```ini
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/XXXX
SEPOLIA_PRIVATE_KEY=0xabcdef...
```

### 4.2 Instalasi & migrasi
```powershell
cd backend
npm install
npx prisma migrate dev
npm run dev         # jalankan API di http://localhost:4000
```

### 4.3 Script npm penting
| Perintah        | Deskripsi                                      |
|-----------------|------------------------------------------------|
| `npm run dev`   | Server dev dengan ts-node-dev                  |
| `npm run build` | Build TypeScript → `dist/`                     |
| `npm start`     | Menjalankan build hasil `npm run build`        |
| `npx prisma ...`| Akses Prisma CLI (studio, migrate, dll)        |

---

## 5. Frontend setup (React + Vite)

### 5.1 Environment
`frontend/.env`:
```ini
VITE_API_URL=http://localhost:4000
```

### 5.2 Instalasi & jalankan
```powershell
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Tailwind & PostCSS sudah dikonfigurasi di `tailwind.config.js` dan `postcss.config.js`.

---

## 6. Smart contract & Hardhat

Kontrak utama: `backend/contracts/PetIdentityRegistry.sol` (Solidity ^0.8.20). Menyimpan struktur `Pet` dan `MedicalRecord`, memancarkan event `PetRegistered`, `MedicalRecordAdded`, dsb.

### 6.1 Instalasi Hardhat & toolbox
```bash
cd backend
npm install --save-dev hardhat@^2.27.0 @nomicfoundation/hardhat-toolbox
npm install ethers dotenv
npx hardhat        # (opsional) generate file default
```
`hardhat.config.js` sudah memuat jaringan `hardhat`, `localhost`, dan `sepolia` dengan dotenv.

### 6.2 Perintah penting Hardhat
```bash
# compile kontrak
npx hardhat compile

# jalankan node lokal
npx hardhat node

# deploy ke node lokal (terminal lain)
npx hardhat run scripts/deploy.js --network localhost

# deploy ke Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```
Output deploy disimpan di `backend/deployed/petIdentity.json`. Isi alamat hasil deploy ke variabel `PET_IDENTITY_ADDRESS` di `.env` agar backend bisa terhubung.

### 6.3 Debug router (opsional)
`backend/src/routes/debugBlockchain.ts` menyediakan endpoint:
- `POST /debug/register-pet` → memanggil `registerPet` langsung.
- `GET /debug/pet/:id` → baca data dari kontrak.
Tambahkan ke app Express: `app.use('/api', debugBlockchainRouter);`

---

## 7. Integrasi backend ↔ blockchain

File `backend/src/blockchain/petIdentityClient.ts` menggunakan `ethers` v6 untuk menyimpan satu provider, wallet, dan contract instance. Fungsi penting:

| Fungsi                    | Keterangan                                                                                 |
|---------------------------|--------------------------------------------------------------------------------------------|
| `registerPet(...)`        | Deploy call `registerPet`, parse event `PetRegistered` → kembalikan `{ receipt, petId }`.  |
| `addMedicalRecord(...)`   | Tambah catatan medis ke kontrak memakai `onChainPetId`.                                     |
| Fungsi lain               | `updatePetBasicData`, `verifyMedicalRecord`, `getPet`, `getMedicalRecords`, dsb.           |

### Alur controller
1. **POST /pets** (`createPetController`)
   - Hitung `birthDateTimestamp`, panggil `registerPet` (blok onchain).
   - Simpan entitas Pet di Postgres + `onChainPetId` hasil event.
   - Respons: `{ pet, blockchain: { txHash, onChainPetId } }`.

2. **POST /pets/:petId/medical-records**
   - Ambil Pet dari DB, cek `onChainPetId` terisi.
   - Simpan record di DB, lalu panggil `addMedicalRecord(onChainPetId, ...)`.
   - Respons menyertakan `txHash`. Bila `onChainPetId` kosong, kembalikan error 400.

Dengan pola ini, database menjadi sumber data utama, sedangkan blockchain memberi bukti immutabel untuk setiap hewan dan riwayat vaksinnya.

---

## 8. Running full stack

1. Jalankan PostgreSQL dan buat DB sesuai `DATABASE_URL`.
2. `npm run dev` di `backend/` (pastikan `.env` lengkap).
3. `npm run dev` di `frontend/`.
4. (Opsional) Hardhat node + deploy kontrak lokal sebelum backend memanggil blockchain.
5. Akses UI di `http://localhost:5173`.

---

## 9. Troubleshooting

| Masalah                                               | Solusi                                                                                          |
|-------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| `HH108: Cannot connect to localhost`                  | Jalankan `npx hardhat node` terlebih dahulu sebelum deploy.                                     |
| Konflik versi Hardhat/toolbox                         | Pastikan `hardhat@^2.27` sesuai dengan `@nomicfoundation/hardhat-toolbox@^6`.                   |
| `PetRegistered event not found`                       | Pastikan kontrak terbaru dikompilasi dan alamat `PET_IDENTITY_ADDRESS` benar.                   |
| `Pet is not registered on blockchain` saat catatan    | Artinya Pet di DB belum punya `onChainPetId`. Daftarkan ulang atau sinkronkan datanya.          |
| Prisma error/migrasi                                  | Cek koneksi `DATABASE_URL`, jalankan `npx prisma migrate dev` atau `npx prisma db push`.       |
| Node version mismatch                                 | Gunakan `nvs link 24.11.1` atau `nvm alias default 24` agar runtime konsisten.                 |

---

## 10. Referensi lanjut

- [Hardhat docs](https://hardhat.org/hardhat-runner/docs)
- [Prisma](https://www.prisma.io/docs)
- [ethers.js v6](https://docs.ethers.org/v6/)
- [React Router](https://reactrouter.com/)

Feel free untuk menambah dokumentasi tambahan (mis. diagram arsitektur, detail API schema) sesuai kebutuhan laporan skripsi. Semoga sukses! 🚀
