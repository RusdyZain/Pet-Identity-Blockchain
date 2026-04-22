import { Request, Response, NextFunction } from "express";
import {
  createPet,
  getOwnershipHistory,
  getPetById,
  getTransferContext,
  listPets,
  initiateTransfer,
  rejectTransfer,
  acceptTransfer,
  createCorrectionRequest,
  generatePublicId,
} from "../services/petService";
import { AppError } from "../utils/errors";
import {
  confirmRegisterPetTx,
  prepareRegisterPetTx,
  prepareTransferOwnershipTx,
  confirmTransferOwnershipTx,
} from "../blockchain/petIdentityClient";
import { buildPetDataHash } from "../utils/dataHash";
import { ensureUserWalletAddress } from "../services/userWalletService";

const parsePetFormPayload = (payload: Record<string, unknown>) => {
  const name = `${payload.name ?? ""}`.trim();
  const species = `${payload.species ?? ""}`.trim();
  const breed = `${payload.breed ?? ""}`.trim();
  const color = `${payload.color ?? ""}`.trim();
  const physicalMark = `${payload.physical_mark ?? ""}`.trim();
  const birthDateRaw = `${payload.birth_date ?? ""}`.trim();
  const txHash = typeof payload.txHash === "string" ? payload.txHash.trim() : "";

  let { publicId, public_id: publicIdSnake } = payload as {
    publicId?: string;
    public_id?: string;
  };
  const resolvedPublicId =
    typeof publicId === "string" && publicId.trim().length > 0
      ? publicId.trim()
      : typeof publicIdSnake === "string" && publicIdSnake.trim().length > 0
      ? publicIdSnake.trim()
      : undefined;

  if (!name || !species || !breed || !birthDateRaw || !color || !physicalMark) {
    throw new AppError("Missing required fields", 400);
  }

  const birthDate = new Date(birthDateRaw);
  if (Number.isNaN(birthDate.getTime())) {
    throw new AppError("Tanggal lahir tidak valid", 400);
  }

  return {
    name,
    species,
    breed,
    color,
    physicalMark,
    birthDate,
    txHash,
    publicId: resolvedPublicId,
  };
};

export const preparePetRegistrationController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const parsed = parsePetFormPayload(req.body as Record<string, unknown>);
    const publicId = parsed.publicId ?? generatePublicId();
    const dataHash = buildPetDataHash({
      publicId,
      name: parsed.name,
      species: parsed.species,
      breed: parsed.breed,
      birthDate: parsed.birthDate,
      color: parsed.color,
      physicalMark: parsed.physicalMark,
    });

    const txRequest = prepareRegisterPetTx(dataHash);
    res.json({ publicId, dataHash, txRequest });
  } catch (error) {
    next(error);
  }
};

// Handler pembuatan hewan baru (DB + blockchain).
export const createPetController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const parsed = parsePetFormPayload(req.body as Record<string, unknown>);
    if (!parsed.txHash) {
      throw new AppError("txHash is required", 400);
    }

    const resolvedPublicId = parsed.publicId ?? generatePublicId();

    const dataHash = buildPetDataHash({
      publicId: resolvedPublicId,
      name: parsed.name,
      species: parsed.species,
      breed: parsed.breed,
      birthDate: parsed.birthDate,
      color: parsed.color,
      physicalMark: parsed.physicalMark,
    });

    try {
      const walletAddress = req.user.walletAddress;
      await ensureUserWalletAddress(req.user.id, walletAddress);

      const { petId: onChainPetId, metadata } = await confirmRegisterPetTx({
        txHash: parsed.txHash,
        expectedDataHash: dataHash,
        expectedWalletAddress: walletAddress,
      });

      const pet = await createPet(req.user.id, {
        publicId: resolvedPublicId,
        onChainPetId,
        dataHash,
        txHash: metadata.txHash,
        blockNumber: metadata.blockNumber,
        blockTimestamp: metadata.blockTimestamp,
        name: parsed.name,
        species: parsed.species,
        breed: parsed.breed,
        birthDate: parsed.birthDate,
        color: parsed.color,
        physicalMark: parsed.physicalMark,
      });

      return res.status(201).json({
        pet,
        blockchain: {
          txHash: metadata.txHash,
          blockNumber: metadata.blockNumber,
          blockTimestamp: metadata.blockTimestamp.toISOString(),
          onChainPetId: onChainPetId.toString(),
        },
      });
    } catch (blockchainError: any) {
      console.error("Failed to register pet on blockchain", blockchainError);
      return res
        .status(500)
        .json({
          error: blockchainError?.message ?? "Failed to sync pet to blockchain",
        });
    }
  } catch (error) {
    next(error);
  }
};

