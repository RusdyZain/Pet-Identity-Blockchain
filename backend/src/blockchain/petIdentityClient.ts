import { config as loadEnv } from 'dotenv';
import { Contract, JsonRpcProvider, Wallet, ethers } from 'ethers';
import path from 'path';
import fs from 'fs';

loadEnv();

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

const provider = new JsonRpcProvider(BLOCKCHAIN_RPC_URL);
const wallet = new Wallet(BLOCKCHAIN_PRIVATE_KEY, provider);

const artifactPath = path.join(
  __dirname,
  '../../artifacts/contracts/PetIdentityRegistry.sol/PetIdentityRegistry.json',
);
const artifactJson = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));

const contract: Contract = new Contract(PET_IDENTITY_ADDRESS, artifactJson.abi, wallet);

export async function registerPet(
  publicId: string,
  name: string,
  species: string,
  breed: string,
  birthDate: number,
): Promise<{ receipt: ethers.TransactionReceipt; petId: bigint }> {
  const tx = await contract.registerPet(publicId, name, species, breed, birthDate);
  const receipt = await tx.wait();

  const eventFragment = contract.interface.getEvent('PetRegistered');
  const topic = contract.interface.getEventTopic(eventFragment);
  const log = receipt.logs.find((entry) => entry.topics[0] === topic);

  if (!log) {
    throw new Error('PetRegistered event not found in transaction receipt');
  }

  const parsedLog = contract.interface.parseLog(log);
  const petId = parsedLog.args?.petId ?? parsedLog.args?.[0];
  if (petId === undefined) {
    throw new Error('Unable to decode petId from PetRegistered event');
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
  birthDate: number,
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.updatePetBasicData(petId, name, species, breed, birthDate);
  return tx.wait();
}

export async function addMedicalRecord(
  petId: number,
  vaccineType: string,
  batchNumber: string,
  givenAt: number,
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.addMedicalRecord(petId, vaccineType, batchNumber, givenAt);
  return tx.wait();
}

export async function verifyMedicalRecord(
  petId: number,
  recordIndex: number,
  verified: boolean,
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.verifyMedicalRecord(petId, recordIndex, verified);
  return tx.wait();
}

export async function transferOwnership(
  petId: number,
  newOwner: string,
): Promise<ethers.TransactionReceipt> {
  const tx = await contract.transferOwnership(petId, newOwner);
  return tx.wait();
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
