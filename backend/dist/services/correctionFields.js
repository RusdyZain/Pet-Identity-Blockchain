"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePetFieldValue = exports.getPetFieldValue = exports.correctionFieldMap = void 0;
const errors_1 = require("../utils/errors");
exports.correctionFieldMap = {
    name: 'name',
    species: 'species',
    breed: 'breed',
    birth_date: 'birthDate',
    color: 'color',
    physical_mark: 'physicalMark',
    age: 'age',
};
const getPetFieldValue = (pet, fieldName) => {
    const prismaField = exports.correctionFieldMap[fieldName];
    const value = pet[prismaField];
    return value ?? '';
};
exports.getPetFieldValue = getPetFieldValue;
const parsePetFieldValue = (fieldName, newValue) => {
    const prismaField = exports.correctionFieldMap[fieldName];
    if (prismaField === 'age') {
        const parsed = Number(newValue);
        if (Number.isNaN(parsed)) {
            throw new errors_1.AppError('Usia harus angka', 400);
        }
        return parsed;
    }
    if (prismaField === 'birthDate') {
        const date = new Date(newValue);
        if (Number.isNaN(date.getTime())) {
            throw new errors_1.AppError('Tanggal lahir tidak valid', 400);
        }
        return date;
    }
    return newValue;
};
exports.parsePetFieldValue = parsePetFieldValue;
//# sourceMappingURL=correctionFields.js.map