import { config as loadEnv } from "dotenv";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  Signer,
  ethers,
  Log,
  ContractTransactionResponse,
  ContractTransactionReceipt,
} from "ethers";
import path from "path";
import fs from "fs";

loadEnv();

// Konfigurasi RPC untuk integrasi aplikasi (Hardhat lokal atau testnet).
const { BLOCKCHAIN_RPC_URL, BLOCKCHAIN_PRIVATE_KEY, PET_IDENTITY_ADDRESS } =
  process.env;

// Pastikan variable environment wajib tersedia sebelum inisialisasi.
if (!BLOCKCHAIN_RPC_URL) {
  throw new Error("Missing BLOCKCHAIN_RPC_URL in environment variables.");
}
if (!BLOCKCHAIN_PRIVATE_KEY) {
  throw new Error("Missing BLOCKCHAIN_PRIVATE_KEY in environment variables.");
}
if (!PET_IDENTITY_ADDRESS) {
  throw new Error("Missing PET_IDENTITY_ADDRESS in environment variables.");
}

// Provider dan wallet untuk mengirim transaksi ke blockchain.
const provider = new JsonRpcProvider(BLOCKCHAIN_RPC_URL);
const wallet = new Wallet(BLOCKCHAIN_PRIVATE_KEY, provider);

// ABI kontrak dibaca dari artifact hasil compile.
const artifactPath = path.join(
  __dirname,
  "../../artifacts/contracts/PetIdentityRegistry.sol/PetIdentityRegistry.json"
);
const artifactJson = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

// Tipe kontrak agar pemanggilan method lebih jelas di TypeScript.
type PetIdentityContract = Contract & {
  registerPet: (
    publicId: string,
    name: string,
    species: string,
    breed: string,
    birthDate: number
  ) => Promise<ContractTransactionResponse>;
  updatePetBasicData: (
    petId: number,
    name: string,
    species: string,
    breed: string,
    birthDate: number
  ) => Promise<ContractTransactionResponse>;
  addMedicalRecord: (
    petId: number,
    vaccineType: string,
    batchNumber: string,
    givenAt: number
  ) => Promise<ContractTransactionResponse>;
  verifyMedicalRecord: (
    petId: number,
    recordIndex: number,
    verified: boolean
  ) => Promise<ContractTransactionResponse>;
  clinics: (clinic: string) => Promise<boolean>;
  addClinic: (clinic: string) => Promise<ContractTransactionResponse>;
  contractOwner: () => Promise<string>;
  getPetIdByPublicId: (publicId: string) => Promise<bigint>;
  transferOwnership: (
    petId: number,
    newOwner: string
  ) => Promise<ContractTransactionResponse>;
  getPet: (petId: number) => Promise<any>;
  getMedicalRecords: (petId: number) => Promise<any[]>;
};

// Instance kontrak yang terhubung dengan wallet backend.
const contract: PetIdentityContract = new Contract(
  PET_IDENTITY_ADDRESS,
  artifactJson.abi,
  wallet
) as PetIdentityContract;

const LOCAL_CHAIN_IDS = new Set([1337, 31337]);
let cachedChainId: number | null = null;
let clinicAccessEnsured = false;

const getChainId = async (): Promise<number> => {
  if (cachedChainId !== null) {
    return cachedChainId;
  }
  const network = await provider.getNetwork();
  cachedChainId = Number(network.chainId);
  return cachedChainId;
};

export const isLocalBlockchain = async (): Promise<boolean> => {
  const chainId = await getChainId();
  return LOCAL_CHAIN_IDS.has(chainId);
};

const ensureClinicAccess = async (): Promise<void> => {
  if (clinicAccessEnsured) {
    return;
  }
  if (!(await isLocalBlockchain())) {
    return;
  }

  const isClinic = await contract.clinics(wallet.address);
  if (isClinic) {
    clinicAccessEnsured = true;
    return;
  }

  const owner = await contract.contractOwner();
  const ownerSigner: Signer =
    owner.toLowerCase() === wallet.address.toLowerCase()
      ? wallet
      : await provider.getSigner(owner);
  const ownerContract = contract.connect(ownerSigner) as PetIdentityContract;
  const tx = await ownerContract.addClinic(wallet.address);
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Failed to whitelist clinic wallet on local chain");
  }
  clinicAccessEnsured = true;
};

