"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCorrectionController = exports.acceptTransferController = exports.initiateTransferController = exports.ownershipHistoryController = exports.getPetController = exports.listPetsController = exports.createPetController = void 0;
const petService_1 = require("../services/petService");
const errors_1 = require("../utils/errors");
const createPetController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const { name, species, breed, birth_date, color, physical_mark } = req.body;
        if (!name || !species || !breed || !birth_date || !color || !physical_mark) {
            throw new errors_1.AppError('Missing required fields', 400);
        }
        const birthDate = new Date(birth_date);
        if (Number.isNaN(birthDate.getTime())) {
            throw new errors_1.AppError('Tanggal lahir tidak valid', 400);
        }
        const pet = await (0, petService_1.createPet)(req.user.id, {
            name,
            species,
            breed,
            birthDate,
            color,
            physicalMark: physical_mark,
        });
        res.status(201).json(pet);
    }
    catch (error) {
        next(error);
    }
};
exports.createPetController = createPetController;
const listPetsController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const search = typeof req.query.search === 'string' && req.query.search.length > 0
            ? req.query.search
            : undefined;
        const pets = await (0, petService_1.listPets)(req.user, search ? { search } : undefined);
        res.json(pets);
    }
    catch (error) {
        next(error);
    }
};
exports.listPetsController = listPetsController;
const getPetController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const petId = Number(req.params.id);
        const pet = await (0, petService_1.getPetById)(petId, req.user);
        res.json(pet);
    }
    catch (error) {
        next(error);
    }
};
exports.getPetController = getPetController;
const ownershipHistoryController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const petId = Number(req.params.petId);
        const history = await (0, petService_1.getOwnershipHistory)(petId, req.user);
        res.json(history);
    }
    catch (error) {
        next(error);
    }
};
exports.ownershipHistoryController = ownershipHistoryController;
const initiateTransferController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const petId = Number(req.params.petId);
        const { new_owner_email } = req.body;
        if (!new_owner_email)
            throw new errors_1.AppError('new_owner_email required', 400);
        const result = await (0, petService_1.initiateTransfer)(petId, req.user.id, new_owner_email);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.initiateTransferController = initiateTransferController;
const acceptTransferController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const petId = Number(req.params.petId);
        const pet = await (0, petService_1.acceptTransfer)(petId, req.user.id);
        res.json(pet);
    }
    catch (error) {
        next(error);
    }
};
exports.acceptTransferController = acceptTransferController;
const createCorrectionController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const petId = Number(req.params.petId);
        const { field_name, new_value, reason } = req.body;
        if (!field_name || !new_value)
            throw new errors_1.AppError('field_name dan new_value wajib', 400);
        const correction = await (0, petService_1.createCorrectionRequest)({
            petId,
            ownerId: req.user.id,
            fieldName: field_name,
            newValue: new_value,
            reason,
        });
        res.status(201).json(correction);
    }
    catch (error) {
        next(error);
    }
};
exports.createCorrectionController = createCorrectionController;
//# sourceMappingURL=petController.js.map