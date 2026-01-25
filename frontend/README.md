# Frontend

Frontend ini adalah React + Vite + Tailwind untuk tiga peran (OWNER, CLINIC, ADMIN) dan satu area publik (Trace).

## System Flow (ringkas)
- Boot:
  - Routing ada di `src/App.tsx` dengan `PublicLayout`, `DashboardLayout`, dan `ProtectedRoute`.
- Auth:
  - `authApi.login` di `src/services/apiClient.ts` menyimpan token ke `localStorage`.
  - `AuthContext` di `src/context/AuthContext.tsx` menyimpan user dan menyinkronkan ke `localStorage`.
  - `ProtectedRoute` membatasi akses berdasarkan role.
- Owner:
  - Dashboard -> `petApi.list` untuk daftar hewan.
  - Registrasi hewan -> `petApi.create` (trigger DB + blockchain via backend).
  - Detail hewan -> `petApi.detail` + `medicalRecordApi.list`.
  - Koreksi data -> `correctionApi.create`.
  - Transfer -> `petApi.initiateTransfer` dan `petApi.acceptTransfer`.
  - Notifikasi -> `notificationApi.list`.
- Clinic:
  - Catatan medis -> `medicalRecordApi.create` untuk menulis record.
  - Verifikasi -> `medicalRecordApi.verify`.
  - Koreksi -> `correctionApi.list` + `correctionApi.review`.
  - Notifikasi -> `notificationApi.list`.
- Admin:
  - Dashboard -> `statsApi.adminSummary`.
  - Kelola user -> `adminApi.listUsers/createUser/updateUser/deleteUser`.
  - Kelola hewan -> `adminApi.listPets`.
  - Simulator blockchain -> `pages/BlockchainSimulatorPage.tsx` (ADMIN/CLINIC).
- Public:
  - Trace -> `traceApi.getByPublicId` untuk verifikasi publicId.

## Lokasi penting
- `src/services/apiClient.ts` -> semua request ke backend + token interceptor.
- `src/context/AuthContext.tsx` -> state autentikasi global.
- `src/routes/ProtectedRoute.tsx` -> guard akses berdasarkan role.
- `src/pages/` -> halaman per role (owner, clinic, admin, public).
- `src/types/` -> kontrak tipe data dari API.

## Menambah fitur baru
- Tambah endpoint di `src/services/apiClient.ts`.
- Definisikan tipe baru di `src/types/`.
- Buat halaman di `src/pages/` lalu daftarkan di `src/App.tsx`.
