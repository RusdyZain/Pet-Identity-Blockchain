const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  const { BLOCKCHAIN_RPC_URL, BLOCKCHAIN_PRIVATE_KEY, PET_IDENTITY_ADDRESS } = process.env;

  if (!BLOCKCHAIN_RPC_URL) {
    throw new Error('Missing BLOCKCHAIN_RPC_URL in environment variables.');
  }
  if (!BLOCKCHAIN_PRIVATE_KEY) {
    throw new Error('Missing BLOCKCHAIN_PRIVATE_KEY in environment variables.');
  }
  if (!PET_IDENTITY_ADDRESS) {
    throw new Error('Missing PET_IDENTITY_ADDRESS in environment variables.');
  }

  const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
  const wallet = new ethers.Wallet(BLOCKCHAIN_PRIVATE_KEY, provider);

  const artifactPath = path.join(
    __dirname,
    '..',
    'artifacts',
    'contracts',
    'PetIdentityRegistry.sol',
    'PetIdentityRegistry.json'
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const contract = new ethers.Contract(PET_IDENTITY_ADDRESS, artifact.abi, wallet);

  console.log('Running smoke test as wallet:', wallet.address);
  const nextPetId = await contract.nextPetId();
  console.log('Contract reachable. Current nextPetId:', nextPetId.toString());
}

main().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exitCode = 1;
});
