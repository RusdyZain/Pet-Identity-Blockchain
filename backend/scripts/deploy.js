const fs = require('fs');
const path = require('path');
const { ethers, network } = require('hardhat');

// Script deploy kontrak dan simpan info hasil deploy ke file.
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // Compile + deploy kontrak.
  const PetIdentityRegistry = await ethers.getContractFactory('PetIdentityRegistry');
  const contract = await PetIdentityRegistry.deploy();
  await contract.waitForDeployment();

  // Ambil alamat kontrak untuk disimpan.
  const address = await contract.getAddress();
  console.log('PetIdentityRegistry deployed to:', address);

  // Hardhat chooses the target network (e.g., localhost or Sepolia testnet).
  // Sepolia is a test environment used only as a deploy target here.
  const output = {
    network: network.name,
    address,
    deployedAt: new Date().toISOString(),
  };

  // Simpan output agar backend bisa membaca alamat kontrak.
  const outDir = path.join(__dirname, '..', 'deployed');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'petIdentity.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log('Saved deployment info to', outPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
