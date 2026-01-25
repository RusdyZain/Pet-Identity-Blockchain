# Backend

Backend ini adalah API Express yang memakai TypeORM + PostgreSQL, dengan sinkronisasi opsional ke smart contract melalui `ethers`.

## System Flow (ringkas)
- Startup: `src/server.ts` -> `src/app.ts` -> `src/routes/index.ts` lalu koneksi DB lewat `src/config/dataSource.ts`.
- Auth:
  - `POST /auth/register` -> `src/services/authService.ts` membuat user (OWNER/CLINIC) dan simpan wallet backend.
  - `POST /auth/login` -> JWT di-generate, dipakai frontend untuk akses protected route.
- Pet (OWNER):
  - `POST /pets` -> `createPetController` membuat `dataHash`, panggil `registerPet` on-chain, lalu simpan `onChainPetId` + `txHash` di DB.
  - `GET /pets/:id` dan `GET /pets/:id/ownership-history` membaca data DB untuk dashboard.
- Medical record (CLINIC):
  - `POST /pets/:id/medical-records` -> `addMedicalRecord` on-chain lalu simpan record + `txHash`.
  - `PATCH /medical-records/:id/verify` -> update status di DB + `verifyMedicalRecord` on-chain.
- Correction (OWNER request -> CLINIC/ADMIN review):
  - `POST /pets/:id/corrections` membuat request koreksi di DB.
  - `PATCH /corrections/:id` jika disetujui, update DB dan sync ke chain via `updatePetBasicData`.
- Transfer kepemilikan (DB-only):
  - `POST /pets/:id/transfer` membuat permintaan transfer.
  - `POST /pets/:id/transfer/accept` memindahkan owner di DB + kirim notifikasi.
- Trace publik:
  - `GET /trace/:publicId` menampilkan ringkasan data dari DB (tanpa nama lengkap owner).
- Admin:
  - `GET/POST/PATCH/DELETE /admin/users` untuk manajemen akun.
  - `GET /admin/pets` untuk daftar hewan lintas role.

## Wallet di backend
- Transaksi blockchain ditandatangani oleh wallet backend dari `BLOCKCHAIN_PRIVATE_KEY`.
- Kolom `users.wallet_address` menyimpan alamat wallet backend sebagai penanda audit dan konsistensi.

## Lokasi penting
- `src/routes/` -> definisi endpoint.
- `src/controllers/` -> handler HTTP.
- `src/services/` -> logika bisnis + akses DB.
- `src/entities/` -> model TypeORM.
- `src/blockchain/` -> `petIdentityClient.ts` + resolver on-chain.
- `src/utils/` -> jwt, hashing, error helper.
