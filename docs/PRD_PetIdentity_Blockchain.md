# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Sistem Identitas Digital Hewan Peliharaan Berbasis Blockchain
### Versi Audit Implementasi Frontend dan Backend

Tanggal audit: 2026-04-18  
Repository: `Web-blockchain`  
Ruang lingkup: `frontend`, `backend`, `smart contract`, `performance/k6`

Dokumen ini menggabungkan dua hal:
1. PRD target produk (apa yang wajib ada).
2. Audit as-is (apa yang sudah benar-benar terimplementasi di kode saat ini).

## Cara Baca Status
- `TERPENUHI`: sudah ada implementasi dan alur utama berjalan.
- `SEBAGIAN`: sudah ada pondasi, tetapi belum lengkap atau belum production-ready.
- `BELUM`: belum ditemukan implementasi.

## Asumsi Audit
- Audit ini berbasis kode pada branch/workspace saat ini.
- Validasi berbasis code reading, bukan full UAT end-to-end di lingkungan production.
- Jika ada service eksternal di luar repo (misal pipeline monitoring terpisah), status dapat berubah setelah bukti tambahan tersedia.

## 1. Tujuan Produk
Sistem harus mampu:
1. Menyimpan identitas hewan secara digital.
2. Menyediakan rekam medis transparan.
3. Menjamin keaslian dan keamanan data melalui blockchain.
4. Mendukung verifikasi publik dan transfer kepemilikan.

Status global saat ini: `SEBAGIAN`.

Alasan:
- Fondasi utama sudah ada (wallet auth, data hash on-chain, trace by public ID, dashboard per role).
- Masih ada gap penting untuk memenuhi PRD penuh (QR generator/scanner, transfer ownership on-chain end-to-end, versioning yang lebih eksplisit, automated test coverage).

## 2. Stakeholder dan User
Aktor utama yang wajib ada:
1. Pemilik Hewan (`OWNER`) - `TERPENUHI`
2. Klinik Hewan (`CLINIC`) - `TERPENUHI`
3. Verifikator/Publik (`PUBLIC_VERIFIER` atau akses publik trace) - `TERPENUHI`
4. Admin Sistem (`ADMIN`) - `TERPENUHI`

Bukti kode:
- Role enum: `backend/src/types/enums.ts`
- Route protection FE: `frontend/src/routes/ProtectedRoute.tsx`
- Pemetaan halaman role: `frontend/src/App.tsx`
- Middleware auth/authorize BE: `backend/src/middlewares/authMiddleware.ts`

## 3. Fitur Wajib (Core Features)

### A. Authentication (wajib)
| Requirement | Frontend | Backend/Blockchain | Status | Catatan |
|---|---|---|---|---|
| Login via wallet MetaMask | `LoginPage`, `walletClient.connectWallet()` | `/auth/wallet/challenge`, `/auth/login` | TERPENUHI | Wallet-based login berjalan. |
| Challenge-response authentication | Sign message challenge di FE | Verifikasi signature di `authService` | TERPENUHI | Challenge ada TTL dan one-time consume. |
| Role-based access | Protected route per role | `authorize([role])` di route backend | TERPENUHI | OWNER/CLINIC/ADMIN dipisah jelas. |
| Kesiapan multi-instance auth challenge | N/A | Challenge disimpan di `Map` memory proses | SEBAGIAN | Belum aman untuk multi-instance/horizontal scaling. |

