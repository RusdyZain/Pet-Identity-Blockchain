// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PetIdentityRegistry
 * @notice Menyimpan identitas hewan, catatan medis, dan riwayat kepemilikan di blockchain.
 */
contract PetIdentityRegistry {
    struct Pet {
        uint256 id;
        string publicId;
        string name;
        string species;
        string breed;
        uint256 birthDate;
        address owner;
        bool exists;
    }

    struct MedicalRecord {
        uint256 id;
        uint256 petId;
        string vaccineType;
        string batchNumber;
        uint256 givenAt;
        address clinic;
        bool verified;
    }

    mapping(uint256 => Pet) public pets;
    mapping(string => uint256) public publicIdToPetId;
    mapping(uint256 => MedicalRecord[]) public medicalRecords;

    uint256 public nextPetId;
    uint256 public nextRecordId;

    address public contractOwner;
    mapping(address => bool) public clinics;

    event ClinicAdded(address clinic);
    event ClinicRemoved(address clinic);

    event PetRegistered(uint256 indexed petId, string publicId, address indexed owner);
    event PetUpdated(uint256 indexed petId);

    event MedicalRecordAdded(uint256 indexed petId, uint256 indexed recordId);
    event MedicalRecordVerified(uint256 indexed petId, uint256 indexed recordId, bool verified);

    event OwnershipTransferred(uint256 indexed petId, address indexed oldOwner, address indexed newOwner);

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Not contract owner");
        _;
    }

    modifier onlyClinic() {
        require(clinics[msg.sender], "Caller is not clinic");
        _;
    }

    modifier petExists(uint256 petId) {
        require(pets[petId].exists, "Pet does not exist");
        _;
    }

    modifier onlyPetOwner(uint256 petId) {
        require(msg.sender == pets[petId].owner, "Not pet owner");
        _;
    }

    constructor() {
        contractOwner = msg.sender;
    }

    function addClinic(address clinic) external onlyContractOwner {
        require(clinic != address(0), "Invalid clinic");
        clinics[clinic] = true;
        emit ClinicAdded(clinic);
    }

    function removeClinic(address clinic) external onlyContractOwner {
        require(clinics[clinic], "Clinic not found");
        clinics[clinic] = false;
        emit ClinicRemoved(clinic);
    }

    function registerPet(
        string memory publicId,
        string memory name,
        string memory species,
        string memory breed,
        uint256 birthDate
    ) external returns (uint256) {
        require(publicIdToPetId[publicId] == 0, "publicId already used");

        nextPetId += 1;
        uint256 petId = nextPetId;

        pets[petId] = Pet({
            id: petId,
            publicId: publicId,
            name: name,
            species: species,
            breed: breed,
            birthDate: birthDate,
            owner: msg.sender,
            exists: true
        });

        publicIdToPetId[publicId] = petId;

        emit PetRegistered(petId, publicId, msg.sender);
        return petId;
    }

    function updatePetBasicData(
        uint256 petId,
        string memory name,
        string memory species,
        string memory breed,
        uint256 birthDate
    ) external petExists(petId) onlyClinic {
        Pet storage pet = pets[petId];
        pet.name = name;
        pet.species = species;
        pet.breed = breed;
        pet.birthDate = birthDate;

        emit PetUpdated(petId);
    }

    function addMedicalRecord(
        uint256 petId,
        string memory vaccineType,
        string memory batchNumber,
        uint256 givenAt
    ) external petExists(petId) onlyClinic returns (uint256) {
        nextRecordId += 1;
        uint256 recordId = nextRecordId;

        medicalRecords[petId].push(
            MedicalRecord({
                id: recordId,
                petId: petId,
                vaccineType: vaccineType,
                batchNumber: batchNumber,
                givenAt: givenAt,
                clinic: msg.sender,
                verified: false
            })
        );

        emit MedicalRecordAdded(petId, recordId);
        return recordId;
    }

    function verifyMedicalRecord(
        uint256 petId,
        uint256 recordIndex,
        bool verified
    ) external petExists(petId) onlyClinic {
        require(recordIndex < medicalRecords[petId].length, "Record index out of bounds");

        MedicalRecord storage record = medicalRecords[petId][recordIndex];
        record.verified = verified;

        emit MedicalRecordVerified(petId, record.id, verified);
    }

    function transferOwnership(uint256 petId, address newOwner)
        external
        petExists(petId)
        onlyPetOwner(petId)
    {
        require(newOwner != address(0), "Invalid new owner");

        address oldOwner = pets[petId].owner;
        pets[petId].owner = newOwner;

        emit OwnershipTransferred(petId, oldOwner, newOwner);
    }

    function getPet(uint256 petId)
        external
        view
        petExists(petId)
        returns (Pet memory)
    {
        return pets[petId];
    }

    function getMedicalRecords(uint256 petId)
        external
        view
        petExists(petId)
        returns (MedicalRecord[] memory)
    {
        return medicalRecords[petId];
    }

    function getPetIdByPublicId(string memory publicId)
        external
        view
        returns (uint256)
    {
        uint256 petId = publicIdToPetId[publicId];
        require(petId != 0 && pets[petId].exists, "Pet not found");
        return petId;
    }
}
