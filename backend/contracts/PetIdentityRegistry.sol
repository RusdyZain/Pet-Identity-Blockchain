// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PetIdentityRegistry
 * @notice Menyimpan identitas hewan, catatan medis, dan riwayat kepemilikan di blockchain.
 */
contract PetIdentityRegistry {
    enum Status {
        PENDING,
        VERIFIED,
        REJECTED
    }

    // Data identitas hewan (ringkas, hanya hash + audit).
    struct Pet {
        uint256 id;
        bytes32 dataHash;
        address owner;
        Status status;
        uint256 createdAt;
        uint256 verifiedAt;
        address verifiedBy;
        bool exists;
    }

    // Catatan medis yang disimpan di chain (hash + audit).
    struct MedicalRecord {
        uint256 id;
        uint256 petId;
        bytes32 dataHash;
        address clinic;
        Status status;
        uint256 createdAt;
        uint256 verifiedAt;
        address verifiedBy;
    }

    struct RecordPointer {
        uint256 petId;
        uint256 index;
        bool exists;
    }

    // Penyimpanan utama hewan berdasarkan id.
    mapping(uint256 => Pet) public pets;
    // Riwayat catatan medis per hewan.
    mapping(uint256 => MedicalRecord[]) public medicalRecords;
    // Peta hash data pet ke petId untuk lookup cepat.
    mapping(bytes32 => uint256) public petHashToId;
    // Peta recordId ke petId + index di array.
    mapping(uint256 => RecordPointer) public recordPointers;

    // Counter id untuk pet dan record.
    uint256 public nextPetId;
    uint256 public nextRecordId;

    // Pemilik kontrak (admin) dan daftar klinik yang diizinkan.
    address public contractOwner;
    mapping(address => bool) public clinics;

    // Event untuk perubahan data klinik.
    event ClinicAccessUpdated(
        address indexed clinic,
        Status status,
        address indexed actor,
        uint256 timestamp,
        bytes32 dataHash
    );

    // Event untuk pendaftaran dan perubahan pet.
    event PetRegistered(
        uint256 indexed petId,
        bytes32 dataHash,
        Status status,
        address indexed actor,
        uint256 timestamp
    );
    event PetUpdated(
        uint256 indexed petId,
        bytes32 dataHash,
        Status status,
        address indexed actor,
        uint256 timestamp
    );

    // Event untuk catatan medis.
    event MedicalRecordAdded(
        uint256 indexed recordId,
        uint256 indexed petId,
        bytes32 dataHash,
        Status status,
        address indexed actor,
        uint256 timestamp
    );
    event MedicalRecordReviewed(
        uint256 indexed recordId,
        uint256 indexed petId,
        bytes32 dataHash,
        Status status,
        address indexed actor,
        uint256 timestamp
    );

    // Event untuk transfer kepemilikan.
    event OwnershipTransferred(
        uint256 indexed petId,
        bytes32 dataHash,
        Status status,
        address indexed actor,
        uint256 timestamp,
        address oldOwner,
        address newOwner
    );

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
        emit ClinicAccessUpdated(
            clinic,
            Status.VERIFIED,
            msg.sender,
            block.timestamp,
            keccak256(abi.encodePacked(clinic))
        );
    }

    // Hapus akses klinik.
    function removeClinic(address clinic) external onlyContractOwner {
        require(clinics[clinic], "Clinic not found");
        clinics[clinic] = false;
        emit ClinicAccessUpdated(
            clinic,
            Status.REJECTED,
            msg.sender,
            block.timestamp,
            keccak256(abi.encodePacked(clinic))
        );
    }

    // Daftarkan hewan baru ke kontrak.
    function registerPet(bytes32 dataHash) external returns (uint256) {
        require(petHashToId[dataHash] == 0, "dataHash already used");

        nextPetId += 1;
        uint256 petId = nextPetId;

        pets[petId] = Pet({
            id: petId,
            owner: msg.sender,
            dataHash: dataHash,
            status: Status.VERIFIED,
            createdAt: block.timestamp,
            verifiedAt: block.timestamp,
            verifiedBy: msg.sender,
            exists: true
        });

        petHashToId[dataHash] = petId;

        emit PetRegistered(
            petId,
            dataHash,
            Status.VERIFIED,
            msg.sender,
            block.timestamp
        );
        return petId;
    }

    // Update data hash hewan oleh klinik.
    function updatePetBasicData(uint256 petId, bytes32 dataHash)
        external
        petExists(petId)
        onlyClinic
    {
        uint256 existingId = petHashToId[dataHash];
        require(
            existingId == 0 || existingId == petId,
            "dataHash already used"
        );
        Pet storage pet = pets[petId];
        pet.dataHash = dataHash;
        pet.status = Status.VERIFIED;
        pet.verifiedAt = block.timestamp;
        pet.verifiedBy = msg.sender;
        petHashToId[dataHash] = petId;

        emit PetUpdated(
            petId,
            dataHash,
            pet.status,
            msg.sender,
            block.timestamp
        );
    }

    // Tambah catatan medis oleh klinik.
    function addMedicalRecord(uint256 petId, bytes32 dataHash)
        external
        petExists(petId)
        onlyClinic
        returns (uint256)
    {
        nextRecordId += 1;
        uint256 recordId = nextRecordId;

        medicalRecords[petId].push(
            MedicalRecord({
                id: recordId,
                petId: petId,
                clinic: msg.sender,
                dataHash: dataHash,
                status: Status.PENDING,
                createdAt: block.timestamp,
                verifiedAt: 0,
                verifiedBy: address(0)
            })
        );

        recordPointers[recordId] = RecordPointer({
            petId: petId,
            index: medicalRecords[petId].length - 1,
            exists: true
        });

        emit MedicalRecordAdded(
            recordId,
            petId,
            dataHash,
            Status.PENDING,
            msg.sender,
            block.timestamp
        );
        return recordId;
    }

    // Verifikasi/tolak catatan medis.
    function verifyMedicalRecord(uint256 recordId, Status status)
        external
        onlyClinic
    {
        require(
            status == Status.VERIFIED || status == Status.REJECTED,
            "Invalid status"
        );
        RecordPointer memory pointer = recordPointers[recordId];
        require(pointer.exists, "Record does not exist");

        MedicalRecord storage record = medicalRecords[pointer.petId][
            pointer.index
        ];
        require(record.status == Status.PENDING, "Record already reviewed");

        record.status = status;
        record.verifiedAt = block.timestamp;
        record.verifiedBy = msg.sender;

        emit MedicalRecordReviewed(
            recordId,
            pointer.petId,
            record.dataHash,
            status,
            msg.sender,
            block.timestamp
        );
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

        emit OwnershipTransferred(
            petId,
            pets[petId].dataHash,
            pets[petId].status,
            msg.sender,
            block.timestamp,
            oldOwner,
            newOwner
        );
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

    // Cari petId berdasarkan hash data.
    function getPetIdByHash(bytes32 dataHash)
        external
        view
        returns (uint256)
    {
        uint256 petId = petHashToId[dataHash];
        require(petId != 0 && pets[petId].exists, "Pet not found");
        return petId;
    }
}
