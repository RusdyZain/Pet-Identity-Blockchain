const { ethers } = require("hardhat");

const buildHash = (value) => ethers.keccak256(ethers.toUtf8Bytes(value));

async function deployRegistryFixture() {
  const [contractOwner, petOwner, clinic, newOwner, stranger] =
    await ethers.getSigners();

  const Registry = await ethers.getContractFactory("PetIdentityRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  return { registry, contractOwner, petOwner, clinic, newOwner, stranger };
}

async function registerClinic(registry, contractOwner, clinicAddress) {
  await registry.connect(contractOwner).addClinic(clinicAddress);
}

async function registerPet(registry, petOwner, label) {
  const dataHash = buildHash(label);
  await registry.connect(petOwner).registerPet(dataHash);
  const petId = await registry.getPetIdByHash(dataHash);
  return { petId, dataHash };
}

module.exports = {
  buildHash,
  deployRegistryFixture,
  registerClinic,
  registerPet,
};
