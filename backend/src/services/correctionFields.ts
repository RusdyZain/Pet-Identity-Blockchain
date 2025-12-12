import { Pet } from "@prisma/client";
import { AppError } from "../utils/errors";

export const correctionFieldMap = {
  name: "name",
  species: "species",
  breed: "breed",
  birth_date: "birthDate",
  color: "color",
  physical_mark: "physicalMark",
  age: "age",
} as const;

export type CorrectionField = keyof typeof correctionFieldMap;

export const getPetFieldValue = (pet: Pet, fieldName: CorrectionField) => {
  const prismaField = correctionFieldMap[fieldName];
  const value = (pet as any)[prismaField];
  return value ?? "";
};

export const parsePetFieldValue = (
  fieldName: CorrectionField,
  newValue: string
) => {
  const prismaField = correctionFieldMap[fieldName];
  if (prismaField === "age") {
    const parsed = Number(newValue);
    if (Number.isNaN(parsed)) {
      throw new AppError("Usia harus angka", 400);
    }
    return parsed;
  }
  if (prismaField === "birthDate") {
    const date = new Date(newValue);
    if (Number.isNaN(date.getTime())) {
      throw new AppError("Tanggal lahir tidak valid", 400);
    }
    return date;
  }
  return newValue;
};
