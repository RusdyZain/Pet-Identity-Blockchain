import { Router, Request, Response } from "express";
import {
  getPet,
  getMedicalRecords,
  prepareAddMedicalRecordTx,
  prepareRegisterPetTx,
} from "../blockchain/petIdentityClient";
import {
  buildMedicalRecordDataHash,
  buildPetDataHash,
} from "../utils/dataHash";

const router = Router();

const toUnixTime = (value: string | number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }
  return Math.floor(date.getTime() / 1000);
};

const toDate = (value: string | number) => new Date(toUnixTime(value) * 1000);

const serializeBigInt = (value: unknown): unknown => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeBigInt);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, serializeBigInt(val)])
    );
  }
  return value;
};

router.post("/debug/prepare/register-pet", async (req: Request, res: Response) => {
  try {
    const { publicId, name, species, breed, birthDate, color, physicalMark } =
      req.body;
    const parsedBirthDate = toDate(birthDate);
    const dataHash = buildPetDataHash({
      publicId,
      name,
      species,
      breed,
      birthDate: parsedBirthDate,
      color: color ?? "",
      physicalMark: physicalMark ?? "",
    });
    return res.json({
      dataHash,
      txRequest: prepareRegisterPetTx(dataHash),
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message ?? "Internal server error" });
  }
});

router.get("/debug/pet/:id", async (req: Request, res: Response) => {
  try {
    const petId = Number(req.params.id);
    const pet = await getPet(petId);
    return res.json(serializeBigInt(pet));
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message ?? "Internal server error" });
  }
});

router.post(
  "/debug/prepare/add-medical-record",
  async (req: Request, res: Response) => {
    try {
      const { petId, vaccineType, batchNumber, givenAt, notes, evidenceUrl } =
        req.body;
      const parsedGivenAt = toDate(givenAt);
      const dataHash = buildMedicalRecordDataHash({
        petId: Number(petId),
        vaccineType,
        batchNumber,
        givenAt: parsedGivenAt,
        notes,
        evidenceUrl,
      });
      return res.json({
        dataHash,
        txRequest: prepareAddMedicalRecordTx(Number(petId), dataHash),
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: error?.message ?? "Internal server error" });
    }
  }
);

router.get("/debug/records/:petId", async (req: Request, res: Response) => {
  try {
    const petId = Number(req.params.petId);
    const records = await getMedicalRecords(petId);
    return res.json(serializeBigInt(records));
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message ?? "Internal server error" });
  }
});

export default router;
