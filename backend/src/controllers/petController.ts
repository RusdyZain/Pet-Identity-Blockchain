import { Request, Response, NextFunction } from 'express';
import {
  createPet,
  getOwnershipHistory,
  getPetById,
  listPets,
  initiateTransfer,
  acceptTransfer,
  createCorrectionRequest,
} from '../services/petService';
import { AppError } from '../utils/errors';

export const createPetController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { name, species, breed, birth_date, color, physical_mark } = req.body;

    if (!name || !species || !breed || !birth_date || !color || !physical_mark) {
      throw new AppError('Missing required fields', 400);
    }

    const birthDate = new Date(birth_date);
    if (Number.isNaN(birthDate.getTime())) {
      throw new AppError('Tanggal lahir tidak valid', 400);
    }

    const pet = await createPet(req.user.id, {
      name,
      species,
      breed,
      birthDate,
      color,
      physicalMark: physical_mark,
    });

    res.status(201).json(pet);
  } catch (error) {
    next(error);
  }
};

export const listPetsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const search =
      typeof req.query.search === 'string' && req.query.search.length > 0
        ? req.query.search
        : undefined;
    const pets = await listPets(req.user, search ? { search } : undefined);
    res.json(pets);
  } catch (error) {
    next(error);
  }
};

export const getPetController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const petId = Number(req.params.id);
    if (!Number.isInteger(petId)) {
      throw new AppError('Invalid pet id', 400);
    }
    const pet = await getPetById(petId, req.user);
    res.json(pet);
  } catch (error) {
    next(error);
  }
};

export const ownershipHistoryController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError('Invalid pet id', 400);
    }
    const history = await getOwnershipHistory(petId, req.user);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

export const initiateTransferController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError('Invalid pet id', 400);
    }
    const { new_owner_email } = req.body;
    if (!new_owner_email) throw new AppError('new_owner_email required', 400);

    const result = await initiateTransfer(petId, req.user.id, new_owner_email);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const acceptTransferController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError('Invalid pet id', 400);
    }
    const pet = await acceptTransfer(petId, req.user.id);
    res.json(pet);
  } catch (error) {
    next(error);
  }
};

export const createCorrectionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId)) {
      throw new AppError('Invalid pet id', 400);
    }
    const { field_name, new_value, reason } = req.body;
    if (!field_name || !new_value) throw new AppError('field_name dan new_value wajib', 400);

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
