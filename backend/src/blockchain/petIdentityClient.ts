import { config as loadEnv } from "dotenv";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  ethers,
  Log,
  ContractTransactionResponse,
  ContractTransactionReceipt,
} from "ethers";
import path from "path";
import fs from "fs";

loadEnv();

const { BLOCKCHAIN_RPC_URL, BLOCKCHAIN_PRIVATE_KEY, PET_IDENTITY_ADDRESS } =
  process.env;

if (!BLOCKCHAIN_RPC_URL) {
  throw new Error("Missing BLOCKCHAIN_RPC_URL in environment variables.");
}
if (!BLOCKCHAIN_PRIVATE_KEY) {
  throw new Error("Missing BLOCKCHAIN_PRIVATE_KEY in environment variables.");
}
if (!PET_IDENTITY_ADDRESS) {
  throw new Error("Missing PET_IDENTITY_ADDRESS in environment variables.");
}

const provider = new JsonRpcProvider(BLOCKCHAIN_RPC_URL);
const wallet = new Wallet(BLOCKCHAIN_PRIVATE_KEY, provider);

const artifactPath = path.join(
  __dirname,
  "../../artifacts/contracts/PetIdentityRegistry.sol/PetIdentityRegistry.json"
);
const artifactJson = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

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
  transferOwnership: (
    petId: number,
    newOwner: string
  ) => Promise<ContractTransactionResponse>;
  getPet: (petId: number) => Promise<any>;
  getMedicalRecords: (petId: number) => Promise<any[]>;
};

const contract: PetIdentityContract = new Contract(
  PET_IDENTITY_ADDRESS,
  artifactJson.abi,
  wallet
) as PetIdentityContract;

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

  const eventFragment = contract.interface.getEvent("PetRegistered");
  if (!eventFragment) {
    throw new Error("PetRegistered event not found in ABI");
  }
  const topic = eventFragment.topicHash;
  const log = receipt.logs.find((entry: Log) => entry.topics?.[0] === topic);

  if (!log) {
    throw new Error("PetRegistered event not found in transaction receipt");
  }

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

export async function updatePetBasicData(
  petId: number,
  name: string,
  species: string,
  breed: string,
  birthDate: number
): Promise<ContractTransactionReceipt> {
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

export async function addMedicalRecord(
  petId: number,
  vaccineType: string,
  batchNumber: string,
  givenAt: number
): Promise<ContractTransactionReceipt> {
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

export async function verifyMedicalRecord(
  petId: number,
  recordIndex: number,
  verified: boolean
): Promise<ContractTransactionReceipt> {
  const tx = await contract.verifyMedicalRecord(petId, recordIndex, verified);
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Failed to fetch transaction receipt for verifyMedicalRecord");
  }
  return receipt;
}

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

export async function getPet(petId: number): Promise<any> {
  return contract.getPet(petId);
}

export async function getMedicalRecords(petId: number): Promise<any[]> {
  return contract.getMedicalRecords(petId);
}

// Example usage in an Express handler
/*
import { Request, Response } from 'express';

export async function registerPetHandler(req: Request, res: Response) {
  const { publicId, name, species, breed, birthDate } = req.body;
  const receipt = await registerPet(publicId, name, species, breed, Number(birthDate));
  return res.json({ txHash: receipt.hash });
}
*/
