const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  anyValue,
} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const {
  buildHash,
  deployRegistryFixture,
  registerClinic,
  registerPet,
} = require("./helpers/petRegistryFactory");

describe("PetIdentityRegistry", function () {
  describe("register pet", function () {
    it("registers pet and stores owner/hash metadata", async function () {
      const { registry, petOwner } = await loadFixture(deployRegistryFixture);
      const petHash = buildHash("pet-success");

      await expect(registry.connect(petOwner).registerPet(petHash))
        .to.emit(registry, "PetRegistered")
        .withArgs(1n, petHash, 1n, petOwner.address, anyValue);

      const pet = await registry.getPet(1);
      expect(pet.id).to.equal(1n);
      expect(pet.owner).to.equal(petOwner.address);
      expect(pet.dataHash).to.equal(petHash);
      expect(pet.status).to.equal(1n);
    });

    it("rejects duplicate data hash", async function () {
      const { registry, petOwner } = await loadFixture(deployRegistryFixture);
      const petHash = buildHash("pet-duplicate");

      await registry.connect(petOwner).registerPet(petHash);
      await expect(
        registry.connect(petOwner).registerPet(petHash)
      ).to.be.revertedWith("dataHash already used");
    });
  });

  describe("add medical record", function () {
    it("allows authorized clinic to add medical record", async function () {
      const { registry, contractOwner, petOwner, clinic } = await loadFixture(
        deployRegistryFixture
      );
      const { petId } = await registerPet(registry, petOwner, "pet-medical");
      const recordHash = buildHash("record-added");

      await registerClinic(registry, contractOwner, clinic.address);

      await expect(registry.connect(clinic).addMedicalRecord(petId, recordHash))
        .to.emit(registry, "MedicalRecordAdded")
        .withArgs(1n, petId, recordHash, 0n, clinic.address, anyValue);

      const records = await registry.getMedicalRecords(petId);
      expect(records).to.have.length(1);
      expect(records[0].dataHash).to.equal(recordHash);
      expect(records[0].status).to.equal(0n);
    });

    it("rejects unauthorized clinic and invalid pet id", async function () {
      const { registry, petOwner, clinic, stranger } = await loadFixture(
        deployRegistryFixture
      );
      const { petId } = await registerPet(
        registry,
        petOwner,
        "pet-medical-reject"
      );
      const recordHash = buildHash("record-reject");

      await expect(
        registry.connect(clinic).addMedicalRecord(petId, recordHash)
      ).to.be.revertedWith("Caller is not clinic");

      await expect(
        registry.connect(stranger).addMedicalRecord(999n, recordHash)
      ).to.be.revertedWith("Pet does not exist");
    });
  });

  describe("review medical record", function () {
    it("reviews medical record with VERIFIED status", async function () {
      const { registry, contractOwner, petOwner, clinic } = await loadFixture(
        deployRegistryFixture
      );
      const { petId } = await registerPet(registry, petOwner, "pet-reviewed");
      const recordHash = buildHash("record-reviewed");

      await registerClinic(registry, contractOwner, clinic.address);
      await registry.connect(clinic).addMedicalRecord(petId, recordHash);

      await expect(registry.connect(clinic).verifyMedicalRecord(1n, 1))
        .to.emit(registry, "MedicalRecordReviewed")
        .withArgs(1n, petId, recordHash, 1n, clinic.address, anyValue);

      const records = await registry.getMedicalRecords(petId);
      expect(records[0].status).to.equal(1n);
      expect(records[0].verifiedBy).to.equal(clinic.address);
    });

    it("rejects unauthorized review and invalid status", async function () {
      const { registry, contractOwner, petOwner, clinic, stranger } =
        await loadFixture(deployRegistryFixture);
      const { petId } = await registerPet(
        registry,
        petOwner,
        "pet-review-reject"
      );
      const recordHash = buildHash("record-review-reject");

      await registerClinic(registry, contractOwner, clinic.address);
      await registry.connect(clinic).addMedicalRecord(petId, recordHash);

      await expect(
        registry.connect(stranger).verifyMedicalRecord(1n, 1)
      ).to.be.revertedWith("Caller is not clinic");

      await expect(
        registry.connect(clinic).verifyMedicalRecord(1n, 0)
      ).to.be.revertedWith("Invalid status");
    });
  });

  describe("transfer ownership", function () {
    it("transfers ownership to new valid owner", async function () {
      const { registry, petOwner, newOwner } = await loadFixture(
        deployRegistryFixture
      );
      const { petId, dataHash } = await registerPet(
        registry,
        petOwner,
        "pet-transfer"
      );

      await expect(
        registry.connect(petOwner).transferOwnership(petId, newOwner.address)
      )
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(
          petId,
          dataHash,
          1n,
          petOwner.address,
          anyValue,
          petOwner.address,
          newOwner.address
        );

      const pet = await registry.getPet(petId);
      expect(pet.owner).to.equal(newOwner.address);
    });

    it("rejects non-owner transfer and zero address target", async function () {
      const { registry, petOwner, newOwner, stranger } = await loadFixture(
        deployRegistryFixture
      );
      const { petId } = await registerPet(
        registry,
        petOwner,
        "pet-transfer-reject"
      );

      await expect(
        registry.connect(stranger).transferOwnership(petId, newOwner.address)
      ).to.be.revertedWith("Not pet owner");

      await expect(
        registry
          .connect(petOwner)
          .transferOwnership(petId, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner");
    });
  });
});
