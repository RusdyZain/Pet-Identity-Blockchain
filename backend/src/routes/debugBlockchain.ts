import { Router, Request, Response } from "express";
import {
  registerPet,
  getPet,
  addMedicalRecord,
  getMedicalRecords,
} from "../blockchain/petIdentityClient";

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

const getBlockchainErrorMessage = (error: any): string | undefined => {
  if (!error) {
    return undefined;
  }
  const candidates = [
    error?.reason,
    error?.shortMessage,
    error?.error?.reason,
    error?.error?.message,
    error?.error?.error?.message,
    error?.info?.error?.message,
    error?.message,
  ];
  return candidates.find(
    (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0
  );
};

const isPetMissingError = (error: any): boolean => {
  const message = getBlockchainErrorMessage(error);
  return typeof message === "string" && message.toLowerCase().includes("pet does not exist");
};

const isClinicAccessError = (error: any): boolean => {
  const message = getBlockchainErrorMessage(error);
  return typeof message === "string" && message.toLowerCase().includes("caller is not clinic");
};

router.post("/debug/register-pet", async (req: Request, res: Response) => {
  try {
    console.log("[debug/register-pet] payload", req.body);
    const { publicId, name, species, breed, birthDate } = req.body;
    const birthDateTs = toUnixTime(birthDate);
    const { receipt } = await registerPet(
      publicId,
      name,
      species,
      breed,
      birthDateTs
    );
    return res.json({ txHash: receipt.hash });
  } catch (error: any) {
    console.error("Failed to register pet via blockchain:", error);
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
    if (isPetMissingError(error)) {
      return res.status(404).json({
        code: "PET_NOT_FOUND",
        message: "Pet ID tidak ditemukan",
      });
    }
    const message = getBlockchainErrorMessage(error);
    console.error("Failed to fetch pet via blockchain:", error);
    return res
      .status(500)
      .json({ error: message ?? "Internal server error" });
  }
});

router.post(
  "/debug/add-medical-record",
  async (req: Request, res: Response) => {
    try {
      const { petId, vaccineType, batchNumber, givenAt } = req.body;
      const givenAtTs = toUnixTime(givenAt);
      const receipt = await addMedicalRecord(
        Number(petId),
        vaccineType,
        batchNumber,
        givenAtTs
      );
      return res.json({ txHash: receipt.hash });
    } catch (error: any) {
      if (isClinicAccessError(error)) {
        return res.status(403).json({
          code: "CLINIC_ACCESS_DENIED",
          message:
            "Akses ditolak: alamat wallet backend belum terdaftar sebagai klinik di kontrak. Jalankan addClinic() dari akun pemilik kontrak untuk mendaftarkan alamat ini sebelum menulis rekam medis.",
        });
      }
      const message = getBlockchainErrorMessage(error);
      console.error("Failed to add medical record via blockchain:", error);
      return res
        .status(500)
        .json({ error: message ?? "Internal server error" });
    }
  }
);

router.get("/debug/records/:petId", async (req: Request, res: Response) => {
  try {
    const petId = Number(req.params.petId);
    const records = await getMedicalRecords(petId);
    return res.json(serializeBigInt(records));
  } catch (error: any) {
    if (isPetMissingError(error)) {
      return res.status(404).json({
        code: "PET_NOT_FOUND",
        message: "Pet ID tidak ditemukan",
      });
    }
    const message = getBlockchainErrorMessage(error);
    console.error("Failed to fetch medical records via blockchain:", error);
    return res
      .status(500)
      .json({ error: message ?? "Internal server error" });
  }
});

export default router;

// Usage example:
// import debugBlockchainRouter from './routes/debugBlockchain';
// app.use('/api', debugBlockchainRouter);
