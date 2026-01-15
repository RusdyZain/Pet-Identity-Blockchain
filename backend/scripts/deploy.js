const fs = require('fs');
const path = require('path');
const { ethers, network } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const PetIdentityRegistry = await ethers.getContractFactory('PetIdentityRegistry');
  const contract = await PetIdentityRegistry.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('PetIdentityRegistry deployed to:', address);

  // Hardhat chooses the target network (e.g., localhost or Sepolia testnet).
  // Sepolia is a test environment used only as a deploy target here.
  const output = {
    network: network.name,
    address,
    deployedAt: new Date().toISOString(),
  };

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
