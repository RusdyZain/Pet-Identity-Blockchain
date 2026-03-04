# Frontend Setup and Test Guide

Panduan ini fokus untuk menjalankan frontend, menghubungkan MetaMask, dan menguji alur wallet login + transaksi on-chain.

## 1. Stack Frontend

1. React + Vite + TypeScript.
2. API client: `src/services/apiClient.ts`.
3. Wallet client: `src/services/walletClient.ts`.
4. Login: challenge + signature (`personal_sign`) tanpa password.
5. On-chain action: frontend kirim transaksi ke smart contract via MetaMask, lalu submit `txHash` ke backend.

## 2. Prerequisites

1. Node.js 20+.
2. MetaMask extension.
3. Backend sudah running di `http://localhost:4000`.
4. Network blockchain aktif (Ganache untuk PoA lokal, atau Sepolia untuk PoS).

## 3. Konfigurasi `.env`

Isi `frontend/.env`:

```ini
VITE_API_URL=http://localhost:4000

# Target chain untuk transaksi MetaMask
VITE_CHAIN_ID=1337
VITE_CHAIN_NAME=Ganache Local
VITE_CHAIN_RPC_URL=http://127.0.0.1:7545
VITE_CHAIN_CURRENCY_SYMBOL=ETH
```

Catatan:

1. Frontend akan otomatis mencoba switch/add network MetaMask sesuai value di atas saat kirim transaksi.
2. Jika ubah `.env`, restart frontend (`npm run dev` ulang).

## 4. Jalankan Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend default di `http://localhost:5173`.

## 5. Jumlah Terminal yang Direkomendasikan

Saat uji lokal PoA, gunakan 4 terminal:

1. Ganache (node blockchain lokal).
2. Deploy contract dari folder backend.
3. Backend API (`npm run dev` di backend).
4. Frontend (`npm run dev` di frontend).

## 6. Langkah Uji Manual (Sederhana dan Urut)

### 6.1 Register Wallet

1. Buka `http://localhost:5173/register`.
2. Isi nama dan email.
3. Klik `Daftar`.
4. MetaMask akan minta:
   - connect account,
   - sign challenge message.
5. Setelah sukses, lanjut ke login.

Penting: register/login hanya `sign message`, bukan transaksi on-chain berbayar.

### 6.2 Login Wallet

1. Buka `http://localhost:5173/login`.
2. Klik `Connect Wallet & Sign In`.
3. Sign challenge di MetaMask.
4. Jika wallet sudah terdaftar, user masuk dashboard sesuai role.

### 6.3 Daftar Hewan (On-Chain)

1. Masuk menu tambah hewan (`/owner/pets/new`).
2. Isi data hewan dan submit.
3. MetaMask popup transaksi akan muncul.
4. Klik `Confirm`.
5. Tunggu mined, lalu frontend kirim `txHash` ke backend.

Popup transaksi ini normal:

1. `To` = alamat smart contract.
2. `Value` = 0 ETH.
3. Ada data `Hex` panjang (encoded function call).
4. Tetap ada biaya gas.

## 7. Cek Hasil Testing di Mana

1. MetaMask: untuk approve/sign dari sisi user.
2. Ganache: untuk bukti transaksi benar masuk block.
3. PostgreSQL: untuk bukti sinkronisasi aplikasi (`tx_hash`, `block_number`, `block_timestamp`).

Checklist lulus end-to-end:

1. Tx berhasil diapprove di MetaMask.
2. Tx muncul di Ganache.
3. Data tabel `pets`/`medical_records` terisi metadata block.

## 8. Ganti dari PoA ke PoS (Sepolia)

Ubah `frontend/.env`:

```ini
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=Sepolia
VITE_CHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
VITE_CHAIN_CURRENCY_SYMBOL=ETH
```

Lalu:

1. Pastikan backend juga menunjuk contract Sepolia (`PET_IDENTITY_ADDRESS` + `BLOCKCHAIN_RPC_URL` Sepolia).
2. Restart frontend.
3. Ulangi skenario register/login/daftar hewan.

## 9. Troubleshooting Frontend + MetaMask

1. Hanya muncul `Tinjau Peringatan`, tombol confirm tidak aktif.
   - Biasanya chain salah atau warning MetaMask.
   - Pastikan network benar (Ganache/Sepolia sesuai `.env`).
   - Coba buka MetaMask full-page, clear activity/nonce, refresh app.
2. `Wallet is not registered` saat login.
   - Wallet belum register, atau login dengan account MetaMask berbeda.
3. `Wallet challenge expired`.
   - Ulangi login/register agar challenge baru dibuat.
4. Tx tidak muncul di Ganache.
   - Cek account yang dipakai, chainId, RPC URL, saldo test ETH.
5. Frontend tidak bisa akses backend.
   - Cek `VITE_API_URL` dan pastikan backend hidup di port yang benar.

## 10. Build Production Frontend

```powershell
cd frontend
npm run build
npm run preview
```