Bukti kode:
- `backend/src/routes/authRoutes.ts`
- `backend/src/services/authService.ts`
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/services/walletClient.ts`

### B. Registrasi Hewan
| Requirement | Frontend | Backend/Blockchain | Status | Catatan |
|---|---|---|---|---|
| Input identitas hewan | Form owner tersedia | Parsing dan validasi payload | TERPENUHI | Nama, jenis, ras, tanggal lahir, warna, ciri fisik sudah ada. |
| Generate ID unik | Menampilkan hasil registrasi | `generatePublicId()` | TERPENUHI | Format `PET-XXXXXXXX`. |
| Generate/scan QR code | Belum ada komponen QR | Belum ada endpoint/modul QR | BELUM | PRD minta input ID/scan QR. Saat ini hanya input manual ID. |

Bukti kode:
- `frontend/src/pages/owner/OwnerNewPet.tsx`
- `backend/src/controllers/petController.ts`
- `backend/src/services/petService.ts`

### C. Medical Record
| Requirement | Frontend | Backend/Blockchain | Status | Catatan |
|---|---|---|---|---|
| Tambah vaksin/riwayat kesehatan | Form klinik tersedia | Prepare + confirm tx, simpan record | TERPENUHI | Alur pending ke verified/rejected tersedia. |
| Status pending/verified/rejected | UI pending records klinik | Enum status + endpoint verify | TERPENUHI | Status lengkap. |
| Upload bukti IPFS/storage | Input `evidence_url` saja | Simpan URL, bukan upload native | SEBAGIAN | Belum ada uploader IPFS/storage langsung dari aplikasi. |

Bukti kode:
- `frontend/src/pages/clinic/ClinicMedicalRecordForm.tsx`
- `frontend/src/pages/clinic/ClinicPendingRecords.tsx`
- `backend/src/routes/medicalRecordRoutes.ts`
- `backend/src/services/medicalRecordService.ts`

### D. Verifikasi Data oleh Klinik
| Requirement | Frontend | Backend/Blockchain | Status | Catatan |
|---|---|---|---|---|
| Approve/reject data medis | Klinik dapat review pending records | Endpoint verify tersedia | TERPENUHI | Verifikasi manual klinik berjalan. |
| Status valid tercatat | UI menampilkan status | Data status tersimpan di DB | TERPENUHI | Ada audited status. |
| Tercatat di blockchain | FE kirim tx hash hasil MetaMask | Backend validasi event chain | TERPENUHI | Event + tx metadata diverifikasi. |

Bukti kode:
- `backend/src/controllers/medicalRecordController.ts`
- `backend/src/blockchain/petIdentityClient.ts`

### E. Trace / Tracking
| Requirement | Frontend | Backend/Blockchain | Status | Catatan |
|---|---|---|---|---|
| Input ID / scan QR | Input manual public ID ada | Endpoint `/trace/:publicId` ada | SEBAGIAN | Scan QR belum ada. |
| Output identitas hewan | Halaman trace publik ada | Response pet identity ada | TERPENUHI | Nama, species, breed, owner masked. |
| Output riwayat vaksin | Tabel vaksin tampil | Query verified medical records | TERPENUHI | Ringkasan vaksin tersedia. |
| Output riwayat kepemilikan | Belum ditampilkan | Endpoint trace belum return history | BELUM | Requirement PRD belum terpenuhi penuh. |

Bukti kode:
- `frontend/src/pages/public/TracePage.tsx`
- `backend/src/routes/traceRoutes.ts`
- `backend/src/services/petService.ts` (`getTraceByPublicId`)

### F. Transfer Kepemilikan
| Requirement | Frontend | Backend/Blockchain | Status | Catatan |
|---|---|---|---|---|
| Owner A kirim request | Form transfer owner ada | Endpoint initiate transfer ada | TERPENUHI | Request berbasis email owner baru. |
| Owner baru approve | Flow accept tersedia | Endpoint accept transfer ada | TERPENUHI | Owner baru bisa menerima. |
| Tercatat di blockchain | FE tidak kirim tx transfer | Backend tidak confirm event transfer on-chain | BELUM | Saat ini transfer efektifnya off-chain. |
| Riwayat transfer tersimpan | Tidak tampilan riwayat umum di FE | `OwnershipHistory` entity ada | SEBAGIAN | Ada bug logika: endpoint history saat ini terbatas saat `TRANSFER_PENDING`. |

Bukti kode:
- `frontend/src/pages/owner/OwnerTransferPage.tsx`
- `backend/src/services/petService.ts` (`initiateTransfer`, `acceptTransfer`, `getOwnershipHistory`)
- `backend/contracts/PetIdentityRegistry.sol` (`transferOwnership` tersedia di kontrak)

### G. Koreksi Data
| Requirement | Frontend | Backend/Blockchain | Status | Catatan |
|---|---|---|---|---|
| Request perubahan data | Owner dapat ajukan koreksi | Endpoint create correction ada | TERPENUHI | Alur request berjalan. |
| Approval klinik/admin | Halaman review koreksi ada | Endpoint review correction ada | TERPENUHI | APPROVED/REJECTED tersedia. |
| Versioning tanpa overwrite | Histori correction tersimpan | Pet utama tetap update state final | SEBAGIAN | Sudah ada audit trail request, belum model version snapshot penuh per revisi. |

Bukti kode:
- `frontend/src/pages/owner/OwnerCorrectionForm.tsx`
- `frontend/src/pages/clinic/ClinicCorrectionsPage.tsx`
- `backend/src/services/correctionService.ts`

### H. Notifikasi
| Requirement | Frontend | Backend/Blockchain | Status | Catatan |
|---|---|---|---|---|
| Update status proses | Halaman notifikasi owner/clinic ada | Notification service + route ada | TERPENUHI | Event notifikasi transfer, koreksi, verifikasi tersedia. |
| Jadwal vaksin otomatis | Belum ada reminder scheduler | Belum ada cron/reminder job | BELUM | Perlu modul scheduling. |

Bukti kode:
- `frontend/src/pages/owner/OwnerNotificationsPage.tsx`
- `frontend/src/pages/clinic/ClinicNotificationsPage.tsx`
- `backend/src/services/notificationService.ts`

## 4. Kebutuhan Non-Fungsional

| Kebutuhan | Status | Catatan Audit |
|---|---|---|
| Security - wallet-based authentication | TERPENUHI | Challenge-signature login sudah benar. |
| Security - data hash on-chain | TERPENUHI | Register/update/medical review validasi event chain. |
| Security - immutable record | SEBAGIAN | On-chain immutable; off-chain tetap mutable (dengan audit trail). |
| Security - secret handling | SEBAGIAN | Secara desain tidak pakai private key server-side; tetap wajib jaga `.env` dan token CI. |
| Performance - response time < 3 detik | SEBAGIAN | Read endpoint bisa ditargetkan; flow write blockchain tidak realistis dipaksa <3 detik karena finality chain. |
| Performance - multiple user | SEBAGIAN | K6 suite tersedia; belum ada bukti baseline hasil run yang terdokumentasi stabil. |
| Compatibility - Chrome/Edge/Firefox | SEBAGIAN | Belum ada matriks uji browser formal di repo. |
| Transparency - transaksi dapat diaudit | TERPENUHI | `txHash`, `blockNumber`, `blockTimestamp` tersimpan. |

## 5. Arsitektur Sistem
Model arsitektur saat ini: hybrid on-chain/off-chain.

1. Frontend (`React + Vite`)
- Wallet interaction via MetaMask.
- Role-based pages: owner, clinic, admin, public trace.

2. Backend (`Node.js + Express + TypeORM`)
- API auth, pet, medical, correction, transfer, notification, admin.
- Validasi transaksi blockchain berbasis event receipt.

3. Blockchain (`Ethereum-compatible`, target Sepolia)
- Smart contract: `PetIdentityRegistry.sol`.
- Data sensitif disimpan sebagai hash, bukan plaintext detail full.

4. Storage
- On-chain: hash + event audit.
- Off-chain: PostgreSQL entities (`Pet`, `MedicalRecord`, `OwnershipHistory`, dst).
- Bukti medis: URL eksternal (belum uploader IPFS native).

## 6. Flow Utama

### Flow 1 - Registrasi Hewan
1. Owner isi form.
2. Backend generate hash dan `txRequest` (`prepare-registration`).
3. User sign/send tx via MetaMask.
4. Backend verifikasi receipt/event.
5. Backend simpan metadata ke DB.

Status: `TERPENUHI`.

### Flow 2 - Tambah Vaksin
1. Klinik isi data medis.
2. Submit record -> status pending.
3. Klinik review -> verified/rejected (on-chain event checked).

Status: `TERPENUHI`.

### Flow 3 - Verifikasi Publik
1. User input public ID.
2. Sistem ambil data trace.
3. Sistem tampilkan identitas + vaksin terverifikasi.

Status: `SEBAGIAN` (belum scan QR dan belum ownership history publik).

### Flow 4 - Transfer Kepemilikan
1. Owner lama kirim transfer request.
2. Owner baru approve di aplikasi.
3. Sistem update owner off-chain + history.

Status: `SEBAGIAN` (belum transfer ownership on-chain end-to-end).

## 7. Data Model

### On-chain (Smart Contract)
- `Pet`: `id`, `dataHash`, `owner`, `status`, timestamp audit.
- `MedicalRecord`: `id`, `petId`, `dataHash`, `clinic`, `status`, timestamp audit.
- Event kunci: `PetRegistered`, `PetUpdated`, `MedicalRecordAdded`, `MedicalRecordReviewed`, `OwnershipTransferred`.

Sumber: `backend/contracts/PetIdentityRegistry.sol`.

### Off-chain (Database)
- `User`
- `Pet`
- `MedicalRecord`
- `OwnershipHistory`
- `CorrectionRequest`
- `Notification`

Sumber: `backend/src/entities/*`.

Status model data: `TERPENUHI`, tetapi coverage endpoint untuk memanfaatkan semua data (khususnya ownership history publik) masih belum penuh.

## 8. Metrics
Target PRD:
1. Jumlah transaksi berhasil.
2. Waktu respon.
3. Load handling.
4. Success rate.

Status saat ini: `SEBAGIAN`.

Yang sudah ada:
- Suite K6 lengkap dengan profile baseline/spike/stress/soak/ci.
- Threshold latency, error rate, throughput, flow success.
- Custom metrics blockchain (contoh: `tx_submit_ms`, `tx_confirm_ms`, `rpc_error_rate`, `end_to_end_flow_latency`).

Yang belum cukup:
- Belum ada laporan hasil benchmark baku yang dijadikan SLA resmi per environment.
- Belum ada dashboard observability operasional terpadu (metrics + logs + traces) di repo.

Bukti kode:
- `performance/k6/scenarios.json`
- `performance/k6/lib/metrics.js`

## 9. Testing

| Jenis Testing | Status | Catatan |
|---|---|---|
| Unit test smart contract | BELUM | Tidak ditemukan file test Solidity/Hardhat/Foundry dalam repo. |
| Blackbox testing | SEBAGIAN | Ada flow manual di aplikasi, belum terlihat dokumentasi test case formal otomatis. |
| Integration testing backend | BELUM | Tidak ada suite integration test API otomatis. |
| Load testing | TERPENUHI | Struktur K6 sudah ada dan modular. |

## 10. Batasan Sistem
1. Tidak ada marketplace: `SESUAI`.
2. Tidak ada IoT (RFID/GPS): `SESUAI`.
3. Tidak untuk mainnet production (testnet only): `SESUAI`.

## 11. Checklist Wajib untuk Review Dosen

### AUTH
- [x] Login wallet berjalan.
- [x] Signature challenge valid.
- [x] Role-based access aktif.

### CORE
- [x] Registrasi hewan.
- [x] Tambah medical record.
- [x] Verifikasi clinic.
- [ ] QR generator/scanner.

### BLOCKCHAIN
- [x] Flow register/medical/correction verify event chain.
- [x] `txHash` tersimpan.
- [ ] Transfer ownership end-to-end on-chain.

### TRACE
- [x] Trace by public ID.
- [ ] Scan QR.
- [ ] Ownership history tampil di trace publik.

### OWNERSHIP
- [x] Transfer request dan accept berjalan (off-chain).
- [x] Ownership history disimpan di DB.
- [ ] Endpoint/history view belum ideal (masih dibatasi status transfer pending).

### UI ROLE SPLIT
- [x] Dashboard owner terpisah.
- [x] Dashboard clinic terpisah.
- [x] Dashboard admin terpisah.
- [x] Public trace page tersedia.

### GOVERNANCE ADMIN (Tambahan penting)
- [x] Admin tidak bisa hapus akun wallet-based.
- [x] Password change tidak dipakai untuk akun wallet-based.

### TESTING
- [x] Load testing K6 tersedia.
- [ ] Unit test smart contract otomatis.
- [ ] Integration test API otomatis.

## 12. Gap Kritis dan Prioritas Perbaikan

### P0 (harus sebelum klaim siap produksi)
1. Implement transfer ownership on-chain end-to-end (prepare tx, send tx, confirm `OwnershipTransferred`).
2. Perbaiki endpoint ownership history agar tidak hanya bisa saat status `TRANSFER_PENDING`.
3. Pindahkan wallet challenge store dari memory ke shared store (Redis/DB) agar aman multi-instance.
4. Tambah automated test minimum:
   - unit test smart contract,
   - integration test API untuk flow auth/register/medical/transfer.

### P1 (penting untuk menutup PRD TA)
1. Tambah QR generator + QR scanner untuk flow trace.
2. Tampilkan ownership history di halaman trace publik (dengan redaksi privasi).
3. Tambah upload evidence native ke IPFS/object storage.
4. Tambah scheduler reminder vaksin otomatis.

### P2 (quality dan operasional)
1. Tambah deep-link explorer untuk tiap `txHash` di UI.
2. Definisikan SLA terukur per profile K6 dan simpan hasil benchmark per rilis.
3. Tambah observability stack (metrics, logs, traces) yang konsisten.

## 13. Kesimpulan Audit
Aplikasi sudah kuat di fondasi utama blockchain TA:
1. Wallet authentication.
2. Role separation owner/clinic/admin/public.
3. Verifikasi event blockchain pada flow register, medical record, dan correction review.
4. K6 load testing framework sudah tersedia.

Namun, untuk menyatakan "semua requirement PRD terpenuhi", status saat ini masih `SEBAGIAN` karena gap utama berikut:
1. QR trace belum ada.
2. Transfer ownership on-chain belum end-to-end.
3. Ownership history publik belum lengkap.
4. Automated test coverage (unit + integration) belum ada.
5. Beberapa aspek production readiness (auth challenge store, observability, scheduler notifikasi) belum final.

Dengan menutup gap P0 dan P1 di atas, aplikasi akan jauh lebih siap untuk validasi TA maupun hardening menuju produksi.
