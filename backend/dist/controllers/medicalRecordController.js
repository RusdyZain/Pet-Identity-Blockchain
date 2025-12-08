"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMedicalRecordController = exports.listMedicalRecordsController = exports.createMedicalRecordController = void 0;
const medicalRecordService_1 = require("../services/medicalRecordService");
const errors_1 = require("../utils/errors");
const createMedicalRecordController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const petId = Number(req.params.petId);
        const { vaccine_type, batch_number, given_at, notes, evidence_url } = req.body;
        if (!vaccine_type || !batch_number || !given_at) {
            throw new errors_1.AppError('Missing required fields', 400);
        }
        const givenAt = new Date(given_at);
        if (Number.isNaN(givenAt.getTime())) {
            throw new errors_1.AppError('Tanggal pemberian tidak valid', 400);
        }
        const record = await (0, medicalRecordService_1.createMedicalRecord)({
            petId,
            clinicId: req.user.id,
            vaccineType: vaccine_type,
            batchNumber: batch_number,
            givenAt,
            notes,
            evidenceUrl: evidence_url,
        });
        res.status(201).json(record);
    }
    catch (error) {
        next(error);
    }
};
exports.createMedicalRecordController = createMedicalRecordController;
const listMedicalRecordsController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const petId = Number(req.params.petId);
        const records = await (0, medicalRecordService_1.listMedicalRecords)(petId, req.user);
        res.json(records);
    }
    catch (error) {
        next(error);
    }
};
exports.listMedicalRecordsController = listMedicalRecordsController;
const verifyMedicalRecordController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new errors_1.AppError('Unauthorized', 401);
        const recordId = Number(req.params.id);
        const { status } = req.body;
        if (!status)
            throw new errors_1.AppError('Status wajib diisi', 400);
        const updated = await (0, medicalRecordService_1.verifyMedicalRecord)(recordId, req.user.id, status);
        res.json(updated);
    }
    catch (error) {
        next(error);
    }
};
exports.verifyMedicalRecordController = verifyMedicalRecordController;
//# sourceMappingURL=medicalRecordController.js.map