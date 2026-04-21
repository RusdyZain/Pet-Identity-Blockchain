const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  // Ambil raw value
  let rawKey = process.env.BLOCKCHAIN_PRIVATE_KEY || "";
  
  // MEMBERSIHKAN KEY: hapus spasi, tanda kutip, dan karakter non-alfa-numerik lainnya
  let cleanKey = rawKey.replace(/['" ]/g, '').trim();

  // Pastikan ada prefix 0x
  if (cleanKey && !cleanKey.startsWith('0x')) {
    cleanKey = '0x' + cleanKey;
  }

  const RPC_URL = (process.env.BLOCKCHAIN_RPC_URL || "").trim();
  const CONTRACT_ADDRESS = (process.env.PET_IDENTITY_ADDRESS || "").trim();

  console.log('--- Memulai Smoke Test (Debug Mode) ---');

  if (!RPC_URL || !cleanKey || !CONTRACT_ADDRESS) {
    console.error("❌ Data .env tidak lengkap.");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  let wallet;
  try {
    wallet = new ethers.Wallet(cleanKey, provider);
    console.log('✅ Wallet Address Terbaca:', wallet.address);
  } catch (e) {
    console.error('❌ Ethers tetap menolak Private Key tersebut.');
    console.error('Tips: Pastikan panjang private key adalah 64 karakter (66 dengan 0x).');
    throw e;
  }

  const artifactPath = path.join(
    __dirname, '..', 'artifacts', 'contracts', 
    'PetIdentityRegistry.sol', 'PetIdentityRegistry.json'
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact tidak ditemukan di: ${artifactPath}`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

  try {
    const nextId = await contract.nextPetId();
    console.log('🔗 KONEKSI BERHASIL!');
    console.log('📜 Contract State:', nextId.toString());
  } catch (err) {
    throw new Error(`Gagal memanggil kontrak: ${err.message}`);
  }
}

main().catch((error) => {
  console.error('\n🛑 STATUS: Gagal');
  console.error('Detail Error:', error.message);
  process.exitCode = 1;
});