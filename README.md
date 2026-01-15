# Pet-Identity-Blockchain

Platform skripsi yang menggabungkan backend Node.js/Express + frontend React untuk mengelola identitas digital hewan peliharaan berbasis blockchain. Setiap registrasi hewan, catatan vaksin, koreksi, dan transfer kepemilikan tersimpan di PostgreSQL sekaligus disinkronkan ke smart contract `PetIdentityRegistry` (Solidity).

---

## 0. Fitur platform saat ini

### Autentikasi & otorisasi
- Registrasi + login dengan JWT dan hashing kata sandi (`backend/src/controllers/authController.ts`) untuk tiga peran: **OWNER**, **CLINIC**, dan **ADMIN**.
- Middleware `authenticate` + `authorize` (`backend/src/middlewares/authMiddleware.ts`) memastikan setiap endpoint mengikuti batasan role-based access control.

### Modul Pemilik (Owner)
- Dashboard React (`frontend/src/pages/owner/OwnerDashboard.tsx`) menampilkan daftar hewan, status vaksinasi, dan aksi cepat.
- Form registrasi hewan baru (`OwnerNewPet.tsx`) memicu `createPetController` yang otomatis mengirim data ke blockchain dan PostgreSQL sekaligus membuat `publicId` unik.
- Halaman detail (`OwnerPetDetail.tsx`) memperlihatkan profil lengkap, daftar medical record, dan tombol untuk memulai transfer kepemilikan.
- Fitur permintaan koreksi (`OwnerCorrectionForm.tsx`) untuk mengganti atribut tertentu, lengkap dengan histori review.
- Riwayat dan konfirmasi transfer (`OwnerTransferPage.tsx`) agar pemilik lama/baru dapat menerima atau menolak perpindahan kepemilikan.
- Modul catatan medis (`OwnerMedicalRecordsPage.tsx`) hanya menampilkan data terverifikasi ke pemilik terkait.
- Pusat notifikasi (`OwnerNotificationsPage.tsx`) mengambil data dari `backend/src/services/notificationService.ts`.

### Modul Klinik
- Dashboard klinik (`frontend/src/pages/clinic/ClinicDashboard.tsx`) menampilkan pasien aktif dan catatan menunggu verifikasi.
- Klinik dapat menambahkan catatan vaksin lengkap dengan nomor batch dan bukti (`ClinicMedicalRecordForm.tsx`) yang akan mencatat transaksi on-chain melalui `addMedicalRecord`.
- Daftar catatan pending (`ClinicPendingRecords.tsx`) dan aksi verifikasi/penolakan memanfaatkan `verifyMedicalRecordController`.
- Klinik juga memantau dan memberi keputusan terhadap permintaan koreksi pemilik (`ClinicCorrectionsPage.tsx`).

### Modul Admin & publik
- Admin dashboard (`frontend/src/pages/admin/AdminDashboard.tsx`) memanggil `adminSummaryController` untuk mengetahui total pet, catatan medis, dan transfer terbaru.
- Endpoint publik `GET /trace/:publicId` + halaman `frontend/src/pages/public/TracePage.tsx` memungkinkan siapa pun memeriksa keaslian data hewan bermodal `publicId` (mis. dari QR code).

### Notifikasi & jejak data
- Semua peristiwa penting (transfer selesai, koreksi disetujui, catatan vaksin diverifikasi) akan memanggil `createNotification` sehingga pengguna melihat status terbaru saat membuka aplikasi.
- Riwayat kepemilikan (`getOwnershipHistory`) dan histori koreksi (`listCorrections`) memperkaya audit trail internal.

