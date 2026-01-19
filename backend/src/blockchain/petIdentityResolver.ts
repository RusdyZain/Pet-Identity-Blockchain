import { prisma } from "../config/prisma";
import { AppError } from "../utils/errors";
import {
  getPet,
  getPetIdByPublicId,
  isLocalBlockchain,
  registerPet,
} from "./petIdentityClient";

export type PetChainPayload = {
  id: number;
  publicId: string;
  onChainPetId: number | null;
  name: string;
  species: string;
  breed: string;
  birthDate: Date;
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

const isPublicIdAlreadyUsedError = (error: unknown): boolean => {
  const message = getBlockchainErrorMessage(error);
  return typeof message === "string"
    ? message.toLowerCase().includes("publicid already used")
    : false;
};

const tryGetPetIdByPublicId = async (
  publicId: string
): Promise<number | null> => {
  try {
    const petId = await getPetIdByPublicId(publicId);
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

  const existingId = await tryGetPetIdByPublicId(pet.publicId);
  if (existingId !== null) {
    await prisma.pet.update({
      where: { id: pet.id },
      data: { onChainPetId: existingId },
    });
    return existingId;
  }

  const birthDateTimestamp = Math.floor(pet.birthDate.getTime() / 1000);
  try {
    const { petId: newOnChainPetId } = await registerPet(
      pet.publicId,
      pet.name,
      pet.species,
      pet.breed,
      birthDateTimestamp
    );
    const resolvedId = Number(newOnChainPetId);
    await prisma.pet.update({
      where: { id: pet.id },
      data: { onChainPetId: resolvedId },
    });
    return resolvedId;
  } catch (error) {
    if (isPublicIdAlreadyUsedError(error)) {
      const fallbackId = await tryGetPetIdByPublicId(pet.publicId);
      if (fallbackId !== null) {
        await prisma.pet.update({
          where: { id: pet.id },
          data: { onChainPetId: fallbackId },
        });
        return fallbackId;
      }
    }
    throw error;
  }
};
