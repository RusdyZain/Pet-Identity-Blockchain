import { Request, Response, NextFunction } from "express";
import {
  createPet,
  getOwnershipHistory,
  getPetById,
  listPets,
  initiateTransfer,
  acceptTransfer,
  createCorrectionRequest,
  generatePublicId,
} from "../services/petService";
import { AppError } from "../utils/errors";
import {
  getBackendWalletAddress,
  registerPet,
} from "../blockchain/petIdentityClient";
import { buildPetDataHash } from "../utils/dataHash";
import { ensureUserWalletAddress } from "../services/userWalletService";

// Handler pembuatan hewan baru (DB + blockchain).
export const createPetController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const { name, species, breed, birth_date, color, physical_mark } = req.body;
    let { publicId, public_id: publicIdSnake } = req.body as {
      publicId?: string;
      public_id?: string;
    };
    let resolvedPublicId =
      typeof publicId === "string" && publicId.trim().length > 0
        ? publicId.trim()
        : typeof publicIdSnake === "string" && publicIdSnake.trim().length > 0
        ? publicIdSnake.trim()
        : undefined;

    if (
      !name ||
      !species ||
      !breed ||
      !birth_date ||
      !color ||
      !physical_mark
    ) {
      throw new AppError("Missing required fields", 400);
    }

    const birthDate = new Date(birth_date);
    if (Number.isNaN(birthDate.getTime())) {
      throw new AppError("Tanggal lahir tidak valid", 400);
    }

    if (!resolvedPublicId) {
      resolvedPublicId = generatePublicId();
    }

    const dataHash = buildPetDataHash({
      publicId: resolvedPublicId,
      name,
      species,
      breed,
      birthDate,
      color,
      physicalMark: physical_mark,
    });

    try {
      const walletAddress = getBackendWalletAddress();
      await ensureUserWalletAddress(req.user.id, walletAddress);

      const { receipt, petId: onChainPetId } = await registerPet(dataHash);

      const pet = await createPet(req.user.id, {
        publicId: resolvedPublicId,
        onChainPetId: Number(onChainPetId),
        dataHash,
        txHash: receipt.hash,
        name,
        species,
        breed,
        birthDate,
        color,
        physicalMark: physical_mark,
      });

      return res.status(201).json({
        pet,
        blockchain: {
          txHash: receipt.hash,
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
    const { new_owner_email } = req.body;
    if (!new_owner_email) throw new AppError("new_owner_email required", 400);

    const result = await initiateTransfer(petId, req.user.id, new_owner_email);
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