### Blockchain & alat debugging
- Registrasi hewan dan catatan vaksin langsung memanggil kontrak `PetIdentityRegistry` melalui `petIdentityClient`.
- Router `backend/src/routes/debugBlockchain.ts` beserta halaman `frontend/src/pages/BlockchainSimulatorPage.tsx` menyediakan antarmuka manual untuk ping jaringan, register pet on-chain, dan membaca data langsung dari smart contract selama proses pengujian.

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
Catatan:
- `BLOCKCHAIN_RPC_URL` adalah jaringan runtime yang dipakai backend saat berinteraksi dengan kontrak (bisa menunjuk ke Hardhat lokal atau Sepolia testnet).
- `SEPOLIA_*` hanya dipakai oleh Hardhat untuk deploy dengan `--network sepolia`. Sepolia adalah test environment, bukan metode pengujian atau mekanisme konsensus.

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

## 7. Detail blockchain & sinkronisasi data

### 7.1 Kontrak PetIdentityRegistry (Solidity)
Kontrak utama berada di `backend/contracts/PetIdentityRegistry.sol`. Fitur yang tersedia:
- Menyimpan `Pet` dan `MedicalRecord` lengkap dengan `publicId`, timestamp kelahiran, klinik pembuat catatan, serta flag verifikasi.
- Menyediakan event `PetRegistered`, `PetUpdated`, `MedicalRecordAdded`, `MedicalRecordVerified`, dan `OwnershipTransferred` untuk audit trail on-chain.
- Mengharuskan klinik terdaftar (allowlist `clinics`) saat memanggil `addMedicalRecord`, `updatePetBasicData`, atau `verifyMedicalRecord`.
- Memastikan hanya pemilik on-chain yang dapat memanggil `transferOwnership`.
- Utility view seperti `getPet`, `getMedicalRecords`, dan `getPetIdByPublicId` untuk aplikasi publik.

### 7.2 Client TypeScript (`backend/src/blockchain/petIdentityClient.ts`)
Client ini memuat satu instance provider/wallet `ethers` dengan alamat kontrak dari variabel lingkungan. Fungsi yang diekspos:

| Fungsi                      | Keterangan                                                                                               |
|-----------------------------|----------------------------------------------------------------------------------------------------------|
| `registerPet`               | Memanggil `registerPet` dan mem-parsing event `PetRegistered` guna mendapatkan `petId` on-chain.         |
| `updatePetBasicData`        | Menjaga konsistensi data dasar hewan bila ada koreksi yang perlu disinkron ke blockchain.                |
| `addMedicalRecord`          | Menambahkan catatan vaksin berdasarkan `onChainPetId` serta mengembalikan hash transaksi untuk UI.       |
| `verifyMedicalRecord`       | Memperbarui status verifikasi catatan di kontrak jika dibutuhkan untuk skenario audit.                   |
| `transferOwnership`         | (Opsional) memfasilitasi sinkronisasi kepemilikan bila ingin dicatat juga ke on-chain wallet address.    |
| `getPet` / `getMedicalRecords` | Endpoint pembacaan langsung ketika diperlukan debugging atau fitur publik tambahan.                   |

### 7.3 Alur sinkronisasi backend <-> blockchain
1. **Registrasi hewan (`POST /pets`)**  
   Controller (`createPetController`) mengubah tanggal lahir menjadi detik Unix, memanggil `registerPet`, lalu menyimpan hasil `onChainPetId` di kolom `pet.onChainPetId`. Jika RPC gagal, request digagalkan agar data tetap konsisten.
2. **Pencatatan vaksin (`POST /pets/:petId/medical-records`)**  
   Backend mengecek apakah `onChainPetId` sudah tersedia. Jika iya, catatan dibuat di PostgreSQL lalu `addMedicalRecord` dipanggil dengan timestamp vaksin. Hash transaksi dikirim balik ke frontend sehingga klinik dapat menunjukkan bukti on-chain.
3. **Verifikasi & koreksi**  
   Klinik memverifikasi catatan di database. Bila diperlukan, admin/klinik dapat men-trigger `updatePetBasicData` atau `verifyMedicalRecord` agar perubahan tercermin di kontrak (fungsi sudah tersedia di client).
4. **Pembacaan publik**  
   Fitur Trace memanfaatkan database (karena sudah memuat data terverifikasi) sementara halaman simulator dapat menembak `getPet` / `getMedicalRecords` langsung untuk validasi silang.