// Handler list hewan untuk dashboard.
export const listPetsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const search =
      typeof req.query.search === "string" && req.query.search.length > 0
        ? req.query.search
        : undefined;
    const pets = await listPets(req.user, search ? { search } : undefined);
    res.json(pets);
  } catch (error) {
    next(error);
  }
};

// Handler detail hewan berdasarkan id.
export const getPetController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.id);
    if (!Number.isInteger(petId)) {
      throw new AppError("Invalid pet id", 400);
    }
    const pet = await getPetById(petId, req.user);
    res.json(pet);
  } catch (error) {
    next(error);
  }
};

// Handler riwayat kepemilikan hewan.
export const ownershipHistoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError("Invalid pet id", 400);
    }
    const history = await getOwnershipHistory(petId, req.user);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

export const prepareTransferController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError("Invalid pet id", 400);
    }
    const { new_owner_email } = req.body;
    if (!new_owner_email) {
      throw new AppError("new_owner_email required", 400);
    }

    const context = await getTransferContext(petId, req.user.id, new_owner_email);
    const txRequest = prepareTransferOwnershipTx(
      context.onChainPetId,
      context.newOwnerWalletAddress
    );

    res.json({
      onChainPetId: context.onChainPetId,
      newOwnerWalletAddress: context.newOwnerWalletAddress,
      txRequest,
    });
  } catch (error) {
    next(error);
  }
};

// Handler pengajuan transfer kepemilikan.
export const initiateTransferController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError("Invalid pet id", 400);
    }
    const { new_owner_email, txHash } = req.body;
    if (!new_owner_email) throw new AppError("new_owner_email required", 400);
    if (!txHash || typeof txHash !== "string" || !txHash.trim()) {
      throw new AppError("txHash is required", 400);
    }

    const context = await getTransferContext(petId, req.user.id, new_owner_email);
    await ensureUserWalletAddress(req.user.id, context.currentOwnerWalletAddress);

    const { metadata } = await confirmTransferOwnershipTx({
      txHash: txHash.trim(),
      expectedPetId: context.onChainPetId,
      expectedFromWalletAddress: context.currentOwnerWalletAddress,
      expectedToWalletAddress: context.newOwnerWalletAddress,
    });

    const result = await initiateTransfer(petId, req.user.id, new_owner_email, {
      onChainPetId: context.onChainPetId,
      txHash: metadata.txHash,
      blockNumber: metadata.blockNumber,
      blockTimestamp: metadata.blockTimestamp,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Handler penerimaan transfer kepemilikan.
export const acceptTransferController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError("Invalid pet id", 400);
    }
    const pet = await acceptTransfer(petId, req.user.id);
    res.json(pet);
  } catch (error) {
    next(error);
  }
};

// Handler penolakan transfer kepemilikan oleh pemilik baru.
export const rejectTransferController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError("Invalid pet id", 400);
    }
    const pet = await rejectTransfer(petId, req.user.id);
    res.json(pet);
  } catch (error) {
    next(error);
  }
};

// Handler permintaan koreksi data oleh pemilik.
export const createCorrectionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError("Invalid pet id", 400);
    }
    const { field_name, new_value, reason } = req.body;
    if (!field_name || !new_value)
      throw new AppError("field_name dan new_value wajib", 400);

    const correction = await createCorrectionRequest({
      petId,
      ownerId: req.user.id,
      fieldName: field_name,
      newValue: new_value,
      reason,
    });

    res.status(201).json(correction);
  } catch (error) {
    next(error);
  }
};
