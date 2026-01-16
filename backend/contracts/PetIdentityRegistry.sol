// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PetIdentityRegistry
 * @notice Menyimpan identitas hewan, catatan medis, dan riwayat kepemilikan di blockchain.
 */
contract PetIdentityRegistry {
    // Data identitas dasar hewan.
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

    // Catatan vaksin/medis yang disimpan di chain.
    struct MedicalRecord {
        uint256 id;
        uint256 petId;
        string vaccineType;
        string batchNumber;
        uint256 givenAt;
        address clinic;
        bool verified;
    }

    // Penyimpanan utama hewan berdasarkan id.
    mapping(uint256 => Pet) public pets;
    // Peta publicId ke petId untuk lookup cepat.
    mapping(string => uint256) public publicIdToPetId;
    // Riwayat catatan medis per hewan.
    mapping(uint256 => MedicalRecord[]) public medicalRecords;

    // Counter id untuk pet dan record.
    uint256 public nextPetId;
    uint256 public nextRecordId;

    // Pemilik kontrak (admin) dan daftar klinik yang diizinkan.
    address public contractOwner;
    mapping(address => bool) public clinics;

    // Event untuk perubahan data klinik.
    event ClinicAdded(address clinic);
    event ClinicRemoved(address clinic);

    // Event untuk pendaftaran dan perubahan pet.
    event PetRegistered(uint256 indexed petId, string publicId, address indexed owner);
    event PetUpdated(uint256 indexed petId);

    // Event untuk catatan medis.
    event MedicalRecordAdded(uint256 indexed petId, uint256 indexed recordId);
    event MedicalRecordVerified(uint256 indexed petId, uint256 indexed recordId, bool verified);

    // Event untuk transfer kepemilikan.
    event OwnershipTransferred(uint256 indexed petId, address indexed oldOwner, address indexed newOwner);

    // Hanya pemilik kontrak.
    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Not contract owner");
        _;
    }

    // Hanya alamat klinik terdaftar.
    modifier onlyClinic() {
        require(clinics[msg.sender], "Caller is not clinic");
        _;
    }

    // Pastikan petId valid.
    modifier petExists(uint256 petId) {
        require(pets[petId].exists, "Pet does not exist");
        _;
    }

    // Hanya pemilik hewan saat ini.
    modifier onlyPetOwner(uint256 petId) {
        require(msg.sender == pets[petId].owner, "Not pet owner");
        _;
    }

    // Set pemilik kontrak pada saat deploy.
    constructor() {
        contractOwner = msg.sender;
    }

    // Tambah alamat klinik yang boleh menulis data.
    function addClinic(address clinic) external onlyContractOwner {
        require(clinic != address(0), "Invalid clinic");
        clinics[clinic] = true;
        emit ClinicAdded(clinic);
    }

    // Hapus akses klinik.
    function removeClinic(address clinic) external onlyContractOwner {
        require(clinics[clinic], "Clinic not found");
        clinics[clinic] = false;
        emit ClinicRemoved(clinic);
    }

    // Daftarkan hewan baru ke kontrak.
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

    // Update data dasar hewan oleh klinik.
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

    // Tambah catatan medis oleh klinik.
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

    // Verifikasi/tolak catatan medis.
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

    // Transfer kepemilikan hewan ke alamat baru.
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

    // Ambil data hewan berdasarkan id.
    function getPet(uint256 petId)
        external
        view
        petExists(petId)
        returns (Pet memory)
    {
        return pets[petId];
    }

    // Ambil daftar catatan medis berdasarkan petId.
    function getMedicalRecords(uint256 petId)
        external
        view
        petExists(petId)
        returns (MedicalRecord[] memory)
    {
        return medicalRecords[petId];
    }

    // Cari petId berdasarkan publicId.
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