### 7.4 Debug endpoint & Blockchain Simulator
- `backend/src/routes/debugBlockchain.ts` mengekspos endpoint `/api/debug/register-pet`, `/api/debug/pet/:id`, dan dapat diperluas dengan helper lain selama proses QA.
- `frontend/src/pages/BlockchainSimulatorPage.tsx` adalah UI internal untuk ping backend, membuat pet/medical record langsung lewat debug endpoint, serta membaca data mentah dari node yang sama dengan backend. Sangat membantu saat menguji koneksi RPC, private key, atau event parsing sebelum fitur utama digunakan end-user.

#### 7.4.1 Cara menggunakan simulator blockchain lokal
1. **Mulai node Hardhat & deploy kontrak**  
   ```bash
   cd backend
   npx hardhat node             # opsional jika ingin RPC lokal (default port 8545)
   npx hardhat run scripts/deploy.js --network localhost
   ```  
   Perintah kedua akan menulis alamat kontrak terbaru ke `backend/deployed/petIdentity.json`.
2. **Whitelist alamat backend sebagai klinik**  
   Kontrak hanya mengizinkan klinik yang sudah di-allowlist memanggil fungsi `addMedicalRecord`/`updatePetBasicData`.  
   ```bash
   # masih di backend/
   node -e "const { Wallet } = require('ethers');require('dotenv').config();console.log(new Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY).address);"
   npx hardhat console --network localhost
   ```
   Di dalam console Hardhat:  
   ```js
   const registry = await ethers.getContractAt(
     "PetIdentityRegistry",
     "0x5FbDB2315678afecb367f032d93F642f64180aa3" // alamat dari backend/deployed/petIdentity.json
   );
   await registry.addClinic("<alamat_wallet_backend>");
   await registry.clinics("<alamat_wallet_backend>"); // pastikan true
   ```
   Gunakan akun pemilik kontrak (signer pertama saat deploy) untuk menjalankan `addClinic`.
3. **Jalankan backend & frontend**  
   Pastikan `.env` backend berisi `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, dan `PET_IDENTITY_ADDRESS` yang baru. Setelah `npm run dev` di backend/frontend, akses `http://localhost:5173/admin/blockchain-simulator`.  
   Rute simulator di-guard oleh `ProtectedRoute` dan kini dapat diakses oleh role ADMIN maupun CLINIC.
4. **Gunakan UI simulator**  
   - Register pet baru melalui kartu “Register Pet” → menyimpan hash transaksi.  
   - Ambil data pet/catatan medis via “Fetch Pet/Records”. Jika ID belum ada akan muncul pesan “Pet ID tidak ditemukan”.  
   - Tambah rekam medis lewat “Add Medical Record”. Bila whitelist belum diset, backend akan mengembalikan `CLINIC_ACCESS_DENIED` dengan instruksi menambahkan klinik seperti langkah di atas.

Dengan desain ini, PostgreSQL tetap menjadi sumber data utama untuk query kompleks dan otorisasi, sementara blockchain menyediakan bukti immutabel serta hash transaksi untuk dilampirkan pada laporan atau QR code.

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

## 10. Scope pengujian skripsi

- Fokus pengujian: fungsional, integrasi backend-smart contract, dan integritas data on-chain/off-chain.
- Sepolia diperlakukan sebagai test environment untuk validasi eksternal saat diperlukan.
- Tidak ada implementasi k6; pengujian performa bukan fokus utama penelitian ini.

---

## 11. Referensi lanjut

- [Hardhat docs](https://hardhat.org/hardhat-runner/docs)
- [Prisma](https://www.prisma.io/docs)
- [ethers.js v6](https://docs.ethers.org/v6/)
- [React Router](https://reactrouter.com/)

Feel free untuk menambah dokumentasi tambahan (mis. diagram arsitektur, detail API schema) sesuai kebutuhan laporan skripsi. Semoga sukses! 🚀