// Daftarkan hewan di kontrak dan kembalikan receipt + petId on-chain.
export async function registerPet(
  publicId: string,
  name: string,
  species: string,
  breed: string,
  birthDate: number
): Promise<{ receipt: ContractTransactionReceipt; petId: bigint }> {
  const tx = await contract.registerPet(
    publicId,
    name,
    species,
    breed,
    birthDate
  );
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Failed to fetch transaction receipt for registerPet");
  }

  // Ambil event PetRegistered dari receipt untuk membaca petId.
  const eventFragment = contract.interface.getEvent("PetRegistered");
  if (!eventFragment) {
    throw new Error("PetRegistered event not found in ABI");
  }
  const topic = eventFragment.topicHash;
  const log = receipt.logs.find((entry: Log) => entry.topics?.[0] === topic);

  if (!log) {
    throw new Error("PetRegistered event not found in transaction receipt");
  }

  // Decode log event agar bisa membaca petId hasil register.
  const parsedLog = contract.interface.parseLog(log);
  if (!parsedLog) {
    throw new Error("Failed to parse PetRegistered event log");
  }
  const petId = parsedLog.args?.petId ?? parsedLog.args?.[0];
  if (petId === undefined) {
    throw new Error("Unable to decode petId from PetRegistered event");
  }

  return {
    receipt,
    petId: BigInt(petId),
  };
}

// Update data dasar hewan di kontrak.
export async function updatePetBasicData(
  petId: number,
  name: string,
  species: string,
  breed: string,
  birthDate: number
): Promise<ContractTransactionReceipt> {
  await ensureClinicAccess();
  const tx = await contract.updatePetBasicData(
    petId,
    name,
    species,
    breed,
    birthDate
  );
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Failed to fetch transaction receipt for updatePetBasicData");
  }
  return receipt;
}

// Tambahkan catatan medis ke kontrak.
export async function addMedicalRecord(
  petId: number,
  vaccineType: string,
  batchNumber: string,
  givenAt: number
): Promise<ContractTransactionReceipt> {
  await ensureClinicAccess();
  const tx = await contract.addMedicalRecord(
    petId,
    vaccineType,
    batchNumber,
    givenAt
  );
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Failed to fetch transaction receipt for addMedicalRecord");
  }
  return receipt;
}

// Verifikasi catatan medis di kontrak.
export async function verifyMedicalRecord(
  petId: number,
  recordIndex: number,
  verified: boolean
): Promise<ContractTransactionReceipt> {
  await ensureClinicAccess();
  const tx = await contract.verifyMedicalRecord(petId, recordIndex, verified);
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Failed to fetch transaction receipt for verifyMedicalRecord");
  }
  return receipt;
}

// Transfer kepemilikan hewan di kontrak.
export async function transferOwnership(
  petId: number,
  newOwner: string
): Promise<ContractTransactionReceipt> {
  const tx = await contract.transferOwnership(petId, newOwner);
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Failed to fetch transaction receipt for transferOwnership");
  }
  return receipt;
}

// Ambil data hewan dari kontrak.
export async function getPet(petId: number): Promise<any> {
  return contract.getPet(petId);
}

// Ambil seluruh catatan medis dari kontrak.
export async function getMedicalRecords(petId: number): Promise<any[]> {
  return contract.getMedicalRecords(petId);
}

export async function getPetIdByPublicId(publicId: string): Promise<bigint> {
  return contract.getPetIdByPublicId(publicId);
}

// Contoh penggunaan di handler Express.
/*
import { Request, Response } from 'express';

export async function registerPetHandler(req: Request, res: Response) {
  const { publicId, name, species, breed, birthDate } = req.body;
  const receipt = await registerPet(publicId, name, species, breed, Number(birthDate));
  return res.json({ txHash: receipt.hash });
}
*/
