import { AppDataSource } from "../config/dataSource";
import { Pet } from "../entities/Pet";
import { AppError } from "../utils/errors";
import {
  getPet,
  getPetIdByHash,
  isLocalBlockchain,
  registerPet,
} from "./petIdentityClient";
import { buildPetDataHash } from "../utils/dataHash";

export type PetChainPayload = {
  id: number;
  publicId: string;
  onChainPetId: number | null;
  dataHash?: string | null;
  name: string;
  species: string;
  breed: string;
  birthDate: Date;
  color: string;
  physicalMark: string;
};

export const getBlockchainErrorMessage = (
  error: unknown
): string | undefined => {
  if (!error) {
    return undefined;
  }
  const candidates = [
    (error as any)?.reason,
    (error as any)?.shortMessage,
    (error as any)?.error?.reason,
    (error as any)?.error?.message,
    (error as any)?.error?.error?.message,
    (error as any)?.info?.error?.message,
    (error as any)?.message,
  ];
  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.length > 0
  );
};

const isPetMissingError = (error: unknown): boolean => {
  const message = getBlockchainErrorMessage(error);
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return lower.includes("pet does not exist") || lower.includes("pet not found");
};

const isDataHashAlreadyUsedError = (error: unknown): boolean => {
  const message = getBlockchainErrorMessage(error);
  return typeof message === "string"
    ? message.toLowerCase().includes("datahash already used")
    : false;
};

const tryGetPetIdByHash = async (
  dataHash: string
): Promise<number | null> => {
  try {
    const petId = await getPetIdByHash(dataHash);
    return Number(petId);
  } catch (error) {
    if (isPetMissingError(error)) {
      return null;
    }
    throw error;
  }
};

export const resolveOnChainPetId = async (
  pet: PetChainPayload
): Promise<number> => {
  const localChain = await isLocalBlockchain();
  const storedId =
    typeof pet.onChainPetId === "number" && pet.onChainPetId > 0
      ? pet.onChainPetId
      : null;

  if (storedId) {
    try {
      await getPet(storedId);
      return storedId;
    } catch (error) {
      if (!isPetMissingError(error)) {
        throw error;
      }
    }
  }

  if (!localChain) {
    throw new AppError("Pet is not registered on blockchain", 400);
  }

  const resolvedDataHash =
    typeof pet.dataHash === "string" && pet.dataHash.length > 0
      ? pet.dataHash
      : buildPetDataHash({
          publicId: pet.publicId,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          birthDate: pet.birthDate,
          color: pet.color,
          physicalMark: pet.physicalMark,
        });

  const existingId = await tryGetPetIdByHash(resolvedDataHash);
  if (existingId !== null) {
    await AppDataSource.getRepository(Pet).update(
      { id: pet.id },
      { onChainPetId: existingId, dataHash: resolvedDataHash }
    );
    return existingId;
  }

  try {
    const { petId: newOnChainPetId, receipt } = await registerPet(
      resolvedDataHash
    );
    const resolvedId = Number(newOnChainPetId);
    await AppDataSource.getRepository(Pet).update(
      { id: pet.id },
      {
        onChainPetId: resolvedId,
        dataHash: resolvedDataHash,
        txHash: receipt.hash,
      }
    );
    return resolvedId;
  } catch (error) {
    if (isDataHashAlreadyUsedError(error)) {
      const fallbackId = await tryGetPetIdByHash(resolvedDataHash);
      if (fallbackId !== null) {
        await AppDataSource.getRepository(Pet).update(
          { id: pet.id },
          { onChainPetId: fallbackId, dataHash: resolvedDataHash }
        );
        return fallbackId;
      }
    }
    throw error;
  }
};
